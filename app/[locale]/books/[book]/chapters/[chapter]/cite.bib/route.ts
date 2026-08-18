import { citationToBibtex } from "@/lib/citations";
import {
  getAllTranslationEditions,
  getTranslationEditionByRoute,
  resolveTranslationSource,
  TRANSLATION_LOCALES,
  translationCitation,
  translationPreviewEnabled,
  type TranslationLocale,
} from "@/lib/translations";

export const dynamicParams = false;

export async function generateStaticParams() {
  return (await getAllTranslationEditions())
    .filter((edition) => edition.sourceRef.type === "book-chapter")
    .filter((edition) => edition.status === "published" || translationPreviewEnabled())
    .map((edition) => ({ locale: edition.locale, book: edition.bookSlug, chapter: edition.slug }));
}
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locale: string; book: string; chapter: string }> }
) {
  const { locale: rawLocale, book: rawBook, chapter: rawChapter } = await params;
  if (!TRANSLATION_LOCALES.includes(rawLocale as TranslationLocale)) {
    return new Response("Not found", { status: 404 });
  }
  const locale = rawLocale as TranslationLocale;
  const edition = await getTranslationEditionByRoute(locale, {
    type: "book-chapter",
    bookSlug: decodeURIComponent(rawBook),
    chapterSlug: decodeURIComponent(rawChapter),
  });
  if (!edition || (edition.status !== "published" && !translationPreviewEnabled())) {
    return new Response("Not found", { status: 404 });
  }
  const source = await resolveTranslationSource(edition.sourceRef);
  if (!source) return new Response("Not found", { status: 404 });
  return new Response(`${citationToBibtex(translationCitation(source, edition))}\n`, {
    headers: {
      "Content-Type": "application/x-bibtex; charset=utf-8",
      "Content-Disposition": `inline; filename="${edition.slug}-${locale}.bib"`,
    },
  });
}
