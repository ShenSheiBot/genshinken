#!/usr/bin/env python3
"""Audit ordered protected Markdown structure across a language edition.

Direct mode compares one complete source and target. Manifest mode compares
target ranges against their actual source ranges for mixed-origin editions.
This tool verifies machine facts only; it does not grade meaning or prose.
"""

from __future__ import annotations

import argparse
from collections import Counter
from hashlib import sha256
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
NUMBER_RE = re.compile(r"(?<![\w])\d+(?:[.,:/–—-]\d+)*(?![\w])")
PROCESS_MARKER_RE = re.compile(
    r"(?:待确认译名|待人工(?:翻译|复核)|此处未译|翻译过程|机器翻译|"
    r"translation\s+(?:pending|todo)|needs?\s+(?:translation|review)|"
    r"未翻訳|要確認)",
    re.IGNORECASE,
)


class AuditInputError(ValueError):
    pass


def body_without_front_matter(text: str) -> str:
    text = text.lstrip("\ufeff")
    lines = text.splitlines()
    if lines and re.fullmatch(r"---\s*", lines[0]):
        for index in range(1, len(lines)):
            if re.fullmatch(r"---\s*", lines[index]):
                return "\n".join(lines[index + 1 :])
    return text


def resource_map(entries: list[object], label: str) -> dict[str, str]:
    mapping: dict[str, str] = {}
    for raw in entries:
        if not isinstance(raw, dict) or not isinstance(raw.get("id"), str):
            raise AuditInputError(f"{label} equivalence requires string id")
        values = raw.get("values")
        if not isinstance(values, list) or len(values) < 2 or not all(isinstance(value, str) for value in values):
            raise AuditInputError(f"{label} equivalence {raw['id']} requires at least two string values")
        identity = f"{label}:{raw['id']}"
        for value in values:
            if value in mapping and mapping[value] != identity:
                raise AuditInputError(f"{label} value belongs to multiple identities: {value}")
            mapping[value] = identity
    return mapping


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
                digest = sha256("\n".join(fence_content).encode("utf-8")).hexdigest()
                events.append(("code", fence_info, digest))
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
            events.append(("table-separator", line.count("|") - int(line.lstrip().startswith("|")) - int(line.rstrip().endswith("|")) + 1))
        list_item = LIST_ITEM_RE.match(line)
        if list_item:
            marker = list_item.group(2)
            events.append(("list-item", len(list_item.group(1)), "ordered" if marker[0].isdigit() else "unordered"))

        definition = FOOTNOTE_DEF_RE.match(line)
        if definition:
            events.append(("footnote-definition", definition.group(1)))

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


def exact_anchor(body: str, anchor: str, label: str) -> int:
    count = body.count(anchor)
    if count != 1:
        raise AuditInputError(f"{label} anchor must occur exactly once, found {count}: {anchor!r}")
    return body.index(anchor)


def extract_range(text: str, raw_range: object, label: str) -> tuple[str, tuple[int, int]]:
    body = body_without_front_matter(text)
    if raw_range is None:
        return body, (0, len(body))
    if not isinstance(raw_range, dict):
        raise AuditInputError(f"{label} range must be an object or null")
    start_anchor = raw_range.get("start")
    end_anchor = raw_range.get("end")
    if start_anchor is not None and not isinstance(start_anchor, str):
        raise AuditInputError(f"{label} start must be string or null")
    if end_anchor is not None and not isinstance(end_anchor, str):
        raise AuditInputError(f"{label} end must be string or null")
    start = exact_anchor(body, start_anchor, f"{label} start") if start_anchor else 0
    end = exact_anchor(body, end_anchor, f"{label} end") if end_anchor else len(body)
    if end <= start:
        raise AuditInputError(f"{label} end must occur after start")
    return body[start:end], (start, end)


def resolve_path(raw: object, manifest_path: Path) -> Path:
    if not isinstance(raw, str) or not raw:
        raise AuditInputError("manifest path fields must be nonempty strings")
    candidate = Path(raw)
    if candidate.is_absolute():
        return candidate
    cwd_candidate = Path.cwd() / candidate
    return cwd_candidate if cwd_candidate.exists() else manifest_path.parent / candidate


def verify_source_revision(raw_revision: object, source_path: Path) -> None:
    if not isinstance(raw_revision, str) or not re.fullmatch(r"sha256:[0-9a-fA-F]{64}", raw_revision):
        raise AuditInputError(f"source_revision must be sha256:<64 hex> for {source_path}")
    actual = sha256(source_path.read_bytes()).hexdigest()
    if raw_revision.split(":", 1)[1].lower() != actual:
        raise AuditInputError(f"source_revision does not match {source_path}")


def audit_manifest(manifest_path: Path) -> dict[str, object]:
    raw = json.loads(manifest_path.read_text(encoding="utf-8"))
    if raw.get("version") != 1:
        raise AuditInputError("manifest version must be 1")
    target_language = raw.get("target_language")
    if target_language not in {"zh", "en", "ja"}:
        raise AuditInputError("target_language must be zh, en, or ja")
    target_path = resolve_path(raw.get("target_path"), manifest_path)
    target_text = target_path.read_text(encoding="utf-8")
    equivalences = raw.get("resource_equivalences") or {}
    if not isinstance(equivalences, dict):
        raise AuditInputError("resource_equivalences must be an object")
    media_map = resource_map(equivalences.get("media") or [], "media")
    link_map = resource_map(equivalences.get("links") or [], "link")
    segments = raw.get("segments")
    if not isinstance(segments, list) or not segments:
        raise AuditInputError("manifest requires at least one segment")

    failures: list[dict[str, object]] = []
    warnings: list[dict[str, object]] = []
    target_intervals: list[tuple[int, int, str]] = []
    seen_ids: set[str] = set()
    required = {"id", "source_path", "base_edition", "source_revision", "roof_presence", "relationship"}
    for segment in segments:
        if not isinstance(segment, dict) or not required.issubset(segment):
            missing = sorted(required - set(segment if isinstance(segment, dict) else {}))
            raise AuditInputError(f"segment missing required fields: {missing}")
        segment_id = segment["id"]
        if not isinstance(segment_id, str) or not segment_id or segment_id in seen_ids:
            raise AuditInputError(f"segment id must be unique nonempty string: {segment_id!r}")
        seen_ids.add(segment_id)
        source_path = resolve_path(segment["source_path"], manifest_path)
        verify_source_revision(segment["source_revision"], source_path)
        source_text = source_path.read_text(encoding="utf-8")
        source_slice, _ = extract_range(source_text, segment.get("source_range"), f"{segment_id} source")
        target_slice, (target_start, target_end) = extract_range(target_text, segment.get("target_range"), f"{segment_id} target")
        target_intervals.append((target_start, target_end, segment_id))
        segment_failures, segment_warnings = compare_structures(
            parse_structure(source_slice, media_map, link_map),
            parse_structure(target_slice, media_map, link_map),
            segment_id,
        )
        failures.extend(segment_failures)
        warnings.extend(segment_warnings)

    ordered = sorted(target_intervals)
    for previous, current in zip(ordered, ordered[1:]):
        if current[0] < previous[1]:
            failures.append({"field": "target_coverage", "message": f"target segments overlap: {previous[2]} and {current[2]}"})
    target_body = body_without_front_matter(target_text)
    cursor = 0
    for start, end, segment_id in ordered:
        if target_body[cursor:start].strip():
            failures.append({"field": "target_coverage", "message": f"unmapped target content before segment {segment_id}"})
        cursor = max(cursor, end)
    if target_body[cursor:].strip():
        failures.append({"field": "target_coverage", "message": "unmapped target content after final segment"})

    markers = sorted(set(PROCESS_MARKER_RE.findall(target_body)))
    if markers:
        warnings.append({"field": "process_markers", "message": "possible translation-process language remains in target", "target": markers})
    return {"mode": "manifest", "manifest": str(manifest_path), "target": str(target_path), "target_language": target_language, "failures": failures, "warnings": warnings}


def audit_direct(source_path: Path, target_path: Path, target_language: str) -> dict[str, object]:
    source = parse_structure(source_path.read_text(encoding="utf-8"))
    target = parse_structure(target_path.read_text(encoding="utf-8"))
    failures, warnings = compare_structures(source, target)
    if target["process_markers"]:
        warnings.append({"field": "process_markers", "message": "possible translation-process language remains in target", "target": target["process_markers"]})
    return {"mode": "direct", "source": str(source_path), "target": str(target_path), "target_language": target_language, "failures": failures, "warnings": warnings}


def print_report(report: dict[str, object], as_json: bool) -> None:
    if as_json:
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return
    origin = report.get("manifest") or report.get("source")
    print(f"Translation structure audit: {origin} -> {report['target']}")
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
    parser.add_argument("--manifest", type=Path)
    parser.add_argument("--target-language", choices=("zh", "en", "ja"))
    parser.add_argument("--json", action="store_true", help="emit machine-readable JSON")
    args = parser.parse_args()
    try:
        if args.manifest:
            if args.source or args.target or args.target_language:
                parser.error("--manifest cannot be combined with direct source, target, or --target-language")
            report = audit_manifest(args.manifest)
        else:
            if not args.source or not args.target or not args.target_language:
                parser.error("direct mode requires SOURCE TARGET --target-language")
            for path in (args.source, args.target):
                if not path.is_file():
                    parser.error(f"file does not exist: {path}")
            report = audit_direct(args.source, args.target, args.target_language)
    except (AuditInputError, OSError, json.JSONDecodeError) as error:
        print(f"INPUT ERROR: {error}", file=sys.stderr)
        return 2
    print_report(report, args.json)
    return 1 if report["failures"] else 0


if __name__ == "__main__":
    sys.exit(main())
