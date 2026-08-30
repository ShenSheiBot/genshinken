"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  EDITORIAL_SECTION_META,
  READER_EDITORIAL_SECTIONS,
} from "@/lib/editorial";
import { CREDIT_ROLES, CREDIT_ROLE_META } from "@/lib/credit-roles";
import {
  filterHref,
  parseLibraryFilters,
  rowMatches,
  type ActiveFilters,
  type LibraryFacetValues,
  type LibraryRow,
} from "@/lib/library-filter";
import ArchiveIndex, { type ArchiveFacetOption } from "./ArchiveIndex";

const PREFILTER_STYLE_ID = "library-prefilter";

/**
 * `useSearchParams()` 只在这个叶组件里出现：包在 Suspense 里可让页面
 * 其余部分照常静态预渲染（否则整页会退回请求期渲染，重新变成动态路由）。
 */
function SearchParamsBridge({ onQuery }: { onQuery: (query: string) => void }) {
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  useEffect(() => {
    onQuery(query);
  }, [query, onQuery]);
  return null;
}

export default function LibraryClient({
  rows,
  facets,
}: {
  rows: LibraryRow[];
  facets: LibraryFacetValues;
}) {
  const router = useRouter();
  // null ⇒ 尚未水合：渲染全量列表，与静态 HTML 逐字节一致。
  const [query, setQuery] = useState<string | null>(null);
  const onQuery = useCallback((value: string) => setQuery(value), []);

  const { filters, hasInvalid, normalizedHref } = parseLibraryFilters(
    new URLSearchParams(query ?? ""),
    facets
  );

  // 客户端筛选接管后移除预过滤样式；无效 facet 与旧服务端 redirect 语义
  // 一致地规范化地址(去掉解析失败的值)。
  useEffect(() => {
    if (query === null) return;
    document.getElementById(PREFILTER_STYLE_ID)?.remove();
    if (hasInvalid) router.replace(normalizedHref, { scroll: false });
  }, [query, hasInvalid, normalizedHref, router]);

  const filtered = rows.filter((row) => rowMatches(row, filters));
  const countWith = (update: Partial<ActiveFilters>) =>
    rows.filter((row) => rowMatches(row, { ...filters, ...update })).length;

  const sectionOptions: ArchiveFacetOption[] = [
    {
      key: "all",
      label: "全部",
      count: countWith({ section: null }),
      active: !filters.section,
      disabled: false,
      href: filterHref(filters, { section: null }),
    },
    ...READER_EDITORIAL_SECTIONS.map((section) => {
      const count = countWith({ section });
      return {
        key: section,
        label: EDITORIAL_SECTION_META[section].label,
        count,
        active: filters.section === section,
        disabled: count === 0 && filters.section !== section,
        href: filterHref(filters, { section: filters.section === section ? null : section }),
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
    ...facets.categories.map((category) => {
      const count = countWith({ category });
      return {
        key: category,
        label: category,
        count,
        active: filters.category === category,
        disabled: count === 0 && filters.category !== category,
        href: filterHref(filters, {
          category: filters.category === category ? null : category,
        }),
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
    ...facets.tags.map((tag) => {
      const count = countWith({ tag });
      return {
        key: tag,
        label: `#${tag}`,
        count,
        active: filters.tag === tag,
        disabled: count === 0 && filters.tag !== tag,
        href: filterHref(filters, { tag: filters.tag === tag ? null : tag }),
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
      totalCount: rows.length,
    },
    ...facets.contributors.map((contributor) => {
      const count = countWith({ contributor: contributor.id });
      const totalCount = rows.filter((row) =>
        row.credits.some((credit) => credit.contributorId === contributor.id)
      ).length;
      return {
        key: contributor.id,
        label: contributor.name,
        count,
        active: filters.contributor === contributor.id,
        disabled: count === 0 && filters.contributor !== contributor.id,
        totalCount,
        href: filterHref(filters, {
          contributor: filters.contributor === contributor.id ? null : contributor.id,
        }),
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
        href: filterHref(filters, { role: filters.role === role ? null : role }),
      };
    }),
  ];

  return (
    <>
      <Suspense fallback={null}>
        <SearchParamsBridge onQuery={onQuery} />
      </Suspense>
      <ArchiveIndex
        posts={filtered}
        total={rows.length}
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
    </>
  );
}
