import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        // Allow discovery while asking cooperative crawlers to keep requests sparse.
        // /library 本身保持可索引；带查询串的筛选变体（五轴 facet 的
        // 数千种组合）全部命中同一份静态文档，屏蔽抓取以免爬虫继续
        // 枚举。/search 只剩 308 跳板。注意 cite.bib 不在此列——它靠
        // X-Robots-Tag: noindex 退出索引，必须保持可抓取才能被看到。
        userAgent: "*",
        allow: "/",
        disallow: ["/library?", "/search"],
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
        disallow: ["/library?", "/search"],
        crawlDelay: 10,
      },
    ],
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
