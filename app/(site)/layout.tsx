import type { Metadata } from "next";
import "../globals.css";
import "../cjk-fonts.generated.css";
import "../components/editorial-motion/EditorialMotion.css";
import { site } from "@/lib/site";
import { DEFAULT_HAN_SCRIPT } from "@/lib/han-script";
import TopBar from "@/app/components/TopBar";
import Footer from "@/app/components/Footer";
import { ArticleHeaderProvider } from "@/app/components/ArticleHeader";
import EditorialReveal from "@/app/components/editorial-motion/EditorialReveal";
import { SiteSearchProvider } from "@/app/components/site-search/SiteSearch";
import { getSearchTags } from "@/lib/search-tags";
import {
  documentFontVariables,
  editorialRevealBootstrap,
  hanScriptBootstrap,
  siteJsonLd,
  siteViewport,
  chineseSerifHref,
  themeScript,
} from "@/app/document-foundation";

export const viewport = siteViewport;

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: site.tabTitle, template: `%s · ${site.tabTitle}` },
  description: site.description,
  applicationName: site.brand,
  openGraph: {
    title: site.title,
    description: site.description,
    url: site.url,
    siteName: site.tabTitle,
    type: "website",
  },
  alternates: {
    types: { "application/rss+xml": [{ url: "/rss.xml", title: site.brand }] },
  },
};

export default async function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const searchTags = await getSearchTags();

  return (
    <html
      lang="zh"
      data-theme="light"
      data-chinese-script={DEFAULT_HAN_SCRIPT}
      data-chinese-script-requested={DEFAULT_HAN_SCRIPT}
      className={documentFontVariables}
      suppressHydrationWarning
    >
      <head>
        <meta name="darkreader-lock" />
        <link rel="preload" as="font" type="font/woff2" href={chineseSerifHref} crossOrigin="anonymous" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: hanScriptBootstrap }} />
        <script dangerouslySetInnerHTML={{ __html: editorialRevealBootstrap }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd("zh-Hans")).replace(/</g, "\\u003c") }}
        />
      </head>
      <body>
        <SiteSearchProvider tags={searchTags}>
          <ArticleHeaderProvider>
            <div className="app">
              <a href="#main" className="skip-link">跳至正文</a>
              <TopBar />
              {children}
              <Footer />
            </div>
            <EditorialReveal />
          </ArticleHeaderProvider>
        </SiteSearchProvider>
      </body>
    </html>
  );
}
