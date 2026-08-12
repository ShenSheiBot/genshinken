import type { Metadata } from "next";
import { Newsreader, EB_Garamond, Space_Mono } from "next/font/google";
import "./globals.css";
import "./components/editorial-motion/EditorialMotion.css";
import { site } from "@/lib/site";
import {
  DEFAULT_HAN_SCRIPT,
  HAN_SCRIPT_STORAGE_KEY,
} from "@/lib/han-script";
import cjkFontManifest from "@/public/fonts/cjk-font-manifest.json";

// 正文 CJK 衬线（华文宋体子集，约 1.3 MB）是所有页面的首屏关键资源，
// 却要等 HTML → CSS → @font-face 三跳才开始下载。preload 把发现时机
// 提前到 HTML 解析。href 从字体 manifest 推导，与 globals.css 里
// verify-font-contract.mjs 强制的 ?v=<sha256[0:12]> 缓存键必然一致。
// 仿宋/楷体不预载——它们只在含引文/题词的页面按需触发下载。
const ST_SONG = cjkFontManifest.fonts["UN Canon STSong"];
const stSongHref = `/fonts/${ST_SONG.file}?v=${ST_SONG.sha256.slice(0, 12)}`;

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
  // 注意：这里绝不能声明 canonical。layout 级 canonical 会被所有
  // 忘写 alternates 的页面继承，把它们的规范网址静默指到首页
  // （章节页曾整批中招）。首页的 canonical 在 app/page.tsx 自持。
  alternates: {
    types: { "application/rss+xml": [{ url: "/rss.xml", title: site.brand }] },
  },
};

// 站点级结构化数据：Organization + WebSite + Blog（各页的 BlogPosting/CollectionPage/Book 等
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
      logo: `${site.url}/icon.svg`,
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
    {
      "@type": "Blog",
      "@id": `${site.url}/#blog`,
      name: site.tabTitle,
      url: site.url,
      inLanguage: "zh-Hans",
      description: site.description,
      publisher: { "@id": `${site.url}/#organization` },
    },
  ],
};

// 首屏前同步设定 data-theme，避免暗色闪烁
const themeScript = `(function(){try{var t=localStorage.getItem('ub_theme');if(t!=='dark'&&t!=='light'){t='light';}var d=document.documentElement;d.setAttribute('data-theme',t);d.style.colorScheme=t;document.querySelectorAll('meta[name="theme-color"]').forEach(function(m){m.setAttribute('content',t==='dark'?'#060605':'#e8e7e3');});}catch(e){document.documentElement.setAttribute('data-theme','light');document.documentElement.style.colorScheme='light';}})();`;
const hanScriptBootstrap = `(function(){var f='${DEFAULT_HAN_SCRIPT}',k='${HAN_SCRIPT_STORAGE_KEY}',s=f;try{var v=localStorage.getItem(k);if(v==='hans'||v==='hant'){s=v;}else{var a=(navigator.languages&&navigator.languages.length?navigator.languages:[navigator.language||'']);for(var i=0;i<a.length;i++){var p=String(a[i]).toLowerCase().split('-');if(p[0]!=='zh')continue;if(p.indexOf('hant')>-1){s='hant';break;}if(p.indexOf('hans')>-1){s='hans';break;}var r=p.find(function(x,j){return j>0&&(/^[a-z]{2}$/.test(x)||/^\\d{3}$/.test(x));});if(r==='tw'||r==='hk'||r==='mo'){s='hant';break;}if(r==='cn'||r==='sg'){s='hans';break;}}}}catch(e){}document.documentElement.setAttribute('data-chinese-script-requested',s);})();`;

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh" data-theme="light" data-chinese-script={DEFAULT_HAN_SCRIPT} data-chinese-script-requested={DEFAULT_HAN_SCRIPT} className={fontVariables} suppressHydrationWarning>
      <head>
        <meta name="darkreader-lock" />
        {/* 字体请求走 CORS 模式，同源也必须带 crossOrigin，否则预载与实际请求凭据模式不同会双下载 */}
        <link rel="preload" as="font" type="font/woff2" href={stSongHref} crossOrigin="anonymous" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: hanScriptBootstrap }} />
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
