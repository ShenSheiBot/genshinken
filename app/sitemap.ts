import type { MetadataRoute } from "next";
import {
  bookChapterHref,
  bookHref,
  getAllBooks,
  getPublishedBookChapters,
} from "@/lib/books";
import { getAllPosts } from "@/lib/posts";
import { site } from "@/lib/site";
import { postPath } from "@/lib/editorial";
import { getAllTopics } from "@/lib/topics";
import { getPublishedTranslationEditions, translationHref } from "@/lib/translations";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, topics, translations] = await Promise.all([
    getAllPosts(),
    getAllTopics(),
    getPublishedTranslationEditions(),
  ]);
  const books = getAllBooks();
  const postEntries: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${site.url}${postPath(p)}`,
    lastModified: p.updatedISO,
  }));
  const bookEntries: MetadataRoute.Sitemap = books.map((book) => ({
    url: `${site.url}${bookHref(book)}`,
    lastModified: book.updatedAt,
  }));
  const chapterEntries: MetadataRoute.Sitemap = books.flatMap((book) =>
    getPublishedBookChapters(book).map((chapter) => ({
      url: `${site.url}${bookChapterHref(book, chapter)}`,
      lastModified: book.updatedAt,
    }))
  );
  const topicEntries: MetadataRoute.Sitemap = topics.map((topic) => ({
    url: `${site.url}/topics/${encodeURIComponent(topic.slug)}`,
    lastModified: topic.updated,
  }));
  const translationEntries: MetadataRoute.Sitemap = translations.map((edition) => ({
    url: `${site.url}${translationHref(edition)}`,
    lastModified: edition.updatedISO || edition.publishedISO || undefined,
  }));

  // 聚合页 lastmod 取其真实数据源最近一次变动，不使用构建日期。
  const latestPost = posts.reduce((latest, post) =>
    post.updatedISO > latest ? post.updatedISO : latest, "");
  const latestBook = books.reduce((latest, book) =>
    book.updatedAt > latest ? book.updatedAt : latest, "");
  const latestTopic = topics.reduce((latest, topic) =>
    topic.updated > latest ? topic.updated : latest, "");
  const latestSite = [latestPost, latestBook, latestTopic].reduce((latest, value) =>
    value > latest ? value : latest, "");

  return [
    { url: site.url, lastModified: latestSite || undefined },
    { url: `${site.url}/topics`, lastModified: latestTopic || undefined },
    { url: `${site.url}/library`, lastModified: latestPost || undefined },
    { url: `${site.url}/books`, lastModified: latestBook || undefined },
    { url: `${site.url}/about` },
    ...topicEntries,
    ...bookEntries,
    ...chapterEntries,
    ...postEntries,
    ...translationEntries,
  ];
}
