import Link from "next/link";
import type { CSSProperties } from "react";
import type { PostSummary } from "@/lib/posts";
import { site } from "@/lib/site";
import {
  EDITORIAL_SECTION_META,
  postPath,
  type EditorialSection,
} from "@/lib/editorial";
import styles from "./PosterWallHome.module.css";

const POSTER_SECTION_PRIORITY: EditorialSection[] = [
  "essay",
  "review",
  "translation",
  "multimedia",
];

const FEATURED_TREATMENT: Record<EditorialSection, string> = {
  essay: styles.leadWide,
  review: styles.leadNarrow,
  translation: styles.featureWide,
  multimedia: styles.featureNarrow,
};

const TAIL_TREATMENTS = [styles.thirdCompact, styles.thirdCompact, styles.thirdCompact];

type TileStyle = CSSProperties & {
  "--wall-cols": number;
  "--wall-rows": number;
  "--wall-tablet-cols": number;
  "--wall-tablet-rows": number;
  "--wall-min-height": string;
  "--wall-tablet-min-height": string;
};

function desktopPlacement(index: number, total: number): [number, number] {
  if (total === 1) return [12, 10];
  if (total === 2) return index === 0 ? [7, 10] : [5, 10];
  if (total === 3) return index === 0 ? [12, 9] : [6, 8];

  const anchors: [number, number][] = [
    [7, 10],
    [5, 10],
    [7, 7],
    [5, 7],
  ];
  if (index < anchors.length) return anchors[index];

  const tailCount = total - anchors.length;
  const tailIndex = index - anchors.length;
  const fullBands = Math.floor(tailCount / 3);
  const remainder = tailCount % 3;
  const band = Math.floor(tailIndex / 3);
  const rows = band % 2 === 0 ? 7 : 8;

  if (band < fullBands) return [4, rows];
  return [remainder === 2 ? 6 : 12, rows];
}

function tabletPlacement(index: number, total: number): [number, number] {
  if (total === 1) return [6, 9];
  if (total === 2) return [3, 10];
  if (total === 3) return index === 0 ? [6, 9] : [3, 10];

  const anchors: [number, number][] = [
    [6, 9],
    [6, 8],
    [3, 8],
    [3, 8],
  ];
  if (index < anchors.length) return anchors[index];

  const tailCount = total - anchors.length;
  const tailIndex = index - anchors.length;
  const isUnpairedTail = tailCount % 2 === 1 && tailIndex === tailCount - 1;
  return [isUnpairedTail ? 6 : 3, 8];
}

function tileStyle(index: number, total: number): TileStyle {
  const [desktopCols, desktopRows] = desktopPlacement(index, total);
  const [tabletCols, tabletRows] = tabletPlacement(index, total);

  return {
    "--wall-cols": desktopCols,
    "--wall-rows": desktopRows,
    "--wall-tablet-cols": tabletCols,
    "--wall-tablet-rows": tabletRows,
    "--wall-min-height": `${desktopRows * 48 + Math.max(0, desktopRows - 1)}px`,
    "--wall-tablet-min-height": `${tabletRows * 44 + Math.max(0, tabletRows - 1)}px`,
    animationDelay: `${Math.min(index, 10) * 36}ms`,
  };
}

function creditsFor(post: PostSummary): string {
  if (post.credits.length > 0) {
    return post.credits
      .slice(0, 2)
      .map((credit) => `${credit.mark} ${credit.name}`)
      .join(" · ");
  }
  return post.author || "西方負典编辑部";
}

function groupPostsBySection(posts: PostSummary[]): Record<EditorialSection, PostSummary[]> {
  const grouped: Record<EditorialSection, PostSummary[]> = {
    essay: [],
    review: [],
    translation: [],
    multimedia: [],
  };
  posts.forEach((post) => grouped[post.section].push(post));
  grouped.multimedia.sort((a, b) => Number(b.slug === "csa") - Number(a.slug === "csa"));
  return grouped;
}

function orderAsWall(posts: PostSummary[]): {
  ordered: PostSummary[];
  grouped: Record<EditorialSection, PostSummary[]>;
} {
  const grouped = groupPostsBySection(posts);

  // 先让四个栏目各占一个视觉锚点，再恢复真实时间顺序。
  const leads = POSTER_SECTION_PRIORITY.map((section) => grouped[section][0]).filter(
    (post): post is PostSummary => Boolean(post)
  );
  const leadSlugs = new Set(leads.map((post) => post.slug));

  return {
    ordered: [...leads, ...posts.filter((post) => !leadSlugs.has(post.slug))],
    grouped,
  };
}

export default function PosterWallHome({
  posts,
  issue,
}: {
  posts: PostSummary[];
  issue: string;
}) {
  const { ordered, grouped } = orderAsWall(posts);
  const firstSlug: Partial<Record<EditorialSection, string>> = {
    review: grouped.review[0]?.slug,
    essay: grouped.essay[0]?.slug,
    translation: grouped.translation[0]?.slug,
    multimedia: grouped.multimedia[0]?.slug,
  };
  const featuredCount = Object.values(firstSlug).filter(Boolean).length;
  const latestArticles = posts
    .filter((post) => post.section !== "multimedia")
    .slice(0, 3);

  return (
    <main className={styles.root} aria-labelledby="poster-wall-heading">
      <header className={styles.masthead}>
        <div className={styles.issueRail}>
          <span>UN—CANON / EDITORIAL WALL</span>
          <span className={styles.issueRule} aria-hidden="true" />
          <span>ISSUE {issue || "—"}</span>
        </div>

        <div className={styles.brandBlock}>
          <h1 id="poster-wall-heading" className={styles.displayTitle}>
            <span>{site.brandCN}</span>
          </h1>
          <p className={styles.heroWelcome}>欢迎来到象征界的大草原</p>
        </div>

        <div className={styles.manifesto}>
          <span className={styles.manifestoNumber}>{String(posts.length).padStart(2, "0")}</span>
          <p>「西方負典」是一档关注历史、产业和文化的人文博客，希望为汉语读者提供基于观察视角的话题和内容。</p>
        </div>

        <div className={styles.registration} aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>
      </header>

      <nav className={styles.sectionNav} aria-label="首页内容栏目">
        {POSTER_SECTION_PRIORITY.map((section, index) => {
          const meta = EDITORIAL_SECTION_META[section];
          const count = grouped[section].length;
          return (
            <Link
              key={section}
              href={`/search?section=${section}`}
              className={styles.sectionLink}
              data-section={section}
              aria-label={`查看${meta.label}栏目，共 ${count} 篇`}
            >
              <span className={styles.sectionNumber}>{String(index + 1).padStart(2, "0")}</span>
              <strong>{meta.label}</strong>
              <small>{meta.english}</small>
              <b>{String(count).padStart(2, "0")}</b>
            </Link>
          );
        })}
      </nav>

      <div id="poster-wall" className={styles.wall}>
        {ordered.length === 0 ? (
          <div className={styles.empty}>
            <span>∅</span>
            <p>内容正在编排中。</p>
          </div>
        ) : (
          ordered.map((post, index) => {
            const section = post.section;
            const meta = EDITORIAL_SECTION_META[section];
            const isFirstOfSection = post.slug === firstSlug[section];
            const tailIndex = Math.max(0, index - featuredCount);
            const treatment = isFirstOfSection
              ? FEATURED_TREATMENT[section]
              : TAIL_TREATMENTS[tailIndex] ??
                (tailIndex % 2 === 0 ? styles.thirdStandard : styles.thirdCompact);

            return (
              <article
                key={post.slug}
                id={isFirstOfSection ? `poster-${section}` : undefined}
                 className={`${styles.tile} ${treatment}`}
                 data-section={section}
                 data-featured={isFirstOfSection ? "true" : undefined}
                 style={tileStyle(index, ordered.length)}
              >
                <Link
                  href={postPath(post)}
                  className={styles.card}
                  aria-label={`${meta.label}：${post.title}`}
                >
                  <div className={styles.generatedCover} aria-hidden="true">
                    <span className={styles.posterNumber}>{String(index + 1).padStart(2, "0")}</span>
                    <span className={styles.posterGlyph}>{meta.glyph}</span>
                    <span className={styles.posterAxis} />
                    <span className={styles.posterWord}>{meta.english}</span>
                  </div>

                  <div className={styles.cardHeader}>
                    <span className={styles.kind}>
                      {meta.label} / {meta.english}
                    </span>
                    <time dateTime={post.dateISO}>{post.dateISO.replaceAll("-", ".")}</time>
                  </div>

                  <div className={styles.cardBody}>
                    <span className={styles.category}>{post.category || "未分类"}</span>
                    <h2 className={styles.postTitle}>{post.title}</h2>
                    {post.subtitle && <p className={styles.subtitle}>{post.subtitle}</p>}
                    <p className={styles.creditLine}>{creditsFor(post)}</p>
                    {post.excerpt && <p className={styles.excerpt}>{post.excerpt}</p>}
                  </div>

                  {section === "multimedia" && (
                    <div className={styles.platformStrip} aria-label="发布平台与站内资料">
                      <span>发布入口</span>
                      <b>站外来源 ↗</b>
                      <b>站内资料 →</b>
                    </div>
                  )}

                  <div className={styles.cardFooter}>
                    <span>
                      {section === "multimedia"
                        ? "站内详情 · 简介 · 关联文稿"
                        : `${post.readMin} MIN READ`}
                    </span>
                    <strong>{section === "multimedia" ? "查看详情" : "阅读全文"} ↗</strong>
                  </div>
                </Link>
              </article>
            );
          })
        )}
      </div>

      <div className={styles.wallCaption}>
        <span>评 / 论 / 译介 / 多媒体</span>
        <span>NO EMBEDS · EXTERNAL DESTINATIONS LIVE ON DETAIL PAGES</span>
      </div>

      <section className={styles.latestUpdates} aria-labelledby="poster-latest-title">
        <div className={styles.latestInner}>
          <header className={styles.latestHeading}>
            <div>
              <span>05 / LATEST UPDATES</span>
              <h2 id="poster-latest-title">最新更新</h2>
            </div>
            <p>
              <Link href="/search" className={styles.viewAll}>
                查看全部文章 <b aria-hidden="true">→</b>
              </Link>
            </p>
          </header>

          <ol className={styles.latestGrid}>
            {latestArticles.map((post, index) => {
              const section = post.section;
              const meta = EDITORIAL_SECTION_META[section];
              return (
                <li key={post.slug}>
                  <article>
                    <Link className={styles.latestCard} href={postPath(post)}>
                      <header>
                        <span>文稿 {String(index + 1).padStart(2, "0")}</span>
                        <span>{meta.label}</span>
                      </header>
                      <h3>{post.title}</h3>
                      {(post.excerpt || post.subtitle) && <p>{post.excerpt || post.subtitle}</p>}
                      <footer>
                        <time dateTime={post.dateISO}>{post.dateDisplay}</time>
                        <span>{post.readMin} MIN READ <b aria-hidden="true">→</b></span>
                      </footer>
                    </Link>
                  </article>
                </li>
              );
            })}
          </ol>
        </div>
      </section>
    </main>
  );
}
