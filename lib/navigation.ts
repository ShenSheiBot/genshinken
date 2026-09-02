export const GLOBAL_NAV_ITEMS = [
  { href: "/topics", label: "专题" },
  { href: "/books", label: "连载" },
  { href: "/library", label: "文库" },
  { href: "/about", label: "关于" },
] as const;

const LOCALE_PREFIX = "(?:/(?:en|ja))?";
const POST_ROUTE = new RegExp(`^${LOCALE_PREFIX}/posts/[^/]+/?$`);
const BOOK_CHAPTER_ROUTE = new RegExp(`^${LOCALE_PREFIX}/books/[^/]+/chapters/[^/]+/?$`);

export function isReadingRoute(pathname: string): boolean {
  return POST_ROUTE.test(pathname) || BOOK_CHAPTER_ROUTE.test(pathname);
}
