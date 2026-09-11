import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  EBOOK_GENERATOR_VERSION,
  emptyEbookManifest,
  isEbookEntryCurrent,
  readEbookManifest,
  writeEbookManifest,
} from "../lib/ebook/manifest.ts";
import {
  defaultEbookUploadTarget,
  ebookObjectKey,
  uploadEbookObject,
} from "../lib/ebook/upload.ts";

function sampleEntry(overrides = {}) {
  return {
    epubUrl: "https://assets.labonroof.top/downloads/sample-0123456789abcdef.epub",
    sha256: "a".repeat(64),
    bytes: 1024,
    contentRevision: "0123456789abcdef",
    generator: EBOOK_GENERATOR_VERSION,
    generatedAt: "2026-09-10T00:00:00.000Z",
    ...overrides,
  };
}

test("a manifest entry is current only for the exact revision and generator", () => {
  const manifest = emptyEbookManifest();
  manifest.books.sample = sampleEntry();
  assert.equal(isEbookEntryCurrent(manifest, "books", "sample", "0123456789abcdef"), true);
  assert.equal(
    isEbookEntryCurrent(manifest, "books", "sample", "ffffffffffffffff"),
    false,
    "a changed content revision must mark the artifact stale"
  );
  assert.equal(
    isEbookEntryCurrent(manifest, "books", "absent", "0123456789abcdef"),
    false,
    "books without a published artifact are always stale"
  );
  const outdated = emptyEbookManifest();
  outdated.books.sample = sampleEntry({ generator: EBOOK_GENERATOR_VERSION - 1 });
  outdated.books.fresh = sampleEntry();
  assert.equal(
    isEbookEntryCurrent(outdated, "books", "sample", "0123456789abcdef"),
    false,
    "a generator bump must invalidate entries produced by the old generator"
  );
  assert.equal(
    isEbookEntryCurrent(outdated, "books", "fresh", "0123456789abcdef"),
    true,
    "entries already rebuilt by the current generator stay current even when older entries remain"
  );
});

test("book and article namespaces are keyed independently", () => {
  const manifest = emptyEbookManifest();
  manifest.articles.sample = sampleEntry();
  assert.equal(isEbookEntryCurrent(manifest, "articles", "sample", "0123456789abcdef"), true);
  assert.equal(
    isEbookEntryCurrent(manifest, "books", "sample", "0123456789abcdef"),
    false,
    "an article entry must never mark a same-slug book current"
  );
});

test("manifest round-trips through disk and missing files read as empty", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "ebook-manifest-"));
  const manifestPath = path.join(directory, "manifest.json");
  assert.deepEqual(readEbookManifest(manifestPath), emptyEbookManifest());

  const manifest = emptyEbookManifest();
  manifest.books["zulu-book"] = sampleEntry();
  manifest.books["alpha-book"] = sampleEntry({ contentRevision: "fedcba9876543210" });
  manifest.articles["zulu-article"] = sampleEntry();
  manifest.articles["alpha-article"] = sampleEntry({ contentRevision: "fedcba9876543210" });
  writeEbookManifest(manifest, manifestPath);
  const restored = readEbookManifest(manifestPath);
  assert.deepEqual(restored, manifest);
  const written = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  assert.deepEqual(
    Object.keys(written.books),
    ["alpha-book", "zulu-book"],
    "committed manifests must serialize books in stable sorted order"
  );
  assert.deepEqual(
    Object.keys(written.articles),
    ["alpha-article", "zulu-article"],
    "committed manifests must serialize articles in stable sorted order"
  );
});

test("manifests written before the articles namespace still parse", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "ebook-manifest-legacy-"));
  const manifestPath = path.join(directory, "manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify({
    version: 1,
    books: { sample: sampleEntry() },
  }));
  const manifest = readEbookManifest(manifestPath);
  assert.deepEqual(manifest.articles, {}, "a missing articles namespace reads as empty");
  assert.deepEqual(manifest.books.sample, sampleEntry());
});

test("malformed manifest entries fail loudly instead of shipping dead links", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "ebook-manifest-bad-"));
  const manifestPath = path.join(directory, "manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify({
    version: 1,
    books: { sample: { epubUrl: "not-a-url" } },
  }));
  assert.throws(
    () => readEbookManifest(manifestPath),
    /epubUrl must be an HTTPS URL or a root-relative \/downloads\/ path/u
  );
  fs.writeFileSync(manifestPath, JSON.stringify({
    version: 1,
    books: {},
    articles: { sample: { epubUrl: "not-a-url" } },
  }));
  assert.throws(
    () => readEbookManifest(manifestPath),
    /articles\.sample\.epubUrl must be an HTTPS URL or a root-relative \/downloads\/ path/u
  );
});

test("local-preview manifests may carry /downloads/ paths but nothing else", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "ebook-manifest-local-"));
  const manifestPath = path.join(directory, "manifest.local.json");
  fs.writeFileSync(manifestPath, JSON.stringify({
    version: 1,
    books: { sample: sampleEntry({ epubUrl: "/downloads/sample-0123456789abcdef.epub" }) },
    articles: { essay: sampleEntry({ epubUrl: "/downloads/essay-0123456789abcdef.epub" }) },
  }));
  const manifest = readEbookManifest(manifestPath);
  assert.equal(manifest.books.sample.epubUrl, "/downloads/sample-0123456789abcdef.epub");
  assert.equal(manifest.articles.essay.epubUrl, "/downloads/essay-0123456789abcdef.epub");

  for (const epubUrl of ["http://insecure.example/x.epub", "downloads/relative.epub", "/elsewhere/x.epub"]) {
    fs.writeFileSync(manifestPath, JSON.stringify({
      version: 1,
      books: { sample: sampleEntry({ epubUrl }) },
    }));
    assert.throws(
      () => readEbookManifest(manifestPath),
      /epubUrl must be an HTTPS URL or a root-relative \/downloads\/ path/u,
      `${epubUrl} must be rejected`
    );
  }
});

test("uploads PUT the artifact to R2 and return the public downloads URL", async () => {
  const target = defaultEbookUploadTarget({});
  const key = ebookObjectKey(target, "sample-book", "0123456789abcdef");
  assert.equal(key, "downloads/sample-book-0123456789abcdef.epub");

  const requests = [];
  const fetchImpl = async (url, init) => {
    requests.push({ url, init });
    return { ok: true, text: async () => "" };
  };
  const body = new Uint8Array([1, 2, 3]);
  const { url } = await uploadEbookObject({ target, key, body, token: "test-token", fetchImpl });
  assert.equal(url, "https://assets.labonroof.top/downloads/sample-book-0123456789abcdef.epub");
  assert.equal(requests.length, 1);
  assert.match(
    requests[0].url,
    /^https:\/\/api\.cloudflare\.com\/client\/v4\/accounts\/[0-9a-f]+\/r2\/buckets\/.+\/objects\/downloads\/sample-book-0123456789abcdef\.epub$/u
  );
  assert.equal(requests[0].init.method, "PUT");
  assert.equal(requests[0].init.headers["Content-Type"], "application/epub+zip");
  assert.equal(requests[0].init.headers.Authorization, "Bearer test-token");
  assert.equal(requests[0].init.body, body);
});

test("upload failures surface the HTTP status instead of succeeding silently", async () => {
  const target = defaultEbookUploadTarget({});
  await assert.rejects(
    uploadEbookObject({
      target,
      key: "downloads/sample.epub",
      body: new Uint8Array([1]),
      token: "test-token",
      attempts: 1,
      fetchImpl: async () => ({ ok: false, status: 403, text: async () => "forbidden" }),
    }),
    /HTTP 403/u
  );
});
