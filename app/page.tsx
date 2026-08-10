import type { Metadata } from "next";
import { site } from "@/lib/site";
import { getAllPublicContent, getPublicContentIssue } from "@/lib/public-content";
import PosterWallHome from "./components/editorial-home/PosterWallHome";

// 根 layout 不再下发可继承的 canonical（防“忘写 alternates 的页面
// 全部规范化到首页”），因此首页在这里自持 canonical，并重申 RSS
// alternate——页面级 alternates 会整体替换 layout 级，缺一项就丢一项。
export const metadata: Metadata = {
  alternates: {
    canonical: "/",
    types: { "application/rss+xml": [{ url: "/rss.xml", title: site.brand }] },
  },
};

export default async function Home() {
  const [posts, issue] = await Promise.all([getAllPublicContent(), getPublicContentIssue()]);
  return <PosterWallHome posts={posts} issue={issue} />;
}
