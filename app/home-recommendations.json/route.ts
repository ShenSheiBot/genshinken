import { getAllPublicContent } from "@/lib/public-content";
import {
  READER_EDITORIAL_SECTIONS,
  type ReaderEditorialSection,
} from "@/lib/editorial";
import { toHomeWallPost } from "@/lib/home-wall";

export const dynamic = "force-static";

export async function GET() {
  const posts = (await getAllPublicContent())
    .filter(
      (post): post is typeof post & { section: ReaderEditorialSection } =>
        READER_EDITORIAL_SECTIONS.includes(post.section as ReaderEditorialSection)
    )
    .map(toHomeWallPost);

  return Response.json(posts, {
    headers: {
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
