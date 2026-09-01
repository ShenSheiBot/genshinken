import type { Metadata } from "next";
import { site } from "@/lib/site";
import styles from "./about.module.css";

const pageDescription = `了解${site.brandCN}的历史、协作方式，以及投稿、勘误与合作联系方式。`;
const suppliedBuildTimestamp = process.env.ROOF_BUILD_TIMESTAMP;
const parsedBuildTimestamp = suppliedBuildTimestamp ? new Date(suppliedBuildTimestamp) : null;
const buildTimestamp = parsedBuildTimestamp && !Number.isNaN(parsedBuildTimestamp.valueOf())
  ? parsedBuildTimestamp.toISOString()
  : undefined;
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
  ...(buildTimestamp ? { other: { "roof-build-timestamp": buildTimestamp } } : {}),
};

const socialIconPaths = {
  "哔哩哔哩": "M17.813 4.653h.854c1.51.054 2.769.578 3.773 1.574 1.004.995 1.524 2.249 1.56 3.76v7.36c-.036 1.51-.556 2.769-1.56 3.773s-2.262 1.524-3.773 1.56H5.333c-1.51-.036-2.769-.556-3.773-1.56S.036 18.858 0 17.347v-7.36c.036-1.511.556-2.765 1.56-3.76 1.004-.996 2.262-1.52 3.773-1.574h.774l-1.174-1.12a1.234 1.234 0 0 1-.373-.906c0-.356.124-.658.373-.907l.027-.027c.267-.249.573-.373.92-.373.347 0 .653.124.92.373L9.653 4.44c.071.071.134.142.187.213h4.267a.836.836 0 0 1 .16-.213l2.853-2.747c.267-.249.573-.373.92-.373.347 0 .662.151.929.4.267.249.391.551.391.907 0 .355-.124.657-.373.906zM5.333 7.24c-.746.018-1.373.276-1.88.773-.506.498-.769 1.13-.786 1.894v7.52c.017.764.28 1.395.786 1.893.507.498 1.134.756 1.88.773h13.334c.746-.017 1.373-.275 1.88-.773.506-.498.769-1.129.786-1.893v-7.52c-.017-.765-.28-1.396-.786-1.894-.507-.497-1.134-.755-1.88-.773zM8 11.107c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c0-.373.129-.689.386-.947.258-.257.574-.386.947-.386zm8 0c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c.017-.391.15-.711.4-.96.249-.249.56-.373.933-.373Z",
  "知乎": "M5.721 0C2.251 0 0 2.25 0 5.719V18.28C0 21.751 2.252 24 5.721 24h12.56C21.751 24 24 21.75 24 18.281V5.72C24 2.249 21.75 0 18.281 0zm1.964 4.078c-.271.73-.5 1.434-.68 2.11h4.587c.545-.006.445 1.168.445 1.171H9.384a58.104 58.104 0 01-.112 3.797h2.712c.388.023.393 1.251.393 1.266H9.183a9.223 9.223 0 01-.408 2.102l.757-.604c.452.456 1.512 1.712 1.906 2.177.473.681.063 2.081.063 2.081l-2.794-3.382c-.653 2.518-1.845 3.607-1.845 3.607-.523.468-1.58.82-2.64.516 2.218-1.73 3.44-3.917 3.667-6.497H4.491c0-.015.197-1.243.806-1.266h2.71c.024-.32.086-3.254.086-3.797H6.598c-.136.406-.158.447-.268.753-.594 1.095-1.603 1.122-1.907 1.155.906-1.821 1.416-3.6 1.591-4.064.425-1.124 1.671-1.125 1.671-1.125zM13.078 6h6.377v11.33h-2.573l-2.184 1.373-.401-1.373h-1.219zm1.313 1.219v8.86h.623l.263.937 1.455-.938h1.456v-8.86z",
  "微信": "M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89c-.135-.01-.27-.027-.407-.03zm-2.53 3.274c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.969-.982z",
} as const;

const zhihuQrPath = "M4 4.5h7m2 0h1m2 0h3m1 0h1m1 0h3m1 0h7M4 5.5h1m5 0h1m2 0h1m3 0h3m1 0h2m1 0h1m1 0h1m5 0h1M4 6.5h1m1 0h3m1 0h1m1 0h1m1 0h3m1 0h2m3 0h2m1 0h1m1 0h3m1 0h1M4 7.5h1m1 0h3m1 0h1m1 0h3m1 0h2m1 0h3m1 0h1m2 0h1m1 0h3m1 0h1M4 8.5h1m1 0h3m1 0h1m1 0h1m1 0h2m2 0h1m2 0h3m2 0h1m1 0h3m1 0h1M4 9.5h1m5 0h1m1 0h2m1 0h1m1 0h3m1 0h1m2 0h1m1 0h1m5 0h1M4 10.5h7m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h7M12 11.5h4m2 0h1m1 0h1m3 0h1M4 12.5h1m1 0h5m3 0h2m4 0h2m1 0h1m2 0h5M5 13.5h1m1 0h1m1 0h1m2 0h1m1 0h1m2 0h2m1 0h5m1 0h3m3 0h1M4 14.5h4m1 0h2m1 0h4m2 0h2m4 0h3M4 15.5h1m1 0h1m1 0h2m3 0h2m1 0h1m1 0h3m1 0h6m1 0h1m1 0h1M4 16.5h1m2 0h1m2 0h2m1 0h1m1 0h1m4 0h2m1 0h1m5 0h2M4 17.5h3m1 0h1m2 0h1m2 0h2m1 0h2m4 0h4m1 0h1m3 0h1M5 18.5h2m1 0h4m1 0h1m1 0h2m1 0h1m5 0h4m1 0h2M5 19.5h1m1 0h3m2 0h2m2 0h1m1 0h3m2 0h1m1 0h1m1 0h2m2 0h1M5 20.5h2m1 0h4m1 0h2m3 0h1m2 0h1m5 0h1m1 0h2M4 21.5h2m1 0h1m4 0h1m1 0h2m3 0h10m1 0h1m1 0h1M4 22.5h1m1 0h5m1 0h1m2 0h2m1 0h2m5 0h3m2 0h1M4 23.5h1m2 0h1m5 0h1m1 0h2m2 0h1m3 0h2m2 0h2m2 0h1M4 24.5h1m3 0h9m2 0h3m1 0h6m1 0h3M12 25.5h1m2 0h1m1 0h1m1 0h1m1 0h2m1 0h1m3 0h5M4 26.5h7m4 0h1m1 0h5m1 0h2m1 0h1m1 0h3M4 27.5h1m5 0h1m1 0h1m2 0h1m1 0h1m2 0h1m1 0h1m1 0h1m3 0h1m3 0h1M4 28.5h1m1 0h3m1 0h1m1 0h3m3 0h1m1 0h3m1 0h5m1 0h1m1 0h1M4 29.5h1m1 0h3m1 0h1m1 0h3m1 0h2m1 0h5m3 0h1m1 0h2M4 30.5h1m1 0h3m1 0h1m1 0h3m2 0h1m1 0h3m1 0h1m1 0h7M4 31.5h1m5 0h1m3 0h5m4 0h5m1 0h1m1 0h1M4 32.5h7m1 0h1m1 0h1m4 0h1m1 0h1m1 0h1m1 0h1m1 0h4";
const wechatQrPath = "M4 4.5h7m2 0h6m1 0h2m1 0h2m2 0h2m1 0h7M4 5.5h1m5 0h1m2 0h1m1 0h1m1 0h3m1 0h1m2 0h3m1 0h1m1 0h1m5 0h1M4 6.5h1m1 0h3m1 0h1m1 0h2m3 0h1m3 0h7m2 0h1m1 0h3m1 0h1M4 7.5h1m1 0h3m1 0h1m1 0h5m1 0h1m1 0h1m2 0h2m1 0h3m1 0h1m1 0h3m1 0h1M4 8.5h1m1 0h3m1 0h1m1 0h5m2 0h1m2 0h1m4 0h1m2 0h1m1 0h3m1 0h1M4 9.5h1m5 0h1m1 0h1m3 0h1m2 0h4m1 0h1m1 0h1m1 0h1m1 0h1m5 0h1M4 10.5h7m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h7M12 11.5h2m4 0h2m2 0h1m2 0h1m2 0h1M4 12.5h1m1 0h5m6 0h1m1 0h4m3 0h1m1 0h1m1 0h5M6 13.5h1m4 0h1m1 0h4m1 0h1m1 0h1m1 0h2m1 0h3m1 0h2m2 0h2M4 14.5h1m1 0h2m1 0h5m2 0h1m2 0h1m2 0h1m1 0h3m5 0h1m1 0h2M4 15.5h4m1 0h1m2 0h3m1 0h1m1 0h1m5 0h3m1 0h1m1 0h1m1 0h3M4 16.5h1m1 0h2m2 0h2m3 0h1m3 0h1m2 0h2m1 0h1m1 0h1m1 0h1m2 0h2m2 0h1M4 17.5h1m1 0h1m1 0h1m3 0h1m1 0h3m1 0h4m2 0h2m1 0h3m3 0h4M5 18.5h2m2 0h4m3 0h1m1 0h1m2 0h1m1 0h1m1 0h1m3 0h1m2 0h4M4 19.5h2m3 0h1m1 0h5m2 0h1m1 0h1m2 0h4m1 0h3m2 0h2M7 20.5h2m1 0h3m4 0h1m3 0h1m1 0h1m2 0h4m1 0h2m1 0h1m1 0h1M9 21.5h1m1 0h1m1 0h5m1 0h6m1 0h2m2 0h2m1 0h2M4 22.5h1m1 0h2m1 0h2m1 0h1m2 0h3m1 0h1m1 0h1m2 0h1m1 0h1m1 0h2m2 0h1m1 0h2M7 23.5h2m2 0h1m3 0h4m2 0h4m3 0h3m1 0h4M4 24.5h4m1 0h2m1 0h5m3 0h1m2 0h5m1 0h1m3 0h1m2 0h1M4 25.5h3m1 0h2m2 0h1m2 0h1m1 0h3m1 0h2m2 0h1m1 0h3m6 0h1M4 26.5h1m1 0h3m1 0h5m1 0h2m1 0h2m3 0h2m2 0h2m1 0h1m1 0h1m1 0h1M4 27.5h1m2 0h2m3 0h1m2 0h1m3 0h1m5 0h5m1 0h4m1 0h1M4 28.5h1m1 0h2m1 0h5m5 0h1m1 0h1m6 0h9M12 29.5h1m3 0h3m1 0h1m2 0h3m1 0h2m3 0h1m1 0h1m1 0h1M4 30.5h7m4 0h3m1 0h2m1 0h1m1 0h2m1 0h2m1 0h1m1 0h1m1 0h2M4 31.5h1m5 0h1m1 0h1m1 0h1m1 0h1m3 0h1m2 0h1m1 0h4m3 0h1m1 0h1M4 32.5h1m1 0h3m1 0h1m1 0h1m3 0h3m3 0h1m2 0h1m2 0h6m2 0h1M4 33.5h1m1 0h3m1 0h1m1 0h4m2 0h3m3 0h1m1 0h4m1 0h2m3 0h1M4 34.5h1m1 0h3m1 0h1m1 0h4m1 0h1m4 0h2m2 0h1m3 0h2m2 0h1M4 35.5h1m5 0h1m3 0h4m2 0h1m1 0h4m1 0h3m1 0h4M4 36.5h7m1 0h2m4 0h1m2 0h3m2 0h8m1 0h1";

function SocialIcon({ path }: { path: string }) {
  return (
    <svg
      aria-hidden="true"
      className={styles.socialIcon}
      focusable="false"
      viewBox="0 0 24 24"
    >
      <path d={path} />
    </svg>
  );
}

function QrCode({ path, size = 37 }: { path?: string; size?: number }) {
  return (
    <svg
      aria-hidden="true"
      className={styles.qrCode}
      focusable="false"
      shapeRendering="crispEdges"
      viewBox={`0 0 ${size} ${size}`}
    >
      {path ? (
        <path d={path} fill="none" stroke="currentColor" />
      ) : (
        <path
          d="M4 4.5h7m2 0h3m2 0h1m2 0h4m1 0h7M4 5.5h1m5 0h1m1 0h1m1 0h2m1 0h1m4 0h3m1 0h1m5 0h1M4 6.5h1m1 0h3m1 0h1m2 0h1m5 0h1m2 0h1m1 0h1m1 0h1m1 0h3m1 0h1M4 7.5h1m1 0h3m1 0h1m3 0h1m2 0h1m2 0h1m1 0h1m3 0h1m1 0h3m1 0h1M4 8.5h1m1 0h3m1 0h1m1 0h3m1 0h2m2 0h1m1 0h2m2 0h1m1 0h3m1 0h1M4 9.5h1m5 0h1m3 0h1m3 0h3m2 0h1m2 0h1m5 0h1M4 10.5h7m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h7M15 11.5h2m2 0h1m1 0h4M4 12.5h1m1 0h1m1 0h1m1 0h1m3 0h2m4 0h2m1 0h2m3 0h1m2 0h1M7 13.5h1m1 0h1m2 0h3m2 0h1m1 0h2m3 0h3m2 0h1m2 0h1M4 14.5h1m1 0h1m1 0h3m2 0h1m4 0h4m3 0h3m2 0h3M4 15.5h3m4 0h1m1 0h3m1 0h2m1 0h4m3 0h1m3 0h1M5 16.5h1m4 0h1m1 0h2m4 0h4m1 0h2m1 0h1m2 0h1m1 0h2M4 17.5h2m5 0h1m4 0h1m1 0h2m4 0h3m2 0h1m2 0h1M4 18.5h2m2 0h4m1 0h3m1 0h1m2 0h1m3 0h2m1 0h3m1 0h2M4 19.5h1m1 0h1m5 0h2m2 0h1m2 0h1m1 0h2m2 0h3m1 0h1m1 0h1M4 20.5h2m1 0h1m2 0h1m5 0h1m4 0h2m1 0h3m2 0h1m1 0h2M5 21.5h1m1 0h1m4 0h1m1 0h1m1 0h2m2 0h1m3 0h3m2 0h2m1 0h1M4 22.5h1m4 0h3m1 0h1m1 0h1m2 0h1m1 0h2m4 0h1m1 0h1m2 0h2M5 23.5h1m1 0h1m1 0h1m1 0h1m1 0h6m2 0h3m1 0h3m1 0h1m1 0h1M4 24.5h1m1 0h1m1 0h1m1 0h2m3 0h2m1 0h1m3 0h7M12 25.5h1m1 0h1m1 0h1m1 0h1m1 0h5m3 0h1m1 0h3M4 26.5h7m5 0h2m1 0h1m2 0h3m1 0h1m1 0h2m1 0h2M4 27.5h1m5 0h1m2 0h3m5 0h1m2 0h1m3 0h2m2 0h1M4 28.5h1m1 0h3m1 0h1m1 0h1m1 0h1m1 0h1m2 0h4m1 0h5M4 29.5h1m1 0h3m1 0h1m2 0h1m6 0h2m1 0h1m4 0h1m1 0h1M4 30.5h1m1 0h3m1 0h1m1 0h2m1 0h1m2 0h2m3 0h1m3 0h3m2 0h1M4 31.5h1m5 0h1m2 0h1m4 0h1m2 0h6m1 0h1m2 0h1M4 32.5h7m1 0h5m3 0h2m1 0h4m1 0h2m1 0h2"
          fill="none"
          stroke="currentColor"
        />
      )}
    </svg>
  );
}

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
            {site.social.map((item) => {
              const isBilibili = item.label === "哔哩哔哩";
              const isWechat = item.label === "微信";
              const hasQr = isBilibili || item.label === "知乎" || isWechat;
              const iconPath = socialIconPaths[item.label];
              return (
                <span className={styles.socialItem} key={item.href}>
                  <a
                    className={styles.socialLink}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <SocialIcon path={iconPath} />
                    <span>{item.label} ↗</span>
                  </a>
                  {hasQr ? (
                    <span className={styles.qrPopup} aria-hidden="true">
                      {isBilibili ? (
                        <QrCode />
                      ) : (
                        <QrCode path={isWechat ? wechatQrPath : zhihuQrPath} size={isWechat ? 41 : 37} />
                      )}
                      <span>
                        {isBilibili ? "扫码访问屋顶现视研" : isWechat ? "扫码关注屋顶现视研" : "扫码访问知乎专栏"}
                      </span>
                    </span>
                  ) : null}
                </span>
              );
            })}
          </nav>
        </div>
      </section>
    </main>
  );
}
