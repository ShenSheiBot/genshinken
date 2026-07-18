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
  getBookProgressSectionIds,
  getLatestBookChapter,
  getValidatedBookDocument,
} from "@/lib/books";
import { site } from "@/lib/site";
import CreditLinks from "@/app/components/CreditLinks";
import BookLocalProgress, {
  BookBookmarkButton,
  BookChapterLink,
} from "../BookLocalProgress";
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
  const firstChapter = book.chapters[0];
  const latestChapter = getLatestBookChapter(book);
  const credits = getBookCredits(book);
  const authors = credits.filter((credit) => credit.role === "author");
  const translators = credits.filter((credit) => credit.role === "translator");
  const progressChapters = book.chapters.map(({ id, title, anchor }) => ({ id, title, anchor }));
  const documentBaseHref = bookDocumentHref(book);
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
    <main className={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <div className={styles.bookShell}>
        <nav className={styles.breadcrumb} aria-label="面包屑">
          <Link href="/books">书籍与连载</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{book.title}</span>
        </nav>

        <header className={styles.bookHeader}>
          <div>
            <p className={styles.eyebrow}>{bookStatusLabel(book.status)} / 书籍</p>
            <h1>{book.title}</h1>
            <p className={styles.bookSubtitle}>{book.subtitle}</p>
            <p className={styles.bookDescription}>{book.description}</p>
          </div>
          <dl className={styles.bookMeta}>
            <div><dt>作者</dt><dd><CreditLinks credits={authors} showMarks={false} separator="·" /></dd></div>
            <div><dt>译者</dt><dd><CreditLinks credits={translators} showMarks={false} separator="·" /></dd></div>
            <div><dt>状态</dt><dd>{bookStatusLabel(book.status)}</dd></div>
            <div><dt>章节</dt><dd>{book.chapters.length} 个入口</dd></div>
            <div><dt>篇幅</dt><dd>约 {document.readMin} 分钟</dd></div>
            <div><dt>更新</dt><dd><time dateTime={book.updatedAt}>{book.updatedAt}</time></dd></div>
          </dl>
        </header>

        <BookLocalProgress
          bookId={book.id}
          documentBaseHref={documentBaseHref}
          start={{
            chapterId: firstChapter.id,
            sectionId: book.startAnchor,
            href: bookDocumentHref(book, book.startAnchor),
          }}
          latest={{
            chapterId: latestChapter.id,
            sectionId: latestChapter.anchor,
            href: bookChapterHref(book, latestChapter),
            title: latestChapter.title,
          }}
          chapters={progressChapters}
          validSectionIds={getBookProgressSectionIds(document)}
        />

        <BookResources
          originalBibtex={book.originalBibtex}
          translationBibtex={book.translationBibtex}
          pdfUrl={book.pdfUrl}
          epubUrl={book.epubUrl}
        />

        <section className={styles.chapters} aria-labelledby="book-chapters-heading">
          <header className={styles.chapterHeading}>
            <div>
              <span>目录</span>
              <h2 id="book-chapters-heading">章节入口</h2>
            </div>
            <p>点击后仍在同一连续正文中阅读</p>
          </header>

          <ol className={styles.chapterList}>
            {book.chapters.map((chapter) => (
              <li key={chapter.id}>
                <BookChapterLink
                  bookId={book.id}
                  chapterId={chapter.id}
                  sectionId={chapter.anchor}
                  href={bookChapterHref(book, chapter)}
                  className={styles.chapterLink}
                >
                  <span>{chapter.number}</span>
                  <strong>{chapter.title}</strong>
                  <small>{chapter.id === book.latestChapterId ? "最新更新 ↗" : "打开章节 ↗"}</small>
                </BookChapterLink>
                <BookBookmarkButton
                  bookId={book.id}
                  chapterId={chapter.id}
                  sectionId={chapter.anchor}
                />
              </li>
            ))}
          </ol>
        </section>

        <aside className={styles.continuityNote}>
          <strong>连续阅读说明</strong>
          <p>
            章节入口只是这本书的稳定定位地址，不会把正文拆成互相隔离的文章。进入任一章节后，仍可向前或向后连续阅读整本文档，也可通过浏览器页面内查找检索全书。
          </p>
        </aside>
      </div>
    </main>
  );
}
