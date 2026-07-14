import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllPosts, getPostBySlug, type Post, type PostSummary } from "@/lib/posts";
import { site } from "@/lib/site";
import { postPath } from "@/lib/editorial";
import styles from "./media-detail.module.css";

export const dynamicParams = true;

/**
 * Editorially selected reading paths for the current media collection.
 * The relationship is deliberately explicit: a media item without a confirmed
 * association simply has no related-reading panel rather than receiving a
 * guessed list of articles.
 */
const RELATED_POSTS: Record<string, readonly string[]> = {
  csa: [
    "olsevich-gregory-soviet-planned-economy-retrospective",
    "lih-lenin-disputed",
    "modern-japan-bourgeois-state",
  ],
};

type Destination = {
  href: string;
  label: string;
};

function decodeSlug(slug: string): string {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

function decodeHtmlAttribute(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function destinationLabel(url: URL): string {
  const host = url.hostname.replace(/^www\./i, "");

  if (/(?:youtube\.com|youtu\.be)$/i.test(host)) return "YouTube";
  if (/(?:bilibili\.com|b23\.tv)$/i.test(host)) return "哔哩哔哩";
  if (/(?:podcasts\.apple\.com|apple\.co)$/i.test(host)) return "Apple Podcasts";
  if (/^1drv\.ms$/i.test(host) || /(?:^|\.)onedrive\.live\.com$/i.test(host)) {
    return "OneDrive";
  }
  if (/(?:^|\.)pan\.quark\.cn$/i.test(host)) return "夸克网盘";

  return host;
}

/**
 * Existing media posts keep their external publication URLs in Markdown.
 * Extract only absolute HTTP(S) anchors, deduplicate them, and never embed
 * the resulting destination in this site.
 */
function destinationsFrom(post: Post): Destination[] {
  const seen = new Set<string>();
  const matches = post.html.matchAll(/<a\b[^>]*\bhref=(?:"([^"]*)"|'([^']*)')[^>]*>/gi);
  const destinations: Destination[] = [];

  for (const match of matches) {
    const value = decodeHtmlAttribute(match[1] ?? match[2] ?? "");
    let url: URL;

    try {
      url = new URL(value);
    } catch {
      continue;
    }

    if (url.protocol !== "http:" && url.protocol !== "https:") continue;
    if (seen.has(url.href)) continue;

    seen.add(url.href);
    destinations.push({ href: url.href, label: destinationLabel(url) });
  }

  return destinations;
}

function isPost(post: PostSummary | undefined): post is PostSummary {
  return Boolean(post);
}

function relatedPostsFor(mediaPost: Post, posts: PostSummary[]): PostSummary[] {
  const relatedSlugs = RELATED_POSTS[mediaPost.slug] ?? [];
  return relatedSlugs
    .map((slug) => posts.find((post) => post.slug === slug))
    .filter(isPost);
}

function creditLine(post: Post): string {
  if (post.credits.length > 0) {
    return post.credits.map((credit) => `${credit.mark} ${credit.name}`).join(" · ");
  }

  return post.author || "未署名";
}

function RelatedPostCard({
  post,
  index,
}: {
  post: PostSummary;
  index: number;
}) {
  return (
    <Link href={postPath(post)} className={styles.relatedCard}>
      <div className={styles.cardTopline}>
        <span>文稿 {String(index + 1).padStart(2, "0")}</span>
        <span>{post.category}</span>
      </div>
      <h3>{post.title}</h3>
      {post.excerpt && <p>{post.excerpt}</p>}
      <div className={styles.cardMeta}>
        <span>{post.dateDisplay}</span>
        <span>{post.readMin} MIN READ</span>
        <span className={styles.cardArrow} aria-hidden="true">
          →
        </span>
      </div>
    </Link>
  );
}

export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts
    .filter((post) => post.section === "multimedia")
    .map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(decodeSlug(slug));

  if (!post || post.section !== "multimedia") return {};

  const canonical = `/media/${encodeURIComponent(post.slug)}`;
  return {
    title: post.title,
    description: post.excerpt || site.description,
    alternates: { canonical },
    openGraph: {
      title: post.title,
      description: post.excerpt || site.description,
      url: canonical,
      type: "article",
      publishedTime: post.dateISO,
      authors: post.author ? [post.author] : undefined,
      tags: post.tags,
    },
  };
}

export default async function MediaDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const mediaPost = await getPostBySlug(decodeSlug(slug));

  if (!mediaPost || mediaPost.section !== "multimedia") notFound();

  const [posts] = await Promise.all([getAllPosts()]);
  const destinations = destinationsFrom(mediaPost);
  const relatedPosts = relatedPostsFor(mediaPost, posts);
  const summary =
    mediaPost.excerpt ||
    "本条目通过站外链接发布；这里整理可核实的来源入口和编辑关联的站内文稿。";

  return (
    <main className={styles.page}>
      <div className={styles.contextBar}>
        <Link href="/" className={styles.backLink}>
          ← 返回首页
        </Link>
        <span className={styles.contextNote}>MULTIMEDIA / DETAIL</span>
      </div>

      <article>
        <section className={styles.hero} aria-labelledby="media-title">
          <div className={styles.poster} role="img" aria-label={`${mediaPost.title}的多媒体档案封面`}>
            <div className={styles.posterRule} aria-hidden="true" />
            <div className={styles.posterHeader}>
              <span>西方負典</span>
              <span>多媒体</span>
            </div>
            <div className={styles.posterIndex} aria-hidden="true">
              M
            </div>
            <div className={styles.posterCross} aria-hidden="true">
              <i />
              <i />
            </div>
            <div className={styles.posterTitle}>
              <span>多</span>
              <span>媒</span>
            </div>
            <div className={styles.posterFooter}>
              <span>EXTERNAL LINKS</span>
              <span>{mediaPost.dateDisplay}</span>
            </div>
          </div>

          <div className={styles.heroCopy}>
            <div className={styles.eyebrow}>
              <span className={styles.redSquare} aria-hidden="true" />
              <span>多媒体 / MULTIMEDIA</span>
              <span>档案</span>
            </div>

            <h1 id="media-title">{mediaPost.title}</h1>
            <p className={styles.summary}>{summary}</p>

            <dl className={styles.facts}>
              <div>
                <dt>发布</dt>
                <dd>
                  <time dateTime={mediaPost.dateISO}>{mediaPost.dateDisplay}</time>
                </dd>
              </div>
              <div>
                <dt>分类</dt>
                <dd>{mediaPost.category}</dd>
              </div>
              <div>
                <dt>署名</dt>
                <dd>{creditLine(mediaPost)}</dd>
              </div>
              <div>
                <dt>标签</dt>
                <dd>{mediaPost.tags.length > 0 ? mediaPost.tags.join(" · ") : "未标注"}</dd>
              </div>
            </dl>

            <div className={styles.destinations}>
              <div className={styles.destinationHeading}>
                <h2>站外链接</h2>
                <span>在原始平台打开</span>
              </div>
              {destinations.length > 0 ? (
                <nav aria-label="站外媒体链接">
                  {destinations.map((destination, index) => (
                    <a
                      key={destination.href}
                      href={destination.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.platformLink}
                    >
                      <span className={styles.platformNo}>{String(index + 1).padStart(2, "0")}</span>
                      <strong>{destination.label}</strong>
                      <span>前往原始页面</span>
                      <span className={styles.externalArrow} aria-hidden="true">
                        ↗
                      </span>
                    </a>
                  ))}
                </nav>
              ) : (
                <p className={styles.noDestination}>发布链接待补录</p>
              )}
              <p className={styles.noPlayerNote}>
                本站不嵌入或播放多媒体；链接会在新标签页打开。
              </p>
            </div>
          </div>
        </section>

        <section className={styles.overview} aria-labelledby="overview-title">
          <div className={styles.sectionLabel}>
            <span>01</span>
            <p>条目说明</p>
            <small>ABOUT THIS ITEM</small>
          </div>
          <div className={styles.overviewBody}>
            <h2 id="overview-title">
              从站外现场，
              <br />
              回到站内阅读。
            </h2>
            <div className={styles.overviewText}>
              <p>
                这个页面只保留条目的简介、可核实的站外入口和编辑关联文稿。它不播放、镜像或嵌入媒体，也不替代原始发布平台。
              </p>
              <p>
                关联文稿提供进入同一话题的另一条路径：可以先从站外内容出发，也可以先阅读文字材料，再回到原始页面。
              </p>
            </div>
          </div>
        </section>

        <section className={styles.material} aria-labelledby="material-title">
          <header className={styles.materialHeading}>
            <div>
              <span>02 / ITEM MATERIAL</span>
              <h2 id="material-title">条目资料</h2>
            </div>
            <p>原始说明与附件</p>
          </header>
          <article
            className={styles.materialBody}
            dangerouslySetInnerHTML={{ __html: mediaPost.html }}
          />
        </section>

        {relatedPosts.length > 0 && (
          <section className={styles.related} aria-labelledby="related-title">
            <div className={styles.relatedHeading}>
              <div>
                <span>03 / RELATED READING</span>
                <h2 id="related-title">关联文稿</h2>
              </div>
              <p>{String(relatedPosts.length).padStart(2, "0")} 篇站内文章</p>
            </div>
            <div className={styles.relatedGrid}>
              {relatedPosts.map((post, index) => (
                <RelatedPostCard key={post.slug} post={post} index={index} />
              ))}
            </div>
          </section>
        )}
      </article>
    </main>
  );
}
