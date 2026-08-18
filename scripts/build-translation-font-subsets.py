#!/usr/bin/env python3
"""Build the self-hosted Japanese translation fonts from the live JA corpus.

The two variable fonts are pinned to one google/fonts commit. Source fonts are
cached outside Git in .local-archive/font-sources; generated WOFF2 files, their
manifest, and the tiny CSS binding are committed site assets.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import re
from urllib.request import urlopen

from fontTools.subset import Options, Subsetter
from fontTools.ttLib import TTFont


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "public" / "fonts"
MANIFEST_PATH = OUTPUT_DIR / "translation-font-manifest.json"
CSS_PATH = ROOT / "app" / "translation-fonts.generated.css"
CACHE_DIR = ROOT / ".local-archive" / "font-sources" / "google-fonts-e1118da9"
UPSTREAM_COMMIT = "e1118da94a8cb00cf6d06cdac9ef13eb1e5c6ab7"
TEXT_EXTENSIONS = {".css", ".md", ".ts", ".tsx"}
CORPUS_ROOTS = (
    ROOT / "source" / "_translations" / "ja",
    ROOT / "app" / "[locale]",
    ROOT / "app" / "components" / "translation",
)
BASE_CODE_POINTS = (
    set(range(0x20, 0x7F))
    | set(range(0xA0, 0x100))
    | set(range(0x3000, 0x3100))
    | set(range(0xFF61, 0xFFA0))
)
EXPLICIT_NON_JAPANESE = re.compile(
    r"<span\s+lang=[\"'](?:zh-Hans|zh-Hant|en)[\"'][^>]*>.*?</span>",
    re.IGNORECASE | re.DOTALL,
)

FONTS = (
    {
        "family": "Roof Noto Serif JP",
        "source": "NotoSerifJP.ttf",
        "source_sha256": "2fd527ba12b6a44ec30d796d633360da0aeba6c5d4af1304ce12bb4dc15a7dfc",
        "url": f"https://raw.githubusercontent.com/google/fonts/{UPSTREAM_COMMIT}/ofl/notoserifjp/NotoSerifJP%5Bwght%5D.ttf",
        "output": "roof-noto-serif-jp.woff2",
        "weight": "200 900",
    },
    {
        "family": "Roof Noto Sans JP",
        "source": "NotoSansJP.ttf",
        "source_sha256": "c2f3b4d463500a2ddcd3849cded1fceeb9fd6d1c32e6cbecd568453ba50fc68f",
        "url": f"https://raw.githubusercontent.com/google/fonts/{UPSTREAM_COMMIT}/ofl/notosansjp/NotoSansJP%5Bwght%5D.ttf",
        "output": "roof-noto-sans-jp.woff2",
        "weight": "100 900",
    },
)


def digest_bytes(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def digest_file(path: Path) -> str:
    return digest_bytes(path.read_bytes())


def corpus_files() -> list[Path]:
    return sorted(
        path
        for root in CORPUS_ROOTS
        for path in root.rglob("*")
        if path.is_file() and path.suffix.lower() in TEXT_EXTENSIONS
    )


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
        if path.is_relative_to(ROOT / "source" / "_translations" / "ja"):
            text = EXPLICIT_NON_JAPANESE.sub("", text)
        points.update(ord(character) for character in text if not character.isspace())
    return points


def japanese_target_code_points(files: list[Path]) -> set[int]:
    points: set[int] = set()
    target_root = ROOT / "source" / "_translations" / "ja"
    for path in files:
        if not path.is_relative_to(target_root):
            continue
        text = EXPLICIT_NON_JAPANESE.sub("", path.read_text(encoding="utf-8"))
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


def generated_css(records: list[dict[str, object]]) -> str:
    faces = []
    variables = []
    for record in records:
        variable = "--font-roof-noto-serif-jp" if "Serif" in str(record["family"]) else "--font-roof-noto-sans-jp"
        variables.append(f'  {variable}: "{record["family"]}";')
        faces.append(
            "\n".join((
                "@font-face {",
                f'  font-family: "{record["family"]}";',
                f'  src: url("/fonts/{record["file"]}?v={str(record["sha256"])[:12]}") format("woff2");',
                "  font-style: normal;",
                f'  font-weight: {record["weight"]};',
                "  font-display: swap;",
                "}",
            ))
        )
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
    common_supported = set.intersection(*(font_code_points(path) for _, path in sources))
    requested = corpus_code_points(files)
    unsupported = japanese_target_code_points(files) - common_supported
    unsupported_noncontrol = {point for point in unsupported if point >= 0x20 and not 0x7F <= point < 0xA0}
    if unsupported_noncontrol:
        raise SystemExit(
            "Japanese corpus contains glyphs unavailable in both pinned fonts. "
            "Mark intentional foreign-language spans with lang=zh-Hans / zh-Hant / en or choose a covering source font: "
            + ", ".join(compact_ranges(unsupported_noncontrol))
        )
    subset_points = requested & common_supported
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
        })
        print(f"built {output.relative_to(ROOT)} ({output.stat().st_size:,} bytes)")
    manifest = {
        "corpusFileCount": len(files),
        "corpusFiles": [path.relative_to(ROOT).as_posix() for path in files],
        "corpusSha256": corpus_fingerprint(files),
        "fonts": {str(record["family"]): record for record in font_records},
        "strategy": "japanese-translation-corpus-variable-fonts",
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
