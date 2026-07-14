import { getAllPosts, getIssue } from "@/lib/posts";
import PosterWallHome from "./components/editorial-home/PosterWallHome";

export default async function Home() {
  const [posts, issue] = await Promise.all([getAllPosts(), getIssue()]);
  return <PosterWallHome posts={posts} issue={issue} />;
}
