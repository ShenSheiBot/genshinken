import assert from "node:assert/strict";
import test from "node:test";
import {
  fallbackExternalLinkPreview,
  isPreviewablePublicUrl,
  parseExternalLinkPreview,
} from "../lib/external-link-preview.ts";

test("public link validation rejects local and credential-bearing targets", () => {
  assert.equal(isPreviewablePublicUrl("https://example.com/article"), true);
  assert.equal(isPreviewablePublicUrl("http://127.0.0.1/article"), false);
  assert.equal(isPreviewablePublicUrl("http://localhost/article"), false);
  assert.equal(isPreviewablePublicUrl("https://user:secret@example.com/article"), false);
  assert.equal(isPreviewablePublicUrl("https://example.com:8443/article"), false);
});

test("metadata parser keeps human identity and a supported declared icon", () => {
  const preview = parseExternalLinkPreview(`
    <!doctype html>
    <html>
      <head>
        <base href="https://cdn.example.com/assets/">
        <meta property="og:site_name" content="Example Journal">
        <meta property="og:title" content="An Example Article">
        <link rel="icon" type="image/svg+xml" href="brand.svg">
        <link rel="shortcut icon" type="image/png" sizes="64x64" href="brand.png">
      </head>
    </html>
  `, new URL("https://example.com/article"));

  assert.equal(preview.siteName, "Example Journal");
  assert.equal(preview.title, "An Example Article");
  assert.equal(preview.iconUrl, "https://cdn.example.com/assets/brand.png");
});

test("metadata-blocking sites retain site identity and an origin favicon", () => {
  const fallback = fallbackExternalLinkPreview("https://zhuanlan.zhihu.com/p/56090681");
  assert.equal(fallback?.siteName, "知乎专栏");
  assert.equal(fallback?.title, "");
  assert.equal(fallback?.iconUrl, "https://zhuanlan.zhihu.com/favicon.ico");
});

test("a confirmed blocked site can use its stable lightweight official icon", () => {
  const fallback = fallbackExternalLinkPreview(
    "https://kakuyomu.jp/works/16817330669771510815/episodes/822139845419609812"
  );
  assert.equal(fallback?.siteName, "カクヨム");
  assert.equal(
    fallback?.iconUrl,
    "https://cdn-static.kakuyomu.jp/images/brand/favicons/app-256.png"
  );
});
