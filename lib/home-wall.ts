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

function titleDisplayWeight(value: string): number {
  return Array.from(value).reduce((total, character) => {
    if (/\s/u.test(character)) return total + 0.25;
    if (/^[\u0000-\u00ff]$/u.test(character)) return total + 0.55;
    if (/^[，。！？：；、“”‘’（）《》〈〉【】—…]$/u.test(character)) return total + 0.65;
    return total + 1;
  }, 0);
}

/**
 * Large feature cards can fit roughly three balanced CJK lines at their
 * display size. Mark longer titles before rendering so the first paint uses
 * the compact type scale instead of waiting for browser measurement.
 */
export function needsDenseHomeTitle(
  post: Pick<HomeWallPost, "title" | "homeTitleBreaks" | "section">,
  featured = false
): boolean {
  if (post.homeTitleBreaks.length >= 4) return true;
  const longestSegment = post.homeTitleBreaks.length > 0
    ? Math.max(...post.homeTitleBreaks.map(titleDisplayWeight))
    : 0;
  const titleWeight = titleDisplayWeight(post.title);
  if (featured && post.section === "review" && titleWeight >= 21.5) return true;
  return titleWeight >= 30 || longestSegment >= 13;
}
