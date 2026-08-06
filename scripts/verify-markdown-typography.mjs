import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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

const unmarkedFigureHtml = await renderMarkdown('![配图1](attachments/plate.png)');
assert.doesNotMatch(
  unmarkedFigureHtml,
  /<figure|<figcaption/u,
  "images without a 图题 marker must stay bare so placeholder alt text never becomes a caption"
);

const ladejinskySource = await readFile(
  new URL("../source/_posts/ladejinsky-agrarian-reform-as-unfinished-business.md", import.meta.url),
  "utf8"
);
assert.match(ladejinskySource, /^subtitle: 雷正琪文选$/mu, "the selected-papers subtitle must use 雷正琪");
assert.match(ladejinskySource, /^translator: 王揆$/mu, "the selected-papers byline must credit 王揆");
assert.match(
  ladejinskySource,
  /^## 日本人土地所有权上升$/mu,
  "the Japanese land-ownership line must be a second-level section heading"
);
assert.equal(
  (ladejinskySource.match(/^\[表题\]/gmu) ?? []).length,
  5,
  "every published table in the selected papers must have an indexed caption"
);
assert.doesNotMatch(
  ladejinskySource,
  /\d{1,3}(?:,\d{3})+/u,
  "Arabic numerals in the selected papers must use four-digit grouping rather than commas"
);
assert.doesNotMatch(
  ladejinskySource,
  /英亩|英里|蒲式耳|英尺|英寸|盎司/u,
  "imperial measurements in the selected papers must be converted to Han land units or metric units"
);
assert.match(
  ladejinskySource,
  /每3\.8公斤日元10元6角[^\n]+每3\.8公斤日元5元7角/u,
  "fractional yen amounts must use the 日元X元Y角 convention"
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

console.log("markdown typography verification passed");
