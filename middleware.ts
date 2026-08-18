import { NextResponse, type NextRequest } from "next/server";

const legacyHexoArticlePath = /^\/(?:19|20)\d{2}\/(?:0[1-9]|1[0-2])\/(?:0[1-9]|[12]\d|3[01])(?:\/|$)/u;
const legacyHexoIndexPath = /^\/(?:archives|categories|tags|page)(?:\/|$)/u;
const localizedEditionPath = /^\/(en|ja)(?:\/|$)/u;

/**
 * The retired Hexo site used dated article permalinks plus generated archive,
 * category, tag and pagination indexes. None of those URLs has a successor in
 * the current information architecture, so answer them explicitly with 410
 * instead of keeping them in Google's generic 404 retry cycle.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const localizedEdition = pathname.match(localizedEditionPath);
  if (localizedEdition) {
    const response = NextResponse.next();
    response.headers.set("Content-Language", localizedEdition[1]);
    return response;
  }
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
  // The matcher constrains the dated shape with digit patterns so the
  // middleware only ever runs for calendar-prefixed legacy URLs — the old
  // unconstrained `/:year/:month/:day/:path*` compiled to "any path with
  // three or more segments" and fired on every /_next/static chunk and
  // cite.bib request. The handler still re-validates via
  // `legacyHexoArticlePath` as defence in depth.
  matcher: [
    "/:year(\\d{4})/:month(\\d{2})/:day(\\d{2})/:path*",
    "/archives/:path*",
    "/categories/:path*",
    "/tags/:path*",
    "/page/:path*",
    "/en/:path*",
    "/ja/:path*",
  ],
};
