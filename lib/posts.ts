/* ============================================================
   内容层 — 读取 source/_posts 下的 Markdown，解析为文章对象
   兼容两种 front-matter 写法：
   1) 标准： 文件以 `---` 开头
   2) 无前缀（本站历史写法）： 以 `# 标题`(YAML 注释) + 散列键开头，
      到第一行单独的 `---` 结束，其后为正文
   ============================================================ */
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { renderMarkdown } from "./markdown";

const POSTS_DIR = path.join(process.cwd(), "source", "_posts");

/** 一条署名：作者=实心方块「作」；译者「译」/编者「编」/校对「校」=空心方块 */
export interface Credit {
  mark: string;
  name: string;
  solid: boolean;
}

export interface PostSummary {
  slug: string;
  title: string;
  category: string;
  tags: string[];
  author: string;
  credits: Credit[];
  dateDisplay: string; // "2026 · 05 · 12"
  dateISO: string; // "2026-05-12"
  timestamp: number; // 用于排序
  excerpt: string;
  readMin: number;
  no: string; // "01" — 按时间倒序编号，最新为 01
}

export interface Post extends PostSummary {
  html: string;
}

/* ---------------- front-matter 解析（双写法） ---------------- */
function parseFrontMatter(raw: string): { data: Record<string, unknown>; content: string } {
  const stripped = raw.replace(/^﻿/, "");
  // 标准写法：以 --- 开头
  if (/^\s*---\r?\n/.test(stripped)) {
    const parsed = matter(stripped);
    return { data: parsed.data as Record<string, unknown>, content: parsed.content };
  }
  // 无前缀写法：找到第一行单独的 ---
  const lines = stripped.split(/\r?\n/);
  const idx = lines.findIndex((l) => /^---\s*$/.test(l));
  if (idx === -1) {
    return { data: {}, content: stripped };
  }
  const head = lines.slice(0, idx).join("\n");
  const body = lines.slice(idx + 1).join("\n");
  try {
    const parsed = matter(`---\n${head}\n---\n${body}`);
    return { data: parsed.data as Record<string, unknown>, content: parsed.content };
  } catch {
    // YAML 解析失败时退回到逐行 key: value
    const data: Record<string, unknown> = {};
    for (const line of head.split("\n")) {
      const m = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
      if (m) data[m[1]] = m[2].trim();
    }
    return { data, content: body };
  }
}

/* ---------------- 字段归一化辅助 ---------------- */
function toList(v: unknown): string[] {
  if (v == null) return [];
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  return String(v)
    .split(/[,，]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

// 署名角色 → 方块标记。作者实心，其余空心。可在 front-matter 用任一 key 填写。
const CREDIT_ROLES: { keys: string[]; mark: string; solid: boolean }[] = [
  { keys: ["post_author", "author", "作者"], mark: "作", solid: true },
  { keys: ["translator", "译者", "翻译"], mark: "译", solid: false },
  { keys: ["editor", "编者", "编辑"], mark: "编", solid: false },
  { keys: ["proofreader", "校对", "校对者", "校"], mark: "校", solid: false },
];

function buildCredits(data: Record<string, unknown>): Credit[] {
  const out: Credit[] = [];
  for (const role of CREDIT_ROLES) {
    const key = role.keys.find((k) => data[k] != null && String(data[k]).trim() !== "");
    if (!key) continue;
    const name = toList(data[key]).join("、") || String(data[key]).trim();
    if (name) out.push({ mark: role.mark, name, solid: role.solid });
  }
  return out;
}

function toDate(v: unknown): Date {
  if (v instanceof Date && !isNaN(+v)) return v;
  if (typeof v === "string") {
    const d = new Date(v.trim());
    if (!isNaN(+d)) return d;
  }
  return new Date(0);
}

function fmtDisplay(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y} · ${m} · ${day}`;
}

function fmtISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function plainText(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const URL_RE = /https?:\/\/\S+/gi;

/** 去掉链接后剩余的实义文字长度（用于跳过「标签：链接」这类无信息段落） */
function meaningfulLen(t: string): number {
  return t.replace(URL_RE, "").replace(/\s+/g, "").length;
}

function deriveExcerpt(html: string, fmExcerpt: unknown, title: string): string {
  if (typeof fmExcerpt === "string" && fmExcerpt.trim()) return fmExcerpt.trim();
  const titleText = plainText(title);
  const paras = [...html.matchAll(/<p>([\s\S]*?)<\/p>/gi)].map((m) => plainText(m[1]));
  // 取第一段「有信息量」的文字：非空、不重复标题、不是「标签：链接」式的下载行
  const pick = paras.find((t) => {
    if (!t || t === titleText || t.startsWith(titleText)) return false;
    const ml = meaningfulLen(t);
    // 含链接的段落需有足够正文才算摘要；纯文字段落略过过短的插语
    return /https?:\/\//i.test(t) ? ml >= 40 : ml >= 8;
  });
  const source = pick ?? "";
  if (!source) return "";
  const limit = 92;
  return source.length > limit ? source.slice(0, limit) + "…" : source;
}

function readMinutes(html: string): number {
  const text = plainText(html);
  const cjk = (text.match(/[㐀-鿿豈-﫿]/g) || []).length;
  const latin = (text.match(/[A-Za-z0-9]+/g) || []).length;
  return Math.max(1, Math.round((cjk + latin) / 400));
}

/* ---------------- 读取并解析 ---------------- */
async function loadRaw(): Promise<Post[]> {
  if (!fs.existsSync(POSTS_DIR)) return [];
  const files = fs
    .readdirSync(POSTS_DIR)
    .filter((f) => f.endsWith(".md") && !f.startsWith("_") && !f.startsWith("."));

  const posts = await Promise.all(
    files.map(async (file) => {
      const raw = fs.readFileSync(path.join(POSTS_DIR, file), "utf8");
      const { data, content } = parseFrontMatter(raw);

      const baseName = file.replace(/\.md$/, "");
      const slug = typeof data.slug === "string" && data.slug.trim() ? data.slug.trim() : baseName;

      const categories = toList(data.categories ?? data.category);
      const tags = toList(data.tags);
      const facet = categories.length ? categories : tags;

      const date = toDate(data.date);
      const html = await renderMarkdown(content);
      const title = String(data.title ?? baseName).trim();

      const post: Post = {
        slug,
        title,
        category: categories[0] ?? tags[0] ?? "未分类",
        tags: Array.from(new Set([...facet, ...tags])),
        author: String(data.post_author ?? data.author ?? "").trim(),
        credits: buildCredits(data),
        dateDisplay: fmtDisplay(date),
        dateISO: fmtISO(date),
        timestamp: +date,
        excerpt: deriveExcerpt(html, data.excerpt, title),
        readMin: readMinutes(html),
        no: "00",
        html,
      };
      return post;
    })
  );

  // 时间倒序（最新在前），并编号 01..N
  posts.sort((a, b) => b.timestamp - a.timestamp || a.slug.localeCompare(b.slug));
  // 编号按发表先后：最早的文章为 1，最新的为 N（列表仍按时间倒序展示）
  posts.forEach((p, i) => {
    p.no = String(posts.length - i);
  });
  return posts;
}

/* ---------------- 构建期缓存 ---------------- */
let cache: Promise<Post[]> | null = null;
function all(): Promise<Post[]> {
  if (!cache) cache = loadRaw();
  return cache;
}

const strip = ({ html, ...rest }: Post): PostSummary => rest;

export async function getAllPosts(): Promise<PostSummary[]> {
  return (await all()).map(strip);
}

export async function getAllSlugs(): Promise<string[]> {
  return (await all()).map((p) => p.slug);
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const posts = await all();
  return posts.find((p) => p.slug === slug) ?? null;
}

/** 下一篇（循环），用于文章页底部导航 */
export async function getAdjacent(slug: string): Promise<PostSummary | null> {
  const posts = await all();
  if (posts.length === 0) return null;
  const idx = posts.findIndex((p) => p.slug === slug);
  if (idx === -1) return null;
  return strip(posts[(idx + 1) % posts.length]);
}

/** 站点期号，如 "2026 · 06"，取最新文章年月 */
export async function getIssue(): Promise<string> {
  const posts = await all();
  if (!posts.length) return "";
  const d = new Date(posts[0].timestamp);
  return `${d.getUTCFullYear()} · ${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
