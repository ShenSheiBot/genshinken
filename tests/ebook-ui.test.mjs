import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  getArticleEbookDownloads,
  getBookEbookDownloads,
  resolveEbookManifestPath,
} from "../lib/ebooks.ts";

const root = process.cwd();

function manifestFixture(books, articles = {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "ebook-ui-"));
  const manifestPath = path.join(directory, "manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify({ version: 1, books, articles }));
  return manifestPath;
}

function sampleEntry(slug) {
  return {
    epubUrl: `https://assets.labonroof.top/downloads/${slug}-0123456789abcdef.epub`,
    sha256: "b".repeat(64),
    bytes: 2048,
    contentRevision: "0123456789abcdef",
    generator: 1,
    generatedAt: "2026-09-10T00:00:00.000Z",
  };
}

test("the accessor exposes downloads only for slugs present in the manifest", () => {
  const manifestPath = manifestFixture({
    "wednesday-no-work": sampleEntry("wednesday-no-work"),
  });
  assert.deepEqual(getBookEbookDownloads("wednesday-no-work", manifestPath), {
    epubUrl: "https://assets.labonroof.top/downloads/wednesday-no-work-0123456789abcdef.epub",
  });
  assert.equal(
    getBookEbookDownloads("some-other-book", manifestPath),
    null,
    "books absent from the manifest must not surface a download"
  );
});

test("article downloads come from the articles namespace only", () => {
  const manifestPath = manifestFixture(
    { "shared-slug": sampleEntry("shared-slug-book") },
    { "some-essay": sampleEntry("some-essay") }
  );
  assert.deepEqual(getArticleEbookDownloads("some-essay", manifestPath), {
    epubUrl: "https://assets.labonroof.top/downloads/some-essay-0123456789abcdef.epub",
  });
  assert.equal(
    getArticleEbookDownloads("absent-essay", manifestPath),
    null,
    "articles absent from the manifest must not surface a download"
  );
  assert.equal(
    getArticleEbookDownloads("shared-slug", manifestPath),
    null,
    "a book entry must never leak into the article accessor"
  );
});

test("a missing manifest file yields no downloads instead of an error", () => {
  const manifestPath = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), "ebook-ui-missing-")),
    "manifest.json"
  );
  assert.equal(getBookEbookDownloads("wednesday-no-work", manifestPath), null);
  assert.equal(getArticleEbookDownloads("some-essay", manifestPath), null);
});

test("EBOOK_MANIFEST_PATH overrides the manifest location for local preview", () => {
  const manifestPath = manifestFixture({}, { "preview-essay": {
    ...sampleEntry("preview-essay"),
    epubUrl: "/downloads/preview-essay-0123456789abcdef.epub",
  } });
  assert.equal(
    resolveEbookManifestPath({ EBOOK_MANIFEST_PATH: manifestPath }),
    manifestPath,
    "an absolute override resolves to itself"
  );
  assert.equal(
    resolveEbookManifestPath({ EBOOK_MANIFEST_PATH: ".ebook-dist/manifest.local.json" }),
    path.join(root, ".ebook-dist", "manifest.local.json"),
    "a relative override resolves against the project root"
  );
  assert.equal(
    resolveEbookManifestPath({}),
    path.join(root, "source", "_ebooks", "manifest.json"),
    "without the override the committed manifest stays authoritative"
  );

  const previous = process.env.EBOOK_MANIFEST_PATH;
  process.env.EBOOK_MANIFEST_PATH = manifestPath;
  try {
    assert.deepEqual(getArticleEbookDownloads("preview-essay"), {
      epubUrl: "/downloads/preview-essay-0123456789abcdef.epub",
    });
  } finally {
    if (previous === undefined) delete process.env.EBOOK_MANIFEST_PATH;
    else process.env.EBOOK_MANIFEST_PATH = previous;
  }
});

test("the book page feeds manifest downloads into the resources section", () => {
  const bookPageSource = fs.readFileSync(
    path.join(root, "app", "(site)", "books", "[slug]", "page.tsx"),
    "utf8"
  );
  assert.match(
    bookPageSource,
    /getBookEbookDownloads\(book\.slug\)\?\.epubUrl/u,
    "the book page must resolve the EPUB URL from the committed ebook manifest"
  );
});

test("the resources component renders no file row when the href is absent", () => {
  const bookResourcesSource = fs.readFileSync(
    path.join(root, "app", "(site)", "books", "BookResources.tsx"),
    "utf8"
  );
  assert.match(
    bookResourcesSource,
    /\.filter\(\(file\)[\s\S]*?Boolean\(file\.href\)\)/u,
    "file rows must be filtered out when no manifest URL exists (no dead links)"
  );
  assert.match(
    bookResourcesSource,
    /files\.length > 0 &&/u,
    "the file shelf must disappear entirely when nothing is downloadable"
  );
});

test("the reader action row renders the EPUB link only when a manifest URL exists", () => {
  const chromeSource = fs.readFileSync(
    path.join(root, "app", "components", "reading-edition", "ReadingEditionChrome.tsx"),
    "utf8"
  );
  const actions = chromeSource.match(/const tocActions = \([\s\S]*?\n {2}\);/u);
  assert.ok(actions, "ReadingEditionChrome must build the shared tocActions footer");
  assert.match(
    actions[0],
    /\{epubDownloadUrl && \(\s*<a href=\{epubDownloadUrl\}/u,
    "the EPUB link must be gated on the manifest URL (no dead links)"
  );
  assert.match(actions[0], /<span>EPUB<\/span>/u, "the link must follow the BIB row composition");
  assert.match(
    actions[0],
    /aria-label=\{ui\.epubDownload\}/u,
    "the accessible label must come from the localized ui table"
  );
  assert.ok(
    actions[0].indexOf("epubDownloadUrl && (") < actions[0].indexOf("styles.toTop"),
    "the EPUB link must sit before the 返回篇首 button"
  );
});

test("the EPUB action reaches both surfaces: desktop rail and mobile sheet", () => {
  const chromeSource = fs.readFileSync(
    path.join(root, "app", "components", "reading-edition", "ReadingEditionChrome.tsx"),
    "utf8"
  );
  assert.match(
    chromeSource,
    /const tocPanel = [\s\S]*?\{tocActions\}/u,
    "tocActions must render inside the shared tocPanel"
  );
  assert.match(
    chromeSource,
    /leftDeskRail\}>[\s\S]*?\{tocPanel\}/u,
    "the desktop left rail must mount the tocPanel (and with it the EPUB action)"
  );
  assert.match(
    chromeSource,
    /sheet === "toc" \? <>[\s\S]*?\{tocPanel\}/u,
    "the mobile contents sheet must mount the same tocPanel"
  );
});

test("the EPUB download label is localized for every reader locale", () => {
  const uiSource = fs.readFileSync(
    path.join(root, "app", "components", "reading-edition", "reading-edition-ui.ts"),
    "utf8"
  );
  const occurrences = uiSource.match(/epubDownload:/gu) ?? [];
  assert.equal(occurrences.length, 3, "zh, en and ja must each define epubDownload");
});

test("article and book chapter pages wire the reader EPUB button; translations do not", () => {
  const postPageSource = fs.readFileSync(
    path.join(root, "app", "(site)", "posts", "[slug]", "page.tsx"),
    "utf8"
  );
  assert.match(
    postPageSource,
    /epubDownloadUrl=\{getArticleEbookDownloads\(post\.slug\)\?\.epubUrl\}/u,
    "the article page must pass the manifest URL down as a server prop"
  );

  const dossierSource = fs.readFileSync(
    path.join(root, "app", "components", "reading-edition", "ReadingEdition.tsx"),
    "utf8"
  );
  assert.match(
    dossierSource,
    /epubDownloadUrl=\{epubDownloadUrl\}/u,
    "ReadingDossier must thread the URL through to the chrome"
  );

  const bookChapterSource = fs.readFileSync(
    path.join(root, "app", "(site)", "books", "[slug]", "chapters", "[chapter]", "page.tsx"),
    "utf8"
  );
  assert.match(
    bookChapterSource,
    /epubDownloadUrl=\{getBookEbookDownloads\(book\.slug\)\?\.epubUrl\}/u,
    "book chapter pages must offer the whole-book EPUB from the manifest"
  );
  assert.match(
    bookChapterSource,
    /epubDownloadName=\{`\$\{book\.slug\}\.epub`\}/u,
    "the saved filename must be the book slug, not the chapter slug"
  );

  const translationSource = fs.readFileSync(
    path.join(root, "app", "components", "translation", "TranslationEditionPage.tsx"),
    "utf8"
  );
  assert.ok(
    !translationSource.includes("epubDownloadUrl"),
    "translation editions have no zh EPUB artifact and must not render the button"
  );
});
