#!/usr/bin/env python3
"""Build per-ebook CJK font subsets for the EPUB generator.

Reuses scripts/build-cjk-font-subsets.py infrastructure (pinned sources,
sha256-verified downloads, pyftsubset options, pinned venv) instead of
duplicating download/subset logic. Input is the artifact's exact character
set; output is one WOFF2 per site face plus a JSON inventory on stdout.
"""

from __future__ import annotations

import argparse
import importlib.util
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]

sys.path.insert(0, str(ROOT / "scripts"))
from font_build_support import (  # noqa: E402
    acquire_font_build_lock,
    ensure_pinned_font_environment,
)


def load_cjk_module():
    spec = importlib.util.spec_from_file_location(
        "build_cjk_font_subsets", ROOT / "scripts" / "build-cjk-font-subsets.py"
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


LICENSE_FILES = {
    "Roof Noto Serif SC": "OFL-Noto-CJK.txt",
    "Roof Noto Sans SC": "OFL-Noto-CJK.txt",
    "Roof Zhuque Fangsong": "OFL-Zhuque-Fangsong.txt",
}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--charset-file", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--source-dir", type=Path, default=None)
    args = parser.parse_args()

    ensure_pinned_font_environment(ROOT)
    cjk = load_cjk_module()
    source_dir = (args.source_dir or cjk.CACHE_DIR).expanduser().resolve()

    charset = args.charset_file.read_text(encoding="utf-8")
    code_points = {
        ord(character)
        for character in charset + cjk.ALWAYS_INCLUDE
        if not (0 <= ord(character) < 0x20)
    }
    if not code_points:
        raise SystemExit("refusing to build an ebook font subset for an empty charset")

    args.output_dir.mkdir(parents=True, exist_ok=True)
    lock = acquire_font_build_lock(ROOT)
    try:
        results = []
        for record in cjk.FONTS:
            source = cjk.source_font(record, source_dir)
            supported = cjk.font_code_points(source)
            target = set(code_points)
            if record.get("emphasis_alias"):
                target |= cjk.range_code_points(cjk.EMPHASIS_RANGES)
            subset_points = target & supported
            if not subset_points:
                raise SystemExit(
                    f"ebook charset shares no code points with {record['family']}"
                )
            output = args.output_dir / record["output"]
            cjk.subset_font(source, output, subset_points)
            license_file = LICENSE_FILES[record["family"]]
            license_path = ROOT / "public" / "fonts" / license_file
            if not license_path.is_file():
                raise SystemExit(f"missing font license text: {license_path}")
            results.append(
                {
                    "family": record["family"],
                    "file": record["output"],
                    "bytes": output.stat().st_size,
                    "sha256": cjk.sha256(output),
                    "weight": record["weight"],
                    "emphasisAlias": record.get("emphasis_alias"),
                    "codePointCount": len(subset_points),
                    "licenseFile": license_file,
                    "licensePath": str(license_path),
                }
            )
    finally:
        lock.close()

    print(json.dumps({"fonts": results}, ensure_ascii=False))


if __name__ == "__main__":
    main()
