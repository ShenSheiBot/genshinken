import type { ReaderEditorialSection } from "./editorial";
import type { PublicContentEntry } from "./public-content";

export type HomeWallPost = Pick<
  PublicContentEntry,
  | "slug"
  | "href"
  | "sectionNo"
  | "category"
  | "dateISO"
  | "title"
  | "homeTitleBreaks"
  | "subtitle"
  | "credits"
  | "author"
  | "excerpt"
  | "readMin"
> & { section: ReaderEditorialSection };

export function toHomeWallPost(
  post: PublicContentEntry & { section: ReaderEditorialSection }
): HomeWallPost {
  return {
    slug: post.slug,
    href: post.href,
    section: post.section,
    sectionNo: post.sectionNo,
    category: post.category,
    dateISO: post.dateISO,
    title: post.title,
    homeTitleBreaks: post.homeTitleBreaks,
    subtitle: post.subtitle,
    credits: post.credits,
    author: post.author,
    excerpt: post.excerpt,
    readMin: post.readMin,
  };
}
