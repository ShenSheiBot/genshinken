import fs from "node:fs";
import path from "node:path";
import { bookHref, getAllBooks, type Book } from "./books";
import { postPath, type EditorialSection } from "./editorial";
import { renderMarkdown } from "./markdown";
import { sanitizePublicContentHtml } from "./media-material";
import { getAllPosts, type PostSummary } from "./posts";
import { topicMembershipNumber } from "./topic-numbering";
import { parseYamlFrontMatter } from "./safe-front-matter.mjs";

const TOPICS_DIR = path.join(process.cwd(), "source", "_topics");

export const TOPIC_STATUSES = ["ongoing", "complete", "archived"] as const;
export type TopicStatus = (typeof TOPIC_STATUSES)[number];
export type TopicItemType = "post" | "book" | "media";

export interface TopicItemReference {
  type: TopicItemType;
  ref: string;
  editorialNote: string;
}

export interface TopicGroupSource {
  id: string;
  title: string;
  summary: string;
  /** 单元编号；缺省时按分组顺序从 01 递增。序言一类的前置单元可显式写 "00"。 */
  number: string;
  items: TopicItemReference[];
}

export interface ResolvedTopicItem extends TopicItemReference {
  title: string;
  subtitle: string;
  summary: string;
  href: string;
  section: EditorialSection | "book";
  category: string;
  dateISO: string;
  readMin: number | null;
}

export interface TopicGroup extends Omit<TopicGroupSource, "items"> {
  items: ResolvedTopicItem[];
}

export interface TopicSummary {
  slug: string;
  title: string;
  subtitle: string;
  summary: string;
  status: TopicStatus;
  published: string;
  updated: string;
  curators: string[];
  groupCount: number;
  itemCount: number;
}

export interface TopicMembership {
  href: string;
  title: string;
  groupNumber: string;
}

export interface Topic extends TopicSummary {
  introductionHtml: string;
  groups: TopicGroup[];
  startHere: ResolvedTopicItem;
}

interface TopicSource {
  slug: string;
  title: string;
  subtitle: string;
  summary: string;
  status: TopicStatus;
  published: string;
  updated: string;
  curators: string[];
  introductionMarkdown: string;
  groups: TopicGroupSource[];
  file: string;
}

function asObject(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} 必须是对象。`);
  }
  return value as Record<string, unknown>;
}

function requiredText(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} 不能为空。`);
  }
  return value.trim();
}

function optionalText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function textList(value: unknown, label: string): string[] {
  if (value == null || value === "") return [];
  const values = Array.isArray(value) ? value : [value];
  return values.map((item, index) => requiredText(item, `${label}[${index}]`));
}

function isoDate(value: unknown, label: string): string {
  if (value instanceof Date && !Number.isNaN(+value)) return value.toISOString().slice(0, 10);
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    const normalized = value.trim();
    const parsed = new Date(`${normalized}T00:00:00Z`);
    if (!Number.isNaN(+parsed) && parsed.toISOString().slice(0, 10) === normalized) return normalized;
  }
  throw new Error(`${label} 必须是有效的 YYYY-MM-DD 日期。`);
}

function topicStatus(value: unknown, label: string): TopicStatus {
  if (typeof value === "string" && TOPIC_STATUSES.includes(value as TopicStatus)) {
    return value as TopicStatus;
  }
  throw new Error(`${label} 必须是 ${TOPIC_STATUSES.join(" / ")} 之一。`);
}

function itemType(value: unknown, label: string): TopicItemType {
  if (value === "post" || value === "book" || value === "media") return value;
  throw new Error(`${label} 必须是 post / book / media 之一。`);
}

function groupNumber(value: unknown, index: number, label: string): string {
  if (value == null || value === "") return String(index + 1).padStart(2, "0");
  const declared = typeof value === "number" ? String(value) : String(value).trim();
  if (!/^\d{1,2}$/.test(declared)) {
    throw new Error(`${label}.number 只能是一到两位数字，如 "00"。`);
  }
  return declared.padStart(2, "0");
}

function parseGroups(value: unknown, file: string): TopicGroupSource[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${file}: groups 至少需要一个分组。`);
  }

  const groupIds = new Set<string>();
  const groupNumbers = new Set<string>();
  const itemRefs = new Set<string>();
  return value.map((rawGroup, groupIndex) => {
    const label = `${file}: groups[${groupIndex}]`;
    const group = asObject(rawGroup, label);
    const id = requiredText(group.id, `${label}.id`);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
      throw new Error(`${label}.id 只能使用小写字母、数字和连字符。`);
    }
    if (groupIds.has(id)) throw new Error(`${file}: 分组 id “${id}” 重复。`);
    groupIds.add(id);
    const number = groupNumber(group.number, groupIndex, label);
    if (groupNumbers.has(number)) throw new Error(`${file}: 专题单元编号 “${number}” 重复。`);
    groupNumbers.add(number);

    if (!Array.isArray(group.items) || group.items.length === 0) {
      throw new Error(`${label}.items 至少需要一个条目。`);
    }
    const items = group.items.map((rawItem, itemIndex) => {
      const itemLabel = `${label}.items[${itemIndex}]`;
      const item = asObject(rawItem, itemLabel);
      const type = itemType(item.type, `${itemLabel}.type`);
      const ref = requiredText(item.ref, `${itemLabel}.ref`);
      const uniqueKey = `${type}:${ref}`;
      if (itemRefs.has(uniqueKey)) {
        throw new Error(`${file}: 条目引用 “${uniqueKey}” 重复；同一条目只需编排一次。`);
      }
      itemRefs.add(uniqueKey);
      return {
        type,
        ref,
        editorialNote: optionalText(item.editorialNote),
      };
    });

    return {
      id,
      title: requiredText(group.title, `${label}.title`),
      summary: optionalText(group.summary),
      number,
      items,
    };
  });
}

function parseTopicFile(file: string): TopicSource {
  const fullPath = path.join(TOPICS_DIR, file);
  const parsed = parseYamlFrontMatter(fs.readFileSync(fullPath, "utf8"));
  const data = parsed.data as Record<string, unknown>;
  const fallbackSlug = file.replace(/\.md$/, "");
  const slug = optionalText(data.slug) || fallbackSlug;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error(`${file}: slug 只能使用小写字母、数字和连字符。`);
  }
  if (slug !== fallbackSlug) {
    throw new Error(`${file}: slug “${slug}” 必须与文件名一致。`);
  }

  const published = isoDate(data.published, `${file}: published`);
  const updated = isoDate(data.updated ?? data.published, `${file}: updated`);
  if (updated < published) throw new Error(`${file}: updated 不能早于 published。`);
  const introductionMarkdown = optionalText(data.introduction) || parsed.content.trim();
  if (!introductionMarkdown) {
    throw new Error(`${file}: 需要在正文或 introduction 字段中填写专题导语。`);
  }

  return {
    slug,
    title: requiredText(data.title, `${file}: title`),
    subtitle: optionalText(data.subtitle),
    summary: requiredText(data.summary, `${file}: summary`),
    status: topicStatus(data.status, `${file}: status`),
    published,
    updated,
    curators: textList(data.curators, `${file}: curators`),
    introductionMarkdown,
    groups: parseGroups(data.groups, file),
    file,
  };
}

function listMarkdownFiles(directory: string): string[] {
  if (!fs.existsSync(directory)) return [];
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name.endsWith(".md") &&
        !entry.name.startsWith("_") &&
        !entry.name.startsWith(".")
    )
    .map((entry) => entry.name)
    .sort();
}

function resolvePostReference(
  item: TopicItemReference,
  posts: Map<string, PostSummary>,
  file: string
): ResolvedTopicItem {
  const post = posts.get(item.ref);
  if (!post) throw new Error(`${file}: 找不到 ${item.type} 引用 “${item.ref}”。`);
  const isMedia = post.section === "multimedia";
  if (item.type === "media" && !isMedia) {
    throw new Error(`${file}: “${item.ref}” 不是 multimedia 内容，不能标记为 media。`);
  }
  if (item.type === "post" && isMedia) {
    throw new Error(`${file}: “${item.ref}” 是 multimedia 内容，应标记为 media。`);
  }
  return {
    ...item,
    title: post.title,
    subtitle: post.subtitle,
    summary: post.excerpt,
    href: postPath(post),
    section: post.section,
    category: post.category,
    dateISO: post.dateISO,
    readMin: post.readMin,
  };
}

function resolveBookReference(
  item: TopicItemReference,
  books: Map<string, Book>,
  file: string
): ResolvedTopicItem {
  const book = books.get(item.ref);
  if (!book) {
    throw new Error(`${file}: 找不到 book 引用 “${item.ref}”。`);
  }
  return {
    ...item,
    title: book.title,
    subtitle: book.subtitle,
    summary: book.description,
    href: bookHref(book),
    section: "book",
    category: "书籍",
    dateISO: book.publishedAt,
    readMin: null,
  };
}

async function loadTopics(): Promise<Topic[]> {
  const sources = listMarkdownFiles(TOPICS_DIR).map(parseTopicFile);
  const slugSet = new Set<string>();
  for (const source of sources) {
    if (slugSet.has(source.slug)) throw new Error(`专题 slug “${source.slug}” 重复。`);
    slugSet.add(source.slug);
  }

  const posts = new Map((await getAllPosts()).map((post) => [post.slug, post]));
  const books = new Map(getAllBooks().map((book) => [book.slug, book]));
  const topics = await Promise.all(
    sources.map(async (source) => {
      const groups = source.groups.map((group) => ({
        ...group,
        items: group.items.map((item) =>
          item.type === "book"
            ? resolveBookReference(item, books, source.file)
            : resolvePostReference(item, posts, source.file)
        ),
      }));
      const startHere = groups[0]?.items[0];
      if (!startHere) throw new Error(`${source.file}: 无法确定“从这里开始”的首个条目。`);
      return {
        slug: source.slug,
        title: source.title,
        subtitle: source.subtitle,
        summary: source.summary,
        status: source.status,
        published: source.published,
        updated: source.updated,
        curators: source.curators,
        introductionHtml: sanitizePublicContentHtml(
          await renderMarkdown(source.introductionMarkdown)
        ),
        groups,
        startHere,
        groupCount: groups.length,
        itemCount: groups.reduce((sum, group) => sum + group.items.length, 0),
      } satisfies Topic;
    })
  );

  return topics.sort(
    (a, b) => b.published.localeCompare(a.published) || a.slug.localeCompare(b.slug)
  );
}

let cache: Promise<Topic[]> | null = null;
function allTopics(): Promise<Topic[]> {
  if (!cache) cache = loadTopics();
  return cache;
}

function summary(topic: Topic): TopicSummary {
  const { introductionHtml, groups, startHere, ...rest } = topic;
  void introductionHtml;
  void groups;
  void startHere;
  return rest;
}

export async function getAllTopics(): Promise<TopicSummary[]> {
  return (await allTopics()).map(summary);
}

export async function getAllTopicSlugs(): Promise<string[]> {
  return (await allTopics()).map((topic) => topic.slug);
}

export async function getTopicBySlug(slug: string): Promise<Topic | null> {
  return (await allTopics()).find((topic) => topic.slug === slug) ?? null;
}

export async function getTopicMembershipsForPost(slug: string): Promise<TopicMembership[]> {
  return (await allTopics()).flatMap((topic) =>
    topic.groups.flatMap((group) => {
      const itemIndex = group.items.findIndex((item) => item.type === "post" && item.ref === slug);
      return itemIndex >= 0
        ? [{
            href: `/topics/${encodeURIComponent(topic.slug)}`,
            title: topic.title,
            groupNumber: topicMembershipNumber(group.number, itemIndex),
          }]
        : [];
    })
  );
}
