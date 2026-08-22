#!/usr/bin/env python3
"""Build the three self-hosted ST CJK webfont subsets.

Normal dev, check, build, and deploy commands invoke this script automatically.
Pinned source fonts are cached outside Git; --source-dir may override that cache.
Generated WOFF2 files cover every supported CJK/punctuation code point currently
present in the rendered site corpus. The committed manifest lets CI fail when new
site text needs the subsets to be regenerated, avoiding a permanent GB2312 payload
on pages that use only a fraction of it.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import subprocess
from typing import Iterable
from urllib.parse import quote
from urllib.request import urlopen

from font_build_support import (
    acquire_font_build_lock,
    ensure_pinned_font_environment,
    font_toolchain_digest,
)

ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "public" / "fonts"
MANIFEST_PATH = OUTPUT_DIR / "cjk-font-manifest.json"
CSS_PATH = ROOT / "app" / "cjk-fonts.generated.css"
CONVERTER_PATH = ROOT / "scripts" / "convert-cjk-font-corpus.mjs"
CACHE_DIR = ROOT / ".local-archive" / "font-sources" / "st-cjk-28739933"
UPSTREAM_COMMIT = "287399335ec1beb72062ce67c36eaa8bec35f386"
GENERATOR_VERSION = 4
GENERATOR_STRATEGY = "site-corpus-opencc-closure"
TEXT_EXTENSIONS = {".css", ".json", ".md", ".mjs", ".ts", ".tsx", ".txt"}
CORPUS_ROOTS = (ROOT / "app", ROOT / "lib", ROOT / "source")
LOCALE_FONT_OWNED_ROOTS = (
    ROOT / "app" / "[locale]",
    ROOT / "app" / "components" / "translation",
    ROOT / "app" / "translation-fonts.generated.css",
    ROOT / "source" / "_translations",
)
ALWAYS_INCLUDE = "西方負典华文宋体仿宋楷体衬线无衬线，。；：？！“”‘’（）《》〈〉【】——……·"

FONTS = (
    {
        "family": "UN Canon STSong",
        "source": "STSong.ttf",
        "source_path": "chinese/宋体/STSong.ttf",
        "source_sha256": "c5cc2ed5e2c0e6385013fe82d950eee6960d805bd602b86c53ff454783f382c4",
        "output": "un-canon-st-song.woff2",
    },
    {
        "family": "UN Canon STFangsong",
        "source": "STFangsong.ttf",
        "source_path": "chinese/仿宋体/STFangsong.ttf",
        "source_sha256": "e6326459e8e60e436c7d60e34d273bda3ba4eea2d2a5b309ff8f1b73200f2e38",
        "output": "un-canon-st-fangsong.woff2",
    },
    {
        "family": "UN Canon STKaiti",
        "source": "STKaiti.ttf",
        "source_path": "chinese/楷体/STKaiti.ttf",
        "source_sha256": "a29c99c161fc43ce6aba2d7c152065359c2cb3019be4ae6248171178cb7d04d5",
        "output": "un-canon-st-kaiti.woff2",
    },
)


def is_cjk_text_code_point(code_point: int) -> bool:
    return (
        code_point in {0x00B7, 0x00D7, 0x00F7}
        or 0x2010 <= code_point <= 0x203B
        or 0x2E80 <= code_point <= 0x312F
        or 0x31A0 <= code_point <= 0x31EF
        or 0x3400 <= code_point <= 0x9FFF
        or 0xF900 <= code_point <= 0xFAFF
        or 0xFE10 <= code_point <= 0xFE4F
        or 0xFF00 <= code_point <= 0xFFEF
    )


def text_files() -> list[Path]:
    files: list[Path] = []
    for directory in CORPUS_ROOTS:
        files.extend(
            path
            for path in directory.rglob("*")
            if path.is_file()
            and path.suffix.lower() in TEXT_EXTENSIONS
            and not any(path.is_relative_to(locale_root) for locale_root in LOCALE_FONT_OWNED_ROOTS)
        )
    public_text = ROOT / "public" / "llms.txt"
    if public_text.exists():
        files.append(public_text)
    return sorted(files)


def corpus_text(files: Iterable[Path]) -> str:
    parts = [ALWAYS_INCLUDE]
    for path in files:
        parts.append(path.read_text(encoding="utf-8"))
    return "\n".join(parts)


def text_code_points(text: str) -> set[int]:
    return {
        ord(character)
        for character in text
        if is_cjk_text_code_point(ord(character))
    }


def opencc_converted_text(text: str) -> str:
    completed = subprocess.run(
        ["node", str(CONVERTER_PATH)],
        input=text,
        capture_output=True,
        check=False,
        encoding="utf-8",
    )
    if completed.returncode != 0:
        raise SystemExit(
            "OpenCC corpus conversion failed:\n"
            + (completed.stderr.strip() or f"node exited with {completed.returncode}")
        )
    return completed.stdout


def site_code_points(files: Iterable[Path]) -> tuple[set[int], set[int]]:
    source_text = corpus_text(files)
    source_points = text_code_points(source_text)
    converted_points = text_code_points(opencc_converted_text(source_text))
    code_points = source_points | converted_points
    return source_points, code_points


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def source_url(record: dict[str, str]) -> str:
    encoded_path = "/".join(quote(part) for part in record["source_path"].split("/"))
    return (
        "https://raw.githubusercontent.com/Haixing-Hu/latex-chinese-fonts/"
        f"{UPSTREAM_COMMIT}/{encoded_path}"
    )


def source_font(record: dict[str, str], source_dir: Path) -> Path:
    path = source_dir / record["source"]
    if path.is_file() and sha256(path) == record["source_sha256"]:
        return path
    source_dir.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(".download")
    with urlopen(source_url(record), timeout=60) as response:
        temporary.write_bytes(response.read())
    actual = sha256(temporary)
    if actual != record["source_sha256"]:
        raise SystemExit(
            f"downloaded {record['source']} digest {actual} does not match pinned {record['source_sha256']}"
        )
    temporary.replace(path)
    return path


def code_point_digest(code_points: Iterable[int]) -> str:
    payload = ",".join(f"{code_point:X}" for code_point in sorted(set(code_points)))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def compact_ranges(code_points: Iterable[int]) -> list[str]:
    values = sorted(set(code_points))
    if not values:
        return []
    ranges: list[str] = []
    start = previous = values[0]
    for value in values[1:]:
        if value == previous + 1:
            previous = value
            continue
        ranges.append(format_range(start, previous))
        start = previous = value
    ranges.append(format_range(start, previous))
    return ranges


def format_range(start: int, end: int) -> str:
    start_text = f"U+{start:04X}"
    return start_text if start == end else f"{start_text}-{end:04X}"


def font_code_points(path: Path) -> set[int]:
    from fontTools.ttLib import TTFont

    font = TTFont(path, lazy=True, recalcTimestamp=False)
    try:
        cmap = font.getBestCmap()
        if cmap is None:
            raise RuntimeError(f"{path.name} has no Unicode cmap")
        return set(cmap)
    finally:
        font.close()


def subset_font(source: Path, output: Path, code_points: set[int]) -> None:
    from fontTools.subset import Options, Subsetter
    from fontTools.ttLib import TTFont

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
        subsetter.populate(unicodes=sorted(code_points))
        subsetter.subset(font)
        font.flavor = "woff2"
        font.recalcTimestamp = False
        temporary = output.with_suffix(".tmp.woff2")
        font.save(temporary, reorderTables=True)
        temporary.replace(output)
    finally:
        font.close()


def generated_outputs_are_current(
    source_points: set[int],
    site_points: set[int],
) -> bool:
    if not MANIFEST_PATH.is_file() or not CSS_PATH.is_file():
        return False
    try:
        manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return False
    if manifest.get("version") != GENERATOR_VERSION:
        return False
    if manifest.get("strategy") != GENERATOR_STRATEGY:
        return False
    if manifest.get("toolchainSha256") != font_toolchain_digest(ROOT):
        return False
    if manifest.get("sourceCodePointCount") != len(source_points):
        return False
    if manifest.get("sourceCodePointSha256") != code_point_digest(source_points):
        return False
    if manifest.get("siteCodePointCount") != len(site_points):
        return False
    if manifest.get("siteCodePointSha256") != code_point_digest(site_points):
        return False
    if manifest.get("upstreamCommit") != UPSTREAM_COMMIT:
        return False
    css = CSS_PATH.read_text(encoding="utf-8")
    records = manifest.get("fonts")
    if not isinstance(records, dict) or not records:
        return False
    expected_by_family = {record["family"]: record for record in FONTS}
    if set(records) != set(expected_by_family):
        return False
    for family, record in records.items():
        if not isinstance(record, dict):
            return False
        expected = expected_by_family[family]
        if record.get("sourceSha256") != expected["source_sha256"]:
            return False
        if record.get("sourceUrl") != source_url(expected):
            return False
        file_name = record.get("file")
        expected_digest = record.get("sha256")
        if not isinstance(file_name, str) or not isinstance(expected_digest, str):
            return False
        output = OUTPUT_DIR / file_name
        if not output.is_file() or sha256(output) != expected_digest:
            return False
        if f'/fonts/{file_name}?v={expected_digest[:12]}' not in css:
            return False
    return True


def corpus_inventory_is_current(corpus_files: list[Path]) -> bool:
    try:
        manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return False
    return manifest.get("corpusFileCount") == len(corpus_files)


def refresh_corpus_inventory(corpus_files: list[Path], lock: object) -> None:
    if getattr(lock, "closed", True):
        raise RuntimeError("Chinese font manifest refresh requires the font-build lock")
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    manifest["corpusFileCount"] = len(corpus_files)
    MANIFEST_PATH.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
        newline="\n",
    )


def generated_css(records: dict[str, dict[str, object]]) -> str:
    faces: list[str] = []
    for record in FONTS:
        built = records[record["family"]]
        faces.append("\n".join((
            "@font-face {",
            f'  font-family: "{record["family"]}";',
            f'  src: url("/fonts/{built["file"]}?v={str(built["sha256"])[:12]}") format("woff2");',
            "  font-style: normal;",
            "  font-weight: 400;",
            "  font-display: swap;",
            "}",
        )))
    return "/* Generated by scripts/build-cjk-font-subsets.py. */\n" + "\n\n".join(faces) + "\n"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--source-dir",
        type=Path,
        default=CACHE_DIR,
        help="Directory containing STSong.ttf, STFangsong.ttf, and STKaiti.ttf",
    )
    parser.add_argument(
        "--if-stale",
        action="store_true",
        help="rebuild only when the live corpus or committed generated outputs changed",
    )
    args = parser.parse_args()
    corpus_files = text_files()
    source_points, site_points = site_code_points(corpus_files)
    if (
        args.if_stale
        and generated_outputs_are_current(source_points, site_points)
        and corpus_inventory_is_current(corpus_files)
    ):
        print("Chinese font subsets already match the live corpus")
        return
    lock = acquire_font_build_lock(ROOT)
    corpus_files = text_files()
    source_points, site_points = site_code_points(corpus_files)
    if args.if_stale and generated_outputs_are_current(source_points, site_points):
        if not corpus_inventory_is_current(corpus_files):
            refresh_corpus_inventory(corpus_files, lock)
            print("refreshed Chinese font corpus inventory without rebuilding font binaries")
        else:
            print("Chinese font subsets were synchronized by another process")
        lock.close()
        return
    toolchain_digest = ensure_pinned_font_environment(ROOT)
    source_dir = args.source_dir.expanduser().resolve()
    sources = [(record, source_font(record, source_dir)) for record in FONTS]
    common_supported: set[int] | None = None
    for _, source in sources:
        supported = font_code_points(source)
        common_supported = supported if common_supported is None else common_supported & supported
    assert common_supported is not None

    subset_points = site_points & common_supported
    unsupported_site_points = site_points - common_supported
    if len(subset_points) < 2_500:
        raise SystemExit(f"refusing to build unexpectedly small CJK subsets ({len(subset_points)} code points)")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    manifest_fonts: dict[str, dict[str, object]] = {}
    for record, source in sources:
        output = OUTPUT_DIR / record["output"]
        subset_font(source, output, subset_points)
        manifest_fonts[record["family"]] = {
            "bytes": output.stat().st_size,
            "codePointCount": len(subset_points),
            "file": record["output"],
            "sha256": sha256(output),
            "source": record["source"],
            "sourceSha256": sha256(source),
            "sourceUrl": source_url(record),
        }
        print(f"built {output.relative_to(ROOT)} ({output.stat().st_size:,} bytes)")

    manifest = {
        "corpusFileCount": len(corpus_files),
        "conversion": "opencc-js:cn2t+t2cn",
        "fonts": manifest_fonts,
        "sourceCodePointCount": len(source_points),
        "sourceCodePointSha256": code_point_digest(source_points),
        "siteCodePointCount": len(site_points),
        "siteCodePointSha256": code_point_digest(site_points),
        "strategy": GENERATOR_STRATEGY,
        "subsetCodePointCount": len(subset_points),
        "unsupportedSiteCodePointRanges": compact_ranges(unsupported_site_points),
        "upstreamCommit": UPSTREAM_COMMIT,
        "toolchainSha256": toolchain_digest,
        "version": GENERATOR_VERSION,
    }
    MANIFEST_PATH.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    CSS_PATH.write_text(generated_css(manifest_fonts), encoding="utf-8", newline="\n")
    print(
        f"covered {len(subset_points):,} code points from {len(corpus_files)} site files; "
        f"{len(unsupported_site_points)} site code points remain on fallback"
    )


if __name__ == "__main__":
    main()
