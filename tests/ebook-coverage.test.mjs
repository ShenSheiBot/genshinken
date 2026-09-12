import assert from "node:assert/strict";
import test from "node:test";
import { getAllBooks } from "../lib/books.ts";
import {
  collectArticle,
  collectBook,
  getLibraryArticlePosts,
} from "../lib/ebook/collect.ts";
import {
  isEbookEntryCurrent,
  readEbookManifest,
} from "../lib/ebook/manifest.ts";

test("every published book and library article has a current EPUB entry", async () => {
  const manifest = readEbookManifest();
  const missing = [];
  const stale = [];

  for (const book of getAllBooks()) {
    const edition = await collectBook(book);
    if (!manifest.books[book.slug]) {
      missing.push(`books:${book.slug}`);
    } else if (!isEbookEntryCurrent(manifest, "books", book.slug, edition.contentRevision)) {
      stale.push(`books:${book.slug}`);
    }
  }

  for (const post of await getLibraryArticlePosts()) {
    const edition = await collectArticle(post);
    if (!manifest.articles[post.slug]) {
      missing.push(`articles:${post.slug}`);
    } else if (!isEbookEntryCurrent(manifest, "articles", post.slug, edition.contentRevision)) {
      stale.push(`articles:${post.slug}`);
    }
  }

  assert.deepEqual(missing, [], "every EPUB-eligible edition must have a manifest entry");
  assert.deepEqual(stale, [], "every EPUB-eligible edition must have a current manifest entry");
});
