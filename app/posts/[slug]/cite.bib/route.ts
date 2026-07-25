import { getPostBySlug, getPreviewableSlugs } from "@/lib/posts";
import { getBookByDocumentSlug } from "@/lib/books";
import { citationToBibtex } from "@/lib/citations";
import { postPath } from "@/lib/editorial";

export const dynamicParams = false;

export async function generateStaticParams() {
  return (await getPreviewableSlugs()).map((slug) => ({ slug }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const decoded = decodeURIComponent(slug);
  const post = await getPostBySlug(decoded);
  if (!post) return new Response("Not found", { status: 404 });
  if (post.section === "multimedia") {
    return new Response("Permanent Redirect\n", {
      status: 308,
      headers: { Location: `${postPath(post)}/cite.bib` },
    });
  }
  const citation = getBookByDocumentSlug(post.slug)?.translationCitation ?? post.citation;

  return new Response(`${citationToBibtex(citation)}\n`, {
    headers: {
      "Content-Type": "application/x-bibtex; charset=utf-8",
      "Content-Disposition": `inline; filename="${post.slug}.bib"`,
    },
  });
}
