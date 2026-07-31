/* ============================================================
   内容层 — 读取 source/_posts 下的 Markdown，解析为文章对象
   兼容两种 front-matter 写法：
   1) 标准： 文件以 `---` 开头
   2) 无前缀（本站历史写法）： 以 `# 标题`(YAML 注释) + 散列键开头，
      到第一行单独的 `---` 结束，其后为正文
   ============================================================ */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { renderMarkdown } from "./markdown";
import {
  parseLegacyYamlFrontMatter,
  parseYamlFrontMatter,
} from "./safe-front-matter.mjs";
import { isEditorialSection, type EditorialSection } from "./editorial";
import { assignPostNumbers } from "./post-numbering";
import {
  findContributor,
  findContributorByName,
  type ContributorId,
} from "./contributors";
import {
  mergeCitation,
  pageCitationDefaults,
  parseCitationInput,
  type CitationCreator,
  type CitationRecord,
} from "./citations";
import { isHanScript, type HanScript } from "./han-script";

const POSTS_DIR = path.join(process.cwd(), "source", "_posts");
const BOOKS_DIR = path.join(process.cwd(), "source", "_books");

const bookChapterSectionNumbers = new Map<string, string>();

export type CreditRole = "author" | "translator" | "proofreader";

/** 一条署名对应一个贡献者；多人署名会展开为多条记录。 */
export interface Credit {
  role: CreditRole;
  contributorId: ContributorId;
  mark: string;
  name: string;
  solid: boolean;
}

export interface PostSummary {
  slug: string;
  script: HanScript;
  title: string;
  titleBreaks: string[];
  homeTitleBreaks: string[];
  subtitle: string;
  titleNote: string;
  draft: boolean;
  bookDocument: boolean; // 仅作为书籍章节的构建源，不生成公开文章页面
  category: string;
  section: EditorialSection;
  tags: string[];
  author: string;
  credits: Credit[];
  dateDisplay: string; // "2026 · 05 · 12"
  dateISO: string; // "2026-05-12"
  displayDateDisplay: string; // 负栏目显示原文写作日期；其他栏目显示博客发布日期
  displayDateISO: string;
  updatedISO: string; // 修订日期（front-matter `updated`），缺省回退到 dateISO
  contentRevision: string; // 渲染后正文 HTML 的 SHA-256 短哈希
  timestamp: number; // 用于排序
  excerpt: string;
  relatedPosts: string[]; // 多媒体条目按编辑顺序声明的关联文章 slug
  featuredOrder: number; // 同栏目首页推荐优先级；数值越大越靠前
  readMin: number;
  no: string; // 常规文章保留全站流水号；负栏目使用独立的 -1、-2… 编号
  sectionNo: string; // 常规栏目按发表日期编号；负栏目按原文写作日期编号
  citation: CitationRecord;
}

export interface Post extends PostSummary {
  originalTitle: string;
  originalPublication: string;
  originalDate: string;
  titleNoteHtml: string;
  html: string;
  markdown: string;
  sortOrder: number;
}

/* ---------------- front-matter 解析（双写法） ---------------- */
function parseFrontMatter(raw: string): { data: Record<string, unknown>; content: string } {
  const stripped = raw.replace(/^﻿/, "");
  // 标准写法：以 --- 开头
  if (/^---[^\r\n]*\r?(?:\n|$)/.test(stripped)) {
    const parsed = parseYamlFrontMatter(stripped);
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
    const parsed = parseLegacyYamlFrontMatter(head, body);
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

// 署名角色 → 方块标记。作者实心，其余空心。可在 front-matter 用任一历史 key 填写。
export const CREDIT_ROLE_META: Record<
  CreditRole,
  { label: string; mark: string; solid: boolean }
> = {
  author: { label: "作者", mark: "作", solid: true },
  translator: { label: "译者", mark: "译", solid: false },
  proofreader: { label: "校对", mark: "校", solid: false },
};

export const CREDIT_ROLES = Object.keys(CREDIT_ROLE_META) as CreditRole[];

const CREDIT_FIELDS: { role: CreditRole; keys: string[] }[] = [
  { role: "author", keys: ["post_author", "author", "作者"] },
  { role: "translator", keys: ["translator", "译者", "翻译"] },
  { role: "proofreader", keys: ["proofreader", "校对", "校对者", "校"] },
];

/**
 * Old posts use display names rather than ids. Commas, Chinese enumeration
 * commas, line breaks and full-width spaces separate people; ordinary spaces
 * remain valid inside Latin names.
 */
function creditNames(value: unknown): string[] {
  const values = Array.isArray(value) ? value : [value];
  return values.flatMap((item) =>
    String(item)
      .split(/[,，、;；\n]+|\u3000+/u)
      .map((name) => name.trim())
      .filter(Boolean)
  );
}

function buildCredits(data: Record<string, unknown>, file: string): Credit[] {
  const out: Credit[] = [];
  for (const field of CREDIT_FIELDS) {
    const key = field.keys.find((candidate) => {
      const value = data[candidate];
      return value != null && (Array.isArray(value) ? value.length > 0 : String(value).trim() !== "");
    });
    if (!key) continue;

    for (const rawName of creditNames(data[key])) {
      const contributor = findContributor(rawName) ?? findContributorByName(rawName);
      if (!contributor) {
        throw new Error(
          `${file}: 署名“${rawName}”尚未登记。请先在 lib/contributors.ts 添加稳定贡献者 id。`
        );
      }
      const meta = CREDIT_ROLE_META[field.role];
      out.push({
        role: field.role,
        contributorId: contributor.id,
        mark: meta.mark,
        name: contributor.displayName,
        solid: meta.solid,
      });
    }
  }
  return out;
}

function resolveSection(data: Record<string, unknown>, file: string): EditorialSection {
  const declared = typeof data.section === "string" ? data.section.trim().toLowerCase() : "";
  if (isEditorialSection(declared)) return declared;
  throw new Error(
    `${file}: front-matter section 必须是 essay / review / translation / multimedia / negative 之一`
  );
}

function resolveHanScript(data: Record<string, unknown>, file: string): HanScript {
  const declared = typeof data.script === "string" ? data.script.trim().toLowerCase() : "";
  if (isHanScript(declared)) return declared;
  throw new Error(`${file}: front-matter script 必须是 hans 或 hant`);
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

function isISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  const date = toDate(value);
  return +date > 0 && fmtISO(date) === value;
}

function plainText(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const URL_RE = /https?:\/\/\S+/gi;

function isDraft(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return /^(true|yes|1)$/i.test(v.trim());
  return false;
}

function toSortOrder(v: unknown): number {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v.trim()) : 0;
  return Number.isFinite(n) ? n : 0;
}

function metadataText(v: unknown): string {
  if (v == null) return "";
  if (v instanceof Date && !isNaN(+v)) return fmtISO(v);
  return String(v).trim();
}

function titleBreaks(
  value: unknown,
  title: string,
  file: string,
  field = "title_breaks"
): string[] {
  if (value == null) return [title];
  if (!Array.isArray(value)) {
    throw new Error(`${file}: ${field} 必须是按显示顺序填写的字符串数组`);
  }
  const segments = value.map((segment) => String(segment).trim()).filter(Boolean);
  if (segments.length === 0 || segments.join("") !== title) {
    throw new Error(`${file}: ${field} 拼接后必须与 title 完全一致`);
  }
  return segments;
}

function comparePosts(a: Post, b: Post): number {
  return b.timestamp - a.timestamp || b.sortOrder - a.sortOrder || a.slug.localeCompare(b.slug);
}

type PublicSectionPage = {
  section: string;
  sectionNo: string;
  no: string;
  timestamp: number;
  slug: string;
  originalDate: string;
  sortOrder: number;
  sourceSlug: string;
  post?: Post;
  chapterKeys?: string[];
};

type BookChapterNumberInput = {
  id?: unknown;
  status?: unknown;
  presentation?: unknown;
  publishedAt?: unknown;
  sections?: unknown;
  children?: unknown;
};

function chapterNumberKey(documentSlug: string, chapterId: string): string {
  return `${documentSlug}:${chapterId}`;
}

function flattenChapterNumberInputs(value: unknown): BookChapterNumberInput[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((chapter) => {
    if (!chapter || typeof chapter !== "object" || Array.isArray(chapter)) return [];
    const input = chapter as BookChapterNumberInput;
    return [input, ...flattenChapterNumberInputs(input.children)];
  });
}

function publicSectionPages(posts: Post[], visiblePosts: Post[]): PublicSectionPage[] {
  const pages: PublicSectionPage[] = visiblePosts.map((post) => ({
    section: post.section,
    sectionNo: "00",
    no: "00",
    timestamp: post.timestamp,
    slug: post.slug,
    originalDate: post.originalDate,
    sortOrder: post.sortOrder,
    sourceSlug: post.slug,
    post,
  }));

  if (!fs.existsSync(BOOKS_DIR)) return pages;

  const bookDocuments = new Map(
    posts
      .filter((post) => !post.draft && post.bookDocument)
      .map((post) => [post.slug, post] as const)
  );

  for (const file of fs.readdirSync(BOOKS_DIR).filter((name) => name.endsWith(".json"))) {
    const manifest = JSON.parse(fs.readFileSync(path.join(BOOKS_DIR, file), "utf8")) as Record<string, unknown>;
    const documentSlug = typeof manifest.documentSlug === "string" ? manifest.documentSlug.trim() : "";
    const post = bookDocuments.get(documentSlug);
    if (!post) continue;

    const chapters = flattenChapterNumberInputs(manifest.chapters);
    const published = chapters.filter((chapter) => (chapter.status ?? "published") === "published");
    const readingDates = published
      .filter((chapter) => (chapter.presentation ?? "reading") === "reading")
      .flatMap((chapter) => {
        const sectionDates = Array.isArray(chapter.sections)
          ? chapter.sections.flatMap((section) => {
              if (!section || typeof section !== "object" || Array.isArray(section)) return [];
              const input = section as { status?: unknown; publishedAt?: unknown };
              return input.status === "published" && typeof input.publishedAt === "string"
                ? [input.publishedAt.trim()]
                : [];
            })
          : [];
        return [
          typeof chapter.publishedAt === "string" ? chapter.publishedAt.trim() : "",
          ...sectionDates,
        ];
      })
      .filter((date) => Number.isFinite(Date.parse(date)))
      .sort((a, b) => b.localeCompare(a));
    const publishedAt = readingDates[0]
      ?? (typeof manifest.publishedAt === "string" ? manifest.publishedAt.trim() : "");
    const timestamp = Date.parse(publishedAt);
    const chapterKeys = published.flatMap((chapter) => {
      const chapterId = typeof chapter.id === "string" ? chapter.id.trim() : "";
      return chapterId ? [chapterNumberKey(documentSlug, chapterId)] : [];
    });
    if (!Number.isFinite(timestamp) || chapterKeys.length === 0) continue;

    pages.push({
      section: post.section,
      sectionNo: "00",
      no: "00",
      timestamp,
      slug: documentSlug,
      originalDate: publishedAt,
      sortOrder: post.sortOrder,
      sourceSlug: documentSlug,
      chapterKeys,
    });
  }

  return pages;
}

function assignPublicNumbers(posts: Post[], visiblePosts: Post[]): void {
  const pages = publicSectionPages(posts, visiblePosts).sort(
    (a, b) =>
      b.timestamp - a.timestamp ||
      b.sortOrder - a.sortOrder ||
      a.sourceSlug.localeCompare(b.sourceSlug) ||
      a.slug.localeCompare(b.slug)
  );

  assignPostNumbers(pages);
  bookChapterSectionNumbers.clear();
  pages.forEach((page) => {
    if (page.post) {
      page.post.no = page.no;
      page.post.sectionNo = page.sectionNo;
    }
    page.chapterKeys?.forEach((key) => bookChapterSectionNumbers.set(key, page.sectionNo));
  });
}

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
  return source;
}

export function readMinutes(html: string): number {
  const text = plainText(html);
  const cjk = (text.match(/[㐀-鿿豈-﫿]/g) || []).length;
  const latin = (text.match(/[A-Za-z0-9]+/g) || []).length;
  return Math.max(1, Math.round((cjk + latin) / 400));
}

export function hashRenderedContent(html: string): string {
  return createHash("sha256").update(html).digest("hex").slice(0, 16);
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

      const date = toDate(data.date);
      const updated = toDate(data.updated);
      const html = await renderMarkdown(content);
      const title = String(data.title ?? baseName).trim();
      const preferredTitleBreaks = titleBreaks(data.title_breaks ?? data.titleBreaks, title, file);
      const homeTitleBreaksValue = data.home_title_breaks ?? data.homeTitleBreaks;
      const preferredHomeTitleBreaks = homeTitleBreaksValue == null
        ? []
        : titleBreaks(homeTitleBreaksValue, title, file, "home_title_breaks");
      const subtitle = String(data.subtitle ?? "").trim();
      const titleNote = metadataText(data.title_note ?? data.titleNote);
      const titleNoteHtml = titleNote ? await renderMarkdown(titleNote) : "";
      const draft = isDraft(data.draft);
      const bookDocument = isDraft(data.book_document);
      const category = categories[0] ?? tags[0] ?? "未分类";
      const uniqueTags = Array.from(new Set(tags));
      const credits = buildCredits(data, file);
      const section = resolveSection(data, file);
      const script = resolveHanScript(data, file);
      const originalDate = metadataText(data.original_date ?? data.originalDate ?? data["原文日期"]);
      if (section === "negative" && !isISODate(originalDate)) {
        throw new Error(`${file}: section: negative 必须填写有效的 original_date（YYYY-MM-DD）`);
      }
      const displayDate = section === "negative" ? toDate(originalDate) : date;
      const authors = credits
        .filter((credit) => credit.role === "author")
        .map((credit) => credit.name);
      const citationCreators: CitationCreator[] = credits.flatMap((credit) =>
        credit.role === "proofreader"
          ? []
          : [{ creatorType: credit.role, name: credit.name }]
      );
      const citationInput = data.citation == null
        ? undefined
        : parseCitationInput(data.citation, `${file}: citation`);
      if (citationInput && !citationInput.itemType) {
        throw new Error(`${file}: citation.itemType 必须显式填写 Zotero item type`);
      }
      const citation = mergeCitation(
        pageCitationDefaults({
          slug,
          section,
          script,
          title,
          subtitle,
          creators: citationCreators,
          date: fmtISO(date),
          abstractNote: deriveExcerpt(html, data.excerpt, title),
          rights: metadataText(data.license),
        }),
        citationInput,
        `${file}: citation`
      );

      const post: Post = {
        slug,
        script,
        title,
        titleBreaks: preferredTitleBreaks,
        homeTitleBreaks: preferredHomeTitleBreaks,
        subtitle,
        titleNote,
        draft,
        bookDocument,
        category,
        section,
        tags: uniqueTags,
        author: authors.join("　") || String(data.post_author ?? data.author ?? "").trim(),
        credits,
        dateDisplay: fmtDisplay(date),
        dateISO: fmtISO(date),
        displayDateDisplay: fmtDisplay(displayDate),
        displayDateISO: fmtISO(displayDate),
        updatedISO: +updated > 0 ? fmtISO(updated) : fmtISO(date),
        contentRevision: hashRenderedContent(html + titleNoteHtml),
        timestamp: +date,
        sortOrder: toSortOrder(data.sort_order ?? data.sortOrder ?? data.order),
        excerpt: deriveExcerpt(html, data.excerpt, title),
        relatedPosts: Array.from(new Set(toList(data.related_posts))),
        featuredOrder: toSortOrder(data.featured_order),
        readMin: readMinutes(html + titleNoteHtml),
        no: "00",
        sectionNo: "00",
        citation,
        originalTitle: metadataText(data.original_title ?? data.originalTitle ?? data["原文题名"]),
        originalPublication: metadataText(
          data.original_publication ??
            data.originalPublication ??
            data.original_source ??
            data["原刊"]
        ),
        originalDate,
        titleNoteHtml,
        html,
        markdown: content,
      };
      return post;
    })
  );

  const visiblePosts = posts.filter((p) => !p.draft && !p.bookDocument);

  // 重复 slug 守卫（与 books.ts / topics.ts 一致）：两篇可见文稿撞 slug 时，
  // getPostBySlug 会静默取首个并遮蔽另一篇，而编号仍把两篇都计入 N —— 直接抛错。
  // 构建期 validate-content 已拦截；此处为运行期纵深防御，避免门禁被绕过时静默出重复 URL。
  const slugOwner = new Map<string, string>();
  for (const p of visiblePosts) {
    const prev = slugOwner.get(p.slug);
    if (prev) {
      throw new Error(`重复 slug「${p.slug}」：《${prev}》与《${p.title}》撞车，slug 必须唯一`);
    }
    slugOwner.set(p.slug, p.title);
  }

  // 时间倒序（最新在前）；普通内容与每本书共同占一个公开条目。
  visiblePosts.sort(comparePosts);
  // 同一本书的所有章节映射到书籍条目的同一个栏目号。
  assignPublicNumbers(posts, visiblePosts);

  return posts.sort(comparePosts);
}

/* ---------------- 构建期缓存 ---------------- */
let cache: Promise<Post[]> | null = null;
function all(): Promise<Post[]> {
  if (!cache) cache = loadRaw();
  return cache;
}

const strip = ({
  html,
  markdown,
  sortOrder,
  originalTitle,
  originalPublication,
  originalDate,
  titleNoteHtml,
  ...rest
}: Post): PostSummary => rest;

export async function getAllPosts(): Promise<PostSummary[]> {
  return (await all()).filter((p) => !p.draft && !p.bookDocument).map(strip);
}

/** 含渲染后 HTML 的全量文章（仅正式发布），供 RSS feed 使用 */
export async function getAllPostsFull(): Promise<Post[]> {
  return (await all()).filter((p) => !p.draft && !p.bookDocument);
}

export async function getAllSlugs(): Promise<string[]> {
  return (await all())
    .filter((p) => !p.draft && !p.bookDocument)
    .map((p) => p.slug);
}

/**
 * Parameters accepted by dynamic post/media routes. Production builds expose
 * only published records; `next dev` also enumerates drafts so the existing
 * local preview workflow keeps working with `dynamicParams = false`.
 */
export async function getPreviewablePosts(): Promise<PostSummary[]> {
  return (await all())
    .filter((p) => (allowDraftPreview() || !p.draft) && !p.bookDocument)
    .map(strip);
}

export async function getPreviewableSlugs(): Promise<string[]> {
  return (await all())
    .filter((p) => (allowDraftPreview() || !p.draft) && !p.bookDocument)
    .map((p) => p.slug);
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const posts = await all();
  const post = posts.find((p) => p.slug === slug) ?? null;
  if (!post || (!allowDraftPreview() && post.draft)) return null;
  return post;
}

export async function getBookChapterSectionNumber(
  documentSlug: string,
  chapterId: string
): Promise<string | null> {
  await all();
  return bookChapterSectionNumbers.get(chapterNumberKey(documentSlug, chapterId)) ?? null;
}

/** 下一篇（循环），用于文章页底部导航 */
export async function getAdjacent(slug: string): Promise<PostSummary | null> {
  const posts = (await all()).filter((p) => !p.draft && !p.bookDocument);
  if (posts.length === 0) return null;
  const idx = posts.findIndex((p) => p.slug === slug);
  if (idx === -1) return null;
  return strip(posts[(idx + 1) % posts.length]);
}

/** 站点期号，如 "2026 · 06"，取最新文章年月 */
export async function getIssue(): Promise<string> {
  const posts = (await all()).filter((p) => !p.draft && !p.bookDocument);
  if (!posts.length) return "";
  const d = new Date(posts[0].timestamp);
  return `${d.getUTCFullYear()} · ${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function allowDraftPreview(): boolean {
  return process.env.NODE_ENV !== "production";
}
