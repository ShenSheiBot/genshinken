import { NextRequest, NextResponse } from "next/server";
import {
  type ExternalLinkPreview,
  fallbackExternalLinkPreview,
  fetchExternalLinkPreview,
} from "@/lib/external-link-preview";

function publicPreview(preview: ExternalLinkPreview) {
  const { url, hostname, siteName, title } = preview;
  return { url, hostname, siteName, title };
}

export async function GET(request: NextRequest) {
  const target = request.nextUrl.searchParams.get("url")?.trim() ?? "";
  if (!target || target.length > 4_096) {
    return NextResponse.json({ error: "invalid URL" }, { status: 400 });
  }

  try {
    const preview = await fetchExternalLinkPreview(target);
    return NextResponse.json(publicPreview(preview), {
      headers: {
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const fallback = fallbackExternalLinkPreview(target);
    if (fallback) {
      return NextResponse.json(publicPreview(fallback), {
        headers: {
          "Cache-Control": "public, max-age=300",
          "X-Content-Type-Options": "nosniff",
          "X-Link-Preview": "identity-fallback",
        },
      });
    }
    const message = error instanceof Error ? error.message : "preview unavailable";
    return NextResponse.json(
      { error: message },
      {
        status: 422,
        headers: {
          "Cache-Control": "public, max-age=300",
          "X-Content-Type-Options": "nosniff",
        },
      }
    );
  }
}
