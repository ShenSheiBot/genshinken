import { getAllPosts, getIssue } from "@/lib/posts";
import Hero from "./components/Hero";
import PostIndex from "./components/PostIndex";

export default async function Home() {
  const posts = await getAllPosts();
  const issue = await getIssue();

  return (
    <>
      <Hero count={posts.length} issue={issue} />
      <PostIndex posts={posts} total={posts.length} />
    </>
  );
}
