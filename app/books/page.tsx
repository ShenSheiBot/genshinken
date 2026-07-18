import type { Metadata } from "next";
import Link from "next/link";
import { bookHref, bookStatusLabel, getAllBooks, getBookCredits } from "@/lib/books";
import { site } from "@/lib/site";
import CreditLinks from "@/app/components/CreditLinks";
import styles from "./books.module.css";

export const metadata: Metadata = {
  title: "书籍与连载",
  description: "按书籍组织的长篇翻译与连载，兼顾连续阅读、章节定位和本机阅读记录。",
  alternates: { canonical: "/books" },
  openGraph: {
    title: "书籍与连载",
    description: "按书籍组织的长篇翻译与连载，兼顾连续阅读、章节定位和本机阅读记录。",
    url: "/books",
    type: "website",
  },
};

export default function BooksPage() {
  const books = getAllBooks();
  const serializingCount = books.filter((book) => book.status === "serializing").length;
  const canonical = `${site.url}/books`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "书籍与连载",
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
    <main className={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <header className={styles.indexHero}>
        <div className={styles.indexHeroTitle}>
          <p className={styles.eyebrow}>书籍 / 连续阅读</p>
          <h1>连载</h1>
        </div>
        <div className={styles.indexHeroNote}>
            <span>长篇／连续阅读</span>
          <p>
            长篇内容仍以整本连续正文呈现，同时提供稳定的章节入口。读者可以从头开始、前往最新更新，或自行选择本机保存的位置。
          </p>
          <small>
            {String(books.length).padStart(2, "0")} 册收录 · {String(serializingCount).padStart(2, "0")} 册连载中
          </small>
        </div>
      </header>

      <section className={styles.catalogue} aria-labelledby="books-catalogue-heading">
        <header className={styles.catalogueHeading}>
          <h2 id="books-catalogue-heading">全部书目</h2>
          <p>{String(books.length).padStart(2, "0")} 册</p>
        </header>

        {books.length > 0 ? (
          <ol className={styles.bookGrid}>
            {books.map((book, index) => {
              const credits = getBookCredits(book);
              const authors = credits.filter((credit) => credit.role === "author");
              const translators = credits.filter((credit) => credit.role === "translator");
              return (
                <li key={book.id}>
                  <article className={styles.bookCard}>
                    <Link
                      href={bookHref(book)}
                      className={styles.bookCardLink}
                      aria-label={`进入书籍：${book.title}`}
                    />
                    <header>
                      <div>
                        <span className={styles.bookIndex}>{String(index + 1).padStart(2, "0")}</span>
                        <span className={styles.status}>{bookStatusLabel(book.status)}</span>
                      </div>
                      <time dateTime={book.updatedAt}>{book.updatedAt.replaceAll("-", ".")}</time>
                    </header>
                    <h3>{book.title}</h3>
                    <div className={styles.bookCardInfo}>
                      <p>{book.subtitle}</p>
                      <div className={styles.bookCardCredits}>
                        <CreditLinks credits={authors} separator="·" />
                        <CreditLinks credits={translators} separator="·" />
                      </div>
                    </div>
                    <footer>
                      <span>{book.chapters.length} 个稳定章节入口</span>
                      <b>进入书籍 ↗</b>
                    </footer>
                  </article>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className={styles.empty}>书目正在编排中。</p>
        )}
      </section>
    </main>
  );
}
