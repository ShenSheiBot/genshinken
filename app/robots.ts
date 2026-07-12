import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        // Allow discovery while asking cooperative crawlers to keep requests sparse.
        userAgent: "*",
        allow: "/",
        crawlDelay: 10,
      },
      {
        // Repeat the policy for common LLM crawlers when they parse robots groups independently.
        userAgent: [
          "GPTBot",
          "ClaudeBot",
          "Google-Extended",
          "CCBot",
          "Amazonbot",
          "Applebot-Extended",
          "Bytespider",
          "meta-externalagent",
        ],
        allow: "/",
        crawlDelay: 10,
      },
    ],
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
