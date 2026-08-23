#!/usr/bin/env python3
"""Audit ordered protected Markdown structure across a language edition.

The command compares one complete source and target.
This tool verifies machine facts only; it does not grade meaning or prose.
"""

from __future__ import annotations

import argparse
from collections import Counter
import json
from pathlib import Path
import re
import sys
import unicodedata


FENCE_RE = re.compile(r"^\s*(`{3,}|~{3,})(.*)$")
HEADING_RE = re.compile(r"^(#{1,6})\s+\S")
FOOTNOTE_DEF_RE = re.compile(r"^\[\^([^\]]+)\]:")
FOOTNOTE_CALL_RE = re.compile(r"\[\^([^\]]+)\]")
HTML_IMAGE_RE = re.compile(r"<img\b[^>]*\bsrc\s*=\s*(['\"])(.*?)\1", re.IGNORECASE)
HTML_TAG_RE = re.compile(r"<(/?)([a-z][\w:-]*)\b[^>]*>", re.IGNORECASE)
HTML_LINK_RE = re.compile(r"<a\b[^>]*\bhref\s*=\s*(['\"])(.*?)\1", re.IGNORECASE)
HTML_ALT_RE = re.compile(r"\balt\s*=\s*(['\"])(.*?)\1", re.IGNORECASE)
HTML_CAPTION_RE = re.compile(r"<figcaption\b[^>]*>(.*?)</figcaption>", re.IGNORECASE)
URL_RE = re.compile(r"https?://[^\s<>\]\[\"']+")
REFERENCE_DEF_RE = re.compile(r"^\s*\[([^\]^][^\]]*)\]:\s*(?:<([^>]+)>|(\S+))")
LIST_ITEM_RE = re.compile(r"^(\s*)([-+*]|\d+[.)])\s+\S")
HORIZONTAL_RULE_RE = re.compile(r"^\s{0,3}(?:(?:\*\s*){3,}|(?:-\s*){3,}|(?:_\s*){3,})$")
TABLE_SEPARATOR_RE = re.compile(r"^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$")
TABLE_ROW_RE = re.compile(r"^\s*\|?.*\|.*\|?\s*$")
SEMANTIC_CAPTION_RE = re.compile(r"^\s*\[(图题|图注|表题|表注)\]\s*(.*)$")
NUMBER_RE = re.compile(r"(?<![\w])\d+(?:[.,:/–—-]\d+)*(?![\w])")
PROCESS_MARKER_RE = re.compile(
    r"(?:待确认译名|待人工(?:翻译|复核)|此处未译|翻译过程|机器翻译|"
    r"translation\s+(?:pending|todo)|needs?\s+(?:translation|review)|"
    r"未翻訳|要確認)",
    re.IGNORECASE,
)


def body_without_front_matter(text: str) -> str:
    text = text.lstrip("\ufeff")
    lines = text.splitlines()
    if lines and re.fullmatch(r"---\s*", lines[0]):
        for index in range(1, len(lines)):
            if re.fullmatch(r"---\s*", lines[index]):
                return "\n".join(lines[index + 1 :])
    return text


def normalize_resource(value: str, mapping: dict[str, str]) -> str:
    normalized = mapping.get(value, value)
    # A localized edition may legitimately point to the same canonical Roof
    # work through its locale-prefixed route (`/en/...` or `/ja/...`).  The
    # structure audit compares protected destinations, not locale routing;
    # strip only that leading locale so the semantic destination remains
    # comparable.  Locale correctness is checked by the internal-link gate.
    return re.sub(r"^/(?:en|ja)(?=/(?:posts|books)/)", "", normalized)


def destination_at(text: str, opening: int) -> tuple[int, str] | None:
    """Parse a Markdown (...) destination beginning at opening `(`."""
    if opening >= len(text) or text[opening] != "(":
        return None
    cursor = opening + 1
    while cursor < len(text) and text[cursor].isspace():
        cursor += 1
    if cursor < len(text) and text[cursor] == "<":
        close = text.find(">", cursor + 1)
        if close == -1:
            return None
        tail = text.find(")", close + 1)
        return (tail + 1, text[cursor + 1 : close]) if tail != -1 else None

    start = cursor
    depth = 1
    escaped = False
    destination_end: int | None = None
    while cursor < len(text):
        char = text[cursor]
        if escaped:
            escaped = False
        elif char == "\\":
            escaped = True
        elif char == "(":
            depth += 1
        elif char == ")":
            depth -= 1
            if depth == 0:
                destination_end = destination_end or cursor
                return cursor + 1, text[start:destination_end]
        elif char.isspace() and depth == 1 and destination_end is None:
            destination_end = cursor
        cursor += 1
    return None


def reference_definitions(text: str) -> dict[str, str]:
    definitions: dict[str, str] = {}
    for line in text.splitlines():
        match = REFERENCE_DEF_RE.match(line)
        if match:
            definitions[match.group(1).strip().casefold()] = match.group(2) or match.group(3)
    return definitions


def markdown_images(line: str, references: dict[str, str]) -> list[tuple[int, int, str, bool]]:
    found: list[tuple[int, int, str, bool]] = []
    cursor = 0
    while True:
        start = line.find("![", cursor)
        if start == -1:
            break
        close_alt = line.find("]", start + 2)
        if close_alt == -1:
            break
        after = close_alt + 1
        if after < len(line) and line[after] == "(":
            parsed = destination_at(line, after)
            if parsed:
                end, destination = parsed
                found.append((start, end, destination, bool(line[start + 2 : close_alt].strip())))
                cursor = end
                continue
        if after < len(line) and line[after] == "[":
            close_id = line.find("]", after + 1)
            if close_id != -1:
                identifier = line[after + 1 : close_id] or line[start + 2 : close_alt]
                destination = references.get(identifier.strip().casefold())
                if destination:
                    found.append((start, close_id + 1, destination, bool(line[start + 2 : close_alt].strip())))
                cursor = close_id + 1
                continue
        identifier = line[start + 2 : close_alt].strip().casefold()
        destination = references.get(identifier)
        if destination:
            found.append((start, close_alt + 1, destination, bool(line[start + 2 : close_alt].strip())))
        cursor = close_alt + 1
    return found


def markdown_links(line: str, references: dict[str, str], excluded: list[tuple[int, int]]) -> list[tuple[int, int, str, bool]]:
    found: list[tuple[int, int, str, bool]] = []
    cursor = 0
    while True:
        start = line.find("[", cursor)
        if start == -1:
            break
        if start > 0 and line[start - 1] == "!":
            cursor = start + 1
            continue
        if any(left <= start < right for left, right in excluded) or line.startswith("[^", start):
            cursor = start + 1
            continue
        close_label = line.find("]", start + 1)
        if close_label == -1:
            break
        after = close_label + 1
        if after < len(line) and line[after] == "(":
            parsed = destination_at(line, after)
            if parsed:
                end, destination = parsed
                found.append((start, end, destination, bool(line[start + 1 : close_label].strip())))
                cursor = end
                continue
        if after < len(line) and line[after] == "[":
            close_id = line.find("]", after + 1)
            if close_id != -1:
                identifier = line[after + 1 : close_id] or line[start + 1 : close_label]
                destination = references.get(identifier.strip().casefold())
                if destination:
                    found.append((start, close_id + 1, destination, bool(line[start + 1 : close_label].strip())))
                cursor = close_id + 1
                continue
        cursor = close_label + 1
    return found


def overlaps(span: tuple[int, int], spans: list[tuple[int, int]]) -> bool:
    return any(span[0] < right and left < span[1] for left, right in spans)


def trim_url(url: str) -> str:
    while url and url[-1] in ".,;:!?，。；：！？":
        url = url[:-1]
    while url.endswith(")") and url.count("(") < url.count(")"):
        url = url[:-1]
    return url


def logical_paragraph_count(lines: list[str]) -> int:
    count = 0
    inside = False
    in_fence = False
    fence_char = ""
    for line in lines:
        match = FENCE_RE.match(line)
        if match:
            token = match.group(1)
            if not in_fence:
                in_fence = True
                fence_char = token[0]
            elif token[0] == fence_char:
                in_fence = False
            inside = False
            continue
        if in_fence or not line.strip():
            inside = False
            continue
        if not inside:
            count += 1
            inside = True
    return count


def table_column_count(line: str) -> int:
    stripped = line.strip().strip("|")
    return len(re.split(r"(?<!\\)\|", stripped))


def footnote_definition_has_content(lines: list[str], index: int) -> bool:
    first = FOOTNOTE_DEF_RE.match(lines[index])
    if first and lines[index][first.end() :].strip():
        return True
    cursor = index + 1
    while cursor < len(lines):
        line = lines[cursor]
        if re.match(r"^(?: {2,}|\t)", line):
            if line.strip():
                return True
            cursor += 1
            continue
        break
    return False


def protected_events(text: str, media_map: dict[str, str], link_map: dict[str, str]) -> tuple[list[tuple[object, ...]], list[str]]:
    references = reference_definitions(text)
    events: list[tuple[object, ...]] = []
    errors: list[str] = []
    lines = text.splitlines()
    in_fence = False
    fence_char = ""
    fence_info = ""
    fence_content: list[str] = []
    in_quote = False

    for line_number, line in enumerate(lines, start=1):
        fence = FENCE_RE.match(line)
        if fence:
            token, info = fence.groups()
            if not in_fence:
                in_fence = True
                fence_char = token[0]
                fence_info = info.strip().split(maxsplit=1)[0] if info.strip() else ""
                fence_content = []
            elif token[0] == fence_char:
                events.append(("code", fence_info, "\n".join(fence_content)))
                in_fence = False
                fence_char = ""
            else:
                fence_content.append(line)
            if in_quote:
                events.append(("blockquote-end",))
                in_quote = False
            continue
        if in_fence:
            fence_content.append(line)
            continue

        is_quote = bool(re.match(r"^\s{0,3}>", line))
        if is_quote and not in_quote:
            events.append(("blockquote-start",))
        elif in_quote and not is_quote:
            events.append(("blockquote-end",))
        in_quote = is_quote

        heading = HEADING_RE.match(line)
        if heading:
            events.append(("heading", len(heading.group(1))))
        if HORIZONTAL_RULE_RE.match(line):
            events.append(("horizontal-rule",))
        table = TABLE_SEPARATOR_RE.match(line)
        if table:
            events.append(("table-separator", table_column_count(line)))
        elif TABLE_ROW_RE.match(line):
            events.append(("table-row", table_column_count(line)))
        list_item = LIST_ITEM_RE.match(line)
        if list_item:
            marker = list_item.group(2)
            events.append(("list-item", len(list_item.group(1)), "ordered" if marker[0].isdigit() else "unordered"))

        definition = FOOTNOTE_DEF_RE.match(line)
        if definition:
            events.append(("footnote-definition", definition.group(1), footnote_definition_has_content(lines, line_number - 1)))

        caption = SEMANTIC_CAPTION_RE.match(line)
        if caption:
            events.append(("semantic-caption", caption.group(1), bool(caption.group(2).strip())))

        reference = REFERENCE_DEF_RE.match(line)
        reference_span: list[tuple[int, int]] = []
        if reference:
            destination = reference.group(2) or reference.group(3)
            normalized = normalize_resource(destination, media_map)
            normalized = normalize_resource(normalized, link_map)
            events.append(("reference-definition", reference.group(1).strip().casefold(), normalized))
            reference_span.append(reference.span())

        inline: list[tuple[int, tuple[object, ...], tuple[int, int]]] = []
        images = markdown_images(line, references)
        occupied = [(start, end) for start, end, _, _ in images]
        for start, end, destination, has_alt in images:
            inline.append((start, ("image", normalize_resource(destination, media_map), has_alt), (start, end)))
        for match in HTML_IMAGE_RE.finditer(line):
            tag = match.group(0)
            alt = HTML_ALT_RE.search(tag)
            inline.append((match.start(), ("image", normalize_resource(match.group(2), media_map), bool(alt and alt.group(2).strip())), match.span()))
            occupied.append(match.span())
        links = markdown_links(line, references, occupied)
        for start, end, destination, has_label in links:
            inline.append((start, ("link", normalize_resource(destination, link_map), has_label), (start, end)))
            occupied.append((start, end))
        for match in HTML_LINK_RE.finditer(line):
            inline.append((match.start(), ("link", normalize_resource(match.group(2), link_map), True), match.span()))
            occupied.append(match.span())
        for match in FOOTNOTE_CALL_RE.finditer(line):
            if definition and match.start() == definition.start():
                continue
            inline.append((match.start(), ("footnote-call", match.group(1)), match.span()))
            occupied.append(match.span())
        for match in URL_RE.finditer(line):
            if overlaps(match.span(), occupied + reference_span):
                continue
            url = trim_url(match.group(0))
            inline.append((match.start(), ("link", normalize_resource(url, link_map), True), match.span()))
        for match in HTML_TAG_RE.finditer(line):
            if match.group(2).lower() in {"img", "a", "span"}:
                continue
            inline.append((match.start(), ("html-tag", "close" if match.group(1) else "open", match.group(2).lower()), match.span()))
        for match in HTML_CAPTION_RE.finditer(line):
            inline.append((match.start(), ("figure-caption", bool(re.sub(r"<[^>]+>", "", match.group(1)).strip())), match.span()))
        for _, event, _ in sorted(inline, key=lambda item: item[0]):
            events.append(event)

    if in_quote:
        events.append(("blockquote-end",))
    if in_fence:
        errors.append(f"unclosed code fence beginning before line {len(lines)}")
    return events, errors


def parse_structure(text: str, media_map: dict[str, str] | None = None, link_map: dict[str, str] | None = None) -> dict[str, object]:
    body = body_without_front_matter(text)
    events, errors = protected_events(body, media_map or {}, link_map or {})
    return {
        "events": events,
        "errors": errors,
        "numbers": Counter(NUMBER_RE.findall(unicodedata.normalize("NFKC", body))),
        "logical_paragraphs": logical_paragraph_count(body.splitlines()),
        "process_markers": sorted(set(PROCESS_MARKER_RE.findall(body))),
    }


def first_event_difference(source: list[tuple[object, ...]], target: list[tuple[object, ...]]) -> dict[str, object]:
    for index, (left, right) in enumerate(zip(source, target)):
        if left != right:
            return {"index": index, "source": left, "target": right}
    index = min(len(source), len(target))
    return {
        "index": index,
        "source": source[index] if index < len(source) else None,
        "target": target[index] if index < len(target) else None,
    }


def serializable(value: object) -> object:
    if isinstance(value, Counter):
        return dict(sorted(value.items()))
    return value


def compare_structures(source: dict[str, object], target: dict[str, object], segment: str = "complete") -> tuple[list[dict[str, object]], list[dict[str, object]]]:
    failures: list[dict[str, object]] = []
    warnings: list[dict[str, object]] = []
    if source["errors"] or target["errors"]:
        failures.append({"segment": segment, "field": "markdown", "message": "unclosed protected Markdown structure", "source": source["errors"], "target": target["errors"]})
    source_events = source["events"]
    target_events = target["events"]
    if source_events != target_events:
        failures.append(
            {
                "segment": segment,
                "field": "protected_events",
                "message": "ordered protected Markdown events differ",
                "source_count": len(source_events),
                "target_count": len(target_events),
                "first_difference": first_event_difference(source_events, target_events),
            }
        )
    for field, label in {"numbers": "Arabic-number tokens", "logical_paragraphs": "logical paragraph count"}.items():
        if source[field] != target[field]:
            warnings.append(
                {
                    "segment": segment,
                    "field": field,
                    "message": f"inspect {label} difference; localization may be legitimate",
                    "source": serializable(source[field]),
                    "target": serializable(target[field]),
                }
            )
    return failures, warnings


def audit_direct(source_path: Path, target_path: Path, target_language: str) -> dict[str, object]:
    source = parse_structure(source_path.read_text(encoding="utf-8"))
    target = parse_structure(target_path.read_text(encoding="utf-8"))
    failures, warnings = compare_structures(source, target)
    if target["process_markers"]:
        failures.append({"field": "process_markers", "message": "translation-process language remains in target", "target": target["process_markers"]})
    return {"mode": "direct", "source": str(source_path), "target": str(target_path), "target_language": target_language, "failures": failures, "warnings": warnings}


def print_report(report: dict[str, object], as_json: bool) -> None:
    if as_json:
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return
    print(f"Translation structure audit: {report['source']} -> {report['target']}")
    for item in report["failures"]:
        print(f"FAIL [{item['field']}] {item['message']}")
    for item in report["warnings"]:
        print(f"WARN [{item['field']}] {item['message']}")
    if not report["failures"] and not report["warnings"]:
        print("PASS protected structure matches; literary and semantic review is still required")
    else:
        print(f"Result: {len(report['failures'])} failure(s), {len(report['warnings'])} warning(s)")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", nargs="?", type=Path)
    parser.add_argument("target", nargs="?", type=Path)
    parser.add_argument("--target-language", choices=("zh", "en", "ja"))
    parser.add_argument("--json", action="store_true", help="emit machine-readable JSON")
    args = parser.parse_args()
    try:
        if not args.source or not args.target or not args.target_language:
            parser.error("SOURCE TARGET --target-language are required")
        for path in (args.source, args.target):
            if not path.is_file():
                parser.error(f"file does not exist: {path}")
        report = audit_direct(args.source, args.target, args.target_language)
    except OSError as error:
        print(f"INPUT ERROR: {error}", file=sys.stderr)
        return 2
    print_report(report, args.json)
    return 1 if report["failures"] else 0


if __name__ == "__main__":
    sys.exit(main())
