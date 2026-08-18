import fs from "node:fs";
import path from "node:path";
import { parseLegacyYamlFrontMatter, parseYamlFrontMatter } from "./safe-front-matter.mjs";
import { sha256 } from "./translation-contract.mjs";

const root = process.cwd();

const POST_TRANSLATION_METADATA_FIELDS = [
  "title",
  "subtitle",
  "title_note",
  "excerpt",
  "script",
  "format",
  "post_author",
  "post_authors",
  "author",
  "authors",
  "interviewee",
  "interviewees",
  "interviewer",
  "interviewers",
  "participant",
  "participants",
  "speaker",
  "speakers",
  "translator",
  "translators",
  "proofreader",
  "proofreaders",
  "editor",
  "editors",
  "license",
  "citation",
];

function canonicalPayloadValue(value) {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(canonicalPayloadValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().flatMap((key) => {
      if (value[key] === undefined) return [];
      return [[key, canonicalPayloadValue(value[key])]];
    }));
  }
  return value;
}

export function postTranslationPayloadRevision(parsed) {
  const metadata = Object.fromEntries(POST_TRANSLATION_METADATA_FIELDS.flatMap((field) => (
    parsed.data[field] === undefined ? [] : [[field, canonicalPayloadValue(parsed.data[field])]]
  )));
  return sha256(JSON.stringify({ version: 1, metadata, markdown: parsed.content }));
}

const BOOK_TRANSLATION_METADATA_FIELDS = [
  "title",
  "subtitle",
  "description",
  "script",
  "authors",
  "translators",
  "proofreaders",
  "editors",
  "citations",
];

const CHAPTER_TRANSLATION_METADATA_FIELDS = [
  "title",
  "format",
  "authors",
  "translators",
  "proofreaders",
  "editors",
  "citation",
  "citations",
];

function selectedMetadata(record, fields) {
  return Object.fromEntries(fields.flatMap((field) => (
    record?.[field] === undefined ? [] : [[field, canonicalPayloadValue(record[field])]]
  )));
}

export function bookChapterTranslationPayloadRevision(manifest, chapter, markdown) {
  return sha256(JSON.stringify({
    version: 1,
    book: selectedMetadata(manifest, BOOK_TRANSLATION_METADATA_FIELDS),
    chapter: selectedMetadata(chapter, CHAPTER_TRANSLATION_METADATA_FIELDS),
    markdown,
  }));
}

export function parseMarkdownFile(file) {
  const source = fs.readFileSync(file, "utf8");
  if (/^---\r?\n/u.test(source.replace(/^\uFEFF/u, ""))) return parseYamlFrontMatter(source);
  const lines = source.replace(/^\uFEFF/u, "").split(/\r?\n/u);
  const boundary = lines.findIndex((line) => /^---\s*$/u.test(line));
  if (boundary < 0) return { data: {}, content: source };
  return parseLegacyYamlFrontMatter(
    lines.slice(0, boundary).join("\n"),
    lines.slice(boundary + 1).join("\n")
  );
}

function extractFootnoteDefinitions(markdown) {
  const lines = markdown.split(/\r?\n/u);
  const definitions = new Map();
  for (let index = 0; index < lines.length; index += 1) {
    const match = /^\[\^([^\]]+)\]:[ \t]*(.*)$/u.exec(lines[index]);
    if (!match) continue;
    const definitionLines = [lines[index]];
    let cursor = index + 1;
    while (cursor < lines.length) {
      if (/^(?: {2,}|\t)\S/u.test(lines[cursor])) {
        definitionLines.push(lines[cursor]);
        cursor += 1;
        continue;
      }
      if (lines[cursor].trim() === "" && cursor + 1 < lines.length && /^(?: {2,}|\t)\S/u.test(lines[cursor + 1])) {
        definitionLines.push(lines[cursor]);
        cursor += 1;
        continue;
      }
      break;
    }
    definitions.set(match[1], definitionLines.join("\n"));
    for (let line = index; line < cursor; line += 1) lines[line] = "";
    index = cursor - 1;
  }
  return { lines, definitions };
}

function footnoteReferences(markdown) {
  const references = [];
  const seen = new Set();
  for (const match of markdown.matchAll(/\[\^([^\]]+)\]/gu)) {
    if (seen.has(match[1])) continue;
    seen.add(match[1]);
    references.push(match[1]);
  }
  return references;
}

function appendReferencedFootnotes(markdown, definitions, label) {
  const references = footnoteReferences(markdown);
  const seen = new Set(references);
  for (let index = 0; index < references.length; index += 1) {
    const id = references[index];
    const definition = definitions.get(id);
    if (!definition) throw new Error(`${label}: missing footnote definition [^${id}]`);
    for (const nested of footnoteReferences(definition)) {
      if (seen.has(nested)) continue;
      seen.add(nested);
      references.push(nested);
    }
  }
  const appendix = references.map((id) => definitions.get(id)).join("\n\n");
  return [markdown.trim(), appendix].filter(Boolean).join("\n\n");
}

function publishedChapters(chapters) {
  return chapters.flatMap((chapter) => [
    ...(chapter.status === "published" ? [chapter] : []),
    ...publishedChapters(chapter.children || []),
  ]);
}

export function readPostTranslationSource(slug) {
  const file = path.join(root, "source", "_posts", `${slug}.md`);
  if (!fs.existsSync(file)) throw new Error(`missing source post ${file}`);
  const parsed = parseMarkdownFile(file);
  return {
    file,
    markdown: parsed.content,
    metadata: parsed.data,
    revision: postTranslationPayloadRevision(parsed),
    revisionScope: "translation-payload",
  };
}

export function readBookChapterTranslationSource(bookSlug, chapterId) {
  const manifestFile = path.join(root, "source", "_books", `${bookSlug}.json`);
  if (!fs.existsSync(manifestFile)) throw new Error(`missing source book ${manifestFile}`);
  const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
  const chapters = publishedChapters(manifest.chapters || []);
  const index = chapters.findIndex((chapter) => chapter.id === chapterId);
  if (index < 0) throw new Error(`missing published source chapter ${bookSlug}/${chapterId}`);
  const documentFile = path.join(root, "source", "_posts", `${manifest.documentSlug}.md`);
  const parsed = parseMarkdownFile(documentFile);
  const { lines, definitions } = extractFootnoteDefinitions(parsed.content);
  const anchorLine = (anchor) => lines.findIndex((line) => (
    new RegExp(`<h[1-6]\\b[^>]*\\bid=["']${anchor.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}["']`, "iu")
  ).test(line));
  const start = anchorLine(chapters[index].anchor);
  const end = index + 1 < chapters.length ? anchorLine(chapters[index + 1].anchor) : lines.length;
  if (start < 0 || end < 0 || end < start) throw new Error(`cannot extract source chapter ${bookSlug}/${chapterId}`);
  const body = lines.slice(start + 1, end).join("\n").trim();
  const markdown = appendReferencedFootnotes(body, definitions, `${bookSlug}/${chapterId}`);
  return {
    file: documentFile,
    markdown,
    revision: bookChapterTranslationPayloadRevision(manifest, chapters[index], markdown),
    revisionScope: "chapter-translation-payload",
    manifest,
    chapter: chapters[index],
  };
}
