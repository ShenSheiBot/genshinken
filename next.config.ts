import type { NextConfig } from "next";

function buildTimestamp(value = process.env.UN_CANON_BUILD_TIMESTAMP): string {
  const supplied = value ? new Date(value) : null;
  if (supplied && !Number.isNaN(supplied.valueOf())) return supplied.toISOString();
  return new Date().toISOString();
}

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
};

export default nextConfig;
