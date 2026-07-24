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

const rareHanHtml = await renderMarkdown(`小\u4337应使用稳定的单字字体回退。`);
assert.ok(
  rareHanHtml.includes(`<span class="rare-han">\u4337</span>`),
  "U+4337 must be wrapped for the cross-platform rare Han fallback"
);

console.log("markdown typography verification passed");
