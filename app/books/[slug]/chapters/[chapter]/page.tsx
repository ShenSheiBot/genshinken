import { notFound, permanentRedirect } from "next/navigation";
import {
  bookDocumentHref,
  getAllBooks,
  getBookBySlug,
  getBookChapter,
  getPublishedBookChapters,
  getValidatedBookDocument,
  isPublishedBookChapter,
} from "@/lib/books";

export const dynamicParams = true;

export function generateStaticParams() {
  return getAllBooks().flatMap((book) =>
    getPublishedBookChapters(book).map((chapter) => ({ slug: book.slug, chapter: chapter.id }))
  );
}

export default async function StableBookChapterPage({
  params,
}: {
  params: Promise<{ slug: string; chapter: string }>;
}) {
  const { slug, chapter: chapterParam } = await params;
  const book = getBookBySlug(decodeURIComponent(slug));
  if (!book) notFound();
  const chapter = getBookChapter(book, decodeURIComponent(chapterParam));
  if (!chapter || !isPublishedBookChapter(chapter)) notFound();

  await getValidatedBookDocument(book);
  permanentRedirect(bookDocumentHref(book, chapter.anchor));
}
