import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  matchSourceTextBlocks,
  markdownScopeForSource,
  mergeBodyImages,
  normalizeSourceBlock,
  buildArticle,
  semanticMediaSourceOrder,
  splitMarkdownFootnotes,
  sourceIdsForPost,
  primarySourceIdForPost,
  extractPostPayloadBody,
  sourceEvents,
  newReviewedOmissionHashes,
  uncoveredSourceIds,
} from "../scripts/manage-wechat-preservation.mjs";

test("merged WeChat chapters match only inside their own canonical h2 boundary", () => {
  const markdown = [
    '<h2 id="chapter-one">第一章</h2>',
    '![第一章图](attachments/wechat/source-one/001.jpg)',
    '同上。',
    '第一章末尾。',
    '<h2 id="chapter-two">第二章</h2>',
    '![第二章图](attachments/wechat/source-two/001.jpg)',
    '第二章正文必须在自己的范围内匹配。',
    '<h2 id="chapter-three">第三章</h2>',
    '![第三章图](attachments/wechat/source-three/001.jpg)',
  ].join('\n\n');

  const scope = markdownScopeForSource(markdown, "source-two", 3);
  assert.match(scope, /chapter-two/u);
  assert.match(scope, /第二章正文必须在自己的范围内匹配/u);
  assert.doesNotMatch(scope, /第一章末尾/u);
  assert.doesNotMatch(scope, /chapter-three/u);
});

function omissionManifest(sourceId, hashes, post = "source/_posts/example.md") {
  return {
    schemaVersion: 2,
    articles: [{
      post,
      sourceContracts: [{
        sourceId,
        sourceText: { reviewedOmissionSha256: hashes },
      }],
    }],
  };
}

test("an unchanged reviewed omission remains accepted by its source hash", () => {
  const previous = omissionManifest("source-a", ["hash-a"]);
  const next = omissionManifest("source-a", ["hash-a"]);
  assert.deepEqual(newReviewedOmissionHashes(previous, next), []);
});

test("a newly omitted block is not covered by prior omission approval", () => {
  const previous = omissionManifest("source-a", ["hash-a"]);
  const next = omissionManifest("source-a", ["hash-a", "hash-b"]);
  assert.deepEqual(newReviewedOmissionHashes(previous, next), [{
    post: "source/_posts/example.md",
    sourceId: "source-a",
    hashes: ["hash-b"],
  }]);
});

test("restoring a previously omitted block does not require approval", () => {
  const previous = omissionManifest("source-a", ["hash-a", "hash-b"]);
  const next = omissionManifest("source-a", ["hash-a"]);
  assert.deepEqual(newReviewedOmissionHashes(previous, next), []);
});

test("omissions from a newly published source require explicit review", () => {
  const previous = omissionManifest("source-a", ["hash-a"]);
  const next = omissionManifest("source-b", ["hash-c"], "source/_posts/new.md");
  assert.deepEqual(newReviewedOmissionHashes(previous, next), [{
    post: "source/_posts/new.md",
    sourceId: "source-b",
    hashes: ["hash-c"],
  }]);
});

test("semantic profile syntax preserves the rendered source order", () => {
  const ordered = semanticMediaSourceOrder(
    "[人物] 某人\n![肖像](attachments/wechat/source/portrait.jpg \"=25%\")\n[人物简介] 某人的简介。",
  );
  assert.ok(ordered.indexOf("![肖像]") < ordered.indexOf("[人物]"));
  assert.ok(ordered.indexOf("[人物]") < ordered.indexOf("[人物简介]"));
});

test("semantic figure captions retain source image-then-caption order", () => {
  const ordered = semanticMediaSourceOrder(
    "[图题] Alexander Zahlten：The End of Japanese Cinema Industrial Genres, National Times, and Media Ecologies。\n"
      + "![黄色书封](attachments/wechat/source/book.jpg)",
  );
  assert.ok(ordered.indexOf("![黄色书封]") < ordered.indexOf("[图题]"));
});

test("a WeChat attachment identifies source provenance when citation points to the original publication", () => {
  const sourceId = "701WNiZMyw2lJi7Apx5xEQ";
  const post = `---\ncitation:\n  url: https://muse.jhu.edu/article/368616\n---\n\n![图](attachments/wechat/${sourceId}/001.jpg)`;
  assert.equal(primarySourceIdForPost(post, new Set([sourceId])), sourceId);
});

test("a short WeChat post payload is decoded independently from raw HTML", () => {
  const raw = "content_noencode: '第一行\\x0a第二行\\x26amp;更多', create_time: '2024-01-01'";
  assert.equal(
    extractPostPayloadBody(raw),
    '<div id="js_content"><p>第一行</p><p>第二行&amp;更多</p></div>',
  );
});

test("short post lines remain independently verifiable source events", () => {
  const body = '<div id="js_content"><p>《零零年代的想象力》</p><p>《动物化的后现代》</p><p>值得一读。</p></div>';
  const events = sourceEvents(body);
  assert.deepEqual(events.map(({ type, value }) => [type, value]), [
    ["text", "《零零年代的想象力》"],
    ["text", "《动物化的后现代》"],
    ["text", "值得一读。"],
  ]);
});

test("every source note must be published or have a reviewed disposition", () => {
  assert.deepEqual(
    uncoveredSourceIds(
      new Set(["published", "duplicate", "missing"]),
      new Set(["published"]),
      [{ sourceId: "duplicate" }],
    ),
    ["missing"],
  );
});

test("merged canonical posts expose all source asset groups", () => {
  assert.deepEqual(
    sourceIdsForPost(
      "citation: https://mp.weixin.qq.com/s/primary\n\n"
        + "![上](attachments/wechat/primary/001.png)\n"
        + "![下](attachments/wechat/secondary/001.png)",
      "primary",
    ),
    ["primary", "secondary"],
  );
});

test("merged source contracts validate body images as one ordered union", () => {
  assert.deepEqual(
    mergeBodyImages([
      { sourceId: "primary", images: { body: [{ placementIndex: 1, sha256: "a" }] } },
      { sourceId: "secondary", images: { body: [{ placementIndex: 1, sha256: "b" }, { placementIndex: 2, sha256: "c" }] } },
    ]),
    [
      { sourceId: "primary", placementIndex: 1, sha256: "a" },
      { sourceId: "secondary", placementIndex: 1, sha256: "b" },
      { sourceId: "secondary", placementIndex: 2, sha256: "c" },
    ],
  );
});

test("EVA 0053 and 0054 validate as one canonical image contract", () => {
  const relative = "source/_posts/eva-subject-punishment-freedom.md";
  const article = buildArticle({
    primarySourceId: "7Xru7YVhciDU1Rc5q0246w",
    sourceIds: ["7Xru7YVhciDU1Rc5q0246w", "-DLlcdtQYm6QfGpbiRl3tw"],
    post: { relative, source: fs.readFileSync(relative, "utf8") },
  }, true);
  assert.deepEqual(article.sourceContracts.map(({ sourceId, bodyImages }) => [sourceId, bodyImages.length]), [
    ["7Xru7YVhciDU1Rc5q0246w", 21],
    ["-DLlcdtQYm6QfGpbiRl3tw", 58],
  ]);
  assert.equal(article.bodyImages.length, 79);
  assert.equal(article.retainedImages.length, 79);
});

test("footnote definitions moved to the end do not consume the body-order cursor", () => {
  const blocks = [
    { type: "text", index: 0, normalized: "正文第一段保留足够长度", value: "正文第一段保留足够长度" },
    { type: "text", index: 1, normalized: "来源中的第一条注释定义", value: "1. 来源中的第一条注释定义" },
    { type: "text", index: 2, normalized: "脚注之后的正文仍然保留", value: "脚注之后的正文仍然保留" },
  ];
  const markdown = [
    "正文第一段保留足够长度[^note-1]",
    "",
    "脚注之后的正文仍然保留",
    "",
    "[^note-1]: 来源中的第一条注释定义",
  ].join("\n");

  const result = matchSourceTextBlocks(blocks, markdown);
  assert.deepEqual(result.retainedBlocks.map(({ index }) => index), [0, 2]);
  assert.deepEqual(result.footnoteBlocks.map(({ index, footnoteId }) => [index, footnoteId]), [[1, "note-1"]]);
  assert.deepEqual(result.omittedBlocks, []);
});

test("ordinary body reordering is still reported rather than hidden by unordered matching", () => {
  const blocks = [
    { type: "text", index: 0, normalized: "来源正文第一段有明确顺序", value: "来源正文第一段有明确顺序" },
    { type: "text", index: 1, normalized: "来源正文第二段不可提前", value: "来源正文第二段不可提前" },
  ];
  const markdown = "来源正文第二段不可提前\n\n来源正文第一段有明确顺序";

  const result = matchSourceTextBlocks(blocks, markdown);
  assert.deepEqual(result.retainedBlocks.map(({ index }) => index), [0]);
  assert.deepEqual(result.footnoteBlocks, []);
  assert.deepEqual(result.omittedBlocks.map(({ index }) => index), [1]);
});

test("multiline GFM definitions are separated from the public body", () => {
  const split = splitMarkdownFootnotes([
    "正文。",
    "",
    "[^a]: 第一行",
    "    第二行",
    "",
    "[^b]: 另一条。",
  ].join("\n"));

  assert.equal(split.body.trim(), "正文。");
  assert.deepEqual(split.definitions, [
    { id: "a", text: "第一行\n第二行" },
    { id: "b", text: "另一条。" },
  ]);
});

test("numeric source definitions match their renamed GFM definitions", () => {
  const result = matchSourceTextBlocks(
    [{ type: "text", index: 1, normalized: ":来源注释内容", value: "[1]:来源注释内容" }],
    "正文。\n\n[^article-1]: 来源注释内容",
  );
  assert.deepEqual(result.footnoteBlocks.map(({ index, footnoteId }) => [index, footnoteId]), [[1, "article-1"]]);
  assert.deepEqual(result.omittedBlocks, []);
});

test("source superscript note calls normalize like GFM calls", () => {
  assert.equal(
    normalizeSourceBlock("正文在这里继续。¹²"),
    normalizeSourceBlock("正文在这里继续。[^note-12]"),
  );
  assert.equal(
    normalizeSourceBlock("正文在这里继续。［12］【译注13】"),
    normalizeSourceBlock("正文在这里继续。[^note-12][^translation-13]"),
  );
});

test("serialized HTML entities normalize like public Markdown text", () => {
  assert.equal(normalizeSourceBlock("Rowman &amp; Littlefield"), normalizeSourceBlock("Rowman & Littlefield"));
  assert.equal(normalizeSourceBlock("<原文标题>"), normalizeSourceBlock("\\<原文标题\\>"));
  assert.equal(normalizeSourceBlock("a|b"), normalizeSourceBlock("a\\|b"));
  assert.equal(normalizeSourceBlock("这一句，raw 与 public 的标点不同。"), normalizeSourceBlock("这一句。raw 与 public 的标点不同，"));
});

test("semantic inline HTML does not turn preserved prose into an omission", () => {
  const source = "我在班上体验到的快乐其实在每一所学校都会发生";
  const result = matchSourceTextBlocks(
    [{ type: "text", index: 0, normalized: normalizeSourceBlock(source), value: source }],
    "我在班上体验到的<strong><u>快乐其实在每一所学校</u></strong>都会发生。",
  );
  assert.deepEqual(result.retainedBlocks.map(({ index }) => index), [0]);
  assert.deepEqual(result.omittedBlocks, []);
});

test("escaped angle-bracket titles in footnotes are not mistaken for HTML tags", () => {
  const source = "2. 作者：<电影音乐：交互的视听方式>，第15卷";
  const result = matchSourceTextBlocks(
    [{ type: "text", index: 0, normalized: normalizeSourceBlock(source), value: source }],
    "正文。[^ref]\n\n[^ref]: 作者：\\<电影音乐：交互的视听方式\\>，第15卷。",
  );
  assert.deepEqual(result.footnoteBlocks.map(({ index }) => index), [0]);
  assert.deepEqual(result.omittedBlocks, []);
});

test("HTML list bullets and Markdown link schemes are representation-only", () => {
  assert.equal(normalizeSourceBlock("l爱幻想并且自我评价高过实际的印象。"), normalizeSourceBlock("爱幻想并且自我评价高过实际的印象。"));
  assert.equal(normalizeSourceBlock("l·跟音乐非常合拍"), normalizeSourceBlock("·跟音乐非常合拍"));
  assert.equal(normalizeSourceBlock("example.com/article/10033/"), normalizeSourceBlock("https://example.com/article/10033/"));
  assert.notEqual(normalizeSourceBlock("loundraw 的作品"), normalizeSourceBlock("oundraw 的作品"));
});

test("Markdown link destinations do not split source prose matching", () => {
  const result = matchSourceTextBlocks(
    [{ type: "text", index: 0, normalized: normalizeSourceBlock("参见《来源书》第一章"), value: "参见《来源书》第一章" }],
    "[^ref]: 参见[《来源书》第一章](https://example.com/source)。",
  );
  assert.deepEqual(result.footnoteBlocks.map(({ index, footnoteId }) => [index, footnoteId]), [[0, "ref"]]);
  assert.deepEqual(result.omittedBlocks, []);
});

test("public Markdown links do not hide a following WeChat image marker", () => {
  const relative = "source/_posts/otsuka-otaku-conversion-literature.md";
  const article = buildArticle({
    primarySourceId: "J4JQxeh3FbTH3iOytm2i0Q",
    sourceIds: ["J4JQxeh3FbTH3iOytm2i0Q"],
    post: { relative, source: fs.readFileSync(relative, "utf8") },
  }, true);
  assert.equal(article.bodyImages.length, 10);
  assert.equal(article.retainedImages.length, 10);
});

test("circled source note calls normalize like GFM calls", () => {
  assert.equal(normalizeSourceBlock("引文说明①和第二处②"), normalizeSourceBlock("引文说明[^a]和第二处[^b]"));
});

test("source metadata already represented in front matter is not an omission", () => {
  const result = matchSourceTextBlocks(
    [{ type: "text", index: 0, normalized: normalizeSourceBlock("原作者：保罗·欧康（Paul Ocone）"), value: "原作者：保罗·欧康（Paul Ocone）" }],
    "正文内容足够长且已经公开。",
    { post_author: "保罗·欧康", citation: { extra: "原作者：保罗·欧康（Paul Ocone）" } },
  );
  assert.deepEqual(result.structuredBlocks.map(({ index }) => index), [0]);
  assert.deepEqual(result.omittedBlocks, []);
});

test("source metadata labels may change when the value is preserved in citation", () => {
  const result = matchSourceTextBlocks(
    [{ type: "text", index: 0, normalized: normalizeSourceBlock("文章原名：Original title"), value: "文章原名：Original title" }],
    "正文内容足够长且已经公开。",
    { citation: { extra: "原文题名：Original title" } },
  );
  assert.deepEqual(result.structuredBlocks.map(({ index }) => index), [0]);
  assert.deepEqual(result.omittedBlocks, []);
});

test("a source license block with appended platform notice is covered by structured license", () => {
  const result = matchSourceTextBlocks(
    [{
      type: "text",
      index: 0,
      normalized: normalizeSourceBlock("文章基于 CC BY-NC-SA 4.0 发布，仅供学习；欢迎投稿"),
      value: "文章基于 CC BY-NC-SA 4.0 发布，仅供学习；欢迎投稿",
    }],
    "正文内容足够长且已经公开。",
    { license: "CC BY-NC-SA 4.0" },
  );
  assert.deepEqual(result.structuredBlocks.map(({ index }) => index), [0]);
  assert.deepEqual(result.omittedBlocks, []);
});

test("a source license block labeled 本文基于 is covered by structured license", () => {
  const result = matchSourceTextBlocks(
    [{
      type: "text",
      index: 0,
      normalized: normalizeSourceBlock("本文基于 CC BY-NC-SA 4.0 发布，仅供学习"),
      value: "本文基于 CC BY-NC-SA 4.0 发布，仅供学习",
    }],
    "正文内容足够长且已经公开。",
    { license: "CC BY-NC-SA 4.0" },
  );
  assert.deepEqual(result.structuredBlocks.map(({ index }) => index), [0]);
  assert.deepEqual(result.omittedBlocks, []);
});
