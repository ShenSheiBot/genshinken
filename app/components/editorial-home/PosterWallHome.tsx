import Link from "next/link";
import Image from "next/image";
import type { CSSProperties } from "react";
import type { PublicContentEntry } from "@/lib/public-content";
import { site } from "@/lib/site";
import {
  EDITORIAL_SECTION_META,
  READER_EDITORIAL_SECTIONS,
  type ReaderEditorialSection,
} from "@/lib/editorial";
import CreditLinks from "@/app/components/CreditLinks";
import styles from "./PosterWallHome.module.css";

type PosterSection = ReaderEditorialSection;
type PosterPost = PublicContentEntry & { section: PosterSection };

const POSTER_SECTION_PRIORITY: PosterSection[] = [
  "essay",
  "review",
  "translation",
  "interview",
  "community",
];

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

function overviewFor(post: PublicContentEntry): string {
  return post.excerpt || post.subtitle || `围绕${post.category || "本期主题"}展开的材料收录。`;
}

function HomeTitle({ post }: { post: PublicContentEntry }) {
  if (post.homeTitleBreaks.length === 0) return post.title;
  return post.homeTitleBreaks.map((segment, index) => (
    <span className={styles.titleLine} key={`${segment}-${index}`}>{segment}</span>
  ));
}

function CardCredits({ post }: { post: PublicContentEntry }) {
  const credits = visibleHomeCredits(post);

  return (
    <CreditLinks
      className={styles.creditLine}
      credits={credits}
      limit={post.section === "translation" ? undefined : 2}
      separator="·"
      fallbackName={post.author || "屋顶现视研"}
    />
  );
}

/** Keep translated recommendations focused on the original author everywhere on the home page. */
function visibleHomeCredits(post: PublicContentEntry) {
  return post.section === "translation"
    ? post.credits.filter((credit) => credit.role === "author")
    : post.credits;
}

function isPosterPost(post: PublicContentEntry): post is PosterPost {
  return READER_EDITORIAL_SECTIONS.includes(post.section as ReaderEditorialSection);
}

function groupPostsBySection(posts: PosterPost[]): Record<PosterSection, PosterPost[]> {
  const grouped: Record<PosterSection, PosterPost[]> = {
    essay: [],
    review: [],
    translation: [],
    interview: [],
    community: [],
  };
  posts.forEach((post) => grouped[post.section].push(post));
  for (const section of POSTER_SECTION_PRIORITY) {
    grouped[section].sort((a, b) => b.featuredOrder - a.featuredOrder);
  }
  return grouped;
}

function orderAsWall(posts: PublicContentEntry[]): {
  ordered: PosterPost[];
  grouped: Record<PosterSection, PosterPost[]>;
} {
  const posterPosts = posts.filter(isPosterPost);
  const grouped = groupPostsBySection(posterPosts);

  // 先让四个栏目各占一个视觉锚点，再恢复真实时间顺序。
  const leads = POSTER_SECTION_PRIORITY.map((section) => grouped[section][0]).filter(
    (post): post is PosterPost => Boolean(post)
  );
  const leadSlugs = new Set(leads.map((post) => post.slug));
  const tails: Record<PosterSection, PosterPost[]> = {
    essay: grouped.essay.filter((post) => !leadSlugs.has(post.slug)),
    review: grouped.review.filter((post) => !leadSlugs.has(post.slug)),
    translation: grouped.translation.filter((post) => !leadSlugs.has(post.slug)),
    interview: grouped.interview.filter((post) => !leadSlugs.has(post.slug)),
    community: grouped.community.filter((post) => !leadSlugs.has(post.slug)),
  };
  const tailOffsets: Record<PosterSection, number> = {
    essay: 0,
    review: 0,
    translation: 0,
    interview: 0,
    community: 0,
  };
  // Preserve the existing cross-section rhythm while replacing each section's
  // occupied slots with that section's explicit editorial order.
  const orderedTail = posterPosts
    .filter((post) => !leadSlugs.has(post.slug))
    .map((post) => {
      const offset = tailOffsets[post.section]++;
      return tails[post.section][offset] ?? post;
    });

  return {
    ordered: [...leads, ...orderedTail],
    grouped,
  };
}

export default function PosterWallHome({
  posts,
  issue,
}: {
  posts: PublicContentEntry[];
  issue: string;
}) {
  const { ordered, grouped } = orderAsWall(posts);
  // 完整视觉带共容纳十张；限制墙体高度，避免尾项单独开启新带。
  const wallPosts = ordered.slice(0, 10);
  const firstSlug: Partial<Record<PosterSection, string>> = {
    review: grouped.review[0]?.slug,
    essay: grouped.essay[0]?.slug,
    translation: grouped.translation[0]?.slug,
    interview: grouped.interview[0]?.slug,
    community: grouped.community[0]?.slug,
  };
  const latestArticles = posts
    .filter(isPosterPost)
    .slice(0, 6);

  return (
    <main id="main" tabIndex={-1} className={styles.root} aria-labelledby="poster-wall-heading" data-reveal-zone="home">
      <header className={styles.masthead} data-reveal-sequence="masthead">
        <h1 id="poster-wall-heading" className={styles.screenReaderTitle}>{site.brandCN}</h1>

        <div className={styles.mastheadVisual} aria-hidden="true">
          <Image
            src="/roof-elements/roof-masthead.webp"
            alt=""
            width={2224}
            height={1094}
            priority
          />
        </div>

        <div className={styles.manifesto}>
          <div className={styles.manifestoMeta}>
            <span className={styles.manifestoNumber}>{String(posts.length).padStart(2, "0")}</span>
            {issue && (
              <span className={styles.manifestoMonth}>{issue.replace(/\s+/g, "")}</span>
            )}
          </div>
          <p>{site.description}</p>
        </div>
      </header>

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
            const sectionArtIndex = ordered
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
                suppressHydrationWarning
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
                    <h2 className={styles.postTitle}><HomeTitle post={post} /></h2>
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

      <section
        className={`${styles.latestUpdates} ${styles.latestUpdatesTransition}`}
        aria-labelledby="poster-latest-title"
        data-reveal
      >
        <div className={styles.latestInner}>
          <header className={styles.latestHeading}>
            <div>
              <h2 id="poster-latest-title">最新更新</h2>
            </div>
            <p>
              <Link href="/library" className={styles.viewAll}>
                查看全部文章 <b aria-hidden="true">→</b>
              </Link>
            </p>
          </header>

          <ol className={styles.latestGrid}>
            {latestArticles.map((post) => {
              const section = post.section;
              const meta = EDITORIAL_SECTION_META[section];
              const credits = visibleHomeCredits(post);
              return (
                <li key={post.slug} data-reveal>
                  <article className={styles.latestArticle}>
                    <Link
                      className={styles.latestCardPrimaryLink}
                      href={post.href}
                      prefetch={false}
                      aria-label={`阅读全文：${post.title}`}
                    />
                    <div className={styles.latestCard}>
                      <header>
                        <span>文稿 {post.no}</span>
                        <span>{meta.label}</span>
                      </header>
                      <h3>{post.title}</h3>
                      <CreditLinks
                        className={styles.latestCredits}
                        credits={credits}
                        separator="·"
                        fallbackName={post.author || "未署名"}
                      />
                      {(post.excerpt || post.subtitle) && <p>{post.excerpt || post.subtitle}</p>}
                      <footer>
                        <time dateTime={post.dateISO}>{post.dateDisplay}</time>
                        <span>预计阅读 {post.readMin} 分钟 <b aria-hidden="true">→</b></span>
                      </footer>
                    </div>
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
