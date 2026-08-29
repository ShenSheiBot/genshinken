import assert from "node:assert/strict";
import test from "node:test";
import { convertWechatHtml } from "../scripts/convert-wechat-html.mjs";

test("converter preserves credits, promotional-looking prose, and every image", () => {
  const rawHtml = `<html><body><div id="js_content">
    <p><strong>翻译：甲；校对：乙。</strong></p>
    <p>本文基于CC BY-NC-SA 4.0发布，如侵犯你的布尔乔亚法权……</p>
    <p><img data-src="https://img.test/a" alt="二维码"></p>
  </div></body></html>`;
  const result = convertWechatHtml({
    rawHtml,
    images: [{ url: "https://img.test/a", file: "assets/001.png" }],
    assetBase: "attachments/wechat/example",
  });
  assert.match(result.markdown, /\*\*翻译：甲；校对：乙。\*\*/u);
  assert.match(result.markdown, /本文基于CC BY-NC-SA 4\.0发布/u);
  assert.match(result.markdown, /!\[二维码\]\(attachments\/wechat\/example\/001\.png\)/u);
  assert.equal(result.ir.stats.bodyImages, 1);
});

test("presentational font size and borders do not invent headings or quotations", () => {
  const result = convertWechatHtml({ bodyHtml: `
    <p style="font-size:28px">Large text is still a paragraph.</p>
    <p style="border-left:3px solid #000">Bordered text is still a paragraph.</p>
    <blockquote><p>Only this is a quotation.</p></blockquote>
  ` });
  assert.doesNotMatch(result.markdown, /^#\s/mu);
  assert.match(result.markdown, /^Large text is still a paragraph\.$/mu);
  assert.match(result.markdown, /^Bordered text is still a paragraph\.$/mu);
  assert.match(result.markdown, /^> Only this is a quotation\.$/mu);
});

test("embedded media is never silently discarded", () => {
  const result = convertWechatHtml({ bodyHtml: `<p>Before.</p><mp-common-qqmusic music_name="Track"></mp-common-qqmusic><p>After.</p>` });
  assert.match(result.markdown, /wechat-media 1: mp-common-qqmusic/u);
  assert.deepEqual(result.ir.media, [{ tag: "mp-common-qqmusic", attrs: { music_name: "Track" }, text: "" }]);
  assert.ok(result.ir.diagnostics.some((item) => item.kind === "media-requires-editor"));
});

test("adjacent top-level sections remain separate Markdown blocks", () => {
  const result = convertWechatHtml({ bodyHtml: `
    <section><span>第一段。</span></section>
    <section><span>第二段。</span></section>
    <section><p>第三段。</p><p>第四段。</p></section>
  ` });

  assert.equal(result.markdown, "第一段。\n\n第二段。\n\n第三段。\n\n第四段。\n");
});
