import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getAllPosts,
  getPreviewablePosts,
  getPostBySlug,
  type CreditRole,
  type Post,
  type PostSummary,
} from "@/lib/posts";
import { site } from "@/lib/site";
import { postPath } from "@/lib/editorial";
import { sanitizeMediaMaterial } from "@/lib/media-material";
import { citationToBibtex, citationToMetadata } from "@/lib/citations";
import { hanScriptLanguageTag } from "@/lib/han-script";
import CitationCopyButton from "@/app/components/CitationCopyButton";
import CreditLinks from "@/app/components/CreditLinks";
import styles from "./media-detail.module.css";

export const dynamicParams = false;

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

  return "站外平台";
}

/**
 * Existing media posts keep their external publication URLs in Markdown.
 * Extract only absolute HTTP(S) anchors, deduplicate them, and never embed
 * the resulting destination in this site.
 */
function destinationsFrom(html: string): Destination[] {
  const seen = new Set<string>();
  const matches = html.matchAll(/<a\b[^>]*\bhref=(?:"([^"]*)"|'([^']*)')[^>]*>/gi);
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
  return mediaPost.relatedPosts
    .map((slug) => posts.find((post) => post.slug === slug && post.section !== "multimedia"))
    .filter(isPost);
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
        <span>预计阅读 {post.readMin} 分钟</span>
        <span className={styles.cardArrow} aria-hidden="true">
          →
        </span>
      </div>
    </Link>
  );
}

function buildJsonLd(post: Post, destinations: Destination[]) {
  const canonical = `${site.url}${postPath(post)}`;
  const roleProperties: Record<CreditRole, "author" | "translator" | "contributor"> = {
    author: "author",
    translator: "translator",
    proofreader: "contributor",
  };
  const people: Partial<
    Record<"author" | "translator" | "contributor", Array<Record<string, string>>>
  > = {};

  for (const credit of post.credits) {
    const property = roleProperties[credit.role];
    const records = people[property] ?? [];
    records.push({
      "@type": "Person",
      name: credit.name,
      url: `${site.url}/library?contributor=${encodeURIComponent(credit.contributorId)}`,
    });
    people[property] = records;
  }

  return {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: post.title,
    description: post.excerpt || site.description,
    url: canonical,
    mainEntityOfPage: canonical,
    inLanguage: hanScriptLanguageTag(post.script),
    datePublished: post.dateISO,
    dateModified: post.updatedISO,
    ...people,
    ...(post.tags.length ? { keywords: post.tags.join(",") } : {}),
    genre: post.category,
    ...(destinations.length ? { sameAs: destinations.map((destination) => destination.href) } : {}),
    license: "https://creativecommons.org/publicdomain/zero/1.0/",
    publisher: { "@type": "Organization", name: site.brand, url: site.url },
  };
}

export async function generateStaticParams() {
  const posts = await getPreviewablePosts();
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
    alternates: {
      canonical,
      types: { "application/x-bibtex": `${canonical}/cite.bib` },
    },
    other: citationToMetadata(post.citation),
    openGraph: {
      title: post.title,
      description: post.excerpt || site.description,
      url: canonical,
      siteName: site.tabTitle,
      type: "article",
      publishedTime: post.dateISO,
      modifiedTime: post.updatedISO,
      authors: post.credits
        .filter((credit) => credit.role === "author")
        .map((credit) => credit.name),
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
  const materialHtml = sanitizeMediaMaterial(mediaPost.html);
  const destinations = destinationsFrom(materialHtml);
  const relatedPosts = relatedPostsFor(mediaPost, posts);
  const citationBibtex = citationToBibtex(mediaPost.citation);
  const citationHref = `${postPath(mediaPost)}/cite.bib`;
  const summary =
    mediaPost.excerpt ||
    "本条目通过站外链接发布；这里整理可核实的来源入口和编辑关联的站内文稿。";

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildJsonLd(mediaPost, destinations)).replace(/</g, "\\u003c"),
        }}
      />
      <main id="main" tabIndex={-1} className={styles.page} data-reveal-zone="media">
      <div className={styles.contextBar}>
        <Link href="/" className={styles.backLink}>
          ← 返回首页
        </Link>
        <span className={styles.contextNote}>多媒体详情</span>
      </div>

      <article>
        <section className={styles.hero} aria-labelledby="media-title" data-reveal>
          <div className={styles.poster} role="img" aria-label={`${mediaPost.title}的多媒体档案封面`}>
            <div className={styles.posterRule} aria-hidden="true" />
            <div className={styles.posterHeader}>
              <span>西方負典</span>
              <span>多媒体</span>
            </div>
            <div className={styles.posterIndex} aria-hidden="true">
              媒
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
              <span>站外链接</span>
              <span>{mediaPost.dateDisplay}</span>
            </div>
          </div>

          <div className={styles.heroCopy}>
            <div className={styles.eyebrow}>
              <span className={styles.redSquare} aria-hidden="true" />
              <span>多媒体</span>
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
                <dd><CreditLinks credits={mediaPost.credits} fallbackName={mediaPost.author || "未署名"} /></dd>
              </div>
              <div>
                <dt>标签</dt>
                <dd>{mediaPost.tags.length > 0 ? mediaPost.tags.join(" · ") : "未标注"}</dd>
              </div>
            </dl>

            <div className={styles.citationActions} aria-label="BibTeX 引用">
              <CitationCopyButton
                bibtex={citationBibtex}
                className={styles.citationCopy}
                label="复制"
              />
              <a
                href={citationHref}
                download={`${mediaPost.slug}.bib`}
                aria-label="下载本页 BibTeX 引用"
              >
                <span>BIB</span>
                下载
              </a>
            </div>

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

        <section className={styles.overview} aria-labelledby="overview-title" data-reveal>
          <div className={styles.sectionLabel}>
            <span>01</span>
            <p>条目说明</p>
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

        <section className={styles.material} aria-labelledby="material-title" data-reveal>
          <header className={styles.materialHeading}>
            <div>
              <span>02</span>
              <h2 id="material-title">条目资料</h2>
            </div>
            <p>原始说明与附件</p>
          </header>
          <article
            className={styles.materialBody}
            dangerouslySetInnerHTML={{ __html: materialHtml }}
          />
        </section>

        {relatedPosts.length > 0 && (
          <section className={styles.related} aria-labelledby="related-title" data-reveal>
            <div className={styles.relatedHeading}>
              <div>
                <span>03</span>
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
    </>
  );
}
