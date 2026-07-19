import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { site } from "@/lib/site";
import {
  getAllTopicSlugs,
  getTopicBySlug,
  type ResolvedTopicItem,
  type TopicItemType,
  type TopicStatus,
} from "@/lib/topics";
import styles from "../topics.module.css";

export const dynamicParams = true;

const STATUS_LABEL: Record<TopicStatus, string> = {
  ongoing: "持续更新",
  complete: "编排完成",
  archived: "已归档",
};

const TYPE_LABEL: Record<TopicItemType, string> = {
  post: "文章",
  book: "书籍",
  media: "多媒体",
};

export async function generateStaticParams() {
  return (await getAllTopicSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const topic = await getTopicBySlug(decodeURIComponent(slug));
  if (!topic) return {};
  const canonical = `/topics/${encodeURIComponent(topic.slug)}`;
  return {
    title: topic.title,
    description: topic.summary,
    alternates: { canonical },
    openGraph: {
      title: topic.title,
      description: topic.summary,
      url: canonical,
      type: "website",
    },
  };
}

function itemMeta(item: ResolvedTopicItem): string {
  return [item.category, item.dateISO, item.readMin ? `${item.readMin} 分钟` : ""]
    .filter(Boolean)
    .join(" · ");
}

export default async function TopicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const topic = await getTopicBySlug(decodeURIComponent(slug));
  if (!topic) notFound();

  const canonical = `${site.url}/topics/${encodeURIComponent(topic.slug)}`;
  const orderedItems = topic.groups.flatMap((group) => group.items);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: topic.title,
    description: topic.summary,
    url: canonical,
    datePublished: topic.published,
    dateModified: topic.updated,
    inLanguage: "zh-Hans",
    publisher: { "@type": "Organization", name: site.brand, url: site.url },
    hasPart: orderedItems.map((item, index) => ({
      "@type": item.type === "book" ? "Book" : item.type === "media" ? "MediaObject" : "Article",
      name: item.title,
      url: `${site.url}${item.href}`,
      position: index + 1,
    })),
  };

  return (
    <main id="main" tabIndex={-1} className={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <nav className={styles.breadcrumb} aria-label="面包屑">
        <Link href="/topics">专题</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{topic.title}</span>
      </nav>

      <header className={styles.topicHeader}>
        <div className={styles.topicIdentity}>
          <p className={styles.topicEyebrow}>专题 · {STATUS_LABEL[topic.status]}</p>
          <h1>{topic.title}</h1>
          {topic.subtitle ? <p className={styles.topicSubtitle}>{topic.subtitle}</p> : null}
          <p className={styles.topicSummary}>{topic.summary}</p>
        </div>
        <dl className={styles.topicFacts}>
          <div><dt>发布</dt><dd><time dateTime={topic.published}>{topic.published}</time></dd></div>
          <div><dt>更新</dt><dd><time dateTime={topic.updated}>{topic.updated}</time></dd></div>
          <div><dt>编排</dt><dd>{topic.groupCount} 单元 · {topic.itemCount} 项</dd></div>
          {topic.curators.length ? <div><dt>策展</dt><dd>{topic.curators.join("、")}</dd></div> : null}
        </dl>
      </header>

      <section className={styles.introduction} aria-labelledby="topic-introduction">
        <h2 id="topic-introduction">导语</h2>
        <div dangerouslySetInnerHTML={{ __html: topic.introductionHtml }} />
      </section>

      <section className={styles.groups} aria-label="专题内容">
        {topic.groups.map((group, groupIndex) => (
          <section className={styles.group} id={group.id} key={group.id}>
            <header className={styles.groupHeader}>
              <p className={styles.groupLabel}>专题单元 {String(groupIndex + 1).padStart(2, "0")}</p>
              <h2>{group.title}</h2>
              {group.summary ? <p>{group.summary}</p> : null}
            </header>
            <ol className={styles.itemList}>
              {group.items.map((item, itemIndex) => {
                const isStart = groupIndex === 0 && itemIndex === 0;
                return (
                  <li className={styles.item} data-start={isStart ? "true" : undefined} key={`${item.type}:${item.ref}`}>
                    <div className={styles.itemOrder}>{String(itemIndex + 1).padStart(2, "0")}</div>
                    <div className={styles.itemBody}>
                      <div className={styles.itemTopline}>
                        <div>
                          {isStart ? <span className={styles.startBadge}>从这里开始</span> : null}
                          <span className={styles.itemType}>{TYPE_LABEL[item.type]}</span>
                        </div>
                        <span>{itemMeta(item)}</span>
                      </div>
                      <h3 className={styles.itemTitle}>
                        <Link href={item.href}>{item.title}<span aria-hidden="true">↗</span></Link>
                      </h3>
                      {item.subtitle ? <p className={styles.itemSubtitle}>{item.subtitle}</p> : null}
                      <p className={styles.editorialNote}>{item.editorialNote || item.summary}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </section>
    </main>
  );
}
