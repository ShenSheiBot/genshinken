import { getAllBooks, getBookBySlug } from "@/lib/books";
import { citationToBibtex } from "@/lib/citations";

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllBooks().map((book) => ({ slug: book.slug }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const book = getBookBySlug(decodeURIComponent(slug));
  if (!book) return new Response("Not found", { status: 404 });

  return new Response(`${citationToBibtex(book.translationCitation)}\n`, {
    headers: {
      "Content-Type": "application/x-bibtex; charset=utf-8",
      "Content-Disposition": `inline; filename="${book.slug}.bib"`,
    },
  });
}
