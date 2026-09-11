/**
 * Resolve a serialized book into the ordered, published-chapter document list
 * plus the metadata an ebook edition needs — and a single library article
 * (文库) into its one-document equivalent. Content always comes from the
 * existing lib/books.ts / lib/posts.ts pipelines (which render via
 * lib/markdown.ts).
 */
import { createHash } from "node:crypto";
import {
  bookHref,
  bookStatusLabel,
  getBookChapterCredits,
  getBookChapterDocuments,
  getPublishedBookChapters,
  getAllBookChapters,
  type Book,
  type BookChapterDocument,
} from "../books";
import { getAllPostsFull, type Post } from "../posts";
import { PRIMARY_CREDIT_ROLES } from "../credit-roles";
import { postPath } from "../editorial";
import { licenseUrlFromRights } from "../citations";
import { EBOOK_GENERATOR_VERSION } from "./manifest";
import { SITE_ORIGIN, type ChapterInput } from "./html";

/**
 * The generator version participates in the revision hash so a generator bump
 * (new styles, new packaging) yields a new object key: published URLs are
 * served with Cache-Control: immutable and must never be overwritten with
 * different bytes. Generator 1 predates this field — omitting it there keeps
 * every already-published generator-1 key stable.
 */
function revisionGeneratorField(): { generator?: number } {
  return EBOOK_GENERATOR_VERSION > 1 ? { generator: EBOOK_GENERATOR_VERSION } : {};
}

/**
 * Locale of the generated edition. Chinese canonical editions only for now;
 * kept as a parameter so en/ja become configuration later.
 */
export type EbookLocale = "zh";

/** Metadata shared by every generated edition regardless of kind. */
interface CollectedEditionMetaBase {
  slug: string;
  title: string;
  subtitle?: string;
  description: string;
  /** BCP-47 tag derived from the edition's Han script field. */
  language: string;
  /** Stable identifier: the canonical site URL of the edition. */
  identifier: string;
  url: string;
  date: string;
  updatedAt: string;
  authors: string[];
  translators: string[];
  publisher: string;
  rights?: string;
  licenseUrl?: string;
}

export interface CollectedBookMeta extends CollectedEditionMetaBase {
  kind: "book";
  statusLabel: string;
  publishedChapterCount: number;
  totalChapterCount: number;
  latestChapterNumber: string;
}

export interface CollectedArticleMeta extends CollectedEditionMetaBase {
  kind: "article";
  proofreaders: string[];
}

export type CollectedEditionMeta = CollectedBookMeta | CollectedArticleMeta;

export interface CollectedBook {
  book: Book;
  meta: CollectedBookMeta;
  documents: BookChapterDocument[];
  /** Content hash keyed on everything that affects the generated edition. */
  contentRevision: string;
}

function uniqueInOrder(values: readonly string[]): string[] {
  return [...new Set(values)];
}

export async function collectBook(book: Book, locale: EbookLocale = "zh"): Promise<CollectedBook> {
  if (locale !== "zh") {
    throw new Error(`[ebook] ${book.slug}: locale ${locale} editions are not configured yet`);
  }
  const documents = await getBookChapterDocuments(book);
  const published = getPublishedBookChapters(book);
  const allChapters = getAllBookChapters(book);

  const chapterCredits = published.flatMap((chapter) => getBookChapterCredits(book, chapter));
  const authors = uniqueInOrder(
    chapterCredits.filter((credit) => credit.role === "author").map((credit) => credit.name)
  );
  const translators = uniqueInOrder(
    chapterCredits.filter((credit) => credit.role === "translator").map((credit) => credit.name)
  );
  const rights = book.translationCitation.rights;
  const latestChapterNumber = published[published.length - 1]?.number ?? "";

  const meta: CollectedBookMeta = {
    kind: "book",
    slug: book.slug,
    title: book.title,
    subtitle: book.subtitle,
    description: book.description,
    language: book.script === "hant" ? "zh-Hant" : "zh-Hans",
    identifier: `${SITE_ORIGIN}${bookHref(book)}`,
    url: `${SITE_ORIGIN}${bookHref(book)}`,
    date: book.publishedAt,
    updatedAt: book.updatedAt,
    statusLabel: bookStatusLabel(book.status),
    authors,
    translators,
    publisher: "屋顶现视研",
    rights,
    licenseUrl: licenseUrlFromRights(rights),
    publishedChapterCount: published.length,
    totalChapterCount: allChapters.length,
    latestChapterNumber,
  };

  const revisionPayload = JSON.stringify({
    ...revisionGeneratorField(),
    meta,
    chapters: documents.map((document) => ({
      id: document.chapter.id,
      number: document.chapter.number,
      title: document.chapter.title,
      titleBreaks: document.chapter.titleBreaks,
      anchor: document.chapter.anchor,
      publishedAt: document.chapter.publishedAt,
      contentRevision: document.contentRevision,
    })),
  });
  const contentRevision = createHash("sha256").update(revisionPayload).digest("hex").slice(0, 16);

  return { book, meta, documents, contentRevision };
}

export interface CollectedArticle {
  post: Post;
  meta: CollectedArticleMeta;
  /** An article is a one-document edition fed through the same generator. */
  document: ChapterInput;
  /** Content hash keyed on everything that affects the generated edition. */
  contentRevision: string;
}

/**
 * A post is a library article (the /posts/[slug] target set) when it is
 * published and is neither a book build source (`book_document` front matter —
 * those pages live under /books/… reading routes) nor a multimedia entry
 * (which /posts/[slug] permanently redirects to /media/…).
 */
export function isLibraryArticlePost(
  post: Pick<Post, "draft" | "bookDocument" | "section">
): boolean {
  return !post.draft && !post.bookDocument && post.section !== "multimedia";
}

/** Every published library article, newest first (lib/posts.ts order). */
export async function getLibraryArticlePosts(): Promise<Post[]> {
  return (await getAllPostsFull()).filter(isLibraryArticlePost);
}

export async function collectArticle(post: Post, locale: EbookLocale = "zh"): Promise<CollectedArticle> {
  if (locale !== "zh") {
    throw new Error(`[ebook] ${post.slug}: locale ${locale} editions are not configured yet`);
  }
  if (!isLibraryArticlePost(post)) {
    throw new Error(`[ebook] ${post.slug}: not a library article (draft, book document, or multimedia)`);
  }

  const authors = uniqueInOrder(
    post.credits
      .filter((credit) => PRIMARY_CREDIT_ROLES.includes(credit.role))
      .map((credit) => credit.name)
  );
  const translators = uniqueInOrder(
    post.credits.filter((credit) => credit.role === "translator").map((credit) => credit.name)
  );
  const proofreaders = uniqueInOrder(
    post.credits.filter((credit) => credit.role === "proofreader").map((credit) => credit.name)
  );
  // The colophon license line reuses the article's citation rights, exactly
  // like the reading edition's cite.bib metadata.
  const rights = post.citation.rights || undefined;

  const meta: CollectedArticleMeta = {
    kind: "article",
    slug: post.slug,
    title: post.title,
    subtitle: post.subtitle || undefined,
    description: post.excerpt,
    language: post.script === "hant" ? "zh-Hant" : "zh-Hans",
    identifier: `${SITE_ORIGIN}${postPath(post)}`,
    url: `${SITE_ORIGIN}${postPath(post)}`,
    date: post.dateISO,
    updatedAt: post.updatedISO,
    authors,
    translators,
    proofreaders,
    publisher: "屋顶现视研",
    rights,
    licenseUrl: licenseUrlFromRights(rights),
  };

  const document: ChapterInput = {
    id: "article",
    number: post.no,
    title: post.title,
    titleBreaks: post.titleBreaksExplicit ? post.titleBreaks : undefined,
    anchor: "article-title",
    html: post.html,
  };

  const revisionPayload = JSON.stringify({
    ...revisionGeneratorField(),
    meta,
    document: {
      id: document.id,
      number: document.number,
      title: document.title,
      titleBreaks: document.titleBreaks,
      anchor: document.anchor,
      // Same revision source the reading edition uses (rendered html + title note).
      contentRevision: post.contentRevision,
    },
  });
  const contentRevision = createHash("sha256").update(revisionPayload).digest("hex").slice(0, 16);

  return { post, meta, document, contentRevision };
}
