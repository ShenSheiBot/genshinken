import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { validateBookChapterSectionHeadings } from "../lib/book-section-contract.mjs";
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

const repositoryRoot = process.cwd();
const manifestRelativePath = path.join("source", "_books", "shulgin-dni.json");
const bookBaseline = JSON.parse(
  fs.readFileSync(path.join(repositoryRoot, manifestRelativePath), "utf8")
);

function bookFixture(mutate) {
  const value = structuredClone(bookBaseline);
  mutate(value);
  return value;
}

function bookChapter(value, id) {
  const match = value.chapters.find((candidate) => candidate.id === id);
  assert.ok(match, `fixture must contain chapter ${id}`);
  return match;
}

const sectionMutationCases = [
  {
    name: "missing-status",
    mutate(value) {
      delete bookChapter(value, "penultimate-days").sections[0].status;
    },
    pattern: /sections\[0\].*status/u,
  },
  {
    name: "published-after-forthcoming",
    mutate(value) {
      const parent = bookChapter(value, "penultimate-days");
      const sections = parent.sections;
      parent.sections = [sections[1], sections[0], sections[2]];
    },
    pattern: /sections\[1\].*published.*forthcoming/u,
  },
  {
    name: "published-under-forthcoming",
    mutate(value) {
      const section = bookChapter(value, "last-days").sections[0];
      section.status = "published";
      section.anchor = section.title;
      section.publishedAt = "2026-07-23";
    },
    pattern: /sections\[0\].*published.*forthcoming/u,
  },
  {
    name: "published-without-anchor",
    mutate(value) {
      delete bookChapter(value, "penultimate-days").sections[0].anchor;
    },
    pattern: /sections\[0\].*anchor/u,
  },
  {
    name: "published-without-date",
    mutate(value) {
      delete bookChapter(value, "penultimate-days").sections[0].publishedAt;
    },
    pattern: /sections\[0\].*publishedAt/u,
  },
  {
    name: "forthcoming-with-anchor",
    mutate(value) {
      bookChapter(value, "penultimate-days").sections[1].anchor = "future-anchor";
    },
    pattern: /sections\[1\].*anchor/u,
  },
  {
    name: "forthcoming-with-date",
    mutate(value) {
      bookChapter(value, "penultimate-days").sections[1].publishedAt = "2026-07-23";
    },
    pattern: /sections\[1\].*publishedAt/u,
  },
  {
    name: "sections-on-reference",
    mutate(value) {
      bookChapter(value, "penultimate-days").presentation = "reference";
    },
    pattern: /reading.*sections|sections.*reading/u,
  },
  {
    name: "sections-with-children",
    mutate(value) {
      bookChapter(value, "penultimate-days").children = [{
        id: "fixture-child",
        number: "05.x",
        title: "Fixture child",
        status: "forthcoming",
      }];
    },
    pattern: /sections.*children|children.*sections/u,
  },
  {
    name: "duplicate-section-id",
    mutate(value) {
      bookChapter(value, "penultimate-days").sections[0].id = "constitutional-day-three";
    },
    pattern: /sections\[0\].*id.*constitutional-day-three/u,
  },
  {
    name: "duplicate-section-number",
    mutate(value) {
      bookChapter(value, "penultimate-days").sections[0].number = "04";
    },
    pattern: /sections\[0\].*number.*04/u,
  },
  {
    name: "duplicate-section-anchor",
    mutate(value) {
      const parent = bookChapter(value, "penultimate-days");
      parent.sections[0].anchor = parent.anchor;
    },
    pattern: /sections\[0\].*anchor/u,
  },
];

const validatorPath = path.join(repositoryRoot, "scripts", "validate-content.mjs");
const sectionFixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "un-canon-book-sections-"));
try {
  fs.cpSync(path.join(repositoryRoot, "source"), path.join(sectionFixtureRoot, "source"), {
    recursive: true,
  });
  fs.cpSync(path.join(repositoryRoot, "public"), path.join(sectionFixtureRoot, "public"), {
    recursive: true,
  });

  const validateFixture = (value) => {
    fs.writeFileSync(
      path.join(sectionFixtureRoot, manifestRelativePath),
      `${JSON.stringify(value, null, 2)}\n`,
      "utf8"
    );
    return spawnSync(
      process.execPath,
      ["--experimental-strip-types", "--no-warnings", validatorPath],
      {
        cwd: sectionFixtureRoot,
        encoding: "utf8",
        env: process.env,
        maxBuffer: 10 * 1024 * 1024,
      }
    );
  };

  const validResult = validateFixture(structuredClone(bookBaseline));
  assert.equal(
    validResult.status,
    0,
    `the unmodified book fixture must pass:\n${validResult.stdout}\n${validResult.stderr}`
  );
  for (const fixtureCase of sectionMutationCases) {
    const result = validateFixture(bookFixture(fixtureCase.mutate));
    assert.notEqual(result.status, 0, `${fixtureCase.name} must fail the content gate`);
    assert.match(
      `${result.stdout}\n${result.stderr}`,
      fixtureCase.pattern,
      `${fixtureCase.name} must fail for the expected inline-section rule`
    );
  }
} finally {
  fs.rmSync(sectionFixtureRoot, { recursive: true, force: true });
}

const multipartChapter = bookChapter(bookBaseline, "penultimate-days");
const publishedSection = multipartChapter.sections.find((section) => section.status === "published");
const forthcomingSection = multipartChapter.sections.find((section) => section.status === "forthcoming");
assert.ok(publishedSection && forthcomingSection, "fixture must contain both section states");
const validSectionHeadings = [
  { id: publishedSection.anchor, title: publishedSection.title, level: 3 },
];
validateBookChapterSectionHeadings(bookBaseline.slug, multipartChapter, validSectionHeadings);

for (const fixtureCase of [
  {
    name: "missing rendered subtitle",
    headings: [],
    pattern: /must have one heading inside chapter/u,
  },
  {
    name: "duplicate rendered subtitle",
    headings: [...validSectionHeadings, ...validSectionHeadings],
    pattern: /must have one heading inside chapter/u,
  },
  {
    name: "wrong rendered heading level",
    headings: [{ ...validSectionHeadings[0], level: 2 }],
    pattern: /must use an h3 subtitle/u,
  },
  {
    name: "drifted rendered title",
    headings: [{ ...validSectionHeadings[0], title: "Wrong title" }],
    pattern: /title differs from heading/u,
  },
  {
    name: "forthcoming subtitle published early",
    headings: [
      ...validSectionHeadings,
      { id: "future-heading", title: forthcomingSection.title, level: 3 },
    ],
    pattern: /forthcoming section .* already exists in chapter/u,
  },
]) {
  assert.throws(
    () => validateBookChapterSectionHeadings(
      bookBaseline.slug,
      multipartChapter,
      fixtureCase.headings
    ),
    fixtureCase.pattern,
    `${fixtureCase.name} must be rejected`
  );
}

console.log("negative editorial and inline-section verification passed");
