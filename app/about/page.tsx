import type { Metadata } from "next";
import { site } from "@/lib/site";
import styles from "./about.module.css";

const pageDescription = `联系${site.brandCN}编辑部，获取投稿、编辑、勘误、版权与合作事宜的联系方式。`;
export const metadata: Metadata = {
  title: "联系",
  description: pageDescription,
  alternates: { canonical: "/about" },
  openGraph: {
    title: "联系",
    description: pageDescription,
    url: `${site.url}/about`,
    type: "website",
  },
};

export default function AboutPage() {
  return (
    <main className={styles.page} data-about-page="true">
      <section className={styles.contact} aria-labelledby="about-contact">
        <div className={styles.contactContent}>
          <h1 id="about-contact">联系</h1>
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
