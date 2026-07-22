#!/usr/bin/env python3
"""Build the three self-hosted ST CJK webfont subsets.

Usage:
    python scripts/build-cjk-font-subsets.py --source-dir C:/path/to/ttfs

The source directory must contain STSong.ttf, STFangsong.ttf, and STKaiti.ttf.
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
from typing import Iterable

from fontTools.subset import Options, Subsetter
from fontTools.ttLib import TTFont


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "public" / "fonts"
MANIFEST_PATH = OUTPUT_DIR / "cjk-font-manifest.json"
TEXT_EXTENSIONS = {".css", ".json", ".md", ".mjs", ".ts", ".tsx", ".txt"}
CORPUS_ROOTS = (ROOT / "app", ROOT / "lib", ROOT / "source")
ALWAYS_INCLUDE = "西方負典华文宋体仿宋楷体衬线无衬线，。；：？！“”‘’（）《》〈〉【】——……·"

FONTS = (
    ("UN Canon STSong", "STSong.ttf", "un-canon-st-song.woff2"),
    ("UN Canon STFangsong", "STFangsong.ttf", "un-canon-st-fangsong.woff2"),
    ("UN Canon STKaiti", "STKaiti.ttf", "un-canon-st-kaiti.woff2"),
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
            if path.is_file() and path.suffix.lower() in TEXT_EXTENSIONS
        )
    public_text = ROOT / "public" / "llms.txt"
    if public_text.exists():
        files.append(public_text)
    return sorted(files)


def site_code_points(files: Iterable[Path]) -> set[int]:
    code_points = {ord(character) for character in ALWAYS_INCLUDE}
    for path in files:
        code_points.update(
            ord(character)
            for character in path.read_text(encoding="utf-8")
            if is_cjk_text_code_point(ord(character))
        )
    return code_points


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


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
    font = TTFont(path, lazy=True, recalcTimestamp=False)
    try:
        cmap = font.getBestCmap()
        if cmap is None:
            raise RuntimeError(f"{path.name} has no Unicode cmap")
        return set(cmap)
    finally:
        font.close()


def subset_font(source: Path, output: Path, code_points: set[int]) -> None:
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


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--source-dir",
        type=Path,
        required=True,
        help="Directory containing STSong.ttf, STFangsong.ttf, and STKaiti.ttf",
    )
    args = parser.parse_args()
    source_dir = args.source_dir.expanduser().resolve()
    sources = [(family, source_dir / source_name, output_name) for family, source_name, output_name in FONTS]
    missing = [source for _, source, _ in sources if not source.is_file()]
    if missing:
        raise SystemExit(f"missing source fonts: {', '.join(str(path) for path in missing)}")

    corpus_files = text_files()
    site_points = site_code_points(corpus_files)
    common_supported: set[int] | None = None
    for _, source, _ in sources:
        supported = font_code_points(source)
        common_supported = supported if common_supported is None else common_supported & supported
    assert common_supported is not None

    subset_points = site_points & common_supported
    unsupported_site_points = site_points - common_supported
    if len(subset_points) < 2_500:
        raise SystemExit(f"refusing to build unexpectedly small CJK subsets ({len(subset_points)} code points)")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    manifest_fonts: dict[str, dict[str, object]] = {}
    for family, source, output_name in sources:
        output = OUTPUT_DIR / output_name
        subset_font(source, output, subset_points)
        manifest_fonts[family] = {
            "bytes": output.stat().st_size,
            "codePointCount": len(subset_points),
            "file": output_name,
            "sha256": sha256(output),
            "source": source.name,
            "sourceSha256": sha256(source),
        }
        print(f"built {output.relative_to(ROOT)} ({output.stat().st_size:,} bytes)")

    manifest = {
        "corpusFileCount": len(corpus_files),
        "fonts": manifest_fonts,
        "siteCodePointCount": len(site_points),
        "siteCodePointSha256": code_point_digest(site_points),
        "strategy": "site-corpus",
        "subsetCodePointCount": len(subset_points),
        "unsupportedSiteCodePointRanges": compact_ranges(unsupported_site_points),
        "version": 2,
    }
    MANIFEST_PATH.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    print(
        f"covered {len(subset_points):,} code points from {len(corpus_files)} site files; "
        f"{len(unsupported_site_points)} site code points remain on fallback"
    )


if __name__ == "__main__":
    main()
