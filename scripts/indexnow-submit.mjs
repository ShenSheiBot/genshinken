/* ============================================================
   IndexNow 推送 — 把新增/修订文章的 URL 提交给 Bing 等搜索引擎
   （协议共享，提交一处即分发；Google 不参与 IndexNow）

   用法：
     node scripts/indexnow-submit.mjs --list changed.txt   # 从文件读变更清单（每行一个 source/_posts/*.md 路径）
     node scripts/indexnow-submit.mjs --all                # 提交全部文章（初次接入 / 手动补交）
     node scripts/indexnow-submit.mjs source/_posts/x.md   # 直接传文件路径

   key 的唯一权威源是 public/ 下的 <32位hex>.txt 文件，本脚本自动发现，
   不在任何地方硬编码。key 按协议设计即公开信息，不是机密。
   ============================================================ */
import fs from "node:fs";
import path from "node:path";

const SITE = "https://un-canon.blog";
const HOST = "un-canon.blog";
const POSTS_DIR = path.join(process.cwd(), "source", "_posts");

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

function postUrl(file) {
  const head = frontMatterHead(fs.readFileSync(file, "utf8"));
  if (/^draft:\s*(true|yes|1)\s*$/im.test(head)) return null;
  const m = head.match(/^slug:\s*(.+)$/m);
  const slug = (m ? m[1].trim().replace(/^["']|["']$/g, "") : path.basename(file, ".md")).trim();
  return `${SITE}/posts/${encodeURIComponent(slug)}`;
}

function collectFiles(args) {
  if (args.includes("--all")) {
    return fs
      .readdirSync(POSTS_DIR)
      .filter((f) => f.endsWith(".md") && !f.startsWith("_") && !f.startsWith("."))
      .map((f) => path.join(POSTS_DIR, f));
  }
  const li = args.indexOf("--list");
  const entries =
    li !== -1
      ? fs.readFileSync(args[li + 1], "utf8").split(/\r?\n/)
      : args;
  return entries.map((s) => s.trim()).filter((s) => s.endsWith(".md") && fs.existsSync(s));
}

const files = collectFiles(process.argv.slice(2));
const urls = new Set([`${SITE}/`]);
for (const f of files) {
  const u = postUrl(f);
  if (u) urls.add(u);
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
