import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { getAllSlugs, getPostBySlug, getAdjacent } from "@/lib/posts";
import { site } from "@/lib/site";
import { postPath } from "@/lib/editorial";
import { RegisterArticleHeader } from "@/app/components/ArticleHeader";
import ReadingRail from "@/app/components/ReadingRail";
import TocRail from "@/app/components/TocRail";

export const dynamicParams = true;

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
  const canonical = postPath(post);
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
      modifiedTime: post.updatedISO,
      authors: post.author ? [post.author] : undefined,
      tags: post.tags,
    },
  };
}

/* ---------------- JSON-LD Article 结构化数据 ---------------- */

/** 「甲、乙」或全角空格并列 → schema.org Person 列表 */
function toPersons(name: string) {
  return name
    .split(/[、　]/)
    .map((n) => n.trim())
    .filter(Boolean)
    .map((n) => ({ "@type": "Person", name: n }));
}

function buildJsonLd(post: NonNullable<Awaited<ReturnType<typeof getPostBySlug>>>) {
  const url = `${site.url}${postPath(post)}`;
  const roles: Record<string, string> = { 作: "author", 译: "translator", 编: "editor", 校: "contributor" };
  const credits: Record<string, unknown> = {};
  for (const c of post.credits) {
    const key = roles[c.mark];
    if (key) credits[key] = toPersons(c.name);
  }
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    ...(post.subtitle ? { alternativeHeadline: post.subtitle } : {}),
    description: post.excerpt || site.description,
    url,
    mainEntityOfPage: url,
    inLanguage: "zh-Hans",
    datePublished: post.dateISO,
    dateModified: post.updatedISO,
    ...credits,
    ...(post.tags.length ? { keywords: post.tags.join(",") } : {}),
    articleSection: post.category,
    license: "https://creativecommons.org/publicdomain/zero/1.0/",
    publisher: { "@type": "Organization", name: site.brand, url: site.url },
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
  if (post.section === "multimedia") permanentRedirect(postPath(post));

  const next = await getAdjacent(decoded);

  return (
    <div className="article">
      {/* JSON 里的 "<" 转义为 <，防止内容字符串提前闭合 script 标签 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildJsonLd(post)).replace(/</g, "\\u003c") }}
      />
      <RegisterArticleHeader title={post.title} credits={post.credits} />
      <section className="art-hero">
        <div className="art-hero-inner">
          <Link href="/" className="backbtn">
            ← 返回索引
          </Link>

          <div className="art-ghost enter">{post.category}</div>

          <div className="art-meta enter">
            <span>{post.draft ? "DRAFT" : `NO. ${post.no}`}</span>
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
          {post.subtitle && <div className="art-subtitle enter">{post.subtitle}</div>}
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
      <ReadingRail />
      <TocRail />

      <div className="art-after">
        <div className="art-end">
          <span className="sq" />
          <span className="t">完 / FIN</span>
          <span className="l" />
        </div>
      </div>

      {next && next.slug !== post.slug && (
        <div className="nextnav">
          <Link href={postPath(next)} className="nextrow">
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
