import assert from "node:assert/strict";

const base = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");

async function page(path) {
  const response = await fetch(`${base}${path}`, { redirect: "manual" });
  return { response, html: await response.text() };
}

const home = await page("/");
const article = await page("/posts/lih-lenin-disputed");
const mediaRedirect = await fetch(`${base}/posts/csa`, { redirect: "manual" });
const rss = await fetch(`${base}/rss.xml`);
const sitemap = await page("/sitemap.xml");

assert.equal(home.response.status, 200, "homepage must return HTTP 200");
assert.match(home.html, /欢迎来到象征界的大草原/);
assert.doesNotMatch(home.html, /東流不溢，孰知其故/);
assert.doesNotMatch(home.html, /<i[^>]*>(?:论|评|译|媒)<\/i>/);
for (const value of ["ESSAY", "REVIEW", "INTERPRETATION", "MULTIMEDIA"]) {
  assert.ok(home.html.includes(value), `homepage must contain ${value}`);
}

assert.equal(article.response.status, 200, "article must return HTTP 200");
assert.match(article.html, /reading-edition-page/);
assert.match(article.html, /application\/ld\+json/);
assert.match(article.html, /dateModified/);
assert.match(article.html, /正文完 \/ FIN/);
assert.match(article.html, /\/img\/logo\.png/);
for (const value of [
  "反正典",
  "待编辑部补录",
  "资料字段以编辑部档案为准",
  "ORIGINAL RECORD",
  "CREDITS /",
  "ANNOTATIONS",
  "CONTENTS",
  "SOURCES",
]) {
  assert.ok(!article.html.includes(value), `article must not contain ${value}`);
}

assert.equal(mediaRedirect.status, 308, "legacy multimedia post URL must redirect permanently");
assert.equal(mediaRedirect.headers.get("location"), "/media/csa");
assert.equal(rss.status, 200, "RSS must return HTTP 200");
assert.match(rss.headers.get("content-type") || "", /application\/rss\+xml/);
assert.match(sitemap.html, /\/search/);
assert.match(sitemap.html, /\/media\//);
assert.match(sitemap.html, /<lastmod>/);

console.log(`editorial release verification passed for ${base}`);
