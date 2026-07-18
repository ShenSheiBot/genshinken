import type { Metadata } from "next";
import Link from "next/link";
import { getTeamMembers } from "@/lib/contributors";
import { site } from "@/lib/site";
import styles from "./about.module.css";

const pageDescription = `了解${site.brandCN}的工作、编辑旨趣与联系方式。`;
export const metadata: Metadata = {
  title: "关于",
  description: pageDescription,
  alternates: { canonical: "/about" },
  openGraph: {
    title: "关于",
    description: pageDescription,
    url: `${site.url}/about`,
    type: "website",
  },
};

export default function AboutPage() {
  const teamMembers = getTeamMembers();

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div>
          <span className={styles.kicker}>关于</span>
          <h1>关于我们</h1>
        </div>
        <p className={styles.intro}>{site.description}</p>
      </header>

      <div className={styles.sections}>
        <section className={styles.section} aria-labelledby="about-work">
          <span className={styles.sectionNumber}>01 / 工作</span>
          <h2 id="about-work">我们做什么</h2>
          <p>
            本站发布原创论述、评论、译介与多媒体资料，关注历史过程、产业结构与文化经验之间的联系。
            文库将不同栏目、主题、标签和署名位置收拢到同一套可检索的内容结构中。
          </p>
        </section>

        <section className={styles.section} aria-labelledby="about-purpose">
          <span className={styles.sectionNumber}>02 / 旨趣</span>
          <h2 id="about-purpose">编辑旨趣</h2>
          <p>
            我们希望为汉语读者提供经得起追索的材料与观察视角：既保留长篇论证和连续阅读的空间，也让来源、作者与译者得到清楚署名。
          </p>
          <p>文章的署名姓名可进入文库，查看同一贡献者在不同角色下参与的全部内容。</p>
        </section>
      </div>

      <section className={styles.team} aria-labelledby="about-team">
        <div className={styles.sectionHeading}>
          <span className={styles.sectionNumber}>03</span>
          <h2 id="about-team">团队</h2>
        </div>
        {teamMembers.length > 0 ? (
          <ul className={styles.teamList}>
            {teamMembers.map((member) => (
              <li key={member.id}>
                <strong>{member.displayName}</strong>
                {member.teamTitle && <span>{member.teamTitle}</span>}
                {member.bio && <p>{member.bio}</p>}
                <Link href={`/library?contributor=${encodeURIComponent(member.id)}`}>查看参与内容 →</Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className={styles.teamEmpty}>
            <h3>西方負典编辑部</h3>
            <p>
              编辑部负责选题组织、稿件编辑、译稿校订、资料核对与站点维护。成员个人资料将在获得明确的公开授权后列出；
              文章作者与译者不会因一次署名而被自动视为团队成员。
            </p>
            <Link href="/library">按贡献者查看公开署名内容 →</Link>
          </div>
        )}
      </section>

      <section className={styles.contact} aria-labelledby="about-contact">
        <span className={styles.sectionNumber}>04</span>
        <div className={styles.contactContent}>
          <h2 id="about-contact">联系</h2>
          <div className={styles.contactGrid}>
            <a className={styles.contactCard} href={`mailto:${site.editorEmail}`}>
              <span>投稿、编辑、勘误与版权事项</span>
              <strong>{site.editorEmail}</strong>
            </a>
            <a className={styles.contactCard} href={`mailto:${site.infoEmail}`}>
              <span>一般咨询与合作联系</span>
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
