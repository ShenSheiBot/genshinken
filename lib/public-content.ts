import {
  bookHref,
  getAllBooks,
  getBookChapterDocuments,
  getBookCredits,
  getValidatedBookDocument,
  type Book,
  type BookChapterDocument,
} from "./books";
import { postPath } from "./editorial";
import { assignPostNumbers } from "./post-numbering";
import { getAllPostsFull, type Post, type PostSummary } from "./posts";

export type PublicContentKind = "post" | "book";

/**
 * The public aggregate sequence used by both the homepage and the library.
 * A book source Markdown file never appears directly, and every book occupies
 * exactly one record regardless of how many independent chapter URLs it has.
 */
export interface PublicContentEntry extends PostSummary {
  kind: PublicContentKind;
  href: string;
  bookSlug: string | null;
  bookTitle: string | null;
  originalDate: string;
}

type SortablePublicContent = {
  entry: PublicContentEntry;
  sortOrder: number;
  sourceSlug: string;
};

function postSummary(post: Post): PostSummary {
  const {
    html: _html,
    markdown: _markdown,
    sortOrder: _sortOrder,
    originalTitle: _originalTitle,
    originalPublication: _originalPublication,
    originalDate: _originalDate,
    ...summary
  } = post;
  return summary;
}

function displayDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${year} · ${month} · ${day}`;
}

function latestReadingDate(book: Book, documents: BookChapterDocument[]): string {
  return documents
    .filter((document) => document.chapter.presentation === "reading")
    .flatMap((document) => [
      document.chapter.publishedAt,
      ...document.chapter.sections.flatMap((section) =>
        section.status === "published" ? [section.publishedAt] : []
      ),
    ])
    .sort((a, b) => b.localeCompare(a))[0] ?? book.publishedAt;
}

function bookEntry(
  book: Book,
  source: Post,
  documents: BookChapterDocument[]
): PublicContentEntry {
  const credits = getBookCredits(book);
  const authors = credits
    .filter((credit) => credit.role === "author")
    .map((credit) => credit.name);
  const readingDocuments = documents.filter(
    (document) => document.chapter.presentation === "reading"
  );
  const dateISO = latestReadingDate(book, documents);
  const timestamp = Date.parse(`${dateISO}T00:00:00Z`);
  const readingMinutes = readingDocuments.reduce(
    (total, document) => total + document.readMin,
    0
  );
  const tags = Array.from(new Set(documents.flatMap((document) => document.tags)));

  return {
    ...postSummary(source),
    kind: "book",
    href: bookHref(book),
    bookSlug: book.slug,
    bookTitle: book.title,
    originalDate: book.publishedAt,
    slug: book.slug,
    script: book.script,
    title: book.title,
    subtitle: book.subtitle ?? "",
    bookDocument: false,
    tags,
    author: authors.join("　"),
    credits,
    dateDisplay: displayDate(dateISO),
    dateISO,
    displayDateDisplay: displayDate(dateISO),
    displayDateISO: dateISO,
    updatedISO: book.updatedAt,
    timestamp,
    excerpt: book.description,
    relatedPosts: [],
    readMin: readingMinutes,
    no: "00",
    sectionNo: "00",
    citation: book.translationCitation,
  };
}

function comparePublicContent(a: SortablePublicContent, b: SortablePublicContent): number {
  return (
    b.entry.timestamp - a.entry.timestamp ||
    b.sortOrder - a.sortOrder ||
    a.sourceSlug.localeCompare(b.sourceSlug) ||
    a.entry.slug.localeCompare(b.entry.slug)
  );
}

async function loadPublicContent(): Promise<PublicContentEntry[]> {
  const posts = await getAllPostsFull();
  const rows: SortablePublicContent[] = posts.map((post) => ({
    entry: {
      ...postSummary(post),
      kind: "post",
      href: postPath(post),
      bookSlug: null,
      bookTitle: null,
      originalDate: post.originalDate,
    },
    sortOrder: post.sortOrder,
    sourceSlug: post.slug,
  }));

  const books = await Promise.all(getAllBooks().map(async (book): Promise<SortablePublicContent> => {
    const source = await getValidatedBookDocument(book);
    const documents = await getBookChapterDocuments(book);
    return {
      entry: bookEntry(book, source, documents),
      sortOrder: source.sortOrder,
      sourceSlug: source.slug,
    };
  }));

  rows.push(...books);
  rows.sort(comparePublicContent);
  assignPostNumbers(rows.map((row) => row.entry));
  return rows.map((row) => row.entry);
}

let cache: Promise<PublicContentEntry[]> | null = null;

export function getAllPublicContent(): Promise<PublicContentEntry[]> {
  if (!cache) cache = loadPublicContent();
  return cache;
}

export async function getBookPublicContent(bookSlug: string): Promise<PublicContentEntry | null> {
  return (await getAllPublicContent()).find(
    (entry) => entry.kind === "book" && entry.bookSlug === bookSlug
  ) ?? null;
}

export async function getPublicContentIssue(): Promise<string> {
  const entries = await getAllPublicContent();
  if (entries.length === 0) return "";
  const date = new Date(entries[0].timestamp);
  return `${date.getUTCFullYear()} · ${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}
