"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type RunningCredit = { mark: string; name: string; solid: boolean };
type Meta = { title: string; credits: RunningCredit[] } | null;

type Ctx = {
  meta: Meta;
  revealed: boolean;
  setMeta: (m: Meta) => void;
  setRevealed: (b: boolean) => void;
};

const ArticleHeaderCtx = createContext<Ctx | null>(null);

/** 顶栏「滚动后显形文章标题/署名」共享状态。挂在 layout，TopBar 读、文章页写。 */
export function ArticleHeaderProvider({ children }: { children: ReactNode }) {
  const [meta, setMeta] = useState<Meta>(null);
  const [revealed, setRevealed] = useState(false);
  return (
    <ArticleHeaderCtx.Provider value={{ meta, revealed, setMeta, setRevealed }}>
      {children}
    </ArticleHeaderCtx.Provider>
  );
}

export function useArticleHeader() {
  return useContext(ArticleHeaderCtx);
}

/**
 * 由文章页渲染（自身不产出可见 DOM）：登记标题与署名，
 * 并用 IntersectionObserver 观察英雄区标题——当其滚出顶栏下沿时让顶栏显形。
 */
export function RegisterArticleHeader({
  title,
  credits,
}: {
  title: string;
  credits: RunningCredit[];
}) {
  const ctx = useArticleHeader();
  const setMeta = ctx?.setMeta;
  const setRevealed = ctx?.setRevealed;
  const creditsKey = credits.map((c) => c.mark + c.name).join("|");

  useEffect(() => {
    if (!setMeta || !setRevealed) return;
    setMeta({ title, credits });
    setRevealed(false);

    const el = document.querySelector(".art-title");
    let io: IntersectionObserver | null = null;
    if (el && "IntersectionObserver" in window) {
      io = new IntersectionObserver(
        ([entry]) => setRevealed(!entry.isIntersecting),
        { rootMargin: "-60px 0px 0px 0px", threshold: 0 }
      );
      io.observe(el);
    }
    return () => {
      io?.disconnect();
      setMeta(null);
      setRevealed(false);
    };
    // credits 以 creditsKey 代理；setMeta/setRevealed 为 useState 稳定引用
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, creditsKey, setMeta, setRevealed]);

  return null;
}
