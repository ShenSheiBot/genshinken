import type { NextConfig } from "next";

function buildTimestamp(value = process.env.UN_CANON_BUILD_TIMESTAMP): string {
  const supplied = value ? new Date(value) : null;
  if (supplied && !Number.isNaN(supplied.valueOf())) return supplied.toISOString();
  return new Date().toISOString();
}

// Content Security Policy. Script/style keep 'unsafe-inline' because the site
// ships two inline bootstrap scripts (theme, reveal) plus Next's framework
// inline runtime, and SSG pages cannot carry per-request nonces. The value is
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
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
