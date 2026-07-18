import assert from "node:assert/strict";

const base = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");
const productionOrigin = "https://un-canon.blog";
const prohibitedBrand = "\u53cd\u6b63\u5178";
const incorrectSimplifiedBrand = "西方负典";
const embeddedMediaTag = /<(?:iframe|video|audio|object|embed)\b/i;

async function page(path) {
  const response = await fetch(`${base}${path}`, { redirect: "manual" });
  return { response, html: await response.text(), path };
}

function tags(html, name) {
  return [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, "gi"))].map(([tag]) => tag);
}

function attribute(tag, name) {
  return tag.match(new RegExp(`\\b${name}=["']([^"']*)["']`, "i"))?.[1] ?? null;
}

function canonical(html) {
  const tag = tags(html, "link").find((candidate) =>
    (attribute(candidate, "rel") || "").split(/\s+/).includes("canonical")
  );
  return tag ? attribute(tag, "href") : null;
}

function openGraph(html, property) {
  const tag = tags(html, "meta").find((candidate) => attribute(candidate, "property") === property);
  return tag ? attribute(tag, "content") : null;
}

function structuredData(html) {
  return [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
    .map(([, json]) => {
      try {
        return JSON.parse(json);
      } catch (error) {
        assert.fail(`invalid JSON-LD: ${error.message}`);
      }
    });
}

function elements(html, name) {
  return [...html.matchAll(new RegExp(`<${name}\\b([^>]*)>([\\s\\S]*?)<\\/${name}>`, "gi"))]
    .map(([outer, attributes, inner]) => ({
      outer,
      opening: `<${name}${attributes}>`,
      inner,
    }));
}

function decodeHtml(value) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&nbsp;|&#160;|&#xA0;/gi, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)));
}

function visibleText(html) {
  return decodeHtml(
    html
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\s+/g, " ")
    .replace(/\s*([·・])\s*/g, "$1")
    .trim();
}

function links(html) {
  return elements(html, "a").map((link) => ({
    ...link,
    href: decodeHtml(attribute(link.opening, "href") || ""),
    text: visibleText(link.inner),
  }));
}

function normalizedPath(value) {
  const url = new URL(value, base);
  return `${url.pathname}${url.search}${url.hash}`;
}

function productionPath(value, label, field) {
  const url = new URL(value, base);
  assert.equal(
    url.origin,
    productionOrigin,
    `${label} ${field} must use the production https://un-canon.blog origin`
  );
  return `${url.pathname}${url.search}${url.hash}`;
}

function assertMetadata(label, result, expectedPath, jsonLdType = null) {
  assert.equal(result.response.status, 200, `${label} must return HTTP 200`);
  const canonicalUrl = canonical(result.html);
  assert.ok(canonicalUrl, `${label} must declare a canonical URL`);
  assert.equal(
    productionPath(canonicalUrl, label, "canonical URL"),
    expectedPath,
    `${label} canonical URL must be self-referential`
  );

  const ogTitle = openGraph(result.html, "og:title");
  const ogUrl = openGraph(result.html, "og:url");
  assert.ok(ogTitle, `${label} must declare og:title`);
  assert.ok(ogUrl, `${label} must declare og:url`);
  assert.equal(
    productionPath(ogUrl, label, "og:url"),
    expectedPath,
    `${label} og:url must match its canonical URL`
  );

  if (jsonLdType) {
    const record = structuredData(result.html).find((value) => value?.["@type"] === jsonLdType);
    assert.ok(record, `${label} must contain ${jsonLdType} JSON-LD`);
    if (record.url) {
      assert.equal(
        productionPath(record.url, label, "JSON-LD url"),
        expectedPath,
        `${label} JSON-LD url must match canonical`
      );
    }
    return record;
  }
  return null;
}

const [
  home,
  article,
  media,
  library,
  filteredLibrary,
  invalidLibrary,
  about,
  topics,
  topic,
  books,
  book,
  missing,
  sitemap,
] = await Promise.all([
  page("/"),
  page("/posts/lih-lenin-disputed"),
  page("/media/csa"),
  page("/library"),
  page("/library?contributor=wang-kui&role=translator"),
  page("/library?contributor=not-a-contributor&role=translator"),
  page("/about"),
  page("/topics"),
  page("/topics/soviet-union-and-bretton-woods"),
  page("/books"),
  page("/books/soviet-planned-economy-retrospective"),
  page("/does-not-exist"),
  page("/sitemap.xml"),
]);

for (const [label, result] of Object.entries({
  home,
  article,
  media,
  library,
  filteredLibrary,
  about,
  topics,
  topic,
  books,
  book,
  missing,
})) {
  assert.ok(!result.html.includes(prohibitedBrand), `${label} must not contain the prohibited brand`);
}

assertMetadata("homepage", home, "/");
assert.match(home.html, /東流不溢/);
assert.match(home.html, /孰知其故/);
assert.equal(
  (home.html.match(/<article[^>]+data-section=/g) || []).length,
  10,
  "main wall must contain ten editorial cards"
);
const expectedNavigation = [
  ["/topics", "专题"],
  ["/books", "连载"],
  ["/library", "文库"],
  ["/about", "关于"],
];
const globalNavigation = elements(home.html, "nav").find(
  (nav) => attribute(nav.opening, "aria-label") === "全站导航"
);
assert.ok(globalNavigation, "homepage must expose the global navigation");
const globalNavigationLinks = links(globalNavigation.inner);
assert.deepEqual(
  globalNavigationLinks.map((link) => link.href),
  expectedNavigation.map(([path]) => path),
  "global navigation order must be 专题, 连载, 文库, 关于"
);
expectedNavigation.forEach(([, label], index) => {
  assert.ok(
    globalNavigationLinks[index].text.endsWith(label),
    `global navigation item ${index + 1} must be labelled ${label}`
  );
});
assert.ok(
  !home.html.includes('aria-label="首页内容栏目"'),
  "homepage must not retain the removed four-section navigation"
);
const latestUpdates = elements(home.html, "section").find(
  (section) => attribute(section.opening, "aria-labelledby") === "poster-latest-title"
);
assert.ok(latestUpdates, "homepage must render the latest-updates section");
assert.ok(
  visibleText(latestUpdates.outer).startsWith("最新更新"),
  "latest-updates heading must not retain its removed decorative number"
);
assert.ok(
  links(latestUpdates.outer).some((link) => link.href === "/library"),
  "latest updates must link to the library"
);
const latestCards = elements(latestUpdates.inner, "article");
assert.equal(latestCards.length, 6, "latest updates must render six article cards");
for (const card of latestCards) {
  assert.match(card.outer, /data-credit-role=["']author["']/,
    "each latest-update card must render an inert author role mark");
  const contributorLink = links(card.outer).find((link) =>
    link.href.startsWith("/library?contributor=")
  );
  assert.ok(contributorLink, "each latest-update card must link its author name to the library");
  assert.doesNotMatch(
    contributorLink.inner,
    /data-credit-role|aria-label=["'](?:作者|译者)["']|>\s*[作译]\s*</,
    "latest-update role marks must remain outside contributor links"
  );
}
const latestTranslation = latestCards.find((card) =>
  card.outer.includes("苏联计划经济的历史审视")
);
assert.ok(latestTranslation, "the known translation must appear in latest updates");
const latestTranslationCreditPaths = links(latestTranslation.outer).map((link) => link.href);
for (const authorId of ["yuri-olsevich", "paul-gregory"]) {
  assert.ok(
    latestTranslationCreditPaths.includes(`/library?contributor=${authorId}`),
    `translation latest-update card must link author ${authorId}`
  );
}
assert.ok(
  !latestTranslationCreditPaths.includes("/library?contributor=wang-kui"),
  "translation latest-update cards must not show translator credits"
);
assert.doesNotMatch(home.html, /href=["']\/search(?:[?"'])/, "new navigation must not emit /search links");
assert.doesNotMatch(home.html, /motion-prototype-switcher|ub_motion_prototype|LOCAL_MOTION_PROTOTYPE/);

assert.equal(
  invalidLibrary.response.status,
  307,
  "invalid library filters must normalize instead of silently showing unrelated records"
);
assert.equal(
  normalizedPath(invalidLibrary.response.headers.get("location") || ""),
  "/library?role=translator",
  "invalid library filters must preserve valid facets"
);

const sectionLabels = {
  essay: "论",
  review: "评",
  translation: "译介",
  multimedia: "多媒体",
};
const editorialCards = elements(home.html, "article")
  .map((card) => ({ ...card, section: attribute(card.opening, "data-section") }))
  .filter((card) => card.section in sectionLabels);
assert.equal(editorialCards.length, 10, "the ten editorial cards must be parseable by data-section");
for (const section of Object.keys(sectionLabels)) {
  assert.ok(
    editorialCards.some((card) => card.section === section),
    `homepage must include at least one ${section} card`
  );
}
for (const card of editorialCards) {
  assert.match(
    card.outer,
    new RegExp(
      `<b[^>]*>${sectionLabels[card.section]}</b>[\\s\\S]{0,300}?<span[^>]*>·<\\/span>[\\s\\S]{0,300}?<span[^>]*>[^<]+<\\/span>[\\s\\S]{0,300}?<time`
    ),
    `${card.section} card header must read 栏目 · 主题分类 before its date`
  );
  assert.doesNotMatch(
    visibleText(card.outer),
    /#\s*\d{2}/,
    `${card.section} card must not expose a category number`
  );
}

const featuredTranslation = editorialCards.find((card) =>
  card.section === "translation" && card.outer.includes("苏联计划经济的历史审视")
);
assert.ok(featuredTranslation, "the known translation recommendation must appear in the editorial wall");
const translationCreditPaths = links(featuredTranslation.outer).map((link) => link.href);
for (const authorId of ["yuri-olsevich", "paul-gregory"]) {
  assert.ok(
    translationCreditPaths.includes(`/library?contributor=${authorId}`),
    `translation recommendation must link author ${authorId}`
  );
}
assert.ok(
  !translationCreditPaths.includes("/library?contributor=wang-kui"),
  "translation recommendations must not show translator credits"
);
assert.doesNotMatch(
  visibleText(featuredTranslation.outer),
  /原作者|译者/,
  "translation recommendations must not invent original-author/translator display fields"
);

const multimediaCard = editorialCards.find((card) => card.section === "multimedia");
assert.ok(multimediaCard, "homepage must include a multimedia card");
assert.match(multimediaCard.outer, /aria-label=["']发布平台与站内资料["']/);
for (const label of ["发布入口", "站外来源", "站内资料"]) {
  assert.ok(visibleText(multimediaCard.outer).includes(label), `multimedia card must retain ${label}`);
}
const multimediaCover = multimediaCard.outer.match(
  /<div\b(?=[^>]*\baria-hidden=["']true["'])[^>]*>([\s\S]*?)<\/div>/i
);
assert.ok(multimediaCover && /\d{2}\s*媒/.test(visibleText(multimediaCover[1])), "multimedia card must retain its folio and glyph");
for (const section of ["review", "translation"]) {
  for (const card of editorialCards.filter((candidate) => candidate.section === section)) {
    assert.doesNotMatch(card.outer, /<hr\b/i, `${section} cards must not render an authored divider`);
  }
}

const articleLd = assertMetadata("article", article, "/posts/lih-lenin-disputed", "Article");
assert.match(article.html, /reading-edition-page/);
assert.match(article.html, /dateModified/);
assert.match(article.html, /正文完/);
assert.match(article.html, /\/library\?contributor=wang-yu/);
assert.doesNotMatch(article.html, /\/library\?contributor=wang-yu(?:&amp;|&)role=translator/);
assert.doesNotMatch(article.html, /data-credit-role=["'](?:editor|proofreader)["']/);
for (const [id, name] of [["lars-t-lih", "拉斯·T·李赫"], ["wang-yu", "王鱼"]]) {
  const creditLink = links(article.html).find(
    (link) => link.href === `/library?contributor=${id}`
  );
  assert.ok(creditLink, `article must link contributor ${id}`);
  assert.equal(creditLink.text, name, `only contributor ${name}'s name may be linked`);
  assert.doesNotMatch(
    creditLink.inner,
    /data-credit-role|aria-label=["'](?:作者|译者)["']|>\s*[作译]\s*</,
    `the role mark for ${name} must remain outside the link`
  );
}
for (const [role, ariaLabel, mark] of [["author", "作者", "作"], ["translator", "译者", "译"]]) {
  assert.match(article.html, new RegExp(`data-credit-role=["']${role}["']`));
  assert.match(
    article.html,
    new RegExp(`aria-label=["']${ariaLabel}["'][^>]*>[\\s\\S]{0,80}?${mark}[\\s\\S]{0,20}?<\\/span>`),
    `article must render the inert ${mark} role mark`
  );
}
assert.ok(
  articleLd.translator?.some((person) =>
    person.name === "王鱼" && normalizedPath(person.url) === "/library?contributor=wang-yu"
  ),
  "article JSON-LD must link the translator name to the contributor filter without a role parameter"
);

const mediaLd = assertMetadata("media detail", media, "/media/csa", "CreativeWork");
assert.doesNotMatch(media.html, embeddedMediaTag, "media detail must not embed a media player");
assert.ok(mediaLd.dateModified, "media JSON-LD must expose dateModified");
assert.ok(Array.isArray(mediaLd.sameAs) && mediaLd.sameAs.length > 0, "media JSON-LD must list external destinations");

assertMetadata("library", library, "/library");
assertMetadata("filtered library", filteredLibrary, "/library");
assert.match(library.html, /内容索引/);
const libraryPanels = elements(library.html, "details");
assert.equal(libraryPanels.length, 5, "library must render five collapsible filter panels");
assert.ok(
  libraryPanels.every((panel) => /\bopen(?:\s|=|>)/i.test(panel.opening)),
  "library filter panels must be expanded in the desktop server view"
);
for (const label of ["栏目", "主题分类", "标签", "贡献者", "署名位置"]) {
  assert.ok(library.html.includes(label), `library must contain the ${label} filter`);
}
assert.doesNotMatch(library.html, /文库内容类型|文章与媒体|书籍与连载/);
const rolePanel = libraryPanels.find((panel) => visibleText(panel.outer).includes("署名位置"));
assert.ok(rolePanel, "library must render the credit-role panel");
assert.match(visibleText(rolePanel.outer), /作者/);
assert.match(visibleText(rolePanel.outer), /译者/);
assert.doesNotMatch(visibleText(rolePanel.outer), /编辑|校对/);
assert.match(filteredLibrary.html, /苏联计划经济的历史审视/);
assert.doesNotMatch(filteredLibrary.html, /学龄前的歌利亚/);

assertMetadata("about", about, "/about");
assert.match(about.html, /我们做什么/);
assert.match(about.html, /编辑旨趣/);
assert.match(about.html, /mailto:editor@un-canon\.com/);
assert.match(about.html, /mailto:info@un-canon\.com/);

const topicsLd = assertMetadata("topics index", topics, "/topics", "CollectionPage");
assert.ok(!topics.html.includes(incorrectSimplifiedBrand), "topics metadata must use 西方負典");
assert.ok(topicsLd.hasPart?.length > 0, "topics index JSON-LD must list published topics");
const topicLd = assertMetadata(
  "topic detail",
  topic,
  "/topics/soviet-union-and-bretton-woods",
  "CollectionPage"
);
assert.match(topic.html, /从这里开始/);
assert.match(topic.html, /会议与制度边界/);
assert.match(topic.html, /世界市场与计划实践/);
assert.equal(topicLd.hasPart?.length, 3, "topic JSON-LD must preserve its three curated items");
for (const item of topicLd.hasPart ?? []) {
  assert.match(item.url, /^https:\/\//, "topic item JSON-LD URLs must be absolute");
}
assert.deepEqual(
  topicLd.hasPart.map((item) => normalizedPath(item.url)),
  [
    "/posts/pechatnov-soviet-union-bretton-woods",
    "/posts/goliath-the-preschooler",
    "/posts/olsevich-gregory-soviet-planned-economy-retrospective",
  ],
  "topic JSON-LD must preserve the hand-curated reading order"
);

const booksLd = assertMetadata("books index", books, "/books", "CollectionPage");
assert.ok(booksLd.hasPart?.length > 0, "books index JSON-LD must list published books");
const bookLd = assertMetadata(
  "book detail",
  book,
  "/books/soviet-planned-economy-retrospective",
  "Book"
);
assert.match(book.html, /从头阅读/);
assert.match(book.html, /阅读最新更新/);
assert.match(book.html, /继续本机记录/);
assert.match(book.html, /\/library\?contributor=wang-kui/);
const citationCards = elements(book.html, "article")
  .map((card) => ({ ...card, kind: attribute(card.opening, "data-citation") }))
  .filter((card) => card.kind);
assert.deepEqual(
  citationCards.map((card) => card.kind),
  ["original", "translation"],
  "book page must keep independent original and translation citation slots"
);
for (const citation of citationCards) {
  const copyButtons = elements(citation.outer, "button");
  assert.ok(copyButtons.length <= 1, `${citation.kind} citation must have at most one copy button`);
  if (copyButtons.length === 1) {
    assert.equal(attribute(copyButtons[0].opening, "type"), "button");
    assert.match(visibleText(copyButtons[0].outer), /复制.*BibTeX|已复制/);
    assert.ok(attribute(copyButtons[0].opening, "aria-describedby"));
    assert.match(citation.outer, /aria-live=["']polite["']/);
  } else {
    assert.match(citation.outer, /书目信息尚待核验/);
  }
}
assert.ok(
  elements(citationCards.find((card) => card.kind === "translation").outer, "button").length === 1,
  "the published translation BibTeX must expose its copy button"
);
const fileLinks = links(book.html).filter((link) => /^(?:PDF|EPUB)/.test(link.text));
assert.equal(new Set(fileLinks.map((link) => link.text.match(/^(PDF|EPUB)/)[1])).size, fileLinks.length);
for (const fileLink of fileLinks) {
  assert.ok(fileLink.href && fileLink.href !== "#", "book downloads must not use placeholder links");
  assert.match(new URL(fileLink.href, base).protocol, /^https?:$/, "book downloads must use local or HTTP(S) URLs");
}
assert.match(bookLd["@id"], /^https:\/\//, "Book @id must be absolute");
assert.match(bookLd.publisher?.url ?? "", /^https:\/\//, "Book publisher URL must be absolute");
assert.ok(bookLd.hasPart?.length > 0, "Book JSON-LD must list chapters");
bookLd.hasPart.forEach((chapter, index) => {
  assert.equal(chapter.position, index + 1, "Chapter positions must be one-based and ordered");
  assert.match(chapter.url, /^https:\/\//, "Chapter JSON-LD URL must be absolute");
});

const [legacySearch, legacyFilteredSearch, mediaRedirect, chapterRedirect] = await Promise.all([
  fetch(`${base}/search`, { redirect: "manual" }),
  fetch(`${base}/search?section=essay&tag=%E5%8E%86%E5%8F%B2`, { redirect: "manual" }),
  fetch(`${base}/posts/csa`, { redirect: "manual" }),
  fetch(
    `${base}/books/soviet-planned-economy-retrospective/chapters/appendix`,
    { redirect: "manual" }
  ),
]);
assert.equal(legacySearch.status, 308, "legacy /search must redirect permanently");
assert.equal(normalizedPath(legacySearch.headers.get("location")), "/library");
assert.equal(legacyFilteredSearch.status, 308, "legacy filtered search must redirect permanently");
assert.equal(
  normalizedPath(legacyFilteredSearch.headers.get("location")),
  "/library?section=essay&tag=%E5%8E%86%E5%8F%B2",
  "legacy search must preserve query parameters"
);
assert.equal(mediaRedirect.status, 308, "legacy multimedia post URL must redirect permanently");
assert.equal(normalizedPath(mediaRedirect.headers.get("location")), "/media/csa");
assert.equal(chapterRedirect.status, 308, "stable chapter entry must redirect permanently");
assert.equal(
  decodeURIComponent(normalizedPath(chapterRedirect.headers.get("location"))),
  "/posts/olsevich-gregory-soviet-planned-economy-retrospective#附录"
);

assert.equal(sitemap.response.status, 200, "sitemap must return HTTP 200");
const sitemapLocations = [...sitemap.html.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, value]) => value);
const sitemapPaths = sitemapLocations.map((value) => new URL(value).pathname);
assert.equal(new Set(sitemapLocations).size, sitemapLocations.length, "sitemap URLs must be unique");
for (const requiredPath of [
  "/",
  "/library",
  "/about",
  "/topics",
  "/topics/soviet-union-and-bretton-woods",
  "/books",
  "/books/soviet-planned-economy-retrospective",
  "/posts/lih-lenin-disputed",
  "/media/csa",
]) {
  assert.ok(sitemapPaths.includes(requiredPath), `sitemap must contain ${requiredPath}`);
}
assert.ok(!sitemapPaths.includes("/search"), "sitemap must not contain the legacy redirect route");
assert.ok(
  sitemapPaths.every((path) => !path.includes("/chapters/")),
  "sitemap must not contain redirect-only chapter entry routes"
);
assert.match(sitemap.html, /<lastmod>/);

const sitemapPages = await Promise.all(sitemapPaths.map((path) => page(path)));
for (const result of sitemapPages) {
  assert.equal(result.response.status, 200, `sitemap URL ${result.path} must return HTTP 200`);
  assert.equal(
    normalizedPath(canonical(result.html)),
    result.path,
    `sitemap URL ${result.path} must be canonical to itself`
  );
}

const rssResponse = await fetch(`${base}/rss.xml`);
const rss = await rssResponse.text();
assert.equal(rssResponse.status, 200, "RSS must return HTTP 200");
assert.match(rssResponse.headers.get("content-type") || "", /application\/rss\+xml/);
assert.match(rss, new RegExp(`<atom:link href="https://un-canon\\.blog/rss\\.xml"`));
const rssItems = [...rss.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, item]) => item);
assert.ok(rssItems.length > 0, "RSS must contain content items");
const rssLinks = rssItems.map((item) => item.match(/<link>([^<]+)<\/link>/)?.[1] ?? "");
assert.equal(new Set(rssLinks).size, rssLinks.length, "RSS item links must be unique");
const rssPaths = rssLinks.map((value) => new URL(value).pathname).sort();
const sitemapContentPaths = sitemapPaths
  .filter((path) => path.startsWith("/posts/") || path.startsWith("/media/"))
  .sort();
assert.deepEqual(rssPaths, sitemapContentPaths, "RSS must contain each published post/media canonical once");
assert.ok(
  rssPaths.every((path) => !path.startsWith("/books/") && !path.startsWith("/topics/")),
  "RSS must not duplicate collection and book landing pages"
);
assert.doesNotMatch(rss, /(src|href)="\//, "RSS content must use absolute internal URLs");

assert.equal(missing.response.status, 404, "missing page must return HTTP 404");
assert.match(missing.html, /页面不存在。/);
assert.doesNotMatch(missing.html, /This page does not exist/);

console.log(`release verification passed for ${base}`);
