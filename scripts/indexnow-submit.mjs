/* ============================================================
   IndexNow 推送 — 把新增/修订文章的 URL 提交给 Bing 等搜索引擎
   （协议共享，提交一处即分发；Google 不参与 IndexNow）

   用法：
     node scripts/indexnow-submit.mjs --list changed.txt   # 从文件读文章、书籍或专题变更清单
     node scripts/indexnow-submit.mjs --all                # 提交全部公开内容（初次接入 / 手动补交）
     node scripts/indexnow-submit.mjs source/_posts/x.md   # 直接传文件路径

   key 的唯一权威源是 public/ 下的 <32位hex>.txt 文件，本脚本自动发现，
   不在任何地方硬编码。key 按协议设计即公开信息，不是机密。
   ============================================================ */
import fs from "node:fs";
import path from "node:path";

const SITE = "https://un-canon.blog";
const HOST = "un-canon.blog";
const POSTS_DIR = path.join(process.cwd(), "source", "_posts");
const BOOKS_DIR = path.join(process.cwd(), "source", "_books");
const TOPICS_DIR = path.join(process.cwd(), "source", "_topics");

function findKey() {
  const pub = path.join(process.cwd(), "public");
  for (const f of fs.readdirSync(pub)) {
    const m = f.match(/^([0-9a-f]{32})\.txt$/);
    if (m && fs.readFileSync(path.join(pub, f), "utf8").trim() === m[1]) return m[1];
  }
  throw new Error("public/ 下未找到 IndexNow key 文件（<32位hex>.txt）");
}

/** 与 lib/posts.ts 的双写法 front-matter 兼容：取头部区域文本 */
function frontMatterHead(raw) {
  const stripped = raw.replace(/^﻿/, "");
  const lines = stripped.split(/\r?\n/);
  const openIsDash = /^---\s*$/.test(lines[0] ?? "");
  const from = openIsDash ? 1 : 0;
  const end = lines.findIndex((l, i) => i >= from && /^---\s*$/.test(l) && (openIsDash ? i > 0 : true));
  return lines.slice(from, end === -1 ? from : end).join("\n");
}

/** Match the boolean/string draft coercion accepted by lib/posts.ts. */
function draftFromHead(head) {
  const raw = head.match(/^draft:\s*(.*?)\s*$/im)?.[1];
  if (raw == null) return false;
  let value = raw.replace(/\s+#.*$/, "").trim();
  const quoted =
    value.length >= 2 &&
    ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'")));
  if (quoted) {
    value = value.slice(1, -1).trim();
  }
  // YAML parses an unquoted `1` as a number, while lib/posts.ts only treats
  // booleans and strings as draft flags. Quoted "1" remains a string.
  if (!quoted && value === "1") return false;
  return /^(true|yes|1)$/i.test(value);
}

function postUrl(file) {
  const head = frontMatterHead(fs.readFileSync(file, "utf8"));
  if (draftFromHead(head)) return null;
  const m = head.match(/^slug:\s*(.+)$/m);
  const slug = (m ? m[1].trim().replace(/^["']|["']$/g, "") : path.basename(file, ".md")).trim();
  const section = head.match(/^section:\s*(.+)$/m)?.[1].trim().replace(/^["']|["']$/g, "").toLowerCase();
  const base = section === "multimedia" ? "media" : "posts";
  return `${SITE}/${base}/${encodeURIComponent(slug)}`;
}

function topicUrl(file) {
  const head = frontMatterHead(fs.readFileSync(file, "utf8"));
  const match = head.match(/^slug:\s*(.+)$/m);
  const slug = (match ? match[1].trim().replace(/^["']|["']$/g, "") : path.basename(file, ".md")).trim();
  return `${SITE}/topics/${encodeURIComponent(slug)}`;
}

function bookUrl(file) {
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!data || typeof data.slug !== "string" || !data.slug.trim()) {
    throw new Error(`${file}: 缺少书籍 slug`);
  }
  return `${SITE}/books/${encodeURIComponent(data.slug.trim())}`;
}

function publicUrl(file) {
  const normalized = file.replaceAll("\\", "/");
  if (normalized.includes("/source/_posts/") || normalized.startsWith("source/_posts/")) {
    return { url: postUrl(file), index: `${SITE}/library` };
  }
  if (normalized.includes("/source/_topics/") || normalized.startsWith("source/_topics/")) {
    return { url: topicUrl(file), index: `${SITE}/topics` };
  }
  if (normalized.includes("/source/_books/") || normalized.startsWith("source/_books/")) {
    return { url: bookUrl(file), index: `${SITE}/books` };
  }
  return null;
}

function filesIn(directory, extension) {
  if (!fs.existsSync(directory)) return [];
  return fs
    .readdirSync(directory)
    .filter((file) => file.endsWith(extension) && !file.startsWith("_") && !file.startsWith("."))
    .map((file) => path.join(directory, file));
}

function collectFiles(args) {
  if (args.includes("--all")) {
    return [
      ...filesIn(POSTS_DIR, ".md"),
      ...filesIn(BOOKS_DIR, ".json"),
      ...filesIn(TOPICS_DIR, ".md"),
    ];
  }
  const li = args.indexOf("--list");
  const entries =
    li !== -1
      ? fs.readFileSync(args[li + 1], "utf8").split(/\r?\n/)
      : args;
  return entries
    .map((entry) => entry.trim())
    .filter((entry) => /\.(?:md|json)$/i.test(entry) && fs.existsSync(entry));
}

const files = collectFiles(process.argv.slice(2));
const urls = new Set([`${SITE}/`]);
for (const file of files) {
  const target = publicUrl(file);
  if (target?.url) urls.add(target.url);
  if (target?.index) urls.add(target.index);
}

if (urls.size <= 1 && files.length === 0) {
  console.log("变更清单为空，仅提交首页。");
}

const key = findKey();
const body = {
  host: HOST,
  key,
  keyLocation: `${SITE}/${key}.txt`,
  urlList: [...urls],
};

console.log("提交 URL：\n" + body.urlList.join("\n"));

const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify(body),
});

console.log(`IndexNow 响应：${res.status} ${res.statusText}`);
const text = await res.text();
if (text) console.log(text);
if (res.status !== 200 && res.status !== 202) process.exit(1);
