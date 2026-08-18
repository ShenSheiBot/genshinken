import {
  EB_Garamond,
  Newsreader,
  Source_Serif_4,
  Space_Mono,
} from "next/font/google";
import { site } from "@/lib/site";
import { DEFAULT_HAN_SCRIPT, HAN_SCRIPT_STORAGE_KEY } from "@/lib/han-script";
import cjkFontManifest from "@/public/fonts/cjk-font-manifest.json";
import translationFontManifest from "@/public/fonts/translation-font-manifest.json";
import { editorialRevealBootstrap } from "./components/editorial-motion/editorial-reveal-bootstrap";

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
const sourceSerif = Source_Serif_4({
  subsets: ["latin", "latin-ext"],
  style: ["normal", "italic"],
  display: "swap",
  preload: false,
  variable: "--font-source-serif",
});
const spaceMono = Space_Mono({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  display: "swap",
  preload: false,
  variable: "--font-space-mono",
});
export const documentFontVariables = [
  newsreader.variable,
  ebGaramond.variable,
  sourceSerif.variable,
  spaceMono.variable,
].join(" ");

const ST_SONG = cjkFontManifest.fonts["UN Canon STSong"];
export const stSongHref = `/fonts/${ST_SONG.file}?v=${ST_SONG.sha256.slice(0, 12)}`;
const NOTO_SERIF_JP = translationFontManifest.fonts["Roof Noto Serif JP"];
export const japaneseSerifHref = `/fonts/${NOTO_SERIF_JP.file}?v=${NOTO_SERIF_JP.sha256.slice(0, 12)}`;

export const themeScript = `(function(){try{var t=localStorage.getItem('ub_theme');if(t!=='dark'&&t!=='light'){t='light';}var d=document.documentElement;d.setAttribute('data-theme',t);d.style.colorScheme=t;document.querySelectorAll('meta[name="theme-color"]').forEach(function(m){m.setAttribute('content',t==='dark'?'#060605':'#e8e7e3');});}catch(e){document.documentElement.setAttribute('data-theme','light');document.documentElement.style.colorScheme='light';}})();`;

export const hanScriptBootstrap = `(function(){var f='${DEFAULT_HAN_SCRIPT}',k='${HAN_SCRIPT_STORAGE_KEY}',s=f;try{var v=localStorage.getItem(k);if(v==='hans'||v==='hant'){s=v;}else{var a=(navigator.languages&&navigator.languages.length?navigator.languages:[navigator.language||'']);for(var i=0;i<a.length;i++){var p=String(a[i]).toLowerCase().split('-');if(p[0]!=='zh')continue;if(p.indexOf('hant')>-1){s='hant';break;}if(p.indexOf('hans')>-1){s='hans';break;}var r=p.find(function(x,j){return j>0&&(/^[a-z]{2}$/.test(x)||/^\\d{3}$/.test(x));});if(r==='tw'||r==='hk'||r==='mo'){s='hant';break;}if(r==='cn'||r==='sg'){s='hans';break;}}}}catch(e){}document.documentElement.setAttribute('data-chinese-script-requested',s);})();`;

export { editorialRevealBootstrap };

export function siteJsonLd(language: "zh-Hans" | "en" | "ja") {
  const localizedBrand = language === "en" ? "Lab on Roof" : language === "ja" ? "屋頂現視研" : site.brand;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${site.url}/#organization`,
        name: localizedBrand,
        alternateName: language === "en" ? site.brand : "Lab on Roof",
        url: site.url,
        logo: `${site.url}/icon.svg`,
        description: site.description,
        sameAs: site.social.map((entry) => entry.href),
      },
      {
        "@type": "WebSite",
        "@id": `${site.url}/#website`,
        name: localizedBrand,
        url: site.url,
        inLanguage: language,
        description: site.description,
        publisher: { "@id": `${site.url}/#organization` },
      },
      {
        "@type": "Blog",
        "@id": `${site.url}/#blog`,
        name: localizedBrand,
        url: site.url,
        inLanguage: language,
        description: site.description,
        publisher: { "@id": `${site.url}/#organization` },
      },
    ],
  };
}

export const siteViewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e8e7e3" },
    { media: "(prefers-color-scheme: dark)", color: "#060605" },
  ],
};
