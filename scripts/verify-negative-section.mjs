import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  assignPostNumbers,
  comparePostNumbersDescending,
} from "../lib/post-numbering.ts";
import { renderMarkdown } from "../lib/markdown.ts";
import {
  parseLegacyYamlFrontMatter,
  parseYamlFrontMatter,
} from "../lib/safe-front-matter.mjs";
import { topicMembershipNumber } from "../lib/topic-numbering.ts";

const postsDirectory = path.join(process.cwd(), "source", "_posts");
const archiveIndexPath = path.join(process.cwd(), "app", "search", "ArchiveIndex.tsx");
const upperSlug = "deleuze-difference-repetition-review-1";
const lowerSlug = "deleuze-difference-repetition-review-2";

function isoDate(value) {
  if (value instanceof Date && !Number.isNaN(+value)) return value.toISOString().slice(0, 10);
  return String(value ?? "").trim();
}

function frontMatterData(source) {
  if (/^---[^\r\n]*\r?(?:\n|$)/u.test(source)) return parseYamlFrontMatter(source).data;
  const lines = source.split(/\r?\n/u);
  const closingDelimiter = lines.findIndex((line) => /^---\s*$/u.test(line));
  assert.ok(closingDelimiter >= 0, "legacy post frontmatter must have a closing delimiter");
  return parseLegacyYamlFrontMatter(lines.slice(0, closingDelimiter).join("\n")).data;
}

delete globalThis.__UN_CANON_FRONT_MATTER_EXECUTED__;
assert.throws(
  () =>
    parseYamlFrontMatter(
      "---js\nglobalThis.__UN_CANON_FRONT_MATTER_EXECUTED__ = true; ({ title: 'unsafe' })\n---\nbody"
    ),
  /exact YAML delimiter/u,
  "typed JavaScript front matter must be rejected before parser selection"
);
assert.equal(
  globalThis.__UN_CANON_FRONT_MATTER_EXECUTED__,
  undefined,
  "rejected JavaScript front matter must never execute"
);
assert.deepEqual(
  parseYamlFrontMatter("---\ntitle: safe\n---\nbody").data,
  { title: "safe" },
  "standard YAML front matter must retain its existing semantics"
);

const posts = fs.readdirSync(postsDirectory)
  .filter((file) => file.endsWith(".md"))
  .flatMap((file) => {
    const source = fs.readFileSync(path.join(postsDirectory, file), "utf8");
    const data = frontMatterData(source);
    if (data.draft === true) return [];
    const dateISO = isoDate(data.date);
    return [{
      slug: String(data.slug ?? path.basename(file, ".md")),
      section: String(data.section ?? ""),
      no: "00",
      sectionNo: "00",
      timestamp: +new Date(`${dateISO}T00:00:00Z`),
      sortOrder: Number(data.sort_order ?? data.sortOrder ?? data.order ?? 0),
      originalDate: isoDate(data.original_date),
      dateISO,
    }];
  })
  .sort(
    (a, b) =>
      b.timestamp - a.timestamp ||
      b.sortOrder - a.sortOrder ||
      a.slug.localeCompare(b.slug)
  );

assignPostNumbers(posts);

const regularPosts = posts.filter((post) => post.section !== "negative");
assert.deepEqual(
  regularPosts.map((post) => Number(post.no)),
  Array.from({ length: regularPosts.length }, (_, index) => regularPosts.length - index),
  "regular posts must follow publication order in a contiguous site-wide sequence that excludes archival negative posts"
);
assert.deepEqual(
  [
    topicMembershipNumber("00", 0),
    topicMembershipNumber("01", 0),
    topicMembershipNumber("01", 1),
  ],
  ["00", "01", "02"],
  "topic cover markers must retain preface 00 and then follow item order within the main group"
);

const libraryPosts = [...posts].sort(comparePostNumbersDescending);
const librarySlugs = libraryPosts.map((post) => post.slug);
const numberOneIndex = libraryPosts.findIndex((post) => post.no === "1");
const upperLibraryIndex = librarySlugs.indexOf(upperSlug);
const lowerLibraryIndex = librarySlugs.indexOf(lowerSlug);
assert.ok(
  numberOneIndex < upperLibraryIndex && upperLibraryIndex < lowerLibraryIndex,
  "the library must keep descending numeric order: 1, -1, -2"
);

const upper = posts.find((post) => post.slug === upperSlug);
const lower = posts.find((post) => post.slug === lowerSlug);
assert.ok(upper && lower, "the two legacy Difference and Repetition reviews must exist");
assert.deepEqual(
  [upper.section, upper.no, upper.sectionNo, upper.originalDate, upper.dateISO],
  ["negative", "-1", "01", "2025-03-08", "2026-07-22"]
);
assert.deepEqual(
  [lower.section, lower.no, lower.sectionNo, lower.originalDate, lower.dateISO],
  ["negative", "-2", "02", "2025-03-29", "2026-07-22"]
);

const upperDocument = parseYamlFrontMatter(
  fs.readFileSync(path.join(postsDirectory, `${upperSlug}.md`), "utf8")
);
const lowerDocument = parseYamlFrontMatter(
  fs.readFileSync(path.join(postsDirectory, `${lowerSlug}.md`), "utf8")
);
assert.deepEqual(
  [upperDocument.data.title, upperDocument.data.excerpt, upperDocument.data.post_author],
  ["解码学", "《差异与重复》书评（上）", "芳草"]
);
assert.deepEqual(
  [lowerDocument.data.title, lowerDocument.data.excerpt, lowerDocument.data.post_author],
  ["德勒兹的斯大林主义", "《差异与重复》书评（下）", "芳草"]
);

const lowerHtml = await renderMarkdown(lowerDocument.content);
assert.match(lowerHtml, /class="katex"/u, "the lower review must render mathematical notation through KaTeX");
assert.doesNotMatch(lowerHtml, /\$(?:dx|dy|x|i|a|n)\$/u, "rendered prose must not expose inline TeX markers");

const latestArticleSlugs = posts
  .filter((post) => post.section !== "multimedia")
  .slice(0, 6)
  .map((post) => post.slug);
assert.ok(
  latestArticleSlugs.includes(upperSlug) && latestArticleSlugs.includes(lowerSlug),
  "both reviews must remain on the actual-publication latest timeline"
);

const archiveIndexSource = fs.readFileSync(archiveIndexPath, "utf8");
assert.match(
  archiveIndexSource,
  /className=\{styles\.classification\}>\s*<b>\{section\.label\}<\/b>\s*<i>\{post\.sectionNo\}<\/i>/u,
  "library classifications must display the section label before its section number"
);

console.log("negative editorial section verification passed");
