import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import sanitizeHtml from "sanitize-html";
import { decodeHTML } from "entities";

const root = process.cwd();
const archiveRoot = path.join(root, ".local-archive", "wechat-full", "articles");
const postsRoot = path.join(root, "source", "_posts");
const assetsRoot = path.join(root, "public", "attachments", "wechat");
const notesRoot = path.join(root, "editorial-sources", "wechat");
const manifestPath = path.join(notesRoot, "preservation-manifest.json");
const dispositionsPath = path.join(notesRoot, "source-dispositions.json");
const imagePattern = /attachments\/wechat\/([^\s)"']+)/gu;
const sourceUrlPattern = /https:\/\/mp\.weixin\.qq\.com\/s\/([A-Za-z0-9_-]+)/u;

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function readJson(filename) {
  return JSON.parse(fs.readFileSync(filename, "utf8"));
}

function extractArticleBody(rawHtml) {
  const opening = /<div[^>]+id=["']js_content["'][^>]*>/iu.exec(rawHtml);
  invariant(opening, "raw.html does not contain #js_content");
  const start = opening.index + opening[0].length;
  let depth = 1;
  const divPattern = /<\/?div\b[^>]*>/giu;
  divPattern.lastIndex = start;
  for (let token = divPattern.exec(rawHtml); token; token = divPattern.exec(rawHtml)) {
    depth += token[0].toLowerCase().startsWith("</") ? -1 : 1;
    if (depth === 0) return rawHtml.slice(start, token.index);
  }
  throw new Error("raw.html has no closing div for #js_content");
}

export function extractPostPayloadBody(rawHtml) {
  const match = /\bcontent_noencode:\s*'((?:\\.|[^'\\])*)'/u.exec(rawHtml);
  invariant(match, "raw.html does not contain content_noencode");
  const decoded = match[1]
    .replace(/\\x([0-9a-f]{2})/giu, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)))
    .replace(/\\u([0-9a-f]{4})/giu, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)))
    .replace(/\\([\\'])/gu, "$1");
  const paragraphs = decoded.split(/\\n|\r?\n/gu).map((line) => `<p>${line}</p>`).join("");
  return `<div id="js_content">${paragraphs}</div>`;
}

export function normalizeSourceBlock(value) {
  return decodeHTML(value)
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]+/gu, "")
    .replace(/［\d+］/gu, "")
    .replace(/【译注\d+】/gu, "")
    .replace(/[\u2460-\u2473\u3251-\u325f\u32b1-\u32bf]/gu, "")
    .normalize("NFKC")
    .replace(/\\([<>\[\]|])/gu, "$1")
    .replace(/^l(?=[\u3400-\u9fff“‘·])/u, "")
    .replace(/https?:\/\//giu, "")
    .replace(/\s+/gu, "")
    .replace(/\[\^?[^\]]+\]/gu, "")
    .replace(/^(?:\[\d+\]|\d+[.、])/u, "")
    .replace(/[\p{P}\p{S}]/gu, "");
}

export function sourceEvents(bodyHtml, options = {}) {
  const minimumNormalizedLength = options.minimumNormalizedLength ?? 1;
  let imageIndex = 0;
  const separated = bodyHtml
    .replace(/<img\b[^>]*>/giu, () => `\nWXIMAGE${imageIndex += 1}TOKEN\n`)
    .replace(/<br\b[^>]*>/giu, "\n")
    .replace(/<\/(?:p|h[1-6]|li|blockquote|section|div|tr|table)>/giu, "\n");
  let textIndex = 0;
  return sanitizeHtml(separated, { allowedTags: [], allowedAttributes: {} })
    .split(/\n+/u)
    .map((value) => value.replace(/\s+/gu, " ").trim())
    .filter(Boolean)
    .flatMap((value) => value.split(/(WXIMAGE\d+TOKEN)/u).filter(Boolean))
    .map((value) => {
      const image = /^WXIMAGE(\d+)TOKEN$/u.exec(value);
      if (image) return { type: "image", placementIndex: Number(image[1]) };
      const event = { type: "text", index: textIndex, normalized: normalizeSourceBlock(value), value };
      textIndex += 1;
      return event;
    })
    .filter((event) => event.type === "image" || event.normalized.length >= minimumNormalizedLength);
}

function publicSearchText(markdownBody) {
  return normalizeSourceBlock(
    markdownBody
      .replace(/!\[[^\]]*\]\([^)]*\)/gu, "")
      .replace(/\[([^\]]+)\]\([^)]*\)/gu, "$1")
      // Only remove tags supported by the article renderer. Escaped angle-bracket
      // titles such as \<电影音乐\> are prose, not arbitrary HTML.
      .replace(/<\/?(?:a|blockquote|br|code|del|div|em|figcaption|figure|h[1-6]|li|mark|ol|p|s|section|small|span|strong|sub|sup|table|tbody|td|th|thead|tr|u|ul)\b[^>]*>/giu, ""),
  );
}

export function splitMarkdownFootnotes(markdownBody) {
  const bodyLines = [];
  const definitions = [];
  const lines = markdownBody.split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    const match = /^\[\^([^\]]+)\]:\s*(.*)$/u.exec(lines[index]);
    if (!match) {
      bodyLines.push(lines[index]);
      continue;
    }
    const chunks = [match[2]];
    while (index + 1 < lines.length) {
      if (/^(?: {2,}|\t)\S/u.test(lines[index + 1])) {
        index += 1;
        chunks.push(lines[index].trim());
        continue;
      }
      if (lines[index + 1].trim() === ""
        && index + 2 < lines.length
        && /^(?: {2,}|\t)\S/u.test(lines[index + 2])) {
        index += 2;
        chunks.push(lines[index].trim());
        continue;
      }
      break;
    }
    definitions.push({ id: match[1], text: chunks.join("\n") });
  }
  return { body: bodyLines.join("\n"), definitions };
}

function structuredMetadataText(data) {
  const values = [];
  const visit = (value, key = "") => {
    if (typeof value === "string") {
      values.push(`${key}:${value}`, value);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item) => visit(item, key));
      return;
    }
    if (value && typeof value === "object") {
      Object.entries(value).forEach(([childKey, childValue]) => visit(childValue, childKey));
    }
  };
  visit(data);
  return normalizeSourceBlock(values.join("\n"));
}

function isStructuredMetadataBlock(value) {
  return /^(?:文章)?(?:原名|出处|原(?:作者|文|刊|作|载)|作者|译者|校对|编译|来源|(?:文章|本文)基于|许可|翻译|转载|出版|发布日期|译注)/u.test(value.trim())
    || /^https?:\/\//u.test(value.trim());
}

function structuredMetadataMatch(block, structuredText) {
  if (!structuredText || !isStructuredMetadataBlock(block.value)) return false;
  if (structuredText.includes(block.normalized)) return true;
  const payload = block.value.trim().replace(/^[^:：]{1,24}[:：]\s*/u, "");
  if (payload !== block.value.trim() && structuredText.includes(normalizeSourceBlock(payload))) return true;
  if (/^(?:文章|本文)基于/iu.test(block.value.trim())) {
    const license = block.value.match(/\b(?:CC\s+BY(?:-NC)?(?:-SA)?\s*\d(?:\.\d)?)\b/iu)?.[0];
    return Boolean(license && structuredText.includes(normalizeSourceBlock(license)));
  }
  return false;
}

export function matchSourceTextBlocks(blocks, markdownBody, structuredData = undefined) {
  const split = splitMarkdownFootnotes(markdownBody);
  const bodyText = publicSearchText(split.body);
  const structuredText = structuredData === undefined
    ? ""
    : typeof structuredData === "string"
      ? normalizeSourceBlock(structuredData)
      : structuredMetadataText(structuredData);
  const definitionTexts = split.definitions.map(({ id, text }) => ({
    id,
    normalized: publicSearchText(text),
  }));
  let bodyCursor = 0;
  const retainedBlocks = [];
  const footnoteBlocks = [];
  const structuredBlocks = [];
  const omittedBlocks = [];
  for (const block of blocks) {
    const publicIndex = bodyText.indexOf(block.normalized, bodyCursor);
    if (publicIndex >= 0) {
      retainedBlocks.push({ ...block, publicIndex });
      bodyCursor = publicIndex + block.normalized.length;
      continue;
    }
    const footnote = definitionTexts.find(({ normalized }) => normalized.includes(block.normalized.replace(/^:\s*/u, "")));
    if (footnote) {
      footnoteBlocks.push({ ...block, footnoteId: footnote.id });
      continue;
    }
    if (structuredMetadataMatch(block, structuredText)) {
      structuredBlocks.push(block);
      continue;
    }
    omittedBlocks.push(block);
  }
  return { retainedBlocks, footnoteBlocks, structuredBlocks, omittedBlocks };
}

export function markdownScopeForSource(markdownBody, sourceId, mergedSourceCount = 1) {
  if (mergedSourceCount <= 1) return markdownBody;
  const assetNeedle = `attachments/wechat/${sourceId}/`;
  const assetIndex = markdownBody.indexOf(assetNeedle);
  if (assetIndex < 0) return markdownBody;
  const chapterPattern = /^<h2\s+id=["'][^"']+["'][^>]*>/gimu;
  let start = 0;
  let next = markdownBody.length;
  for (const match of markdownBody.matchAll(chapterPattern)) {
    if (match.index <= assetIndex) {
      start = match.index;
      continue;
    }
    next = match.index;
    break;
  }
  return markdownBody.slice(start, next);
}

export function semanticMediaSourceOrder(markdownBody) {
  return markdownBody
    .replace(
      /^(\[人物\][^\n]*)\n(?:[ \t]*\n)*(!\[[^\n]*\]\([^\n]*\))\n(?:[ \t]*\n)*(\[人物简介\][^\n]*)$/gmu,
      "$2\n$1\n$3",
    )
    .replace(
      /^(\[图题\][^\n]*)\n(?:[ \t]*\n)*(!\[[^\n]*\]\([^\n]*\))$/gmu,
      "$2\n$1",
    );
}

function publicEventText(markdownBody) {
  let imageIndex = 0;
  return normalizeSourceBlock(
    semanticMediaSourceOrder(markdownBody)
      .replace(imagePattern, () => `WXIMAGE${imageIndex += 1}TOKEN`)
      .replace(/(?<!!)\[([^\]]+)\]\([^)]*\)/gu, "$1")
      .replace(/^\[\^[^\]]+\]:\s*/gmu, "")
      .replace(/<[^>]*(WXIMAGE\d+TOKEN)[^>]*>/gu, "$1")
      .replace(/<\/?(?:a|blockquote|br|code|del|div|em|figcaption|figure|h[1-6]|li|mark|ol|p|s|section|small|span|strong|sub|sup|table|tbody|td|th|thead|tr|u|ul)\b[^>]*>/giu, ""),
  );
}

function isImageAnchorBlock(event) {
  return event.type === "text"
    && event.normalized.length >= 80
    && !/^\[\d+\]/u.test(event.value);
}

function markdownFootnotes(markdownBody) {
  const definitions = [];
  const definitionIds = new Set();
  const lines = markdownBody.split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    const match = /^\[\^([^\]]+)\]:\s*(.*)$/u.exec(lines[index]);
    if (!match) continue;
    const chunks = [match[2]];
    while (index + 1 < lines.length && /^(?: {2,}|\t)\S/u.test(lines[index + 1])) {
      index += 1;
      chunks.push(lines[index].trim());
    }
    definitionIds.add(match[1]);
    definitions.push({ id: match[1], definition: chunks.join("\n") });
  }

  const calls = new Map();
  for (const match of markdownBody.matchAll(/\[\^([^\]]+)\]/gu)) {
    calls.set(match[1], (calls.get(match[1]) ?? 0) + 1);
  }
  for (const id of definitionIds) calls.set(id, (calls.get(id) ?? 0) - 1);

  return definitions.map(({ id, definition }) => {
    const callCount = calls.get(id) ?? 0;
    invariant(callCount > 0, `footnote ${id} has a definition but no call`);
    return {
      id,
      calls: callCount,
      definitionSha256: sha256(definition.normalize("NFC")),
    };
  });
}

function findArchiveDirectory(sourceId) {
  invariant(fs.existsSync(archiveRoot), `missing ignored WeChat archive: ${archiveRoot}`);
  const matches = fs.readdirSync(archiveRoot).filter((name) => name.endsWith(`-${sourceId}`));
  invariant(matches.length === 1, `expected one archive directory for ${sourceId}, found ${matches.length}`);
  return path.join(archiveRoot, matches[0]);
}

function postSources() {
  return fs.readdirSync(postsRoot)
    .filter((name) => name.endsWith(".md"))
    .map((name) => {
      const pathname = path.join(postsRoot, name);
      return { pathname, relative: path.relative(root, pathname).replaceAll("\\", "/"), source: fs.readFileSync(pathname, "utf8") };
    });
}

export function sourceIdsForPost(postSource, primarySourceId) {
  const sourceIds = new Set([primarySourceId]);
  for (const match of postSource.matchAll(/attachments\/wechat\/([^/]+)\//gu)) {
    sourceIds.add(match[1]);
  }
  return [...sourceIds];
}

export function primarySourceIdForPost(postSource, noteIds, supports = () => true) {
  const sourceMatch = sourceUrlPattern.exec(postSource);
  if (sourceMatch && noteIds.has(sourceMatch[1]) && supports(sourceMatch[1])) {
    return sourceMatch[1];
  }
  for (const match of postSource.matchAll(/attachments\/wechat\/([^/]+)\//gu)) {
    if (noteIds.has(match[1]) && supports(match[1])) return match[1];
  }
  return undefined;
}

export function uncoveredSourceIds(noteIds, articleIds, dispositions) {
  const reviewed = new Set(dispositions.map(({ sourceId }) => sourceId));
  return [...noteIds].filter((sourceId) => !articleIds.has(sourceId) && !reviewed.has(sourceId));
}

function editorialNoteIds() {
  const sourceIds = new Set();
  for (const name of fs.readdirSync(notesRoot).filter((entry) => /-(?:editorial|duplicate)-note\.md$/u.test(entry))) {
    const note = fs.readFileSync(path.join(notesRoot, name), "utf8");
    const sourceUrl = note.match(sourceUrlPattern);
    if (sourceUrl) sourceIds.add(sourceUrl[1]);
  }
  return sourceIds;
}

export function mergeBodyImages(contracts) {
  return contracts.flatMap((contract) => contract.images.body.map((image) => ({
    ...image,
    sourceId: contract.sourceId,
  })));
}

function supportsPreservation(sourceId) {
  try {
    const archiveDirectory = findArchiveDirectory(sourceId);
    const metadata = readJson(path.join(archiveDirectory, "metadata.json"));
    return (metadata.page_type === "js_article"
        && metadata.body?.extraction === "exact-inner-html")
      || (metadata.page_type === "post"
        && metadata.body?.extraction === "decoded-post-payload");
  } catch {
    return false;
  }
}

export function sourceGroupsFromEditorialNotes(posts) {
  const noteIds = new Set();
  const explicitPostBySourceId = new Map();
  for (const name of fs.readdirSync(notesRoot).filter((entry) => entry.endsWith("-editorial-note.md"))) {
    const note = fs.readFileSync(path.join(notesRoot, name), "utf8");
    const sourceUrl = note.match(/https:\/\/mp\.weixin\.qq\.com\/s\/([A-Za-z0-9_-]+)/u);
    if (!sourceUrl) continue;
    noteIds.add(sourceUrl[1]);
    const publicPost = note.match(/^- publicPost[：:]\s*`(source\/_posts\/[^`]+\.md)`[。.]?$/mu);
    if (publicPost) explicitPostBySourceId.set(sourceUrl[1], publicPost[1]);
  }
  const explicitSourceIdByPost = new Map(
    [...explicitPostBySourceId].map(([sourceId, post]) => [post, sourceId]),
  );
  return posts
    .map((post) => ({
      post,
      primarySourceId: primarySourceIdForPost(post.source, noteIds, supportsPreservation)
        ?? explicitSourceIdByPost.get(post.relative),
    }))
    .filter(({ primarySourceId }) => primarySourceId)
    .map(({ post, primarySourceId }) => ({
      primarySourceId,
      sourceIds: sourceIdsForPost(post.source, primarySourceId)
        .filter((sourceId) => noteIds.has(sourceId) && supportsPreservation(sourceId)),
      post,
    }))
    .sort((left, right) => left.primarySourceId.localeCompare(right.primarySourceId));
}

export function readSourceContract(sourceId) {
  const archiveDirectory = findArchiveDirectory(sourceId);
  const rawBytes = fs.readFileSync(path.join(archiveDirectory, "raw.html"));
  const rawHtml = rawBytes.toString("utf8");
  const bodyBytes = fs.readFileSync(path.join(archiveDirectory, "body.html"));
  const bodyHtml = bodyBytes.toString("utf8");
  const metadata = readJson(path.join(archiveDirectory, "metadata.json"));
  const images = readJson(path.join(archiveDirectory, "images.json"));
  const exactArticle = metadata.page_type === "js_article"
    && metadata.body?.extraction === "exact-inner-html";
  const decodedPost = metadata.page_type === "post"
    && metadata.body?.extraction === "decoded-post-payload";
  invariant(exactArticle || decodedPost, `${sourceId}: unsupported WeChat body extraction contract`);
  invariant(sha256(rawBytes) === metadata.raw_html_sha256, `${sourceId}: raw.html hash differs from metadata`);
  invariant(sha256(bodyBytes) === metadata.body_html_sha256, `${sourceId}: body.html hash differs from metadata`);
  const independentlyExtracted = exactArticle
    ? `${extractArticleBody(rawHtml)}\n`
    : extractPostPayloadBody(rawHtml);
  invariant(exactArticle
    ? independentlyExtracted === bodyHtml
    : independentlyExtracted === bodyHtml.trimEnd(),
    `${sourceId}: body.html differs from its independently decoded raw.html source`);
  invariant(images.schemaVersion === 2 && Array.isArray(images.body), `${sourceId}: images.json is not role-aware schema v2`);
  invariant(images.body.every((image) => image.role === "body"), `${sourceId}: non-body item found in images.body`);
  return {
    sourceId,
    sourceUrl: metadata.source_url,
    pageType: metadata.page_type,
    rawHtmlSha256: sha256(rawBytes),
    bodyHtmlSha256: sha256(bodyBytes),
    bodyHtml,
    images,
  };
}

export function buildArticle(group, acceptReviewedOmissions) {
  const contracts = group.sourceIds.map(readSourceContract);
  const post = group.post;
  const parsed = matter(post.source);
  const sourceMatch = sourceUrlPattern.exec(post.source);
  invariant(sourceMatch?.[1] === group.primarySourceId
    || post.source.includes(`attachments/wechat/${group.primarySourceId}/`)
    || fs.readdirSync(notesRoot)
      .filter((entry) => entry.endsWith("-editorial-note.md"))
      .some((entry) => {
        const note = fs.readFileSync(path.join(notesRoot, entry), "utf8");
        return note.includes(`https://mp.weixin.qq.com/s/${group.primarySourceId}`)
          && note.includes(`publicPost：\`${post.relative}\``);
      }),
  `${group.primarySourceId}: public source provenance does not match`);
  const publicImages = [...parsed.content.matchAll(imagePattern)].map((match) => match[1]);
  const bodyImages = mergeBodyImages(contracts);
  invariant(publicImages.length === bodyImages.length,
    `${group.sourceIds.join(",")}: public body has ${publicImages.length} images but merged raw sources have ${bodyImages.length} body placements`);
  const retainedImages = publicImages.map((relativeAsset, index) => {
    const pathname = path.join(assetsRoot, relativeAsset);
    invariant(fs.existsSync(pathname), `${group.primarySourceId}: missing public image ${relativeAsset}`);
    const digest = sha256(fs.readFileSync(pathname));
    const sourceImage = bodyImages[index];
    invariant(digest === sourceImage.sha256,
      `${group.primarySourceId}: public image ${relativeAsset} is not raw body placement ${sourceImage.sourceId}:${sourceImage.placementIndex}`);
    return {
      path: `public/attachments/wechat/${relativeAsset}`,
      sha256: digest,
      sourceId: sourceImage.sourceId,
      sourcePlacementIndex: sourceImage.placementIndex,
    };
  });

  let blockOffset = 0;
  let imageOffset = 0;
  const events = [];
  for (const contract of contracts) {
    // Every non-empty visible block must enter the preservation contract.
    // Short headings and list items are content too; filtering by length made
    // a ten-character course entry disappear from an otherwise complete list.
    const localEvents = sourceEvents(contract.bodyHtml, {
      minimumNormalizedLength: 1,
    });
    for (const event of localEvents) {
      events.push(event.type === "text"
        ? { ...event, sourceId: contract.sourceId, index: blockOffset + event.index }
        : {
          ...event,
          sourceId: contract.sourceId,
          placementIndex: imageOffset + event.placementIndex,
          sourcePlacementIndex: event.placementIndex,
        });
    }
    const textIndexes = localEvents
      .filter((event) => event.type === "text")
      .map((event) => event.index);
    blockOffset += textIndexes.length === 0 ? 0 : Math.max(...textIndexes) + 1;
    imageOffset += localEvents.filter((event) => event.type === "image").length;
  }
  const blocks = events.filter((event) => event.type === "text");
  const retainedBlocks = [];
  const footnoteBlocks = [];
  const structuredBlocks = [];
  const omittedBlocks = [];
  for (const contract of contracts) {
    const sourceBlocks = blocks.filter((block) => block.sourceId === contract.sourceId);
    const scope = markdownScopeForSource(parsed.content, contract.sourceId, contracts.length);
    const matched = matchSourceTextBlocks(sourceBlocks, scope, parsed.data);
    retainedBlocks.push(...matched.retainedBlocks);
    footnoteBlocks.push(...matched.footnoteBlocks);
    structuredBlocks.push(...matched.structuredBlocks);
    omittedBlocks.push(...matched.omittedBlocks);
  }
  if (omittedBlocks.length > 0 && !acceptReviewedOmissions) {
    const preview = omittedBlocks.map(({ sourceId, index, value }) => `  ${sourceId}:${index}: ${value.slice(0, 160)}`).join("\n");
    throw new Error(
      `${group.sourceIds.join(",")}: ${omittedBlocks.length} source text blocks need editorial review.\n${preview}\n`
      + "Review every item against raw.html before approving any new omission.",
    );
  }

  const eventText = publicEventText(parsed.content);
  const retainedByIndex = new Map(retainedBlocks.map((block) => [block.index, block]));
  for (let eventIndex = 0; eventIndex < events.length; eventIndex += 1) {
    const event = events[eventIndex];
    if (event.type !== "image") continue;
    let previous;
    let next;
    for (let index = eventIndex - 1; index >= 0; index -= 1) {
      const candidate = events[index];
      if (candidate.sourceId !== event.sourceId) break;
      if (isImageAnchorBlock(candidate) && retainedByIndex.has(candidate.index)) {
        previous = retainedByIndex.get(candidate.index);
        break;
      }
    }
    for (let index = eventIndex + 1; index < events.length; index += 1) {
      const candidate = events[index];
      if (candidate.sourceId !== event.sourceId) break;
      if (isImageAnchorBlock(candidate) && retainedByIndex.has(candidate.index)) {
        next = retainedByIndex.get(candidate.index);
        break;
      }
    }
    const marker = `WXIMAGE${event.placementIndex}TOKEN`;
    const markerIndex = eventText.indexOf(marker);
    invariant(markerIndex >= 0, `${group.primarySourceId}: missing public marker for body image ${event.placementIndex}`);
    if (previous) {
      const previousIndex = eventText.indexOf(previous.normalized);
      invariant(previousIndex >= 0 && previousIndex + previous.normalized.length <= markerIndex,
        `${group.primarySourceId}: body image ${event.placementIndex} moved before its preceding source text block: ${previous.value.slice(0, 160)}`);
    }
    if (next) {
      const nextIndex = eventText.indexOf(next.normalized, markerIndex + marker.length);
      invariant(nextIndex >= markerIndex + marker.length,
        `${group.primarySourceId}: body image ${event.placementIndex} moved after its following source text block: ${next.value.slice(0, 160)}`);
    }
  }

  const sourceContracts = contracts.map((contract) => {
    const sourceBlocks = blocks.filter((block) => block.sourceId === contract.sourceId);
    const retained = retainedBlocks.filter((block) => block.sourceId === contract.sourceId);
    const footnotes = footnoteBlocks.filter((block) => block.sourceId === contract.sourceId);
    const structured = structuredBlocks.filter((block) => block.sourceId === contract.sourceId);
    const omissions = omittedBlocks.filter((block) => block.sourceId === contract.sourceId);
    return {
      sourceId: contract.sourceId,
      sourceUrl: contract.sourceUrl,
      rawHtmlSha256: contract.rawHtmlSha256,
      bodyHtmlSha256: contract.bodyHtmlSha256,
      sourceText: {
        blockCount: sourceBlocks.length,
        retainedBlockSha256: retained.map(({ normalized }) => sha256(normalized)),
        footnoteBlockSha256: footnotes.map(({ normalized }) => sha256(normalized)),
        structuredBlockSha256: structured.map(({ normalized }) => sha256(normalized)),
        reviewedOmissionSha256: omissions.map(({ normalized }) => sha256(normalized)),
      },
      bodyImages: contract.images.body.map((image) => ({
        placementIndex: image.placementIndex,
        sha256: image.sha256,
      })),
    };
  });
  return {
    sourceId: group.primarySourceId,
    sourceIds: group.sourceIds,
    sourceUrl: contracts[0].sourceUrl,
    post: post.relative,
    rawHtmlSha256: contracts[0].rawHtmlSha256,
    bodyHtmlSha256: contracts[0].bodyHtmlSha256,
    sourceContracts,
    sourceText: {
      blockCount: blocks.length,
      retainedBlockSha256: retainedBlocks.map(({ normalized }) => sha256(normalized)),
      footnoteBlockSha256: footnoteBlocks.map(({ normalized }) => sha256(normalized)),
      structuredBlockSha256: structuredBlocks.map(({ normalized }) => sha256(normalized)),
      reviewedOmissionSha256: omittedBlocks.map(({ normalized }) => sha256(normalized)),
    },
    bodyImages: bodyImages.map((image) => ({
      sourceId: image.sourceId,
      placementIndex: image.placementIndex,
      sha256: image.sha256,
    })),
    retainedImages,
    markdownBodySha256: sha256(parsed.content.normalize("NFC")),
    footnotes: markdownFootnotes(parsed.content),
  };
}

function omissionHashesBySource(manifest) {
  const bySource = new Map();
  for (const article of manifest?.articles ?? []) {
    for (const contract of article.sourceContracts ?? []) {
      bySource.set(contract.sourceId, new Set(contract.sourceText?.reviewedOmissionSha256 ?? []));
    }
  }
  return bySource;
}

export function newReviewedOmissionHashes(previousManifest, nextManifest) {
  const previous = omissionHashesBySource(previousManifest);
  const additions = [];
  for (const article of nextManifest?.articles ?? []) {
    for (const contract of article.sourceContracts ?? []) {
      const accepted = previous.get(contract.sourceId) ?? new Set();
      const hashes = (contract.sourceText?.reviewedOmissionSha256 ?? [])
        .filter((hash) => !accepted.has(hash));
      if (hashes.length > 0) {
        additions.push({ post: article.post, sourceId: contract.sourceId, hashes });
      }
    }
  }
  return additions;
}

function buildManifest(acceptNewReviewedOmissions, writeManifest = true) {
  const posts = postSources();
  const groups = sourceGroupsFromEditorialNotes(posts);
  // Collection is unconditional here so the previous manifest—not a global bypass
  // flag—defines which exact omission hashes have already been reviewed.
  const articles = groups.map((group) => buildArticle(group, true));
  const manifest = { schemaVersion: 2, articles };
  const previousManifest = fs.existsSync(manifestPath) ? readJson(manifestPath) : undefined;
  const newOmissions = newReviewedOmissionHashes(previousManifest, manifest);
  if (newOmissions.length > 0 && !acceptNewReviewedOmissions) {
    const details = newOmissions.map(({ post, sourceId, hashes }) => (
      `  ${post}\n    ${sourceId}: ${hashes.join(", ")}`
    )).join("\n");
    throw new Error(
      `${newOmissions.reduce((sum, item) => sum + item.hashes.length, 0)} newly omitted WeChat source blocks need editorial review:\n`
      + `${details}\nRerun with --accept-new-reviewed-omissions only after checking these blocks against raw.html.`,
    );
  }
  if (writeManifest) {
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(`WeChat preservation manifest built for ${articles.length} articles`);
  } else {
    console.log(`WeChat preservation contract dry-run completed for ${articles.length} articles`);
  }
}

function buildOneManifestEntry(sourceId, writeManifest = true) {
  invariant(typeof sourceId === "string" && sourceId,
    "build-one requires a primary or registered sourceId");
  const manifest = readJson(manifestPath);
  invariant(manifest.schemaVersion === 2 && Array.isArray(manifest.articles),
    "WeChat preservation manifest must be schemaVersion 2 with an articles array");
  const index = manifest.articles.findIndex((article) =>
    (article.sourceIds ?? [article.sourceId]).includes(sourceId));
  const posts = postSources();
  let rebuilt;
  let postLabel;
  if (index >= 0) {
    const current = manifest.articles[index];
    const post = posts.find(({ relative }) => relative === current.post);
    invariant(post, `${current.post}: registered public post does not exist`);
    rebuilt = buildArticle({
      primarySourceId: current.sourceId,
      sourceIds: current.sourceIds ?? [current.sourceId],
      post,
    }, true);
    manifest.articles[index] = rebuilt;
    postLabel = current.post;
  } else {
    const group = sourceGroupsFromEditorialNotes(posts).find(({ primarySourceId, sourceIds }) =>
      primarySourceId === sourceId || sourceIds.includes(sourceId));
    invariant(group, `${sourceId}: no public post or registered preservation entry`);
    rebuilt = buildArticle(group, true);
    manifest.articles.push(rebuilt);
    manifest.articles.sort((left, right) => left.post.localeCompare(right.post));
    postLabel = rebuilt.post;
  }
  if (writeManifest) {
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(`WeChat preservation entry rebuilt for ${postLabel}`);
  } else {
    console.log(`WeChat preservation entry dry-run completed for ${postLabel}`);
  }
}

function verifyManifest() {
  const manifest = readJson(manifestPath);
  const dispositions = readJson(dispositionsPath);
  invariant(manifest.schemaVersion === 2 && Array.isArray(manifest.articles),
    "WeChat preservation manifest must be schemaVersion 2 with an articles array");
  invariant(Array.isArray(dispositions), "WeChat source dispositions must be an array");
  const registeredPosts = new Set();
  const registeredIds = new Set();
  const posts = postSources();
  for (const article of manifest.articles) {
    const sourceIds = article.sourceIds ?? [article.sourceId];
    invariant(sourceIds.length > 0 && sourceIds[0] === article.sourceId,
      `${article.post}: sourceIds must begin with the primary source id`);
    for (const sourceId of sourceIds) {
      invariant(!registeredIds.has(sourceId), `duplicate WeChat source id ${sourceId}`);
      registeredIds.add(sourceId);
    }
    invariant(!registeredPosts.has(article.post), `duplicate WeChat public post ${article.post}`);
    registeredPosts.add(article.post);
    const post = posts.find(({ relative }) => relative === article.post);
    invariant(post, `${article.post}: registered public post does not exist`);
    const rebuilt = buildArticle({
      primarySourceId: article.sourceId,
      sourceIds,
      post,
    }, true);
    invariant(JSON.stringify(rebuilt) === JSON.stringify(article),
      `${article.post}: preservation contract differs from the current raw-source matcher; rebuild and review omissions`);
    const source = fs.readFileSync(path.join(root, article.post), "utf8");
    const parsed = matter(source);
    invariant(source.includes(article.sourceUrl)
      || source.includes(`attachments/wechat/${article.sourceId}/`)
      || fs.readdirSync(notesRoot)
        .filter((entry) => entry.endsWith("-editorial-note.md"))
        .some((entry) => {
          const note = fs.readFileSync(path.join(notesRoot, entry), "utf8");
          return note.includes(article.sourceUrl)
            && note.includes(`publicPost：\`${article.post}\``);
        }),
    `${article.post}: registered WeChat source provenance is missing`);
    invariant(sha256(parsed.content.normalize("NFC")) === article.markdownBodySha256,
      `${article.post}: public body changed without rebuilding and reviewing the WeChat preservation contract`);
    invariant(JSON.stringify(markdownFootnotes(parsed.content)) === JSON.stringify(article.footnotes),
      `${article.post}: footnote calls or definitions differ from the reviewed WeChat contract`);
    const publicImages = [...parsed.content.matchAll(imagePattern)].map((match) => match[1]);
    invariant(publicImages.length === article.retainedImages.length,
      `${article.post}: public image count differs from the reviewed WeChat contract`);
    for (let index = 0; index < publicImages.length; index += 1) {
      const retained = article.retainedImages[index];
      invariant(`public/attachments/wechat/${publicImages[index]}` === retained.path,
        `${article.post}: public image order differs at placement ${index + 1}`);
      const pathname = path.join(root, retained.path);
      invariant(fs.existsSync(pathname), `${article.post}: missing retained image ${retained.path}`);
      invariant(sha256(fs.readFileSync(pathname)) === retained.sha256,
        `${article.post}: retained image bytes differ for ${retained.path}`);
      invariant(retained.sha256 === article.bodyImages[index]?.sha256,
        `${article.post}: retained image is not the registered raw body placement ${index + 1}`);
    }
  }

  const publishedWechatPosts = sourceGroupsFromEditorialNotes(posts).map(({ post }) => post.relative);
  const missing = publishedWechatPosts.filter((relative) => !registeredPosts.has(relative));
  invariant(missing.length === 0, `public WeChat posts missing preservation contracts:\n${missing.join("\n")}`);
  const dispositionIds = new Set();
  for (const disposition of dispositions) {
    invariant(typeof disposition.sourceId === "string" && disposition.sourceId,
      "WeChat source disposition requires sourceId");
    invariant(!registeredIds.has(disposition.sourceId),
      `${disposition.sourceId}: source cannot be both published and excluded`);
    invariant(!dispositionIds.has(disposition.sourceId),
      `${disposition.sourceId}: duplicate source disposition`);
    dispositionIds.add(disposition.sourceId);
    invariant(["duplicate", "superseded"].includes(disposition.reason),
      `${disposition.sourceId}: reason must be duplicate or superseded`);
    invariant(typeof disposition.canonicalPost === "string"
      && fs.existsSync(path.join(root, disposition.canonicalPost)),
    `${disposition.sourceId}: canonicalPost does not exist`);
    invariant(typeof disposition.evidenceNote === "string"
      && fs.existsSync(path.join(root, disposition.evidenceNote)),
    `${disposition.sourceId}: evidenceNote does not exist`);
    const evidence = fs.readFileSync(path.join(root, disposition.evidenceNote), "utf8");
    invariant(evidence.includes(`https://mp.weixin.qq.com/s/${disposition.sourceId}`),
      `${disposition.sourceId}: evidenceNote does not name the excluded source URL`);
    if (disposition.canonicalSourceId !== undefined
      || disposition.rawHtmlSha256 !== undefined
      || disposition.bodyHtmlSha256 !== undefined) {
      invariant(typeof disposition.canonicalSourceId === "string"
        && registeredIds.has(disposition.canonicalSourceId),
      `${disposition.sourceId}: duplicate contract canonicalSourceId is not registered`);
      const contract = readSourceContract(disposition.sourceId);
      invariant(contract.rawHtmlSha256 === disposition.rawHtmlSha256,
        `${disposition.sourceId}: duplicate contract raw.html hash differs`);
      invariant(contract.bodyHtmlSha256 === disposition.bodyHtmlSha256,
        `${disposition.sourceId}: duplicate contract body.html hash differs`);
    }
  }
  const uncovered = uncoveredSourceIds(editorialNoteIds(), registeredIds, dispositions);
  invariant(uncovered.length === 0,
    `WeChat source notes lack a preservation contract or reviewed disposition:\n${uncovered.join("\n")}`);
  console.log(`WeChat source preservation passed for ${manifest.articles.length} articles`);
}

const invokedDirectly = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const command = process.argv[2] ?? "verify";
  if (command === "build") {
    buildManifest(
      process.argv.includes("--accept-new-reviewed-omissions"),
      !process.argv.includes("--dry-run"),
    );
  } else if (command === "build-one") {
    buildOneManifestEntry(process.argv[3], !process.argv.includes("--dry-run"));
  } else if (command === "verify") {
    verifyManifest();
  } else {
    throw new Error(`unknown command ${command}; expected build, build-one or verify`);
  }
}
