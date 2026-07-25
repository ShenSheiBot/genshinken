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

console.log("markdown typography verification passed");
