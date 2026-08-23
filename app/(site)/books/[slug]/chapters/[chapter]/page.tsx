import type { Metadata } from "next";
import Link from "next/link";
import { Fragment } from "react";
import { notFound } from "next/navigation";
import {
  bookChapterHref,
  bookHref,
  getAllBooks,
  getBookBySlug,
  getBookChapter,
  getBookChapterCitation,
  getBookChapterCredits,
  getBookChapterDocuments,
  getPublishedBookChapters,
  isPublishedBookChapter,
  type Book,
  type BookChapter,
  type BookChapterDocument,
  type PublishedBookChapter,
} from "@/lib/books";
import { site } from "@/lib/site";
import {
  citationToBibtex,
  citationToJsonLd,
  citationToMetadata,
} from "@/lib/citations";
import { EDITORIAL_SECTION_META } from "@/lib/editorial";
import { getBookPublicContent } from "@/lib/public-content";
import { hanScriptLanguageTag } from "@/lib/han-script";
import { isCompactTitleSegment } from "@/lib/title-layout";
import {
  getEditionLanguageLinks,
  getPublishedTranslationEditions,
  resolveTranslationSource,
} from "@/lib/translations";
import CreditLinks from "@/app/components/CreditLinks";
import LanguageSwitcher from "@/app/components/translation/LanguageSwitcher";
import ReadingEditionChrome, {
  type ReadingBookToc,
  type ReadingBookTocItem,
} from "@/app/components/reading-edition/ReadingEditionChrome";
import {
  DossierCover,
  DossierReading,
  ReaderTitleText,
  ReadingDossierRoot,
  splitArticle,
} from "@/app/components/reading-edition/ReadingEdition";
import readerStyles from "@/app/components/reading-edition/reading-edition.module.css";
import bookStyles from "../../../books.module.css";

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllBooks().flatMap((book) =>
    getPublishedBookChapters(book).map((chapter) => ({ slug: book.slug, chapter: chapter.id }))
  );
}

function resolvePublishedChapter(book: Book, chapterParam: string): PublishedBookChapter | null {
  const chapter = getBookChapter(book, decodeURIComponent(chapterParam));
  return chapter && isPublishedBookChapter(chapter) ? chapter : null;
}

const tagLibraryHref = (tag: string) => `/library?tag=${encodeURIComponent(tag)}`;

function readingBookTocItem(
  book: Book,
  chapter: BookChapter,
  currentChapterId: string,
  documents: ReadonlyMap<string, BookChapterDocument>
): ReadingBookTocItem {
  const href = isPublishedBookChapter(chapter) ? bookChapterHref(book, chapter) : null;
  const document = documents.get(chapter.id);
  return {
    id: chapter.id,
    number: chapter.number,
    title: chapter.title,
    status: chapter.status,
    href,
    current: chapter.id === currentChapterId,
    sections: [
      ...(href && document
        ? document.headings.map((heading) => ({
          ...heading,
          status: "published" as const,
          href: `${href}#${encodeURIComponent(heading.id)}`,
        }))
        : []),
      ...chapter.sections.flatMap((section) => section.status === "forthcoming"
        ? [{
            id: section.id,
            title: section.title,
            level: 3,
            status: "forthcoming" as const,
            href: null,
          }]
        : []),
    ],
    children: chapter.children.map((child) => readingBookTocItem(book, child, currentChapterId, documents)),
  };
}

function readingBookToc(
  book: Book,
  chapterDocuments: BookChapterDocument[],
  currentChapterId: string
): ReadingBookToc {
  const documents = new Map(chapterDocuments.map((document) => [document.chapter.id, document] as const));
  return {
    chapters: book.chapters.map((chapter) => readingBookTocItem(book, chapter, currentChapterId, documents)),
  };
}

const CHINESE_DIGITS = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"];

function chineseCardinal(value: number): string {
  if (value < 10) return CHINESE_DIGITS[value];
  if (value < 20) return `十${value % 10 ? CHINESE_DIGITS[value % 10] : ""}`;
  if (value < 100) {
    const tens = Math.floor(value / 10);
    return `${CHINESE_DIGITS[tens]}十${value % 10 ? CHINESE_DIGITS[value % 10] : ""}`;
  }
  return String(value);
}

function chapterUnitLabel(number: string): string {
  const normalized = number.trim();
  if (/^0+$/u.test(normalized)) return "序章";
  const chapter = /^0*(\d+)$/u.exec(normalized);
  if (chapter) return `第${chineseCardinal(Number(chapter[1]))}章`;
  const front = /^前\s*(\d+)$/u.exec(normalized);
  if (front) return `前置部分${chineseCardinal(Number(front[1]))}`;
  const appendix = /^附\s*(\d+)$/u.exec(normalized);
  if (appendix) return `附录${chineseCardinal(Number(appendix[1]))}`;
  if (/^\d+(?:\.\d+)+$/u.test(normalized)) return `第${normalized}节`;
  return normalized;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; chapter: string }>;
}): Promise<Metadata> {
  const { slug, chapter: chapterParam } = await params;
  const book = getBookBySlug(decodeURIComponent(slug));
  if (!book) return {};
  const chapter = resolvePublishedChapter(book, chapterParam);
  if (!chapter) return {};

  const canonical = bookChapterHref(book, chapter);
  const translationSource = await resolveTranslationSource({
    type: "book-chapter",
    bookSlug: book.slug,
    chapterId: chapter.id,
  });
  const publishedTranslations = translationSource
    ? await getPublishedTranslationEditions(translationSource)
    : [];
  const citation = getBookChapterCitation(book, chapter);
  const description = `《${book.title}》${chapter.number}：${chapter.title}`;
  return {
    title: `${chapter.title}｜${book.title}`,
    description,
    alternates: {
      canonical,
      ...(translationSource && publishedTranslations.length > 0 ? {
        languages: Object.fromEntries([
          [translationSource.language, translationSource.href],
          ...publishedTranslations.map((edition) => [edition.locale, edition.href]),
        ]),
      } : {}),
      types: { "application/x-bibtex": `${canonical}/cite.bib` },
    },
    other: citationToMetadata(citation),
    openGraph: {
      title: `${chapter.title}｜${book.title}`,
      description,
      url: canonical,
      siteName: site.tabTitle,
      type: "article",
      publishedTime: chapter.publishedAt,
      modifiedTime: book.updatedAt,
    },
  };
}

function SectionChildren({ book, chapters }: { book: Book; chapters: BookChapter[] }) {
  if (chapters.length === 0) return null;
  return (
    <section className={bookStyles.chapterSectionLanding} aria-labelledby="chapter-section-heading">
      <h2 id="chapter-section-heading">本节目录</h2>
      <ol>
        {chapters.map((child) => (
          <li key={child.id} data-chapter-status={child.status}>
            {isPublishedBookChapter(child) ? (
              <Link href={bookChapterHref(book, child)}>
                <span>{child.number}</span>
                <strong>{child.title}</strong>
                <b aria-hidden="true">→</b>
              </Link>
            ) : (
              <div>
                <span>{child.number}</span>
                <strong>{child.title}</strong>
                <small>待更新</small>
              </div>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

function ChapterNavigation({
  book,
  previous,
  next,
}: {
  book: Book;
  previous?: PublishedBookChapter;
  next?: PublishedBookChapter;
}) {
  return (
    <nav className={bookStyles.chapterReaderNav} aria-label="章节导航">
      {previous ? (
        <Link href={bookChapterHref(book, previous)} rel="prev">
          <span>← 上一章</span>
          <strong>{previous.title}</strong>
        </Link>
      ) : <span />}
      <Link href={bookHref(book)} className={bookStyles.chapterReaderCatalogue}>
        <span>全书</span>
        <strong>返回目录</strong>
      </Link>
      {next ? (
        <Link href={bookChapterHref(book, next)} rel="next">
          <span>下一章 →</span>
          <strong>{next.title}</strong>
        </Link>
      ) : <span />}
    </nav>
  );
}

export default async function BookChapterPage({
  params,
}: {
  params: Promise<{ slug: string; chapter: string }>;
}) {
  const { slug, chapter: chapterParam } = await params;
  const book = getBookBySlug(decodeURIComponent(slug));
  if (!book) notFound();
  const chapter = resolvePublishedChapter(book, chapterParam);
  if (!chapter) notFound();

  const [documents, publication] = await Promise.all([
    getBookChapterDocuments(book),
    getBookPublicContent(book.slug),
  ]);
  const index = documents.findIndex((document) => document.chapter.id === chapter.id);
  if (index < 0) notFound();
  const document = documents[index];
  const previous = documents[index - 1]?.chapter;
  const next = documents[index + 1]?.chapter;
  const parts = splitArticle(document.html);
  const citation = getBookChapterCitation(book, chapter);
  const credits = getBookChapterCredits(book, chapter);
  const readerSection = chapter.format === "interview" || chapter.format === "qa"
    ? "interview"
    : document.section;
  const section = EDITORIAL_SECTION_META[readerSection];
  const chapterCode = publication?.sectionNo ?? chapter.number.replace(/\s+/gu, "");
  const publicationNo = publication?.no;
  const canonical = `${site.url}${bookChapterHref(book, chapter)}`;
  const jsonLd = {
    ...citationToJsonLd(citation),
    "@id": `${canonical}#chapter`,
    position: index + 1,
    dateModified: book.updatedAt,
    isPartOf: {
      "@type": "Book",
      "@id": `${site.url}${bookHref(book)}#book`,
      name: book.title,
      url: `${site.url}${bookHref(book)}`,
    },
    publisher: { "@type": "Organization", name: site.brand, url: site.url },
  };
  const translationSource = await resolveTranslationSource({
    type: "book-chapter",
    bookSlug: book.slug,
    chapterId: chapter.id,
  });
  const languageLinks = translationSource ? await getEditionLanguageLinks(translationSource) : [];

  return (
    <ReadingDossierRoot sourceScript={book.script}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <ReadingEditionChrome
        title={`${book.title}｜${chapter.title}`}
        slug={`${book.slug}-${chapter.id}`}
        contentRevision={document.contentRevision}
        sourceScript={book.script}
        credits={credits}
        fallbackAuthor={book.authors.join("　")}
        citationBibtex={citationToBibtex(citation)}
        citationHref={`${bookChapterHref(book, chapter)}/cite.bib`}
        bookToc={readingBookToc(book, documents, chapter.id)}
      />

      <DossierCover
        sectionHref={`/library?section=${encodeURIComponent(readerSection)}`}
        sectionLabel={section.label}
        sectionNumber={chapterCode}
        className={bookStyles.chapterReaderCover}
      >
          <div className={readerStyles.coverLeadMetaWithTopics}>
            <div className={`${readerStyles.coverKicker} ${bookStyles.chapterCoverKicker}`}>
              <Link href={bookHref(book)}>← 返回目录</Link>
              {publicationNo && <span>第 {publicationNo} 号</span>}
              <time dateTime={chapter.publishedAt}>{chapter.publishedAt.replaceAll("-", ".")}</time>
              {document.readMin > 0 && <span>预计阅读 {document.readMin} 分钟</span>}
            </div>
            {languageLinks.length > 0 && (
              <div className={readerStyles.coverLanguages}>
                <LanguageSwitcher current={hanScriptLanguageTag(book.script)} links={languageLinks} />
              </div>
            )}
            <p className={bookStyles.chapterSeriesLine}>
              <b>连载</b>
              <Link href={bookHref(book)}>
                {book.subtitle ? `${book.title}：${book.subtitle}` : book.title}
              </Link>
              <strong>{chapterUnitLabel(chapter.number)}</strong>
            </p>
          </div>
          <h1 className="art-title">
            {chapter.titleBreaks ? chapter.titleBreaks.map((segment, segmentIndex, segments) => {
              const compact = isCompactTitleSegment(segment);
              return (
                <Fragment key={`${segment}-${segmentIndex}`}>
                  <span
                    className={`${readerStyles.titleSegment}${compact ? ` ${readerStyles.compactTitleSegment}` : ""}`}
                    data-reader-title-segment
                    data-reader-title-compact={compact ? "" : undefined}
                  >
                    <ReaderTitleText text={segment} />
                  </span>
                  {segmentIndex < segments.length - 1 && <wbr />}
                </Fragment>
              );
            }) : (
              <span data-reader-title-segment>
                <ReaderTitleText text={chapter.title} />
              </span>
            )}
          </h1>
          <p className={readerStyles.dek}>{book.description}</p>
          <p className={readerStyles.byline}>
            <CreditLinks
              className={readerStyles.creditLine}
              credits={credits}
              itemClassName={readerStyles.credit}
              markClassName={readerStyles.creditMark}
            />
          </p>
          {document.tags.length > 0 && (
            <nav className={readerStyles.tagLine} aria-label="按标签筛选文库">
              {document.tags.map((tag) => (
                <Link
                  className={readerStyles.libraryFilterLink}
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

      <DossierReading
        parts={parts}
        sourceScript={book.script}
        endLabel={document.isSectionLanding ? "本节目录" : "本章完"}
        leftRailLabel="署名、行数与本章目录"
      >
        {document.isSectionLanding && <SectionChildren book={book} chapters={chapter.children} />}
        <p className={readerStyles.rightsNotice}>{site.rightsNotice}</p>
        <ChapterNavigation book={book} previous={previous} next={next} />
      </DossierReading>
    </ReadingDossierRoot>
  );
}
