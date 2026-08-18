import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import LanguageSwitcher from "@/app/components/translation/LanguageSwitcher";
import { getAllBooks, getBookBySlug, getPublishedBookChapters } from "@/lib/books";
import { hanScriptLanguageTag } from "@/lib/han-script";
import { site } from "@/lib/site";
import { translationEditionIsVisible } from "@/lib/translation-contract.mjs";
import {
  getAllTranslationEditions,
  TRANSLATION_LOCALES,
  translationPreviewEnabled,
  type EditionLanguageLink,
  type TranslationEdition,
  type TranslationLocale,
} from "@/lib/translations";
import styles from "./translation-book.module.css";

export const dynamicParams = false;

export async function generateStaticParams() {
  const editions = await getAllTranslationEditions();
  const keys = new Set<string>();
  for (const locale of TRANSLATION_LOCALES) {
    getAllBooks().forEach((book) => keys.add(`${locale}:${book.slug}`));
  }
  editions.filter((edition) => edition.sourceRef.type === "book-chapter")
    .forEach((edition) => keys.add(`${edition.locale}:${edition.bookSlug}`));
  return [...keys].map((key) => {
    const [locale, book] = key.split(":");
    return { locale, book };
  });
}

function localeFrom(value: string): TranslationLocale | null {
  return TRANSLATION_LOCALES.includes(value as TranslationLocale) ? value as TranslationLocale : null;
}

async function resolveBook(locale: TranslationLocale, routeBookSlug: string) {
  const allEditions = await getAllTranslationEditions();
  const targetEditions = allEditions.filter((edition) =>
    edition.locale === locale &&
    edition.sourceRef.type === "book-chapter" &&
    edition.bookSlug === routeBookSlug
  );
  const sample = targetEditions[0];
  const sourceBookSlug = sample?.sourceRef.type === "book-chapter"
    ? sample.sourceRef.bookSlug
    : routeBookSlug;
  const sourceBook = getBookBySlug(sourceBookSlug);
  if (!sourceBook) return null;
  const visibleEditions = targetEditions.filter((edition) =>
    translationEditionIsVisible(edition.status, translationPreviewEnabled())
  );
  const isTargetRoute = Boolean(sample);
  if (isTargetRoute && visibleEditions.length === 0) return null;
  return { allEditions, sourceBook, targetEditions: visibleEditions, isTargetRoute };
}

function bookLanguageLinks(
  locale: TranslationLocale,
  sourceBook: NonNullable<ReturnType<typeof getBookBySlug>>,
  allEditions: TranslationEdition[]
): EditionLanguageLink[] {
  const sourceBookSlug = sourceBook.slug;
  const previewEnabled = translationPreviewEnabled();
  return [
    {
      language: hanScriptLanguageTag(sourceBook.script),
      label: "中",
      href: `/books/${encodeURIComponent(sourceBookSlug)}`,
      state: "available",
    },
    ...TRANSLATION_LOCALES.map((target): EditionLanguageLink => {
      const edition = allEditions.find((candidate) =>
        candidate.locale === target &&
        candidate.sourceRef.type === "book-chapter" &&
        candidate.sourceRef.bookSlug === sourceBookSlug &&
        translationEditionIsVisible(candidate.status, previewEnabled)
      );
      const preview = Boolean(edition && edition.status !== "published" && previewEnabled);
      return {
        language: target,
        label: target === "en" ? "EN" : "日",
        href: edition
          ? `/${target}/books/${encodeURIComponent(edition.bookSlug)}`
          : `/${target}/books/${encodeURIComponent(sourceBookSlug)}`,
        state: edition?.status === "published" ? "available" : preview ? "preview" : "missing",
      };
    }),
  ];
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; book: string }> }): Promise<Metadata> {
  const { locale: rawLocale, book: rawBook } = await params;
  const locale = localeFrom(rawLocale);
  if (!locale) return {};
  const resolved = await resolveBook(locale, decodeURIComponent(rawBook));
  if (!resolved) return {};
  const title = resolved.targetEditions[0]?.bookTitle ?? resolved.sourceBook.title;
  const canonical = `/${locale}/books/${encodeURIComponent(decodeURIComponent(rawBook))}`;
  const published = resolved.targetEditions.some((edition) => edition.status === "published");
  const languageLinks = bookLanguageLinks(locale, resolved.sourceBook, resolved.allEditions);
  return {
    title,
    description: resolved.targetEditions[0]?.bookExcerpt ?? resolved.sourceBook.description,
    alternates: {
      canonical,
      ...(published ? {
        languages: Object.fromEntries(
          languageLinks.filter((link) => link.state === "available").map((link) => [link.language, link.href])
        ),
      } : {}),
    },
    robots: published ? undefined : { index: false, follow: true },
  };
}

export default async function LocalizedBookPage({ params }: { params: Promise<{ locale: string; book: string }> }) {
  const { locale: rawLocale, book: rawBook } = await params;
  const locale = localeFrom(rawLocale);
  if (!locale) notFound();
  const routeBookSlug = decodeURIComponent(rawBook);
  const resolved = await resolveBook(locale, routeBookSlug);
  if (!resolved) notFound();
  const { allEditions, sourceBook, targetEditions, isTargetRoute } = resolved;
  const sample = targetEditions[0];
  const title = sample?.bookTitle ?? sourceBook.title;
  const subtitle = sample?.bookSubtitle ?? sourceBook.subtitle;
  const labels = locale === "en" ? {
    brand: "Lab on Roof", status: isTargetRoute ? "Translated book" : "Edition unavailable",
    original: "Chinese edition", chapters: "Chapters", translated: "Translated", missing: "Chinese only",
  } : {
    brand: "屋頂現視研", status: isTargetRoute ? "翻訳文庫" : "未公開の言語版",
    original: "中国語版", chapters: "章一覧", translated: "翻訳あり", missing: "中国語のみ",
  };
  const chapters = getPublishedBookChapters(sourceBook);
  const links = bookLanguageLinks(locale, sourceBook, allEditions);
  const bookHref = `/${locale}/books/${encodeURIComponent(routeBookSlug)}`;
  const publisherName = locale === "en" ? "Lab on Roof" : "屋頂現視研";
  const jsonLd = sample ? {
    "@context": "https://schema.org",
    "@type": "Book",
    "@id": `${site.url}${bookHref}#book`,
    url: `${site.url}${bookHref}`,
    name: title,
    description: sample.bookExcerpt,
    inLanguage: locale,
    translationOfWork: {
      "@type": "Book",
      "@id": `${site.url}/books/${encodeURIComponent(sourceBook.slug)}#book`,
      url: `${site.url}/books/${encodeURIComponent(sourceBook.slug)}`,
      name: sourceBook.title,
      inLanguage: hanScriptLanguageTag(sourceBook.script),
    },
    publisher: { "@type": "Organization", name: publisherName, url: site.url },
    hasPart: targetEditions.map((edition) => ({
      "@type": "Chapter",
      "@id": `${site.url}${edition.href}#work`,
      url: `${site.url}${edition.href}`,
      name: edition.title,
      inLanguage: locale,
    })),
  } : null;

  return (
    <main id="main" tabIndex={-1} className={styles.page} lang={locale}>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</gu, "\\u003c") }}
        />
      )}
      <header className={styles.header}>
        <Link href="/" className={styles.brand}><i aria-hidden="true" /><span>{labels.brand}</span></Link>
        <LanguageSwitcher current={locale} links={links} />
      </header>
      <section className={styles.hero}>
        <div className={styles.original}>
          <span>{labels.original}</span><br />
          <Link href={`/books/${encodeURIComponent(sourceBook.slug)}`} lang={sourceBook.script === "hant" ? "zh-Hant" : "zh-Hans"}>
            {sourceBook.title}
          </Link>
        </div>
        <div>
          <span className={styles.status}>{labels.status}</span>
          <h1>{title}</h1>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          <p lang={sample ? locale : sourceBook.script === "hant" ? "zh-Hant" : "zh-Hans"}>
            {sample?.bookExcerpt ?? sourceBook.description}
          </p>
        </div>
      </section>
      <section className={styles.chapters}>
        <h2>{labels.chapters}</h2>
        <ol>
          {chapters.map((chapter) => {
            const edition = targetEditions.find((candidate) =>
              candidate.sourceRef.type === "book-chapter" && candidate.sourceRef.chapterId === chapter.id
            );
            const href = edition?.href ?? `/${locale}/books/${encodeURIComponent(routeBookSlug)}/chapters/${encodeURIComponent(chapter.id)}`;
            return (
              <li key={chapter.id}>
                <Link href={href}>
                  <span className={styles.number}>{chapter.number}</span>
                  <strong lang={edition ? locale : sourceBook.script === "hant" ? "zh-Hant" : "zh-Hans"}>
                    {edition?.title ?? chapter.title}
                  </strong>
                  <small>{edition ? labels.translated : labels.missing}</small>
                </Link>
              </li>
            );
          })}
        </ol>
      </section>
    </main>
  );
}
