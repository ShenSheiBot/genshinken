import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Markdown lives in source/_posts and is read at build time (SSG).
  // Posts reference images under /attachments — served statically from public/.
  reactStrictMode: true,
};

export default nextConfig;
