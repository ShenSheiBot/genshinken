import { NextRequest, NextResponse } from "next/server";
import { fetchExternalLinkIcon } from "@/lib/external-link-preview";

export async function GET(request: NextRequest) {
  const target = request.nextUrl.searchParams.get("url")?.trim() ?? "";
  if (!target || target.length > 4_096) {
    return new NextResponse(null, { status: 400 });
  }

  try {
    const icon = await fetchExternalLinkIcon(target);
    const body = icon.bytes.buffer.slice(
      icon.bytes.byteOffset,
      icon.bytes.byteOffset + icon.bytes.byteLength
    ) as ArrayBuffer;
    return new NextResponse(body, {
      headers: {
        "Cache-Control": "public, max-age=259200, stale-while-revalidate=2592000",
        "Content-Type": icon.contentType,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse(null, {
      status: 404,
      headers: { "Cache-Control": "public, max-age=3600" },
    });
  }
}
