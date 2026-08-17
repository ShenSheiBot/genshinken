import assert from "node:assert/strict";
import { renderMarkdown } from "../lib/markdown.ts";

const bibliography = "Gaido, Daniel 2003, ‘“The American Worker” and the Theory of Permanent Revolution: Karl Kautsky on Werner Sombart’s *Why Is There No Socialism in the United States?*’, *Historical Materialism*, 11, 4: 79-123.";
const bibliographyHtml = await renderMarkdown(bibliography);

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
[表题] 朝鲜两个道农民的收支，1931年（日元）

| 类别 | 总收入 |
| --- | ---: |
| 自耕农 | 679 |

[表注] <sup>a</sup> 估算值。

[表注] 资料来源：李勳求，《朝鲜的土地利用与农村经济》。
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
assert.doesNotMatch(semanticTableHtml, /\[表(?:题|注)\]/u, "table source markers must never render");

const semanticFigureHtml = await renderMarkdown(`
[图题] 滨口雄幸

![滨口雄幸](attachments/plate.png "=25%")

[图注] 出自印本第26页。
`);
assert.match(
  semanticFigureHtml,
  /<figure class="article-figure" data-width="25"><img src="\/attachments\/plate\.png"/u,
  "marked plates must become semantic figures carrying their print width"
);

const compactFigureHtml = await renderMarkdown(`[图题] 紧凑图题\n![图](attachments/compact.png "=25%")\n[图注] 紧凑图注。`);
assert.match(
  compactFigureHtml,
  /<figure class="article-figure" data-width="25"><img src="\/attachments\/compact\.png"/u,
  "compact marker syntax must become the same semantic figure"
);
assert.doesNotMatch(compactFigureHtml, /\[(?:图题|图注)\]/u);
const attachedFigureHtml = await renderMarkdown(`前一段没有空行。\n[图题] 紧凑图题\n![图](attachments/compact.png "=25%")\n[图注] 紧凑图注。`);
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
assert.doesNotMatch(semanticFigureHtml, /\[图(?:题|注)\]/u, "figure markers must never render");
assert.doesNotMatch(semanticFigureHtml, /title="/u, "a consumed width hint must not survive as a title");

const semanticProfileHtml = await renderMarkdown(`
[人物] 理查德·卡里奇曼

![理查德·卡里奇曼肖像](attachments/calichman.jpg "=25%")

[人物简介] 纽约市立大学教授，研究日本近现代思想史与后殖民理论。
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
assert.doesNotMatch(semanticProfileHtml, /\[人物(?:简介)?\]/u, "profile markers must never render");

const semanticGalleryHtml = await renderMarkdown(`
[图组] 前后对照

[图题] 修改前

![修改前](attachments/before.png)

[图题] 修改后

![修改后](attachments/after.png)

[图组结束]
`);
assert.match(
  semanticGalleryHtml,
  /<figure class="article-gallery" data-count="2"><figcaption class="article-gallery-title">前后对照<\/figcaption><div class="article-gallery-grid">/u,
  "explicitly delimited figures must become one semantic gallery"
);
assert.equal((semanticGalleryHtml.match(/class="article-figure"/gu) ?? []).length, 2);
assert.doesNotMatch(semanticGalleryHtml, /\[图组(?:结束)?\]/u);

const semanticSlidesHtml = await renderMarkdown(`
[幻灯] 连续扫描页

[图题] 第1页

![第1页](attachments/page-01.png)

[图题] 第2页

![第2页](attachments/page-02.png)

[幻灯结束]
`);
assert.match(
  semanticSlidesHtml,
  /<figure class="article-slides" data-count="2"><figcaption class="article-slides-title">连续扫描页<\/figcaption><div class="article-slides-track" role="region" aria-label="连续图版" tabindex="0">/u,
  "explicitly delimited ordered figures must become one scroll-snapping sequence"
);
assert.match(semanticSlidesHtml, /data-slide="1" data-total="2"/u);
assert.match(semanticSlidesHtml, /data-slide="2" data-total="2"/u);
assert.doesNotMatch(semanticSlidesHtml, /\[幻灯(?:结束)?\]/u);

const unmarkedFigureHtml = await renderMarkdown('![配图1](attachments/plate.png)');
assert.doesNotMatch(
  unmarkedFigureHtml,
  /<figure|<figcaption/u,
  "images without a 图题 marker must stay bare so placeholder alt text never becomes a caption"
);

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

const plainInterviewTurnHtml = await renderMarkdown(`莲实：请谈谈这个镜头。`, {
  format: "interview",
});
assert.match(
  plainInterviewTurnHtml,
  /<p class="speaker-turn"><strong>莲实：<\/strong>请谈谈这个镜头。<\/p>/u,
  "interview format must structure an unmarked speaker label without article-specific cleanup"
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
   违规而失败——[图题] 打错位置、非法 =NN% 宽度都会把字面标记静默渲染
   进页面。这里对 source/_posts 全量渲染一遍：任何图版/表格标记存活到
   输出即失败。形态同 reader-line-justification.spec.ts：枚举语料 →
   测量 → 断言失败清单为空。 */
{
  const fs = await import("node:fs");
  const path = await import("node:path");
  const postsDirectory = path.join(process.cwd(), "source", "_posts");
  const corpusFailures = [];
  const markerLeak = /\[(?:图题|图注|表题|表注|人物|人物简介|图组|图组结束|幻灯|幻灯结束)\]/u;
  const invalidWidth = /title="=(?!(?:25|33|50|66|75|100)%")[^"]*"/u;
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
    const html = await renderMarkdown(body);
    if (markerLeak.test(html)) {
      corpusFailures.push(`${name}: 图版/表格标记字面渲染进了页面（[图题]/[图注]/[表题]/[表注] 位置或格式有误）`);
    }
    const width = invalidWidth.exec(html);
    if (width) corpusFailures.push(`${name}: 非法图版宽度 ${width[0]}（仅允许 =25/33/50/66/75/100%）`);
    const malformedLink = malformedCjkHref.exec(html);
    if (malformedLink) corpusFailures.push(`${name}: 裸 URL 吞入了中文标点或后续正文`);
  }
  assert.deepEqual(
    corpusFailures,
    [],
    `全语料渲染扫描发现 ${corpusFailures.length} 处标记泄漏`
  );
  console.log(`corpus render scan passed for ${posts.length} posts`);
}

console.log("markdown typography verification passed");
