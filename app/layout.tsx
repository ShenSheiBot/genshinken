import type { Metadata } from "next";
import { Newsreader, EB_Garamond, Space_Mono } from "next/font/google";
import "./globals.css";
import "./components/editorial-motion/EditorialMotion.css";
import { site } from "@/lib/site";

// Latin / Cyrillic / Greek 字体自托管（next/font：同源、自动预载、内联字体 CSS），
// 取代此前渲染阻塞的第三方 Google Fonts <link>。含 cyrillic/greek 子集，保住
// 俄语/希腊语引文在衬线与 Garamond 栈里的呈现。CJK 使用 globals.css 中按需加载的
// 站内华文宋体／仿宋／楷体语料子集；不再加载 Noto Serif/Sans SC 多字重巨型网络字体，
// 避免重新引入此前移动端约 18 秒的阻塞。
const newsreader = Newsreader({
  subsets: ["latin", "latin-ext"],
  style: ["normal", "italic"],
  display: "swap",
  preload: false,
  variable: "--font-newsreader",
});
const ebGaramond = EB_Garamond({
  subsets: ["latin", "latin-ext", "cyrillic", "greek"],
  style: ["normal", "italic"],
  display: "swap",
  preload: false,
  variable: "--font-eb-garamond",
});
const spaceMono = Space_Mono({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  display: "swap",
  preload: false,
  variable: "--font-space-mono",
});
const fontVariables = `${newsreader.variable} ${ebGaramond.variable} ${spaceMono.variable}`;
import TopBar from "./components/TopBar";
import Footer from "./components/Footer";
import { ArticleHeaderProvider } from "./components/ArticleHeader";
import EditorialReveal from "./components/editorial-motion/EditorialReveal";
import { editorialRevealBootstrap } from "./components/editorial-motion/editorial-reveal-bootstrap";

export const viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e8e7e3" },
    { media: "(prefers-color-scheme: dark)", color: "#060605" },
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
    siteName: site.tabTitle,
    type: "website",
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
const themeScript = `(function(){try{var t=localStorage.getItem('ub_theme');if(t!=='dark'&&t!=='light'){t='light';}var d=document.documentElement;d.setAttribute('data-theme',t);d.style.colorScheme=t;document.querySelectorAll('meta[name="theme-color"]').forEach(function(m){m.setAttribute('content',t==='dark'?'#060605':'#e8e7e3');});}catch(e){document.documentElement.setAttribute('data-theme','light');document.documentElement.style.colorScheme='light';}})();`;

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh" data-theme="light" className={fontVariables} suppressHydrationWarning>
      <head>
        <meta name="darkreader-lock" />
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
