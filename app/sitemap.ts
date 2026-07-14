import type { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/posts";
import { site } from "@/lib/site";
import { postPath } from "@/lib/editorial";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getAllPosts();
  const postEntries: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${site.url}${postPath(p)}`,
    lastModified: p.updatedISO,
  }));

  // 首页 lastmod 取全站最近一次内容变动（发布或修订），而非构建日期
  const latest = posts.reduce((m, p) => (p.updatedISO > m ? p.updatedISO : m), "");

  return [
    { url: site.url, lastModified: latest || undefined },
    { url: `${site.url}/search`, lastModified: latest || undefined },
    ...postEntries,
  ];
}
