import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const postsRoot = path.join(process.cwd(), "source", "_posts");
const bodyLicense = /(?:本文|本译文|本翻译|本文章|中文公开版本)[^\n]{0,80}CC\s*BY(?:-[A-Z]+)*(?:\s*\d(?:\.\d)?)?/iu;
const failures = [];

for (const name of fs.readdirSync(postsRoot).filter((entry) => entry.endsWith(".md"))) {
  const pathname = path.join(postsRoot, name);
  const parsed = matter(fs.readFileSync(pathname, "utf8"));
  if (parsed.data.rights_notice || parsed.data.rightsNotice) {
    failures.push(`${name}: rights_notice 应使用全站默认提示，不应逐篇定义`);
  }
  parsed.content.split("\n").forEach((line, index) => {
    if (bodyLicense.test(line)) failures.push(`${name}:${index + 1}: ${line.trim()}`);
  });
}

const siteSource = fs.readFileSync(path.join(process.cwd(), "lib", "site.ts"), "utf8");
const readingSource = fs.readFileSync(
  path.join(process.cwd(), "app", "components", "reading-edition", "ReadingEdition.tsx"),
  "utf8",
);
const bookChapterSource = fs.readFileSync(
  path.join(process.cwd(), "app", "(site)", "books", "[slug]", "chapters", "[chapter]", "page.tsx"),
  "utf8",
);
const translationPageSource = fs.readFileSync(
  path.join(process.cwd(), "app", "components", "translation", "TranslationEditionPage.tsx"),
  "utf8",
);
if (!siteSource.includes("CC BY-NC-SA 4.0")
  || !siteSource.includes("布尔乔亚法权")
  || !siteSource.includes("bourgeois rights")
  || !siteSource.includes("ブルジョア法権")
  || !readingSource.includes("site.rightsNotice")
  || !bookChapterSource.includes("site.rightsNotice")
  || !translationPageSource.includes("site.rightsNotice[locale]")) {
  failures.push("全站权利提示未在中、英、日文章与文库章节阅读页统一呈现");
}

if (failures.length > 0) {
  throw new Error(
    "许可声明应位于 front matter 的 license／citation.rights，不应散落在正文：\n"
      + failures.join("\n"),
  );
}

console.log("global rights notice and structured license placement passed");
