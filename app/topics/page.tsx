import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";
import { getAllTopics, type TopicStatus } from "@/lib/topics";
import styles from "./topics.module.css";

const description = `${site.brandCN}编辑部编排的专题目录。`;

export const metadata: Metadata = {
  title: "专题",
  description,
  alternates: { canonical: "/topics" },
  openGraph: {
    title: "专题",
    description,
    url: "/topics",
    type: "website",
  },
};

const STATUS_LABEL: Record<TopicStatus, string> = {
  ongoing: "持续更新",
  complete: "编排完成",
  archived: "已归档",
};

export default async function TopicsPage() {
  const topics = await getAllTopics();
  const canonical = `${site.url}/topics`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "专题",
    description: metadata.description,
    url: canonical,
    inLanguage: "zh-Hans",
    publisher: { "@type": "Organization", name: site.brand, url: site.url },
    hasPart: topics.map((topic, index) => ({
      "@type": "CollectionPage",
      name: topic.title,
      position: index + 1,
      url: `${site.url}/topics/${encodeURIComponent(topic.slug)}`,
    })),
  };

  return (
    <main id="main" tabIndex={-1} className={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <header className={styles.indexHeader}>
        <div>
          <h1>专题</h1>
        </div>
        <dl className={styles.indexStats}>
          <div>
            <dt>专题</dt>
            <dd>{String(topics.length).padStart(2, "0")}</dd>
          </div>
        </dl>
      </header>

      <section className={styles.topicIndex} aria-labelledby="topic-index-heading">
        <h2 className={styles.visuallyHidden} id="topic-index-heading">专题目录</h2>
        {topics.length === 0 ? (
          <p className={styles.empty}>专题正在编排中。</p>
        ) : (
          <ol className={styles.topicList}>
            {topics.map((topic) => (
              <li key={topic.slug}>
                <article className={styles.topicRow}>
                  <div className={styles.topicRowMeta}>
                    <span className={styles.status}>{STATUS_LABEL[topic.status]}</span>
                    <time dateTime={topic.updated}>{topic.updated.replaceAll("-", ".")}</time>
                  </div>
                  <div className={styles.topicRowMain}>
                    <h3><Link href={`/topics/${encodeURIComponent(topic.slug)}`}>{topic.title}</Link></h3>
                    {topic.subtitle ? <p className={styles.indexSubtitle}>{topic.subtitle}</p> : null}
                    <p className={styles.indexSummary}>{topic.summary}</p>
                  </div>
                  <dl className={styles.topicRowFacts}>
                    <div><dt>单元</dt><dd>{topic.groupCount}</dd></div>
                    <div><dt>内容</dt><dd>{topic.itemCount}</dd></div>
                  </dl>
                  <Link
                    className={styles.topicRowLink}
                    href={`/topics/${encodeURIComponent(topic.slug)}`}
                    aria-label={`进入专题：${topic.title}`}
                  >
                    <span>查看专题</span><b aria-hidden="true">→</b>
                  </Link>
                </article>
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
