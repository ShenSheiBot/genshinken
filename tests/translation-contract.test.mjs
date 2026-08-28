import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  parseMarkdownSource,
  translationSourcePayload,
} from "../lib/translation-source.mjs";
import {
  canonicalizeLocalizedTranslationRoutes,
  translationEditionIsVisible,
  translationLifecycleValues,
} from "../lib/translation-contract.mjs";
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
  assert.equal(translationAvailabilityState("reviewed", true), "preview");
  assert.equal(translationAvailabilityState("reviewed", false), "missing");
  assert.equal(translationAvailabilityState("", false, "external-original"), "external-original");
  assert.equal(translationAvailabilityState("", false, "not-available"), "not-available");
  assert.equal(translationAvailabilityState("", false), "missing");
  assert.throws(
    () => translationAvailabilityState("draft", true, "not-available"),
    /cannot have both/u
  );
});

test("unquoted YAML dates survive the review-to-published lifecycle", () => {
  const review = parseYamlFrontMatter(`---\nstatus: review\nupdated: 2026-08-18\n---\nDraft\n`);
  assert.ok(review.data.updated instanceof Date, "gray-matter must exercise its real YAML Date representation");
  assert.deepEqual(translationLifecycleValues(review.data, "review", "review fixture"), {
    publishedISO: "",
    updatedISO: "2026-08-18",
  });

  const published = parseYamlFrontMatter(
    `---\nstatus: published\npublished: 2026-08-18\nupdated: 2026-08-19\n---\nPublished\n`
  );
  assert.deepEqual(translationLifecycleValues(published.data, "published", "published fixture"), {
    publishedISO: "2026-08-18",
    updatedISO: "2026-08-19",
  });
});

test("review editions cannot leak target routes into production language links", () => {
  assert.equal(translationEditionIsVisible("review", false), false);
  assert.equal(translationEditionIsVisible("review", true), true);
  assert.equal(translationEditionIsVisible("reviewed", false), false);
  assert.equal(translationEditionIsVisible("reviewed", true), true);
  assert.equal(translationEditionIsVisible("published", false), true);
});

test("structure audits compare localized slugs through their canonical source routes", () => {
  const routes = new Map([
    ["/ja/posts/anime-enshutsusei-anno-takahashi", "/posts/performativity-of-animation-anno-takahashi"],
  ]);
  assert.equal(
    canonicalizeLocalizedTranslationRoutes(
      "[演出性](/ja/posts/anime-enshutsusei-anno-takahashi#section)",
      routes,
    ),
    "[演出性](/posts/performativity-of-animation-anno-takahashi#section)",
  );
});

test("translation source payload tracks reader-facing source changes, not publication timestamps", () => {
  const first = parseMarkdownSource(`---
title: A title
excerpt: An excerpt
post_author: Author
updated: 2026-08-20
---
Body text.
`);
  const timestampOnly = parseMarkdownSource(`---
title: A title
excerpt: An excerpt
post_author: Author
updated: 2026-08-21
---
Body text.
`);
  const changedBody = parseMarkdownSource(`---
title: A title
excerpt: An excerpt
post_author: Author
updated: 2026-08-21
---
Revised body text.
`);

  assert.deepEqual(
    translationSourcePayload({ type: "post", markdown: first.content, metadata: first.data }),
    translationSourcePayload({ type: "post", markdown: timestampOnly.content, metadata: timestampOnly.data }),
  );
  assert.notDeepEqual(
    translationSourcePayload({ type: "post", markdown: first.content, metadata: first.data }),
    translationSourcePayload({ type: "post", markdown: changedBody.content, metadata: changedBody.data }),
  );
  assert.notDeepEqual(
    translationSourcePayload({ type: "post", markdown: first.content, metadata: first.data }),
    translationSourcePayload({
      type: "post",
      markdown: first.content,
      metadata: { ...first.data, interviewees: ["Another speaker"] },
    }),
  );
});

test("book translation payload ignores navigation metadata but tracks chapter content and credits", () => {
  const source = {
    type: "book-chapter",
    markdown: "Chapter body.",
    manifest: { title: "Book", authors: ["Author"], updatedAt: "2026-08-20" },
    chapter: { title: "Chapter", proofreaders: ["Reviewer"], tags: ["one"], publishedAt: "2026-08-20" },
  };
  assert.deepEqual(
    translationSourcePayload(source),
    translationSourcePayload({
      ...source,
      manifest: { ...source.manifest, updatedAt: "2026-08-21" },
      chapter: { ...source.chapter, tags: ["two"], publishedAt: "2026-08-21" },
    }),
  );
  assert.notDeepEqual(
    translationSourcePayload(source),
    translationSourcePayload({ ...source, chapter: { ...source.chapter, proofreaders: ["Another reviewer"] } }),
  );
});
