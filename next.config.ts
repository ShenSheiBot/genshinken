import type { NextConfig } from "next";

function buildTimestamp(value = process.env.UN_CANON_BUILD_TIMESTAMP): string {
  const supplied = value ? new Date(value) : null;
  if (supplied && !Number.isNaN(supplied.valueOf())) return supplied.toISOString();
  return new Date().toISOString();
}

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
  "connect-src 'self'",
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
  // Markdown lives in source/_posts and is read at build time (SSG).
  // Posts reference images under /attachments — served statically from public/.
  reactStrictMode: true,
  // Vercel has no documented build-timestamp system variable.  This value is
  // created when Next loads its config for the current build and is therefore
  // baked into the generated pages, rather than being the visitor's clock.
  env: {
    NEXT_PUBLIC_BUILD_TIMESTAMP: buildTimestamp(),
  },
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
    ];
  },
};

export default nextConfig;
