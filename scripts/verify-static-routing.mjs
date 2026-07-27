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
  "app/posts/[slug]/page.tsx",
  "app/posts/[slug]/cite.bib/route.ts",
  "app/media/[slug]/page.tsx",
  "app/media/[slug]/cite.bib/route.ts",
  "app/topics/[slug]/page.tsx",
  "app/books/[slug]/page.tsx",
  "app/books/[slug]/chapters/[chapter]/page.tsx",
  "app/books/[slug]/chapters/[chapter]/cite.bib/route.ts",
  "app/books/[slug]/cite.bib/route.ts",
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
  "app/posts/[slug]/page.tsx",
  "app/posts/[slug]/cite.bib/route.ts",
]) {
  assert.match(
    fs.readFileSync(path.join(process.cwd(), ...route.split("/")), "utf8"),
    /getPreviewableSlugs/u,
    `${route} must enumerate local draft previews`
  );
}
for (const route of [
  "app/media/[slug]/page.tsx",
  "app/media/[slug]/cite.bib/route.ts",
]) {
  assert.match(
    fs.readFileSync(path.join(process.cwd(), ...route.split("/")), "utf8"),
    /getPreviewablePosts/u,
    `${route} must enumerate local draft previews`
  );
}

console.log(`static routing verification passed for ${staticDynamicRoutes.length} routes`);
