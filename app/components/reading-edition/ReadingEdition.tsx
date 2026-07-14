import Link from "next/link";
import type { Credit, Post, PostSummary } from "@/lib/posts";
import { site } from "@/lib/site";
import {
  EDITORIAL_SECTION_META,
  postPath,
  type EditorialSection,
} from "@/lib/editorial";
import ReadingPrototypeChrome from "@/app/prototype/reading/[slug]/ReadingPrototypeChrome";
import styles from "@/app/prototype/reading/[slug]/reading-prototype.module.css";

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
  if (post.credits.length > 0) return post.credits;
  return [{ mark: "作", name: post.author || `${site.brandCN}编辑部`, solid: true }];
}

function withCjkInterpuncts(value: string) {
  return value.split(/([·・])/u).map((part, index) => (
    part === "·" || part === "・"
      ? <span className="cjk-interpunct" key={`${part}-${index}`}>{part}</span>
      : part
  ));
}

/** Keep the editorial role marks visible in every reading-cover direction. */
function CreditLine({ credits }: { credits: Credit[] }) {
  return (
    <span className={styles.creditLine}>
      {credits.map((credit, index) => (
        <span className={styles.credit} key={`${credit.mark}-${credit.name}-${index}`}>
          <span className={styles.creditMark} data-solid={credit.solid ? "true" : "false"}>
            {credit.mark}
          </span>
          <span>{withCjkInterpuncts(credit.name)}</span>
        </span>
      ))}
    </span>
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
              <span className={styles.creditMark} data-solid={credit.solid ? "true" : "false"}>{credit.mark}</span>
              {credit.mark === "作" ? "作者" : credit.mark === "译" ? "译者" : credit.mark === "编" ? "编辑" : "校对"}
            </span>
          </dt>
          <dd>{withCjkInterpuncts(credit.name)}</dd>
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
  const originalAuthor = post.author || post.credits.find((credit) => credit.mark === "作")?.name;
  const translator = post.credits.find((credit) => credit.mark === "译")?.name;
  return (
    <aside className={styles.sourceRecord} aria-label={translated ? "原文资料" : "文章提要"}>
      <span className={styles.eyebrow}>{translated ? "原文资料" : "本文提要"}</span>
      {translated ? (
        <dl>
          {originalAuthor && <div><dt>原作者</dt><dd>{withCjkInterpuncts(originalAuthor)}</dd></div>}
          {translator && <div><dt>译者</dt><dd>{withCjkInterpuncts(translator)}</dd></div>}
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
  if (!parts.notes && !parts.sources) return null;
  return (
    <div className={`${styles.appendices} reading-prototype-appendix`}>
      {parts.notes && (
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
      {parts.sources && (
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
      <summary>本文信息 <span>展开档案＋原文资料</span></summary>
      <div className={styles.mobileInformationGrid}>
        <MetaRows post={post} />
        <SourceRecord post={post} />
      </div>
    </details>
  );
}

function ContinueReading({
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
  const currentSection = sectionFor(current);
  const candidates = [
    ...posts.filter((post) => post.slug !== current.slug && sectionFor(post) === currentSection),
    ...posts.filter((post) => post.slug !== current.slug && sectionFor(post) !== currentSection),
  ].filter((post, index, list) => list.findIndex((item) => item.slug === post.slug) === index).slice(0, 2);

  return (
    <section className={styles.continue} aria-labelledby="continue-heading">
      <header>
        <h2 id="continue-heading">继续阅读</h2>
      </header>
      <div className={styles.continueGrid}>
        {candidates.map((post, index) => (
          <Link
            key={post.slug}
            href={isPublicEdition ? postPath(post) : `/prototype/reading/${encodeURIComponent(post.slug)}?variant=${variant}`}
          >
            <small>{String(index + 1).padStart(2, "0")} / {sectionMeta[sectionFor(post)].label}</small>
            <strong>{post.title}</strong>
            <span>{post.readMin} 分钟　→</span>
          </Link>
        ))}
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
  return (
    <main className={`${isPublicEdition ? "reading-edition-page" : "reading-prototype-page"} ${styles.root} ${styles.dossierRoot}`} data-reading-variant="dossier">
      <ReadingPrototypeChrome
        title={post.title}
        slug={post.slug}
        readMin={post.readMin}
        variant="dossier"
        credits={post.credits}
        fallbackAuthor={post.author}
        mode={isPublicEdition ? "edition" : "preview"}
      />

      <header className={styles.dossierCover} id="reading-cover">
        <aside className={styles.docket}>
          <span className={styles.docketNumber}>{section.number}</span>
          <div><b>{section.label}</b></div>
          <i />
          <p>{site.brandCN}<br />文章档案<br />第 {post.no} 号</p>
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
        <aside id="reading-right-rail" className={styles.deskRailSlot} aria-label="注释与文献" />
      </section>
      <ContinueReading current={post} posts={posts} variant="dossier" isPublicEdition={isPublicEdition} />
    </main>
  );
}

export function ReadingFolio({ post, parts, posts }: { post: Post; parts: ArticleParts; posts: PostSummary[] }) {
  const section = sectionMeta[sectionFor(post)];
  return (
    <main className={`reading-prototype-page ${styles.root} ${styles.folioRoot}`} data-reading-variant="folio">
      <ReadingPrototypeChrome
        title={post.title}
        slug={post.slug}
        readMin={post.readMin}
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
          <span className={styles.folioIssue}>{section.number}</span>
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
      <ContinueReading current={post} posts={posts} variant="folio" />
    </main>
  );
}
