import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import sanitizeHtml from "sanitize-html";

const root = process.cwd();
const archiveRoot = path.join(root, ".local-archive", "wechat-full", "articles");
const postsRoot = path.join(root, "source", "_posts");
const assetsRoot = path.join(root, "public", "attachments", "wechat");
const notesRoot = path.join(root, "editorial-sources", "wechat");
const manifestPath = path.join(notesRoot, "preservation-manifest.json");
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

function normalizeSourceBlock(value) {
  return value
    .normalize("NFKC")
    .replace(/\s+/gu, "")
    .replace(/[“”‘’"'`*_>#—－-]/gu, "")
    .replace(/\[\^?[^\]]+\]/gu, "")
    .replace(/^(?:\[\d+\]|\d+[.、])/u, "");
}

function sourceEvents(bodyHtml) {
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
    .filter((event) => event.type === "image" || event.normalized.length >= 12);
}

function publicSearchText(markdownBody) {
  return normalizeSourceBlock(
    markdownBody
      .replace(/!\[[^\]]*\]\([^)]*\)/gu, "")
      .replace(/^\[\^[^\]]+\]:\s*/gmu, ""),
  );
}

function publicEventText(markdownBody) {
  let imageIndex = 0;
  return normalizeSourceBlock(
    markdownBody
      .replace(imagePattern, () => `WXIMAGE${imageIndex += 1}TOKEN`)
      .replace(/^\[\^[^\]]+\]:\s*/gmu, ""),
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

function sourceIdsFromEditorialNotes() {
  return fs.readdirSync(notesRoot)
    .filter((name) => name.endsWith("-editorial-note.md"))
    .map((name) => name.slice(0, -"-editorial-note.md".length))
    .sort();
}

function buildArticle(sourceId, posts, acceptReviewedOmissions) {
  const archiveDirectory = findArchiveDirectory(sourceId);
  const rawBytes = fs.readFileSync(path.join(archiveDirectory, "raw.html"));
  const rawHtml = rawBytes.toString("utf8");
  const bodyBytes = fs.readFileSync(path.join(archiveDirectory, "body.html"));
  const bodyHtml = bodyBytes.toString("utf8");
  const metadata = readJson(path.join(archiveDirectory, "metadata.json"));
  const images = readJson(path.join(archiveDirectory, "images.json"));

  invariant(metadata.page_type === "js_article", `${sourceId}: only js_article sources are supported`);
  invariant(metadata.body?.extraction === "exact-inner-html", `${sourceId}: body.html is not exact-inner-html`);
  invariant(sha256(rawBytes) === metadata.raw_html_sha256, `${sourceId}: raw.html hash differs from metadata`);
  invariant(sha256(bodyBytes) === metadata.body_html_sha256, `${sourceId}: body.html hash differs from metadata`);
  invariant(`${extractArticleBody(rawHtml)}\n` === bodyHtml,
    `${sourceId}: body.html differs from raw.html #js_content plus its serialization newline`);
  invariant(images.schemaVersion === 2 && Array.isArray(images.body), `${sourceId}: images.json is not role-aware schema v2`);
  invariant(images.body.every((image) => image.role === "body"), `${sourceId}: non-body item found in images.body`);

  const matches = posts.filter(({ source }) => source.includes(`https://mp.weixin.qq.com/s/${sourceId}`));
  invariant(matches.length === 1, `${sourceId}: expected one public post, found ${matches.length}`);
  const post = matches[0];
  const parsed = matter(post.source);
  const sourceMatch = sourceUrlPattern.exec(post.source);
  invariant(sourceMatch?.[1] === sourceId, `${sourceId}: public source URL does not match`);

  const publicImages = [...parsed.content.matchAll(imagePattern)].map((match) => match[1]);
  invariant(publicImages.length === images.body.length,
    `${sourceId}: public body has ${publicImages.length} images but raw source has ${images.body.length} body placements`);
  const retainedImages = publicImages.map((relativeAsset, index) => {
    const pathname = path.join(assetsRoot, relativeAsset);
    invariant(fs.existsSync(pathname), `${sourceId}: missing public image ${relativeAsset}`);
    const digest = sha256(fs.readFileSync(pathname));
    const sourceImage = images.body[index];
    invariant(digest === sourceImage.sha256,
      `${sourceId}: public image ${relativeAsset} is not raw body placement ${sourceImage.placementIndex}`);
    return {
      path: `public/attachments/wechat/${relativeAsset}`,
      sha256: digest,
      sourcePlacementIndex: sourceImage.placementIndex,
    };
  });

  const events = sourceEvents(bodyHtml);
  const blocks = events.filter((event) => event.type === "text");
  const searchText = publicSearchText(parsed.content);
  let publicCursor = 0;
  const retainedBlocks = [];
  const omittedBlocks = [];
  for (const block of blocks) {
    const publicIndex = searchText.indexOf(block.normalized, publicCursor);
    if (publicIndex < 0) omittedBlocks.push(block);
    else {
      retainedBlocks.push({ ...block, publicIndex });
      publicCursor = publicIndex + block.normalized.length;
    }
  }
  if (omittedBlocks.length > 0 && !acceptReviewedOmissions) {
    const preview = omittedBlocks.map(({ index, value }) => `  ${index}: ${value.slice(0, 160)}`).join("\n");
    throw new Error(
      `${sourceId}: ${omittedBlocks.length} source text blocks need editorial review.\n${preview}\n`
      + "Rerun build with --accept-reviewed-omissions only after checking every item against raw.html.",
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
      if (isImageAnchorBlock(candidate) && retainedByIndex.has(candidate.index)) {
        previous = retainedByIndex.get(candidate.index);
        break;
      }
    }
    for (let index = eventIndex + 1; index < events.length; index += 1) {
      const candidate = events[index];
      if (isImageAnchorBlock(candidate) && retainedByIndex.has(candidate.index)) {
        next = retainedByIndex.get(candidate.index);
        break;
      }
    }
    const marker = `WXIMAGE${event.placementIndex}TOKEN`;
    const markerIndex = eventText.indexOf(marker);
    invariant(markerIndex >= 0, `${sourceId}: missing public marker for body image ${event.placementIndex}`);
    if (previous) {
      const previousIndex = eventText.indexOf(previous.normalized);
      invariant(previousIndex >= 0 && previousIndex + previous.normalized.length <= markerIndex,
        `${sourceId}: body image ${event.placementIndex} moved before its preceding source text block: ${previous.value.slice(0, 160)}`);
    }
    if (next) {
      const nextIndex = eventText.indexOf(next.normalized, markerIndex + marker.length);
      invariant(nextIndex >= markerIndex + marker.length,
        `${sourceId}: body image ${event.placementIndex} moved after its following source text block: ${next.value.slice(0, 160)}`);
    }
  }

  return {
    sourceId,
    sourceUrl: metadata.source_url,
    post: post.relative,
    rawHtmlSha256: sha256(rawBytes),
    bodyHtmlSha256: sha256(bodyBytes),
    sourceText: {
      blockCount: blocks.length,
      retainedBlockSha256: retainedBlocks.map(({ normalized }) => sha256(normalized)),
      reviewedOmissionSha256: omittedBlocks.map(({ normalized }) => sha256(normalized)),
    },
    bodyImages: images.body.map((image) => ({
      placementIndex: image.placementIndex,
      sha256: image.sha256,
    })),
    retainedImages,
    markdownBodySha256: sha256(parsed.content.normalize("NFC")),
    footnotes: markdownFootnotes(parsed.content),
  };
}

function buildManifest(acceptReviewedOmissions) {
  const posts = postSources();
  const articles = sourceIdsFromEditorialNotes().map((sourceId) =>
    buildArticle(sourceId, posts, acceptReviewedOmissions));
  const manifest = { schemaVersion: 1, articles };
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`WeChat preservation manifest built for ${articles.length} articles`);
}

function verifyManifest() {
  const manifest = readJson(manifestPath);
  invariant(manifest.schemaVersion === 1 && Array.isArray(manifest.articles),
    "WeChat preservation manifest must be schemaVersion 1 with an articles array");
  const registeredPosts = new Set();
  const registeredIds = new Set();
  for (const article of manifest.articles) {
    invariant(!registeredIds.has(article.sourceId), `duplicate WeChat source id ${article.sourceId}`);
    invariant(!registeredPosts.has(article.post), `duplicate WeChat public post ${article.post}`);
    registeredIds.add(article.sourceId);
    registeredPosts.add(article.post);
    const source = fs.readFileSync(path.join(root, article.post), "utf8");
    const parsed = matter(source);
    invariant(source.includes(article.sourceUrl), `${article.post}: registered WeChat source URL is missing`);
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

  const publishedWechatPosts = postSources().filter(({ source }) => sourceUrlPattern.test(source));
  const missing = publishedWechatPosts.map(({ relative }) => relative).filter((relative) => !registeredPosts.has(relative));
  invariant(missing.length === 0, `public WeChat posts missing preservation contracts:\n${missing.join("\n")}`);
  console.log(`WeChat source preservation passed for ${manifest.articles.length} articles`);
}

const command = process.argv[2] ?? "verify";
if (command === "build") {
  buildManifest(process.argv.includes("--accept-reviewed-omissions"));
} else if (command === "verify") {
  verifyManifest();
} else {
  throw new Error(`unknown command ${command}; expected build or verify`);
}
