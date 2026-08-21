import type { Metadata } from "next";
import { notFound } from "next/navigation";
import TranslationEditionPage from "@/app/components/translation/TranslationEditionPage";
import type { TranslationChapterNavigation } from "@/app/components/translation/TranslationEditionPage";
import TranslationPlaceholder from "@/app/components/translation/TranslationPlaceholder";
import { getAllBooks, getBookBySlug, getPublishedBookChapters } from "@/lib/books";
import { citationToMetadata } from "@/lib/citations";
import { PRIMARY_CREDIT_ROLES } from "@/lib/posts";
import { site } from "@/lib/site";
import { translationJsonLd } from "@/lib/translation-jsonld";
import {
  getAllTranslationEditions,
  getEditionLanguageLinks,
  getLanguageDisposition,
  getPublishedTranslationEditions,
  getTranslationEditionByRoute,
  resolveTranslationSource,
  TRANSLATION_LOCALES,
  translationCitation,
  translationPlaceholderHref,
  translationPreviewEnabled,
  type TranslationEdition,
  type LanguageDisposition,
  type TranslationLocale,
  type TranslationSource,
} from "@/lib/translations";

export const dynamicParams = false;

export async function generateStaticParams() {
  const editions = await getAllTranslationEditions();
  const keys = new Set<string>();
  for (const locale of TRANSLATION_LOCALES) {
    for (const book of getAllBooks()) {
      for (const chapter of getPublishedBookChapters(book)) {
        keys.add(`${locale}:${book.slug}:${chapter.id}`);
      }
    }
  }
  editions.filter((edition) => edition.sourceRef.type === "book-chapter").forEach((edition) => {
    keys.add(`${edition.locale}:${edition.bookSlug}:${edition.slug}`);
    if (edition.sourceRef.type === "book-chapter") {
      const sourceBook = getBookBySlug(edition.sourceRef.bookSlug);
      if (sourceBook) {
        getPublishedBookChapters(sourceBook).forEach((chapter) => {
          keys.add(`${edition.locale}:${edition.bookSlug}:${chapter.id}`);
        });
      }
    }
  });
  return [...keys].map((key) => {
    const [locale, book, chapter] = key.split(":");
    return { locale, book, chapter };
  });
}

function localeFrom(value: string): TranslationLocale | null {
  return TRANSLATION_LOCALES.includes(value as TranslationLocale) ? value as TranslationLocale : null;
}

async function resolveRoute(locale: TranslationLocale, bookSlug: string, chapterSlug: string): Promise<{
  source: TranslationSource;
  edition: TranslationEdition | null;
  disposition: LanguageDisposition | null;
  href: string;
} | null> {
  const routedEdition = await getTranslationEditionByRoute(locale, {
    type: "book-chapter",
    bookSlug,
    chapterSlug,
  });
  if (routedEdition) {
    const source = await resolveTranslationSource(routedEdition.sourceRef);
    if (!source) return null;
    const visible = routedEdition.status === "published" || translationPreviewEnabled();
    return { source, edition: visible ? routedEdition : null, disposition: getLanguageDisposition(locale, source), href: routedEdition.href };
  }
  const editions = await getAllTranslationEditions();
  const bookEdition = editions.find((candidate) =>
    candidate.locale === locale &&
    candidate.bookSlug === bookSlug &&
    candidate.sourceRef.type === "book-chapter"
  );
  if (bookEdition?.sourceRef.type === "book-chapter") {
    const source = await resolveTranslationSource({
      type: "book-chapter",
      bookSlug: bookEdition.sourceRef.bookSlug,
      chapterId: chapterSlug,
    });
    if (source) return {
      source,
      edition: null,
      disposition: getLanguageDisposition(locale, source),
      href: `/${locale}/books/${encodeURIComponent(bookSlug)}/chapters/${encodeURIComponent(chapterSlug)}`,
    };
  }
  const source = await resolveTranslationSource({ type: "book-chapter", bookSlug, chapterId: chapterSlug });
  if (!source) return null;
  return { source, edition: null, disposition: getLanguageDisposition(locale, source), href: translationPlaceholderHref(locale, source) };
}

async function chapterNavigation(
  locale: TranslationLocale,
  source: TranslationSource,
  edition: TranslationEdition
): Promise<TranslationChapterNavigation | undefined> {
  if (!source.book || !source.chapter || edition.sourceRef.type !== "book-chapter") return undefined;
  const chapters = getPublishedBookChapters(source.book);
  const index = chapters.findIndex((chapter) => chapter.id === source.chapter?.id);
  const editions = await getAllTranslationEditions();
  const visible = (candidate: TranslationEdition) =>
    candidate.status === "published" || translationPreviewEnabled();
  const linkFor = (chapter: (typeof chapters)[number] | undefined) => {
    if (!chapter) return undefined;
    const translated = editions.find((candidate) =>
      candidate.locale === locale &&
      candidate.sourceRef.type === "book-chapter" &&
      candidate.sourceRef.bookSlug === source.book?.slug &&
      candidate.sourceRef.chapterId === chapter.id &&
      visible(candidate)
    );
    return {
      href: translated?.href ?? `/${locale}/books/${encodeURIComponent(edition.bookSlug)}/chapters/${encodeURIComponent(chapter.id)}`,
      number: chapter.number,
      title: translated?.title ?? chapter.title,
      translated: Boolean(translated),
    };
  };
  return {
    bookHref: `/${locale}/books/${encodeURIComponent(edition.bookSlug)}`,
    bookTitle: edition.bookTitle,
    previous: linkFor(chapters[index - 1]),
    next: linkFor(chapters[index + 1]),
  };
}

async function languageAlternates(source: TranslationSource) {
  const translations = await getPublishedTranslationEditions(source);
  return Object.fromEntries([
    [source.language, source.href],
    ...translations.map((edition) => [edition.locale, edition.href]),
  ]);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; book: string; chapter: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale, book: rawBook, chapter: rawChapter } = await params;
  const locale = localeFrom(rawLocale);
  if (!locale) return {};
  const resolved = await resolveRoute(locale, decodeURIComponent(rawBook), decodeURIComponent(rawChapter));
  if (!resolved) return {};
  const { source, edition, disposition, href } = resolved;
  const externalOriginal = disposition?.state === "external-original" ? disposition : null;
  const notAvailable = disposition?.state === "not-available";
  if (!edition) {
    return {
      title: externalOriginal
        ? externalOriginal.title
        : notAvailable
          ? locale === "en"
            ? `${source.title} — Not offered in English`
            : `${source.title} — 日本語版は提供対象外です`
          : locale === "en"
            ? `${source.title} — English edition unavailable`
            : `${source.title} — 日本語版は未公開です`,
      description: externalOriginal
        ? (locale === "en" ? "Verified publication details and official access routes for the original English edition." : "日本語原文の書誌情報と正規の入手先をご案内します。")
        : notAvailable
          ? locale === "en"
            ? "This Chinese translation is not retranslated into English."
            : "英語作品の中国語訳であるため、日本語への再翻訳は提供していません。"
        : locale === "en"
          ? "This chapter remains available in Chinese; an English edition has not been published."
          : "この章は中国語で公開されています。日本語版は未公開です。",
      alternates: { canonical: href },
      robots: { index: false, follow: true },
    };
  }
  const published = edition.status === "published";
  const citation = translationCitation(source, edition);
  return {
    title: source.book ? `${edition.title}｜${edition.bookTitle}` : edition.title,
    description: edition.excerpt,
    alternates: {
      canonical: edition.href,
      ...(published ? { languages: await languageAlternates(source) } : {}),
      types: { "application/x-bibtex": `${edition.href}/cite.bib` },
    },
    robots: published ? undefined : { index: false, follow: true },
    other: {
      ...citationToMetadata(citation),
      "dc:relation": `${site.url}${source.href}`,
      "content-language": locale,
    },
    openGraph: published ? {
      type: "article",
      title: edition.title,
      description: edition.excerpt,
      url: edition.href,
      siteName: site.tabTitle,
      publishedTime: edition.publishedISO,
      modifiedTime: edition.updatedISO,
      authors: source.credits
        .filter((credit) => PRIMARY_CREDIT_ROLES.includes(credit.role))
        .map((credit) => credit.name),
    } : undefined,
  };
}

export default async function LocalizedBookChapterPage({
  params,
}: {
  params: Promise<{ locale: string; book: string; chapter: string }>;
}) {
  const { locale: rawLocale, book: rawBook, chapter: rawChapter } = await params;
  const locale = localeFrom(rawLocale);
  if (!locale) notFound();
  const resolved = await resolveRoute(locale, decodeURIComponent(rawBook), decodeURIComponent(rawChapter));
  if (!resolved) notFound();
  const links = await getEditionLanguageLinks(resolved.source);
  if (!resolved.edition) {
    return <TranslationPlaceholder locale={locale} source={resolved.source} links={links} disposition={resolved.disposition} />;
  }
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(translationJsonLd(resolved.source, resolved.edition)).replace(/</gu, "\\u003c"),
        }}
      />
      <TranslationEditionPage
        locale={locale}
        source={resolved.source}
        edition={resolved.edition}
        links={links}
        chapterNavigation={await chapterNavigation(locale, resolved.source, resolved.edition)}
      />
    </>
  );
}
