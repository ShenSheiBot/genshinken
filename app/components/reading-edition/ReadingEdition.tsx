import Link from "next/link";
import type { Credit, Post, PostSummary } from "@/lib/posts";
import { site } from "@/lib/site";
import {
  EDITORIAL_SECTION_META,
  postPath,
  type EditorialSection,
} from "@/lib/editorial";
import ReadingPrototypeChrome from "@/app/prototype/reading/[slug]/ReadingPrototypeChrome";
import CreditLinks from "@/app/components/CreditLinks";
import styles from "@/app/prototype/reading/[slug]/reading-prototype.module.css";
import homeStyles from "@/app/components/editorial-home/PosterWallHome.module.css";

type ReadingVariant = "dossier" | "folio";

const sectionFor = (post: PostSummary): EditorialSection => post.section;
const sectionMeta = EDITORIAL_SECTION_META;

export type ArticleParts = {
  main: string;
  notes: string;
  sources: string;
  noteCount: number;
  sourceCount: number;
};

function pullSection(html: string, className: string): { html: string; rest: string } {
  const pattern = new RegExp(
    `<section\\b[^>]*class="[^"]*\\b${className}\\b[^"]*"[^>]*>[\\s\\S]*?<\\/section>`,
    "i"
  );
  const match = html.match(pattern);
  if (!match) return { html: "", rest: html };
  return { html: match[0], rest: html.replace(match[0], "") };
}

export function splitArticle(html: string): ArticleParts {
  const footnotes = pullSection(html, "footnotes");
  const sourceNotes = pullSection(footnotes.rest, "source-notes");
  return {
    main: sourceNotes.rest,
    notes: footnotes.html,
    sources: sourceNotes.html,
    noteCount: (footnotes.html.match(/<li\b/gi) ?? []).length,
    sourceCount: (sourceNotes.html.match(/<li\b/gi) ?? []).length,
  };
}

function displayCredits(post: Post): Credit[] {
  return post.credits;
}

/** Keep the editorial role marks visible in every reading-cover direction. */
function CreditLine({ credits }: { credits: Credit[] }) {
  return (
    <CreditLinks
      className={styles.creditLine}
      credits={credits}
      itemClassName={styles.credit}
      markClassName={styles.creditMark}
      fallbackName={`${site.brandCN}编辑部`}
    />
  );
}

function MetaRows({ post }: { post: Post }) {
  return (
    <dl className={styles.metaRows}>
      <div><dt>栏目</dt><dd>{sectionMeta[sectionFor(post)].label}</dd></div>
      {displayCredits(post).map((credit, index) => (
        <div key={`${credit.mark}-${credit.name}-${index}`}>
          <dt>
            <span className={styles.metaCreditLabel}>
              <span
                className={styles.creditMark}
                data-solid={credit.solid ? "true" : "false"}
                role="img"
                aria-label={credit.role === "author" ? "作者" : "译者"}
              >
                {credit.mark}
              </span>
            </span>
          </dt>
          <dd><CreditLinks credits={[credit]} showMarks={false} /></dd>
        </div>
      ))}
      <div><dt>发布</dt><dd>{post.dateISO.replaceAll("-", ".")}</dd></div>
      <div><dt>篇幅</dt><dd>约 {post.readMin} 分钟</dd></div>
      <div><dt>编号</dt><dd>第 {post.no} 号</dd></div>
    </dl>
  );
}

function SourceRecord({ post }: { post: Post }) {
  const translated = sectionFor(post) === "translation";
  const originalAuthors = post.credits.filter((credit) => credit.role === "author");
  const translators = post.credits.filter((credit) => credit.role === "translator");
  return (
    <aside className={styles.sourceRecord} aria-label={translated ? "原文资料" : "文章提要"}>
      <span className={styles.eyebrow}>{translated ? "原文资料" : "本文提要"}</span>
      {translated ? (
        <dl>
          {(originalAuthors.length > 0 || post.author) && (
            <div>
              <dt>
                <span className={styles.creditMark} data-solid="true" role="img" aria-label="作者">作</span>
              </dt>
              <dd><CreditLinks credits={originalAuthors} showMarks={false} fallbackName={post.author} /></dd>
            </div>
          )}
          {translators.length > 0 && (
            <div>
              <dt>
                <span className={styles.creditMark} data-solid="false" role="img" aria-label="译者">译</span>
              </dt>
              <dd><CreditLinks credits={translators} showMarks={false} /></dd>
            </div>
          )}
          {post.originalTitle && <div><dt>原文题名</dt><dd>{post.originalTitle}</dd></div>}
          {(post.originalPublication || post.originalDate) && (
            <div><dt>原刊 / 日期</dt><dd>{[post.originalPublication, post.originalDate].filter(Boolean).join(" / ")}</dd></div>
          )}
        </dl>
      ) : (
        <p>{post.excerpt || "文章资料正在整理。"}</p>
      )}
    </aside>
  );
}

function Appendices({ parts }: { parts: ArticleParts }) {
  if (parts.noteCount === 0 && parts.sourceCount === 0) return null;
  return (
    <div className={`${styles.appendices} reading-prototype-appendix`}>
      {parts.noteCount > 0 && (
        <details open>
          <summary>
            <span>注释</span>
            <b>{String(parts.noteCount).padStart(2, "0")}</b>
          </summary>
          <div
            className={`art-body ${styles.appendixContent}`}
            dangerouslySetInnerHTML={{ __html: parts.notes }}
          />
        </details>
      )}
      {parts.sourceCount > 0 && (
        <details>
          <summary>
            <span>文献</span>
            <b>{String(parts.sourceCount).padStart(2, "0")}</b>
          </summary>
          <div
            className={`art-body ${styles.appendixContent}`}
            dangerouslySetInnerHTML={{ __html: parts.sources }}
          />
        </details>
      )}
    </div>
  );
}

function ArticleFlow({ parts }: { parts: ArticleParts }) {
  return (
    <div className={`${styles.articleFlow} reading-prototype-flow`}>
      <article
        className={`art-body ${styles.body} reading-prototype-body`}
        lang="zh-Hans"
        dangerouslySetInnerHTML={{ __html: parts.main }}
      />
      <div className={styles.endMark} aria-label="正文完">
        <span />
        <b>正文完</b>
        <i />
      </div>
      <Appendices parts={parts} />
    </div>
  );
}

function MobileInformation({ post }: { post: Post }) {
  return (
    <details className={styles.mobileInformation}>
      <summary>本文信息 <span>展开署名与资料</span></summary>
      <div className={styles.mobileInformationGrid}>
        <MetaRows post={post} />
        <SourceRecord post={post} />
      </div>
    </details>
  );
}

function relatedPostsFor(current: Post, posts: PostSummary[]): PostSummary[] {
  const currentTags = new Set(current.tags.map((tag) => tag.normalize("NFKC").trim()));

  return posts
    .filter((post) => post.slug !== current.slug)
    .map((post) => {
      const sharedTags = post.tags.filter((tag) => currentTags.has(tag.normalize("NFKC").trim())).length;
      const sameTheme = post.category === current.category;
      const sameSection = sectionFor(post) === sectionFor(current);

      // 标签最能表明材料的直接关联；主题分类与栏目补足没有共同标签的文章。
      return {
        post,
        score: sharedTags * 100 + Number(sameTheme) * 20 + Number(sameSection) * 8,
      };
    })
    .sort((a, b) => b.score - a.score || b.post.timestamp - a.post.timestamp || a.post.slug.localeCompare(b.post.slug))
    .slice(0, 3)
    .map(({ post }) => post);
}

function RelatedReading({
  current,
  posts,
  variant,
  isPublicEdition = false,
}: {
  current: Post;
  posts: PostSummary[];
  variant: ReadingVariant;
  isPublicEdition?: boolean;
}) {
  const candidates = relatedPostsFor(current, posts);

  return (
    <section className={homeStyles.latestUpdates} data-surface="paper" aria-labelledby="related-heading" data-reveal>
      <div className={homeStyles.latestInner}>
        <header className={homeStyles.latestHeading}>
          <div>
            <span>03</span>
            <h2 id="related-heading">相关推荐</h2>
          </div>
          <p>
            <Link href="/library" className={homeStyles.viewAll}>
              查看全部内容 <b aria-hidden="true">→</b>
            </Link>
          </p>
        </header>

        <ol className={homeStyles.latestGrid}>
          {candidates.map((post) => {
            const section = sectionMeta[sectionFor(post)];
            return (
              <li key={post.slug}>
                <article>
                  <Link
                    className={homeStyles.latestCard}
                    href={isPublicEdition ? postPath(post) : `/prototype/reading/${encodeURIComponent(post.slug)}?variant=${variant}`}
                  >
                    <header>
                      <span>文稿 {post.no}</span>
                      <span>{section.label}</span>
                    </header>
                    <h3>{post.title}</h3>
                    {(post.excerpt || post.subtitle) && <p>{post.excerpt || post.subtitle}</p>}
                    <footer>
                      <time dateTime={post.dateISO}>{post.dateDisplay}</time>
                      <span>预计阅读 {post.readMin} 分钟 <b aria-hidden="true">→</b></span>
                    </footer>
                  </Link>
                </article>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

export function ReadingDossier({
  post,
  parts,
  posts,
  isPublicEdition = false,
}: {
  post: Post;
  parts: ArticleParts;
  posts: PostSummary[];
  /** Render this selected dossier direction at the public /posts URL. */
  isPublicEdition?: boolean;
}) {
  const section = sectionMeta[sectionFor(post)];
  const hasReferences = parts.noteCount > 0 || parts.sourceCount > 0;
  const referenceLabel = parts.noteCount > 0 && parts.sourceCount > 0
    ? "注释与文献"
    : parts.noteCount > 0 ? "注释" : "文献";
  return (
    <main id="main" tabIndex={-1} className={`${isPublicEdition ? "reading-edition-page" : "reading-prototype-page"} ${styles.root} ${styles.dossierRoot}`} data-reading-variant="dossier" data-reveal-zone="reader">
      <ReadingPrototypeChrome
        title={post.title}
        slug={post.slug}
        variant="dossier"
        credits={post.credits}
        fallbackAuthor={post.author}
        mode={isPublicEdition ? "edition" : "preview"}
      />

      <header className={styles.dossierCover} id="reading-cover" data-reveal>
        <aside className={styles.docket}>
          <span className={styles.docketNumber}>{post.sectionNo}</span>
          <div><b>{section.label}</b></div>
          <i />
          <p>{site.brandCN}<br />文章<br />第 {post.no} 号</p>
        </aside>

        <div className={styles.coverStory}>
          <div className={styles.coverKicker}>
            <Link href={isPublicEdition ? "/" : "/prototype/poster"}>← 返回首页</Link>
            <span>{post.dateISO.replaceAll("-", ".")}</span>
            <span>{post.readMin} 分钟</span>
          </div>
          <h1 className="art-title">{post.title}</h1>
          {post.subtitle && <p className={styles.subtitle}>{post.subtitle}</p>}
          <p className={styles.dek}>{post.excerpt}</p>
          <p className={styles.byline}><CreditLine credits={displayCredits(post)} /></p>
          <div className={styles.tagLine}>{post.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>
        </div>

        <SourceRecord post={post} />
        <MobileInformation post={post} />
      </header>

      <section className={styles.dossierReading}>
        <aside id="reading-left-rail" className={styles.deskRailSlot} aria-label="署名、行数与文章目录" />
        <ArticleFlow parts={parts} />
        {hasReferences && (
          <aside id="reading-right-rail" className={styles.deskRailSlot} aria-label={referenceLabel} />
        )}
      </section>
      <RelatedReading current={post} posts={posts} variant="dossier" isPublicEdition={isPublicEdition} />
    </main>
  );
}

export function ReadingFolio({ post, parts, posts }: { post: Post; parts: ArticleParts; posts: PostSummary[] }) {
  const section = sectionMeta[sectionFor(post)];
  return (
    <main id="main" tabIndex={-1} className={`reading-prototype-page ${styles.root} ${styles.folioRoot}`} data-reading-variant="folio">
      <ReadingPrototypeChrome
        title={post.title}
        slug={post.slug}
        variant="folio"
        credits={post.credits}
        fallbackAuthor={post.author}
      />

      <header className={styles.folioCover} id="reading-cover">
        <div className={styles.folioMast}>
          <Link href="/prototype/triptych">{site.brandCN}</Link>
          <span>长文　{post.dateISO.replaceAll("-", ".")}</span>
        </div>
        <div className={styles.folioTitleBlock}>
          <span className={styles.folioIssue}>{post.sectionNo}</span>
          <p className={styles.folioSection}>{section.label}</p>
          <h1 className="art-title">{post.title}</h1>
          {post.subtitle && <p className={styles.subtitle}>{post.subtitle}</p>}
        </div>
        <div className={styles.folioLead}>
          <p>{post.excerpt}</p>
          <div><strong><CreditLine credits={displayCredits(post)} /></strong><span>约 {post.readMin} 分钟</span></div>
        </div>
        <MobileInformation post={post} />
      </header>

      <section className={styles.folioReading}>
        <aside className={styles.folioMargin}>
          <span className={styles.eyebrow}>阅读版</span>
          <p>{post.excerpt}</p>
          <MetaRows post={post} />
          <div className={styles.folioOrnament}>※</div>
        </aside>
        <ArticleFlow parts={parts} />
        <div className={styles.railPlaceholder} aria-hidden="true" />
      </section>
      <RelatedReading current={post} posts={posts} variant="folio" />
    </main>
  );
}
