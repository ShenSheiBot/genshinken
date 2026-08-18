import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { validateBookChapterSectionHeadings } from "../lib/book-section-contract.mjs";

const root = process.cwd();
const fixtureDirectory = path.join(root, "tests", "fixtures", "books");
const fixtureManifestPath = path.join(fixtureDirectory, "inline-sections.json");
const fixtureDocumentPath = path.join(
  fixtureDirectory,
  "inline-section-contract-fixture.md"
);
const manifestRelativePath = path.join(
  "source",
  "_books",
  "inline-section-contract-fixture.json"
);
const documentRelativePath = path.join(
  "source",
  "_posts",
  "inline-section-contract-fixture.md"
);
const validatorPath = path.join(root, "scripts", "validate-content.mjs");
const baseline = JSON.parse(fs.readFileSync(fixtureManifestPath, "utf8"));

const chapterPageSource = fs.readFileSync(
  path.join(root, "app", "(site)", "books", "[slug]", "chapters", "[chapter]", "page.tsx"),
  "utf8"
);
const bookPageSource = fs.readFileSync(
  path.join(root, "app", "(site)", "books", "[slug]", "page.tsx"),
  "utf8"
);
const readingChromeSource = fs.readFileSync(
  path.join(
    root,
    "app",
    "components",
    "reading-edition",
    "ReadingEditionChrome.tsx"
  ),
  "utf8"
);
const bookResourcesSource = fs.readFileSync(
  path.join(root, "app", "(site)", "books", "BookResources.tsx"),
  "utf8"
);

assert.ok(
  baseline.citations?.original && baseline.citations?.translation,
  "fixture must exercise independent original and translation citations"
);
assert.match(
  chapterPageSource,
  /document\.headings\.map[\s\S]*?#\$\{encodeURIComponent\(heading\.id\)\}[\s\S]*?chapter\.sections\.flatMap[\s\S]*?section\.status === "forthcoming"[\s\S]*?href: null/u,
  "chapter navigation data must retain published section anchors and inert forthcoming sections"
);
assert.match(
  chapterPageSource,
  /chapter\.titleBreaks \? chapter\.titleBreaks\.map[\s\S]*?data-reader-title-segment[\s\S]*?ReaderTitleText[\s\S]*?chapter\.title/u,
  "chapter covers must render editorial title breaks through the shared title renderer"
);
assert.match(
  bookPageSource,
  /chapter\.sections\.map[\s\S]*?data-section-status=\{section\.status\}[\s\S]*?isPublishedBookChapterSection\(section\)[\s\S]*?section\.anchor/u,
  "book catalogues must render inline-section status from the generic chapter model"
);
assert.match(
  readingChromeSource,
  /item\.sections\.map[\s\S]*?section\.status === "forthcoming"[\s\S]*?aria-disabled="true"[\s\S]*?section\.href/u,
  "reader catalogues must distinguish inert forthcoming sections from published section links"
);
assert.match(
  bookResourcesSource,
  /originalBibtex[\s\S]*?translationBibtex[\s\S]*?kind: "original"[\s\S]*?kind: "translation"/u,
  "book resources must retain separate original and translation citation surfaces"
);

function chapter(value, id) {
  const match = value.chapters.find((candidate) => candidate.id === id);
  assert.ok(match, `fixture must contain chapter ${id}`);
  return match;
}

const multipartChapter = chapter(baseline, "dated-installments");
const publishedSection = multipartChapter.sections.find(
  (section) => section.status === "published"
);
const forthcomingSection = multipartChapter.sections.find(
  (section) => section.status === "forthcoming"
);
assert.ok(
  publishedSection && forthcomingSection,
  "fixture must exercise both inline-section states"
);

const mutations = [
  {
    name: "title breaks that do not reconstruct the chapter title",
    pattern: /titleBreaks.*title/u,
    apply(value) {
      chapter(value, "introduction").titleBreaks = ["错误导言"];
    },
  },
  {
    name: "title breaks beginning with closing punctuation",
    pattern: /titleBreaks\[1\].*闭标点/u,
    apply(value) {
      chapter(value, "introduction").title = "导言：测试";
      chapter(value, "introduction").titleBreaks = ["导言", "：测试"];
    },
  },
  {
    name: "missing explicit section status",
    pattern: /sections\[0\].*status/u,
    apply(value) {
      delete chapter(value, "dated-installments").sections[0].status;
    },
  },
  {
    name: "published section without anchor",
    pattern: /sections\[0\].*anchor/u,
    apply(value) {
      delete chapter(value, "dated-installments").sections[0].anchor;
    },
  },
  {
    name: "published section after forthcoming section",
    pattern: /sections\[1\].*published.*forthcoming/u,
    apply(value) {
      chapter(value, "dated-installments").sections.reverse();
    },
  },
  {
    name: "forthcoming section with publication date",
    pattern: /sections\[1\].*publishedAt/u,
    apply(value) {
      chapter(value, "dated-installments").sections[1].publishedAt = "2020-01-03";
    },
  },
  {
    name: "sections on a reference chapter",
    pattern: /reading.*sections|sections.*reading/u,
    apply(value) {
      chapter(value, "dated-installments").presentation = "reference";
    },
  },
  {
    name: "sections combined with child routes",
    pattern: /sections.*children|children.*sections/u,
    apply(value) {
      chapter(value, "dated-installments").children = [{
        id: "invalid-child",
        number: "02.x",
        title: "错误子章",
        status: "forthcoming",
      }];
    },
  },
];

const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "roof-book-capabilities-"));
try {
  fs.cpSync(path.join(root, "source"), path.join(temporaryRoot, "source"), {
    recursive: true,
  });
  fs.cpSync(path.join(root, "public"), path.join(temporaryRoot, "public"), {
    recursive: true,
  });
  fs.cpSync(
    path.join(root, "editorial-sources"),
    path.join(temporaryRoot, "editorial-sources"),
    { recursive: true }
  );
  fs.copyFileSync(
    fixtureDocumentPath,
    path.join(temporaryRoot, documentRelativePath)
  );

  function validate(value) {
    fs.writeFileSync(
      path.join(temporaryRoot, manifestRelativePath),
      `${JSON.stringify(value, null, 2)}\n`,
      "utf8"
    );
    return spawnSync(
      process.execPath,
      ["--experimental-strip-types", "--no-warnings", validatorPath],
      {
        cwd: temporaryRoot,
        encoding: "utf8",
        env: process.env,
        maxBuffer: 10 * 1024 * 1024,
      }
    );
  }

  const valid = validate(structuredClone(baseline));
  assert.equal(
    valid.status,
    0,
    `valid capability fixture must pass:\n${valid.stdout}\n${valid.stderr}`
  );

  for (const mutation of mutations) {
    const value = structuredClone(baseline);
    mutation.apply(value);
    const result = validate(value);
    assert.notEqual(result.status, 0, `${mutation.name} must fail`);
    assert.match(
      `${result.stdout}\n${result.stderr}`,
      mutation.pattern,
      `${mutation.name} must fail for its own contract`
    );
  }
} finally {
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
}

const validHeadings = [{
  id: publishedSection.anchor,
  title: publishedSection.title,
  level: 3,
}];
validateBookChapterSectionHeadings(
  baseline.slug,
  multipartChapter,
  validHeadings
);
assert.throws(
  () => validateBookChapterSectionHeadings(baseline.slug, multipartChapter, []),
  /must have one heading inside chapter/u
);
assert.throws(
  () => validateBookChapterSectionHeadings(baseline.slug, multipartChapter, [
    ...validHeadings,
    { id: "published-too-early", title: forthcomingSection.title, level: 3 },
  ]),
  /forthcoming section .* already exists in chapter/u
);

console.log("book capability fixture verification passed");
