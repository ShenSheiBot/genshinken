import type { NextConfig } from "next";

function buildTimestamp(value = process.env.ROOF_BUILD_TIMESTAMP): string {
  const supplied = value ? new Date(value) : null;
  if (supplied && !Number.isNaN(supplied.valueOf())) return supplied.toISOString();
  return new Date().toISOString();
}

// Keep the build time available to server-rendered metadata without exposing it
// through Next's `env` option. Inlining it in the shared layout makes every SSG
// route change on every build even though only /about displays the value.
process.env.ROOF_BUILD_TIMESTAMP = buildTimestamp();

// Content Security Policy. Script/style keep 'unsafe-inline' because the site
// ships four inline bootstrap scripts (theme, han-script, editorial reveal,
// library prefilter) plus JSON-LD blocks and Next's framework inline runtime,
// and SSG pages cannot carry per-request nonces. The value is
// in constraining object/base/frame/default and pairing with the header set
// below; the real XSS injection path is closed at the content gate (see
// scripts/validate-content.mjs).
const scriptSources = [
  "'self'",
  "'unsafe-inline'",
  // Next's development runtime uses eval for React Refresh. Keep the
  // exception out of production while allowing the local preview to hydrate.
  ...(process.env.NODE_ENV === "development" ? ["'unsafe-eval'"] : []),
].join(" ");

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src ${scriptSources}`,
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "img-src 'self' data: https:",
  "media-src 'self' https://assets.labonroof.top",
  "connect-src 'self'",
  "frame-src 'self' https://music.163.com",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  // Preview iterations are built from one uncommitted working tree. The deploy
  // entrypoint pins this to its base commit so content-only edits retain the
  // same OpenNext cache namespace. Normal builds keep Next's generated ID.
  ...(process.env.ROOF_BUILD_ID
    ? { generateBuildId: async () => process.env.ROOF_BUILD_ID as string }
    : {}),
  ...(process.env.ROOF_BUILD_ID
    ? {
        // Next's default CSS chunk merger and webpack chunk hashes are not
        // reproducible across identical builds. Preview feedback relies on
        // Cloudflare's content-addressed asset upload, so build artifacts must
        // change only when their content changes.
        experimental: { cssChunking: false as const },
        webpack(config: { output?: { filename?: string } }) {
          if (typeof config.output?.filename === "string") {
            config.output.filename = config.output.filename.replace("[chunkhash]", "[contenthash]");
          }
          return config;
        },
      }
    : {}),
  // Markdown lives in source/_posts and is read at build time (SSG).
  // Posts reference images under /attachments — served statically from public/.
  reactStrictMode: true,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        // BibTeX 导出是 application/x-bibtex 响应，物理上无法携带
        // rel=canonical，却被每页 head 的 alternates.types 广告给爬虫，
        // 曾是 GSC「重复网页，用户未选定规范网页」的主体。noindex 让它
        // 们保持可下载、可发现，但不再进入索引。
        source: "/:path*/cite.bib",
        headers: [{ key: "X-Robots-Tag", value: "noindex" }],
      },
      {
        // /fonts 资产全部经 ?v=<sha256 前 12 位> 内容寻址（由
        // scripts/verify-font-contract.mjs 强制），改内容必换 URL，
        // 因此按不可变缓存一年是安全的。此前无缓存头 ⇒ max-age=0，
        // 1.37 MB 正文字体每次访问都要重新验证。
        source: "/fonts/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        // 旧归档页。查询串会自动透传（/search?tag=x → /library?tag=x），
        // 与此前动态 页面级 permanentRedirect 行为一致，但不再消耗函数调用。
        source: "/search",
        destination: "/library",
        permanent: true,
      },
      {
        source: "/posts/evolution-of-bl-playing-with-gender",
        destination: "/books/boys-love-manga-and-beyond/chapters/evolution-playing-with-gender",
        permanent: true,
      },
      {
        source: "/posts/what-is-japanese-bl-studies",
        destination: "/books/boys-love-manga-and-beyond/chapters/japanese-bl-studies-overview",
        permanent: true,
      },
      {
        source: "/posts/specificity-and-future-of-japanese-animation",
        destination: "/books/battle-trauma-anime-representation-history/chapters/specificity-and-future",
        permanent: true,
      },
      {
        source: "/posts/karatani-asada-orientalism-asia",
        destination: "/books/karatani-asada-complete-dialogues/chapters/orientalism-asia",
        permanent: true,
      },
      {
        source: "/posts/karatani-asada-and-me",
        destination: "/books/karatani-asada-complete-dialogues/chapters/karatani-asada-and-me",
        permanent: true,
      },
      {
        source: "/posts/otsuka-otaku-conversion-literature",
        destination: "/books/debating-otaku-in-contemporary-japan/chapters/otaku-conversion-literature",
        permanent: true,
      },
      {
        source: "/posts/opening-black-box-1989-otaku-discourse",
        destination: "/books/debating-otaku-in-contemporary-japan/chapters/opening-black-box-1989-otaku-discourse",
        permanent: true,
      },
      {
        source: "/posts/feminist-theory-introduction-glossary",
        destination: "/books/reading-feminist-theory/chapters/introduction-glossary",
        permanent: true,
      },
      {
        source: "/posts/feminist-theory-chapter-1-doing-feminist-theory",
        destination: "/books/reading-feminist-theory/chapters/chapter-01-doing-feminist-theory",
        permanent: true,
      },
      {
        source: "/posts/feminist-theory-chapter-2-liberal-feminism",
        destination: "/books/reading-feminist-theory/chapters/chapter-02-liberal-feminism",
        permanent: true,
      },
      {
        source: "/posts/feminist-theory-chapter-3-radical-feminism",
        destination: "/books/reading-feminist-theory/chapters/chapter-03-radical-feminism",
        permanent: true,
      },
      {
        source: "/posts/feminist-theory-chapter-4-socialist-feminism",
        destination: "/books/reading-feminist-theory/chapters/chapter-04-socialist-feminism",
        permanent: true,
      },
      {
        source: "/posts/feminist-theory-chapter-5-intersectionality",
        destination: "/books/reading-feminist-theory/chapters/chapter-05-intersectionality",
        permanent: true,
      },
      {
        source: "/posts/feminist-theory-chapter-7-third-wave",
        destination: "/books/reading-feminist-theory/chapters/chapter-07-third-wave",
        permanent: true,
      },
      {
        source: "/posts/feminist-theory-chapter-8-early-modernity-imperialism",
        destination: "/books/reading-feminist-theory/chapters/chapter-08-early-modernity-imperialism",
        permanent: true,
      },
      {
        source: "/posts/feminist-theory-chapter-9-late-modernity-imperialism",
        destination: "/books/reading-feminist-theory/chapters/chapter-09-late-modernity-imperialism",
        permanent: true,
      },
      {
        source: "/posts/feminist-theory-chapter-10-postmodernism-imperialism",
        destination: "/books/reading-feminist-theory/chapters/chapter-10-postmodernism-imperialism",
        permanent: true,
      },
      {
        source: "/posts/feminist-concepts-sex",
        destination: "/books/feminism-brief-introduction-key-concepts/chapters/sex",
        permanent: true,
      },
      {
        source: "/posts/feminist-concepts-work",
        destination: "/books/feminism-brief-introduction-key-concepts/chapters/work",
        permanent: true,
      },
      {
        source: "/posts/cameron-domination-patriarchy",
        destination: "/books/feminism-brief-introduction-key-concepts/chapters/domination",
        permanent: true,
      },
      {
        source: "/posts/cameron-rights-feminism-human-rights",
        destination: "/books/feminism-brief-introduction-key-concepts/chapters/rights",
        permanent: true,
      },
      {
        source: "/posts/marx-through-lacan-bourgeoisie",
        destination: "/books/marx-through-lacan-vocabulary/chapters/bourgeoisie",
        permanent: true,
      },
      {
        source: "/posts/marx-through-lacan-consumption",
        destination: "/books/marx-through-lacan-vocabulary/chapters/consumption",
        permanent: true,
      },
      {
        source: "/posts/liberal-feminism-feminist-thought-fifth-edition-chapter-1",
        destination: "/books/feminist-thought-fifth-edition/chapters/chapter-01-liberal-feminism",
        permanent: true,
      },
      {
        source: "/posts/beauvoir-butler-feminist-thought",
        destination: "/books/feminist-thought-fifth-edition/chapters/chapter-09-excerpt",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
