import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllSlugs, getPostBySlug, getAdjacent } from "@/lib/posts";
import { site } from "@/lib/site";
import { RegisterArticleHeader } from "@/app/components/ArticleHeader";

export const dynamicParams = false;

export async function generateStaticParams() {
  const slugs = await getAllSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(decodeURIComponent(slug));
  if (!post) return {};
  const description = post.excerpt || site.description;
  const canonical = `/posts/${encodeURIComponent(post.slug)}`;
  return {
    title: post.title,
    description,
    alternates: { canonical },
    openGraph: {
      title: post.title,
      description,
      url: canonical,
      type: "article",
      publishedTime: post.dateISO,
      authors: post.author ? [post.author] : undefined,
      tags: post.tags,
    },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const decoded = decodeURIComponent(slug);
  const post = await getPostBySlug(decoded);
  if (!post) notFound();

  const next = await getAdjacent(decoded);

  return (
    <div className="article">
      <RegisterArticleHeader title={post.title} credits={post.credits} />
      <section className="art-hero">
        <div className="art-hero-inner">
          <Link href="/" className="backbtn">
            ← 返回索引 / INDEX
          </Link>

          <div className="art-ghost enter">{post.category}</div>

          <div className="art-meta enter">
            <span>NO. {post.no}</span>
            <span className="d" />
            <span>{post.dateDisplay}</span>
            <span className="d" />
            <span>{post.readMin} MIN READ</span>
            {post.credits.length > 0 && (
              <>
                <span className="d" />
                <span className="credits">
                  {post.credits.map((c, i) => (
                    <span key={i} className="credit">
                      <span className={"cmark " + (c.solid ? "solid" : "hollow")}>{c.mark}</span>
                      {c.name}
                    </span>
                  ))}
                </span>
              </>
            )}
          </div>

          <h1 className="art-title enter">{post.title}</h1>
          <div className="art-en enter">{post.category}</div>
          <div className="art-tags enter">
            {post.tags.map((t) => (
              <span key={t} className="t">#{t}</span>
            ))}
          </div>
        </div>
      </section>

      <article
        className="art-body enter"
        style={{ animationDelay: "0.06s" }}
        dangerouslySetInnerHTML={{ __html: post.html }}
      />

      <div className="art-after">
        <div className="art-end">
          <span className="sq" />
          <span className="t">完 / FIN</span>
          <span className="l" />
        </div>
      </div>

      {next && next.slug !== post.slug && (
        <div className="nextnav">
          <Link href={`/posts/${encodeURIComponent(next.slug)}`} className="nextrow">
            <div>
              <div className="nlabel">下一篇 / NEXT —— NO.{next.no}</div>
              <div className="ntitle">{next.title}</div>
            </div>
            <span className="narrow">→</span>
          </Link>
        </div>
      )}
    </div>
  );
}
