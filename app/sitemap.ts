import type { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/posts";
import { site } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getAllPosts();
  const postEntries: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${site.url}/posts/${encodeURIComponent(p.slug)}`,
    lastModified: p.dateISO,
  }));

  return [{ url: site.url, lastModified: new Date().toISOString().slice(0, 10) }, ...postEntries];
}
