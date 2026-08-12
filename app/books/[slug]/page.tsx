import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  bookChapterHref,
  bookHref,
  bookStatusLabel,
  getAllBookChapters,
  getAllBooks,
  getBookCoverAssets,
  getBookCredits,
  getBookBySlug,
  getLatestBookChapter,
  getPublishedBookChapters,
  getValidatedBookDocument,
  isPublishedBookChapter,
  isPublishedBookChapterSection,
  type Book,
  type BookChapter,
} from "@/lib/books";
import { site } from "@/lib/site";
import {
  citationToBibtex,
  citationToJsonLd,
  citationToMetadata,
} from "@/lib/citations";
import CreditLinks from "@/app/components/CreditLinks";
import BookReadingActions from "../BookReadingActions";
import BookResources from "../BookResources";
import styles from "../books.module.css";

export const dynamicParams = false;

function ChapterCatalogue({
  book,
  chapters,
  depth = 0,
}: {
  book: Book;
  chapters: BookChapter[];
  depth?: number;
}) {
  return (
    <ol className={depth === 0 ? styles.chapterList : styles.chapterChildren}>
      {chapters.map((chapter) => {
        const published = isPublishedBookChapter(chapter);
        const latest = published && chapter.id === book.latestChapterId;
        return (
          <li
            key={chapter.id}
            data-chapter-status={chapter.status}
            data-latest={latest ? "true" : undefined}
          >
            {published ? (
              <Link
                href={bookChapterHref(book, chapter)}
                className={`${styles.chapterRow} ${styles.chapterLink}`}
              >
                <span>{chapter.number}</span>
                <div>
                  <strong>{chapter.title}</strong>
                  <time dateTime={chapter.publishedAt}>{chapter.publishedAt}</time>
                </div>
                <small>{latest ? "最新章节" : "阅读"} <b aria-hidden="true">→</b></small>
              </Link>
            ) : (
              <div className={`${styles.chapterRow} ${styles.chapterForthcoming}`}>
                <span>{chapter.number}</span>
                <div><strong>{chapter.title}</strong></div>
                <small>待更新</small>
              </div>
            )}
            {chapter.sections.length > 0 && (
              <ol className={styles.chapterChildren} aria-label={`${chapter.title}的分篇`}>
                {chapter.sections.map((section) => (
                  <li key={section.id} data-section-status={section.status}>
                    {isPublishedBookChapterSection(section) && published ? (
                      <Link
                        href={`${bookChapterHref(book, chapter)}#${encodeURIComponent(section.anchor)}`}
                        className={`${styles.chapterRow} ${styles.chapterLink}`}
                      >
                        <span>{section.number}</span>
                        <div>
                          <strong>{section.title}</strong>
                          <time dateTime={section.publishedAt}>{section.publishedAt}</time>
                        </div>
                        <small>阅读 <b aria-hidden="true">→</b></small>
                      </Link>
                    ) : (
                      <div className={`${styles.chapterRow} ${styles.chapterForthcoming}`}>
                        <span>{section.number}</span>
                        <div><strong>{section.title}</strong></div>
                        <small>待更新</small>
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            )}
            {chapter.children.length > 0 && (
              <ChapterCatalogue book={book} chapters={chapter.children} depth={depth + 1} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function generateStaticParams() {
  return getAllBooks().map((book) => ({ slug: book.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const book = getBookBySlug(decodeURIComponent(slug));
  if (!book) return {};
  const canonical = bookHref(book);
  return {
    title: book.title,
    description: book.description,
    alternates: {
      canonical,
      types: { "application/x-bibtex": `${canonical}/cite.bib` },
    },
    other: citationToMetadata(book.translationCitation),
    openGraph: {
      title: book.title,
      description: book.description,
      url: canonical,
      siteName: site.tabTitle,
      type: "book",
    },
  };
}

export default async function BookPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const book = getBookBySlug(decodeURIComponent(slug));
  if (!book) notFound();

  const document = await getValidatedBookDocument(book);
  const latestChapter = getLatestBookChapter(book);
  const allChapters = getAllBookChapters(book);
  const publishedChapters = getPublishedBookChapters(book);
  const firstChapter = publishedChapters[0];
  const credits = getBookCredits(book);
  const coverAssets = getBookCoverAssets(book.slug);
  const authors = credits.filter((credit) => credit.role === "author");
  const translators = credits.filter((credit) => credit.role === "translator");
  const proofreaders = credits.filter((credit) => credit.role === "proofreader");
  const canonical = `${site.url}${bookHref(book)}`;
  const jsonLd = {
    ...citationToJsonLd(book.translationCitation),
    "@id": `${canonical}#book`,
    ...(book.subtitle ? { alternativeHeadline: book.subtitle } : {}),
    description: book.description,
    dateModified: book.updatedAt,
    author: authors.map((credit) => ({
      "@type": "Person",
      name: credit.name,
      url: `${site.url}/library?contributor=${encodeURIComponent(credit.contributorId)}`,
    })),
    translator: translators.map((credit) => ({
      "@type": "Person",
      name: credit.name,
      url: `${site.url}/library?contributor=${encodeURIComponent(credit.contributorId)}`,
    })),
    contributor: proofreaders.map((credit) => ({
      "@type": "Person",
      name: credit.name,
      url: `${site.url}/library?contributor=${encodeURIComponent(credit.contributorId)}`,
      roleName: "校对",
    })),
    publisher: { "@type": "Organization", name: site.brand, url: site.url },
    hasPart: publishedChapters.map((chapter, index) => ({
      "@type": "Chapter",
      name: chapter.title,
      position: index + 1,
      datePublished: chapter.publishedAt,
      url: `${site.url}${bookChapterHref(book, chapter)}`,
      isPartOf: { "@id": `${canonical}#book` },
    })),
  };

  return (
    <main id="main" tabIndex={-1} className={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <div className={styles.bookShell}>
        <nav className={styles.breadcrumb} aria-label="面包屑">
          <Link href="/books">连载</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{book.title}</span>
        </nav>

        <header className={styles.publicationHeader}>
          <div
            className={`${styles.bookCover}${coverAssets ? ` ${styles.coverWithImage}` : ""}`}
            aria-hidden="true"
          >
            {coverAssets ? (
              <Image
                src={coverAssets.src}
                alt=""
                fill
                sizes="(max-width: 520px) 120px, (max-width: 760px) 136px, (max-width: 980px) 190px, 210px"
                className={styles.coverImage}
              />
            ) : (
              <>
                <span>屋顶现视研文库</span>
                <strong>{book.title}</strong>
                <small>屋顶现视研版</small>
              </>
            )}
          </div>

          <div className={styles.publicationIdentity}>
            <p className={styles.sectionLabel}>{bookStatusLabel(book.status)} · 书籍</p>
            <h1>{book.title}</h1>
            {book.subtitle ? <p className={styles.bookSubtitle}>{book.subtitle}</p> : null}
            <div className={styles.responsibility}>
              <div><span>作者</span><CreditLinks credits={authors} showMarks={false} separator="·" /></div>
              <div><span>译者</span><CreditLinks credits={translators} showMarks={false} separator="·" /></div>
              {proofreaders.length > 0 && (
                <div><span>校对</span><CreditLinks credits={proofreaders} showMarks={false} separator="·" /></div>
              )}
            </div>
            <p className={styles.bookDescription}>{book.description}</p>
          </div>

          <aside className={styles.publicationRail} aria-label="阅读与书目信息">
            <BookReadingActions
              startHref={bookChapterHref(book, firstChapter)}
              latestHref={bookChapterHref(book, latestChapter)}
              latestTitle={latestChapter.title}
            />
            <dl className={styles.publicationFacts}>
              <div><dt>发布</dt><dd><time dateTime={book.publishedAt}>{book.publishedAt}</time></dd></div>
              <div><dt>更新</dt><dd><time dateTime={book.updatedAt}>{book.updatedAt}</time></dd></div>
              <div><dt>章节</dt><dd>{publishedChapters.length} / {allChapters.length}</dd></div>
              <div><dt>全书</dt><dd>约 {document.readMin} 分钟</dd></div>
            </dl>
          </aside>
        </header>

        <div className={styles.publicationBody}>
          <section className={styles.chapters} aria-labelledby="book-chapters-heading">
            <header className={styles.sectionHeading}>
              <h2 id="book-chapters-heading">目录</h2>
              <p>已发布 {publishedChapters.length} / 全部 {allChapters.length}</p>
            </header>

            <ChapterCatalogue book={book} chapters={book.chapters} />
          </section>

          <BookResources
            originalBibtex={book.originalCitation
              ? citationToBibtex(book.originalCitation)
              : undefined}
            translationBibtex={citationToBibtex(book.translationCitation)}
            pdfUrl={book.pdfUrl}
            epubUrl={book.epubUrl}
          />
        </div>
      </div>
    </main>
  );
}
