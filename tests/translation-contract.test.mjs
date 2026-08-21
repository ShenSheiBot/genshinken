import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  publicationDecisionValue,
  sha256,
  sourceRevisionValue,
  translationEditionIsVisible,
  translationLifecycleValues,
} from "../lib/translation-contract.mjs";
import {
  bookChapterTranslationPayloadRevision,
  postTranslationPayloadRevision,
} from "../lib/translation-source.mjs";
import { parseYamlFrontMatter } from "../lib/safe-front-matter.mjs";
import {
  assertChapterUsesTranslationBookManifest,
  readTranslationBookManifest,
} from "../lib/translation-book-manifest.mjs";
import {
  readLanguageDispositions,
  translationAvailabilityState,
} from "../lib/translation-language-dispositions.mjs";

test("translated book metadata has one directory-level source of truth", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "roof-translation-book-"));
  const directory = path.join(root, "target-book");
  fs.mkdirSync(directory);
  fs.writeFileSync(path.join(directory, "book.json"), JSON.stringify({
    version: 1,
    source_book_slug: "source-book",
    slug: "target-book",
    language: "en",
    title: "Target Book",
    excerpt: "One translated book description.",
  }));
  try {
    assert.deepEqual(
      readTranslationBookManifest(directory, { locale: "en", sourceBookSlug: "source-book" }),
      {
        version: 1,
        source: path.join(directory, "book.json"),
        sourceBookSlug: "source-book",
        slug: "target-book",
        language: "en",
        title: "Target Book",
        subtitle: "",
        excerpt: "One translated book description.",
      }
    );
    assert.doesNotThrow(() => assertChapterUsesTranslationBookManifest({ title: "Chapter" }, "chapter.md"));
    assert.throws(
      () => assertChapterUsesTranslationBookManifest({ book_title: "Duplicate" }, "chapter.md"),
      /book_title belongs in book\.json/u
    );
    assert.throws(
      () => readTranslationBookManifest(directory, { locale: "ja", sourceBookSlug: "source-book" }),
      /language must match locale directory ja/u
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("language dispositions keep external originals and deliberate absence in one registry", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "roof-language-disposition-"));
  const manifest = {
    version: 1,
    items: [
      {
        source_type: "post",
        source_slug: "example-work",
        locale: "ja",
        state: "external-original",
        format: "book",
        title: "原著",
        creator: "著者",
        publication: "出版社",
        links: [{ kind: "publisher", url: "https://example.test/book" }],
      },
      {
        source_type: "post",
        source_slug: "example-work",
        locale: "en",
        state: "not-available",
        reason: "cross-language-translation",
        original_language: "ja",
      },
    ],
  };
  fs.writeFileSync(path.join(root, "language-dispositions.json"), JSON.stringify(manifest));
  try {
    assert.deepEqual(readLanguageDispositions(root), [
      {
        source: `${path.join(root, "language-dispositions.json")}: items[0]`,
        sourceRef: { type: "post", slug: "example-work" },
        sourceKey: "post:example-work",
        locale: "ja",
        state: "external-original",
        format: "book",
        title: "原著",
        creator: "著者",
        publication: "出版社",
        published: "",
        identifier: "",
        coverage: "",
        links: [{ kind: "publisher", url: "https://example.test/book" }],
      },
      {
        source: `${path.join(root, "language-dispositions.json")}: items[1]`,
        sourceRef: { type: "post", slug: "example-work" },
        sourceKey: "post:example-work",
        locale: "en",
        state: "not-available",
        reason: "cross-language-translation",
        originalLanguage: "ja",
      },
    ]);
    manifest.items.push({ ...manifest.items[0] });
    fs.writeFileSync(path.join(root, "language-dispositions.json"), JSON.stringify(manifest));
    assert.throws(() => readLanguageDispositions(root), /duplicate language disposition/u);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("translation availability keeps edition lifecycle separate from absence policy", () => {
  assert.equal(translationAvailabilityState("published", false), "available");
  assert.equal(translationAvailabilityState("review", true), "preview");
  assert.equal(translationAvailabilityState("review", false), "missing");
  assert.equal(translationAvailabilityState("", false, "external-original"), "external-original");
  assert.equal(translationAvailabilityState("", false, "not-available"), "not-available");
  assert.equal(translationAvailabilityState("", false), "missing");
  assert.throws(
    () => translationAvailabilityState("draft", true, "not-available"),
    /cannot have both/u
  );
});

test("unquoted YAML dates survive the review-to-published lifecycle", () => {
  const revision = sha256("complete source file");
  const review = parseYamlFrontMatter(`---\nstatus: review\nupdated: 2026-08-18\nsource_revision: "${revision}"\n---\nDraft\n`);
  assert.ok(review.data.updated instanceof Date, "gray-matter must exercise its real YAML Date representation");
  assert.deepEqual(translationLifecycleValues(review.data, "review", "review fixture"), {
    publishedISO: "",
    updatedISO: "2026-08-18",
    sourceRevision: revision,
  });

  const published = parseYamlFrontMatter(
    `---\nstatus: published\npublished: 2026-08-18\nupdated: 2026-08-19\nsource_revision: "${revision}"\n---\nPublished\n`
  );
  assert.deepEqual(translationLifecycleValues(published.data, "published", "published fixture"), {
    publishedISO: "2026-08-18",
    updatedISO: "2026-08-19",
    sourceRevision: revision,
  });
});

test("publication decisions cannot silently promote a local preview", () => {
  assert.equal(
    publicationDecisionValue({ decision: "local-preview" }, "review", "review dossier"),
    "local-preview"
  );
  assert.throws(
    () => publicationDecisionValue({ decision: "local-preview" }, "published", "published dossier"),
    /require publication\.decision: approved/u
  );
  assert.equal(
    publicationDecisionValue(
      { decision: "approved", decided_by: "owner", decided_at: new Date("2026-08-18T00:00:00Z") },
      "published",
      "published dossier"
    ),
    "approved"
  );
});

test("review editions cannot leak target routes into production language links", () => {
  assert.equal(translationEditionIsVisible("review", false), false);
  assert.equal(translationEditionIsVisible("review", true), true);
  assert.equal(translationEditionIsVisible("published", false), true);
});

test("source revisions have one prefixed full-digest representation", () => {
  const revision = sha256("complete source file");
  assert.match(revision, /^sha256:[\da-f]{64}$/u);
  assert.equal(sourceRevisionValue(revision, "fixture", { required: true }), revision);
  assert.throws(
    () => sourceRevisionValue(revision.slice("sha256:".length), "fixture", { required: true }),
    /sha256:<64 lowercase hex digits>/u
  );
});

test("post translation revisions ignore delivery metadata but protect translated payload", () => {
  const source = {
    data: {
      title: "A title",
      subtitle: "A subtitle",
      excerpt: "An excerpt",
      date: new Date("2021-01-01T00:00:00Z"),
      tags: ["one"],
      post_author: "Author",
      citation: { itemType: "blogPost", title: "A title" },
    },
    content: "A complete body.\n",
  };
  const revision = postTranslationPayloadRevision(source);
  assert.equal(postTranslationPayloadRevision({
    data: { ...source.data, date: new Date("2026-08-18T00:00:00Z"), tags: ["two"] },
    content: source.content,
  }), revision, "dates and tags are delivery metadata, not translation payload");
  assert.notEqual(postTranslationPayloadRevision({
    data: { ...source.data, title: "A changed title" },
    content: source.content,
  }), revision);
  assert.notEqual(postTranslationPayloadRevision({
    data: { ...source.data, subtitle: "A changed subtitle" },
    content: source.content,
  }), revision);
  assert.notEqual(postTranslationPayloadRevision({
    data: { ...source.data, post_author: "Another author" },
    content: source.content,
  }), revision);
  assert.notEqual(postTranslationPayloadRevision({
    data: source.data,
    content: "A changed body.\n",
  }), revision);
});

test("book chapter revisions protect translatable book and chapter metadata", () => {
  const manifest = {
    title: "A book",
    subtitle: "A subtitle",
    description: "A description",
    script: "hans",
    authors: ["Author"],
    translators: ["Translator"],
    proofreaders: ["Reviewer"],
    editors: ["Editor"],
    publishedAt: "2020-01-01",
    updatedAt: "2020-02-01",
    citations: { translation: { itemType: "book", rights: "CC BY-NC-SA 4.0" } },
  };
  const chapter = {
    id: "chapter-one",
    number: "01",
    title: "A chapter",
    format: "article",
    authors: ["Chapter Author"],
    translators: [],
    proofreaders: [],
    editors: [],
    tags: ["one"],
    publishedAt: "2020-01-02",
  };
  const markdown = "A complete chapter.\n";
  const revision = bookChapterTranslationPayloadRevision(manifest, chapter, markdown);
  assert.equal(bookChapterTranslationPayloadRevision(
    { ...manifest, publishedAt: "2026-01-01", updatedAt: "2026-02-01" },
    { ...chapter, tags: ["two"], publishedAt: "2026-01-02" },
    markdown
  ), revision, "dates and tags are delivery metadata, not translation payload");
  assert.notEqual(bookChapterTranslationPayloadRevision(
    { ...manifest, subtitle: "A changed subtitle" }, chapter, markdown
  ), revision);
  assert.notEqual(bookChapterTranslationPayloadRevision(
    manifest, { ...chapter, title: "A changed chapter" }, markdown
  ), revision);
  assert.notEqual(bookChapterTranslationPayloadRevision(
    manifest, chapter, "A changed chapter body.\n"
  ), revision);
});
