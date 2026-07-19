import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const base = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");

// C3: 关键期望值从内容源（source/_topics、source/_books）派生，而非写死当前内容快照，
// 使新增文章、调整策展顺序、增补 BibTeX 时，正确实现不再被误判为回归失败。
const TOPIC_ITEM_PREFIX = { post: "/posts/", book: "/books/", media: "/media/" };
function curatedTopicPaths(slug) {
  const { data } = matter(
    fs.readFileSync(path.join(process.cwd(), "source", "_topics", `${slug}.md`), "utf8")
  );
  const paths = [];
  for (const group of data.groups ?? []) {
    for (const item of group.items ?? []) {
      const prefix = TOPIC_ITEM_PREFIX[item.type];
      if (prefix && item.ref) paths.push(`${prefix}${item.ref}`);
    }
  }
  return paths;
}
function bookCitationKinds(slug) {
  const data = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "source", "_books", `${slug}.json`), "utf8")
  );
  const kinds = [];
  if (typeof data.originalBibtex === "string" && data.originalBibtex.trim()) kinds.push("original");
  if (typeof data.translationBibtex === "string" && data.translationBibtex.trim()) kinds.push("translation");
  return kinds;
}
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

function cloudflareProtectedEmails(html) {
  return [...html.matchAll(/\bdata-cfemail=["']([\da-f]+)["']/gi)].flatMap(([, encoded]) => {
    if (!/^(?:[\da-f]{2}){2,}$/i.test(encoded)) return [];
    const key = Number.parseInt(encoded.slice(0, 2), 16);
    const decoded = [];
    for (let index = 2; index < encoded.length; index += 2) {
      decoded.push(Number.parseInt(encoded.slice(index, index + 2), 16) ^ key);
    }
    return [String.fromCharCode(...decoded)];
  });
}

function assertEmailLink(html, email, label) {
  const literalLink = links(html).some((link) => link.href === `mailto:${email}`);
  const protectedLink = cloudflareProtectedEmails(html).includes(email);
  assert.ok(literalLink || protectedLink, `${label} must link to ${email}`);
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
  const footers = elements(result.html, "footer")
    .filter((footer) => /\bclass=["'][^"']*\bfoot\b/i.test(footer.opening));
  assert.equal(footers.length, 1, `${label} must expose exactly one global footer`);
  const footer = footers[0];
  assert.equal(
    tags(footer.inner, "img").filter((image) => /^\/img\/logo\.(png|webp|avif)$/.test(attribute(image, "src") || "")).length,
    1,
    `${label} footer must retain the site logo`
  );
  assert.match(footer.inner, /\bclass=["'][^"']*\bfoot-brand\b/i, `${label} footer must retain the FOT brand wordmark`);
  if (label === "about") {
    assert.match(
      visibleText(footer.inner),
      /^西方負典 最新修改 \d{4}\.\d{2}\.\d{2} UTC \d{2}:\d{2}:\d{2}$/,
      "about footer must contain the centered brand lockup and build time"
    );
  } else {
    assert.equal(
      visibleText(footer.inner),
      "西方負典",
      `${label} footer must contain only the centered brand lockup`
    );
  }
}

const buildTimes = elements(about.html, "time")
  .filter((item) => /\bdata-build-timestamp(?:\s|=|>)/i.test(item.opening));
assert.equal(buildTimes.length, 1, "about page must expose exactly one build timestamp in the footer");
assert.equal(
  elements(home.html, "time").filter((item) => /\bdata-build-timestamp(?:\s|=|>)/i.test(item.opening)).length,
  0,
  "homepage must not expose the build timestamp"
);
const buildTime = buildTimes[0];
const buildIso = attribute(buildTime.opening, "datetime");
assert.ok(buildIso, "footer build timestamp must expose machine-readable datetime");
const buildDate = new Date(buildIso);
assert.ok(!Number.isNaN(buildDate.valueOf()), "footer build timestamp must be a valid date");
assert.equal(buildDate.toISOString(), buildIso, "footer build timestamp must be normalized UTC ISO");
const buildDatePart = String(buildDate.getUTCFullYear()).padStart(4, "0") + "." +
  String(buildDate.getUTCMonth() + 1).padStart(2, "0") + "." +
  String(buildDate.getUTCDate()).padStart(2, "0");
const buildTimePart = String(buildDate.getUTCHours()).padStart(2, "0") + ":" +
  String(buildDate.getUTCMinutes()).padStart(2, "0") + ":" +
  String(buildDate.getUTCSeconds()).padStart(2, "0");
assert.equal(
  visibleText(buildTime.inner),
  `最新修改 ${buildDatePart} UTC ${buildTimePart}`,
  "footer build timestamp must use the requested compact display format"
);

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
// 不再钉住某一具体译文标题（会随更新老化出最新六篇而误红）；每张最新更新卡片的
// 署名链接结构由上面的通用循环（296-308）覆盖，此处不再做基于具体内容的断言。
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

// 泛化：不钉具体译文标题/作者 id（会随最新译介变化而误红）；只验证译介推荐卡的
// 渲染规则——至少链接一位贡献者、且不显示「原作者/译者」标签字段。作者/译者角色
// 区分的强校验放在按 slug 稳定寻址的书籍页与文章页，不受首页 recency 排序影响。
const featuredTranslation = editorialCards.find((card) => card.section === "translation");
assert.ok(featuredTranslation, "the editorial wall must include a translation recommendation");
assert.ok(
  links(featuredTranslation.outer).some((link) => link.href.startsWith("/library?contributor=")),
  "translation recommendation must link at least one contributor"
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
assert.doesNotMatch(article.html, /本文信息|展开署名与资料/);
const coverKicker = article.html.match(
  /<div\b(?=[^>]*\bclass=["'][^"']*coverKicker)[^>]*>[\s\S]*?<\/div>/i
)?.[0];
assert.ok(coverKicker, "article cover must expose its compact return/date/duration row");
assert.ok(links(coverKicker).some((link) => link.href === "/"), "article cover must link back home");
assert.equal(tags(coverKicker, "time").length, 1, "article cover must expose one publication time");
assert.match(visibleText(coverKicker), /返回首页.*分钟/, "article cover must keep return, date, and duration together");
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
const aboutMains = elements(about.html, "main")
  .filter((main) => attribute(main.opening, "data-about-page") === "true");
assert.equal(aboutMains.length, 1, "about route must expose its dedicated contact main landmark");
const aboutMain = aboutMains[0];
const aboutHeadings = elements(aboutMain.inner, "h1");
assert.equal(aboutHeadings.length, 1, "about contact page must retain one main heading");
assert.equal(visibleText(aboutHeadings[0].inner), "联系我们");
assertEmailLink(aboutMain.inner, "editor@un-canon.com", "about contact page");
assertEmailLink(aboutMain.inner, "info@un-canon.com", "about contact page");
assert.doesNotMatch(aboutMain.inner, /我们做什么|编辑旨趣|团队|查看参与内容/);

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
const curatedTopicItems = curatedTopicPaths("soviet-union-and-bretton-woods");
assert.ok(curatedTopicItems.length > 0, "curated topic source must declare at least one item");
for (const item of topicLd.hasPart ?? []) {
  assert.match(item.url, /^https:\/\//, "topic item JSON-LD URLs must be absolute");
}
assert.deepEqual(
  (topicLd.hasPart ?? []).map((item) => normalizedPath(item.url)),
  curatedTopicItems,
  "topic JSON-LD must render the source-curated items in their authored order"
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
assert.match(book.html, /阅读最新章节/);
assert.match(book.html, /\/library\?contributor=wang-kui/);
const citationCards = elements(book.html, "article")
  .map((card) => ({ ...card, kind: attribute(card.opening, "data-citation") }))
  .filter((card) => card.kind);
assert.deepEqual(
  citationCards.map((card) => card.kind).sort(),
  bookCitationKinds("soviet-planned-economy-retrospective").sort(),
  "book page must render exactly the BibTeX kinds declared in the source manifest"
);
const translationCitation = citationCards.find((card) => card.kind === "translation");
assert.ok(translationCitation, "the published translation BibTeX must have a compact citation row");
const copyButtons = elements(translationCitation.outer, "button");
assert.equal(copyButtons.length, 1, "the published translation BibTeX must expose one copy button");
assert.equal(attribute(copyButtons[0].opening, "type"), "button");
assert.match(visibleText(copyButtons[0].outer), /复制|已复制/);
assert.match(copyButtons[0].opening, /aria-label=["'][^"']*BibTeX/);
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
