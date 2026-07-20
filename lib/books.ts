import fs from "node:fs";
import path from "node:path";
import {
  CREDIT_ROLE_META,
  getPostBySlug,
  type Credit,
  type CreditRole,
  type Post,
} from "./posts";
import { findContributor, findContributorByName } from "./contributors";

const BOOKS_DIR = path.join(process.cwd(), "source", "_books");
const STABLE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const BOOK_STATUSES = ["serializing", "complete", "paused"] as const;
export const BOOK_CHAPTER_STATUSES = ["published", "forthcoming"] as const;

export type BookStatus = (typeof BOOK_STATUSES)[number];
export type BookChapterStatus = (typeof BOOK_CHAPTER_STATUSES)[number];

interface BookChapterBase {
  id: string;
  number: string;
  title: string;
  status: BookChapterStatus;
  children: BookChapter[];
}

export interface PublishedBookChapter extends BookChapterBase {
  status: "published";
  anchor: string;
  publishedAt: string;
}

export interface ForthcomingBookChapter extends BookChapterBase {
  status: "forthcoming";
}

export type BookChapter = PublishedBookChapter | ForthcomingBookChapter;

export interface Book {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  documentSlug: string;
  status: BookStatus;
  authors: string[];
  translators: string[];
  publishedAt: string;
  updatedAt: string;
  startAnchor: string;
  latestChapterId: string;
  chapters: BookChapter[];
  originalBibtex?: string;
  translationBibtex?: string;
  pdfUrl?: string;
  epubUrl?: string;
}

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function fail(source: string, field: string, detail: string): never {
  throw new Error(`[books] ${source}: ${field} ${detail}`);
}

function requiredString(record: JsonRecord, field: string, source: string): string {
  const value = record[field];
  if (typeof value !== "string" || !value.trim()) fail(source, field, "must be a non-empty string");
  return value.trim();
}

function stableId(record: JsonRecord, field: string, source: string): string {
  const value = requiredString(record, field, source);
  if (!STABLE_ID.test(value)) fail(source, field, "must use lowercase ASCII words separated by hyphens");
  return value;
}

function dateString(record: JsonRecord, field: string, source: string): string {
  const value = requiredString(record, field, source);
  if (!ISO_DATE.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    fail(source, field, "must be an ISO date (YYYY-MM-DD)");
  }
  return value;
}

function stringList(record: JsonRecord, field: string, source: string): string[] {
  const value = record[field];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !item.trim())) {
    fail(source, field, "must be an array of non-empty strings");
  }
  return value.map((item) => (item as string).trim());
}

function optionalString(record: JsonRecord, field: string, source: string): string | undefined {
  const value = record[field];
  if (value == null) return undefined;
  if (typeof value !== "string" || !value.trim()) {
    fail(source, field, "must be a non-empty string when provided");
  }
  return value.trim();
}

function optionalFileUrl(record: JsonRecord, field: string, source: string): string | undefined {
  const value = optionalString(record, field, source);
  if (!value) return undefined;

  if (value.startsWith("/")) {
    try {
      const base = new URL("https://un-canon.invalid");
      if (new URL(value, base).origin === base.origin) return value;
    } catch {
      // Report the field-specific URL validation error below.
    }
  }
  try {
    const parsed = new URL(value);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") return parsed.href;
  } catch {
    // Report a field-specific manifest error below.
  }
  fail(source, field, "must be a root-relative, HTTP, or HTTPS URL");
}

function resolveContributor(value: string) {
  const candidate = value.trim();
  return findContributor(candidate) ?? findContributorByName(candidate);
}

function validateContributorNames(names: string[], field: string, source: string): void {
  names.forEach((name) => {
    if (!resolveContributor(name)) {
      fail(source, field, `contains unregistered contributor ${name}`);
    }
  });
}

function parseChapter(
  value: unknown,
  index: number,
  source: string,
  ancestorForthcoming = false
): BookChapter {
  const chapterSource = `${source} chapter ${index + 1}`;
  if (!isRecord(value)) fail(chapterSource, "entry", "must be an object");

  const declaredStatus = value.status === undefined
    ? "published"
    : requiredString(value, "status", chapterSource);
  if (!BOOK_CHAPTER_STATUSES.includes(declaredStatus as BookChapterStatus)) {
    fail(chapterSource, "status", `must be one of ${BOOK_CHAPTER_STATUSES.join(", ")}`);
  }
  const status = declaredStatus as BookChapterStatus;
  if (ancestorForthcoming && status === "published") {
    fail(chapterSource, "status", "cannot be published beneath a forthcoming ancestor");
  }

  let children: BookChapter[] = [];
  if (value.children !== undefined) {
    if (!Array.isArray(value.children)) fail(chapterSource, "children", "must be an array when provided");
    children = value.children.map((child, childIndex) =>
      parseChapter(child, childIndex, chapterSource, ancestorForthcoming || status === "forthcoming")
    );
  }

  const base = {
    id: stableId(value, "id", chapterSource),
    number: requiredString(value, "number", chapterSource),
    title: requiredString(value, "title", chapterSource),
    children,
  };

  if (status === "published") {
    return {
      ...base,
      status,
      anchor: requiredString(value, "anchor", chapterSource),
      publishedAt: dateString(value, "publishedAt", chapterSource),
    };
  }

  for (const field of ["anchor", "publishedAt"]) {
    if (Object.prototype.hasOwnProperty.call(value, field)) {
      fail(chapterSource, field, "must be omitted for a forthcoming chapter");
    }
  }

  return {
    ...base,
    status,
  };
}

function flattenChapters(chapters: readonly BookChapter[]): BookChapter[] {
  return chapters.flatMap((chapter) => [chapter, ...flattenChapters(chapter.children)]);
}

export function isPublishedBookChapter(chapter: BookChapter): chapter is PublishedBookChapter {
  return chapter.status === "published";
}

function parseManifest(value: unknown, source: string): Book {
  if (!isRecord(value)) fail(source, "manifest", "must contain a JSON object");

  const status = requiredString(value, "status", source);
  if (!BOOK_STATUSES.includes(status as BookStatus)) {
    fail(source, "status", `must be one of ${BOOK_STATUSES.join(", ")}`);
  }

  if (!Array.isArray(value.chapters) || value.chapters.length === 0) {
    fail(source, "chapters", "must contain at least one chapter");
  }
  const chapters = value.chapters.map((chapter, index) => parseChapter(chapter, index, source));
  const allChapters = flattenChapters(chapters);
  const chapterIds = new Set<string>();
  const chapterAnchors = new Set<string>();
  allChapters.forEach((chapter) => {
    if (chapterIds.has(chapter.id)) fail(source, "chapters", `contains duplicate id ${chapter.id}`);
    if (isPublishedBookChapter(chapter) && chapterAnchors.has(chapter.anchor)) {
      fail(source, "chapters", `contains duplicate anchor ${chapter.anchor}`);
    }
    chapterIds.add(chapter.id);
    if (isPublishedBookChapter(chapter)) chapterAnchors.add(chapter.anchor);
  });

  const latestChapterId = stableId(value, "latestChapterId", source);
  const latestChapter = allChapters.find((chapter) => chapter.id === latestChapterId);
  if (!latestChapter) {
    fail(source, "latestChapterId", `does not match a declared chapter (${latestChapterId})`);
  }
  if (!isPublishedBookChapter(latestChapter)) {
    fail(source, "latestChapterId", `must point to a published chapter (${latestChapterId})`);
  }

  const authors = stringList(value, "authors", source);
  const translators = stringList(value, "translators", source);
  validateContributorNames(authors, "authors", source);
  validateContributorNames(translators, "translators", source);

  return {
    id: stableId(value, "id", source),
    slug: stableId(value, "slug", source),
    title: requiredString(value, "title", source),
    subtitle: requiredString(value, "subtitle", source),
    description: requiredString(value, "description", source),
    documentSlug: stableId(value, "documentSlug", source),
    status: status as BookStatus,
    authors,
    translators,
    publishedAt: dateString(value, "publishedAt", source),
    updatedAt: dateString(value, "updatedAt", source),
    startAnchor: requiredString(value, "startAnchor", source),
    latestChapterId,
    chapters,
    originalBibtex: optionalString(value, "originalBibtex", source),
    translationBibtex: optionalString(value, "translationBibtex", source),
    pdfUrl: optionalFileUrl(value, "pdfUrl", source),
    epubUrl: optionalFileUrl(value, "epubUrl", source),
  };
}

export function getAllBooks(): Book[] {
  if (!fs.existsSync(BOOKS_DIR)) return [];

  const books = fs
    .readdirSync(BOOKS_DIR)
    .filter((name) => name.endsWith(".json") && !name.startsWith("_") && !name.startsWith("."))
    .sort((a, b) => a.localeCompare(b, "en"))
    .map((name) => {
      const source = path.join("source", "_books", name);
      const raw = fs.readFileSync(path.join(BOOKS_DIR, name), "utf8");
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new Error(`[books] ${source}: invalid JSON (${detail})`);
      }
      return parseManifest(parsed, source);
    });

  const ids = new Set<string>();
  const slugs = new Set<string>();
  const documentSlugs = new Set<string>();
  books.forEach((book) => {
    if (ids.has(book.id)) fail("source/_books", "id", `is duplicated (${book.id})`);
    if (slugs.has(book.slug)) fail("source/_books", "slug", `is duplicated (${book.slug})`);
    if (documentSlugs.has(book.documentSlug)) {
      fail("source/_books", "documentSlug", `is used by more than one book (${book.documentSlug})`);
    }
    ids.add(book.id);
    slugs.add(book.slug);
    documentSlugs.add(book.documentSlug);
  });

  return books.sort(
    (a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.title.localeCompare(b.title, "zh-CN")
  );
}

export function getBookBySlug(slug: string): Book | null {
  return getAllBooks().find((book) => book.slug === slug) ?? null;
}

export function getBookCredits(book: Pick<Book, "slug" | "authors" | "translators">): Credit[] {
  const rows: Array<{ role: CreditRole; names: string[] }> = [
    { role: "author", names: book.authors },
    { role: "translator", names: book.translators },
  ];

  return rows.flatMap(({ role, names }) => names.map((name) => {
    const contributor = resolveContributor(name);
    if (!contributor) throw new Error(`[books] ${book.slug}: unregistered contributor ${name}`);
    const meta = CREDIT_ROLE_META[role];
    return {
      role,
      contributorId: contributor.id,
      name: contributor.displayName,
      mark: meta.mark,
      solid: meta.solid,
    };
  }));
}

export function getAllBookChapters(book: Pick<Book, "chapters">): BookChapter[] {
  return flattenChapters(book.chapters);
}

export function getPublishedBookChapters(book: Pick<Book, "chapters">): PublishedBookChapter[] {
  return getAllBookChapters(book).filter(isPublishedBookChapter);
}

export function getBookChapter(book: Book, chapterId: string): BookChapter | null {
  return getAllBookChapters(book).find((chapter) => chapter.id === chapterId) ?? null;
}

export function getLatestBookChapter(book: Book): PublishedBookChapter {
  const chapter = getBookChapter(book, book.latestChapterId);
  if (!chapter || !isPublishedBookChapter(chapter)) {
    throw new Error(`[books] ${book.slug}: latest published chapter is missing`);
  }
  return chapter;
}

export function bookHref(book: Pick<Book, "slug">): string {
  return `/books/${encodeURIComponent(book.slug)}`;
}

export function bookChapterHref(
  book: Pick<Book, "slug">,
  chapter: Pick<BookChapter, "id">
): string {
  return `${bookHref(book)}/chapters/${encodeURIComponent(chapter.id)}`;
}

export function bookDocumentHref(
  book: Pick<Book, "documentSlug">,
  sectionId?: string
): string {
  const pathName = `/posts/${encodeURIComponent(book.documentSlug)}`;
  return sectionId ? `${pathName}#${encodeURIComponent(sectionId)}` : pathName;
}

function renderedIds(html: string): Set<string> {
  return new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]));
}

/** Fail the build when a manifest points at a missing document or heading anchor. */
export async function getValidatedBookDocument(book: Book): Promise<Post> {
  const post = await getPostBySlug(book.documentSlug);
  if (!post) {
    throw new Error(`[books] ${book.slug}: document ${book.documentSlug} does not exist`);
  }

  const ids = renderedIds(post.html);
  for (const chapter of getPublishedBookChapters(book)) {
    if (!ids.has(chapter.anchor)) {
      throw new Error(
        `[books] ${book.slug}: chapter ${chapter.id} points to missing rendered id #${chapter.anchor}`
      );
    }
  }
  if (book.startAnchor !== "reading-cover" && !ids.has(book.startAnchor)) {
    throw new Error(`[books] ${book.slug}: startAnchor points to missing rendered id #${book.startAnchor}`);
  }
  return post;
}

export function bookStatusLabel(status: BookStatus): string {
  if (status === "serializing") return "连载中";
  if (status === "paused") return "暂停更新";
  return "已完结";
}
