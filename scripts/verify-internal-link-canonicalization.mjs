import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const root = process.cwd();
const postsDir = path.join(root, "source", "_posts");
const booksDir = path.join(root, "source", "_books");
const mapPath = path.join(root, "editorial-sources", "wechat", "internal-link-canonical-map.json");
const exceptionsPath = path.join(root, "editorial-sources", "wechat", "internal-link-exceptions.json");
const identityIndexPath = path.join(root, "editorial-sources", "wechat", "source-identity-index.json");
const preservationPath = path.join(root, "editorial-sources", "wechat", "preservation-manifest.json");
const identityKeys = ["__biz", "mid", "idx", "sn"];

function normalizeWechatUrl(rawUrl) {
  const decoded = rawUrl.replaceAll("&amp;", "&");
  let url;
  try {
    url = new URL(decoded);
  } catch {
    return null;
  }
  if (url.hostname !== "mp.weixin.qq.com") return null;
  if (/^\/s\/[A-Za-z0-9_-]+$/.test(url.pathname)) return `${url.origin}${url.pathname}`;
  const identity = identityKeys
    .map((key) => [key, url.searchParams.get(key)])
    .filter(([, value]) => value)
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  return identity ? `${url.origin}${url.pathname}?${identity}` : `${url.origin}${url.pathname}`;
}

function lineNumber(text, offset) {
  return text.slice(0, offset).split("\n").length;
}

const posts = fs.readdirSync(postsDir).filter((name) => name.endsWith(".md"));
const publishedPostPaths = new Set();
const postMetadata = new Map();
const postBodies = [];
for (const name of posts) {
  const source = fs.readFileSync(path.join(postsDir, name), "utf8");
  const parsed = matter(source);
  if (!parsed.data.book_document) publishedPostPaths.add(`/posts/${name.slice(0, -3)}`);
  postMetadata.set(name, parsed.data);
  postBodies.push({ name, body: parsed.content });
}

const publishedChapterPaths = new Set();
const publishedBookPaths = new Set();
const bookPathByDocumentSlug = new Map();
for (const name of fs.readdirSync(booksDir).filter((entry) => entry.endsWith(".json"))) {
  const book = JSON.parse(fs.readFileSync(path.join(booksDir, name), "utf8"));
  const bookSlug = book.slug ?? name.slice(0, -5);
  const bookPath = `/books/${bookSlug}`;
  publishedBookPaths.add(bookPath);
  if (book.documentSlug) bookPathByDocumentSlug.set(book.documentSlug, bookPath);
  const visit = (nodes = []) => {
    for (const node of nodes) {
      if (node.status === "published" && node.id) {
        publishedChapterPaths.add(`/books/${bookSlug}/chapters/${node.id}`);
      }
      visit(node.children);
      visit(node.chapters);
    }
  };
  visit(book.chapters);
  visit(book.parts);
}

const mappings = JSON.parse(fs.readFileSync(mapPath, "utf8"));
const exceptions = JSON.parse(fs.readFileSync(exceptionsPath, "utf8"));
const identityIndex = JSON.parse(fs.readFileSync(identityIndexPath, "utf8"));
const preservation = JSON.parse(fs.readFileSync(preservationPath, "utf8"));
const knownLegacy = new Map();
const failures = [];
const allowedExternal = new Map();
const usedExceptions = new Set();

for (const exception of exceptions) {
  const identity = normalizeWechatUrl(exception.legacyUrl);
  const key = `${exception.post}\0${identity}`;
  if (!identity || !exception.reason?.trim()) {
    failures.push(`${exceptionsPath}: every exception needs a valid legacyUrl and reason`);
    continue;
  }
  allowedExternal.set(key, exception.reason);
}

function registerLegacy(identity, canonicalPath, source) {
  if (!identity) {
    failures.push(`${source}: invalid WeChat identity`);
    return;
  }
  if (knownLegacy.has(identity) && knownLegacy.get(identity) !== canonicalPath) {
    failures.push(`${source}: conflicting canonical paths for ${identity}`);
    return;
  }
  knownLegacy.set(identity, canonicalPath);
}

function canonicalPathForPost(postPath) {
  const name = path.basename(postPath);
  const metadata = postMetadata.get(name);
  if (!metadata) return null;
  const slug = name.slice(0, -3);
  if (!metadata.book_document) return `/posts/${slug}`;
  return bookPathByDocumentSlug.get(slug) ?? null;
}

const preservedSourceIds = new Set();
for (const article of preservation.articles ?? []) {
  const canonicalPath = canonicalPathForPost(article.post);
  if (!canonicalPath) {
    failures.push(`${preservationPath}: no published canonical route for ${article.post}`);
    continue;
  }
  for (const sourceId of article.sourceIds ?? [article.sourceId]) {
    preservedSourceIds.add(sourceId);
    const identity = identityIndex.sources?.[sourceId];
    if (!identity) {
      failures.push(
        `${identityIndexPath}: missing ${sourceId}; run npm run wechat:identities:build after importing the source`,
      );
      continue;
    }
    const legacyFields = [identity.biz, identity.mid, identity.idx, identity.sn];
    if (legacyFields.every(Boolean)) {
      const legacyUrl = `https://mp.weixin.qq.com/s?__biz=${identity.biz}&mid=${identity.mid}&idx=${identity.idx}&sn=${identity.sn}`;
      registerLegacy(normalizeWechatUrl(legacyUrl), canonicalPath, `${identityIndexPath}:${sourceId}`);
    } else if (legacyFields.some(Boolean)) {
      failures.push(`${identityIndexPath}:${sourceId}: legacy identity fields must be complete or all null`);
    }
    registerLegacy(
      normalizeWechatUrl(`https://mp.weixin.qq.com/s/${sourceId}`),
      canonicalPath,
      `${identityIndexPath}:${sourceId}`,
    );
  }
}

for (const entry of mappings) {
  const identity = normalizeWechatUrl(entry.legacyUrl);
  if (!identity) {
    failures.push(`${mapPath}: invalid WeChat legacyUrl: ${entry.legacyUrl}`);
    continue;
  }
  // Explicit mappings refine merged book sources from the book landing page to the exact chapter.
  knownLegacy.set(identity, entry.canonicalPath);
  for (const sourceId of entry.sourceIds ?? []) {
    if (!identityIndex.sources?.[sourceId]) {
      failures.push(
        `${identityIndexPath}: missing mapped source ${sourceId}; run npm run wechat:identities:build`,
      );
      continue;
    }
    knownLegacy.set(normalizeWechatUrl(`https://mp.weixin.qq.com/s/${sourceId}`), entry.canonicalPath);
  }
  if (
    !publishedPostPaths.has(entry.canonicalPath) &&
    !publishedBookPaths.has(entry.canonicalPath) &&
    !publishedChapterPaths.has(entry.canonicalPath)
  ) {
    failures.push(`${mapPath}: canonical target is not published: ${entry.canonicalPath}`);
  }
}

const markdownLink = /\[[^\]]*\]\((https?:\/\/mp\.weixin\.qq\.com\/[^)\s]+)\)/g;
const htmlLink = /href=["'](https?:\/\/mp\.weixin\.qq\.com\/[^"']+)["']/g;
for (const { name, body } of postBodies) {
  for (const pattern of [markdownLink, htmlLink]) {
    pattern.lastIndex = 0;
    for (const match of body.matchAll(pattern)) {
      const identity = normalizeWechatUrl(match[1]);
      if (identity && knownLegacy.has(identity)) {
        const exceptionKey = `${name}\0${identity}`;
        if (allowedExternal.has(exceptionKey)) {
          usedExceptions.add(exceptionKey);
          continue;
        }
        failures.push(
          `source/_posts/${name}:${lineNumber(body, match.index)} still links to WeChat; use ${knownLegacy.get(identity)}`,
        );
      }
    }
  }
}

for (const key of allowedExternal.keys()) {
  if (!usedExceptions.has(key)) failures.push(`${exceptionsPath}: stale or unused exception for ${key.split("\0")[0]}`);
}

if (failures.length) {
  console.error(`Internal-link canonicalization failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `Internal-link canonicalization passed (${preservedSourceIds.size} imported WeChat sources; ${mappings.length} exact chapter overrides; ${publishedPostPaths.size} posts; ${publishedChapterPaths.size} chapters).`,
);
