import assert from "node:assert/strict";
import crypto from "node:crypto";
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
function readBookManifest(slug) {
  return JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "source", "_books", `${slug}.json`), "utf8")
  );
}
function sourceBookStatusCounts() {
  const directory = path.join(process.cwd(), "source", "_books");
  return fs.readdirSync(directory)
    .filter((file) => file.endsWith(".json"))
    .map((file) => JSON.parse(fs.readFileSync(path.join(directory, file), "utf8")))
    .reduce((counts, book) => {
      counts[book.status] = (counts[book.status] ?? 0) + 1;
      return counts;
    }, {});
}
function bookCitationKinds(slug) {
  const data = readBookManifest(slug);
  const kinds = [];
  if (typeof data.originalBibtex === "string" && data.originalBibtex.trim()) kinds.push("original");
  if (typeof data.translationBibtex === "string" && data.translationBibtex.trim()) kinds.push("translation");
  return kinds;
}
function flattenBookChapters(chapters, depth = 0) {
  return (chapters ?? []).flatMap((chapter) => [
    {
      ...chapter,
      status: chapter.status ?? "published",
      statusExplicit: Object.hasOwn(chapter, "status"),
      depth,
    },
    ...flattenBookChapters(chapter.children, depth + 1),
  ]);
}
function postLibraryFacets(slug) {
  const { data } = matter(
    fs.readFileSync(path.join(process.cwd(), "source", "_posts", `${slug}.md`), "utf8")
  );
  return {
    section: String(data.section || ""),
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
  };
}
function sourceLibraryRecords() {
  const directory = path.join(process.cwd(), "source", "_posts");
  return fs.readdirSync(directory)
    .filter((file) => file.endsWith(".md"))
    .flatMap((file) => {
      const { data } = matter(fs.readFileSync(path.join(directory, file), "utf8"));
      if (data.draft === true) return [];
      const slug = String(data.slug || path.basename(file, ".md"));
      const section = String(data.section || "");
      return [{
        href: section === "multimedia" ? `/media/${slug}` : `/posts/${slug}`,
        section,
        tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
      }];
    });
}
const productionOrigin = "https://un-canon.blog";
const prohibitedBrand = "\u53cd\u6b63\u5178";
const incorrectSimplifiedBrand = "西方负典";
const embeddedMediaTag = /<(?:iframe|video|audio|object|embed)\b/i;
const readingChromeSource = fs.readFileSync(
  path.join(process.cwd(), "app", "prototype", "reading", "[slug]", "ReadingPrototypeChrome.tsx"),
  "utf8"
);
const readingStylesSource = fs.readFileSync(
  path.join(process.cwd(), "app", "prototype", "reading", "[slug]", "reading-prototype.module.css"),
  "utf8"
);
const readingEditionSource = fs.readFileSync(
  path.join(process.cwd(), "app", "components", "reading-edition", "ReadingEdition.tsx"),
  "utf8"
);
const postsSource = fs.readFileSync(path.join(process.cwd(), "lib", "posts.ts"), "utf8");
const globalStylesSource = fs.readFileSync(path.join(process.cwd(), "app", "globals.css"), "utf8");
assert.equal(
  (readingChromeSource.match(/GLOBAL_NAV_ITEMS\.map\s*\(/g) ?? []).length,
  1,
  "reader global navigation must render exactly once, in the reading header"
);
assert.doesNotMatch(
  readingChromeSource,
  /<span className=\{styles\.eyebrow\}>\u7f72\u540d<\/span>/,
  "reader desktop credits must omit the redundant visible attribution heading"
);
assert.match(
  readingChromeSource,
  /\{articleIdentity\}\{compactCredits\}\{lineNavigator\}\{tocPanel\}/,
  "reader desktop rail must place credits directly before reading progress and the table of contents"
);
assert.doesNotMatch(
  readingChromeSource,
  /currentChapter|当前章节/,
  "reader desktop rail must not duplicate the active table-of-contents entry as a current chapter block"
);
assert.doesNotMatch(
  readingChromeSource,
  /本版阅读进度|当前字号、字族与视口下的视觉行|className=\{styles\.lineJump\}/,
  "reader progress must use the compact click-to-edit control"
);
assert.match(
  readingChromeSource,
  /<span>阅读进度<\/span>[\s\S]*?editingLine[\s\S]*?String\(currentLine\)[\s\S]*?String\(lineCount\)/,
  "reader progress must expose ungrouped current and total line counts"
);
assert.match(readingChromeSource, />您正在读<\//, "reader identity label must use the confirmed wording");
assert.doesNotMatch(readingChromeSource, />当前阅读<\//, "reader identity label must not retain the old wording");
assert.match(
  readingChromeSource,
  /referenceCounter[\s\S]*?当前第 \$\{current\} 条\$\{heading\}[\s\S]*?<small><span>\/<\/span>\{String\(items\.length\)\}<\/small>/,
  "reference panes must expose an editable current/total counter"
);
assert.match(
  readingChromeSource,
  /data-rail-progress=\{desktopDesk \? "true" : "false"\}/,
  "reader header progress must defer to the visible desktop rail"
);
assert.doesNotMatch(
  readingChromeSource,
  /上一条|查看文末|下一条/,
  "reference panes must not retain the superseded previous/end/next actions"
);
assert.match(
  readingChromeSource,
  /首条\{heading\}[\s\S]*?末条\{heading\}[\s\S]*?原文位置/,
  "reference panes must expose edge and source-position actions"
);
assert.match(
  readingChromeSource,
  /returnToPageStart[\s\S]*?window\.scrollTo\(\{ top: 0,[\s\S]*?<button className=\{styles\.toTop\}[^>]*>返回篇首<\/button>/,
  "return-to-start must use an arrowless control that scrolls to the true page top"
);
assert.match(
  readingStylesSource,
  /\.body\s+:global\(\.signature-block p\)[\s\S]*?font-family:\s*var\(--f-cjk-kaiti\);[\s\S]*?font-size:\s*var\(--reader-font\);/,
  "in-text signature blocks must follow the reader size in hosted STKaiti"
);
assert.match(
  readingStylesSource,
  /\.referenceScroller\s*\{[\s\S]*?scrollbar-width:\s*none;/,
  "reference panes must keep scrolling while hiding their visible scrollbars"
);
assert.match(
  readingStylesSource,
  /\.lineNumbers > span\s*\{[^}]*font-size:\s*15px;[^}]*\}[\s\S]*?\.lineNumbers strong\s*\{[^}]*font-size:\s*15px;/,
  "reader progress label and current value must share the same size"
);
assert.match(
  readingStylesSource,
  /\.appendixContent :global\(\.footnotes li\)[\s\S]*?font-size:\s*calc\(var\(--reader-font\) - 1px\);[\s\S]*?\.appendixContent :global\(\.footnotes p\)[\s\S]*?font-size:\s*calc\(var\(--reader-font\) - 1px\);/,
  "endnotes and sources must remain exactly one size below the reader body"
);
assert.match(
  readingStylesSource,
  /input\.lineCurrent::selection\s*\{[^}]*color:\s*var\(--solid-ink\);[^}]*background:\s*var\(--solid\);/,
  "line input selection must use the active theme contrast tokens"
);
assert.match(
  readingStylesSource,
  /\.referenceItem\[data-active="true"\] \.referenceSelect[\s\S]*?grid-column:\s*1;[\s\S]*?\.referenceItem\[data-active="true"\] \.referenceDetailShell\s*\{\s*grid-row:\s*1;/,
  "selected reference labels and their first detail line must share a row"
);
assert.match(readingEditionSource, /\.slice\(0, 3\)/, "article related reading must select three cards");
assert.doesNotMatch(readingEditionSource, /<span>03<\/span>/, "article related reading must omit its decorative number");
assert.match(
  postsSource,
  /titleBreaks:\s*string\[\][\s\S]*?title_breaks[\s\S]*?segments\.join\(""\) !== title/,
  "article metadata must load title_breaks and require an exact title reconstruction"
);
assert.match(
  readingEditionSource,
  /function PreferredTitle[\s\S]*?post\.titleBreaks\.map[\s\S]*?<wbr \/>/,
  "article titles must render editorially preferred break opportunities"
);
assert.match(
  readingEditionSource,
  /className=\{styles\.docketNumber\}\s+aria-label=\{post\.sectionNo\}[\s\S]*?Array\.from\(post\.sectionNo\)\.map[\s\S]*?data-roll=\{index % 2 === 0 \? "up" : "down"\}/,
  "article docket numbers must expose two independently rolling digit slots"
);
assert.doesNotMatch(
  readingEditionSource,
  /className=\{styles\.dossierCover\}\s+id="reading-cover"\s+data-reveal/,
  "the custom reader entrance must not be hidden by the generic cover reveal"
);
assert.match(
  readingStylesSource,
  /@media \(prefers-reduced-motion: no-preference\)[\s\S]*?\.docketDigit\[data-roll="up"\][^}]*animation:\s*docket-digit-up[\s\S]*?\.docketDigit\[data-roll="down"\][^}]*animation:\s*docket-digit-down/,
  "article docket digits must roll upward and downward only when motion is allowed"
);
assert.match(
  readingStylesSource,
  /\.docket::after\s*\{[^}]*animation:\s*reader-rule-rise\s+520ms[^}]*80ms[^}]*\}[\s\S]*?\.docketSectionLink > b\s*\{[^}]*reader-cover-left[^}]*600ms[\s\S]*?\.coverStory > \*\s*\{[^}]*reader-cover-right[\s\S]*?\.dossierReading \.articleFlow\s*\{[^}]*reader-body-enter[\s\S]*?\.leftDeskRail\s*\{[^}]*reader-rail-left[\s\S]*?\.referenceRail\s*\{[^}]*reader-rail-right/,
  "reader entrance must sequence the rule, opposing cover fields, body, and outward rails"
);
assert.match(
  readingStylesSource,
  /\.docketDigit\[data-roll="up"\] > span\s*\{[^}]*docket-digit-up\s+820ms[^}]*980ms[^}]*\}[\s\S]*?\.docketDigit\[data-roll="down"\] > span\s*\{[^}]*docket-digit-down\s+760ms[^}]*1040ms/,
  "staggered docket digits must finish together at 1800ms"
);
assert.match(
  readingStylesSource,
  /@keyframes docket-digit-up\s*\{[^}]*translateY\(115%\)[\s\S]*?@keyframes docket-digit-down\s*\{[^}]*translateY\(-115%\)/,
  "article docket digit keyframes must enter from opposite vertical directions"
);
assert.match(
  readingStylesSource,
  /\.dossierCover\s*\{[^}]*grid-template-rows:\s*max-content;[^}]*align-items:\s*stretch;[^}]*min-height:\s*0;[^}]*\}[\s\S]*?\.coverStory\s*\{[^}]*grid-column:\s*2 \/ -1;[^}]*align-self:\s*start;[^}]*\}[\s\S]*?\.coverStory h1\s*\{[^}]*max-width:\s*none;/,
  "desktop article titles must use the full rightward width while the cover height follows actual content"
);
assert.match(
  readingStylesSource,
  /\.docket\s*\{[^}]*position:\s*relative;[^}]*\}[\s\S]*?\.docket::after\s*\{[^}]*top:\s*0;[^}]*bottom:\s*0;[^}]*background:\s*var\(--hair-strong\);[^}]*\}[\s\S]*?\.docketSectionLink b\s*\{[^}]*font-family:\s*"Microsoft YaHei",\s*"微软雅黑",\s*"Noto Sans CJK SC"[^}]*font-weight:\s*900;/,
  "article docket must animate a full-height separator and retain its heavy section mark"
);
assert.doesNotMatch(
  readingStylesSource,
  /\.coverStory h1\s*\{[^}]*(?:max-width:\s*740px|text-wrap:\s*balance)/,
  "desktop article titles must not retain the old width cap or automatic balancing"
);
assert.match(
  readingStylesSource,
  /\.creditMark\s*\{[^}]*border:\s*1px solid var\(--accent\);[^}]*font-family:\s*"Microsoft YaHei",\s*"微软雅黑"[^}]*font-weight:\s*700;[\s\S]*?\.compactCredits \.creditMark\s*\{\s*width:\s*16px;\s*height:\s*16px;\s*font-size:\s*var\(--text-sm\);\s*\}/,
  "desktop rail credit roles must retain boxed cmarks and share the bold Microsoft YaHei glyph style"
);
assert.match(
  globalStylesSource,
  /\.cmark\s*\{[^}]*font-family:\s*"Microsoft YaHei",\s*"微软雅黑"[^}]*font-weight:\s*700;/,
  "boxed cmarks must share a bold Microsoft YaHei glyph style"
);
assert.match(
  readingChromeSource,
  /setLineMarkers\([\s\S]*?\(index \+ 1\) % 10 === 0[\s\S]*?className=\{styles\.visualLineMarker\}[\s\S]*?data-line=\{String\(marker\.line\)\}/,
  "the reading chrome must regenerate a marker for every tenth measured visual line"
);
assert.match(
  readingStylesSource,
  /\.visualLineMarkers\s*\{[^}]*display:\s*none;[\s\S]*?\.visualLineMarker::before,[\s\S]*?\.visualLineMarker::after[\s\S]*?@media \(min-width:\s*1200px\)\s*\{\s*\.visualLineMarkers\s*\{\s*display:\s*block;/,
  "visual line markers must appear on both sides when the desktop reading grid has enough room"
);
assert.doesNotMatch(
  readingChromeSource,
  /snapVisibleBodyLine|scheduleBodySnap|bodySnapTimer/,
  "the main article scroll must not perform a second post-scroll line snap"
);
assert.match(
  readingStylesSource,
  /--reading-bottom-safe:\s*22px;[\s\S]*?height:\s*calc\(100dvh - var\(--reading-rail-top\) - var\(--reading-bottom-safe\)\);/,
  "both desktop rails must share a modest bottom safe area"
);

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

function namedMeta(html, name) {
  const tag = tags(html, "meta").find((candidate) => attribute(candidate, "name") === name);
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

async function verifyHostedCjkFonts(html) {
  const stylesheetUrls = tags(html, "link")
    .filter((tag) => (attribute(tag, "rel") || "").split(/\s+/).includes("stylesheet"))
    .map((tag) => new URL(decodeHtml(attribute(tag, "href") || ""), base));
  assert.ok(stylesheetUrls.length > 0, "article must expose its compiled stylesheets");

  const stylesheetResponses = await Promise.all(stylesheetUrls.map((url) => fetch(url)));
  for (const [index, response] of stylesheetResponses.entries()) {
    assert.equal(response.status, 200, `stylesheet must be reachable: ${stylesheetUrls[index]}`);
  }
  const compiledCss = (await Promise.all(stylesheetResponses.map((response) => response.text()))).join("\n");
  const faceBlocks = [...compiledCss.matchAll(/@font-face\s*{[\s\S]*?}/g)].map((match) => match[0]);
  const expectedFamilies = ["UN Canon STSong", "UN Canon STFangsong", "UN Canon STKaiti"];
  const fontUrls = [];

  for (const family of expectedFamilies) {
    const face = faceBlocks.find((block) =>
      new RegExp(`font-family\\s*:\\s*["']?${family}["']?\\s*;`).test(block)
    );
    assert.ok(face, `compiled CSS must retain the self-hosted ${family} face`);
    assert.match(face, /font-display\s*:\s*swap(?:\s*;|\s*})/, `${family} must remain non-blocking`);
    const source = /src\s*:\s*url\(([^)]+)\)\s*format\(["']?woff2["']?\)/.exec(face)?.[1]
      .trim()
      .replace(/^['"]|['"]$/g, "");
    assert.ok(source, `${family} must expose a WOFF2 source URL`);
    const url = new URL(source, base);
    assert.equal(url.origin, new URL(base).origin, `${family} must remain same-origin`);
    fontUrls.push({ family, url });
  }

  const fontResponses = await Promise.all(fontUrls.map(({ url }) => fetch(url)));
  const hashes = new Set();
  for (const [index, response] of fontResponses.entries()) {
    const { family, url } = fontUrls[index];
    assert.equal(response.status, 200, `${family} must be published at ${url}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    assert.equal(bytes.subarray(0, 4).toString("ascii"), "wOF2", `${family} must publish valid WOFF2 bytes`);
    const digest = crypto.createHash("sha256").update(bytes).digest("hex");
    assert.ok(!hashes.has(digest), `${family} must not duplicate another hosted CJK font`);
    hashes.add(digest);
  }
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
  const ogDescription = openGraph(result.html, "og:description");
  const ogUrl = openGraph(result.html, "og:url");
  const ogSiteName = openGraph(result.html, "og:site_name");
  assert.ok(ogTitle, `${label} must declare og:title`);
  assert.ok(ogDescription, `${label} must declare og:description`);
  assert.ok(ogUrl, `${label} must declare og:url`);
  assert.equal(ogSiteName, "西方負典的博客", `${label} must use the shared OpenGraph site name`);
  assert.equal(openGraph(result.html, "og:image"), null, `${label} must not declare og:image`);
  assert.equal(openGraph(result.html, "og:locale"), null, `${label} must not declare og:locale`);
  assert.equal(namedMeta(result.html, "twitter:title"), ogTitle, `${label} Twitter title must share og:title`);
  assert.equal(
    namedMeta(result.html, "twitter:description"),
    ogDescription,
    `${label} Twitter description must share og:description`
  );
  assert.equal(namedMeta(result.html, "twitter:image"), null, `${label} must not declare twitter:image`);
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

const shulginManifest = readBookManifest("shulgin-dni");
const shulginChapters = flattenBookChapters(shulginManifest.chapters);
const shulginPublishedChapters = shulginChapters.filter((chapter) => chapter.status === "published");
const shulginForthcomingChapters = shulginChapters.filter((chapter) => chapter.status === "forthcoming");
const shulginSourceMarkdown = fs.readFileSync(
  path.join(process.cwd(), "source", "_posts", "shulgin-dni.md"),
  "utf8"
);
const shulginOriginalNoteIds = [...shulginSourceMarkdown.matchAll(/^\[\^(\d+)\]:/gm)]
  .map((match) => Number(match[1]));
const historicalMaterialismSource = fs.readFileSync(
  path.join(process.cwd(), "source", "_posts", "historical-materialism-theses.md"),
  "utf8"
);
assert.doesNotMatch(
  historicalMaterialismSource.trimEnd(),
  /(?:^|\n)(?:---|\*\*\*)$/,
  "historical-materialism-theses must not end with a redundant thematic break"
);
assert.equal(shulginChapters.length, 16, "shulgin-dni catalogue must contain 16 nodes");
assert.equal(shulginPublishedChapters.length, 7, "shulgin-dni current release must publish 7 nodes");
assert.equal(shulginForthcomingChapters.length, 9, "shulgin-dni current release must retain 9 forthcoming nodes");
assert.deepEqual(
  shulginPublishedChapters.map((chapter) => chapter.id),
  [
    "shulgin-notes",
    "epigraph-and-preface",
    "constitutional-day-one",
    "constitutional-day-two",
    "constitutional-day-three",
    "penultimate-days",
    "penultimate-1916-11-03",
  ],
  "shulgin-dni current release must contain Proof.00 through Proof.04 catalogue entries"
);
assert.deepEqual(
  shulginOriginalNoteIds,
  [
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13,
    15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28,
    31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44,
    45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58,
    59, 60, 61, 62, 63,
  ],
  "shulgin-dni current release must include only original notes referenced by published units"
);
assert.ok(
  shulginChapters.every((chapter) => chapter.status === "published" || chapter.status === "forthcoming"),
  "shulgin-dni catalogue entries must explicitly declare published/forthcoming status"
);
assert.ok(
  shulginChapters.every((chapter) => chapter.statusExplicit),
  "shulgin-dni must not rely on the legacy implicit-published compatibility path"
);
assert.equal(
  shulginChapters.find((chapter) => chapter.number === "00")?.status,
  "published",
  "shulgin-dni 00 material must be published"
);
assert.equal(
  shulginChapters.find((chapter) => chapter.number === "01")?.status,
  "published",
  "shulgin-dni 01 material must be published"
);
assert.ok(
  shulginForthcomingChapters.length > 0,
  "shulgin-dni must retain its forthcoming catalogue plan"
);
assert.ok(
  shulginForthcomingChapters.every(
    (chapter) => !Object.hasOwn(chapter, "anchor") && !Object.hasOwn(chapter, "publishedAt")
  ),
  "shulgin-dni forthcoming entries must omit anchor and publishedAt"
);
assert.ok(
  shulginChapters.some((chapter) => chapter.depth > 0),
  "shulgin-dni must exercise recursive catalogue children"
);
assert.ok(
  shulginPublishedChapters.some((chapter) => chapter.id === shulginManifest.latestChapterId),
  "shulgin-dni latestChapterId must identify a published catalogue entry"
);

const { data: mullahologyTopicData } = matter(
  fs.readFileSync(path.join(process.cwd(), "source", "_topics", "mullahology.md"), "utf8")
);
const mullahologyGroups = mullahologyTopicData.groups ?? [];
const mullahologyTopicItems = curatedTopicPaths("mullahology");
assert.equal(mullahologyTopicData.title, "毛拉学", "mullahology topic title must remain stable");
assert.deepEqual(
  mullahologyGroups.map((group) => String(group.number).padStart(2, "0")),
  ["00", "01"],
  "mullahology must retain its explicit preface and chapter unit numbers"
);
assert.deepEqual(
  mullahologyTopicItems,
  ["/posts/mullahology-00", "/posts/mullahology-01"],
  "mullahology must retain its two published source units in authored order"
);

const [
  home,
  article,
  preferredBreakArticle,
  media,
  library,
  filteredLibrary,
  invalidLibrary,
  about,
  topics,
  topic,
  mullahologyTopic,
  mullahologyPreface,
  mullahologyChapter,
  books,
  book,
  shulginBook,
  shulginDocument,
  fangLibrary,
  shulginLibrary,
  yuLibrary,
  missing,
  sitemap,
] = await Promise.all([
  page("/"),
  page("/posts/lih-lenin-disputed"),
  page("/posts/olsevich-gregory-soviet-planned-economy-retrospective"),
  page("/media/csa"),
  page("/library"),
  page("/library?contributor=wang-kui&role=translator"),
  page("/library?contributor=not-a-contributor&role=translator"),
  page("/about"),
  page("/topics"),
  page("/topics/soviet-union-and-bretton-woods"),
  page("/topics/mullahology"),
  page("/posts/mullahology-00"),
  page("/posts/mullahology-01"),
  page("/books"),
  page("/books/soviet-planned-economy-retrospective"),
  page("/books/shulgin-dni"),
  page(`/posts/${encodeURIComponent(shulginManifest.documentSlug)}`),
  page("/library?contributor=fang-cao"),
  page("/library?contributor=vasily-shulgin"),
  page("/library?contributor=yu-shulue"),
  page("/does-not-exist"),
  page("/sitemap.xml"),
]);

for (const [label, result] of Object.entries({
  home,
  article,
  preferredBreakArticle,
  media,
  library,
  filteredLibrary,
  about,
  topics,
  topic,
  mullahologyTopic,
  mullahologyPreface,
  mullahologyChapter,
  books,
  book,
  shulginBook,
  shulginDocument,
  fangLibrary,
  shulginLibrary,
  yuLibrary,
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
for (const pathName of ["/posts/mullahology-00", "/posts/mullahology-01", "/posts/shulgin-dni"]) {
  assert.ok(
    links(home.html).some((link) => link.href === pathName),
    `combined public preview homepage must retain ${pathName}`
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
  translation: "译",
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
const nonFeaturedEditorialCards = editorialCards.filter(
  (card) => attribute(card.opening, "data-featured") !== "true"
);
const mullahologyPrefaceCard = editorialCards.find((card) =>
  links(card.outer).some((link) => link.href === "/posts/mullahology-00")
);
assert.ok(mullahologyPrefaceCard, "homepage must expose the Mullahology preface recommendation");
const mullahologyPrefaceTitle = elements(mullahologyPrefaceCard.outer, "h2")[0];
assert.ok(mullahologyPrefaceTitle, "Mullahology preface recommendation must expose its title");
assert.deepEqual(
  elements(mullahologyPrefaceTitle.inner, "span").map((line) => visibleText(line.inner)),
  ["一份关于克苏鲁的", "调查报告"],
  "Mullahology preface homepage title must preserve its two editorial lines"
);
assert.ok(
  visibleText(mullahologyPrefaceCard.outer)
    .includes("如果自由主义的真理是纳粹主义，那么新自由主义的真理是什么？"),
  "Mullahology preface recommendation must expose the revised overview"
);
assert.ok(nonFeaturedEditorialCards.length > 0, "homepage must include non-featured editorial cards");
for (const card of nonFeaturedEditorialCards) {
  assert.equal(
    attribute(card.opening, "data-treatment"),
    "third-compact",
    "every non-featured editorial card must use the compact title treatment"
  );
}
for (const card of editorialCards) {
  const background = card.outer.match(
    /<div\b(?=[^>]*\bdata-card-background=["']true["'])(?=[^>]*\baria-hidden=["']true["'])[^>]*>([\s\S]*?)<\/div>/i
  );
  assert.ok(background, `${card.section} card must expose its inert background layer`);
  assert.match(
    visibleText(background[1]),
    /^\d{2}$/,
    `${card.section} card background must contain only its two-digit folio`
  );
  assert.doesNotMatch(
    visibleText(background[1]),
    /\p{Script=Han}/u,
    `${card.section} card background must not contain decorative Han glyphs`
  );
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

// 泛化：不钉具体译文标题/作者 id（会随最新“译”栏目变化而误红）；只验证“译”栏目推荐卡的
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
for (const section of ["review", "translation"]) {
  for (const card of editorialCards.filter((candidate) => candidate.section === section)) {
    assert.doesNotMatch(card.outer, /<hr\b/i, `${section} cards must not render an authored divider`);
  }
}

const articleLd = assertMetadata("article", article, "/posts/lih-lenin-disputed", "Article");
await verifyHostedCjkFonts(article.html);
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
assert.match(
  visibleText(coverKicker),
  /返回首页.*第\s*\d+\s*号.*\d{4}\.\d{2}\.\d{2}.*\d+\s*分钟/,
  "article cover must keep return, issue number, date, and duration together in that order"
);
assert.match(preferredBreakArticle.html, /<wbr\s*\/?\s*>/i, "segmented article titles must expose preferred break opportunities");
const articleFacets = postLibraryFacets("lih-lenin-disputed");
const articleDocket = elements(article.html, "aside").find((aside) =>
  /\bclass=["'][^"']*docket/.test(aside.opening)
);
assert.ok(articleDocket, "article cover must expose its section docket");
assert.doesNotMatch(
  articleDocket.inner,
  /<p\b[^>]*>[\s\S]*?西方負典[\s\S]*?文章[\s\S]*?第\s*\d+\s*号[\s\S]*?<\/p>/i,
  "article docket must not duplicate the brand, document type, and issue number"
);
const articleSectionLink = links(articleDocket.inner).find(
  (link) => link.href === `/library?section=${encodeURIComponent(articleFacets.section)}`
);
assert.ok(articleSectionLink, "article section label must link to its library section filter");
assert.match(
  articleSectionLink.text,
  new RegExp(`^${sectionLabels[articleFacets.section]}\\s*\\d\\s*\\d$`),
  "article section link must combine its section label and folio number"
);
const articleTagLine = elements(article.html, "nav").find((element) =>
  /\bclass=["'][^"']*tagLine/.test(element.opening)
);
assert.ok(articleTagLine, "article cover must expose its tag list");
const expectedArticleTagLinks = articleFacets.tags.map((tag) => ({
  href: `/library?tag=${encodeURIComponent(tag)}`,
  text: `#${tag}`,
}));
assert.deepEqual(
  links(articleTagLine.inner).map(({ href, text }) => ({ href, text })),
  expectedArticleTagLinks,
  "article tags must map one-to-one to their library tag filters"
);
const articleFacetTargets = [
  { label: "section", href: articleSectionLink.href },
  ...expectedArticleTagLinks.map(({ href, text }) => ({ label: text, href })),
];
const libraryRecords = sourceLibraryRecords();
const articleFacetLandings = await Promise.all(
  articleFacetTargets.map(({ href }) => page(href))
);
for (const [index, landing] of articleFacetLandings.entries()) {
  const target = articleFacetTargets[index];
  assert.equal(landing.response.status, 200, `${target.label} library filter must resolve`);
  assert.equal(normalizedPath(canonical(landing.html) || ""), "/library");
  const activeFacet = links(landing.html).find((link) => link.href === target.href);
  assert.ok(activeFacet, `${target.label} library filter must remain addressable`);
  assert.equal(attribute(activeFacet.opening, "data-active"), "true");
  assert.equal(attribute(activeFacet.opening, "aria-current"), "true");
  const params = new URL(target.href, productionOrigin).searchParams;
  const expectedResults = libraryRecords
    .filter((record) =>
      (!params.get("section") || record.section === params.get("section"))
      && (!params.get("tag") || record.tags.includes(params.get("tag")))
    )
    .map((record) => record.href)
    .sort();
  const actualResults = [...new Set(
    links(landing.html)
      .map((link) => link.href)
      .filter((href) => /^\/(?:posts|media)\//.test(href))
  )].sort();
  assert.deepEqual(
    actualResults,
    expectedResults,
    `${target.label} library filter must return exactly its matching records`
  );
}
const readingHeader = elements(article.html, "header").find((header) =>
  /aria-label=["']返回西方負典首页["']/.test(header.inner)
  && /<nav\b[^>]*aria-label=["']全站导航["']/.test(header.inner)
);
assert.ok(readingHeader, "article must expose its reading header with a home link and global navigation");
const readingNavigation = elements(readingHeader.inner, "nav").find(
  (nav) => attribute(nav.opening, "aria-label") === "全站导航"
);
assert.ok(readingNavigation, "article reading header must expose the global navigation");
const readingNavigationLinks = links(readingNavigation.inner);
assert.deepEqual(
  readingNavigationLinks.map((link) => link.href),
  expectedNavigation.map(([path]) => path),
  "article navigation order must be 专题, 连载, 文库, 关于"
);
expectedNavigation.forEach(([, label], index) => {
  assert.ok(
    readingNavigationLinks[index].text.endsWith(label),
    `article navigation item ${index + 1} must be labelled ${label}`
  );
});
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
assertMetadata("fang-cao library", fangLibrary, "/library");
assertMetadata("vasily-shulgin library", shulginLibrary, "/library");
assertMetadata("yu-shulue library", yuLibrary, "/library");
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
assert.match(fangLibrary.html, /一份关于克苏鲁的调查报告/);
assert.match(fangLibrary.html, /斩断伊斯兰这片绿色的叶子/);
assert.match(shulginLibrary.html, /往日/);
assert.match(yuLibrary.html, /往日/);

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
const mullahologyLd = assertMetadata(
  "mullahology topic detail",
  mullahologyTopic,
  "/topics/mullahology",
  "CollectionPage"
);
const mullahologyText = visibleText(mullahologyTopic.html);
assert.match(mullahologyText, /专题单元 00/);
assert.match(mullahologyText, /专题单元 01/);
assert.match(mullahologyText, /一份关于克苏鲁的调查报告/);
assert.match(mullahologyText, /斩断伊斯兰这片绿色的叶子/);
assert.deepEqual(
  (mullahologyLd.hasPart ?? []).map((item) => normalizedPath(item.url)),
  mullahologyTopicItems,
  "mullahology JSON-LD must retain both source units in authored order"
);
assertMetadata("mullahology preface", mullahologyPreface, "/posts/mullahology-00", "Article");
assert.match(
  mullahologyPreface.html,
  /data-footnotes|class="footnotes"/,
  "mullahology preface must render its restored annotation section"
);
assert.match(
  visibleText(mullahologyPreface.html),
  /福柯的中世纪帝国是代表一种时间的最后终止/,
  "mullahology preface must retain the restored annotation text"
);
assertMetadata("mullahology chapter one", mullahologyChapter, "/posts/mullahology-01", "Article");
const mullahologyChapterDocket = elements(mullahologyChapter.html, "aside").find((aside) =>
  /\bclass=["'][^"']*docket/.test(aside.opening)
);
assert.ok(mullahologyChapterDocket, "mullahology chapter must expose its linked docket");
const mullahologyDocketLinks = links(mullahologyChapterDocket.inner);
assert.deepEqual(
  mullahologyDocketLinks.map(({ href, text }) => ({ href, text })),
  [{ href: "/library?section=essay", text: "论 0 4" }],
  "mullahology chapter docket must link its section without duplicating the topic unit"
);
const mullahologyChapterTopics = elements(mullahologyChapter.html, "nav").find((nav) =>
  attribute(nav.opening, "aria-label") === "所属专题"
);
assert.ok(mullahologyChapterTopics, "mullahology chapter must expose its topic unit beside the article lead");
assert.deepEqual(
  links(mullahologyChapterTopics.inner).map(({ href, text }) => ({ href, text })),
  [{ href: "/topics/mullahology", text: "毛拉学 01" }],
  "mullahology chapter lead must link its topic unit"
);

const booksLd = assertMetadata("books index", books, "/books", "CollectionPage");
assert.ok(booksLd.hasPart?.length > 0, "books index JSON-LD must list published books");
const booksMain = elements(books.html, "main")[0];
const booksCatalogHeader = elements(booksMain.inner, "header")[0];
const booksCatalogStats = elements(booksCatalogHeader.inner, "dl")[0];
assert.ok(booksCatalogStats, "books index must render its catalogue status counts");
const bookStatusCounts = sourceBookStatusCounts();
assert.deepEqual(
  elements(booksCatalogStats.inner, "dt").map((term) => visibleText(term.inner)),
  ["连载中", "已完结"],
  "books index status counts must be ordered as serializing then complete"
);
assert.deepEqual(
  elements(booksCatalogStats.inner, "dd").map((value) => visibleText(value.inner)),
  [bookStatusCounts.serializing ?? 0, bookStatusCounts.complete ?? 0]
    .map((count) => String(count).padStart(2, "0")),
  "books index status counts must match the source manifests"
);
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

const shulginLd = assertMetadata(
  "shulgin-dni book detail",
  shulginBook,
  "/books/shulgin-dni",
  "Book"
);
const shulginDocumentPath = `/posts/${encodeURIComponent(shulginManifest.documentSlug)}`;
assertMetadata("shulgin-dni continuous document", shulginDocument, shulginDocumentPath, "Article");
const shulginMain = elements(shulginBook.html, "main")[0];
assert.ok(shulginMain, "shulgin-dni detail must expose its main landmark");
const shulginText = visibleText(shulginMain.inner);
for (const chapter of shulginChapters) {
  assert.ok(
    shulginText.includes(chapter.title),
    `shulgin-dni catalogue must expose ${chapter.number} ${chapter.title}`
  );
}
assert.ok(
  shulginText.includes(`已发布 ${shulginPublishedChapters.length} / 全部 ${shulginChapters.length}`),
  "shulgin-dni detail must report recursively published/all catalogue counts"
);
assert.equal(
  (shulginText.match(/待更新/g) ?? []).length,
  shulginForthcomingChapters.length,
  "every shulgin-dni forthcoming entry must expose a visible pending state"
);
const shulginStatusRows = tags(shulginBook.html, "li")
  .map((tag) => attribute(tag, "data-chapter-status"))
  .filter(Boolean);
assert.equal(
  shulginStatusRows.length,
  shulginChapters.length,
  "shulgin-dni must render every recursive catalogue entry exactly once"
);
assert.equal(
  shulginStatusRows.filter((status) => status === "published").length,
  shulginPublishedChapters.length,
  "shulgin-dni rendered published count must match its source manifest"
);
assert.equal(
  shulginStatusRows.filter((status) => status === "forthcoming").length,
  shulginForthcomingChapters.length,
  "shulgin-dni rendered forthcoming count must match its source manifest"
);

const expectedShulginChapterPaths = shulginPublishedChapters
  .map((chapter) => `/books/shulgin-dni/chapters/${encodeURIComponent(chapter.id)}`)
  .sort();
const linkedShulginChapterPaths = [...new Set(
  links(shulginBook.html)
    .map((link) => link.href)
    .filter((href) => href.startsWith("/books/shulgin-dni/chapters/"))
)].sort();
assert.deepEqual(
  linkedShulginChapterPaths,
  expectedShulginChapterPaths,
  "shulgin-dni must link published entries and keep forthcoming entries inert"
);
const latestShulginPath = `/books/shulgin-dni/chapters/${encodeURIComponent(shulginManifest.latestChapterId)}`;
assert.ok(
  links(shulginBook.html).some((link) =>
    link.href === latestShulginPath && link.text.includes("阅读最新章节")
  ),
  "shulgin-dni latest-reading action must target its published latestChapterId"
);

const shulginParts = shulginLd.hasPart ?? [];
assert.deepEqual(
  shulginParts.map((chapter) => chapter.name),
  shulginPublishedChapters.map((chapter) => chapter.title),
  "shulgin-dni JSON-LD must contain only published entries in recursive catalogue order"
);
assert.deepEqual(
  shulginParts.map((chapter) => normalizedPath(chapter.url)),
  shulginPublishedChapters.map(
    (chapter) => `/books/shulgin-dni/chapters/${encodeURIComponent(chapter.id)}`
  ),
  "shulgin-dni JSON-LD chapter URLs must match the published entry routes"
);
shulginParts.forEach((chapter, index) => {
  assert.equal(chapter.position, index + 1, "shulgin-dni published positions must be one-based");
  assert.match(chapter.url, /^https:\/\//, "shulgin-dni Chapter URLs must be absolute");
});
assert.ok(
  shulginForthcomingChapters.every((chapter) =>
    !shulginParts.some((part) => normalizedPath(part.url).endsWith(`/chapters/${encodeURIComponent(chapter.id)}`))
  ),
  "shulgin-dni forthcoming entries must be absent from Book JSON-LD"
);

const shulginCatalogCard = elements(books.html, "article")
  .find((card) => visibleText(card.outer).includes(shulginManifest.title));
assert.ok(shulginCatalogCard, "books index must expose the shulgin-dni record");
assert.ok(
  visibleText(shulginCatalogCard.outer)
    .includes(`章节 ${shulginPublishedChapters.length} / ${shulginChapters.length}`),
  "books index must report shulgin-dni published/all counts"
);

const shulginHeadingIds = new Set(
  ["h1", "h2", "h3", "h4", "h5", "h6"]
    .flatMap((tagName) => tags(shulginDocument.html, tagName))
    .map((tag) => decodeHtml(attribute(tag, "id") || ""))
    .filter(Boolean)
);
for (const chapter of shulginPublishedChapters) {
  assert.ok(
    shulginHeadingIds.has(chapter.anchor),
    `shulgin-dni published anchor #${chapter.anchor} must exist in the continuous document`
  );
}
const shulginConstitutionalDayHeading = elements(shulginDocument.html, "h2")
  .find((heading) => decodeHtml(attribute(heading.opening, "id") || "") === "立宪首日");
assert.ok(
  shulginConstitutionalDayHeading,
  "shulgin-dni constitutional-day heading must preserve its stable anchor"
);
assert.equal(
  visibleText(shulginConstitutionalDayHeading.outer),
  "“立宪”首日，1905年10月18日",
  "shulgin-dni constitutional-day heading must combine the title and date"
);

const shulginPublishedResponses = await Promise.all(
  shulginPublishedChapters.map((chapter) =>
    fetch(`${base}/books/shulgin-dni/chapters/${encodeURIComponent(chapter.id)}`, { redirect: "manual" })
  )
);
for (const [index, response] of shulginPublishedResponses.entries()) {
  const chapter = shulginPublishedChapters[index];
  assert.equal(response.status, 308, `published shulgin-dni chapter ${chapter.id} must redirect permanently`);
  assert.equal(
    decodeURIComponent(normalizedPath(response.headers.get("location") || "")),
    `/posts/${shulginManifest.documentSlug}#${chapter.anchor}`,
    `published shulgin-dni chapter ${chapter.id} must target its continuous-document anchor`
  );
}
const shulginForthcomingResponses = await Promise.all(
  shulginForthcomingChapters.map((chapter) =>
    fetch(`${base}/books/shulgin-dni/chapters/${encodeURIComponent(chapter.id)}`, { redirect: "manual" })
  )
);
for (const [index, response] of shulginForthcomingResponses.entries()) {
  assert.equal(
    response.status,
    404,
    `forthcoming shulgin-dni chapter ${shulginForthcomingChapters[index].id} must not expose a route`
  );
}

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

const retiredHexoResponses = await Promise.all([
  "/2026/05/12/csa",
  "/2026/05/08/%E5%8E%86%E5%8F%B2%E5%94%AF%E7%89%A9%E4%B8%BB%E4%B9%89%E8%AE%BA%E7%BA%B2",
  "/archives",
  "/categories/%E5%8E%86%E5%8F%B2",
  "/tags/%E5%8E%86%E5%8F%B2",
].map((path) => fetch(`${base}${path}`, { redirect: "manual" })));
for (const response of retiredHexoResponses) {
  assert.equal(response.status, 410, "retired Hexo URLs must return HTTP 410 Gone");
}

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
  "/topics/mullahology",
  "/books",
  "/books/soviet-planned-economy-retrospective",
  "/books/shulgin-dni",
  shulginDocumentPath,
  "/posts/mullahology-00",
  "/posts/mullahology-01",
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
