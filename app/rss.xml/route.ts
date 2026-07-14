/* ============================================================
   RSS 2.0 feed — /rss.xml
   构建期静态生成，数据源与 sitemap 同为 lib/posts.ts
   ============================================================ */
import { getAllPostsFull } from "@/lib/posts";
import { site } from "@/lib/site";
import { postPath } from "@/lib/editorial";

export const dynamic = "force-static";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cdata(s: string): string {
  // CDATA 内不允许出现 "]]>"，按惯例拆成两段
  return `<![CDATA[${s.replace(/\]\]>/g, "]]]]><![CDATA[>")}]]>`;
}

/** 站内相对引用（/attachments/…、/posts/…）改写为绝对 URL，供阅读器展示 */
function absolutize(html: string): string {
  return html.replace(/(src|href)="\//g, `$1="${site.url}/`);
}

function rfc822(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toUTCString();
}

export async function GET() {
  const posts = await getAllPostsFull();

  const items = posts
    .map((p) => {
      const link = `${site.url}${postPath(p)}`;
      return [
        "<item>",
        `<title>${esc(p.title)}</title>`,
        `<link>${link}</link>`,
        `<guid isPermaLink="true">${link}</guid>`,
        `<pubDate>${rfc822(p.dateISO)}</pubDate>`,
        p.author ? `<dc:creator>${esc(p.author)}</dc:creator>` : "",
        p.category ? `<category>${esc(p.category)}</category>` : "",
        p.excerpt ? `<description>${esc(p.excerpt)}</description>` : "",
        `<content:encoded>${cdata(absolutize(p.html))}</content:encoded>`,
        "</item>",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");

  const latest = posts.reduce((m, p) => (p.updatedISO > m ? p.updatedISO : m), "");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/">
<channel>
<title>${esc(site.title)}</title>
<link>${site.url}</link>
<description>${esc(site.description)}</description>
<language>zh-cn</language>
${latest ? `<lastBuildDate>${rfc822(latest)}</lastBuildDate>` : ""}
<atom:link href="${site.url}/rss.xml" rel="self" type="application/rss+xml"/>
${items}
</channel>
</rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
