import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { PUBLICATION_LABELS, type Credit, type Post, type PostSummary } from "@/lib/posts";
import type { PublicContentEntry } from "@/lib/public-content";
import type { TopicMembership } from "@/lib/topics";
import { site } from "@/lib/site";
import {
  EDITORIAL_SECTION_META,
  type EditorialSection,
} from "@/lib/editorial";
import ReadingEditionChrome from "@/app/components/reading-edition/ReadingEditionChrome";
import CreditLinks from "@/app/components/CreditLinks";
import styles from "@/app/components/reading-edition/reading-edition.module.css";
import { hanScriptLanguageTag, type HanScript } from "@/lib/han-script";
import LanguageSwitcher from "@/app/components/translation/LanguageSwitcher";
import ArticleMediaRuntime from "@/app/components/ArticleMediaRuntime";
import type { EditionLanguageLink } from "@/lib/translations";
import { countRenderedListItems, splitRenderedApparatus } from "@/lib/markdown";
import { isCompactTitleSegment } from "@/lib/title-layout";

const sectionFor = (post: PostSummary): EditorialSection => post.section;
const sectionMeta = EDITORIAL_SECTION_META;
const sectionLibraryHref = (section: EditorialSection) =>
  `/library?section=${encodeURIComponent(section)}`;
const tagLibraryHref = (tag: string) => `/library?tag=${encodeURIComponent(tag)}`;

export type ArticleParts = {
  main: string;
  notes: string;
  sources: string;
  noteCount: number;
  sourceCount: number;
};

function withTitleNote(footnotesHtml: string, titleNoteHtml: string): string {
  if (!titleNoteHtml) return footnotesHtml;
  const item = `<li id="title-note-0" class="title-note" data-reference-label="*">${titleNoteHtml}<a href="#article-title" data-footnote-backref aria-label="返回主标题">↑</a></li>`;
  if (footnotesHtml) return footnotesHtml.replace(/(<ol\b[^>]*>)/i, `$1${item}`);
  return `<section class="footnotes" data-footnotes><h2 class="sr-only" id="footnote-label">注释</h2><ol>${item}</ol></section>`;
}

export function splitArticle(html: string, titleNoteHtml = ""): ArticleParts {
  const parts = splitRenderedApparatus(html);
  const notes = withTitleNote(parts.notes, titleNoteHtml);
  return {
    main: parts.main,
    notes,
    sources: parts.sources,
    noteCount: countRenderedListItems(notes),
    sourceCount: countRenderedListItems(parts.sources),
  };
}

function displayCredits(post: Post): Credit[] {
  return post.credits;
}

const READER_TITLE_PUNCTUATION = new Map<string, "open" | "close">([
  ["\u201c", "open"],
  ["\u2018", "open"],
  ["\u300a", "open"],
  ["\u3008", "open"],
  ["\u300c", "open"],
  ["\u300e", "open"],
  ["\u201d", "close"],
  ["\u2019", "close"],
  ["\u300b", "close"],
  ["\u3009", "close"],
  ["\u300d", "close"],
  ["\u300f", "close"],
]);

const READER_TITLE_SEGMENTER = new Intl.Segmenter("zh-CN", { granularity: "word" });

function ReaderTitleGlyphs({ text, keyPrefix }: { text: string; keyPrefix: string }) {
  return Array.from(text).map((glyph, index) => {
    if (glyph === " ") {
      return (
        <Fragment key={`${keyPrefix}-space-${index}`}>
          {" "}<wbr />
        </Fragment>
      );
    }
    const side = READER_TITLE_PUNCTUATION.get(glyph);
    return side ? (
      <span
        data-reader-title-punctuation={side}
        key={`${keyPrefix}-${glyph}-${index}`}
      >
        {glyph}
      </span>
    ) : (
      <Fragment key={`${keyPrefix}-${glyph}-${index}`}>{glyph}</Fragment>
    );
  });
}

export function ReaderTitleText({ text }: { text: string }) {
  return Array.from(READER_TITLE_SEGMENTER.segment(text)).map((segment, index) => {
    const glyphs = (
      <ReaderTitleGlyphs text={segment.segment} keyPrefix={`segment-${index}`} />
    );
    return segment.isWordLike ? (
      <span className={styles.titleWord} data-reader-title-word key={`word-${index}`}>
        {glyphs}
      </span>
    ) : (
      <Fragment key={`separator-${index}`}>{glyphs}</Fragment>
    );
  });
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

function PreferredTitle({ post }: { post: PostSummary }) {
  return post.titleBreaks.map((segment, index) => {
    const compact = isCompactTitleSegment(segment);
    return (
      <Fragment key={`${segment}-${index}`}>
        <span
          className={`${styles.titleSegment}${compact ? ` ${styles.compactTitleSegment}` : ""}`}
          data-reader-title-segment
          data-reader-title-compact={compact ? "" : undefined}
        >
          <ReaderTitleText text={segment} />
        </span>
        {index < post.titleBreaks.length - 1 && <wbr />}
      </Fragment>
    );
  });
}

function Appendices({ parts }: { parts: ArticleParts }) {
  if (parts.noteCount === 0 && parts.sourceCount === 0) return null;
  return (
    <div className={`${styles.appendices} reading-edition-appendix`}>
      {parts.noteCount > 0 && (
        <details open>
          <summary>
            <span>注释</span>
            <b>{String(parts.noteCount).padStart(2, "0")}</b>
          </summary>
          <div
            className={`art-body ${styles.appendixContent}`}
            data-pagefind-body=""
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
            data-pagefind-body=""
            dangerouslySetInnerHTML={{ __html: parts.sources }}
          />
        </details>
      )}
    </div>
  );
}

export function ArticleFlow({
  parts,
  sourceScript,
  endLabel = "正文完",
  children,
}: {
  parts: ArticleParts;
  sourceScript: HanScript;
  endLabel?: string;
  children?: ReactNode;
}) {
  return (
    <div className={`${styles.articleFlow} reading-edition-flow`}>
      <article
        className={`art-body ${styles.body} reading-edition-body`}
        lang={hanScriptLanguageTag(sourceScript)}
        data-han-convert-lang
        data-pagefind-body=""
        dangerouslySetInnerHTML={{ __html: parts.main }}
      />
      <div className={styles.endMark} aria-label={endLabel}>
        <span />
        <b>{endLabel}</b>
        <i />
      </div>
      <Appendices parts={parts} />
      {children}
      <ArticleMediaRuntime />
    </div>
  );
}

export function ReadingDossierRoot({
  sourceScript,
  children,
}: {
  sourceScript: HanScript;
  children: ReactNode;
}) {
  return (
    <main
      id="main"
      tabIndex={-1}
      className={`reading-edition-page ${styles.root} ${styles.dossierRoot}`}
      data-reveal-zone="reader"
      data-han-convert-root="post"
      data-han-source-script={sourceScript}
      lang={hanScriptLanguageTag(sourceScript)}
    >
      {children}
    </main>
  );
}

export function DocketNumber({ value }: { value: string }) {
  return (
    <span className={styles.docketNumber} aria-label={value} data-reader-docket-number>
      {Array.from(value).map((digit, index) => (
        <span
          className={styles.docketDigit}
          data-roll={index % 2 === 0 ? "up" : "down"}
          aria-hidden="true"
          key={`${digit}-${index}`}
        >
          <span>{digit}</span>
        </span>
      ))}
    </span>
  );
}

export function DossierCover({
  sectionHref,
  sectionLabel,
  sectionNumber,
  className,
  children,
}: {
  sectionHref: string;
  sectionLabel: string;
  sectionNumber: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <header className={`${styles.dossierCover}${className ? ` ${className}` : ""}`} id="reading-cover">
      <aside className={styles.docket}>
        <Link
          className={`${styles.libraryFilterLink} ${styles.docketSectionLink}`}
          href={sectionHref}
          aria-label={`在文库中筛选栏目：${sectionLabel} ${sectionNumber}`}
        >
          <b>{sectionLabel}</b>
          <DocketNumber value={sectionNumber} />
        </Link>
        <i />
      </aside>

      <div className={styles.coverStory}>{children}</div>
    </header>
  );
}

export function DossierReading({
  parts,
  sourceScript,
  endLabel,
  leftRailLabel = "署名、行数与文章目录",
  children,
}: {
  parts: ArticleParts;
  sourceScript: HanScript;
  endLabel?: string;
  leftRailLabel?: string;
  children?: ReactNode;
}) {
  const hasReferences = parts.noteCount > 0 || parts.sourceCount > 0;
  const referenceLabel = parts.noteCount > 0 && parts.sourceCount > 0
    ? "注释与文献"
    : parts.noteCount > 0 ? "注释" : "文献";

  return (
    <section className={styles.dossierReading}>
      <aside id="reading-left-rail" className={styles.deskRailSlot} aria-label={leftRailLabel} />
      <ArticleFlow parts={parts} sourceScript={sourceScript} endLabel={endLabel}>
        {children}
      </ArticleFlow>
      {hasReferences && (
        <aside id="reading-right-rail" className={styles.deskRailSlot} aria-label={referenceLabel} />
      )}
    </section>
  );
}

function relatedPostsFor(current: Post, posts: PublicContentEntry[]): PublicContentEntry[] {
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

function RelatedReading({ current, posts }: {
  current: Post;
  posts: PublicContentEntry[];
}) {
  const candidates = relatedPostsFor(current, posts);

  return (
    <section className={styles.latestUpdates} data-surface="paper" aria-labelledby="related-heading" data-reveal>
      <div className={styles.latestInner}>
        <header className={styles.latestHeading}>
          <div>
            <h2 id="related-heading">相关推荐</h2>
          </div>
          <p>
            <Link href="/library" className={styles.viewAll}>
              查看全部内容 <b aria-hidden="true">→</b>
            </Link>
          </p>
        </header>

        <ol className={styles.latestGrid}>
          {candidates.map((post) => {
            const section = sectionMeta[sectionFor(post)];
            return (
              <li key={post.slug}>
                <article>
                  <Link
                    className={`${styles.latestCard} ${styles.latestCardInteractive}`}
                    href={post.href}
                  >
                    <header>
                      <span>文稿 {post.no}</span>
                      <span>{section.label}</span>
                    </header>
                    <h3>{post.title}</h3>
                    {(post.excerpt || post.subtitle) && <p>{post.excerpt || post.subtitle}</p>}
                    <footer>
                      <time dateTime={post.displayDateISO}>{post.displayDateDisplay}</time>
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
  topicMemberships = [],
  citationBibtex,
  citationHref,
  languageLinks = [],
}: {
  post: Post;
  parts: ArticleParts;
  posts: PublicContentEntry[];
  topicMemberships?: TopicMembership[];
  citationBibtex?: string;
  citationHref?: string;
  languageLinks?: EditionLanguageLink[];
}) {
  const section = sectionMeta[sectionFor(post)];
  return (
    <ReadingDossierRoot sourceScript={post.script}>
      <ReadingEditionChrome
        title={post.title}
        slug={post.slug}
        contentRevision={post.contentRevision}
        sourceScript={post.script}
        credits={post.credits}
        fallbackAuthor={post.author}
        citationBibtex={citationBibtex}
        citationHref={citationHref}
      />

      <DossierCover
        sectionHref={sectionLibraryHref(sectionFor(post))}
        sectionLabel={section.label}
        sectionNumber={post.sectionNo}
      >
          <div
            className={`${styles.coverLeadMeta} ${
              topicMemberships.length > 0 ? styles.coverLeadMetaWithTopics : ""
            }`}
          >
            <div className={styles.coverKicker}>
              <Link href="/">← 返回首页</Link>
              <span>第 {post.no} 号</span>
              <time
                dateTime={post.displayDateISO}
                title={post.section === "negative" ? "原文写作日期" : "博客发布日期"}
              >
                {post.displayDateISO.replaceAll("-", ".")}
              </time>
              <span>{post.readMin} 分钟</span>
              {post.publicationLabel && (
                <span
                  className={styles.coverPublicationLabel}
                  title={`文章版本：${PUBLICATION_LABELS[post.publicationLabel]}`}
                >
                  {PUBLICATION_LABELS[post.publicationLabel]}
                </span>
              )}
            </div>
            {languageLinks.length > 0 && (
              <div className={styles.coverLanguages}>
                <LanguageSwitcher
                  current={hanScriptLanguageTag(post.script)}
                  links={languageLinks}
                />
              </div>
            )}
            {topicMemberships.length > 0 && (
              <nav className={styles.coverTopics} aria-label="所属专题">
                <span className={styles.coverTopicEyebrow}>专题</span>
                {topicMemberships.map((membership) => (
                  <Link
                    className={`${styles.libraryFilterLink} ${styles.coverTopicLink}`}
                    href={membership.href}
                    key={`${membership.href}:${membership.groupNumber}`}
                  >
                    <b>{membership.title}</b>
                    <span>{membership.groupNumber}</span>
                  </Link>
                ))}
              </nav>
            )}
          </div>
          <h1 id="article-title" className="art-title" data-pagefind-meta="title">
            <PreferredTitle post={post} />
            {post.titleNote && (
              <sup className={styles.titleNoteRef}>
                <a href="#title-note-0" aria-label="标题注释">*</a>
              </sup>
            )}
          </h1>
          {post.subtitle && <p className={styles.subtitle}>{post.subtitle}</p>}
          <p className={styles.dek}>{post.excerpt}</p>
          <p className={styles.byline}>
            <CreditLine credits={displayCredits(post)} />
            <span className="sr-only" data-pagefind-meta="credits">
              {post.credits.map((credit) => `${credit.mark} ${credit.name}`).join(" · ")}
            </span>
          </p>
          {post.tags.length > 0 && (
            <nav className={styles.tagLine} aria-label="按标签筛选文库" data-pagefind-meta="tags">
              {post.tags.map((tag) => (
                <Link
                  className={styles.libraryFilterLink}
                  href={tagLibraryHref(tag)}
                  aria-label={`在文库中筛选标签：${tag}`}
                  key={tag}
                >
                  #{tag}
                </Link>
              ))}
            </nav>
          )}
      </DossierCover>

      <DossierReading parts={parts} sourceScript={post.script}>
        <p className={styles.rightsNotice}>{site.rightsNotice}</p>
      </DossierReading>
      <RelatedReading current={post} posts={posts} />
    </ReadingDossierRoot>
  );
}
