import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";
import { getAllTopics, type TopicStatus } from "@/lib/topics";
import styles from "./topics.module.css";

const description = `由${site.brandCN}编辑部人工编排的主题阅读路径。`;

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
    <main className={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <header className={styles.indexHero}>
        <div className={styles.eyebrow}>
          <span>专题索引</span>
          <span>{String(topics.length).padStart(2, "0")} 个专题</span>
        </div>
        <div className={styles.indexHeroCopy}>
          <h1>专题</h1>
          <p>由编辑部选择、分组并排序的阅读路径。专题会随新内容持续补充，而不会改变既有条目的地址。</p>
        </div>
      </header>

      <section className={styles.topicIndex} aria-label="专题列表">
        {topics.length === 0 ? (
          <p className={styles.empty}>专题正在编排中。</p>
        ) : (
          topics.map((topic, index) => (
            <article className={styles.topicCard} key={topic.slug}>
              <div className={styles.cardNumber}>{String(index + 1).padStart(2, "0")}</div>
              <div className={styles.cardMain}>
                <div className={styles.cardMeta}>
                  <span>{STATUS_LABEL[topic.status]}</span>
                  <time dateTime={topic.updated}>更新 {topic.updated}</time>
                </div>
                <h2>
                  <Link href={`/topics/${encodeURIComponent(topic.slug)}`}>{topic.title}</Link>
                </h2>
                {topic.subtitle ? <p className={styles.subtitle}>{topic.subtitle}</p> : null}
                <p className={styles.summary}>{topic.summary}</p>
              </div>
              <div className={styles.cardEnd}>
                <span>{topic.groupCount} 组</span>
                <span>{topic.itemCount} 项内容</span>
                <Link href={`/topics/${encodeURIComponent(topic.slug)}`} aria-label={`进入专题：${topic.title}`}>
                  进入专题 <span aria-hidden="true">→</span>
                </Link>
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
