"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import {
  EDITORIAL_SECTION_META,
  type ReaderEditorialSection,
} from "@/lib/editorial";
import { needsDenseHomeTitle, type HomeWallPost } from "@/lib/home-wall";
import CreditLinks from "@/app/components/CreditLinks";
import styles from "./PosterWallHome.module.css";

type PosterSection = ReaderEditorialSection;

const FEATURED_TREATMENT: Record<PosterSection, string> = {
  essay: styles.leadWide,
  review: styles.leadNarrow,
  translation: styles.featureWide,
  interview: styles.featureNarrow,
  community: styles.thirdCompact,
};

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
  if (total === 2) return index === 0 ? [7, 8] : [5, 8];
  if (total === 3) return index === 0 ? [12, 9] : [6, 8];

  const anchors: [number, number][] = [
    [7, 8],
    [5, 8],
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
  };
}

function overviewFor(post: HomeWallPost): string {
  return post.excerpt || post.subtitle || `围绕${post.category || "本期主题"}展开的材料收录。`;
}

function HomeTitle({ post }: { post: HomeWallPost }) {
  if (post.homeTitleBreaks.length === 0) return post.title;
  return post.homeTitleBreaks.map((segment, index) => (
    <span className={styles.titleLine} key={`${segment}-${index}`}>{segment}</span>
  ));
}

function visibleHomeCredits(post: HomeWallPost) {
  return post.section === "translation"
    ? post.credits.filter((credit) => credit.role === "author")
    : post.credits;
}

function CardCredits({ post }: { post: HomeWallPost }) {
  return (
    <CreditLinks
      className={styles.creditLine}
      credits={visibleHomeCredits(post)}
      limit={post.section === "translation" ? undefined : 2}
      separator="·"
      fallbackName={post.author || "屋顶现视研"}
    />
  );
}

export default function RandomPosterWall({ posts: wallPosts }: { posts: HomeWallPost[] }) {
  const firstSlug: Partial<Record<PosterSection, string>> = {};
  for (const post of wallPosts) {
    firstSlug[post.section] ??= post.slug;
  }

  return (
    <div id="poster-wall" className={styles.wall}>
      {wallPosts.length === 0 ? (
        <div className={styles.empty}>
          <span>∅</span>
          <p>内容正在编排中。</p>
        </div>
      ) : (
        wallPosts.map((post, index) => {
          const section = post.section;
          const meta = EDITORIAL_SECTION_META[section];
          const sectionArtIndex = wallPosts
            .slice(0, index)
            .filter((candidate) => candidate.section === section).length;
          const isFirstOfSection = post.slug === firstSlug[section];
          const treatment = isFirstOfSection
            ? FEATURED_TREATMENT[section]
            : styles.thirdCompact;
          const treatmentName = isFirstOfSection
            ? `featured-${section}`
            : treatment === styles.thirdCompact
              ? "third-compact"
              : "third-standard";

          return (
            <article
              key={post.slug}
              id={isFirstOfSection ? `poster-${section}` : undefined}
              className={`${styles.tile} ${treatment}`}
              data-section={section}
              data-art-variant={sectionArtIndex % 2}
              data-featured={isFirstOfSection ? "true" : undefined}
              data-treatment={treatmentName}
              data-reveal
              data-reveal-priority={index < 4 ? "true" : undefined}
              data-reveal-index={index}
              style={tileStyle(index, wallPosts.length)}
            >
              <div className={styles.card} data-card-surface>
                <Link
                  href={post.href}
                  prefetch={false}
                  className={styles.cardPrimaryLink}
                  aria-label={`${meta.label}：${post.title}`}
                />
                <div className={styles.generatedCover} aria-hidden="true" data-card-background="true">
                  <span className={styles.posterNumber}>{post.sectionNo}</span>
                  <span className={styles.posterAxis} />
                </div>

                <div className={styles.cardHeader}>
                  <span className={styles.kind}>
                    <b>{meta.label}</b>
                    <span aria-hidden="true">·</span>
                    <span>{post.category || "未分类"}</span>
                  </span>
                  <time dateTime={post.dateISO}>{post.dateISO.replaceAll("-", ".")}</time>
                </div>

                <div className={styles.cardBody}>
                  <h2
                    className={styles.postTitle}
                    data-title-density={needsDenseHomeTitle(post, isFirstOfSection) ? "dense" : undefined}
                  >
                    <HomeTitle post={post} />
                  </h2>
                  {post.subtitle && <p className={styles.subtitle}>{post.subtitle}</p>}
                  <CardCredits post={post} />
                  <p className={styles.excerpt}>{overviewFor(post)}</p>
                </div>

                <div className={styles.cardFooter}>
                  <span>预计阅读 {post.readMin} 分钟</span>
                  <strong>阅读全文 ↗</strong>
                </div>
              </div>
            </article>
          );
        })
      )}
    </div>
  );
}
