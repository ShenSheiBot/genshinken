import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { renderMarkdown } from "../lib/markdown.ts";

function markdownNodeText(node) {
  if (typeof node.value === "string") return node.value;
  return (node.children ?? []).map(markdownNodeText).join("");
}

function isApparatusBoundary(node, depth) {
  if (node.type === "heading") return node.depth <= depth;
  if (node.type !== "html") return false;
  const match = (node.value ?? "").match(/^\s*<h([1-6])\b/iu);
  return Boolean(match && Number(match[1]) <= depth);
}

function isInvisibleApparatusNode(node) {
  return node.type === "footnoteDefinition"
    || node.type === "thematicBreak"
    || (node.type === "html" && /^\s*<!--/u.test(node.value ?? ""));
}

/**
 * A GFM definition is moved into the generated footnote section. A source
 * heading whose whole section consists only of those definitions therefore
 * becomes an empty article heading. Iterate over a virtual child list so a
 * stack such as “译注 → 附录 → definitions” reports both detached headings.
 * This is advisory: an editor may deliberately retain an otherwise empty
 * heading, while a real bibliography paragraph/list must never be warned.
 */
function detachedFootnoteHeadings(markdown) {
  const children = [
    ...(unified().use(remarkParse).use(remarkGfm).parse(markdown).children ?? []),
  ];
  const warnings = new Map();

  while (true) {
    let removed = false;
    for (let index = 0; index < children.length; index += 1) {
      const heading = children[index];
      if (heading.type !== "heading") continue;

      const section = [];
      let cursor = index + 1;
      while (
        cursor < children.length
        && !isApparatusBoundary(children[cursor], heading.depth)
      ) {
        section.push(children[cursor]);
        cursor += 1;
      }
      if (!section.some((node) => node.type === "footnoteDefinition")) continue;
      if (section.some((node) => !isInvisibleApparatusNode(node))) continue;

      const line = heading.position?.start?.line ?? 0;
      warnings.set(`${line}:${markdownNodeText(heading)}`, {
        line,
        title: markdownNodeText(heading).trim(),
      });
      children.splice(index, 1);
      removed = true;
      break;
    }
    if (!removed) break;
  }

  return [...warnings.values()].sort((left, right) => left.line - right.line);
}

const hiddenUrlCharacter = /[\u200B\u200C\u200D\u2060\uFEFF]/u;

/**
 * Reject only link defects whose target is mechanically absent or corrupted.
 * A visible “网页链接” label remains legal when it is an actual HTTP(S) link;
 * repeated destinations and live/dead network state are editorial facts, not
 * deterministic build failures.
 */
function linkIntegrityFailures(markdown) {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(markdown);
  const failures = new Map();

  function report(node, reason) {
    const line = node.position?.start?.line ?? 0;
    if (!failures.has(line)) failures.set(line, { line, reason });
  }

  function walk(node, resolvedPlaceholder = false) {
    if (node.type === "link") {
      const label = markdownNodeText(node);
      const target = node.url ?? "";
      const validTarget = /^https?:\/\/\S+$/iu.test(target)
        && !target.includes("网页链接")
        && !hiddenUrlCharacter.test(target);
      if (target.includes("网页链接")) report(node, "URL 中混入了“网页链接”占位符");
      else if (hiddenUrlCharacter.test(target)) report(node, "URL 中混入了零宽字符");
      else if (label.includes("网页链接") && !validTarget) report(node, "“网页链接”占位符没有有效的 HTTP(S) 目标");
      else if (/^https?:\/\//iu.test(target)) {
        try {
          const hostname = new URL(target).hostname;
          if (hostname.split(".").some((part) => part.startsWith("-") || part.endsWith("-"))) {
            report(node, "URL 域名标签以连字符开头或结尾");
          }
        } catch {
          report(node, "URL 语法无效");
        }
      }
      for (const child of node.children ?? []) walk(child, true);
      return;
    }
    if (node.type === "text" && node.value?.includes("网页链接") && !resolvedPlaceholder) {
      report(node, "裸“网页链接”占位符没有可点击目标");
    }
    for (const child of node.children ?? []) walk(child, resolvedPlaceholder);
  }

  walk(tree);
  markdown.split(/\r?\n/u).forEach((line, index) => {
    if (/https?:\/\/[^\s<>()]*[\u200B\u200C\u200D\u2060\uFEFF]/iu.test(line)) {
      if (!failures.has(index + 1)) {
        failures.set(index + 1, { line: index + 1, reason: "URL 中混入了零宽字符" });
      }
    }
    if (/https?:\/\/[^\s<>()]*\\_/iu.test(line) && !failures.has(index + 1)) {
      failures.set(index + 1, {
        line: index + 1,
        reason: "URL 中错误保留了 Markdown 下划线转义",
      });
    }
  });
  return [...failures.values()].sort((left, right) => left.line - right.line);
}

/**
 * A blank line ends an unindented GFM footnote continuation. Catch the two
 * high-confidence shapes that otherwise look normal in source but leak into
 * article prose: a standalone URL or a standalone access-date line.
 */
function detachedFootnoteContinuations(markdown) {
  const lines = markdown.split(/\r?\n/u);
  const failures = [];
  const footnoteDefinition = /^\[\^[^\]]+\]:/u;
  const detachedUrl = /^https?:\/\/\S+[。.]?$/iu;
  const detachedAccessDate = /^[（(]\d{4}年\d{1,2}月\d{1,2}日访问[）)][。.]?$/u;

  for (let index = 0; index < lines.length; index += 1) {
    if (!footnoteDefinition.test(lines[index]) || lines[index + 1]?.trim() !== "") continue;
    let cursor = index + 2;
    while (cursor < lines.length && lines[cursor].trim() === "") cursor += 1;
    const candidate = lines[cursor] ?? "";
    if (footnoteDefinition.test(candidate) || /^\s/u.test(candidate)) continue;
    if (detachedUrl.test(candidate) || detachedAccessDate.test(candidate)) {
      failures.push({
        line: cursor + 1,
        reason: detachedUrl.test(candidate) ? "URL 因空行逃出了脚注" : "访问日期因空行逃出了脚注",
      });
    }
  }
  return failures;
}

assert.deepEqual(
  linkIntegrityFailures("来源：[网页链接](https://example.org/read)。"),
  [],
  "a placeholder label is legal when it has a real HTTP target",
);
assert.deepEqual(
  linkIntegrityFailures("来源：网页链接。"),
  [{ line: 1, reason: "裸“网页链接”占位符没有可点击目标" }],
  "a bare platform placeholder must not survive into public prose",
);
assert.deepEqual(
  linkIntegrityFailures("https://www.网页链接\u200B9792。"),
  [{ line: 1, reason: "URL 中混入了“网页链接”占位符" }],
  "a platform-split pseudo URL must be rejected",
);
assert.deepEqual(
  linkIntegrityFailures("来源：https://example.org/user\\_name/status/1"),
  [{ line: 1, reason: "URL 中错误保留了 Markdown 下划线转义" }],
  "Markdown escapes must not become part of a public URL",
);
assert.deepEqual(
  linkIntegrityFailures("来源：https://example.-org/read"),
  [{ line: 1, reason: "URL 域名标签以连字符开头或结尾" }],
  "a hostname label must not start or end with a hyphen",
);
assert.deepEqual(
  detachedFootnoteContinuations("正文[^1]。\n\n[^1]: 来源：\n\nhttps://example.org/read\n\n（2024年1月2日访问）。"),
  [{ line: 5, reason: "URL 因空行逃出了脚注" }],
  "a blank line must not detach a footnote URL into article prose",
);
assert.deepEqual(
  detachedFootnoteContinuations("正文[^1]。\n\n[^1]: https://example.org/read\n\n（2024年1月2日访问）。"),
  [{ line: 5, reason: "访问日期因空行逃出了脚注" }],
  "a blank line must not detach an access date from its footnote URL",
);
assert.deepEqual(
  detachedFootnoteContinuations("正文[^1]。\n\n[^1]: https://example.org/read（2024年1月2日访问）。"),
  [],
  "a self-contained footnote link and access date must remain accepted",
);

assert.deepEqual(
  detachedFootnoteHeadings("正文[^1]。\n\n## 参考文献\n\n[^1]: 文献。"),
  [{ line: 3, title: "参考文献" }],
  "a heading emptied by GFM footnote extraction must be reported",
);
assert.deepEqual(
  detachedFootnoteHeadings("## 译注\n\n## 附录\n\n[^1]: 注释。"),
  [
    { line: 1, title: "译注" },
    { line: 3, title: "附录" },
  ],
  "consecutive detached apparatus headings must all be reported",
);
assert.deepEqual(
  detachedFootnoteHeadings("## 参考文献\n\n1. 真实书目。\n\n[^1]: 注释。"),
  [],
  "a heading with a visible bibliography must remain accepted",
);
assert.deepEqual(
  detachedFootnoteHeadings("## 单独标题"),
  [],
  "an intentionally standalone heading without extracted definitions must remain accepted",
);

const localeLayoutSource = await readFile(new URL("../app/[locale]/layout.tsx", import.meta.url), "utf8");
assert.match(
  localeLayoutSource,
  /import\s+["']katex\/dist\/katex\.min\.css["'];/u,
  "localized article and book routes must load KaTeX CSS so MathML stays visually hidden"
);

const bibliography = "Gaido, Daniel 2003, ‘“The American Worker” and the Theory of Permanent Revolution: Karl Kautsky on Werner Sombart’s *Why Is There No Socialism in the United States?*’, *Historical Materialism*, 11, 4: 79-123.";
const bibliographyHtml = await renderMarkdown(bibliography);

const cjkEmphasisHtml = await renderMarkdown(`_译者导言。_

**词典释义。**

_Mixed 中文 emphasis._`);
assert.match(
  cjkEmphasisHtml,
  /<em>译者导言。<\/em>/u,
  "CJK Markdown emphasis must retain em semantics instead of becoming strong",
);
assert.match(
  cjkEmphasisHtml,
  /<strong>词典释义。<\/strong>/u,
  "explicit CJK strong emphasis must remain strong",
);
assert.match(
  cjkEmphasisHtml,
  /<em><span class="latin-run">Mixed<\/span> 中文 <span class="latin-run">emphasis\.<\/span><\/em>/u,
  "mixed-language Markdown emphasis must retain em semantics",
);

const japaneseEmphasisHtml = await renderMarkdown("_日本語の強調。_", { language: "ja" });
assert.match(
  japaneseEmphasisHtml,
  /<em>日本語の強調。<\/em>/u,
  "Japanese Markdown emphasis must retain em semantics",
);

const rawCjkEmphasisHtml = await renderMarkdown("<em>原始 HTML 强调。</em>");
assert.match(
  rawCjkEmphasisHtml,
  /<em>原始 <span class="latin-run">HTML<\/span> 强调。<\/em>/u,
  "raw HTML emphasis must retain em semantics",
);

assert.match(
  bibliographyHtml,
  /<span class="latin-run">Gaido, Daniel 2003, ‘“The American Worker” and the Theory of Permanent Revolution: Karl Kautsky on Werner Sombart’s<\/span>/,
  "purely Latin bibliography quotes must remain in the Latin run"
);
assert.match(
  bibliographyHtml,
  /<em><span class="latin-run">Why Is There No Socialism in the United States\?<\/span><\/em><span class="latin-run">’,<\/span>/,
  "closing bibliography quotes must remain in the Latin run"
);
assert.doesNotMatch(
  bibliographyHtml,
  /<\/span> [‘“”]/,
  "Latin quotation marks must not fall back to a CJK text node"
);

const mixed = "中文“English”中文。";
const mixedHtml = await renderMarkdown(mixed);
assert.match(
  mixedHtml,
  /中文“<span class="latin-run">English<\/span>”中文。/,
  "quotes adjoining CJK text must remain in the CJK run"
);

const mixedQuoteHtml = await renderMarkdown("“中文 English”");
assert.match(
  mixedQuoteHtml,
  /<p>“中文 <span class="latin-run">English<\/span>”<\/p>/,
  "quotes enclosing CJK text must remain in the CJK run"
);

const primedFormalLabelHtml = await renderMarkdown("将 (C′) 与 (2″) 代入公式。");
assert.match(
  primedFormalLabelHtml,
  /将 <span class="latin-run">\(C′\)<\/span> 与 <span class="latin-run">\(2″\)<\/span> 代入公式/u,
  "formal labels with prime marks must keep both parentheses in one Latin font run"
);

const cjkAutolinkHtml = await renderMarkdown(
  "官网：http://www.sfwj.or.jp）第三届主席的同时，帮助设立了日本SF大奖。"
);
assert.match(
  cjkAutolinkHtml,
  /<a href="http:\/\/www\.sfwj\.or\.jp"[^>]*>[\s\S]*?<\/a>）第三届主席/u,
  "a bare URL must stop before full-width punctuation and following CJK prose"
);
assert.doesNotMatch(
  cjkAutolinkHtml,
  /href="[^"]*%(?:EF%BC|E3%80)/iu,
  "CJK punctuation must never be percent-encoded into an autolink target"
);

const cjkOpeningPunctuationHtml = await renderMarkdown(
  "资料：https://example.org/read（2024年访问）。"
);
assert.match(
  cjkOpeningPunctuationHtml,
  /<a href="https:\/\/example\.org\/read"[^>]*>[\s\S]*?<\/a>（[\s\S]*?年访问）/u,
  "a bare URL must also stop before opening full-width punctuation"
);

const footnoteHtml = await renderMarkdown("正文引用[^1]。\n\n[^1]: 注释正文。");
assert.match(
  footnoteHtml,
  /aria-label="返回正文引用 1"/,
  "GFM footnote backreferences must expose a Chinese accessible name"
);
assert.doesNotMatch(
  footnoteHtml,
  /aria-label="Back to reference/,
  "GFM footnote backreferences must not retain the default English accessible name"
);

const groupedFootnoteHtml = await renderMarkdown(
  "正文引用[^translation-1]。\n\n## 译注\n\n[^translation-1]: 译者说明。"
);
assert.doesNotMatch(
  groupedFootnoteHtml,
  /<h2[^>]*>译注<\/h2>/u,
  "a source-side footnote grouping title must not survive as an empty article heading"
);
assert.match(
  groupedFootnoteHtml,
  /id="user-content-fn-translation-1"/u,
  "removing the detached grouping title must preserve the footnote definition"
);

const mergedQuotationHtml = await renderMarkdown(
  "> 第一段引文。\n\n> 第二段引文。\n\n> ——出处。"
);
assert.equal(
  (mergedQuotationHtml.match(/<blockquote>/gu) ?? []).length,
  1,
  "adjacent blockquotes must render as one quotation container"
);
assert.match(
  mergedQuotationHtml,
  /<blockquote>\s*<p>第一段引文。<\/p>\s*<p>第二段引文。<\/p>\s*<p>——出处。<\/p>\s*<\/blockquote>/u,
  "merging quotation containers must preserve paragraph and attribution boundaries"
);

const separatedQuotationHtml = await renderMarkdown(
  "> 第一则引文。\n\n<!--separate-quotations-->\n\n> 第二则引文。"
);
assert.equal(
  (separatedQuotationHtml.match(/<blockquote>/gu) ?? []).length,
  2,
  "the explicit separator must preserve deliberately independent quotations"
);
assert.doesNotMatch(
  separatedQuotationHtml,
  /separate-quotations/u,
  "the quotation separator is an editorial marker and must not enter public HTML"
);

const interruptedQuotationHtml = await renderMarkdown(
  "> 第一则引文。\n\n正文说明。\n\n> 第二则引文。"
);
assert.equal(
  (interruptedQuotationHtml.match(/<blockquote>/gu) ?? []).length,
  2,
  "ordinary content between quotations must remain a semantic boundary"
);

const inlinePageMarkerFootnoteHtml = await renderMarkdown(
  "<!-- page 126 -->正文引用[^page-1]。\n\n<!-- page 127 --> 连续引用[^page-2]。\n\n[^page-1]: 第一条注释。\n\n[^page-2]: 第二条注释。"
);
assert.doesNotMatch(
  inlinePageMarkerFootnoteHtml,
  /\[\^page-[12]\]/u,
  "inline page markers must not leave footnote references unparsed"
);
assert.equal(
  (inlinePageMarkerFootnoteHtml.match(/data-footnote-ref/gu) ?? []).length,
  2,
  "inline page markers must preserve every following footnote reference"
);

const mathHtml = await renderMarkdown("Inline $E=mc^2$\n\n$$\n\\int_0^1 x^2\\,dx\n$$");
assert.match(mathHtml, /class="katex"/, "inline math must render with KaTeX");
assert.match(mathHtml, /class="katex-display"/, "display math must render with KaTeX");
assert.match(mathHtml, /<math\b[^>]*><semantics><mrow>/u, "KaTeX MathML must survive sanitization");
assert.match(mathHtml, /<annotation encoding="application\/x-tex">/u);
assert.match(mathHtml, /style="height:[^"]+"/u, "KaTeX layout styles must survive sanitization");

const currencyHtml = await renderMarkdown(
  "Tickets cost $5 and $10.00. 中文价格是$5，会员价$10。字面符号写作 \\$。"
);
assert.doesNotMatch(
  currencyHtml,
  /class="katex"/u,
  "ordinary prices and escaped dollar signs must not be parsed as formulae"
);
assert.equal(
  (currencyHtml.match(/\$/gu) ?? []).length,
  5,
  "literal currency signs must remain visible in rendered prose"
);

const numericMathHtml = await renderMarkdown("Numeric formulae still work: $5$ and $2x+1$.");
assert.equal(
  (numericMathHtml.match(/class="katex"/gu) ?? []).length,
  2,
  "protecting currency signs must not disable numeric inline formulae"
);

const currencyBeforeMathHtml = await renderMarkdown(
  "The total is $5 million and formula $x$."
);
assert.equal(
  (currencyBeforeMathHtml.match(/class="katex"/gu) ?? []).length,
  1,
  "currency prose must remain literal while a later inline formula still renders"
);
assert.match(
  currencyBeforeMathHtml,
  /\$<span class="latin-run">5 million and formula<\/span>/u,
  "the literal price and its prose must remain visible"
);
assert.doesNotMatch(currencyBeforeMathHtml, /x\$\./u, "the closing formula dollar must not leak");

const radicalHtml = await renderMarkdown("$\\sqrt{x}$");
assert.match(
  radicalHtml,
  /<svg\b[^>]*viewbox="[^"]+" preserveaspectratio="[^"]+"[^>]*><path d="[^"]+"><\/path><\/svg>/u,
  "KaTeX's inert radical SVG path must survive sanitization"
);

const richArticleHtml = await renderMarkdown(`
<div id="custom-block" class="signature-block" data-edition="one">
  <p>自定义正文</p>
</div>

| 左 | 右 |
| :-- | --: |
| 一 | 二 |

[外链](https://example.org/read)

![插图](/attachments/cover.png "说明")

正文[^w1]

[^w1]: 来源说明
`);
assert.match(
  richArticleHtml,
  /<div id="custom-block" class="signature-block" data-edition="one">/u,
  "existing custom class, id and data attributes must survive sanitization"
);
assert.match(richArticleHtml, /<table>[\s\S]*?<th align="left">/u, "GFM tables must survive sanitization");
const semanticTableHtml = await renderMarkdown(`
[table] 朝鲜两个道农民的收支，1931年（日元）

| 类别 | 总收入 |
| --- | ---: |
| 自耕农 | 679 |

[table-note] <sup>a</sup> 估算值。

[table-note] 资料来源：李勳求，《朝鲜的土地利用与农村经济》。
`);
assert.match(
  semanticTableHtml,
  /<figure class="article-table"><figcaption class="article-table-caption">朝鲜两个道农民的收支，(?:<span class="latin-run">)?1931(?:<\/span>)?年（日元）<\/figcaption>/u,
  "marked table titles must become semantic figure captions"
);
assert.match(
  semanticTableHtml,
  /<div class="article-table-scroll"><table class="article-table-grid">/u,
  "semantic tables must retain a horizontally scrollable table region"
);
assert.match(
  semanticTableHtml,
  /<div class="article-table-notes"><p class="article-table-note"><sup>(?:<span class="latin-run">)?a(?:<\/span>)?<\/sup>\s+估算值。<\/p><p class="article-table-note">资料来源：/u,
  "marked table notes and sources must be grouped beneath the table"
);
assert.doesNotMatch(semanticTableHtml, /\[table(?:-note)?\]/u, "table source markers must never render");

const semanticFigureHtml = await renderMarkdown(`
[fig] 滨口雄幸

![滨口雄幸](attachments/plate.png "=25%")

[fig-note] 出自印本第26页。
`);
assert.match(
  semanticFigureHtml,
  /<figure class="article-figure" data-width="25"><img src="\/attachments\/plate\.png"/u,
  "marked plates must become semantic figures carrying their print width"
);

const compactFigureHtml = await renderMarkdown(`[fig] 紧凑图题\n![图](attachments/compact.png "=25%")\n[fig-note] 紧凑图注。`);
assert.match(
  compactFigureHtml,
  /<figure class="article-figure" data-width="25"><img src="\/attachments\/compact\.png"/u,
  "compact marker syntax must become the same semantic figure"
);
assert.doesNotMatch(compactFigureHtml, /\[fig(?:-note)?\]/u);
const attachedFigureHtml = await renderMarkdown(`前一段没有空行。\n[fig] 紧凑图题\n![图](attachments/compact.png "=25%")\n[fig-note] 紧凑图注。`);
assert.match(attachedFigureHtml, /<p>前一段没有空行。<\/p><figure class="article-figure"/u);
assert.match(
  semanticFigureHtml,
  /<figcaption class="article-figure-caption">滨口雄幸<\/figcaption>/u,
  "figure captions must render beneath the plate, not only as alt text"
);
assert.match(
  semanticFigureHtml,
  /<div class="article-figure-notes"><p class="article-figure-note">出自印本第(?:<span class="latin-run">)?26(?:<\/span>)?页。<\/p><\/div>/u,
  "marked figure notes must be grouped beneath the caption"
);
assert.doesNotMatch(semanticFigureHtml, /\[fig(?:-note)?\]/u, "figure markers must never render");
assert.doesNotMatch(semanticFigureHtml, /title="/u, "a consumed width hint must not survive as a title");

const noteOnlyFigureHtml = await renderMarkdown(`[fig]\n![无题图版](attachments/note-only.png)\n[fig-note] © 原权利人。`);
assert.match(
  noteOnlyFigureHtml,
  /<figure class="article-figure"><img src="\/attachments\/note-only\.png"[^>]*><div class="article-figure-notes">/u,
  "a source note may attach to an untitled figure without inventing a visible caption"
);
assert.doesNotMatch(noteOnlyFigureHtml, /<figcaption/u, "untitled figures must not render an empty caption");
assert.doesNotMatch(noteOnlyFigureHtml, /\[fig(?:-note)?\]/u);

const semanticFormulaFigureHtml = await renderMarkdown(`[fig] TF-IDF 计算公式。

$$
\\mathrm{TF}=\\frac{n}{\\mathrm{total}}
$$`);
assert.match(
  semanticFormulaFigureHtml,
  /<figure class="article-figure"><span class="katex-display">[\s\S]*?<figcaption class="article-figure-caption">/u,
  "a captioned formula must remain a semantic figure after replacing its source screenshot"
);
assert.doesNotMatch(
  semanticFormulaFigureHtml.replace(/<[^>]+>/gu, ""),
  /\[fig\]/u,
  "formula figure markers must never render as visible text"
);

const semanticProfileHtml = await renderMarkdown(`
[person] 理查德·卡里奇曼

![理查德·卡里奇曼肖像](attachments/calichman.jpg "=25%")

[person-bio] 纽约市立大学教授，研究日本近现代思想史与后殖民理论。
`);
assert.match(
  semanticProfileHtml,
  /<figure class="article-profile" data-width="25"><img src="\/attachments\/calichman\.jpg"/u,
  "marked profiles must become semantic portrait records carrying their plate width"
);
assert.match(
  semanticProfileHtml,
  /<figcaption class="article-profile-name">理查德(?:<span class="cjk-interpunct">)?·(?:<\/span>)?卡里奇曼<\/figcaption>/u,
  "profile names must remain concise figure captions"
);
assert.match(
  semanticProfileHtml,
  /<div class="article-profile-copy"><p class="article-profile-bio">纽约市立大学教授/u,
  "profile biographies must remain associated with the portrait without entering its short caption"
);
assert.doesNotMatch(semanticProfileHtml, /\[person(?:-bio)?\]/u, "profile markers must never render");

const semanticAuthorCardHtml = await renderMarkdown(`
[author] 鲜奶饼干

![鲜奶饼干头像](attachments/author-card.png "=25%")

[author-bio] 哲学票友，冻鳗高手。
`);
assert.match(
  semanticAuthorCardHtml,
  /<figure class="article-profile article-profile-compact" data-width="25"><img src="\/attachments\/author-card\.png"/u,
  "author cards must use the compact profile treatment",
);
assert.doesNotMatch(
  semanticAuthorCardHtml,
  /\[author(?:-bio)?\]/u,
  "author card markers must never render",
);

const semanticIdentityCardHtml = await renderMarkdown(`
[card] Lab on Roof

![Lab on Roof 标志人物](attachments/roof-card.png "=25%")

[card-bio] I, Truth, shall speak.
`);
assert.match(
  semanticIdentityCardHtml,
  /<figure class="article-profile article-profile-compact" data-width="25"><img src="\/attachments\/roof-card\.png"/u,
  "identity cards must reuse the compact semantic profile plate",
);
assert.match(
  semanticIdentityCardHtml,
  /<figcaption class="article-profile-name"><span class="latin-run">Lab on Roof<\/span><\/figcaption>/u,
  "identity card names must remain concise figure captions",
);
assert.doesNotMatch(
  semanticIdentityCardHtml,
  /\[card(?:-bio)?\]/u,
  "identity card markers must never render",
);

const semanticGalleryHtml = await renderMarkdown(`
[gallery] 前后对照

[fig] 修改前

![修改前](attachments/before.png)

[fig] 修改后

![修改后](attachments/after.png)

[/gallery]

[fig-note] 两图为同一来源。
`);
assert.match(
  semanticGalleryHtml,
  /<figure class="article-gallery" data-count="2"><figcaption class="article-gallery-title">前后对照<\/figcaption><div class="article-gallery-grid">/u,
  "explicitly delimited figures must become one semantic gallery"
);
assert.equal((semanticGalleryHtml.match(/class="article-figure"/gu) ?? []).length, 2);
assert.match(
  semanticGalleryHtml,
  /<div class="article-figure-notes"><p class="article-figure-note">两图为同一来源。<\/p><\/div><\/figure>/u,
  "a shared gallery note must belong to the whole comparison rather than its last plate"
);
assert.doesNotMatch(semanticGalleryHtml, /\[(?:fig-note|gallery|\/gallery)\]/u);

const semanticSlidesHtml = await renderMarkdown(`
[slides] 连续扫描页

[fig] 第1页

![第1页](attachments/page-01.png)

[fig] 第2页

![第2页](attachments/page-02.png)

[/slides]
`);
assert.match(
  semanticSlidesHtml,
  /<figure class="article-slides" data-count="2"><figcaption class="article-slides-title">连续扫描页<\/figcaption><div class="article-slides-track" role="region" aria-label="连续图版" tabindex="0">/u,
  "explicitly delimited ordered figures must become one scroll-snapping sequence"
);
assert.match(semanticSlidesHtml, /data-slide="1" data-total="2"/u);
assert.match(semanticSlidesHtml, /data-slide="2" data-total="2"/u);
assert.doesNotMatch(semanticSlidesHtml, /\[(?:slides|\/slides)\]/u);

const semanticLayoutHtml = await renderMarkdown(`
[layout:timeline]

神化41年6月 披头士来日本武道馆演出。

这是同一日期下的补充说明。

[/layout]
`);
assert.match(
  semanticLayoutHtml,
  /<section class="article-layout article-layout-timeline" data-layout="timeline">/u,
  "an explicit article-layout range must become one semantic section"
);
assert.match(
  semanticLayoutHtml,
  /<p class="article-timeline-item"><time class="article-timeline-date">神化(?:<span class="latin-run">)?41(?:<\/span>)?年(?:<span class="latin-run">)?6(?:<\/span>)?月<\/time>披头士/u,
  "a declared timeline must expose its leading date as a dedicated label"
);
assert.match(semanticLayoutHtml, /<p>这是同一日期下的补充说明。<\/p>/u);
assert.doesNotMatch(semanticLayoutHtml, /\[版式/u, "article-layout markers must never render");

const unmarkedFigureHtml = await renderMarkdown('![配图1](attachments/plate.png)');
assert.doesNotMatch(
  unmarkedFigureHtml,
  /<figure|<figcaption/u,
  "images without a 图题 marker must stay bare so placeholder alt text never becomes a caption"
);

const sizedBareImageHtml = await renderMarkdown('![配图1](attachments/plate.png "=33%")');
assert.match(
  sizedBareImageHtml,
  /<p class="article-image" data-width="33"><img src="\/attachments\/plate\.png" alt="配图1"[^>]*><\/p>/u,
  "a bare image width hint must become layout semantics without inventing a caption"
);
assert.doesNotMatch(sizedBareImageHtml, /<figure|<figcaption|title=/u);

function semanticCoverImagesWithoutWidth(markdown) {
  const lines = markdown.split(/\r?\n/u);
  const failures = [];
  const coverAlt = /(?:书封|书籍封面|期刊封面|杂志封面)/u;
  const explicitWidth = /\s+"=(?:25|33|50|66|75|100)%"\s*$/u;

  for (let index = 0; index < lines.length; index += 1) {
    const image = /^!\[([^\]]*)\]\((.*)\)\s*$/u.exec(lines[index]);
    if (!image || !coverAlt.test(image[1]) || explicitWidth.test(image[2])) continue;
    let previous = index - 1;
    while (previous >= 0 && lines[previous].trim() === "") previous -= 1;
    if (previous >= 0 && lines[previous].startsWith("[fig]")) failures.push(index + 1);
  }
  return failures;
}

function authorPortraitsWithFigureCaptions(markdown) {
  const lines = markdown.split(/\r?\n/u);
  const failures = [];
  const authorPortrait = /author-portrait(?:-v\d+)?\.[a-z0-9]+(?:\s+"=[^"]+")?\)\s*$/iu;

  for (let index = 0; index < lines.length; index += 1) {
    if (!authorPortrait.test(lines[index].trim())) continue;
    let previous = index - 1;
    while (previous >= 0 && lines[previous].trim() === "") previous -= 1;
    if (previous >= 0 && lines[previous].trim().startsWith("[fig]")) failures.push(index + 1);
  }
  return failures;
}

function forbiddenGenericPromoAssetReferences(markdown, assetHashByKey, forbiddenHashes) {
  const references = [];
  const pattern = /attachments\/((?:wechat|roof-archive)\/[^\s)"'?]+?\.(?:avif|gif|jpe?g|png|webp))(?:\?[^)\s"']*)?/giu;
  for (const match of markdown.matchAll(pattern)) {
    const hash = assetHashByKey.get(match[1]);
    if (!hash || !forbiddenHashes.has(hash)) continue;
    references.push({
      key: match[1],
      line: markdown.slice(0, match.index).split(/\r?\n/u).length,
    });
  }
  return references;
}

function unclassifiedItalicImageNeighbors(markdown) {
  const lines = markdown.split(/\r?\n/u);
  const failures = [];
  const italicOnly = /^\*(?!\*)[^*].*\*$/u;
  const isImage = (line) => /^!\[[^\]]*\]\([^\n]+\)\s*$/u.test(line.trim());
  const previousSignificant = (index) => {
    for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
      if (lines[cursor].trim()) return cursor;
    }
    return -1;
  };
  const nextSignificant = (index) => {
    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      if (lines[cursor].trim()) return cursor;
    }
    return -1;
  };

  for (let index = 0; index < lines.length; index += 1) {
    if (!italicOnly.test(lines[index].trim())) continue;
    const previous = previousSignificant(index);
    if (previous >= 0 && lines[previous].trim() === "<!--standalone-emphasis-->") continue;
    const next = nextSignificant(index);
    if ((previous >= 0 && isImage(lines[previous])) || (next >= 0 && isImage(lines[next]))) {
      failures.push(index + 1);
    }
  }
  return failures;
}

function unclassifiedExplicitImageCaptions(markdown) {
  const lines = markdown.split(/\r?\n/u);
  const failures = [];
  const isImage = (line) => /^!\[[^\]]*\]\([^\n]+\)\s*$/u.test(line.trim());
  const captionLike = /^(?:(?:左|右|上|下|中)图(?:为|是|中|上|下|左|右|[:：.．]|\s)|图(?:[一二三四五六七八九十\d.-]+)?(?:为|是|中|上|下|左|右|[:：.．]|\s)|(?:片段|截图)[一二三四五六七八九十\d]+(?:[:：.．]|$)|(?:原画|作画|画师|摄影|来源|出处|图源)[:：]|(?:编者按[:：]\s*)?(?:图片|图像|照片)(?:来自|来源|出处)|pid[:：]\s*\d+|(?:\*\*)?.*(?:©|Wikimedia Commons|wikimedia commons|制作委员会|製作委員会))/u;
  const previousSignificant = (index) => {
    for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
      if (lines[cursor].trim()) return cursor;
    }
    return -1;
  };
  const nextSignificant = (index) => {
    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      if (lines[cursor].trim()) return cursor;
    }
    return -1;
  };
  const imageAlreadyClassified = (imageIndex) => {
    const markerIndex = previousSignificant(imageIndex);
    return markerIndex >= 0 && /^\[(?:fig|person|author|card|gallery|slides)\]/u.test(lines[markerIndex].trim());
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!captionLike.test(line) || [...line].length > 160) continue;
    if (/^\[(?:fig|fig-note|person|person-bio|author|author-bio|card|card-bio)\]/u.test(line)) continue;
    const previous = previousSignificant(index);
    if (previous >= 0 && lines[previous].trim() === "<!--source-centered-prose-->") continue;
    const next = nextSignificant(index);
    const previousImage = previous >= 0 && isImage(lines[previous]) && !imageAlreadyClassified(previous);
    const nextImage = next >= 0 && isImage(lines[next]);
    if (previousImage || nextImage) failures.push(index + 1);
  }
  return failures;
}

assert.deepEqual(
  semanticCoverImagesWithoutWidth('[fig] 书目\n\n![某书书封](attachments/book.jpg)'),
  [3],
  "a semantic book cover must explicitly choose its plate width"
);
assert.deepEqual(
  semanticCoverImagesWithoutWidth('[fig] 书目\n\n![某书书封](attachments/book.jpg "=25%")'),
  [],
  "a semantic book cover with an explicit print width must pass"
);
assert.deepEqual(
  authorPortraitsWithFigureCaptions('[fig] The author above.\n\n![Author](attachments/article/01-author-portrait-v5.png "=25%")'),
  [3],
  "an author portrait must not be published as an ordinary captioned figure"
);
assert.deepEqual(
  authorPortraitsWithFigureCaptions('[card] Author Name\n\n![Author](attachments/article/01-author-portrait-v5.png "=25%")'),
  [],
  "a semantic author card must pass"
);
assert.deepEqual(
  forbiddenGenericPromoAssetReferences(
    '正文。\n\n![误标的动画画面](attachments/wechat/example/body-019.jpg)',
    new Map([["wechat/example/body-019.jpg", "confirmed-generic-promo"]]),
    new Set(["confirmed-generic-promo"]),
  ),
  [{ key: "wechat/example/body-019.jpg", line: 3 }],
  "a confirmed generic promotion image must be rejected regardless of its alt text",
);

assert.deepEqual(
  unclassifiedItalicImageNeighbors('![图](attachments/a.jpg)\n\n*看似图题。*'),
  [3],
  "an italic-only paragraph beside an image must be classified instead of relying on visual proximity"
);
assert.deepEqual(
  unclassifiedItalicImageNeighbors('![图](attachments/a.jpg)\n\n<!--standalone-emphasis-->\n*确为独立说明。*'),
  [],
  "a deliberate standalone italic beside an image needs an explicit source decision"
);
assert.deepEqual(
  unclassifiedExplicitImageCaptions('![对照图](attachments/a.jpg)\n\n右图：《长骑美眉》'),
  [3],
  "an explicit directional legend must not remain a plain paragraph beside an unclassified image"
);
assert.deepEqual(
  unclassifiedExplicitImageCaptions('[fig] 对照图\n\n![对照图](attachments/a.jpg)\n\n图1 展示的是后续正文分析。'),
  [],
  "prose following an already captioned figure must not be mistaken for another caption"
);
assert.deepEqual(
  unclassifiedExplicitImageCaptions('![作品图](attachments/a.jpg)\n\n<!--source-centered-prose-->\n\n图为理解本文主题的一个入口。'),
  [],
  "an explicitly reviewed source-styled prose block may remain ordinary prose"
);
assert.deepEqual(
  unclassifiedExplicitImageCaptions('![作品图](attachments/a.jpg)\n\n出自《作品》；© 2024 “作品”制作委员会。'),
  [3],
  "a copyright-bearing source caption beside an image must be classified"
);
assert.deepEqual(
  unclassifiedExplicitImageCaptions('![作品图](attachments/a.jpg)\n\n编者按：图片来自网络。'),
  [3],
  "an image source note must attach semantically instead of remaining body prose"
);
assert.deepEqual(
  unclassifiedExplicitImageCaptions('[fig] 插图\n\n![作品图](attachments/a.jpg)\n\n[fig-note] Pixiv 作品 ID：84264964。'),
  [],
  "a classified platform image identifier may remain as a source note"
);
const standaloneEmphasisHtml = await renderMarkdown('![图](attachments/a.jpg)\n\n<!--standalone-emphasis-->\n*确为独立说明。*');
assert.doesNotMatch(standaloneEmphasisHtml, /standalone-emphasis/u, "standalone-emphasis markers must not enter public HTML");

assert.match(
  richArticleHtml,
  /<a href="https:\/\/example\.org\/read" target="_blank" rel="noopener noreferrer">/u,
  "external links must preserve their safe attributes"
);
assert.match(
  richArticleHtml,
  /<img src="\/attachments\/cover\.png" alt="插图" title="说明" loading="lazy" decoding="async" \/>/u,
  "article images must preserve their required attributes"
);
assert.match(richArticleHtml, /<section class="source-notes" data-source-notes(?:="")?>/u);
assert.match(richArticleHtml, /<li id="source-note-w1" value="1">/u);

const hostileHtml = await renderMarkdown(`
<a href="java&#x73;cript:alert(1)" onclick="alert(2)">实体协议</a>
<a href="vbscript:msgbox(1)">旧协议</a>
<a href="data:text/html;base64,PHNjcmlwdD4=">数据链接</a>
<img src="data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9YWxlcnQoMSk+" oNeRrOr="alert(3)">
<svg xmlns="http://www.w3.org/2000/svg">
  <a xlink:href="javascript:alert(4)">SVG 链接</a>
  <foreignObject><script>alert(5)</script></foreignObject>
  <animate attributeName="href" values="javascript:alert(6)"></animate>
</svg>
<math>
  <maction actiontype="statusline" xlink:href="javascript:alert(7)">主动 MathML</maction>
  <annotation-xml encoding="text/html"><script>alert(8)</script></annotation-xml>
</math>
`);
assert.doesNotMatch(hostileHtml, /javascript:|vbscript:|data:text\/html|data:image\/svg\+xml/iu);
assert.doesNotMatch(hostileHtml, /\son[a-z][\w:-]*=/iu);
assert.doesNotMatch(
  hostileHtml,
  /<(?:script|foreignobject|animate|maction|annotation-xml)\b|xlink:href/iu,
  "active SVG and MathML content must be removed"
);

const rareHanHtml = await renderMarkdown(`小\u4337应使用稳定的单字字体回退。`);
assert.ok(
  rareHanHtml.includes(`<span class="rare-han">\u4337</span>`),
  "U+4337 must be wrapped for the cross-platform rare Han fallback"
);

const editorialNoteHtml = await renderMarkdown(`**编按：**按文 Georgia`);
assert.match(
  editorialNoteHtml,
  /<p class="editorial-note"><strong>编按：<\/strong>/u,
  "editorial notes must receive their semantic paragraph class"
);

const speakerTurnHtml = await renderMarkdown(`**瓦萨波洛**　“请谈谈当时的经历。”`);
assert.match(
  speakerTurnHtml,
  /<p class="speaker-turn"><strong>瓦萨波洛<\/strong>　/u,
  "speaker turns must receive their non-indented paragraph class"
);

const colonSpeakerTurnHtml = await renderMarkdown(`**古川：**回答不应沿用普通正文缩进。`);
assert.match(
  colonSpeakerTurnHtml,
  /<p class="speaker-turn"><strong>古川：<\/strong>/u,
  "colon-labelled speaker turns must be recognized without requiring a special space"
);

const interviewPromptHtml = await renderMarkdown(`**——第一部作品对您意味着什么？**`);
assert.match(
  interviewPromptHtml,
  /<p class="speaker-turn"><strong>——第一部作品对您意味着什么？<\/strong><\/p>/u,
  "bold interviewer prompts must use the interview turn layout"
);

const plainInterviewTurnHtml = await renderMarkdown(`莲实：请谈谈这个镜头。

滨口：这是回答。

莲实：请继续。

滨口：好的。`, {
  format: "interview",
});
assert.match(
  plainInterviewTurnHtml,
  /<p class="speaker-turn"><strong>莲实：<\/strong>请谈谈这个镜头。<\/p>/u,
  "interview format must structure recurring unmarked speaker labels without article-specific cleanup"
);
assert.match(
  plainInterviewTurnHtml,
  /<p class="speaker-turn"><strong>滨口：<\/strong>这是回答。<\/p>/u,
  "each recurring unmarked speaker must receive the interview turn layout"
);

const interviewTracklistHtml = await renderMarkdown(`Tracklist：

1. Eva（2:50）
2. Rei（2:39）
3. serial experiments lain（1:51）`, {
  format: "interview",
});
assert.doesNotMatch(
  interviewTracklistHtml,
  /speaker-turn|<strong>/u,
  "interview inference must not treat track labels or clock times as speaker turns"
);
assert.match(
  interviewTracklistHtml,
  /<li><span class="latin-run">Eva<\/span>（<span class="latin-run">2:50<\/span>）<\/li>/u,
  "track titles and durations must retain uniform weight"
);

const interviewUrlHtml = await renderMarkdown(`https://example.com/a

https://example.com/b`, {
  format: "interview",
});
assert.doesNotMatch(
  interviewUrlHtml,
  /speaker-turn|<strong>https:<\/strong>/u,
  "repeated URL schemes must not become speaker labels"
);
assert.match(
  interviewUrlHtml,
  /class="external-link-chip"[^>]*data-link-preview="https:\/\/example\.com\/a"/u,
  "a visible raw URL must render as an external-link chip"
);
assert.match(
  interviewUrlHtml,
  /class="external-link-chip-label">example\.com<\/span>/u,
  "an external-link chip must have a compact host fallback before metadata loads"
);

const descriptiveLinkHtml = await renderMarkdown(
  "[这篇文章](https://example.com/a)"
);
assert.doesNotMatch(
  descriptiveLinkHtml,
  /external-link-chip|data-link-preview/u,
  "descriptive Markdown links must remain ordinary prose links"
);
assert.match(
  descriptiveLinkHtml,
  />这篇文章<\/a>/u,
  "descriptive Markdown link text must remain intact"
);

const interviewPostscriptHtml = await renderMarkdown(`追记1：这是文后补充，不是新的发言人。`, {
  format: "interview",
});
assert.doesNotMatch(
  interviewPostscriptHtml,
  /speaker-turn/u,
  "interview postscripts must not be misclassified as speaker turns"
);

/* ---------------- 全语料渲染扫描（TYPO-G1/G3/G4） ----------------
   上面的 fixture 只验证 renderMarkdown 自身的行为，永远不会因真实内容
   违规而失败——[fig] 打错位置、非法 =NN% 宽度都会把字面标记静默渲染
   进页面。这里对 source/_posts 全量渲染一遍：任何图版/表格标记存活到
   输出即失败。形态同 reader-line-justification.spec.ts：枚举语料 →
   测量 → 断言失败清单为空。 */
{
  const fs = await import("node:fs");
  const path = await import("node:path");
  const postsDirectory = path.join(process.cwd(), "source", "_posts");
  const corpusFailures = [];
  const corpusWarnings = [];
  const forbiddenGenericPromoHashes = new Set([
    "641b5689de47e7e6c37c30c0a8bf36fc89539347a44d9b3fcbf3ff3f033d261c",
    "41b9cd01da24ae05e9160d4e36e70515bee61bc5efee56d2efdbeb9f182224fb",
  ]);
  const assetHashByKey = new Map();
  for (const manifestPath of [
    path.join(process.cwd(), "editorial-sources", "wechat", "assets-manifest.json"),
    path.join(process.cwd(), "editorial-sources", "roof-archive", "assets-manifest.json"),
  ]) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    for (const asset of manifest.assets ?? []) assetHashByKey.set(asset.key, asset.sha256);
  }
  const markerLeak = /\[(?:fig(?:-note)?|table(?:-note)?|note|audio|music|video|person(?:-bio)?|author(?:-bio)?|card(?:-bio)?|gallery|slides|\/(?:gallery|slides|layout)|layout:(?:resources|timeline|reading-path|book-list|podcast|contact|comic))\]/u;
  const legacyItalicCaption = /^\*(?:图题[:：]|图[0-9]+[.．：:]).*\*$/mu;
  const invalidWidth = /title="=(?!(?:25|33|50|66|75|100)%")[^"]*"/u;
  const plainCompositionalityLabel = /(?<!\$)\((?:C(?:′)?|H|RR|P|F(?:all|any|cofinal)|[1-8](?:′|″)?)\)(?!\$)/u;
  const italicCompositionalityVariable = /\*e(?:′|″)?\*/u;
  const nonRomanCompositionalitySubscript = /(?:C|S|F)_\{(?:ref|local|coll|cross|stand|occ|singular|plural|all|any|cofinal)\}/u;
  const ocrReflowPosts = new Set([
    "sep-compositionality.md",
    "sep-rudolf-carnap-supplement-c-inductive-logic.md",
    "sep-rudolf-carnap-supplement-e-scientific-theory-reconstruction-part-3.md",
  ]);
  const malformedCjkHref = /href="https?:\/\/[^"]*%(?:EF%BC(?:%8C|%88|%89|%9B|%9A|%81|%9F)|EF%BC(?:%BB|%BD)|E3%80(?:%81|%82|%90|%91|%8A|%8B|%8C|%8D)|E2%80(?:%98|%99|%9C|%9D))[^"]*"/iu;

  const posts = fs
    .readdirSync(postsDirectory)
    .filter((name) => name.endsWith(".md") && !name.startsWith("_") && !name.startsWith("."));
  for (const name of posts) {
    const raw = fs.readFileSync(path.join(postsDirectory, name), "utf8");
    const stripped = raw.replace(/^﻿/u, "");
    let body = stripped;
    if (/^---/u.test(stripped)) {
      const end = stripped.indexOf("\n---", 3);
      if (end !== -1) body = stripped.slice(stripped.indexOf("\n", end + 4) + 1);
    } else {
      const lines = stripped.split(/\r?\n/u);
      const index = lines.findIndex((line) => /^---\s*$/u.test(line));
      if (index !== -1) body = lines.slice(index + 1).join("\n");
    }
    if (legacyItalicCaption.test(body)) {
      corpusFailures.push(`${name}: 遗留斜体图题必须迁移为图片前的 [fig] 语义标记`);
    }
    for (const line of unclassifiedItalicImageNeighbors(body)) {
      corpusFailures.push(`${name}:${line}: 图片相邻的独立斜体必须迁移为 [fig]/[fig-note]，确属独立文字时显式标记`);
    }
    for (const line of unclassifiedExplicitImageCaptions(body)) {
      corpusFailures.push(`${name}:${line}: “左图/右图/图N/原画”等明确图题语言不能作为普通段落紧邻未分类图片`);
    }
    if (name === "sep-compositionality.md") {
      if (plainCompositionalityLabel.test(body) || italicCompositionalityVariable.test(body)) {
        corpusFailures.push(`${name}: 形式原则／例句标签或变量仍混用了正文西文字体，必须统一进入 KaTeX`);
      }
      if (nonRomanCompositionalitySubscript.test(body)) {
        corpusFailures.push(`${name}: 形式原则的语义下标必须使用 \\mathrm{}`);
      }
    }
    if (ocrReflowPosts.has(name) && /[，。！？；：、）】》”’] +(?=\S)/u.test(body)) {
      corpusFailures.push(`${name}: OCR 正文仍有中文标点后的半角空格`);
    }
    for (const line of semanticCoverImagesWithoutWidth(body)) {
      corpusFailures.push(`${name}:${line}: 语义书影必须显式指定图版宽度（单本通常 25/33%，复合书影按构图选择）`);
    }
    for (const line of authorPortraitsWithFigureCaptions(body)) {
      corpusFailures.push(`${name}:${line}: 作者头像不能使用普通 [fig]；请改用 [author]/[card]/[person]，说明文字另入作者简介或编者按`);
    }
    for (const reference of forbiddenGenericPromoAssetReferences(body, assetHashByKey, forbiddenGenericPromoHashes)) {
      corpusFailures.push(`${name}:${reference.line}: 已确认的通用投稿／社群宣传图不能进入文章正文（${reference.key}）`);
    }
    for (const warning of detachedFootnoteHeadings(body)) {
      corpusWarnings.push(
        `${name}:${warning.line}: 标题“${warning.title}”下只有会被 GFM 移入注释区的脚注定义；请复核是否删除这个空壳标题`,
      );
    }
    for (const failure of linkIntegrityFailures(body)) {
      corpusFailures.push(`${name}:${failure.line}: ${failure.reason}`);
    }
    for (const failure of detachedFootnoteContinuations(body)) {
      corpusFailures.push(`${name}:${failure.line}: ${failure.reason}`);
    }
    const html = await renderMarkdown(body);
    if (markerLeak.test(html.replace(/<[^>]+>/gu, ""))) {
      corpusFailures.push(`${name}: 图版/表格标记字面渲染进了页面（[fig]/[fig-note]/[table]/[table-note] 位置或格式有误）`);
    }
    const width = invalidWidth.exec(html);
    if (width) corpusFailures.push(`${name}: 非法图版宽度 ${width[0]}（仅允许 =25/33/50/66/75/100%）`);
    const malformedLink = malformedCjkHref.exec(html);
    if (malformedLink) corpusFailures.push(`${name}: 裸 URL 吞入了中文标点或后续正文`);
  }
  const translationRoot = path.join(process.cwd(), "source", "_translations");
  const translationFiles = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? translationFiles(file) : entry.name.endsWith(".md") ? [file] : [];
  });
  for (const file of translationFiles(translationRoot)) {
    const relative = path.relative(process.cwd(), file);
    const raw = fs.readFileSync(file, "utf8").replace(/^﻿/u, "");
    const end = raw.indexOf("\n---", 3);
    const body = /^---/u.test(raw) && end !== -1
      ? raw.slice(raw.indexOf("\n", end + 4) + 1)
      : raw;
    for (const line of unclassifiedItalicImageNeighbors(body)) {
      corpusFailures.push(`${relative}:${line}: 译文中图片相邻的独立斜体必须迁移为 [fig]/[fig-note]`);
    }
    for (const line of unclassifiedExplicitImageCaptions(body)) {
      corpusFailures.push(`${relative}:${line}: 译文中的明确图题语言不能作为普通段落紧邻未分类图片`);
    }
    for (const line of semanticCoverImagesWithoutWidth(body)) {
      corpusFailures.push(`${relative}:${line}: 译文语义书影必须显式指定图版宽度`);
    }
    for (const line of authorPortraitsWithFigureCaptions(body)) {
      corpusFailures.push(`${relative}:${line}: 译文作者头像不能使用普通 [fig]；请改用 [author]/[card]/[person]`);
    }
    for (const reference of forbiddenGenericPromoAssetReferences(body, assetHashByKey, forbiddenGenericPromoHashes)) {
      corpusFailures.push(`${relative}:${reference.line}: 已确认的通用投稿／社群宣传图不能进入译文正文（${reference.key}）`);
    }
    for (const warning of detachedFootnoteHeadings(body)) {
      corpusWarnings.push(
        `${relative}:${warning.line}: 标题“${warning.title}”下只有会被 GFM 移入注释区的脚注定义；请复核是否删除这个空壳标题`,
      );
    }
    for (const failure of linkIntegrityFailures(body)) {
      corpusFailures.push(`${relative}:${failure.line}: ${failure.reason}`);
    }
    for (const failure of detachedFootnoteContinuations(body)) {
      corpusFailures.push(`${relative}:${failure.line}: ${failure.reason}`);
    }
    const language = relative.includes(`${path.sep}ja${path.sep}`) ? "ja" : "en";
    const html = await renderMarkdown(body, { language });
    if (markerLeak.test(html.replace(/<[^>]+>/gu, ""))) corpusFailures.push(`${relative}: 译文图版／特殊版式标记字面渲染进页面`);
    const width = invalidWidth.exec(html);
    if (width) corpusFailures.push(`${relative}: 非法图版宽度 ${width[0]}`);
    if (malformedCjkHref.test(html)) corpusFailures.push(`${relative}: 译文裸 URL 吞入了中文标点或后续正文`);
  }
  assert.deepEqual(
    corpusFailures,
    [],
    `全语料渲染扫描发现 ${corpusFailures.length} 处标记泄漏`
  );
  for (const warning of corpusWarnings) console.warn(`警告：${warning}`);
  console.log(
    `corpus render scan passed for ${posts.length} posts and ${translationFiles(translationRoot).length} translations` +
    ` (${corpusWarnings.length} detached-footnote-heading warnings)`,
  );
}

console.log("markdown typography verification passed");
