import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "katex/dist/katex.min.css";
import "../globals.css";
import "../cjk-fonts.generated.css";
import "../translation-fonts.generated.css";
import "../components/editorial-motion/EditorialMotion.css";
import { site } from "@/lib/site";
import EditorialReveal from "@/app/components/editorial-motion/EditorialReveal";
import {
  documentFontVariables,
  editorialRevealBootstrap,
  japaneseSerifHref,
  siteJsonLd,
  siteViewport,
  themeScript,
} from "@/app/document-foundation";
import { TRANSLATION_LOCALES, type TranslationLocale } from "@/lib/translations";
import { SiteSearchProvider } from "@/app/components/site-search/SiteSearch";
import { getSearchTags } from "@/lib/search-tags";

export const viewport = siteViewport;

const skipLabels = {
  en: "Skip to main content",
  ja: "本文へ移動",
} as const;

const localeMetadata = {
  en: {
    brand: "Lab on Roof",
    description: "Criticism, translation, and visual culture from Lab on Roof.",
  },
  ja: {
    brand: "屋頂現視研",
    description: "屋頂現視研による批評・翻訳・視覚文化のアーカイブ。",
  },
} as const;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  if (!TRANSLATION_LOCALES.includes(rawLocale as TranslationLocale)) return {};
  const localized = localeMetadata[rawLocale as TranslationLocale];
  return {
    metadataBase: new URL(site.url),
    title: { default: localized.brand, template: `%s · ${localized.brand}` },
    description: localized.description,
    applicationName: localized.brand,
  };
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale: rawLocale } = await params;
  if (!TRANSLATION_LOCALES.includes(rawLocale as TranslationLocale)) notFound();
  const locale = rawLocale as TranslationLocale;
  const searchTags = await getSearchTags(locale);
  return (
    <html
      lang={locale}
      data-theme="light"
      data-edition-language={locale}
      className={documentFontVariables}
      suppressHydrationWarning
    >
      <head>
        <meta name="darkreader-lock" />
        {locale === "ja" && (
          <link rel="preload" as="font" type="font/woff2" href={japaneseSerifHref} crossOrigin="anonymous" />
        )}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: editorialRevealBootstrap }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd(locale)).replace(/</g, "\\u003c") }}
        />
      </head>
      <body>
        <SiteSearchProvider tags={searchTags} locale={locale}>
          <a href="#main" className="skip-link">{skipLabels[locale]}</a>
          {children}
          <EditorialReveal />
        </SiteSearchProvider>
      </body>
    </html>
  );
}
