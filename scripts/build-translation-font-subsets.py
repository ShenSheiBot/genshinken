#!/usr/bin/env python3
"""Build the self-hosted Japanese translation fonts from the live JA corpus.

The primary JP faces and the controlled fallback faces are pinned to one
google/fonts commit. Source fonts are cached outside Git in
.local-archive/font-sources; generated WOFF2 files, their manifest, and the
tiny CSS binding are committed site assets.  The fallback faces are generated
from the live corpus, not from a hand-maintained character allow-list: a newly
introduced code point is either covered automatically or fails the build with
an actionable missing-glyph report.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from urllib.request import urlopen

from fontTools.subset import Options, Subsetter
from fontTools.ttLib import TTFont


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "public" / "fonts"
MANIFEST_PATH = OUTPUT_DIR / "translation-font-manifest.json"
CSS_PATH = ROOT / "app" / "translation-fonts.generated.css"
CACHE_DIR = ROOT / ".local-archive" / "font-sources" / "google-fonts-e1118da9"
UPSTREAM_COMMIT = "e1118da94a8cb00cf6d06cdac9ef13eb1e5c6ab7"
TEXT_EXTENSIONS = {".css", ".json", ".md", ".ts", ".tsx"}
CORPUS_ROOTS = (
    ROOT / "source" / "_translations" / "ja",
    # External-original cards are rendered in the target locale too. Keep
    # their bibliographic titles in the hosted Japanese subset so a rare kanji
    # cannot silently fall back to a platform font.
    ROOT / "source" / "_translations" / "external-originals.json",
    ROOT / "app" / "[locale]",
    ROOT / "app" / "components" / "translation",
)
BASE_CODE_POINTS = (
    set(range(0x20, 0x7F))
    | set(range(0xA0, 0x100))
    | set(range(0x3000, 0x3100))
    | set(range(0xFF61, 0xFFA0))
)
FONTS = (
    {
        "family": "Roof Noto Serif JP",
        "source": "NotoSerifJP.ttf",
        "source_sha256": "2fd527ba12b6a44ec30d796d633360da0aeba6c5d4af1304ce12bb4dc15a7dfc",
        "url": f"https://raw.githubusercontent.com/google/fonts/{UPSTREAM_COMMIT}/ofl/notoserifjp/NotoSerifJP%5Bwght%5D.ttf",
        "output": "roof-noto-serif-jp.woff2",
        "weight": "200 900",
        "variable": "--font-roof-noto-serif-jp",
        "kind": "primary-serif",
    },
    {
        "family": "Roof Noto Sans JP",
        "source": "NotoSansJP.ttf",
        "source_sha256": "c2f3b4d463500a2ddcd3849cded1fceeb9fd6d1c32e6cbecd568453ba50fc68f",
        "url": f"https://raw.githubusercontent.com/google/fonts/{UPSTREAM_COMMIT}/ofl/notosansjp/NotoSansJP%5Bwght%5D.ttf",
        "output": "roof-noto-sans-jp.woff2",
        "weight": "100 900",
        "variable": "--font-roof-noto-sans-jp",
        "kind": "primary-sans",
    },
)

# Noto Serif/Sans JP deliberately use Japanese regional glyphs and do not cover
# every Han character that can legitimately occur inside a Japanese edition
# (Chinese names, quoted source text, etc.).  Keep those glyphs local too: the
# SC faces are only subsetted to the code points missing from the JP faces.
FALLBACK_FONTS = (
    {
        "family": "Roof Noto Serif SC Fallback",
        "source": "NotoSerifSC.ttf",
        "source_sha256": "050080d9255a86808f2945bffac582b31ef32bc36411ce29563b4961670c66f9",
        "url": f"https://raw.githubusercontent.com/google/fonts/{UPSTREAM_COMMIT}/ofl/notoserifsc/NotoSerifSC%5Bwght%5D.ttf",
        "output": "roof-noto-serif-sc-fallback.woff2",
        "weight": "200 900",
        "variable": "--font-roof-noto-serif-sc-fallback",
        "kind": "fallback-serif",
    },
    {
        "family": "Roof Noto Sans SC Fallback",
        "source": "NotoSansSC.ttf",
        "source_sha256": "a3041811a78c361b1de50f953c805e0244951c21c5bd412f7232ef0d899af0da",
        "url": f"https://raw.githubusercontent.com/google/fonts/{UPSTREAM_COMMIT}/ofl/notosanssc/NotoSansSC%5Bwght%5D.ttf",
        "output": "roof-noto-sans-sc-fallback.woff2",
        "weight": "100 900",
        "variable": "--font-roof-noto-sans-sc-fallback",
        "kind": "fallback-sans",
    },
    {
        "family": "Roof EB Garamond Fallback",
        "source": "EBGaramond.ttf",
        "source_sha256": "ef9512f92f6d579e5dc75af59a5a4b1b8b47d2eda89e00b954d44520e5369027",
        "url": f"https://raw.githubusercontent.com/google/fonts/{UPSTREAM_COMMIT}/ofl/ebgaramond/EBGaramond%5Bwght%5D.ttf",
        "output": "roof-eb-garamond-fallback.woff2",
        "weight": "400",
        "variable": "--font-roof-eb-garamond-fallback",
        "kind": "fallback-latin",
    },
    {
        "family": "Roof Noto Music Fallback",
        "source": "NotoMusic.ttf",
        "source_sha256": "e913be269fe16723d1dea0afc3c31a28be6958f6a7f0e6d5be6e98506c4022bd",
        "url": f"https://raw.githubusercontent.com/google/fonts/{UPSTREAM_COMMIT}/ofl/notomusic/NotoMusic-Regular.ttf",
        "output": "roof-noto-music-fallback.woff2",
        "weight": "400",
        "variable": "--font-roof-noto-music-fallback",
        "kind": "fallback-music",
    },
)


def digest_bytes(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def digest_file(path: Path) -> str:
    return digest_bytes(path.read_bytes())


def corpus_files() -> list[Path]:
    files: list[Path] = []
    for root in CORPUS_ROOTS:
        candidates = [root] if root.is_file() else root.rglob("*")
        files.extend(
            path for path in candidates
            if path.is_file() and path.suffix.lower() in TEXT_EXTENSIONS
        )
    return sorted(files)


def corpus_fingerprint(files: list[Path]) -> str:
    digest = hashlib.sha256()
    for path in files:
        relative = path.relative_to(ROOT).as_posix().encode("utf-8")
        payload = path.read_bytes()
        digest.update(len(relative).to_bytes(4, "big"))
        digest.update(relative)
        digest.update(len(payload).to_bytes(8, "big"))
        digest.update(payload)
    return digest.hexdigest()


def corpus_code_points(files: list[Path]) -> set[int]:
    points = set(BASE_CODE_POINTS)
    for path in files:
        text = path.read_text(encoding="utf-8")
        points.update(ord(character) for character in text if not character.isspace())
    return points


def rendered_corpus_code_points(files: list[Path]) -> set[int]:
    """Return every literal code point in files that can reach a JA route.

    This intentionally includes localized component copy and external-original
    metadata.  BASE_CODE_POINTS are excluded because they are a preload budget,
    not literal rendered content.
    """
    points: set[int] = set()
    for path in files:
        text = path.read_text(encoding="utf-8")
        points.update(ord(character) for character in text if not character.isspace())
    return points


def source_font(record: dict[str, str], source_dir: Path) -> Path:
    path = source_dir / record["source"]
    if path.is_file() and digest_file(path) == record["source_sha256"]:
        return path
    source_dir.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(".download")
    with urlopen(record["url"], timeout=60) as response:
        temporary.write_bytes(response.read())
    actual = digest_file(temporary)
    if actual != record["source_sha256"]:
        raise SystemExit(
            f"downloaded {record['source']} digest {actual} does not match pinned {record['source_sha256']}"
        )
    temporary.replace(path)
    return path


def font_code_points(path: Path) -> set[int]:
    font = TTFont(path, lazy=True, recalcTimestamp=False)
    try:
        cmap = font.getBestCmap()
        if cmap is None:
            raise SystemExit(f"{path} has no Unicode cmap")
        return set(cmap)
    finally:
        font.close()


def subset_font(source: Path, output: Path, points: set[int]) -> None:
    options = Options()
    options.layout_features = ["*"]
    options.name_IDs = ["*"]
    options.name_languages = ["*"]
    options.name_legacy = True
    options.notdef_glyph = True
    options.recommended_glyphs = True
    options.symbol_cmap = True
    options.legacy_cmap = True
    options.canonical_order = True
    font = TTFont(source, recalcTimestamp=False)
    try:
        subsetter = Subsetter(options=options)
        subsetter.populate(unicodes=sorted(points))
        subsetter.subset(font)
        font.flavor = "woff2"
        font.recalcTimestamp = False
        temporary = output.with_suffix(".tmp.woff2")
        font.save(temporary, reorderTables=True)
        temporary.replace(output)
    finally:
        font.close()


def compact_ranges(points: set[int]) -> list[str]:
    values = sorted(points)
    if not values:
        return []
    ranges: list[str] = []
    start = previous = values[0]
    for value in values[1:]:
        if value == previous + 1:
            previous = value
            continue
        ranges.append(f"U+{start:04X}" if start == previous else f"U+{start:04X}-{previous:04X}")
        start = previous = value
    ranges.append(f"U+{start:04X}" if start == previous else f"U+{start:04X}-{previous:04X}")
    return ranges


def code_point_digest(points: set[int]) -> str:
    payload = ",".join(f"{point:X}" for point in sorted(points)).encode("ascii")
    return digest_bytes(payload)


STACK_SPECS = {
    "--font-roof-translation-serif-stack": (
        "primary-serif", "fallback-serif", "fallback-latin", "fallback-music"
    ),
    "--font-roof-translation-sans-stack": (
        "primary-sans", "fallback-sans", "fallback-latin", "fallback-music"
    ),
}


def generated_css(records: list[dict[str, object]]) -> str:
    faces = []
    variables = []
    for record in records:
        variable = str(record["variable"])
        unicode_range = record.get("unicodeRange")
        face_lines = [
                "@font-face {",
                f'  font-family: "{record["family"]}";',
                f'  src: url("/fonts/{record["file"]}?v={str(record["sha256"])[:12]}") format("woff2");',
                "  font-style: normal;",
                f'  font-weight: {record["weight"]};',
                "  font-display: swap;",
        ]
        if unicode_range:
            face_lines.append(f"  unicode-range: {unicode_range};")
        face_lines.append("}")
        faces.append("\n".join(face_lines))
        variables.append(f'  {variable}: "{record["family"]}";')
    by_kind = {str(record["kind"]): str(record["family"]) for record in records}
    stacks = []
    for variable, kinds in STACK_SPECS.items():
        families = [by_kind[kind] for kind in kinds if kind in by_kind]
        if not families:
            raise SystemExit(f"cannot generate {variable}: no matching hosted font records")
        quoted_families = ", ".join(f'"{family}"' for family in families)
        stacks.append(f"  {variable}: {quoted_families};")
    variables.extend(stacks)
    return "/* Generated by scripts/build-translation-font-subsets.py. */\n" + "\n\n".join(faces) + "\n\n:root {\n" + "\n".join(variables) + "\n}\n"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-dir", type=Path, default=CACHE_DIR)
    args = parser.parse_args()
    files = corpus_files()
    if not files:
        raise SystemExit("Japanese translation corpus is empty")
    source_dir = args.source_dir.expanduser().resolve()
    sources = [(record, source_font(record, source_dir)) for record in FONTS]
    fallback_sources = [(record, source_font(record, source_dir)) for record in FALLBACK_FONTS]
    primary_supported = set.intersection(*(font_code_points(path) for _, path in sources))
    fallback_supported = set.intersection(*(font_code_points(path) for _, path in fallback_sources[:2]))
    latin_supported = font_code_points(fallback_sources[2][1])
    music_supported = font_code_points(fallback_sources[3][1])
    requested = corpus_code_points(files)
    target_points = rendered_corpus_code_points(files)
    covered = primary_supported | fallback_supported | latin_supported | music_supported
    unsupported = target_points - covered
    unsupported_noncontrol = {point for point in unsupported if point >= 0x20 and not 0x7F <= point < 0xA0}
    if unsupported_noncontrol:
        raise SystemExit(
            "Japanese corpus contains visible glyphs unavailable in the hosted JP/SC/Latin/music sources. "
            "Add a pinned source face or remove the unsupported visible character; do not add a one-off whitelist: "
            + ", ".join(compact_ranges(unsupported_noncontrol))
        )
    subset_points = requested & primary_supported
    if len(subset_points) < 1_000:
        raise SystemExit(f"refusing unexpectedly small Japanese subsets ({len(subset_points)} code points)")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    font_records: list[dict[str, object]] = []
    for record, source in sources:
        output = OUTPUT_DIR / record["output"]
        subset_font(source, output, subset_points)
        font_records.append({
            "bytes": output.stat().st_size,
            "codePointCount": len(subset_points),
            "family": record["family"],
            "file": record["output"],
            "sha256": digest_file(output),
            "source": record["source"],
            "sourceSha256": record["source_sha256"],
            "sourceUrl": record["url"],
            "weight": record["weight"],
            "kind": record["kind"],
            "variable": record["variable"],
        })
        print(f"built {output.relative_to(ROOT)} ({output.stat().st_size:,} bytes)")
    fallback_points = target_points - primary_supported
    for record, source in fallback_sources:
        supported = (
            fallback_supported if record["kind"] in {"fallback-serif", "fallback-sans"}
            else latin_supported if record["kind"] == "fallback-latin"
            else music_supported
        )
        points = fallback_points & supported
        output = OUTPUT_DIR / record["output"]
        subset_font(source, output, points)
        font_records.append({
            "bytes": output.stat().st_size,
            "codePointCount": len(points),
            "family": record["family"],
            "file": record["output"],
            "kind": record["kind"],
            "sha256": digest_file(output),
            "source": record["source"],
            "sourceSha256": record["source_sha256"],
            "sourceUrl": record["url"],
            "unicodeRange": " ".join(compact_ranges(points)),
            "variable": record["variable"],
            "weight": record["weight"],
        })
        print(f"built {output.relative_to(ROOT)} ({output.stat().st_size:,} bytes; {len(points)} fallback code points)")
    manifest = {
        "corpusFileCount": len(files),
        "corpusFiles": [path.relative_to(ROOT).as_posix() for path in files],
        "corpusSha256": corpus_fingerprint(files),
        "fonts": {str(record["family"]): record for record in font_records},
        "stacks": {
            name.removeprefix("--font-roof-translation-").removesuffix("-stack"): {
                "variable": name,
                "kinds": list(kinds),
                "families": [
                    next(record["family"] for record in font_records if record["kind"] == kind)
                    for kind in kinds
                    if any(record["kind"] == kind for record in font_records)
                ],
            }
            for name, kinds in STACK_SPECS.items()
        },
        "strategy": "japanese-translation-corpus-variable-fonts-with-generated-fallbacks",
        "targetCodePointCount": len(target_points),
        "targetCodePointSha256": code_point_digest(target_points),
        "uncoveredCodePointRanges": compact_ranges(unsupported_noncontrol),
        "fallbackCodePointCount": len(fallback_points),
        "subsetCodePointCount": len(subset_points),
        "upstreamCommit": UPSTREAM_COMMIT,
        "version": 1,
    }
    MANIFEST_PATH.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    CSS_PATH.write_text(generated_css(font_records), encoding="utf-8", newline="\n")
    print(f"covered {len(subset_points):,} code points from {len(files)} Japanese-edition corpus files")


if __name__ == "__main__":
    main()
