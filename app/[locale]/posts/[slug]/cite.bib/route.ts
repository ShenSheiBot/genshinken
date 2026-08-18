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
    .filter((edition) => edition.sourceRef.type === "post")
    .filter((edition) => edition.status === "published" || translationPreviewEnabled())
    .map((edition) => ({ locale: edition.locale, slug: edition.slug }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locale: string; slug: string }> }
) {
  const { locale: rawLocale, slug: rawSlug } = await params;
  if (!TRANSLATION_LOCALES.includes(rawLocale as TranslationLocale)) {
    return new Response("Not found", { status: 404 });
  }
  const locale = rawLocale as TranslationLocale;
  const edition = await getTranslationEditionByRoute(locale, {
    type: "post",
    slug: decodeURIComponent(rawSlug),
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
