import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { assignSectionNumbers } from "../lib/post-numbering.ts";
import { renderMarkdown } from "../lib/markdown.ts";

const postsDirectory = path.join(process.cwd(), "source", "_posts");
const upperSlug = "deleuze-difference-repetition-review-1";
const lowerSlug = "deleuze-difference-repetition-review-2";

function isoDate(value) {
  if (value instanceof Date && !Number.isNaN(+value)) return value.toISOString().slice(0, 10);
  return String(value ?? "").trim();
}

const posts = fs.readdirSync(postsDirectory)
  .filter((file) => file.endsWith(".md"))
  .flatMap((file) => {
    const source = fs.readFileSync(path.join(postsDirectory, file), "utf8");
    const data = matter(source).data;
    if (data.draft === true) return [];
    const dateISO = isoDate(data.date);
    return [{
      slug: String(data.slug ?? path.basename(file, ".md")),
      section: String(data.section ?? ""),
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

assignSectionNumbers(posts);

const upper = posts.find((post) => post.slug === upperSlug);
const lower = posts.find((post) => post.slug === lowerSlug);
assert.ok(upper && lower, "the two legacy Difference and Repetition reviews must exist");
assert.deepEqual(
  [upper.section, upper.sectionNo, upper.originalDate, upper.dateISO],
  ["negative", "01", "2025-03-08", "2026-07-22"]
);
assert.deepEqual(
  [lower.section, lower.sectionNo, lower.originalDate, lower.dateISO],
  ["negative", "02", "2025-03-29", "2026-07-22"]
);

const upperDocument = matter(
  fs.readFileSync(path.join(postsDirectory, `${upperSlug}.md`), "utf8")
);
const lowerDocument = matter(
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

console.log("negative editorial section verification passed");
