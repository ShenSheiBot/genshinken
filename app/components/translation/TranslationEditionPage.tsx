import Link from "next/link";
import type { CSSProperties } from "react";
import {
  translationCitation,
  type EditionLanguageLink,
  type TranslationEdition,
  type TranslationLocale,
  type TranslationSource,
} from "@/lib/translations";
import type { TopicMembership } from "@/lib/topics";
import { citationToBibtex } from "@/lib/citations";
import { countRenderedListItems, splitRenderedApparatus } from "@/lib/markdown";
import { isCompactTitleSegment, longestTitleSegmentWidthEm } from "@/lib/title-layout";
import { site } from "@/lib/site";
import { CREDIT_ROLE_META } from "@/lib/credit-roles";
import type { CreditLinkItem } from "@/app/components/CreditLinks";
import {
  DossierCover,
  DossierReading,
  ReaderTitleText,
  ReadingDossierRoot,
  type ArticleParts,
} from "@/app/components/reading-edition/ReadingEdition";
import ReadingEditionChrome from "@/app/components/reading-edition/ReadingEditionChrome";
import { READING_UI } from "@/app/components/reading-edition/reading-edition-ui";
import readerStyles from "@/app/components/reading-edition/reading-edition.module.css";
import LanguageSwitcher from "./LanguageSwitcher";
import styles from "./translation-edition.module.css";

const ui = {
  en: {
    original: "Chinese original", author: "Author", interviewee: "Interviewee",
    interviewer: "Interviewer", participant: "Participant", speaker: "Speaker",
    sourceTranslator: "Chinese edition translation", sourceProofreader: "Chinese edition review",
    sourceEditor: "Chinese edition editing", translator: "Translation", reviewer: "Review",
    proofreader: "Proofreading", editor: "Editing", preview: "Editorial preview", topic: "Topic",
    min: "min read", end: "End", rights: "Rights", notes: "Notes", sources: "Sources",
    rails: "Credits, reading progress and article contents", chapterNavigation: "Chapter navigation",
    previous: "Previous", next: "Next",
  },
  ja: {
    original: "中国語原文", author: "著者", interviewee: "インタビュイー", interviewer: "聞き手",
    participant: "参加者", speaker: "登壇者", sourceTranslator: "中国語版翻訳",
    sourceProofreader: "中国語版校閲", sourceEditor: "中国語版編集", translator: "翻訳",
    reviewer: "レビュー", proofreader: "校閲", editor: "編集", preview: "編集プレビュー",
    topic: "特集", min: "分で読了", end: "本文終わり", rights: "ライセンス", notes: "注",
    sources: "文献", rails: "クレジット、読書の進捗、記事目次", chapterNavigation: "章ナビゲーション",
    previous: "前の章", next: "次の章",
  },
} as const;

function readerTitleFitStyle(segments: string[]): CSSProperties {
  return {
    "--reader-title-longest-em": longestTitleSegmentWidthEm(segments).toFixed(2),
  } as CSSProperties;
}

const sectionLabels = {
  en: { essay: "Essay", review: "Review", translation: "Translation", interview: "Interview", community: "Community", multimedia: "Media", negative: "Archive" },
  ja: { essay: "論考", review: "評論", translation: "翻訳", interview: "インタビュー", community: "コミュニティ", multimedia: "メディア", negative: "アーカイブ" },
} as const;

const visibleCreatorRoles = new Set(["author", "interviewee", "interviewer", "participant", "speaker"]);

export type TranslationChapterNavigation = {
  bookHref: string;
  bookTitle: string;
  previous?: { href: string; number: string; title: string; translated: boolean };
  next?: { href: string; number: string; title: string; translated: boolean };
};

export default function TranslationEditionPage({
  locale, source, edition, links, topicMemberships = [], chapterNavigation,
}: {
  locale: TranslationLocale;
  source: TranslationSource;
  edition: TranslationEdition;
  links: EditionLanguageLink[];
  topicMemberships?: TopicMembership[];
  chapterNavigation?: TranslationChapterNavigation;
}) {
  const labels = ui[locale];
  const readerUi = READING_UI[locale];
  const creators = source.credits.filter((credit) => visibleCreatorRoles.has(credit.role));
  const sourceEditionCredits = source.credits.filter((credit) =>
    credit.role === "translator" || credit.role === "proofreader" || credit.role === "editor"
  );
  const rendered = splitRenderedApparatus(edition.html);
  const parts: ArticleParts = {
    main: rendered.main,
    notes: rendered.notes,
    sources: rendered.sources,
    noteCount: countRenderedListItems(rendered.notes),
    sourceCount: countRenderedListItems(rendered.sources),
  };
  const citationBibtex = citationToBibtex(translationCitation(source, edition));
  const fallbackAuthor = creators.map((credit) => credit.name).join(" · ");
  const chromeCredits: CreditLinkItem[] = [
    ...source.credits.map((credit) => ({
      ...credit,
      mark: readerUi.roleMarks[credit.role],
      roleLabel: credit.role === "translator"
        ? labels.sourceTranslator
        : credit.role === "proofreader"
          ? labels.sourceProofreader
          : credit.role === "editor"
            ? labels.sourceEditor
            : labels[credit.role as keyof typeof labels] ?? labels.author,
    })),
    ...edition.credits.map((credit) => {
      const meta = credit.role === "reviewer"
        ? { solid: false }
        : CREDIT_ROLE_META[credit.role];
      return {
        role: credit.role,
        contributorId: credit.contributorId,
        name: credit.name,
        mark: readerUi.roleMarks[credit.role],
        solid: meta.solid,
        roleLabel: labels[credit.role],
      };
    }),
  ].filter((credit, index, all) =>
    all.findIndex((candidate) =>
      candidate.role === credit.role
      && candidate.contributorId === credit.contributorId
      && candidate.roleLabel === credit.roleLabel
    ) === index
  );

  return (
    <ReadingDossierRoot language={locale} className={styles.page}>
      <ReadingEditionChrome
        title={edition.title}
        slug={`${edition.slug}-${locale}`}
        contentRevision={edition.contentRevision}
        sourceScript={source.script}
        hanConversionEnabled={false}
        uiLocale={locale}
        credits={chromeCredits}
        fallbackAuthor={fallbackAuthor}
        citationBibtex={citationBibtex}
        citationHref={`${edition.href}/cite.bib`}
      />

      <DossierCover
        sectionHref={`/library?section=${encodeURIComponent(source.section)}`}
        sectionLabel={sectionLabels[locale][source.section]}
        sectionNumber={source.chapter?.number ?? source.sectionNo}
        uiLocale={locale}
      >
        {source.book && source.chapter && chapterNavigation && (
          <p className={styles.bookContext}>
            <Link href={chapterNavigation.bookHref}>{chapterNavigation.bookTitle}</Link>
            <span aria-hidden="true"> · </span>{source.chapter.number}
          </p>
        )}
        <div className={`${readerStyles.coverLeadMeta} ${topicMemberships.length > 0 ? readerStyles.coverLeadMetaWithTopics : ""}`}>
          <div className={readerStyles.coverKicker}>
            <Link href={source.href} hrefLang={source.script === "hant" ? "zh-Hant" : "zh-Hans"}>← {labels.original}</Link>
            <time dateTime={source.displayDateISO}>{source.displayDateISO.replaceAll("-", ".")}</time>
            <span>{edition.readMin} {labels.min}</span>
            {edition.status !== "published" && <span className={styles.previewBadge}>{labels.preview}</span>}
          </div>
          <div className={readerStyles.coverLanguages}>
            <LanguageSwitcher current={locale} links={links} />
          </div>
          {topicMemberships.length > 0 && (
            <nav className={readerStyles.coverTopics} aria-label={labels.topic}>
              <span className={readerStyles.coverTopicEyebrow}>{labels.topic}</span>
              {topicMemberships.map((membership) => (
                <Link
                  className={`${readerStyles.libraryFilterLink} ${readerStyles.coverTopicLink}`}
                  href={membership.href}
                  key={`${membership.href}:${membership.groupNumber}`}
                >
                  <b>{membership.title}</b><span>{membership.groupNumber}</span>
                </Link>
              ))}
            </nav>
          )}
        </div>
        <h1
          id="article-title"
          className="art-title"
          data-pagefind-meta="title"
          data-reader-title-fixed={edition.titleBreaksExplicit ? "" : undefined}
          style={edition.titleBreaksExplicit ? readerTitleFitStyle(edition.titleBreaks) : undefined}
        >
          {edition.titleBreaksExplicit ? edition.titleBreaks.map((segment, index) => {
            const compact = isCompactTitleSegment(segment);
            return (
              <span
                className={`${readerStyles.titleSegment}${compact ? ` ${readerStyles.compactTitleSegment}` : ""}`}
                data-reader-title-segment
                data-reader-title-compact={compact ? "" : undefined}
                key={`${segment}-${index}`}
              >
                <ReaderTitleText text={segment} locale={locale} />
                {locale === "en" && index < edition.titleBreaks.length - 1 ? " " : null}
              </span>
            );
          }) : (
            <span data-reader-title-segment>
              <ReaderTitleText text={edition.title} locale={locale} />
            </span>
          )}
        </h1>
        {edition.subtitle && <p className={readerStyles.subtitle}>{edition.subtitle}</p>}
        <p className={readerStyles.dek}>{edition.excerpt}</p>
        <p className={styles.credits}>
          {creators.map((credit) => (
            <span key={`${credit.role}:${credit.contributorId}`} lang={source.language}>
              {labels[credit.role as keyof typeof labels] ?? labels.author}: <b>{credit.name}</b>
            </span>
          ))}
          {sourceEditionCredits.map((credit) => (
            <span key={`source:${credit.role}:${credit.contributorId}`} lang={source.language}>
              {credit.role === "translator" ? labels.sourceTranslator : credit.role === "proofreader" ? labels.sourceProofreader : labels.sourceEditor}: <b>{credit.name}</b>
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
      </DossierCover>

      <DossierReading
        parts={parts}
        language={locale}
        endLabel={labels.end}
        leftRailLabel={labels.rails}
        referenceLabel={`${labels.notes} / ${labels.sources}`}
        noteLabel={labels.notes}
        sourceLabel={labels.sources}
        bodyClassName={styles.localizedBody}
      >
        {chapterNavigation && (chapterNavigation.previous || chapterNavigation.next) && (
          <nav className={styles.chapterNavigation} aria-label={labels.chapterNavigation}>
            {chapterNavigation.previous ? (
              <Link href={chapterNavigation.previous.href} rel="prev">
                <small>{labels.previous} · {chapterNavigation.previous.number}</small>
                <strong lang={chapterNavigation.previous.translated ? locale : source.language}>{chapterNavigation.previous.title}</strong>
              </Link>
            ) : <span />}
            {chapterNavigation.next ? (
              <Link href={chapterNavigation.next.href} rel="next">
                <small>{labels.next} · {chapterNavigation.next.number}</small>
                <strong lang={chapterNavigation.next.translated ? locale : source.language}>{chapterNavigation.next.title}</strong>
              </Link>
            ) : <span />}
          </nav>
        )}
        {edition.rights && <p className={styles.editionRights}>{labels.rights}: {edition.rights}</p>}
        <p className={readerStyles.rightsNotice}>{site.rightsNotice[locale]}</p>
      </DossierReading>
    </ReadingDossierRoot>
  );
}
