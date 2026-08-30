/* ============================================================
   文库筛选 — 纯函数、同构。服务端在构建期整理行数据与 facet
   值序（zh-CN collation 只发生在这里的调用方，构建期），客户端
   只做解析、匹配与计数，保证 /library 可以整页静态预渲染。
   ============================================================ */
import { editorialSectionFrom } from "./editorial-runtime.mjs";
import { CREDIT_ROLES } from "./credit-roles-runtime.mjs";
import type { EditorialSection } from "./editorial";
import type { CreditRole } from "./credit-roles";
import type { Credit } from "./posts";

/** 文库行所需的最小可序列化字段集（传给客户端组件的 props）。 */
export type LibraryRow = {
  slug: string;
  href: string;
  title: string;
  section: EditorialSection;
  category: string;
  tags: string[];
  credits: Credit[];
  author: string;
  no: string;
  sectionNo: string;
  displayDateISO: string;
  readMin: number;
};

/** facet 值序在构建期确定（zh-CN collation / 全局计数排序），客户端原样使用。 */
export type LibraryFacetValues = {
  categories: string[];
  tags: string[];
  contributors: { id: string; name: string }[];
};

export const LOW_FREQUENCY_CONTRIBUTOR_MAX = 5;

export function showContributorByDefault(totalCount: number, active = false): boolean {
  return active || totalCount > LOW_FREQUENCY_CONTRIBUTOR_MAX;
}

export type ActiveFilters = {
  section: EditorialSection | null;
  category: string | null;
  tag: string | null;
  contributor: string | null;
  role: CreditRole | null;
};

export function normalizeFacetValue(value: string): string {
  return value.normalize("NFKC").trim().toLocaleLowerCase("zh-CN");
}

function resolveListedValue(requested: string, values: readonly string[]): string | null {
  const key = normalizeFacetValue(requested);
  if (!key) return null;
  return values.find((value) => normalizeFacetValue(value) === key) ?? null;
}

function resolveContributorId(
  requested: string,
  ids: ReadonlySet<string>
): string | null {
  const id = requested.trim().toLocaleLowerCase("en-US");
  return ids.has(id) ? id : null;
}

function resolveRole(requested: string): CreditRole | null {
  const value = requested.trim().toLocaleLowerCase("en-US");
  return (CREDIT_ROLES as readonly string[]).includes(value)
    ? (value as CreditRole)
    : null;
}

export function filterHref(
  filters: ActiveFilters,
  update: Partial<ActiveFilters> = {}
): string {
  const next = { ...filters, ...update };
  const params = new URLSearchParams();
  (["section", "category", "tag", "contributor", "role"] as const).forEach((key) => {
    const value = next[key];
    if (value) params.set(key, value);
  });
  const query = params.toString();
  return query ? `/library?${query}` : "/library";
}

export function rowMatches(row: LibraryRow, filters: ActiveFilters): boolean {
  if (filters.section && row.section !== filters.section) return false;
  if (filters.category && row.category !== filters.category) return false;
  if (filters.tag && !row.tags.includes(filters.tag)) return false;
  if (
    (filters.contributor || filters.role) &&
    !row.credits.some(
      (credit) =>
        (!filters.contributor || credit.contributorId === filters.contributor) &&
        (!filters.role || credit.role === filters.role)
    )
  )
    return false;
  return true;
}

export type ParsedLibraryFilters = {
  filters: ActiveFilters;
  hasInvalid: boolean;
  normalizedHref: string;
};

/**
 * 标签 facet 只展示至少连接两个公开条目的词。单篇标签仍保留在
 * 行数据中供全文检索与未来复用；第二个条目出现时会自动进入 facet。
 */
export function connectedTagFacetValues(values: readonly string[]): string[] {
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts]
    .filter(([, count]) => count >= 2)
    .sort(([aValue, aCount], [bValue, bCount]) =>
      bCount - aCount || aValue.localeCompare(bValue, "zh-CN")
    )
    .map(([value]) => value);
}

/**
 * 与旧服务端语义一致：无法解析的值视为无效并给出去除该值后的
 * 规范化地址（旧实现用 307 redirect，现由客户端 router.replace 完成）。
 */
export function parseLibraryFilters(
  params: URLSearchParams,
  facets: LibraryFacetValues
): ParsedLibraryFilters {
  const requested = {
    section: params.get("section") ?? "",
    category: params.get("category") ?? "",
    tag: params.get("tag") ?? "",
    contributor: params.get("contributor") ?? "",
    role: params.get("role") ?? "",
  };
  const contributorIds = new Set(facets.contributors.map((entry) => entry.id));
  const filters: ActiveFilters = {
    section: editorialSectionFrom(requested.section),
    category: resolveListedValue(requested.category, facets.categories),
    tag: resolveListedValue(requested.tag, facets.tags),
    contributor: resolveContributorId(requested.contributor, contributorIds),
    role: resolveRole(requested.role),
  };
  const hasInvalid = Boolean(
    (requested.section && !filters.section) ||
      (requested.category && !filters.category) ||
      (requested.tag && !filters.tag) ||
      (requested.contributor && !filters.contributor) ||
      (requested.role && !filters.role)
  );
  return { filters, hasInvalid, normalizedHref: filterHref(filters) };
}
