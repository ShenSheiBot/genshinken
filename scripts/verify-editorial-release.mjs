import assert from "node:assert/strict";

const base = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");
const prohibitedBrand = "\u53cd\u6b63\u5178";
const embeddedMediaTag = /<(?:iframe|video|audio|object|embed)\b/i;

async function page(path) {
  const response = await fetch(`${base}${path}`, { redirect: "manual" });
  return { response, html: await response.text() };
}

const home = await page("/");
const article = await page("/posts/lih-lenin-disputed");
const media = await page("/media/csa");
const search = await page("/search");
const missing = await page("/does-not-exist");
const mediaRedirect = await fetch(`${base}/posts/csa`, { redirect: "manual" });
const rss = await fetch(`${base}/rss.xml`);
const sitemap = await page("/sitemap.xml");

for (const [label, result] of Object.entries({ home, article, media, search, missing })) {
  assert.ok(!result.html.includes(prohibitedBrand), `${label} must not contain the prohibited brand`);
}

assert.equal(home.response.status, 200, "homepage must return HTTP 200");
assert.match(home.html, /欢迎来到象征界的大草原/);
assert.match(home.html, /issueRail[^>]*><span>編輯部<\/span>/);
assert.doesNotMatch(home.html, /期号/);
// Cloudflare 会在生产响应中改写可见邮箱链接；React 载荷仍保留原始顺序和值。
assert.match(
  home.html,
  /联系[\s\S]*?mailto:info@un-canon\.com[\s\S]*?投稿[\s\S]*?mailto:editor@un-canon\.com/
);
assert.doesNotMatch(home.html, /INFO@UN-CANON\.COM/);
assert.doesNotMatch(home.html, /東流不溢，孰知其故/);
assert.doesNotMatch(home.html, /<i[^>]*>(?:论|评|译|媒)<\/i>/);
assert.doesNotMatch(home.html, /历史唯物主义论纲/);
assert.doesNotMatch(home.html, /站内不嵌入播放 · 站外内容由详情页跳转/);
assert.doesNotMatch(home.html, /motion-prototype-switcher|ub_motion_prototype|LOCAL_MOTION_PROTOTYPE/);
for (const value of ["论", "评", "译介", "多媒体"]) {
  assert.ok(home.html.includes(value), `homepage must contain ${value}`);
}
for (const number of ["11", "10", "9", "8", "7", "6"]) {
  assert.match(
    home.html,
    new RegExp(`文稿(?:\\s|<!--.*?-->)*${number}`),
    "latest updates must use article numbers"
  );
}
assert.equal((home.html.match(/<article[^>]+data-section=/g) || []).length, 10, "main wall must remain four bands");
for (const value of [
  "ESSAY",
  "REVIEW",
  "INTERPRETATION",
  "MULTIMEDIA",
  "EDITORIAL WALL",
  "ISSUE",
  "MIN READ",
  "LATEST UPDATES",
]) {
  assert.ok(!home.html.includes(value), `homepage must not contain ${value}`);
}

assert.equal(article.response.status, 200, "article must return HTTP 200");
assert.match(article.html, /reading-edition-page/);
assert.match(article.html, /application\/ld\+json/);
assert.match(article.html, /dateModified/);
assert.match(article.html, /正文完/);
assert.match(article.html, /\/img\/logo\.png/);
assert.doesNotMatch(article.html, />文章档案</);
for (const value of [
  "待编辑部补录",
  "资料字段以编辑部档案为准",
  "ORIGINAL RECORD",
  "CREDITS /",
  "ANNOTATIONS",
  "CONTENTS",
  "SOURCES",
  "FIN",
  "TYPEFACE",
  "SIZE",
  "CONTINUE READING",
  "DOSSIER",
  "文章档案 /",
  "西方負典 / UN-CANON",
]) {
  assert.ok(!article.html.includes(value), `article must not contain ${value}`);
}
assert.match(article.html, /<img class="foot-logo" src="\/img\/logo\.png" alt=""\s*\/>/);
assert.doesNotMatch(article.html, /foot-logo-(?:lockup|cn)/);

assert.equal(media.response.status, 200, "media detail must return HTTP 200");
assert.doesNotMatch(media.html, embeddedMediaTag, "media detail must not embed a media player");
assert.match(
  media.html,
  /<img(?=[^>]*src="\/attachments\/7c05677d-fc8b-42f6-8164-8062c5935c59\.png")(?=[^>]*width="1535")(?=[^>]*height="1024")[^>]*>/,
  "media image dimensions must survive the straight-quote cleanup"
);
for (const value of [
  "MULTIMEDIA / DETAIL",
  "EXTERNAL LINKS",
  "ABOUT THIS ITEM",
  "ITEM MATERIAL",
  "RELATED READING",
  "MIN READ",
]) {
  assert.ok(!media.html.includes(value), `media detail must not contain ${value}`);
}

assert.equal(mediaRedirect.status, 308, "legacy multimedia post URL must redirect permanently");
assert.equal(mediaRedirect.headers.get("location"), "/media/csa");
assert.equal(rss.status, 200, "RSS must return HTTP 200");
assert.match(rss.headers.get("content-type") || "", /application\/rss\+xml/);
assert.match(sitemap.html, /\/search/);
assert.match(sitemap.html, /\/media\//);
assert.match(sitemap.html, /<lastmod>/);
const mediaPaths = [
  ...new Set(
    [...sitemap.html.matchAll(/<loc>([^<]*\/media\/[^<]+)<\/loc>/g)].map(
      ([, location]) => new URL(location).pathname
    )
  ),
];
assert.ok(mediaPaths.length > 0, "sitemap must contain at least one media detail page");
for (const path of mediaPaths) {
  const detail = await page(path);
  assert.equal(detail.response.status, 200, `${path} must return HTTP 200`);
  assert.doesNotMatch(detail.html, embeddedMediaTag, `${path} must not embed a media player`);
  assert.ok(!detail.html.includes(prohibitedBrand), `${path} must not contain the prohibited brand`);
}
assert.equal(search.response.status, 200, "search must return HTTP 200");
assert.match(search.html, /内容索引/);
assert.doesNotMatch(search.html, /文章索引/);
assert.equal((search.html.match(/<details[^>]+open/g) || []).length, 3, "archive filters must be collapsible");
assert.doesNotMatch(search.html, /按栏目、主题分类和标签浏览全部站内内容/);
assert.doesNotMatch(search.html, /索引 \/ INDEX|全部 \/ ALL|MIN READ/);
assert.equal(missing.response.status, 404, "missing page must return HTTP 404");
assert.match(missing.html, /页面不存在。/);
assert.doesNotMatch(missing.html, /This page does not exist/);

console.log(`editorial release verification passed for ${base}`);
