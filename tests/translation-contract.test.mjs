import assert from "node:assert/strict";
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
