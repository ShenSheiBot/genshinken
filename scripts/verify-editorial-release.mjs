import assert from "node:assert/strict";

const base = new URL(process.argv[2] || "http://127.0.0.1:3000");
const baseOrigin = base.origin;
const requestTimeoutMs = 30_000;

async function request(pathname) {
  const url = new URL(pathname, `${baseOrigin}/`);
  const response = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(requestTimeoutMs),
  });
  return { url, response, body: await response.text() };
}

function contentType(result) {
  return result.response.headers.get("content-type") ?? "";
}

function xmlText(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}

function canonicalPath(html) {
  const href = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/iu)?.[1]
    ?? html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/iu)?.[1];
  return href ? new URL(href).pathname : "";
}

async function inBatches(values, concurrency, operation) {
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, async () => {
    while (next < values.length) {
      const index = next;
      next += 1;
      await operation(values[index], index);
    }
  }));
}

const [home, library, books, topics, about, sitemap, rss, robots, missing] = await Promise.all([
  request("/"),
  request("/library"),
  request("/books"),
  request("/topics"),
  request("/about"),
  request("/sitemap.xml"),
  request("/rss.xml"),
  request("/robots.txt"),
  request("/__release-verifier-missing-page__"),
]);

for (const result of [home, library, books, topics, about]) {
  assert.equal(result.response.status, 200, `${result.url.pathname} must return HTTP 200`);
  assert.match(contentType(result), /text\/html/iu, `${result.url.pathname} must return HTML`);
  assert.match(result.body, /屋顶现视研/u, `${result.url.pathname} must expose the site brand`);
}

assert.equal(sitemap.response.status, 200, "sitemap must return HTTP 200");
assert.match(contentType(sitemap), /(?:application|text)\/xml/iu, "sitemap must return XML");
const sitemapUrls = [...sitemap.body.matchAll(/<loc>([^<]+)<\/loc>/gu)]
  .map((match) => new URL(xmlText(match[1])));
assert.ok(sitemapUrls.length > 100, "sitemap must contain the public archive");
assert.equal(new Set(sitemapUrls.map(String)).size, sitemapUrls.length, "sitemap URLs must be unique");

const sitemapPaths = sitemapUrls.map((url) => url.pathname);
for (const requiredPath of ["/", "/library", "/books", "/topics", "/about"]) {
  assert.ok(sitemapPaths.includes(requiredPath), `sitemap must include ${requiredPath}`);
}
const readerPaths = sitemapPaths.filter((pathname) =>
  pathname.startsWith("/posts/") || /^\/books\/[^/]+\/chapters\/[^/]+$/u.test(pathname)
);
assert.ok(readerPaths.some((pathname) => pathname.startsWith("/posts/")), "sitemap must contain posts");
assert.ok(readerPaths.some((pathname) => pathname.includes("/chapters/")), "sitemap must contain chapters");

const readerPathSet = new Set(readerPaths);
const routeFailures = [];
await inBatches(sitemapPaths, 12, async (pathname) => {
  try {
    const result = await request(pathname);
    if (result.response.status !== 200) {
      routeFailures.push(`${pathname}: HTTP ${result.response.status}`);
      return;
    }
    if (pathname !== "/" && canonicalPath(result.body) !== pathname) {
      routeFailures.push(`${pathname}: canonical ${canonicalPath(result.body) || "missing"}`);
    }
    if (readerPathSet.has(pathname)) {
      if (!/id=["']reading-cover["']/u.test(result.body)) {
        routeFailures.push(`${pathname}: missing reader cover`);
      }
      if (!/data-reader-title-segment/u.test(result.body)) {
        routeFailures.push(`${pathname}: missing title segment markers`);
      }
      if (!/data-reader-title-word/u.test(result.body)) {
        routeFailures.push(`${pathname}: missing protected title words`);
      }
    }
  } catch (error) {
    routeFailures.push(`${pathname}: ${error instanceof Error ? error.message : String(error)}`);
  }
});
assert.deepEqual(routeFailures, [], `public route failures:\n${routeFailures.join("\n")}`);

assert.equal(rss.response.status, 200, "RSS must return HTTP 200");
assert.match(contentType(rss), /application\/rss\+xml/iu, "RSS must use the RSS content type");
const rssLinks = [...rss.body.matchAll(/<item>[\s\S]*?<link>([^<]+)<\/link>[\s\S]*?<\/item>/gu)]
  .map((match) => xmlText(match[1]));
assert.ok(rssLinks.length > 0, "RSS must contain published items");
assert.equal(new Set(rssLinks).size, rssLinks.length, "RSS item links must be unique");

assert.equal(robots.response.status, 200, "robots.txt must return HTTP 200");
assert.match(contentType(robots), /text\/plain/iu, "robots.txt must be plain text");
assert.match(robots.body, /Sitemap:/u, "robots.txt must advertise the sitemap");
assert.equal(missing.response.status, 404, "an unknown route must return HTTP 404");

const assetPaths = [...home.body.matchAll(/(?:src|href)=["'](\/_next\/static\/[^"']+)["']/gu)]
  .map((match) => match[1]);
const stylesheet = assetPaths.find((pathname) => pathname.endsWith(".css"));
const script = assetPaths.find((pathname) => pathname.endsWith(".js"));
for (const assetPath of [stylesheet, script]) {
  assert.ok(assetPath, "home must reference built CSS and JavaScript assets");
  const asset = await request(assetPath);
  assert.equal(asset.response.status, 200, `${assetPath} must return HTTP 200`);
  assert.ok(asset.body.length > 0, `${assetPath} must not be empty`);
}

console.log(
  `release verification passed for ${baseOrigin}: ${sitemapPaths.length} public routes, ${readerPaths.length} reader routes`
);
