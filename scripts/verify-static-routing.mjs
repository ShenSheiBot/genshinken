import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { isReadingRoute } from "../lib/navigation.ts";

for (const pathname of [
  "/posts/example",
  "/posts/example/",
  "/books/example/chapters/chapter-1",
  "/books/example/chapters/chapter-1/",
]) {
  assert.equal(isReadingRoute(pathname), true, `${pathname} must be a Reader route`);
}

for (const pathname of [
  "/posts/",
  "/posts/example/extra",
  "/books/example",
  "/books/example/chapters/",
  "/books/example/chapters/chapter-1/extra",
  "/media/example",
]) {
  assert.equal(isReadingRoute(pathname), false, `${pathname} must not be a Reader route`);
}

const staticDynamicRoutes = [
  "app/(site)/posts/[slug]/page.tsx",
  "app/(site)/posts/[slug]/cite.bib/route.ts",
  "app/[locale]/posts/[slug]/page.tsx",
  "app/[locale]/posts/[slug]/cite.bib/route.ts",
  "app/[locale]/books/[book]/page.tsx",
  "app/[locale]/books/[book]/chapters/[chapter]/page.tsx",
  "app/[locale]/books/[book]/chapters/[chapter]/cite.bib/route.ts",
  "app/(site)/media/[slug]/page.tsx",
  "app/(site)/media/[slug]/cite.bib/route.ts",
  "app/(site)/topics/[slug]/page.tsx",
  "app/(site)/books/[slug]/page.tsx",
  "app/(site)/books/[slug]/chapters/[chapter]/page.tsx",
  "app/(site)/books/[slug]/chapters/[chapter]/cite.bib/route.ts",
  "app/(site)/books/[slug]/cite.bib/route.ts",
  "app/(site)/home-variants/[variant]/page.tsx",
];

for (const route of staticDynamicRoutes) {
  const sourcePath = path.join(process.cwd(), ...route.split("/"));
  assert.ok(fs.existsSync(sourcePath), `${route} must exist`);
  const source = fs.readFileSync(sourcePath, "utf8");
  assert.match(
    source,
    /export const dynamicParams = false;/u,
    `${route} must reject slugs that were not generated at build time`,
  );
  assert.match(
    source,
    /generateStaticParams/u,
    `${route} must enumerate its published static parameters`,
  );
}

const postsSource = fs.readFileSync(path.join(process.cwd(), "lib", "posts.ts"), "utf8");
assert.match(
  postsSource,
  /getPreviewablePosts[\s\S]*allowDraftPreview\(\) \|\| !p\.draft/u,
  "route params must retain local draft previews while filtering drafts in production"
);
assert.match(
  postsSource,
  /getPreviewableSlugs[\s\S]*allowDraftPreview\(\) \|\| !p\.draft/u,
  "post and citation params must retain local draft previews"
);
for (const route of [
  "app/(site)/posts/[slug]/page.tsx",
  "app/(site)/posts/[slug]/cite.bib/route.ts",
]) {
  assert.match(
    fs.readFileSync(path.join(process.cwd(), ...route.split("/")), "utf8"),
    /getPreviewableSlugs/u,
    `${route} must enumerate local draft previews`
  );
}
for (const route of [
  "app/(site)/media/[slug]/page.tsx",
  "app/(site)/media/[slug]/cite.bib/route.ts",
]) {
  assert.match(
    fs.readFileSync(path.join(process.cwd(), ...route.split("/")), "utf8"),
    /getPreviewablePosts/u,
    `${route} must enumerate local draft previews`
  );
}

// --- 全站静态渲染契约 -------------------------------------------------
// /library 曾因 `await searchParams` 成为唯一的请求期 SSR 路由：每次冷
// 启动把全部 markdown 语料跑一遍渲染管线，且 4,000+ 个 facet 查询变体
// 均不可 CDN 缓存，是边缘运行时负载与 GSC 已知页面暴涨的共同根源。
// 静态化后由此守卫防止任何 page 再回到请求期渲染。
function walkPageFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return walkPageFiles(fullPath);
    return entry.isFile() && entry.name === "page.tsx" ? [fullPath] : [];
  });
}

const pageFiles = walkPageFiles(path.join(process.cwd(), "app"));
assert.ok(pageFiles.length >= 10, "app/ must expose its page routes");
for (const file of pageFiles) {
  const relative = path.relative(process.cwd(), file).replaceAll(path.sep, "/");
  const source = fs.readFileSync(file, "utf8");
  assert.doesNotMatch(
    source,
    /searchParams/u,
    `${relative} must not read searchParams — it forces per-request SSR; filter on the client instead (see app/library)`
  );
  assert.doesNotMatch(
    source,
    /from ["']next\/headers["']/u,
    `${relative} must not use next/headers — it forces per-request SSR`
  );
  assert.doesNotMatch(
    source,
    /force-dynamic/u,
    `${relative} must stay statically renderable`
  );
  assert.match(
    source,
    /canonical/u,
    `${relative} must declare its own canonical (the root layout intentionally sets none)`
  );
}

// 根 layout 的 canonical 会被所有未声明 alternates 的页面继承，曾把整批
// 章节页的规范网址静默指到首页——layout 里永远不允许出现 canonical 声明。
for (const layout of ["app/(site)/layout.tsx", "app/[locale]/layout.tsx"]) {
  assert.doesNotMatch(
    fs.readFileSync(path.join(process.cwd(), ...layout.split("/")), "utf8"),
    /canonical\s*:/u,
    `${layout} must never declare an inheritable canonical`
  );
}

console.log(
  `static routing verification passed for ${staticDynamicRoutes.length} routes and ${pageFiles.length} static pages`
);
