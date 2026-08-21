import type { Metadata } from "next";
import { notFound } from "next/navigation";
import TranslationEditionPage from "@/app/components/translation/TranslationEditionPage";
import TranslationPlaceholder from "@/app/components/translation/TranslationPlaceholder";
import { citationToMetadata } from "@/lib/citations";
import { getPostBySlug, getPreviewableSlugs, PRIMARY_CREDIT_ROLES } from "@/lib/posts";
import { site } from "@/lib/site";
import { translationJsonLd } from "@/lib/translation-jsonld";
import {
  getAllTranslationEditions,
  getEditionLanguageLinks,
  getExternalOriginal,
  getPublishedTranslationEditions,
  getTranslationEditionByRoute,
  resolveTranslationSource,
  TRANSLATION_LOCALES,
  translationCitation,
  translationPlaceholderHref,
  translationPreviewEnabled,
  type TranslationEdition,
  type ExternalOriginal,
  type TranslationLocale,
  type TranslationSource,
} from "@/lib/translations";

export const dynamicParams = false;

export async function generateStaticParams() {
  const [slugs, editions] = await Promise.all([getPreviewableSlugs(), getAllTranslationEditions()]);
  const sourceSlugs = (await Promise.all(slugs.map(async (slug) => {
    const post = await getPostBySlug(slug);
    return post && !post.bookDocument ? slug : null;
  }))).filter((slug): slug is string => Boolean(slug));
  const keys = new Set<string>();
  for (const locale of TRANSLATION_LOCALES) {
    sourceSlugs.forEach((slug) => keys.add(`${locale}:${slug}`));
  }
  editions.filter((edition) => edition.sourceRef.type === "post")
    .forEach((edition) => keys.add(`${edition.locale}:${edition.slug}`));
  return [...keys].map((key) => {
    const [locale, ...slug] = key.split(":");
    return { locale, slug: slug.join(":") };
  });
}

function localeFrom(value: string): TranslationLocale | null {
  return TRANSLATION_LOCALES.includes(value as TranslationLocale) ? value as TranslationLocale : null;
}

const missingTitles = {
  en: "English edition unavailable",
  ja: "日本語版は未公開です",
} as const;

async function resolveRoute(locale: TranslationLocale, slug: string): Promise<{
  source: TranslationSource;
  edition: TranslationEdition | null;
  externalOriginal: ExternalOriginal | null;
  href: string;
} | null> {
  const routedEdition = await getTranslationEditionByRoute(locale, { type: "post", slug });
  if (routedEdition) {
    const source = await resolveTranslationSource(routedEdition.sourceRef);
    if (!source) return null;
    const visible = routedEdition.status === "published" || translationPreviewEnabled();
    return { source, edition: visible ? routedEdition : null, externalOriginal: getExternalOriginal(locale, source), href: routedEdition.href };
  }
  const source = await resolveTranslationSource({ type: "post", slug });
  if (!source) return null;
  return { source, edition: null, externalOriginal: getExternalOriginal(locale, source), href: translationPlaceholderHref(locale, source) };
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
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale, slug: rawSlug } = await params;
  const locale = localeFrom(rawLocale);
  if (!locale) return {};
  const resolved = await resolveRoute(locale, decodeURIComponent(rawSlug));
  if (!resolved) return {};
  const { source, edition, externalOriginal, href } = resolved;
  if (!edition) {
    return {
      title: externalOriginal ? externalOriginal.title : `${source.title} — ${missingTitles[locale]}`,
      description: externalOriginal
        ? (locale === "en" ? "Verified publication details and official access routes for the original English edition." : "日本語原文の書誌情報と正規の入手先をご案内します。")
        : locale === "en"
          ? "This work is available in Chinese; an English edition has not been published."
          : "この作品は中国語で公開されています。日本語版は未公開です。",
      alternates: { canonical: href },
      robots: { index: false, follow: true },
    };
  }

  const published = edition.status === "published";
  const citation = translationCitation(source, edition);
  return {
    title: edition.title,
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

export default async function LocalizedPostPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: rawLocale, slug: rawSlug } = await params;
  const locale = localeFrom(rawLocale);
  if (!locale) notFound();
  const resolved = await resolveRoute(locale, decodeURIComponent(rawSlug));
  if (!resolved) notFound();
  const links = await getEditionLanguageLinks(resolved.source);
  if (!resolved.edition) {
    return <TranslationPlaceholder locale={locale} source={resolved.source} links={links} externalOriginal={resolved.externalOriginal} />;
  }
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(translationJsonLd(resolved.source, resolved.edition)).replace(/</gu, "\\u003c"),
        }}
      />
      <TranslationEditionPage locale={locale} source={resolved.source} edition={resolved.edition} links={links} />
    </>
  );
}
