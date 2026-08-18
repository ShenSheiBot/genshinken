import type { Metadata } from "next";
import { site } from "@/lib/site";
import styles from "./about.module.css";

const pageDescription = `了解${site.brandCN}的历史、协作方式，以及投稿、勘误与合作联系方式。`;
export const metadata: Metadata = {
  title: "关于屋顶",
  description: pageDescription,
  alternates: { canonical: "/about" },
  openGraph: {
    title: "关于屋顶",
    description: pageDescription,
    url: `${site.url}/about`,
    siteName: site.tabTitle,
    type: "website",
  },
};

export default function AboutPage() {
  return (
    <main id="main" tabIndex={-1} className={styles.page} data-about-page="true">
      <section className={styles.intro} aria-labelledby="about-roof">
        <p className={styles.eyebrow}>ABOUT THE ROOF</p>
        <h1 id="about-roof">屋顶现视研</h1>
        <p className={styles.lead}>
          以动画、漫画、游戏及相关视听文化为对象的民间批评与译介共同体。
          屋顶由来自不同方向、抱有不同志趣的作者、译者、校对者与制作者共同生成；
          它不是一个整全、封闭的系统，而是一处让作品与语言继续往复的公共空间。
        </p>
        <div className={styles.principles}>
          <article>
            <span>01</span>
            <h2>自愿 · 自由 · 自律</h2>
            <p>自由的人们聚集起来协作，以平等的公共讨论推进共同的事业。</p>
          </article>
          <article>
            <span>02</span>
            <h2>评论 · 翻译 · 视听</h2>
            <p>从作品、历史、产业、媒介与思想出发，分享原创评论、研究译介与视频论文。</p>
          </article>
          <article>
            <span>03</span>
            <h2>开放的批评生态</h2>
            <p>尊重独立论者各自开拓门户，以更多元、更高水平的总体评论生态为目标。</p>
          </article>
        </div>
        <p className={styles.archiveNote}>
          本站目前为内容档案与新文章发布系统的预览版。文章沿用原作者、译者、校对者署名，
          并尽可能保留原注、参考文献和最初发布信息。
        </p>
      </section>
      <section className={styles.contact} aria-labelledby="about-contact">
        <div className={styles.contactContent}>
          <h2 id="about-contact">联系我们</h2>
          <div className={styles.contactGrid}>
            <a className={styles.contactCard} href={`mailto:${site.editorEmail}`}>
              <span>投稿与勘误</span>
              <strong>{site.editorEmail}</strong>
            </a>
            <a className={styles.contactCard} href={`mailto:${site.infoEmail}`}>
              <span>一般事项</span>
              <strong>{site.infoEmail}</strong>
            </a>
          </div>
          <nav className={styles.socials} aria-label="站外主页">
            {site.social.map((item) => (
              <a key={item.href} href={item.href} target="_blank" rel="noopener noreferrer">
                {item.label} ↗
              </a>
            ))}
          </nav>
        </div>
      </section>
    </main>
  );
}
