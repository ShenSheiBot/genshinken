import { NextResponse, type NextRequest } from "next/server";

const legacyHexoArticlePath = /^\/(?:19|20)\d{2}\/(?:0[1-9]|1[0-2])\/(?:0[1-9]|[12]\d|3[01])(?:\/|$)/u;
const legacyHexoIndexPath = /^\/(?:archives|categories|tags|page)(?:\/|$)/u;

/**
 * The retired Hexo site used dated article permalinks plus generated archive,
 * category, tag and pagination indexes. None of those URLs has a successor in
 * the current information architecture, so answer them explicitly with 410
 * instead of keeping them in Google's generic 404 retry cycle.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!legacyHexoArticlePath.test(pathname) && !legacyHexoIndexPath.test(pathname)) {
    return NextResponse.next();
  }

  return new NextResponse("Gone\n", {
    status: 410,
    headers: {
      "Cache-Control": "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800",
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

export const config = {
  // The dated matcher is intentionally broad enough for old encoded titles;
  // the middleware itself validates the calendar-shaped prefix before acting.
  matcher: [
    "/:year/:month/:day/:path*",
    "/archives/:path*",
    "/categories/:path*",
    "/tags/:path*",
    "/page/:path*",
  ],
};
