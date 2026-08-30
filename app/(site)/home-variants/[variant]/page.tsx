import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PosterWallHome from "@/app/components/editorial-home/PosterWallHome";
import {
  HOME_VARIANT_IDS,
  isHomeVariantId,
} from "@/lib/home-variants";
import { getAllPublicContent, getPublicContentIssue } from "@/lib/public-content";
import { site } from "@/lib/site";

export const dynamicParams = false;

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
    types: { "application/rss+xml": [{ url: "/rss.xml", title: site.brand }] },
  },
};

export function generateStaticParams() {
  return HOME_VARIANT_IDS.map((variant) => ({ variant }));
}

export default async function HomeVariant({
  params,
}: {
  params: Promise<{ variant: string }>;
}) {
  const { variant } = await params;
  if (!isHomeVariantId(variant)) notFound();

  const [posts, issue] = await Promise.all([getAllPublicContent(), getPublicContentIssue()]);
  return (
    <PosterWallHome
      posts={posts}
      issue={issue}
      recommendationSeed={Number(variant) + 1}
    />
  );
}
