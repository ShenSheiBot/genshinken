export const GLOBAL_NAV_ITEMS = [
  { href: "/topics", label: "专题" },
  { href: "/books", label: "连载" },
  { href: "/library", label: "文库" },
  { href: "/about", label: "关于" },
] as const;

const POST_ROUTE = /^\/posts\/[^/]+\/?$/;
const BOOK_CHAPTER_ROUTE = /^\/books\/[^/]+\/chapters\/[^/]+\/?$/;

export function isReadingRoute(pathname: string): boolean {
  return POST_ROUTE.test(pathname) || BOOK_CHAPTER_ROUTE.test(pathname);
}
