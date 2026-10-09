import type { PublicContentEntry } from "./public-content";
import type { PostSummary } from "./posts";
import type { TranslationEdition, TranslationLocale } from "./translations";
import { translationEditionIsVisible } from "./translation-contract.mjs";

export function relatedPostsFor(current: Pick<PostSummary, "slug" | "tags" | "category" | "section">, posts: PublicContentEntry[]): PublicContentEntry[] {
  const tags = new Set(current.tags.map((tag) => tag.normalize("NFKC").trim()));
  return posts.filter((post) => post.slug !== current.slug)
    .map((post) => ({ post, score:
      post.tags.filter((tag) => tags.has(tag.normalize("NFKC").trim())).length * 100
      + Number(post.category === current.category) * 20
      + Number(post.section === current.section) * 8,
    }))
    .sort((a, b) => b.score - a.score || b.post.timestamp - a.post.timestamp || a.post.slug.localeCompare(b.post.slug))
    .slice(0, 3).map(({ post }) => post);
}

/** Keep source identity and taxonomy for ranking; display only visible localized metadata. */
export function localizedReadingEntries(posts: PublicContentEntry[], editions: TranslationEdition[], locale: TranslationLocale, preview: boolean): PublicContentEntry[] {
  const visible = editions.filter((edition) => edition.locale === locale && translationEditionIsVisible(edition.status, preview));
  return posts.flatMap((post) => {
    const matches = visible.filter((edition) => post.kind === "book"
      ? edition.sourceRef.type === "book-chapter" && edition.sourceRef.bookSlug === post.bookSlug
      : edition.sourceRef.type === "post" && edition.sourceRef.slug === post.slug);
    const edition = matches[0];
    if (!edition) return [];
    const book = post.kind === "book";
    return [{ ...post,
      href: book ? `/${locale}/books/${edition.bookSlug}` : edition.href,
      title: book ? edition.bookTitle : edition.title,
      subtitle: book ? edition.bookSubtitle : edition.subtitle,
      excerpt: book ? edition.bookExcerpt : edition.excerpt,
      readMin: matches.reduce((total, item) => total + item.readMin, 0),
    }];
  });
}
