import fs from "node:fs";
import path from "node:path";
import { parseLegacyYamlFrontMatter, parseYamlFrontMatter } from "./safe-front-matter.mjs";

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
  "citations",
  "rights",
];

const BOOK_TRANSLATION_METADATA_FIELDS = [
  "title",
  "subtitle",
  "description",
  "script",
  "authors",
  "translators",
  "proofreaders",
  "editors",
  "citation",
  "citations",
  "rights",
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
    record?.[field] === undefined ? [] : [[field, record[field]]]
  )));
}

export function parseMarkdownSource(source) {
  if (/^---\r?\n/u.test(source.replace(/^\uFEFF/u, ""))) return parseYamlFrontMatter(source);
  const lines = source.replace(/^\uFEFF/u, "").split(/\r?\n/u);
  const boundary = lines.findIndex((line) => /^---\s*$/u.test(line));
  if (boundary < 0) return { data: {}, content: source };
  return parseLegacyYamlFrontMatter(
    lines.slice(0, boundary).join("\n"),
    lines.slice(boundary + 1).join("\n")
  );
}

export function parseMarkdownFile(file) {
  return parseMarkdownSource(fs.readFileSync(file, "utf8"));
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
  };
}

export function bookChapterTranslationSourceFromText(bookSlug, chapterId, manifestText, documentText) {
  const manifest = JSON.parse(manifestText);
  const chapters = publishedChapters(manifest.chapters || []);
  const index = chapters.findIndex((chapter) => chapter.id === chapterId);
  if (index < 0) throw new Error(`missing published source chapter ${bookSlug}/${chapterId}`);
  const parsed = parseMarkdownSource(documentText);
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
    markdown,
    manifest,
    chapter: chapters[index],
  };
}

export function readBookChapterTranslationSource(bookSlug, chapterId) {
  const manifestFile = path.join(root, "source", "_books", `${bookSlug}.json`);
  if (!fs.existsSync(manifestFile)) throw new Error(`missing source book ${manifestFile}`);
  const manifestText = fs.readFileSync(manifestFile, "utf8");
  const manifest = JSON.parse(manifestText);
  const documentFile = path.join(root, "source", "_posts", `${manifest.documentSlug}.md`);
  const source = bookChapterTranslationSourceFromText(
    bookSlug,
    chapterId,
    manifestText,
    fs.readFileSync(documentFile, "utf8"),
  );
  return { file: documentFile, ...source };
}

export function translationSourcePayload(source) {
  if (source.type === "post") {
    return {
      body: source.markdown,
      metadata: selectedMetadata(source.metadata, POST_TRANSLATION_METADATA_FIELDS),
    };
  }
  return {
    body: source.markdown,
    chapter: selectedMetadata(source.chapter, CHAPTER_TRANSLATION_METADATA_FIELDS),
    book: selectedMetadata(source.manifest, BOOK_TRANSLATION_METADATA_FIELDS),
  };
}
