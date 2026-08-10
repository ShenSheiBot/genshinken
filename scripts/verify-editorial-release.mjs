import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  parseLegacyYamlFrontMatter,
  parseYamlFrontMatter,
} from "../lib/safe-front-matter.mjs";

const base = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");

// C3: 关键期望值从内容源（source/_topics、source/_books）派生，而非写死当前内容快照，
// 使新增文章、调整策展顺序、增补 BibTeX 时，正确实现不再被误判为回归失败。
const TOPIC_ITEM_PREFIX = { post: "/posts/", book: "/books/", media: "/media/" };
function parsePostFrontMatter(source) {
  const normalized = String(source).replace(/^\uFEFF/u, "");
  if (/^---[^\r\n]*\r?(?:\n|$)/u.test(normalized)) {
    return parseYamlFrontMatter(normalized);
  }
  const lines = normalized.split(/\r?\n/u);
  const closingDelimiter = lines.findIndex((line) => /^---\s*$/u.test(line));
  if (closingDelimiter < 0) {
    return parseYamlFrontMatter(normalized, { required: false });
  }
  return parseLegacyYamlFrontMatter(
    lines.slice(0, closingDelimiter).join("\n"),
    lines.slice(closingDelimiter + 1).join("\n")
  );
}

function curatedTopicPaths(slug) {
  const { data } = parseYamlFrontMatter(
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
  if (data.citations?.original) kinds.push("original");
  if (data.citations?.translation) kinds.push("translation");
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
function flattenBookSections(chapters) {
  return (chapters ?? []).flatMap((chapter) => [
    ...(chapter.sections ?? []).map((section) => ({ ...section, chapterId: chapter.id })),
    ...flattenBookSections(chapter.children),
  ]);
}
function postLibraryFacets(slug) {
  const { data } = parsePostFrontMatter(
    fs.readFileSync(path.join(process.cwd(), "source", "_posts", `${slug}.md`), "utf8")
  );
  return {
    section: String(data.section || ""),
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
  };
}
function sourceLibraryRecords() {
  const directory = path.join(process.cwd(), "source", "_posts");
  const posts = fs.readdirSync(directory)
    .filter((file) => file.endsWith(".md"))
    .flatMap((file) => {
      const { data } = parsePostFrontMatter(
        fs.readFileSync(path.join(directory, file), "utf8")
      );
      if (data.draft === true || data.book_document === true) return [];
      const slug = String(data.slug || path.basename(file, ".md"));
      const section = String(data.section || "");
      return [{
        href: section === "multimedia" ? `/media/${slug}` : `/posts/${slug}`,
        section,
        tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
      }];
    });

  const bookDirectory = path.join(process.cwd(), "source", "_books");
  const books = fs.readdirSync(bookDirectory)
    .filter((file) => file.endsWith(".json"))
    .map((file) => {
      const book = JSON.parse(fs.readFileSync(path.join(bookDirectory, file), "utf8"));
      const inherited = postLibraryFacets(book.documentSlug);
      const tags = flattenBookChapters(book.chapters)
        .filter((chapter) => chapter.status === "published")
        .flatMap((chapter) =>
          Array.isArray(chapter.tags) && chapter.tags.length > 0
            ? chapter.tags.map(String)
            : inherited.tags
        );
      return {
        href: `/books/${book.slug}`,
        section: inherited.section,
        tags: [...new Set(tags)],
      };
    });

  return [...posts, ...books];
}
function sourceHomeRecords() {
  const directory = path.join(process.cwd(), "source", "_posts");
  const posts = fs.readdirSync(directory)
    .filter((file) => file.endsWith(".md"))
    .flatMap((file) => {
      const { data } = parsePostFrontMatter(fs.readFileSync(path.join(directory, file), "utf8"));
      if (data.draft === true || data.book_document === true) return [];
      const slug = String(data.slug || path.basename(file, ".md"));
      const section = String(data.section || "");
      return [{
        href: section === "multimedia" ? `/media/${slug}` : `/posts/${slug}`,
        section,
      }];
    });
  const books = fs.readdirSync(path.join(process.cwd(), "source", "_books"))
    .filter((file) => file.endsWith(".json"))
    .map((file) => JSON.parse(fs.readFileSync(path.join(process.cwd(), "source", "_books", file), "utf8")))
    .map((book) => ({ href: `/books/${book.slug}`, section: "translation" }));
  return [...posts, ...books];
}
function sourcePublishedChapterPaths() {
  const directory = path.join(process.cwd(), "source", "_books");
  return fs.readdirSync(directory)
    .filter((file) => file.endsWith(".json"))
    .flatMap((file) => {
      const book = JSON.parse(fs.readFileSync(path.join(directory, file), "utf8"));
      return flattenBookChapters(book.chapters)
        .filter((chapter) => chapter.status === "published")
        .map((chapter) => `/books/${book.slug}/chapters/${encodeURIComponent(chapter.id)}`);
    });
}
const productionOrigin = "https://un-canon.blog";
const prohibitedBrand = "\u53cd\u6b63\u5178";
const incorrectSimplifiedBrand = "西方负典";
const embeddedMediaTag = /<(?:iframe|video|audio|object|embed)\b/i;
const readingChromeSource = fs.readFileSync(
  path.join(process.cwd(), "app", "components", "reading-edition", "ReadingEditionChrome.tsx"),
  "utf8"
);
const readingStylesSource = fs.readFileSync(
  path.join(process.cwd(), "app", "components", "reading-edition", "reading-edition.module.css"),
  "utf8"
);
const readingEditionSource = fs.readFileSync(
  path.join(process.cwd(), "app", "components", "reading-edition", "ReadingEdition.tsx"),
  "utf8"
);
const topBarSource = fs.readFileSync(
  path.join(process.cwd(), "app", "components", "TopBar.tsx"),
  "utf8"
);
const postsSource = fs.readFileSync(path.join(process.cwd(), "lib", "posts.ts"), "utf8");
const globalStylesSource = fs.readFileSync(path.join(process.cwd(), "app", "globals.css"), "utf8");
const bookStylesSource = fs.readFileSync(
  path.join(process.cwd(), "app", "books", "books.module.css"),
  "utf8"
);
const bookChapterPageSource = fs.readFileSync(
  path.join(process.cwd(), "app", "books", "[slug]", "chapters", "[chapter]", "page.tsx"),
  "utf8"
);
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
  readingEditionSource,
  /citationLine|citationCoverActions|CitationCopyButton|引用\s*·/,
  "article cover must not retain citation labels or controls"
);
assert.match(
  readingEditionSource,
  /citationBibtex=\{citationBibtex\}[\s\S]*?citationHref=\{citationHref\}/,
  "article citations must be delegated to the reading chrome"
);
assert.match(
  readingChromeSource,
  /const tocActions[\s\S]*?CitationCopyButton[\s\S]*?下载[\s\S]*?className=\{styles\.toTop\}[^>]*>返回篇首<\/button>/,
  "copy, download, and return-to-start must share the table-of-contents action row"
);
assert.match(
  readingStylesSource,
  /\.tocActions\s*\{[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\);/,
  "the three table-of-contents actions must use equal-width columns"
);
assert.match(
  readingChromeSource,
  /const settingsControl[\s\S]*?className=\{styles\.settingsButton\}[\s\S]*?settingsGlyph[\s\S]*?<i \/><i \/><i \/>/,
  "the shared reading-habits control must retain its three-line glyph"
);
assert.match(
  readingChromeSource,
  /className=\{styles\.runningTools\}[\s\S]*?themeButton[\s\S]*?hanScriptButton[\s\S]*?\{settingsControl\}/,
  "theme, Han-script, and reading-habits controls must use the confirmed order"
);
assert.equal(
  readingChromeSource.match(/className=\{styles\.settingsButton\}/g)?.length,
  1,
  "the reading-habits trigger must have one stable header implementation"
);
assert.match(
  readingChromeSource,
  /const settingsControl = \([\s\S]*?openSheet\("settings", event\.currentTarget\)[\s\S]*?aria-expanded=\{sheet === "settings"\}/,
  "the stable header reading-habits trigger must open the settings drawer and expose its state"
);
assert.match(
  readingChromeSource,
  /<div className=\{styles\.runningTools\}>[\s\S]*?\{settingsControl\}[\s\S]*?<\/div>/,
  "the reading-habits trigger must remain in the running tools while its drawer is open"
);
assert.doesNotMatch(
  readingChromeSource,
  /settingsHasMigratedRef|data-returned-to-header|settingsControl\("sheet"\)|sheet !== "settings" && settingsControl/,
  "the reading-habits trigger must not migrate into or remount around the settings drawer"
);
assert.match(
  readingChromeSource,
  /sheetHeaderActions[\s\S]*?<button[^>]*onClick=\{\(\) => closeSheet\(\)\}[^>]*aria-label=\{?"\u5173\u95ed"\}?/,
  "the settings drawer must provide its own close button"
);
assert.doesNotMatch(
  readingStylesSource,
  /\.sheet\[data-sheet="settings"\][\s\S]{0,160}?animation:\s*none/,
  "the settings drawer must use the shared horizontal slide animation"
);
assert.doesNotMatch(
  readingStylesSource,
  /\.sheetLayer\[data-sheet="settings"\]\s*\{[^}]*top:\s*var\(--reading-header-bottom\)/,
  "the settings drawer must cover the reader header so both header rows share the same top edge"
);
assert.doesNotMatch(
  globalStylesSource,
  /reading-edition-page[^}]*scrollbar-gutter:\s*auto/,
  "reading pages must preserve the scrollbar gutter while a panel locks page scrolling"
);
assert.match(
  readingStylesSource,
  /data-reading-chrome-entry="route"[\s\S]*?themeButton[\s\S]*?reading-theme-shift-left[\s\S]*?hanScriptButton[\s\S]*?runningTools \.settingsButton[\s\S]*?reading-tool-enter/,
  "route entry must shift theme left while revealing Han-script and reading-habits controls together"
);
assert.match(
  topBarSource,
  /!isReadingRoute\(previousPathname\)[\s\S]*?isReadingRoute\(pathname\)[\s\S]*?readingChromeEntry = "route"/,
  "TopBar must use the shared Reader route predicate for route entry"
);
assert.match(
  readingChromeSource,
  /isReadingRoute\(destination\.pathname\)[\s\S]*?readingChromeExit = "route"[\s\S]*?router\.push\(href\)/,
  "reader links to non-Reader routes must wait for the reverse chrome transition"
);
assert.match(
  readingStylesSource,
  /data-reading-chrome-exit="route"[\s\S]*?themeButton[\s\S]*?reading-theme-shift-right[\s\S]*?hanScriptButton[\s\S]*?runningTools \.settingsButton[\s\S]*?reading-tool-exit/,
  "route exit must shift theme right while hiding Han-script and reading-habits controls together"
);
assert.match(
  readingChromeSource,
  /hanTraditional[^]*?>繁<[\s\S]*?hanSimplified[^]*?>简</,
  "the Han-script switch must expose the overlapping 繁/简 glyph"
);
assert.doesNotMatch(
  readingChromeSource,
  /阅读设置/,
  "the reader must use the confirmed 阅读习惯 label"
);
assert.match(
  readingStylesSource,
  /reading-sheet-slide-in[\s\S]*?reading-sheet-slide-out[\s\S]*?reading-sheet-dim-in[\s\S]*?reading-sheet-dim-out/,
  "all reader sheets, including reading habits, must retain horizontal slide keyframes and page dimming"
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
  /export function DocketNumber[\s\S]*?className=\{styles\.docketNumber\}[\s\S]*?Array\.from\(value\)\.map[\s\S]*?data-roll=\{index % 2 === 0 \? "up" : "down"\}[\s\S]*?<DossierCover[\s\S]*?sectionNumber=\{post\.sectionNo\}/,
  "articles must use the shared independently rolling dossier number"
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
  globalStylesSource,
  /\.art-body table\s*\{[^}]*border-top:\s*0;[^}]*border-bottom:\s*0;[^}]*\}[\s\S]*?\.art-body th\s*\{[^}]*border-bottom:\s*1px solid var\(--hair\);[\s\S]*?\.art-body tbody tr \+ tr td\s*\{\s*border-top:\s*1px solid var\(--hair\);\s*\}/,
  "article tables must remain open at the outer edges while retaining internal row rules"
);
assert.match(
  readingChromeSource,
  /function tableColumnCount[\s\S]*?cell\.colSpan[\s\S]*?columnCount >= 3[\s\S]*?data-reference-table-link[\s\S]*?查看文后表格/,
  "reference panes must replace tables with three or more columns by an endnote table link"
);
assert.match(
  readingStylesSource,
  /\[data-reference-columns="2"\][\s\S]*?(?:th|td):last-child[\s\S]*?white-space:\s*nowrap;/,
  "two-column reference tables must reserve an unbroken final column"
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

function structuredDataEntities(html) {
  return structuredData(html).flatMap((value) => value?.["@graph"] ?? [value]);
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

function assertBlogPostingMetadata(label, result, expectedPath) {
  const record = assertMetadata(label, result, expectedPath, "BlogPosting");
  assert.equal(openGraph(result.html, "og:type"), "article", `${label} must retain og:type=article`);
  assert.equal(
    namedMeta(result.html, "rdf:type"),
    "http://schema.org/BlogPosting",
    `${label} must advertise an explicit BlogPosting RDF type for Zotero`
  );
  assert.equal(
    namedMeta(result.html, "z:itemType"),
    "blogPost",
    `${label} must advertise Zotero itemType=blogPost`
  );
  assert.equal(record.isPartOf?.["@type"], "Blog", `${label} must belong to a schema.org Blog`);
  assert.equal(
    record.isPartOf?.["@id"],
    `${productionOrigin}/#blog`,
    `${label} must reference the shared Blog entity`
  );
  assert.equal(record.isPartOf?.name, "西方負典的博客", `${label} must expose the blog title`);
  assert.equal(record.isPartOf?.url, productionOrigin, `${label} must expose the production blog URL`);

  const blog = structuredDataEntities(result.html).find((value) => value?.["@type"] === "Blog");
  assert.ok(blog, `${label} must include the shared Blog JSON-LD entity`);
  assert.equal(blog["@id"], `${productionOrigin}/#blog`, `${label} Blog entity must use the stable @id`);
  assert.equal(blog.name, "西方負典的博客", `${label} Blog entity must use the shared title`);
  return record;
}

const shulginManifest = readBookManifest("shulgin-dni");
const capitalUntamedManifest = readBookManifest("capital-untamed");
const capitalUntamedPublishedChapters = flattenBookChapters(capitalUntamedManifest.chapters)
  .filter((chapter) => chapter.status === "published");
assert.equal(
  capitalUntamedManifest.title,
  "不驯的资本",
  "capital-untamed must use the current translated title"
);
const shulginChapters = flattenBookChapters(shulginManifest.chapters);
const shulginPublishedChapters = shulginChapters.filter((chapter) => chapter.status === "published");
const shulginForthcomingChapters = shulginChapters.filter((chapter) => chapter.status === "forthcoming");
const shulginSections = flattenBookSections(shulginManifest.chapters);
const shulginPublishedSections = shulginSections.filter((section) => section.status === "published");
const shulginForthcomingSections = shulginSections.filter((section) => section.status === "forthcoming");
const shulginDocumentFacets = postLibraryFacets(shulginManifest.documentSlug);
const shulginSourceMarkdown = fs.readFileSync(
  path.join(process.cwd(), "source", "_posts", "shulgin-dni.md"),
  "utf8"
);
const shulginInlinePageBreaks = [
  "006", "007", "017", "018", "019", "023", "028", "029", "031",
  "032", "048", "049", "051", "053", "055", "056", "058",
  "059", "060", "062", "063", "065", "066",
];
for (const pageNumber of shulginInlinePageBreaks) {
  assert.doesNotMatch(
    shulginSourceMarkdown,
    new RegExp(`(?:^|\\n)\\s*<!-- p\\.${pageNumber} -->\\s*(?:\\n|$)`),
    `shulgin-dni p.${pageNumber} marker must remain inline instead of splitting a continued paragraph`
  );
}
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
assert.equal(shulginChapters.length, 8, "shulgin-dni catalogue must contain 8 chapter pages");
assert.equal(shulginPublishedChapters.length, 6, "shulgin-dni current release must publish 6 chapter pages");
assert.equal(shulginForthcomingChapters.length, 2, "shulgin-dni current release must retain 2 forthcoming chapter pages");
assert.equal(shulginSections.length, 8, "shulgin-dni must retain all 8 inline date sections");
assert.equal(shulginPublishedSections.length, 1, "shulgin-dni must publish one inline date section");
assert.equal(shulginForthcomingSections.length, 7, "shulgin-dni must retain seven forthcoming inline date sections");
assert.deepEqual(
  shulginSections.map((section) => section.id),
  [
    "penultimate-1916-11-03",
    "penultimate-1916-11-12",
    "penultimate-1917-02-26",
    "last-1917-02-27",
    "last-1917-02-28",
    "last-1917-03-01",
    "last-1917-03-02",
    "last-1917-03-03",
  ],
  "shulgin-dni inline date sections must preserve their editorial order"
);
assert.deepEqual(
  shulginPublishedChapters.map((chapter) => chapter.id),
  [
    "shulgin-notes",
    "epigraph-and-preface",
    "constitutional-day-one",
    "constitutional-day-two",
    "constitutional-day-three",
    "penultimate-days",
  ],
  "shulgin-dni current release must contain the six published top-level units through chapter 05"
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
for (const [chapterId, sectionCount] of [["penultimate-days", 3], ["last-days", 5]]) {
  const chapter = shulginManifest.chapters.find((entry) => entry.id === chapterId);
  assert.equal(
    chapter?.children?.length ?? 0,
    0,
    `shulgin-dni ${chapterId} date parts must remain subtitles inside one chapter page`
  );
  assert.equal(
    chapter?.sections?.length ?? 0,
    sectionCount,
    `shulgin-dni ${chapterId} must retain its inline date-section plan`
  );
}
assert.ok(
  shulginPublishedChapters.some((chapter) => chapter.id === shulginManifest.latestChapterId),
  "shulgin-dni latestChapterId must identify a published catalogue entry"
);

const { data: mullahologyTopicData } = parseYamlFrontMatter(
  fs.readFileSync(path.join(process.cwd(), "source", "_topics", "mullahology.md"), "utf8")
);
const mullahologyGroups = mullahologyTopicData.groups ?? [];
const mullahologyTopicItems = curatedTopicPaths("mullahology");
const publicLibraryRecords = sourceLibraryRecords();
const publicHomeRecords = sourceHomeRecords();
const publicChapterPaths = sourcePublishedChapterPaths();
const publicBookPaths = publicHomeRecords
  .map((record) => record.href)
  .filter((href) => /^\/books\/[^/]+$/u.test(href));
assert.equal(mullahologyTopicData.title, "毛拉学", "mullahology topic title must remain stable");
assert.deepEqual(
  mullahologyGroups.map((group) => String(group.number).padStart(2, "0")),
  ["00", "01"],
  "mullahology must retain its explicit preface and chapter unit numbers"
);
assert.deepEqual(
  mullahologyTopicItems,
  [
    "/posts/mullahology-00",
    "/posts/mullahology-01",
    "/posts/mullahology-02",
    "/posts/mullahology-03",
    "/posts/mullahology-04",
    "/posts/mullahology-05",
    "/posts/mullahology-06",
    "/posts/mullahology-07",
    "/posts/mullahology-08",
    "/posts/mullahology-09",
    "/posts/mullahology-10",
    "/posts/mullahology-mobilization",
    "/posts/mullahology-urbanization",
    "/posts/mullahology-bazaar-merchants",
  ],
  "mullahology must retain all published source units in authored order"
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
  mullahologyChapterTwo,
  mullahologyChapterThree,
  mullahologyChapterFour,
  books,
  book,
  shulginBook,
  shulginChapter,
  fangLibrary,
  missing,
  sitemap,
] = await Promise.all([
  page("/"),
  page("/posts/lih-lenin-disputed"),
  page("/posts/bozhong-zhi-yao"),
  page("/media/csa"),
  page("/library"),
  page("/library?contributor=wang-yu&role=translator"),
  page("/library?contributor=not-a-contributor&role=translator"),
  page("/about"),
  page("/topics"),
  page("/topics/soviet-union-and-bretton-woods"),
  page("/topics/mullahology"),
  page("/posts/mullahology-00"),
  page("/posts/mullahology-01"),
  page("/posts/mullahology-02"),
  page("/posts/mullahology-03"),
  page("/posts/mullahology-04"),
  page("/books"),
  page("/books/soviet-planned-economy-retrospective"),
  page("/books/shulgin-dni"),
  page("/books/shulgin-dni/chapters/constitutional-day-one"),
  page("/library?contributor=fang-cao"),
  page("/does-not-exist"),
  page("/sitemap.xml"),
]);

const capitalUntamedChapterPages = await Promise.all(
  capitalUntamedPublishedChapters.map((chapter) =>
    page(`/books/capital-untamed/chapters/${encodeURIComponent(chapter.id)}`)
  )
);
for (const [index, result] of capitalUntamedChapterPages.entries()) {
  const chapter = capitalUntamedPublishedChapters[index];
  assert.equal(result.response.status, 200, `capital-untamed chapter ${chapter.id} must render`);
  assert.doesNotMatch(
    result.html,
    /\[\^[^\r\n]+?\]/u,
    `capital-untamed chapter ${chapter.id} must not expose raw footnote markers`
  );
}

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
  mullahologyChapterTwo,
  mullahologyChapterThree,
  books,
    book,
    shulginBook,
    shulginChapter,
    fangLibrary,
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
const homepageCount = elements(home.html, "span").find((span) =>
  (attribute(span.opening, "class") ?? "").includes("manifestoNumber")
);
assert.ok(homepageCount, "homepage must expose its public-content count");
assert.equal(
  visibleText(homepageCount.inner),
  String(publicHomeRecords.length).padStart(2, "0"),
  "homepage count must collapse each serial into one book recommendation"
);
assert.ok(
  publicBookPaths.some((pathName) => links(home.html).some((link) => link.href === pathName)),
  "homepage recommendations must link serialized books to their catalogue pages"
);
assert.ok(
  publicBookPaths.some((pathName) => links(latestUpdates.inner).some((link) => link.href === pathName)),
  "latest updates must collapse a serialized book into one catalogue link"
);
assert.ok(
  publicChapterPaths.every((pathName) => !links(home.html).some((link) => link.href === pathName)),
  "homepage recommendation surfaces must not expose individual chapter cards"
);
assert.doesNotMatch(home.html, /href=["']\/posts\/(?:shulgin-dni|lih-bread-and-authority-in-russia|olsevich-gregory-soviet-planned-economy-retrospective)["']/);
// 不再钉住某一具体译文标题（会随更新老化出最新六篇而误红）；每张最新更新卡片的
// 署名链接结构由上面的通用循环（296-308）覆盖，此处不再做基于具体内容的断言。
assert.doesNotMatch(home.html, /href=["']\/search(?:[?"'])/, "new navigation must not emit /search links");
assert.doesNotMatch(home.html, /motion-prototype-switcher|ub_motion_prototype|LOCAL_MOTION_PROTOTYPE/);

// /library 静态化后，任何查询串变体都命中同一份预渲染文档（canonical
// /library），无效 facet 由客户端 router.replace 规范化——服务端不再 307。
assert.equal(
  invalidLibrary.response.status,
  200,
  "library filter variants must all resolve to the prerendered document"
);
assert.equal(
  normalizedPath(canonical(invalidLibrary.html) || ""),
  "/library",
  "library filter variants must stay canonical to /library"
);
assert.match(
  invalidLibrary.html,
  /id="library-prefilter-script"/,
  "the library document must ship the pre-paint prefilter bootstrap"
);
assert.doesNotMatch(
  invalidLibrary.response.headers.get("cache-control") || "",
  /no-store/,
  "library must be served as cacheable prerendered content, not per-request SSR"
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
const bookRecommendation = editorialCards.find((card) =>
  links(card.outer).some((link) => publicBookPaths.includes(link.href))
);
assert.ok(bookRecommendation, "homepage wall must expose a serialized-book recommendation");
assert.ok(
  elements(bookRecommendation.outer, "h2").some((heading) => visibleText(heading.inner).length > 0),
  "serialized-book recommendations must retain their book title"
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
  /(?:^|[\s·：:])(?:原作者|译者)(?=$|[\s·：:])/,
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

const articleLd = assertMetadata(
  "article",
  article,
  "/posts/lih-lenin-disputed",
  "ScholarlyArticle"
);
assert.equal(openGraph(article.html, "og:type"), "article");
assert.equal(namedMeta(article.html, "z:itemType"), "journalArticle");
assert.equal(namedMeta(article.html, "rdf:type"), "http://schema.org/ScholarlyArticle");
assert.equal(namedMeta(article.html, "citation_journal_title"), "Historical Materialism");
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
const libraryRecords = publicLibraryRecords;
const articleFacetLandings = await Promise.all(
  articleFacetTargets.map(({ href }) => page(href))
);
// /library 静态化：筛选结果不再由服务端渲染，而由行上的 data-lib-* 属性
// 驱动（预过滤脚本 + 客户端筛选共用）。这里从内容源派生期望（C3），再
// 验证静态文档中每行属性编码出与旧服务端过滤完全相同的集合。
function libraryRowRecords(html) {
  return elements(html, "li")
    .filter((row) => /\bdata-lib-row\b/.test(row.opening))
    .map((row) => ({
      href: links(row.inner)
        .map((link) => link.href)
        .find((href) => /^\/(?:posts|media)\/|^\/books\/[^/]+$/.test(href)) ?? "",
      section: decodeHtml(attribute(row.opening, "data-lib-section") || ""),
      tags: decodeHtml(attribute(row.opening, "data-lib-tags") || ""),
      contributors: decodeHtml(attribute(row.opening, "data-lib-contributors") || ""),
      credits: decodeHtml(attribute(row.opening, "data-lib-credits") || ""),
    }));
}
for (const [index, landing] of articleFacetLandings.entries()) {
  const target = articleFacetTargets[index];
  assert.equal(landing.response.status, 200, `${target.label} library filter must resolve`);
  assert.equal(normalizedPath(canonical(landing.html) || ""), "/library");
  assert.match(
    landing.html,
    /id="library-prefilter-script"/,
    `${target.label} library filter must ship the pre-paint prefilter`
  );
  const activeFacet = links(landing.html).find((link) => link.href === target.href);
  assert.ok(activeFacet, `${target.label} library filter must remain addressable`);
  const params = new URL(target.href, productionOrigin).searchParams;
  const expectedResults = libraryRecords
    .filter((record) =>
      (!params.get("section") || record.section === params.get("section"))
      && (!params.get("tag") || record.tags.includes(params.get("tag")))
    )
    .map((record) => record.href)
    .sort();
  const actualResults = libraryRowRecords(landing.html)
    .filter((row) =>
      (!params.get("section") || row.section.includes(`|${params.get("section")}|`))
      && (!params.get("tag") || row.tags.includes(`|${params.get("tag")}|`))
    )
    .map((row) => row.href)
    .sort();
  assert.deepEqual(
    actualResults,
    expectedResults,
    `${target.label} library rows must encode exactly the records the filter selects`
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
assert.match(library.html, /内容索引/);
assert.ok(
  publicChapterPaths.every((pathName) => !links(library.html).some((link) => link.href === pathName)),
  "library must collapse all chapter presentations into one serialized-book entry"
);
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
assert.match(visibleText(rolePanel.outer), /校对/);
assert.doesNotMatch(visibleText(rolePanel.outer), /编辑/);
// 筛选语义由行属性承载（客户端过滤）：wang-yu 的译者行必须带
// translator:wang-yu 组合凭据；不相关的行不得携带。fang-cao 的两条
// 记录靠 data-lib-contributors 命中。文档本身包含全量行。
const libraryRows = libraryRowRecords(library.html);
function libraryRowByTitle(title) {
  const row = elements(library.html, "li")
    .filter((candidate) => /\bdata-lib-row\b/.test(candidate.opening))
    .find((candidate) => visibleText(candidate.inner).includes(title));
  assert.ok(row, `library must list ${title}`);
  return row;
}
assert.match(
  attribute(libraryRowByTitle("列宁之争").opening, "data-lib-credits") || "",
  /\|translator:wang-yu\|/,
  "列宁之争 must expose its translator credit for client-side filtering"
);
assert.doesNotMatch(
  attribute(libraryRowByTitle("学龄前的歌利亚").opening, "data-lib-credits") || "",
  /translator:wang-yu/,
  "unrelated records must not match the wang-yu translator filter"
);
for (const title of ["一份关于克苏鲁的调查报告", "斩断伊斯兰这片绿色的叶子"]) {
  assert.match(
    attribute(libraryRowByTitle(title).opening, "data-lib-contributors") || "",
    /\|fang-cao\|/,
    `${title} must remain addressable through the fang-cao contributor filter`
  );
}
assert.ok(
  libraryRows.every((row) => row.href),
  "every library row must link its record"
);

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
assert.match(mullahologyText, /叶公好龙/);
assert.match(mullahologyText, /作茧自缚/);
assert.match(mullahologyText, /图德党/);
assert.deepEqual(
  (mullahologyLd.hasPart ?? []).map((item) => normalizedPath(item.url)),
  mullahologyTopicItems,
  "mullahology JSON-LD must retain all source units in authored order"
);
assertBlogPostingMetadata("mullahology preface", mullahologyPreface, "/posts/mullahology-00");
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
assertBlogPostingMetadata("mullahology chapter one", mullahologyChapter, "/posts/mullahology-01");
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
assertBlogPostingMetadata("mullahology chapter two", mullahologyChapterTwo, "/posts/mullahology-02");
const mullahologyChapterTwoTopics = elements(mullahologyChapterTwo.html, "nav").find((nav) =>
  attribute(nav.opening, "aria-label") === "所属专题"
);
assert.ok(
  mullahologyChapterTwoTopics,
  "mullahology chapter two must expose its topic unit beside the article lead"
);
assert.deepEqual(
  links(mullahologyChapterTwoTopics.inner).map(({ href, text }) => ({ href, text })),
  [{ href: "/topics/mullahology", text: "毛拉学 02" }],
  "mullahology chapter two lead must link its topic unit"
);
assertBlogPostingMetadata("mullahology chapter three", mullahologyChapterThree, "/posts/mullahology-03");
const mullahologyChapterThreeTopics = elements(mullahologyChapterThree.html, "nav").find((nav) =>
  attribute(nav.opening, "aria-label") === "所属专题"
);
assert.ok(
  mullahologyChapterThreeTopics,
  "mullahology chapter three must expose its topic unit beside the article lead"
);
assert.deepEqual(
  links(mullahologyChapterThreeTopics.inner).map(({ href, text }) => ({ href, text })),
  [{ href: "/topics/mullahology", text: "毛拉学 03" }],
  "mullahology chapter three lead must link its topic unit"
);
assertBlogPostingMetadata("mullahology chapter four", mullahologyChapterFour, "/posts/mullahology-04");
const mullahologyChapterFourBody = elements(mullahologyChapterFour.html, "article").find((article) =>
  /\bclass=["'][^"']*\bart-body\b/u.test(article.opening)
);
assert.ok(mullahologyChapterFourBody, "mullahology chapter four must render its prose body");
assert.equal(
  elements(mullahologyChapterFourBody.inner, "h2").length,
  0,
  "mullahology chapter four must preserve the heading-free prose structure of chapters one through three"
);
assert.equal(
  elements(mullahologyChapterFourBody.inner, "p").length,
  27,
  "mullahology chapter four must retain the compressed editorial paragraph structure"
);
const mullahologyChapterFourTopics = elements(mullahologyChapterFour.html, "nav").find((nav) =>
  attribute(nav.opening, "aria-label") === "所属专题"
);
assert.ok(
  mullahologyChapterFourTopics,
  "mullahology chapter four must expose its topic unit beside the article lead"
);
assert.deepEqual(
  links(mullahologyChapterFourTopics.inner).map(({ href, text }) => ({ href, text })),
  [{ href: "/topics/mullahology", text: "毛拉学 04" }],
  "mullahology chapter four lead must link its topic unit"
);

const booksLd = assertMetadata("books index", books, "/books", "CollectionPage");
assert.ok(booksLd.hasPart?.length > 0, "books index JSON-LD must list published books");
const booksMain = elements(books.html, "main")[0];
const booksCatalogHeader = elements(booksMain.inner, "header")[0];
const booksCatalogStats = elements(booksCatalogHeader.inner, "dl")[0];
assert.ok(booksCatalogStats, "books index must render its catalogue status counts");
const booksCatalogue = elements(booksMain.inner, "section").find(
  (section) => attribute(section.opening, "aria-labelledby") === "books-catalogue-heading"
);
assert.ok(booksCatalogue, "books index must render its catalogue");
const bookStatusOrder = { serializing: 0, paused: 1, complete: 2 };
const catalogueBookStatuses = elements(booksCatalogue.inner, "article").map((article) =>
  attribute(article.opening, "data-book-status")
);
assert.ok(catalogueBookStatuses.length > 0, "books index must render its book cards");
assert.ok(
  catalogueBookStatuses.every((status) => Object.hasOwn(bookStatusOrder, status)),
  "books index book cards must expose a valid status"
);
assert.deepEqual(
  catalogueBookStatuses,
  [...catalogueBookStatuses].sort((a, b) => bookStatusOrder[a] - bookStatusOrder[b]),
  "books index must order serializing books before paused and complete books"
);
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
assert.equal(namedMeta(book.html, "z:itemType"), "book", "book detail must expose Zotero itemType=book");
assert.equal(
  namedMeta(book.html, "citation_public_url"),
  `${productionOrigin}/books/soviet-planned-economy-retrospective`,
  "book BibTeX and embedded metadata must cite the /books/ URL"
);
assert.match(book.html, /从第一章阅读/);
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
const shulginChapterPath = "/books/shulgin-dni/chapters/constitutional-day-one";
const shulginChapterLd = assertMetadata(
  "shulgin-dni chapter",
  shulginChapter,
  shulginChapterPath,
  "Chapter"
);
assert.equal(
  namedMeta(shulginChapter.html, "z:itemType"),
  "bookSection",
  "shulgin-dni chapter must expose Zotero itemType=bookSection"
);
assert.equal(
  namedMeta(shulginChapter.html, "citation_public_url"),
  `${productionOrigin}${shulginChapterPath}`,
  "shulgin-dni chapter citation URL must point to its canonical page"
);
assert.equal(
  normalizedPath(shulginChapterLd.isPartOf?.url ?? ""),
  "/books/shulgin-dni",
  "shulgin-dni chapter JSON-LD must belong to its book record"
);
assert.match(shulginChapter.html, /本章完/);
assert.match(
  shulginChapter.html,
  /aria-label=["']本章完["']/,
  "book chapter end markers must expose the same visible and accessible label"
);
assert.match(shulginChapter.html, /aria-label=["']章节导航["']/);
const shulginChapterCover = elements(shulginChapter.html, "header")
  .find((element) => attribute(element.opening, "id") === "reading-cover");
assert.ok(shulginChapterCover, "book chapters must expose a reading cover");
const shulginChapterCoverText = visibleText(shulginChapterCover.outer);
const shulginTranslationDigits = /译\s*(\d)\s*(\d)/u.exec(shulginChapterCoverText);
const shulginTranslationNumber = shulginTranslationDigits
  ? `${shulginTranslationDigits[1]}${shulginTranslationDigits[2]}`
  : undefined;
const shulginDocketNumber = /第\s*(\d{2})\s*号/u.exec(shulginChapterCoverText)?.[1];
assert.ok(shulginTranslationNumber, "book chapters must receive their own translation-section number");
const shulginLibraryRow = elements(library.html, "li").find((row) =>
  links(row.outer).some((link) => link.href === "/books/shulgin-dni")
);
assert.ok(shulginLibraryRow, "a serialized book must appear once in the library sequence");
const shulginLibraryNumber = elements(shulginLibraryRow.inner, "b")
  .map((element) => visibleText(element.inner))
  .find((value) => /^\d+$/u.test(value));
assert.equal(
  shulginDocketNumber,
  shulginLibraryNumber,
  "every chapter must inherit the aggregated book issue shown in the library"
);
assert.ok(
  shulginLibraryRow && new RegExp(`译\\s*${shulginTranslationNumber}`, "u")
    .test(visibleText(shulginLibraryRow.outer)),
  "every chapter must inherit the aggregated book translation-section number"
);
assert.doesNotMatch(
  shulginChapterCoverText,
  /译\s*\d\s*\d\s*\./u,
  "book chapter identifiers must not append the manifest chapter number"
);
assert.match(
  readingEditionSource,
  /export function DocketNumber[\s\S]*?Array\.from\(value\)\.map[\s\S]*?className=\{styles\.docketDigit\}[\s\S]*?data-roll=\{index % 2 === 0 \? "up" : "down"\}/,
  "the shared dossier docket must retain the two-slot rolling digit animation"
);
assert.match(
  bookChapterPageSource,
  /<ReadingDossierRoot[\s\S]*?<DossierCover[\s\S]*?sectionNumber=\{chapterCode\}[\s\S]*?<DossierReading/,
  "book chapters must compose the shared dossier root, cover, and reading grid"
);
assert.doesNotMatch(
  bookStylesSource,
  /chapterDocketNumber/,
  "book chapters must not override the shared dossier number artwork"
);
assert.match(
  shulginChapterCoverText,
  /连载\s*往日：忆一九〇五年立宪与一九一七年二月革命\s*第二章/u,
  "book chapter covers must place the serial title and Chinese chapter unit above the article title"
);
assert.match(
  bookChapterPageSource,
  /coverLeadMetaWithTopics[\s\S]*?chapterCoverKicker[\s\S]*?chapterSeriesLine[\s\S]*?<\/div>\s*<h1/,
  "book chapter metadata and serial eyebrow must share the standard lead-meta spacing group"
);
const shulginCatalogueReturn = links(shulginChapterCover.inner)
  .find((link) => link.href === "/books/shulgin-dni");
assert.ok(shulginCatalogueReturn, "book chapter covers must link back to their catalogue");
assert.equal(
  shulginCatalogueReturn.text,
  "← 返回目录",
  "the chapter-cover catalogue action must not repeat the book title"
);
const shulginSeriesLink = links(shulginChapterCover.inner)
  .find((link) => link.href === "/books/shulgin-dni" && link.text !== "← 返回目录");
assert.equal(
  shulginSeriesLink?.text,
  "往日：忆一九〇五年立宪与一九一七年二月革命",
  "the complete serial title and subtitle must share one catalogue link"
);
const currentShulginChapter = shulginPublishedChapters
  .find((chapter) => chapter.id === "constitutional-day-one");
const expectedShulginChapterTags = Array.isArray(currentShulginChapter?.tags)
  && currentShulginChapter.tags.length > 0
  ? currentShulginChapter.tags.map(String)
  : shulginDocumentFacets.tags;
const shulginChapterTagLine = elements(shulginChapter.html, "nav").find((element) =>
  /\bclass=["'][^"']*tagLine/.test(element.opening)
);
assert.ok(shulginChapterTagLine, "book chapter covers must expose their tag list");
assert.deepEqual(
  links(shulginChapterTagLine.inner).map(({ href, text }) => ({ href, text })),
  expectedShulginChapterTags.map((tag) => ({
    href: `/library?tag=${encodeURIComponent(tag)}`,
    text: `#${tag}`,
  })),
  "chapter tags must use a chapter override when present and otherwise inherit the book document tags"
);
assert.match(
  bookChapterPageSource,
  /bookToc=\{readingBookToc\(book, documents, chapter\.id\)\}/,
  "book chapter pages must pass the recursive full-book catalogue to the reader"
);
assert.match(
  readingChromeSource,
  /"目录与全书目录切换"[\s\S]*?hasFigureIndex\s*&&[\s\S]*?aria-label="图表"[\s\S]*?aria-label="全书目录"/,
  "book chapters must expose the full-book table-of-contents tab"
);
assert.match(
  readingChromeSource,
  /querySelectorAll<HTMLElement>\("figure\.article-table, img"\)[\s\S]*?kind === "table"[\s\S]*?`表\$\{item\.index\}`/,
  "the reader visual index must include semantic tables as well as images"
);
assert.match(
  readingChromeSource,
  /item\.current\s*\?[\s\S]*?aria-current="page"[\s\S]*?:\s*item\.href\s*\?[\s\S]*?<Link[\s\S]*?:[\s\S]*?aria-disabled="true"/,
  "the full-book catalogue must distinguish current, published, and forthcoming chapters"
);
const shulginChapterNavigation = elements(shulginChapter.html, "nav")
  .find((element) => attribute(element.opening, "aria-label") === "章节导航");
assert.ok(shulginChapterNavigation, "book chapters must expose bottom chapter navigation");
const shulginChapterNavigationLinks = links(shulginChapterNavigation.inner);
assert.equal(
  shulginChapterNavigationLinks.length,
  3,
  "a middle chapter must expose previous, catalogue, and next actions"
);
assert.ok(
  shulginChapterNavigationLinks.every((link) =>
    /<span\b[^>]*>[\s\S]*?<\/span>[\s\S]*?<strong\b[^>]*>[\s\S]*?<\/strong>/i.test(link.inner)
  ),
  "all three bottom chapter actions must share the same two-line structure"
);
const chapterReaderCoverRule = bookStylesSource.match(/\.chapterReaderCover\s*\{([^}]*)\}/)?.[1] ?? "";
const chapterReaderNavRule = bookStylesSource.match(/\.chapterReaderNav\s*\{([^}]*)\}/)?.[1] ?? "";
assert.ok(chapterReaderCoverRule, "book chapter cover styles must exist");
assert.ok(chapterReaderNavRule, "book chapter navigation styles must exist");
assert.doesNotMatch(
  chapterReaderCoverRule,
  /border-bottom\s*:/,
  "book chapter covers must not draw a rule between the cover and body"
);
assert.doesNotMatch(
  chapterReaderNavRule,
  /border-top\s*:/,
  "book chapter navigation must not draw a rule above the three actions"
);
assert.match(
  readingChromeSource,
  /className=\{styles\.bookTocDisclosure\}[\s\S]*?toggleBookChapter\(item\.id\)[\s\S]*?item\.sections\.map[\s\S]*?section\.href/,
  "every full-book chapter with headings must expose a disclosure and cross-page section links"
);
assert.doesNotMatch(
  readingChromeSource,
  /bookTocHome/,
  "the full-book catalogue must not repeat the removed book-home row"
);
const bookTocSectionsRule = readingStylesSource.match(/\.bookTocSections\s*\{([^}]*)\}/)?.[1] ?? "";
assert.ok(bookTocSectionsRule, "full-book section styles must exist");
assert.doesNotMatch(
  bookTocSectionsRule,
  /border-left\s*:/,
  "expanded full-book sections must not draw the removed red vertical rule"
);
const bookTocRowRule = readingStylesSource.match(/\.bookTocRow\s*\{([^}]*)\}/)?.[1] ?? "";
const bookTocNumberRule = readingStylesSource.match(/\.bookTocRow span,\s*\.bookTocRow small\s*\{([^}]*)\}/)?.[1] ?? "";
const bookTocSectionLinkRule = readingStylesSource.match(/\.bookTocSectionLink\s*\{([^}]*)\}/)?.[1] ?? "";
const bookTocSectionMarkerRule = readingStylesSource.match(/\.bookTocSectionLink span\s*\{([^}]*)\}/)?.[1] ?? "";
assert.match(
  bookTocRowRule,
  /grid-template-columns:\s*minmax\(16px,\s*max-content\) minmax\(0,\s*1fr\) auto;[\s\S]*?gap:\s*3px;/,
  "full-book chapter rows must keep a compact number grid that expands only for compound labels"
);
assert.match(
  bookTocNumberRule,
  /white-space:\s*nowrap;/,
  "full-book compound chapter labels must stay on one line"
);
assert.match(
  bookTocSectionLinkRule,
  /grid-template-columns:\s*16px minmax\(0,\s*1fr\);[\s\S]*?gap:\s*3px;/,
  "full-book section rows must align with the chapter number grid"
);
assert.match(
  bookTocSectionMarkerRule,
  /text-align:\s*left;/,
  "full-book section markers must align to the number-column start"
);
assert.match(
  readingStylesSource,
  /\.bookTocSectionLink\[data-level="3"\] b\s*\{[^}]*padding-left:\s*6px;[^}]*\}[\s\S]*?\.bookTocSectionLink\[data-level="4"\] b\s*\{[^}]*padding-left:\s*12px;/,
  "full-book section titles must preserve deeper heading hierarchy without moving their markers"
);

const shulginChapterPages = await Promise.all(
  shulginPublishedChapters.map((chapter) =>
    page(`/books/shulgin-dni/chapters/${encodeURIComponent(chapter.id)}`)
  )
);
const shulginRenderedParagraphs = shulginChapterPages.flatMap((result) => elements(result.html, "p"));
for (const pageNumber of shulginInlinePageBreaks) {
  assert.ok(
    shulginRenderedParagraphs.some((paragraph) =>
      paragraph.inner.includes(`<!-- p.${pageNumber} -->`)
    ),
    `shulgin-dni p.${pageNumber} marker must render inside its continued paragraph`
  );
}
assert.ok(
  shulginRenderedParagraphs.some((paragraph) =>
    /这双眼睛\s*变得惊人/.test(visibleText(paragraph.inner))
  ),
  "shulgin-dni p.056 must keep the continued sentence inside one rendered paragraph"
);
const shulginMain = elements(shulginBook.html, "main")[0];
assert.ok(shulginMain, "shulgin-dni detail must expose its main landmark");
const shulginText = visibleText(shulginMain.inner);
for (const chapter of shulginChapters) {
  assert.ok(
    shulginText.includes(chapter.title),
    `shulgin-dni catalogue must expose ${chapter.number} ${chapter.title}`
  );
}
for (const section of shulginSections) {
  assert.ok(
    shulginText.includes(section.title),
    `shulgin-dni catalogue must expose inline section ${section.number} ${section.title}`
  );
}
assert.ok(
  shulginText.includes(`已发布 ${shulginPublishedChapters.length} / 全部 ${shulginChapters.length}`),
  "shulgin-dni detail must report recursively published/all catalogue counts"
);
assert.equal(
  (shulginText.match(/待更新/g) ?? []).length,
  shulginForthcomingChapters.length + shulginForthcomingSections.length,
  "every shulgin-dni forthcoming chapter and inline section must expose a visible pending state"
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
const shulginSectionStatusRows = tags(shulginBook.html, "li")
  .map((tag) => attribute(tag, "data-section-status"))
  .filter(Boolean);
assert.equal(
  shulginSectionStatusRows.length,
  shulginSections.length,
  "shulgin-dni must render every inline date section exactly once"
);
assert.equal(
  shulginSectionStatusRows.filter((status) => status === "published").length,
  shulginPublishedSections.length,
  "shulgin-dni rendered published sections must match its source manifest"
);
assert.equal(
  shulginSectionStatusRows.filter((status) => status === "forthcoming").length,
  shulginForthcomingSections.length,
  "shulgin-dni rendered forthcoming sections must match its source manifest"
);

const expectedShulginChapterPaths = shulginPublishedChapters
  .map((chapter) => `/books/shulgin-dni/chapters/${encodeURIComponent(chapter.id)}`)
  .sort();
const linkedShulginChapterPaths = [...new Set(
  links(shulginBook.html)
    .map((link) => link.href)
    .filter((href) => href.startsWith("/books/shulgin-dni/chapters/") && !href.includes("#"))
)].sort();
assert.deepEqual(
  linkedShulginChapterPaths,
  expectedShulginChapterPaths,
  "shulgin-dni must link published entries and keep forthcoming entries inert"
);
assert.ok(
  links(shulginBook.html).some((link) =>
    link.href === "/books/shulgin-dni/chapters/penultimate-days#1916%E5%B9%B411%E6%9C%883%E6%97%A5"
  ),
  "shulgin-dni detail must link a published inline section to its parent chapter anchor"
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

for (const [index, result] of shulginChapterPages.entries()) {
  const chapter = shulginPublishedChapters[index];
  const expectedPath = `/books/shulgin-dni/chapters/${encodeURIComponent(chapter.id)}`;
  assert.equal(result.response.status, 200, `published shulgin-dni chapter ${chapter.id} must render`);
  assert.equal(
    normalizedPath(canonical(result.html)),
    expectedPath,
    `published shulgin-dni chapter ${chapter.id} must be canonical to itself`
  );
  assert.match(result.html, /reading-edition-page/);
  assert.ok(
    visibleText(result.html).includes(chapter.title),
    `published shulgin-dni chapter ${chapter.id} must expose its title`
  );
}

const shulginPenultimateChapter = shulginChapterPages[
  shulginPublishedChapters.findIndex((chapter) => chapter.id === "penultimate-days")
];
assert.doesNotMatch(shulginPenultimateChapter.html, /本节目录/);
assert.match(shulginPenultimateChapter.html, /四下里静极了/);
assert.match(
  shulginPenultimateChapter.html,
  /<h3\b[^>]*id=["']1916年11月3日["'][^>]*>\s*1916年11月3日\s*<\/h3>/u,
  "shared-title date parts must render as subtitles inside their parent chapter"
);
assert.ok(
  shulginPenultimateChapter.html.includes(
    "/books/shulgin-dni/chapters/penultimate-days#1916%E5%B9%B411%E6%9C%883%E6%97%A5"
  ),
  "full-book navigation must link a chapter subtitle to the parent page anchor"
);
for (const section of shulginForthcomingSections) {
  assert.ok(
    visibleText(shulginPenultimateChapter.html).includes(section.title),
    `full-book navigation must retain forthcoming inline section ${section.id}`
  );
}
const shulginPenultimateNavigation = elements(shulginPenultimateChapter.html, "nav")
  .find((element) => /aria-label=["']章节导航["']/u.test(element.opening));
assert.ok(shulginPenultimateNavigation, "the latest shulgin chapter must expose chapter navigation");
assert.deepEqual(
  links(shulginPenultimateNavigation.inner).map((link) => link.href),
  [
    "/books/shulgin-dni/chapters/constitutional-day-three",
    "/books/shulgin-dni",
  ],
  "inline sections must not occupy previous/next chapter navigation positions"
);
const shulginSectionRouteResponses = await Promise.all(
  shulginSections.flatMap((section) => [
    fetch(`${base}/books/shulgin-dni/chapters/${encodeURIComponent(section.id)}`, { redirect: "manual" }),
    fetch(`${base}/books/shulgin-dni/chapters/${encodeURIComponent(section.id)}/cite.bib`, { redirect: "manual" }),
  ])
);
for (const [index, response] of shulginSectionRouteResponses.entries()) {
  const section = shulginSections[Math.floor(index / 2)];
  const surface = index % 2 === 0 ? "chapter" : "citation";
  assert.equal(
    response.status,
    404,
    `inline section ${section.id} must not expose a standalone ${surface} route`
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

const [legacySearch, legacyFilteredSearch, mediaRedirect, chapterPage] = await Promise.all([
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
assert.equal(chapterPage.status, 200, "published chapter routes must render independent pages");

const retiredBookDocuments = await Promise.all([
  "/posts/shulgin-dni",
  "/posts/lih-bread-and-authority-in-russia",
  "/posts/olsevich-gregory-soviet-planned-economy-retrospective",
].map((path) => fetch(`${base}${path}`, { redirect: "manual" })));
for (const response of retiredBookDocuments) {
  assert.equal(response.status, 404, "book Markdown sources must not expose legacy /posts/ pages");
}

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
  "/posts/mullahology-00",
  "/posts/mullahology-01",
  "/posts/mullahology-02",
  "/posts/mullahology-03",
  "/posts/mullahology-04",
  "/posts/lih-lenin-disputed",
  "/media/csa",
]) {
  assert.ok(sitemapPaths.includes(requiredPath), `sitemap must contain ${requiredPath}`);
}
assert.ok(!sitemapPaths.includes("/search"), "sitemap must not contain the legacy redirect route");
for (const chapterPath of expectedShulginChapterPaths) {
  assert.ok(sitemapPaths.includes(chapterPath), `sitemap must contain chapter canonical ${chapterPath}`);
}
for (const retiredPath of [
  "/posts/shulgin-dni",
  "/posts/lih-bread-and-authority-in-russia",
  "/posts/olsevich-gregory-soviet-planned-economy-retrospective",
]) {
  assert.ok(!sitemapPaths.includes(retiredPath), `sitemap must omit book Markdown source ${retiredPath}`);
}
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
