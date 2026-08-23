#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse, parseFragment } from "parse5";

const BLOCK_TAGS = new Set([
  "address", "article", "aside", "blockquote", "div", "dl", "fieldset",
  "figcaption", "figure", "footer", "h1", "h2", "h3", "h4", "h5", "h6",
  "header", "hr", "li", "main", "mp-common-blockquote", "nav", "ol", "p",
  "pre", "section", "table", "ul",
]);
const HIDDEN_TAGS = new Set(["script", "style", "noscript", "template"]);
const MEDIA_TAGS = new Set([
  "audio", "video", "iframe", "mp-common-clmusic", "mp-common-mpaudio",
  "mp-common-qqmusic", "mp-common-videosnap", "mp-video",
]);

function attrsOf(node) {
  return Object.fromEntries((node.attrs ?? []).map(({ name, value }) => [name.toLowerCase(), value]));
}

function styleOf(node) {
  return Object.fromEntries(String(attrsOf(node).style ?? "").split(";").flatMap((entry) => {
    const separator = entry.indexOf(":");
    if (separator < 0) return [];
    return [[entry.slice(0, separator).trim().toLowerCase(), entry.slice(separator + 1).trim().toLowerCase()]];
  }));
}

function hidden(node) {
  if (HIDDEN_TAGS.has(node.nodeName)) return true;
  const attrs = attrsOf(node);
  const style = styleOf(node);
  return "hidden" in attrs || attrs["aria-hidden"] === "true"
    || style.display === "none" || style.visibility === "hidden";
}

function serializeNode(node) {
  if (node.nodeName === "#text") return { type: "text", value: node.value };
  if (node.nodeName === "#comment") return { type: "comment", value: node.data ?? "" };
  return {
    type: "element",
    tag: node.nodeName,
    attrs: attrsOf(node),
    hidden: hidden(node),
    children: (node.childNodes ?? []).map(serializeNode),
  };
}

function escapeMarkdown(value) {
  return value.replace(/\\/gu, "\\\\").replace(/([`*_$])/gu, "\\$1");
}

function compactText(value) {
  return value.replace(/\u00a0/gu, " ").replace(/[\t\r\f\v ]+/gu, " ").replace(/ *\n */gu, "\n");
}

function trimInline(value) {
  return value.replace(/[ \t]+\n/gu, "\n").replace(/\n[ \t]+/gu, "\n").trim();
}

function textContent(node) {
  if (node.nodeName === "#text") return node.value;
  if (hidden(node)) return "";
  return (node.childNodes ?? []).map(textContent).join("");
}

function findArticleBody(root) {
  let found = null;
  const visit = (node) => {
    if (found) return;
    if (attrsOf(node).id === "js_content") {
      found = node;
      return;
    }
    for (const child of node.childNodes ?? []) visit(child);
  };
  visit(root);
  return found;
}

function imageSource(node) {
  const attrs = attrsOf(node);
  return attrs["data-src"] || attrs["data-original"] || attrs.src || "";
}

function imagePlacements(imageManifest) {
  if (Array.isArray(imageManifest)) return imageManifest;
  return imageManifest?.body ?? imageManifest?.images ?? [];
}

function makeContext(images, assetBase) {
  return {
    assetBase,
    images,
    unusedImages: new Set(images.map((_, index) => index)),
    imageOrdinal: 0,
    diagnostics: [],
    media: [],
  };
}

function placementForImage(node, ctx) {
  const source = imageSource(node);
  let index = ctx.images.findIndex((item, candidate) => (
    ctx.unusedImages.has(candidate) && source && [item.url, item.sourceUrl, item.src].includes(source)
  ));
  if (index < 0) index = [...ctx.unusedImages][0] ?? -1;
  if (index < 0) return null;
  ctx.unusedImages.delete(index);
  const placement = ctx.images[index];
  if (source && placement.url && source !== placement.url) {
    ctx.diagnostics.push({ kind: "image-url-difference", source, manifestUrl: placement.url });
  }
  return placement;
}

function renderImage(node, ctx) {
  ctx.imageOrdinal += 1;
  const placement = placementForImage(node, ctx);
  const source = imageSource(node);
  const attrs = attrsOf(node);
  const alt = compactText(attrs.alt || `微信正文插图 ${String(ctx.imageOrdinal).padStart(2, "0")}`).trim();
  if (!placement?.file) {
    ctx.diagnostics.push({ kind: "missing-image-placement", ordinal: ctx.imageOrdinal, source });
    return source ? `![${escapeMarkdown(alt)}](${source})` : `![${escapeMarkdown(alt)}]()`;
  }
  return `![${escapeMarkdown(alt)}](${ctx.assetBase}/${path.basename(placement.file)})`;
}

function isBold(node) {
  const weight = styleOf(node)["font-weight"] ?? "";
  return node.nodeName === "strong" || node.nodeName === "b"
    || weight === "bold" || weight === "bolder" || Number.parseInt(weight, 10) >= 600;
}

function isItalic(node) {
  return node.nodeName === "em" || node.nodeName === "i" || styleOf(node)["font-style"] === "italic";
}

function isStrike(node) {
  const style = styleOf(node);
  return ["del", "s", "strike"].includes(node.nodeName)
    || `${style["text-decoration"] ?? ""} ${style["text-decoration-line"] ?? ""}`.includes("line-through");
}

function renderMedia(node, ctx) {
  const record = { tag: node.nodeName, attrs: attrsOf(node), text: compactText(textContent(node)).trim() };
  const index = ctx.media.push(record);
  ctx.diagnostics.push({ kind: "media-requires-editor", index, tag: node.nodeName });
  return `<!-- wechat-media ${index}: ${node.nodeName} -->`;
}

function renderInline(node, ctx, marks = { bold: false, italic: false, strike: false }) {
  if (hidden(node)) return "";
  if (node.nodeName === "#text") return escapeMarkdown(compactText(node.value));
  if (node.nodeName === "#comment") return "";
  if (node.nodeName === "br") return "\n";
  if (node.nodeName === "img") return renderImage(node, ctx);
  if (MEDIA_TAGS.has(node.nodeName)) return renderMedia(node, ctx);

  const next = {
    bold: marks.bold || isBold(node),
    italic: marks.italic || isItalic(node),
    strike: marks.strike || isStrike(node),
  };
  let output = (node.childNodes ?? []).map((child) => renderInline(child, ctx, next)).join("");
  const content = trimInline(output);
  if (node.nodeName === "a") {
    const href = attrsOf(node).href ?? "";
    if (href && content) output = `[${content}](${href.replace(/\s/gu, "%20")})`;
  }
  if (content && next.bold && !marks.bold) output = `**${trimInline(output)}**`;
  if (content && next.italic && !marks.italic) output = `_${trimInline(output)}_`;
  if (content && next.strike && !marks.strike) output = `~~${trimInline(output)}~~`;
  if (content && (node.nodeName === "u" || styleOf(node)["text-decoration"]?.includes("underline"))) {
    output = `<u>${trimInline(output)}</u>`;
  }
  if (content && ["sup", "sub"].includes(node.nodeName)) {
    output = `<${node.nodeName}>${trimInline(output)}</${node.nodeName}>`;
  }
  return output;
}

function renderList(node, ctx, depth = 0) {
  const ordered = node.nodeName === "ol";
  let index = Number.parseInt(attrsOf(node).start ?? "1", 10) || 1;
  const lines = [];
  for (const item of (node.childNodes ?? []).filter((child) => child.nodeName === "li")) {
    const plain = (item.childNodes ?? []).filter((child) => !["ul", "ol"].includes(child.nodeName));
    const label = trimInline(plain.map((child) => BLOCK_TAGS.has(child.nodeName)
      ? renderBlocks(child, ctx).trim()
      : renderInline(child, ctx)).join(""));
    lines.push(`${"  ".repeat(depth)}${ordered ? `${index}.` : "-"} ${label}`.trimEnd());
    for (const nested of (item.childNodes ?? []).filter((child) => ["ul", "ol"].includes(child.nodeName))) {
      lines.push(renderList(nested, ctx, depth + 1).trimEnd());
    }
    index += 1;
  }
  return `${lines.join("\n")}\n\n`;
}

function tableRows(node) {
  const rows = [];
  const visit = (current) => {
    if (current.nodeName === "tr") {
      rows.push((current.childNodes ?? []).filter((child) => ["td", "th"].includes(child.nodeName)));
      return;
    }
    for (const child of current.childNodes ?? []) visit(child);
  };
  visit(node);
  return rows;
}

function renderTable(node, ctx) {
  const rows = tableRows(node).map((row) => row.map((cell) => trimInline(
    (cell.childNodes ?? []).map((child) => renderInline(child, ctx)).join(""),
  ).replace(/\|/gu, "\\|").replace(/\n/gu, "<br>")));
  const width = Math.max(0, ...rows.map((row) => row.length));
  if (!width || rows.some((row) => row.length !== width)) {
    ctx.diagnostics.push({ kind: "table-requires-editor", columns: rows.map((row) => row.length) });
    return `${trimInline(textContent(node))}\n\n`;
  }
  return [
    `| ${rows[0].join(" | ")} |`,
    `| ${rows[0].map(() => "---").join(" | ")} |`,
    ...rows.slice(1).map((row) => `| ${row.join(" | ")} |`),
    "",
    "",
  ].join("\n");
}

function renderContainer(node, ctx) {
  return (node.childNodes ?? []).map((child) => (
    BLOCK_TAGS.has(child.nodeName) || child.nodeName === "img" || MEDIA_TAGS.has(child.nodeName)
      ? renderBlocks(child, ctx)
      : renderInline(child, ctx)
  )).join("");
}

function renderBlocks(node, ctx) {
  if (hidden(node)) return "";
  if (node.nodeName === "#text") return node.value.trim() ? `${escapeMarkdown(compactText(node.value).trim())}\n\n` : "";
  if (node.nodeName === "#comment") return "";
  if (/^h[1-6]$/u.test(node.nodeName)) {
    const content = trimInline(renderContainer(node, ctx));
    return content ? `${"#".repeat(Number(node.nodeName[1]))} ${content}\n\n` : "";
  }
  if (["p", "figcaption"].includes(node.nodeName)) {
    const content = trimInline(renderContainer(node, ctx));
    return content ? `${content}\n\n` : "";
  }
  if (["blockquote", "mp-common-blockquote"].includes(node.nodeName)) {
    const content = renderContainer(node, ctx).trim();
    return content ? `${content.split("\n").map((line) => `> ${line}`).join("\n")}\n\n` : "";
  }
  if (["ul", "ol"].includes(node.nodeName)) return renderList(node, ctx);
  if (node.nodeName === "table") return renderTable(node, ctx);
  if (node.nodeName === "pre") return `\`\`\`\n${textContent(node).replace(/\n+$/u, "")}\n\`\`\`\n\n`;
  if (node.nodeName === "hr") return "---\n\n";
  if (node.nodeName === "img") return `${renderImage(node, ctx)}\n\n`;
  if (MEDIA_TAGS.has(node.nodeName)) return `${renderMedia(node, ctx)}\n\n`;
  return renderContainer(node, ctx);
}

export function convertWechatHtml({ rawHtml, bodyHtml, images = [], assetBase = "attachments/wechat/unknown" }) {
  const document = rawHtml ? parse(rawHtml, { sourceCodeLocationInfo: true }) : null;
  const body = document ? findArticleBody(document) : parseFragment(bodyHtml ?? "", { sourceCodeLocationInfo: true });
  if (!body) throw new Error("WeChat article body #js_content was not found");
  const ctx = makeContext(imagePlacements(images), assetBase);
  const markdown = `${renderContainer(body, ctx).replace(/[ \t]+$/gmu, "").replace(/\n{3,}/gu, "\n\n").trim()}\n`;
  if (ctx.unusedImages.size) {
    ctx.diagnostics.push({ kind: "unused-image-placements", indexes: [...ctx.unusedImages] });
  }
  return {
    markdown,
    ir: {
      schema: "wechat-syntax-ir.v1",
      body: serializeNode(body),
      diagnostics: ctx.diagnostics,
      media: ctx.media,
      stats: {
        bodyImages: ctx.imageOrdinal,
        manifestImages: ctx.images.length,
      },
    },
  };
}

function main() {
  const [sourceDirArg, outputPrefixArg, assetBaseArg] = process.argv.slice(2);
  if (!sourceDirArg || !outputPrefixArg) {
    throw new Error("usage: convert-wechat-html.mjs SOURCE_DIR OUTPUT_PREFIX [ASSET_BASE]");
  }
  const sourceDir = path.resolve(sourceDirArg);
  const outputPrefix = path.resolve(outputPrefixArg);
  const sourceId = path.basename(sourceDir).replace(/^\d+-/u, "");
  const rawFile = path.join(sourceDir, "raw.html");
  const bodyFile = path.join(sourceDir, "body.html");
  const imageFile = path.join(sourceDir, "images.json");
  const result = convertWechatHtml({
    rawHtml: fs.existsSync(rawFile) ? fs.readFileSync(rawFile, "utf8") : "",
    bodyHtml: fs.existsSync(bodyFile) ? fs.readFileSync(bodyFile, "utf8") : "",
    images: fs.existsSync(imageFile) ? JSON.parse(fs.readFileSync(imageFile, "utf8")) : [],
    assetBase: assetBaseArg ?? `attachments/wechat/${sourceId}`,
  });
  fs.mkdirSync(path.dirname(outputPrefix), { recursive: true });
  fs.writeFileSync(`${outputPrefix}.md`, result.markdown);
  fs.writeFileSync(`${outputPrefix}.ir.json`, `${JSON.stringify(result.ir, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({ outputPrefix, ...result.ir.stats, diagnostics: result.ir.diagnostics.length })}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
