import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getAllPosts, getAllSlugs, getPostBySlug, type CreditRole } from "@/lib/posts";
import { site } from "@/lib/site";
import { postPath } from "@/lib/editorial";
import { getTopicMembershipsForPost } from "@/lib/topics";
import { bookHref, getBookByDocumentSlug } from "@/lib/books";
import {
  citationToBibtex,
  citationToJsonLd,
  citationToMetadata,
  type CitationRecord,
} from "@/lib/citations";
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
  const book = getBookByDocumentSlug(post.slug);
  const citation = book?.translationCitation ?? post.citation;
  const description = post.excerpt || site.description;
  const canonical = postPath(post);
  const citationPath = book ? bookHref(book) : canonical;
  const openGraphBase = {
    title: post.title,
    description,
    url: canonical,
    siteName: site.tabTitle,
  };
  return {
    title: post.title,
    description,
    alternates: {
      canonical,
      types: { "application/x-bibtex": `${citationPath}/cite.bib` },
    },
    other: citationToMetadata(citation),
    openGraph: citation.itemType === "book"
      ? { ...openGraphBase, type: "book" }
      : {
          ...openGraphBase,
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

function buildJsonLd(
  post: NonNullable<Awaited<ReturnType<typeof getPostBySlug>>>,
  citation: CitationRecord
) {
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
    ...citationToJsonLd(citation),
    ...(post.subtitle ? { alternativeHeadline: post.subtitle } : {}),
    description: post.excerpt || site.description,
    dateModified: post.updatedISO,
    ...(citation.itemType === "blogPost"
      ? {
          isPartOf: {
            "@type": "Blog",
            "@id": `${site.url}/#blog`,
            name: site.tabTitle,
            url: site.url,
          },
        }
      : {}),
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
  const book = getBookByDocumentSlug(post.slug);
  const citation = book?.translationCitation ?? post.citation;

  const [posts, topicMemberships] = await Promise.all([
    getAllPosts(),
    getTopicMembershipsForPost(post.slug),
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildJsonLd(post, citation)).replace(/</g, "\\u003c"),
        }}
      />
      <ReadingDossier
        post={post}
        parts={splitArticle(post.html)}
        posts={posts}
        topicMemberships={topicMemberships}
        citationBibtex={citationToBibtex(citation)}
        citationHref={`${book ? bookHref(book) : postPath(post)}/cite.bib`}
        isPublicEdition
      />
    </>
  );
}
