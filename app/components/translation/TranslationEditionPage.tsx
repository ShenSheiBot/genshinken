import Link from "next/link";
import { Fragment } from "react";
import type {
  EditionLanguageLink,
  TranslationEdition,
  TranslationLocale,
  TranslationSource,
} from "@/lib/translations";
import type { RenderedApparatusParts } from "@/lib/markdown";
import type { TopicMembership } from "@/lib/topics";
import { splitRenderedApparatus } from "@/lib/markdown";
import { isCompactTitleSegment } from "@/lib/title-layout";
import LanguageSwitcher from "./LanguageSwitcher";
import TranslationDocumentIndex from "./TranslationDocumentIndex";
import TranslationReferences from "./TranslationReferences";
import ArticleMediaRuntime from "@/app/components/ArticleMediaRuntime";
import ArticleLinkPreviewRuntime from "@/app/components/ArticleLinkPreviewRuntime";
import { translationReferenceUi } from "./translationUi";
import styles from "./translation-edition.module.css";

const ui = {
  en: {
    brand: "Lab on Roof",
    edition: "English edition",
    original: "Chinese original",
    author: "Author",
    interviewee: "Interviewee",
    interviewer: "Interviewer",
    participant: "Participant",
    speaker: "Speaker",
    sourceTranslator: "Chinese edition translation",
    sourceProofreader: "Chinese edition review",
    sourceEditor: "Chinese edition editing",
    translation: "Translation",
    translator: "Translation",
    reviewer: "Review",
    proofreader: "Proofreading",
    editor: "Editing",
    preview: "Editorial preview",
    topic: "Topic",
    min: "min read",
    end: "End",
    rights: "Rights",
    source: "Read the Chinese edition",
    cite: "Cite this edition",
    contents: "Contents",
    notes: translationReferenceUi.en.notes,
    sources: translationReferenceUi.en.sources,
    footer: "Criticism, translation, and visual culture from Lab on Roof.",
  },
  ja: {
    brand: "屋頂現視研",
    edition: "日本語版",
    original: "中国語原文",
    author: "著者",
    interviewee: "インタビュイー",
    interviewer: "聞き手",
    participant: "参加者",
    speaker: "登壇者",
    sourceTranslator: "中国語版翻訳",
    sourceProofreader: "中国語版校閲",
    sourceEditor: "中国語版編集",
    translation: "翻訳",
    translator: "翻訳",
    reviewer: "レビュー",
    proofreader: "校閲",
    editor: "編集",
    preview: "編集プレビュー",
    topic: "特集",
    min: "分で読了",
    end: "本文終わり",
    rights: "ライセンス",
    source: "中国語版を読む",
    cite: "この版を引用",
    contents: "目次",
    notes: translationReferenceUi.ja.notes,
    sources: translationReferenceUi.ja.sources,
    footer: "屋頂現視研による批評・翻訳・視覚文化のアーカイブ。",
  },
} as const;

const sectionLabels = {
  en: {
    essay: "Essay",
    review: "Review",
    translation: "Translation",
    interview: "Interview",
    community: "Community",
    multimedia: "Media",
    negative: "Archive",
  },
  ja: {
    essay: "論考",
    review: "評論",
    translation: "翻訳",
    interview: "インタビュー",
    community: "コミュニティ",
    multimedia: "メディア",
    negative: "アーカイブ",
  },
} as const;

const visibleCreatorRoles = new Set([
  "author",
  "interviewee",
  "interviewer",
  "participant",
  "speaker",
]);

export type TranslationChapterNavigation = {
  bookHref: string;
  bookTitle: string;
  previous?: { href: string; number: string; title: string; translated: boolean };
  next?: { href: string; number: string; title: string; translated: boolean };
};

function TranslationAppendices({
  locale,
  parts,
  noteCount,
  sourceCount,
}: {
  locale: TranslationLocale;
  parts: RenderedApparatusParts;
  noteCount: number;
  sourceCount: number;
}) {
  const labels = ui[locale];
  if (!parts.notes && !parts.sources) return null;
  return (
    <div className={styles.translationAppendices} data-translation-appendices>
      {parts.notes && (
        <details open>
          <summary><span>{labels.notes}</span><b>{String(noteCount).padStart(2, "0")}</b></summary>
          <div className={`art-body ${styles.translationAppendixContent}`} dangerouslySetInnerHTML={{ __html: parts.notes }} />
        </details>
      )}
      {parts.sources && (
        <details>
          <summary><span>{labels.sources}</span><b>{String(sourceCount).padStart(2, "0")}</b></summary>
          <div className={`art-body ${styles.translationAppendixContent}`} dangerouslySetInnerHTML={{ __html: parts.sources }} />
        </details>
      )}
    </div>
  );
}

export default function TranslationEditionPage({
  locale,
  source,
  edition,
  links,
  topicMemberships = [],
  chapterNavigation,
}: {
  locale: TranslationLocale;
  source: TranslationSource;
  edition: TranslationEdition;
  links: EditionLanguageLink[];
  topicMemberships?: TopicMembership[];
  chapterNavigation?: TranslationChapterNavigation;
}) {
  const labels = ui[locale];
  const creators = source.credits.filter((credit) => visibleCreatorRoles.has(credit.role));
  const sourceEditionCredits = source.credits.filter((credit) =>
    credit.role === "translator" || credit.role === "proofreader" || credit.role === "editor"
  );
  const sourceHref = source.href;
  const parts = splitRenderedApparatus(edition.html);
  const hasReferences = Boolean(parts.notes || parts.sources);

  return (
    <main
      id="main"
      tabIndex={-1}
      className={`translation-edition-page ${styles.page}`}
      lang={locale}
      data-reveal-zone="translation"
    >
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label={labels.brand}>
          <i aria-hidden="true" />
          <span>{labels.brand}</span>
        </Link>
        <span className={styles.headerContext}>{labels.edition}</span>
        <LanguageSwitcher current={locale} links={links} />
      </header>

      <section className={styles.cover} aria-labelledby="translated-title" data-translation-cover>
        <aside className={styles.docket}>
          <strong>{sectionLabels[locale][source.section]}</strong>
          <b>{source.chapter?.number ?? source.sectionNo}</b>
          <small>
            {source.displayDateISO}<br />
            {edition.readMin} {labels.min}
          </small>
        </aside>
        <div className={styles.coverStory}>
          {source.book && source.chapter && chapterNavigation && (
            <p className={styles.bookContext}>
              <Link href={chapterNavigation.bookHref}>{chapterNavigation.bookTitle}</Link>
              <span aria-hidden="true"> · </span>{source.chapter.number}
            </p>
          )}
          <div className={`${styles.coverMeta}${topicMemberships.length > 0 ? ` ${styles.coverMetaWithTopics}` : ""}`}>
            <Link href={sourceHref} hrefLang={source.script === "hant" ? "zh-Hant" : "zh-Hans"}>
              ← {labels.original}
            </Link>
            <a href="#translation-document-index">{labels.contents} ↓</a>
            {edition.status !== "published" && (
              <span className={styles.previewBadge}>{labels.preview}</span>
            )}
          </div>
          {topicMemberships.length > 0 && (
            <nav className={styles.topicMemberships} aria-label={labels.topic}>
              <span>{labels.topic}</span>
              {topicMemberships.map((membership) => (
                <Link
                  href={membership.href}
                  key={`${membership.href}:${membership.groupNumber}`}
                >
                  <b>{membership.title}</b>
                  <small>{membership.groupNumber}</small>
                </Link>
              ))}
            </nav>
          )}
          <h1 id="translated-title">
            {edition.titleBreaks.map((segment, index) => {
              const compact = isCompactTitleSegment(segment);
              return (
                <Fragment key={`${segment}-${index}`}>
                  <span
                    className={`${styles.titleSegment}${compact ? ` ${styles.compactTitleSegment}` : ""}`}
                    data-reader-title-compact={compact ? "" : undefined}
                  >{segment}</span>
                  {index < edition.titleBreaks.length - 1 && (
                    <>{locale === "en" ? " " : ""}<wbr /></>
                  )}
                </Fragment>
              );
            })}
          </h1>
          {edition.subtitle && <p className={styles.subtitle}>{edition.subtitle}</p>}
          <p className={styles.excerpt}>{edition.excerpt}</p>
          <p className={styles.credits}>
            {creators.map((credit) => (
              <span key={`${credit.role}:${credit.contributorId}`} lang={source.language}>
                {labels[credit.role as keyof typeof labels] ?? labels.author}: <b>{credit.name}</b>
              </span>
            ))}
            {sourceEditionCredits.map((credit) => (
              <span key={`source:${credit.role}:${credit.contributorId}`} lang={source.language}>
                {credit.role === "translator"
                  ? labels.sourceTranslator
                  : credit.role === "proofreader" ? labels.sourceProofreader : labels.sourceEditor}: <b>{credit.name}</b>
              </span>
            ))}
            {edition.credits.map((credit) => (
              <span key={`${credit.role}:${credit.contributorId}:${credit.scope}`}>
                {labels[credit.role]}: <b>{credit.name}</b>
                {credit.disclosure && <em className={styles.creditDisclosure}>[{credit.disclosure}]</em>}
                {credit.scope && <small> · {credit.scope}</small>}
                {credit.note && <small> · {credit.note}</small>}
              </span>
            ))}
          </p>
        </div>
      </section>

      <section className={`${styles.reading} ${hasReferences ? styles.readingWithReferences : ""}`}>
        <aside className={styles.readingAside}>
          <TranslationDocumentIndex locale={locale} index={edition.documentIndex} />
          <div className={styles.asideActions}>
            {edition.rights && <p>{labels.rights}: {edition.rights}</p>}
            <Link href={sourceHref} hrefLang={source.script === "hant" ? "zh-Hant" : "zh-Hans"}>
              {labels.source} →
            </Link>
            <Link href={`${edition.href}/cite.bib`}>
              {labels.cite} →
            </Link>
          </div>
        </aside>
        <div className={styles.body}>
          <article
            className="art-body"
            lang={locale}
            data-translation-body
            dangerouslySetInnerHTML={{ __html: parts.main }}
          />
          <div className={styles.endMark} aria-label={labels.end}>
            <i /><b>{labels.end}</b><i />
          </div>
          <TranslationAppendices
            locale={locale}
            parts={parts}
            noteCount={edition.documentIndex.noteCount}
            sourceCount={edition.documentIndex.sourceCount}
          />
          {chapterNavigation && (chapterNavigation.previous || chapterNavigation.next) && (
            <nav className={styles.chapterNavigation} aria-label={locale === "en" ? "Chapter navigation" : "章ナビゲーション"}>
              {chapterNavigation.previous ? (
                <Link href={chapterNavigation.previous.href} rel="prev">
                  <small>{locale === "en" ? "Previous" : "前の章"} · {chapterNavigation.previous.number}</small>
                  <strong lang={chapterNavigation.previous.translated ? locale : source.language}>
                    {chapterNavigation.previous.title}
                  </strong>
                </Link>
              ) : <span />}
              {chapterNavigation.next ? (
                <Link href={chapterNavigation.next.href} rel="next">
                  <small>{locale === "en" ? "Next" : "次の章"} · {chapterNavigation.next.number}</small>
                  <strong lang={chapterNavigation.next.translated ? locale : source.language}>
                    {chapterNavigation.next.title}
                  </strong>
                </Link>
              ) : <span />}
            </nav>
          )}
          <ArticleMediaRuntime />
          <ArticleLinkPreviewRuntime />
        </div>
        {hasReferences && (
          <aside
            className={styles.referenceAside}
            data-translation-reference-rail
            aria-label={parts.notes && parts.sources ? `${labels.notes} / ${labels.sources}` : parts.sources ? labels.sources : labels.notes}
          >
            <TranslationReferences locale={locale} contentRevision={edition.contentRevision} />
          </aside>
        )}
      </section>

      <footer className={styles.footer}>
        <b>{labels.brand}</b>
        <span>{labels.footer}</span>
      </footer>
    </main>
  );
}
