"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { normalizeSearchEntity, searchCreditToken } from "@/lib/search-entities";
import styles from "./site-search.module.css";

export type SearchTag = { name: string; count: number };

type PagefindResultData = {
  url: string;
  excerpt: string;
  plain_excerpt: string;
  meta: Record<string, string>;
  sub_results?: Array<{
    url: string;
    title: string;
    excerpt: string;
  }>;
};

type PagefindSearchResult = {
  id: string;
  data: () => Promise<PagefindResultData>;
};

type PagefindApi = {
  init: () => Promise<void>;
  search: (query: string) => Promise<{
    results: PagefindSearchResult[];
    unfilteredResultCount: number;
  }>;
};

type SearchResult = {
  id: string;
  url: string;
  title: string;
  excerpt: string;
  credits: string;
  tags: string;
};

type SearchContextValue = { openSearch: () => void };
type ContributorMatch = { name: string; role: "author" | "contributor" };

const SearchContext = createContext<SearchContextValue | null>(null);
let pagefindPromise: Promise<PagefindApi> | null = null;

function loadPagefind(): Promise<PagefindApi> {
  if (!pagefindPromise) {
    const bundle = "/pagefind/pagefind.js";
    pagefindPromise = import(/* webpackIgnore: true */ bundle).then(async (module) => {
      const api = module as PagefindApi;
      await api.init();
      return api;
    }).catch((error) => {
      pagefindPromise = null;
      throw error;
    });
  }
  return pagefindPromise;
}

function normalized(value: string): string {
  return normalizeSearchEntity(value);
}

function bestResult(
  result: PagefindResultData,
  preferSection: boolean
): Pick<SearchResult, "url" | "excerpt"> {
  const section = preferSection
    ? result.sub_results?.find((item) => item.url.includes("#"))
    : undefined;
  return {
    url: section?.url || result.url,
    excerpt: section?.excerpt || result.excerpt,
  };
}

async function exactContributorSearch(
  pagefind: PagefindApi,
  query: string
): Promise<{ match: ContributorMatch; response: Awaited<ReturnType<PagefindApi["search"]>> } | null> {
  const name = normalizeSearchEntity(query);
  for (const role of ["author", "contributor"] as const) {
    const token = searchCreditToken(name, role);
    const response = await pagefind.search(token);
    const exactResults: PagefindSearchResult[] = [];
    for (const result of response.results) {
      const data = await result.data();
      if ((data.meta.search_entities ?? "").split(/\s+/u).includes(token)) exactResults.push(result);
    }
    if (exactResults.length > 0) {
      return {
        match: { name: query.trim(), role },
        response: {
          ...response,
          results: exactResults,
          unfilteredResultCount: exactResults.length,
        },
      };
    }
  }
  return null;
}

export function SiteSearchProvider({
  tags,
  children,
}: {
  tags: SearchTag[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const searchSequence = useRef(0);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [resultCount, setResultCount] = useState(0);
  const [contributorMatch, setContributorMatch] = useState<ContributorMatch | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");

  const closeSearch = useCallback(() => setOpen(false), []);
  const openSearch = useCallback(() => setOpen(true), []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === "k") {
        event.preventDefault();
        openSearch();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openSearch]);

  useEffect(() => {
    closeSearch();
  }, [pathname, closeSearch]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      requestAnimationFrame(() => inputRef.current?.focus());
      void loadPagefind().catch(() => setStatus("error"));
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const term = query.trim();
    const sequence = ++searchSequence.current;
    if (!term) {
      setResults([]);
      setResultCount(0);
      setContributorMatch(null);
      setStatus("idle");
      return;
    }

    setStatus("loading");
    const timer = window.setTimeout(async () => {
      try {
        const pagefind = await loadPagefind();
        const contributorSearch = await exactContributorSearch(pagefind, term);
        const exactContributor = contributorSearch?.match ?? null;
        const response = contributorSearch?.response ?? await pagefind.search(term);
        const visible = await Promise.all(response.results.slice(0, 12).map(async (result) => {
          const data = await result.data();
          const best = bestResult(data, !exactContributor);
          return {
            id: result.id,
            url: best.url,
            title: data.meta.title || "无题",
            excerpt: best.excerpt,
            credits: data.meta.credits || "",
            tags: data.meta.tags || "",
          };
        }));
        if (sequence !== searchSequence.current) return;
        setResults(visible);
        setResultCount(response.unfilteredResultCount || response.results.length);
        setContributorMatch(exactContributor);
        setStatus("ready");
      } catch {
        if (sequence !== searchSequence.current) return;
        setResults([]);
        setResultCount(0);
        setContributorMatch(null);
        setStatus("error");
      }
    }, 160);

    return () => window.clearTimeout(timer);
  }, [query]);

  const matchingTags = useMemo(() => {
    const term = normalized(query);
    return (term ? tags.filter((tag) => normalized(tag.name).includes(term)) : tags).slice(0, 8);
  }, [query, tags]);

  const context = useMemo(() => ({ openSearch }), [openSearch]);

  return (
    <SearchContext.Provider value={context}>
      {children}
      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-labelledby="site-search-title"
        onCancel={(event) => {
          event.preventDefault();
          closeSearch();
        }}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeSearch();
        }}
      >
        <section className={styles.panel}>
          <header className={styles.heading}>
            <div>
              <span>SEARCH / 全站检索</span>
              <h2 id="site-search-title">在屋顶寻找文本</h2>
            </div>
            <button type="button" onClick={closeSearch} aria-label="关闭搜索">×</button>
          </header>

          <form className={styles.form} role="search" onSubmit={(event) => event.preventDefault()}>
            <SearchGlyph />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索标题、作者、标签与正文……"
              aria-label="搜索标题、作者、标签与正文"
              autoComplete="off"
              spellCheck={false}
            />
            <kbd>⌘ K</kbd>
          </form>

          {matchingTags.length > 0 && (
            <section className={styles.tags} aria-labelledby="search-tags-title">
              <header>
                <h3 id="search-tags-title">{query ? "匹配标签" : "常用标签"}</h3>
                <span>{matchingTags.length.toString().padStart(2, "0")}</span>
              </header>
              <div>
                {matchingTags.map((tag) => (
                  <Link
                    href={`/library?tag=${encodeURIComponent(tag.name)}`}
                    onClick={closeSearch}
                    key={tag.name}
                  >
                    <b>#{tag.name}</b><small>{tag.count}</small>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section className={styles.results} aria-labelledby="search-results-title" aria-live="polite">
            <header>
              <h3 id="search-results-title">
                {contributorMatch
                  ? `${contributorMatch.role === "author" ? "作者作品" : "署名页面"} · ${contributorMatch.name}`
                  : "正文命中"}
              </h3>
              <span>{status === "ready" ? resultCount.toString().padStart(2, "0") : "—"}</span>
            </header>
            {!query && <p className={styles.prompt}>输入词语后，将检索全部公开文章与连载章节。</p>}
            {query && status === "loading" && <p className={styles.prompt}>正在检索文本……</p>}
            {query && status === "error" && (
              <p className={styles.prompt}>全文索引暂时不可用；标签入口仍可正常使用。</p>
            )}
            {query && status === "ready" && results.length === 0 && (
              <p className={styles.prompt}>没有找到正文命中。可以缩短关键词，或从标签继续浏览。</p>
            )}
            {results.length > 0 && (
              <ol>
                {results.map((result, index) => (
                  <li key={result.id}>
                    <Link href={result.url} onClick={closeSearch}>
                      <span className={styles.number}>{String(index + 1).padStart(2, "0")}</span>
                      <span className={styles.resultText}>
                        <strong>{result.title}</strong>
                        {result.credits && <small>{result.credits}</small>}
                        <span dangerouslySetInnerHTML={{ __html: result.excerpt }} />
                        {result.tags && <i>{result.tags}</i>}
                      </span>
                      <b aria-hidden="true">↗</b>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
            {status === "ready" && resultCount > results.length && (
              <p className={styles.more}>显示相关度最高的 {results.length} 项，共 {resultCount} 项</p>
            )}
          </section>
        </section>
      </dialog>
    </SearchContext.Provider>
  );
}

function SearchGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="11" cy="11" r="6.75" />
      <path d="m16 16 4.25 4.25" strokeLinecap="square" />
    </svg>
  );
}

export function SiteSearchTrigger({ className = "" }: { className?: string }) {
  const context = useContext(SearchContext);
  if (!context) return null;
  return (
    <button
      type="button"
      className={className}
      onClick={context.openSearch}
      aria-label="搜索本站"
      title="搜索本站（⌘K）"
    >
      <SearchGlyph />
    </button>
  );
}
