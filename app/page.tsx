import { getAllPublicContent, getPublicContentIssue } from "@/lib/public-content";
import PosterWallHome from "./components/editorial-home/PosterWallHome";

export default async function Home() {
  const [posts, issue] = await Promise.all([getAllPublicContent(), getPublicContentIssue()]);
  return <PosterWallHome posts={posts} issue={issue} />;
}
