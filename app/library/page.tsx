import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  EDITORIAL_SECTIONS,
  EDITORIAL_SECTION_META,
  editorialSectionFrom,
  type EditorialSection,
} from "@/lib/editorial";
import {
  CREDIT_ROLES,
  CREDIT_ROLE_META,
  getAllPosts,
  type CreditRole,
  type PostSummary,
} from "@/lib/posts";
import {
  findContributor,
  isContributorId,
  type ContributorId,
} from "@/lib/contributors";
import ArchiveIndex, { type ArchiveFacetOption } from "@/app/search/ArchiveIndex";
import { site } from "@/lib/site";

const pageDescription = "浏览西方負典的文章和多媒体，并按栏目、主题、标签、贡献者与署名位置筛选。";
export const metadata: Metadata = {
  title: "文库",
  description: pageDescription,
  alternates: { canonical: "/library" },
  openGraph: {
    title: "文库",
    description: pageDescription,
    url: `${site.url}/library`,
    type: "website",
  },
};

type SearchParamValue = string | string[] | undefined;
type SearchParams = Record<string, SearchParamValue>;
type ActiveFilters = {
  section: EditorialSection | null;
  category: string | null;
  tag: string | null;
  contributor: ContributorId | null;
  role: CreditRole | null;
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

function resolveContributor(requested: string, available: Set<ContributorId>): ContributorId | null {
  const id = requested.trim().toLocaleLowerCase("en-US");
  return isContributorId(id) && available.has(id) ? id : null;
}

function resolveRole(requested: string): CreditRole | null {
  const value = requested.trim().toLocaleLowerCase("en-US");
  return CREDIT_ROLES.includes(value as CreditRole) ? value as CreditRole : null;
}

function filterHref(filters: ActiveFilters, update: Partial<ActiveFilters> = {}): string {
  const next = { ...filters, ...update };
  const params = new URLSearchParams();
  (["section", "category", "tag", "contributor", "role"] as const).forEach((key) => {
    const value = next[key];
    if (value) params.set(key, value);
  });
  const query = params.toString();
  return query ? `/library?${query}` : "/library";
}

function postMatches(post: PostSummary, filters: ActiveFilters): boolean {
  if (filters.section && post.section !== filters.section) return false;
  if (filters.category && post.category !== filters.category) return false;
  if (filters.tag && !post.tags.includes(filters.tag)) return false;
  if (
    (filters.contributor || filters.role) &&
    !post.credits.some((credit) =>
      (!filters.contributor || credit.contributorId === filters.contributor) &&
      (!filters.role || credit.role === filters.role)
    )
  ) return false;
  return true;
}

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const [posts, rawParams] = await Promise.all([getAllPosts(), searchParams]);
  const categories = facetsFor(posts.map((post) => post.category));
  const tags = facetsFor(posts.flatMap((post) => post.tags), true);
  const availableContributors = new Set(posts.flatMap((post) =>
    post.credits.map((credit) => credit.contributorId)
  ));
  const contributorRecords = [...availableContributors]
    .map((id) => findContributor(id))
    .filter((contributor) => contributor != null)
    .sort((a, b) => a.displayName.localeCompare(b.displayName, "zh-CN"));

  const requested = {
    section: first(rawParams.section),
    category: first(rawParams.category),
    tag: first(rawParams.tag),
    contributor: first(rawParams.contributor),
    role: first(rawParams.role),
  };
  const filters: ActiveFilters = {
    section: editorialSectionFrom(requested.section),
    category: resolveFacet(requested.category, categories),
    tag: resolveFacet(requested.tag, tags),
    contributor: resolveContributor(requested.contributor, availableContributors),
    role: resolveRole(requested.role),
  };
  const hasInvalidFilter = Boolean(
    (requested.section && !filters.section) ||
    (requested.category && !filters.category) ||
    (requested.tag && !filters.tag) ||
    (requested.contributor && !filters.contributor) ||
    (requested.role && !filters.role)
  );
  if (hasInvalidFilter) redirect(filterHref(filters));

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
  const contributorOptions: ArchiveFacetOption[] = [
    {
      key: "all",
      label: "全部",
      count: countWith({ contributor: null }),
      active: !filters.contributor,
      disabled: false,
      href: filterHref(filters, { contributor: null }),
    },
    ...contributorRecords.map((contributor) => {
      const count = countWith({ contributor: contributor.id });
      return {
        key: contributor.id,
        label: contributor.displayName,
        count,
        active: filters.contributor === contributor.id,
        disabled: count === 0 && filters.contributor !== contributor.id,
        href: filterHref(filters, { contributor: contributor.id }),
      };
    }),
  ];
  const roleOptions: ArchiveFacetOption[] = [
    {
      key: "all",
      label: "全部",
      count: countWith({ role: null }),
      active: !filters.role,
      disabled: false,
      href: filterHref(filters, { role: null }),
    },
    ...CREDIT_ROLES.map((role) => {
      const count = countWith({ role });
      return {
        key: role,
        label: CREDIT_ROLE_META[role].label,
        count,
        active: filters.role === role,
        disabled: count === 0 && filters.role !== role,
        href: filterHref(filters, { role }),
      };
    }),
  ];

  return (
    <ArchiveIndex
      posts={filtered}
      total={posts.length}
      resetHref="/library"
      hasFilters={Boolean(
        filters.section || filters.category || filters.tag || filters.contributor || filters.role
      )}
      sectionOptions={sectionOptions}
      categoryOptions={categoryOptions}
      tagOptions={tagOptions}
      contributorOptions={contributorOptions}
      roleOptions={roleOptions}
    />
  );
}
