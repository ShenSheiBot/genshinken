import { citationToBibtex } from "@/lib/citations";
import { getPostBySlug, getPreviewablePosts } from "@/lib/posts";

export const dynamicParams = false;

export async function generateStaticParams() {
  return (await getPreviewablePosts())
    .filter((post) => post.section === "multimedia")
    .map((post) => ({ slug: post.slug }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const post = await getPostBySlug(decodeURIComponent(slug));
  if (!post || post.section !== "multimedia") {
    return new Response("Not found", { status: 404 });
  }

  return new Response(`${citationToBibtex(post.citation)}\n`, {
    headers: {
      "Content-Type": "application/x-bibtex; charset=utf-8",
      "Content-Disposition": `inline; filename="${post.slug}.bib"`,
    },
  });
}
