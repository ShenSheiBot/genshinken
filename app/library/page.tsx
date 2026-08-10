import type { Metadata } from "next";
import { getAllPublicContent, type PublicContentEntry } from "@/lib/public-content";
import { findContributor } from "@/lib/contributors";
import { comparePostNumbersDescending } from "@/lib/post-numbering";
import { site } from "@/lib/site";
import type { LibraryFacetValues, LibraryRow } from "@/lib/library-filter";
import LibraryClient from "./LibraryClient";
import { libraryPrefilterBootstrap } from "./library-prefilter-bootstrap";

const pageDescription = "浏览西方負典的文章和多媒体，并按栏目、主题、标签、贡献者与署名位置筛选。";
export const metadata: Metadata = {
  title: "文库",
  description: pageDescription,
  alternates: { canonical: "/library" },
  openGraph: {
    title: "文库",
    description: pageDescription,
    url: `${site.url}/library`,
    siteName: site.tabTitle,
    type: "website",
  },
};

/**
 * /library 整页静态预渲染：`?section=…` 等筛选完全由客户端按查询串
 * 应用（见 LibraryClient / library-prefilter-bootstrap），因此所有
 * `/library?…` 变体命中同一份 CDN 文档并共享 canonical /library ——
 * 这既是 Fluid CPU 的止血阀，也是 GSC 重复索引治理的前提。
 */
function toLibraryRow(entry: PublicContentEntry): LibraryRow {
  return {
    slug: entry.slug,
    href: entry.href,
    title: entry.title,
    section: entry.section,
    category: entry.category,
    tags: entry.tags,
    credits: entry.credits,
    author: entry.author,
    no: entry.no,
    sectionNo: entry.sectionNo,
    displayDateISO: entry.displayDateISO,
    readMin: entry.readMin,
  };
}

/** zh-CN collation 只在构建期发生；客户端沿用这里定下的值序。 */
function orderedFacetValues(values: string[], sortByCount = false): string[] {
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts]
    .sort(([aValue, aCount], [bValue, bCount]) =>
      sortByCount
        ? bCount - aCount || aValue.localeCompare(bValue, "zh-CN")
        : aValue.localeCompare(bValue, "zh-CN")
    )
    .map(([value]) => value);
}

export default async function LibraryPage() {
  const entries = await getAllPublicContent();
  const rows = entries.map(toLibraryRow).sort(comparePostNumbersDescending);
  const facets: LibraryFacetValues = {
    categories: orderedFacetValues(entries.map((entry) => entry.category)),
    tags: orderedFacetValues(entries.flatMap((entry) => entry.tags), true),
    contributors: [...new Set(entries.flatMap((entry) =>
      entry.credits.map((credit) => credit.contributorId)
    ))]
      .map((id) => findContributor(id))
      .filter((contributor) => contributor != null)
      .sort((a, b) => a.displayName.localeCompare(b.displayName, "zh-CN"))
      .map((contributor) => ({ id: contributor.id, name: contributor.displayName })),
  };

  return (
    <>
      <script
        id="library-prefilter-script"
        dangerouslySetInnerHTML={{ __html: libraryPrefilterBootstrap }}
      />
      <LibraryClient rows={rows} facets={facets} />
    </>
  );
}
