import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  bookChapterHref,
  bookDocumentHref,
  bookHref,
  bookStatusLabel,
  getAllBooks,
  getBookCredits,
  getBookBySlug,
  getLatestBookChapter,
  getValidatedBookDocument,
} from "@/lib/books";
import { site } from "@/lib/site";
import CreditLinks from "@/app/components/CreditLinks";
import BookReadingActions from "../BookReadingActions";
import BookResources from "../BookResources";
import styles from "../books.module.css";

export const dynamicParams = true;

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
    alternates: { canonical },
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
  const credits = getBookCredits(book);
  const authors = credits.filter((credit) => credit.role === "author");
  const translators = credits.filter((credit) => credit.role === "translator");
  const canonical = `${site.url}${bookHref(book)}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Book",
    "@id": `${canonical}#book`,
    name: book.title,
    ...(book.subtitle ? { alternativeHeadline: book.subtitle } : {}),
    description: book.description,
    url: canonical,
    mainEntityOfPage: canonical,
    inLanguage: "zh-Hans",
    datePublished: book.publishedAt,
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
    publisher: { "@type": "Organization", name: site.brand, url: site.url },
    hasPart: book.chapters.map((chapter, index) => ({
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
          <div className={styles.bookCover} aria-hidden="true">
            <span>西方負典文库</span>
            <strong>{book.title}</strong>
            <small>西方負典版</small>
          </div>

          <div className={styles.publicationIdentity}>
            <p className={styles.sectionLabel}>{bookStatusLabel(book.status)} · 书籍</p>
            <h1>{book.title}</h1>
            <p className={styles.bookSubtitle}>{book.subtitle}</p>
            <div className={styles.responsibility}>
              <div><span>作者</span><CreditLinks credits={authors} showMarks={false} separator="·" /></div>
              <div><span>译者</span><CreditLinks credits={translators} showMarks={false} separator="·" /></div>
            </div>
            <p className={styles.bookDescription}>{book.description}</p>
          </div>

          <aside className={styles.publicationRail} aria-label="阅读与书目信息">
            <BookReadingActions
              startHref={bookDocumentHref(book, book.startAnchor)}
              latestHref={bookChapterHref(book, latestChapter)}
              latestTitle={latestChapter.title}
            />
            <dl className={styles.publicationFacts}>
              <div><dt>发布</dt><dd><time dateTime={book.publishedAt}>{book.publishedAt}</time></dd></div>
              <div><dt>更新</dt><dd><time dateTime={book.updatedAt}>{book.updatedAt}</time></dd></div>
              <div><dt>章节</dt><dd>{book.chapters.length}</dd></div>
              <div><dt>全文</dt><dd>约 {document.readMin} 分钟</dd></div>
            </dl>
          </aside>
        </header>

        <div className={styles.publicationBody}>
          <section className={styles.chapters} aria-labelledby="book-chapters-heading">
            <header className={styles.sectionHeading}>
              <h2 id="book-chapters-heading">目录</h2>
              <p>{book.chapters.length} 章</p>
            </header>

            <ol className={styles.chapterList}>
              {book.chapters.map((chapter) => (
                <li key={chapter.id} data-latest={chapter.id === book.latestChapterId ? "true" : undefined}>
                  <Link href={bookChapterHref(book, chapter)} className={styles.chapterLink}>
                    <span>{chapter.number}</span>
                    <div>
                      <strong>{chapter.title}</strong>
                      <time dateTime={chapter.publishedAt}>{chapter.publishedAt}</time>
                    </div>
                    <small>{chapter.id === book.latestChapterId ? "最新章节" : "阅读"} <b aria-hidden="true">→</b></small>
                  </Link>
                </li>
              ))}
            </ol>
          </section>

          <BookResources
            originalBibtex={book.originalBibtex}
            translationBibtex={book.translationBibtex}
            pdfUrl={book.pdfUrl}
            epubUrl={book.epubUrl}
          />
        </div>
      </div>
    </main>
  );
}
