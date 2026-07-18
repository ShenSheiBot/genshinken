import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getAllPosts, getAllSlugs, getPostBySlug, type CreditRole } from "@/lib/posts";
import { site } from "@/lib/site";
import { postPath } from "@/lib/editorial";
import {
  ReadingDossier,
  splitArticle,
} from "@/app/components/reading-edition/ReadingEdition";

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
      authors: post.credits
        .filter((credit) => credit.role === "author")
        .map((credit) => credit.name),
      tags: post.tags,
    },
  };
}

function buildJsonLd(post: NonNullable<Awaited<ReturnType<typeof getPostBySlug>>>) {
  const url = `${site.url}${postPath(post)}`;
  const roles: Record<CreditRole, string> = {
    author: "author",
    translator: "translator",
  };
  const credits: Record<string, Array<Record<string, string>>> = {};
  for (const credit of post.credits) {
    const key = roles[credit.role];
    const people = credits[key] ?? [];
    people.push({
      "@type": "Person",
      name: credit.name,
      url: `${site.url}/library?contributor=${encodeURIComponent(credit.contributorId)}`,
    });
    credits[key] = people;
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

  const posts = await getAllPosts();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildJsonLd(post)).replace(/</g, "\\u003c"),
        }}
      />
      <ReadingDossier
        post={post}
        parts={splitArticle(post.html)}
        posts={posts}
        isPublicEdition
      />
    </>
  );
}
