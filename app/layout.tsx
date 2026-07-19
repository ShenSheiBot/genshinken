import type { Metadata } from "next";
import "./globals.css";
import "./components/editorial-motion/EditorialMotion.css";
import { site } from "@/lib/site";
import TopBar from "./components/TopBar";
import Footer from "./components/Footer";
import { ArticleHeaderProvider } from "./components/ArticleHeader";
import EditorialReveal from "./components/editorial-motion/EditorialReveal";
import { editorialRevealBootstrap } from "./components/editorial-motion/editorial-reveal-bootstrap";

export const viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e8e7e3" },
    { media: "(prefers-color-scheme: dark)", color: "#131311" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: site.tabTitle, template: `%s · ${site.tabTitle}` },
  description: site.description,
  applicationName: site.brand,
  openGraph: {
    title: site.title,
    description: site.description,
    url: site.url,
    siteName: site.brand,
    locale: "zh_CN",
    type: "website",
    images: [{ url: "/icon.png", width: 512, height: 512, alt: site.brand }],
  },
  twitter: {
    card: "summary",
    title: site.title,
    description: site.description,
    images: ["/icon.png"],
  },
  alternates: {
    canonical: "/",
    types: { "application/rss+xml": [{ url: "/rss.xml", title: site.brand }] },
  },
};

// 站点级结构化数据：Organization + WebSite（各页的 Article/CollectionPage/Book 等
// 通过 publisher @id 引用本 Organization）。补齐 logo / sameAs，恢复 Organization
// 富结果与知识图谱关联资格。
const siteJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${site.url}/#organization`,
      name: site.brand,
      url: site.url,
      logo: `${site.url}/icon.png`,
      description: site.description,
      sameAs: site.social.map((entry) => entry.href),
    },
    {
      "@type": "WebSite",
      "@id": `${site.url}/#website`,
      name: site.brand,
      url: site.url,
      inLanguage: "zh-Hans",
      description: site.description,
      publisher: { "@id": `${site.url}/#organization` },
    },
  ],
};

// 首屏前同步设定 data-theme，避免暗色闪烁
const themeScript = `(function(){try{var t=localStorage.getItem('ub_theme');if(t!=='dark'&&t!=='light'){t='light';}var d=document.documentElement;d.setAttribute('data-theme',t);d.style.colorScheme=t;document.querySelectorAll('meta[name="theme-color"]').forEach(function(m){m.setAttribute('content',t==='dark'?'#131311':'#e8e7e3');});}catch(e){document.documentElement.setAttribute('data-theme','light');document.documentElement.style.colorScheme='light';}})();`;

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh" data-theme="light" suppressHydrationWarning>
      <head>
        <meta name="darkreader-lock" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400&family=EB+Garamond:ital,wght@0,400;0,500;1,400&family=Space+Mono:ital,wght@0,400;0,700;1,400&family=Noto+Serif+SC:wght@400;500;700;900&family=Noto+Sans+SC:wght@400;500;700;900&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: editorialRevealBootstrap }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd).replace(/</g, "\\u003c") }}
        />
      </head>
      <body>
        <ArticleHeaderProvider>
          <div className="app">
            <a href="#main" className="skip-link">跳至正文</a>
            <TopBar />
            {children}
            <Footer />
          </div>
          <EditorialReveal />
        </ArticleHeaderProvider>
      </body>
    </html>
  );
}
