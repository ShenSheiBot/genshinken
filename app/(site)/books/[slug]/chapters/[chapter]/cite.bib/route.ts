import {
  getAllBooks,
  getBookBySlug,
  getBookChapter,
  getBookChapterCitation,
  getPublishedBookChapters,
  isPublishedBookChapter,
} from "@/lib/books";
import { citationToBibtex } from "@/lib/citations";

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllBooks().flatMap((book) =>
    getPublishedBookChapters(book).map((chapter) => ({ slug: book.slug, chapter: chapter.id }))
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; chapter: string }> }
) {
  const { slug, chapter: chapterParam } = await params;
  const book = getBookBySlug(decodeURIComponent(slug));
  if (!book) return new Response("Not found", { status: 404 });
  const chapter = getBookChapter(book, decodeURIComponent(chapterParam));
  if (!chapter || !isPublishedBookChapter(chapter)) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(`${citationToBibtex(getBookChapterCitation(book, chapter))}\n`, {
    headers: {
      "Content-Type": "application/x-bibtex; charset=utf-8",
      "Content-Disposition": `attachment; filename="${book.slug}-${chapter.id}.bib"`,
    },
  });
}
