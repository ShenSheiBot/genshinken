import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  bookHref,
  bookStatusLabel,
  getAllBookChapters,
  getAllBooks,
  getBookCoverAssets,
  getBookCredits,
  getPublishedBookChapters,
  type Book,
} from "@/lib/books";
import { site } from "@/lib/site";
import CreditLinks from "@/app/components/CreditLinks";
import styles from "./books.module.css";

const description = `${site.brandCN}长篇译作与系列文章目录。`;

const SEP_BOOK_SLUGS = new Set([
  "sep-deflationary-theory-of-truth",
  "sep-deleuze",
  "sep-hegel-aesthetics",
  "sep-john-rawls",
  "sep-max-weber",
  "sep-natural-kinds",
]);

type CatalogBookEntry = {
  kind: "book";
  book: Book;
  position: number;
};

type CatalogSepEntry = {
  kind: "sep";
  books: Array<{ book: Book; position: number }>;
};

type CatalogEntry = CatalogBookEntry | CatalogSepEntry;

function buildCatalogEntries(books: Book[]): CatalogEntry[] {
  const sepBooks = books.flatMap((book, index) => (
    SEP_BOOK_SLUGS.has(book.slug) ? [{ book, position: index + 1 }] : []
  ));
  if (sepBooks.length < 2) {
    return books.map((book, index) => ({ kind: "book", book, position: index + 1 }));
  }

  const firstSepSlug = sepBooks[0].book.slug;
  return books.flatMap((book, index): CatalogEntry[] => {
    if (!SEP_BOOK_SLUGS.has(book.slug)) {
      return [{ kind: "book", book, position: index + 1 }];
    }
    return book.slug === firstSepSlug ? [{ kind: "sep", books: sepBooks }] : [];
  });
}

function CatalogBookCard({
  book,
  position,
  nested = false,
  nestedNumber,
}: {
  book: Book;
  position: number;
  nested?: boolean;
  nestedNumber?: number;
}) {
  const credits = getBookCredits(book);
  const authors = credits.filter((credit) => credit.role === "author");
  const translators = credits.filter((credit) => credit.role === "translator");
  const proofreaders = credits.filter((credit) => credit.role === "proofreader");
  const editors = credits.filter((credit) => credit.role === "editor");
  const coverAssets = getBookCoverAssets(book.slug);
  const allChapters = getAllBookChapters(book);
  const publishedChapters = getPublishedBookChapters(book);

  return (
    <article
      className={`${styles.catalogBook}${nested ? ` ${styles.catalogBookNested}` : ""}`}
      data-book-status={book.status}
    >
      {nested ? (
        <div className={styles.catalogNestedNumber} aria-hidden="true">
          <span>SEP</span>
          <strong>{String(nestedNumber ?? 0).padStart(2, "0")}</strong>
        </div>
      ) : (
        <div
          className={`${styles.catalogCover}${coverAssets ? ` ${styles.coverWithImage}` : ""}`}
          aria-hidden="true"
        >
          {coverAssets ? (
            <Image
              src={coverAssets.src}
              alt=""
              fill
              sizes="(max-width: 760px) 80px, (max-width: 980px) 100px, 112px"
              className={styles.coverImage}
            />
          ) : (
            <>
              <span>屋顶现视研连载</span>
              <strong>{book.title}</strong>
              <small>{String(position).padStart(2, "0")} / 连载</small>
            </>
          )}
        </div>
      )}
      <div className={styles.catalogBody}>
        <div className={styles.catalogTopline}>
          <span className={styles.status}>{bookStatusLabel(book.status)}</span>
          <span>连载</span>
        </div>
        <h3 className={styles.catalogTitle}>
          <Link href={bookHref(book)}>{book.title}</Link>
        </h3>
        {book.subtitle ? <p className={styles.catalogSubtitle}>{book.subtitle}</p> : null}
        <div className={styles.catalogCredits}>
          <div><span>作者</span><CreditLinks credits={authors} showMarks={false} separator="·" /></div>
          {translators.length > 0 ? (
            <div><span>译者</span><CreditLinks credits={translators} showMarks={false} separator="·" /></div>
          ) : null}
          {proofreaders.length > 0 && (
            <div><span>校对</span><CreditLinks credits={proofreaders} showMarks={false} separator="·" /></div>
          )}
          {editors.length > 0 && (
            <div><span>编辑</span><CreditLinks credits={editors} showMarks={false} separator="·" /></div>
          )}
        </div>
      </div>
      <dl className={styles.catalogFacts}>
        <div><dt>章节</dt><dd>{publishedChapters.length} / {allChapters.length}</dd></div>
        <div><dt>更新</dt><dd><time dateTime={book.updatedAt}>{book.updatedAt.replaceAll("-", ".")}</time></dd></div>
      </dl>
      <Link className={styles.catalogOpen} href={bookHref(book)} aria-label={`进入书籍：${book.title}`}>
        <span>查看书籍</span><b aria-hidden="true">→</b>
      </Link>
    </article>
  );
}

function SepCatalogCollection({ books }: { books: CatalogSepEntry["books"] }) {
  const paused = books.filter(({ book }) => book.status === "paused").length;
  const complete = books.filter(({ book }) => book.status === "complete").length;

  return (
    <section className={styles.catalogCollection} aria-labelledby="sep-catalogue-title" data-book-collection="sep">
      <header className={styles.catalogCollectionHeader}>
        <div className={styles.catalogCollectionMark} aria-hidden="true">
          <span>母系列</span>
          <strong>SEP</strong>
          <small>{String(books.length).padStart(2, "0")} / COLLECTION</small>
        </div>
        <div className={styles.catalogCollectionIdentity}>
          <div className={styles.catalogTopline}>
            <span className={styles.status}>译文系列</span>
            <span>Stanford Encyclopedia of Philosophy</span>
          </div>
          <h3 id="sep-catalogue-title">斯坦福哲学百科</h3>
          <p>《斯坦福哲学百科》词条中文译文系列。</p>
        </div>
        <dl className={styles.catalogCollectionFacts}>
          <div><dt>词条</dt><dd>{String(books.length).padStart(2, "0")}</dd></div>
          <div><dt>暂停</dt><dd>{String(paused).padStart(2, "0")}</dd></div>
          <div><dt>完结</dt><dd>{String(complete).padStart(2, "0")}</dd></div>
        </dl>
      </header>
      <ol className={styles.catalogCollectionList}>
        {books.map(({ book, position }, index) => (
          <li key={book.id}>
            <CatalogBookCard book={book} position={position} nested nestedNumber={index + 1} />
          </li>
        ))}
      </ol>
    </section>
  );
}

export const metadata: Metadata = {
  title: "连载",
  description,
  alternates: { canonical: "/books" },
  openGraph: {
    title: "连载",
    description,
    url: "/books",
    siteName: site.tabTitle,
    type: "website",
  },
};

export default function BooksPage() {
  const books = getAllBooks();
  const catalogEntries = buildCatalogEntries(books);
  const serializingCount = books.filter((book) => book.status === "serializing").length;
  const pausedCount = books.filter((book) => book.status === "paused").length;
  const completeCount = books.filter((book) => book.status === "complete").length;
  const canonical = `${site.url}/books`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "连载",
    description: metadata.description,
    url: canonical,
    inLanguage: "zh-Hans",
    publisher: { "@type": "Organization", name: site.brand, url: site.url },
    hasPart: books.map((book, index) => ({
      "@type": "Book",
      name: book.title,
      position: index + 1,
      url: `${site.url}${bookHref(book)}`,
    })),
  };

  return (
    <main id="main" tabIndex={-1} className={`${styles.page} ${styles.catalogPage}`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <header className={styles.catalogHeader}>
        <div>
          <h1>连载</h1>
        </div>
        <dl className={styles.catalogStats}>
          <div><dt>连载中</dt><dd>{String(serializingCount).padStart(2, "0")}</dd></div>
          <div><dt>暂停</dt><dd>{String(pausedCount).padStart(2, "0")}</dd></div>
          <div><dt>已完结</dt><dd>{String(completeCount).padStart(2, "0")}</dd></div>
        </dl>
      </header>

      <section className={styles.catalogue} aria-labelledby="books-catalogue-heading">
        <h2 className={styles.visuallyHidden} id="books-catalogue-heading">书目目录</h2>
        {books.length > 0 ? (
          <ol className={styles.bookList}>
            {catalogEntries.map((entry) => entry.kind === "book" ? (
              <li key={entry.book.id}>
                <CatalogBookCard book={entry.book} position={entry.position} />
              </li>
            ) : (
              <li key="collection-sep">
                <SepCatalogCollection books={entry.books} />
              </li>
            ))}
          </ol>
        ) : (
          <p className={styles.empty}>书目正在编排中。</p>
        )}
      </section>
    </main>
  );
}
