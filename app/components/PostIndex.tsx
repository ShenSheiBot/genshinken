"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { PostSummary } from "@/lib/posts";

export default function PostIndex({
  posts,
  total,
}: {
  posts: PostSummary[];
  total: number;
}) {
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const tags = useMemo(() => {
    const seen: string[] = [];
    posts.forEach((p) => p.tags.forEach((t) => { if (!seen.includes(t)) seen.push(t); }));
    return seen;
  }, [posts]);

  const tagCounts = useMemo(() => {
    const c: Record<string, number> = {};
    posts.forEach((p) => p.tags.forEach((t) => { c[t] = (c[t] || 0) + 1; }));
    return c;
  }, [posts]);

  const filtered = useMemo(
    () => (activeTag ? posts.filter((p) => p.tags.includes(activeTag)) : posts),
    [posts, activeTag]
  );

  return (
    <>
      <div className="wrap">
        <div className="index-head">
          <div className="ih-k">
            索引 / INDEX —— <b>{filtered.length}</b> / {total} 篇
          </div>
          <span className="dim">
            <span className="da l" />
            <span className="dl" />
            <span className="dt">2.5x</span>
            <span className="dl" />
            <span className="da r" />
          </span>
        </div>

        <div className="tagbar">
          <button className="fchip" data-on={activeTag === null} onClick={() => setActiveTag(null)}>
            全部 / ALL<span className="ct">{total}</span>
          </button>
          {tags.map((t) => (
            <button
              key={t}
              className="fchip"
              data-on={activeTag === t}
              onClick={() => setActiveTag(activeTag === t ? null : t)}
            >
              {t}
              <span className="ct">{tagCounts[t] || 0}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="wrap">
        {filtered.length === 0 ? (
          <div className="empty">
            <div className="big">∅ 空。</div>
            没有标记「{activeTag}」的随笔 —— Nothing tagged here yet.
          </div>
        ) : (
          <div className="slab-list">
            {filtered.map((p, i) => (
              <Link
                key={p.slug}
                href={`/posts/${encodeURIComponent(p.slug)}`}
                className="srow enter"
                style={{ animationDelay: i * 0.04 + "s" }}
              >
                <div className="sno">
                  <span className="big">{p.no}</span> / {String(filtered.length).padStart(2, "0")}
                </div>
                <div className="smain">
                  <div className="sen">{p.category}</div>
                  <h3>{p.title}</h3>
                  {p.author && <div className="sauthor">{p.author}</div>}
                  <p className="sex">{p.excerpt}</p>
                </div>
                <div className="smeta">
                  <span className="sdate">{p.dateDisplay}</span>
                  <span className="sread">
                    {p.readMin} MIN READ
                    <span className="arrow">↗</span>
                  </span>
                  <div className="stags">
                    {p.tags.map((t) => (
                      <span key={t} className="stag">#{t}</span>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
