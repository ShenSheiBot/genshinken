#!/usr/bin/env python3

from __future__ import annotations

import importlib.util
from pathlib import Path
import tempfile
import unittest

SCRIPT = Path(__file__).parents[1] / "scripts" / "audit-translation-structure.py"
SPEC = importlib.util.spec_from_file_location("audit_translation_structure", SCRIPT)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError(f"cannot load product translation auditor: {SCRIPT}")
audit = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(audit)


class ProtectedStructureTests(unittest.TestCase):
    def failures(self, source: str, target: str, media_map: dict[str, str] | None = None) -> list[dict[str, object]]:
        found, _ = audit.compare_structures(
            audit.parse_structure(source, media_map),
            audit.parse_structure(target, media_map),
        )
        return found

    def test_identical_structure_passes(self) -> None:
        text = "## Heading\n\n> Quote[^a]\n\n[^a]: Note\n"
        self.assertEqual(self.failures(text, text), [])

    def test_blockquote_and_list_reordering_fails(self) -> None:
        source = "> Quotation\n\n- Item\n"
        target = "- Item\n\n> Quotation\n"
        self.assertTrue(self.failures(source, target))

    def test_code_content_change_fails(self) -> None:
        source = "```js\nconst value = 1;\n```\n"
        target = "```js\nconst value = 2;\n```\n"
        self.assertTrue(self.failures(source, target))

    def test_inline_language_span_does_not_invent_document_structure(self) -> None:
        source = "1. 中文书目\n"
        target = '1. <span lang="zh-Hans">中文书目</span>\n'
        self.assertEqual(self.failures(source, target), [])

    def test_structural_html_change_still_fails(self) -> None:
        source = "Paragraph.\n"
        target = "<figure><figcaption>Caption</figcaption></figure>\n"
        self.assertTrue(self.failures(source, target))

    def test_reference_image_removed_fails(self) -> None:
        source = "![Caption][figure]\n\n[figure]: https://example.test/image.png\n"
        target = "Ordinary paragraph.\n\n[figure]: https://example.test/image.png\n"
        self.assertTrue(self.failures(source, target))

    def test_parenthesized_image_url_change_fails(self) -> None:
        source = "![Caption](https://example.test/image(1).png)\n"
        target = "![Caption](https://example.test/image(2).png)\n"
        self.assertTrue(self.failures(source, target))

    def test_declared_media_equivalence_passes(self) -> None:
        source_url = "https://example.test/image(1).png"
        target_url = "/attachments/work/figure-001.png"
        mapping = {source_url: "media:figure-001", target_url: "media:figure-001"}
        source = f"![Caption]({source_url})\n"
        target = f"![Translated caption]({target_url})\n"
        self.assertEqual(self.failures(source, target, mapping), [])

    def test_localized_internal_route_is_same_protected_destination(self) -> None:
        source = "See [Part 2](/posts/part-2).\n"
        target = "See [第2回](/ja/posts/part-2).\n"
        self.assertEqual(self.failures(source, target), [])

    def test_semantic_caption_removal_fails(self) -> None:
        source = "[图题] Figure title.\n\n![Figure](/figure.png)\n"
        target = "![Figure](/figure.png)\n"
        self.assertTrue(self.failures(source, target))

    def test_empty_footnote_definition_fails(self) -> None:
        source = "Text[^a].\n\n[^a]: Complete note.\n"
        target = "Text[^a].\n\n[^a]:\n"
        self.assertTrue(self.failures(source, target))

    def test_table_row_removal_fails(self) -> None:
        source = "| A | B |\n| --- | --- |\n| 1 | 2 |\n"
        target = "| A | B |\n| --- | --- |\n"
        self.assertTrue(self.failures(source, target))

    def test_process_marker_is_a_failure(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "source.md"
            target = Path(directory) / "target.md"
            source.write_text("Complete prose.\n", encoding="utf-8")
            target.write_text("Complete prose. 待人工翻译。\n", encoding="utf-8")
            report = audit.audit_direct(source, target, "ja")
        self.assertTrue(any(item["field"] == "process_markers" for item in report["failures"]))

if __name__ == "__main__":
    unittest.main()
