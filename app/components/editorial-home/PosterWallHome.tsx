import Link from "next/link";
import Image from "next/image";
import type { PublicContentEntry } from "@/lib/public-content";
import { site } from "@/lib/site";
import {
  EDITORIAL_SECTION_META,
  READER_EDITORIAL_SECTIONS,
  selectHomeRecommendations,
  type ReaderEditorialSection,
} from "@/lib/editorial";
import { toHomeWallPost } from "@/lib/home-wall";
import { createHomeVariantRandom } from "@/lib/home-variants";
import CreditLinks from "@/app/components/CreditLinks";
import RandomPosterWall from "./RandomPosterWall";
import styles from "./PosterWallHome.module.css";

type PosterSection = ReaderEditorialSection;
type PosterPost = PublicContentEntry & { section: PosterSection };

/** Keep translated recommendations focused on the original author everywhere on the home page. */
function visibleHomeCredits(post: PublicContentEntry) {
  return post.section === "translation"
    ? post.credits.filter((credit) => credit.role === "author")
    : post.credits;
}

function isPosterPost(post: PublicContentEntry): post is PosterPost {
  return READER_EDITORIAL_SECTIONS.includes(post.section as ReaderEditorialSection);
}

export default function PosterWallHome({
  posts,
  issue,
  recommendationSeed,
}: {
  posts: PublicContentEntry[];
  issue: string;
  recommendationSeed?: number;
}) {
  const posterPosts = posts.filter(isPosterPost);
  const recommendationRandom = recommendationSeed == null
    ? undefined
    : createHomeVariantRandom(recommendationSeed);
  const wallPosts = selectHomeRecommendations(posterPosts, 10, recommendationRandom).map(toHomeWallPost);
  const latestArticles = posterPosts.slice(0, 6);

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

      <RandomPosterWall posts={wallPosts} />

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
