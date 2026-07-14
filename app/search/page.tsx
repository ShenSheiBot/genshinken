import type { Metadata } from "next";
import {
  EDITORIAL_SECTIONS,
  EDITORIAL_SECTION_META,
  editorialSectionFrom,
  type EditorialSection,
} from "@/lib/editorial";
import { getAllPosts, type PostSummary } from "@/lib/posts";
import ArchiveIndex, { type ArchiveFacetOption } from "./ArchiveIndex";

export const metadata: Metadata = {
  title: "文章索引",
  description: "浏览西方負典的全部文章，并按栏目、主题分类与标签筛选。",
  alternates: { canonical: "/search" },
};

type SearchParamValue = string | string[] | undefined;
type SearchParams = Record<string, SearchParamValue>;
type ActiveFilters = {
  section: EditorialSection | null;
  category: string | null;
  tag: string | null;
};
type Facet = { value: string; count: number };

function first(value: SearchParamValue): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function normalize(value: string): string {
  return value.normalize("NFKC").trim().toLocaleLowerCase("zh-CN");
}

function facetsFor(values: string[], sortByCount = false): Facet[] {
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) =>
      sortByCount
        ? b.count - a.count || a.value.localeCompare(b.value, "zh-CN")
        : a.value.localeCompare(b.value, "zh-CN")
    );
}

function resolveFacet(requested: string, facets: Facet[]): string | null {
  const key = normalize(requested);
  if (!key) return null;
  return facets.find((facet) => normalize(facet.value) === key)?.value ?? null;
}

function filterHref(filters: ActiveFilters, update: Partial<ActiveFilters> = {}): string {
  const next = { ...filters, ...update };
  const params = new URLSearchParams();
  (["section", "category", "tag"] as const).forEach((key) => {
    const value = next[key];
    if (value) params.set(key, value);
  });
  const query = params.toString();
  return query ? `/search?${query}` : "/search";
}

function postMatches(post: PostSummary, filters: ActiveFilters): boolean {
  if (filters.section && post.section !== filters.section) return false;
  if (filters.category && post.category !== filters.category) return false;
  if (filters.tag && !post.tags.includes(filters.tag)) return false;
  return true;
}

export default async function ArchivePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const [posts, rawParams] = await Promise.all([getAllPosts(), searchParams]);
  const categories = facetsFor(posts.map((post) => post.category));
  const tags = facetsFor(posts.flatMap((post) => post.tags), true);
  const filters: ActiveFilters = {
    section: editorialSectionFrom(first(rawParams.section)),
    category: resolveFacet(first(rawParams.category), categories),
    tag: resolveFacet(first(rawParams.tag), tags),
  };
  const filtered = posts.filter((post) => postMatches(post, filters));
  const countWith = (update: Partial<ActiveFilters>) =>
    posts.filter((post) => postMatches(post, { ...filters, ...update })).length;

  const sectionOptions: ArchiveFacetOption[] = [
    {
      key: "all",
      label: "全部",
      count: countWith({ section: null }),
      active: !filters.section,
      disabled: false,
      href: filterHref(filters, { section: null }),
    },
    ...EDITORIAL_SECTIONS.map((section) => {
      const count = countWith({ section });
      return {
        key: section,
        label: EDITORIAL_SECTION_META[section].label,
        count,
        active: filters.section === section,
        disabled: count === 0 && filters.section !== section,
        href: filterHref(filters, { section }),
      };
    }),
  ];
  const categoryOptions: ArchiveFacetOption[] = [
    {
      key: "all",
      label: "全部",
      count: countWith({ category: null }),
      active: !filters.category,
      disabled: false,
      href: filterHref(filters, { category: null }),
    },
    ...categories.map((category) => {
      const count = countWith({ category: category.value });
      return {
        key: category.value,
        label: category.value,
        count,
        active: filters.category === category.value,
        disabled: count === 0 && filters.category !== category.value,
        href: filterHref(filters, { category: category.value }),
      };
    }),
  ];
  const tagOptions: ArchiveFacetOption[] = [
    {
      key: "all",
      label: "全部",
      count: countWith({ tag: null }),
      active: !filters.tag,
      disabled: false,
      href: filterHref(filters, { tag: null }),
    },
    ...tags.map((tag) => {
      const count = countWith({ tag: tag.value });
      return {
        key: tag.value,
        label: `#${tag.value}`,
        count,
        active: filters.tag === tag.value,
        disabled: count === 0 && filters.tag !== tag.value,
        href: filterHref(filters, { tag: tag.value }),
      };
    }),
  ];

  return (
    <ArchiveIndex
      posts={filtered}
      total={posts.length}
      resetHref="/search"
      hasFilters={Boolean(filters.section || filters.category || filters.tag)}
      sectionOptions={sectionOptions}
      categoryOptions={categoryOptions}
      tagOptions={tagOptions}
    />
  );
}
