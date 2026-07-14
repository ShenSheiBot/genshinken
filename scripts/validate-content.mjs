import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { visit } from "unist-util-visit";

const postsDirectory = path.join(process.cwd(), "source", "_posts");
const validSections = new Set(["essay", "review", "translation", "multimedia"]);
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const prohibitedMediaElement = /<\s*\/?\s*(?:iframe|video|audio|object|embed|script|style)\b/i;
const inlineEventHandler = /\son[a-z][\w:-]*\s*=/i;
const dangerousHtmlUrl = /\s(?:href|src)\s*=\s*["']?\s*(?:javascript|vbscript):/i;
const errors = [];
const warnings = [];

function report(collection, file, message) {
  collection.push(`${file}: ${message}`);
}

function parseFrontMatter(file, raw) {
  const source = raw.replace(/^\uFEFF/, "");
  try {
    if (/^\s*---\r?\n/.test(source)) {
      const parsed = matter(source);
      return { data: parsed.data, header: parsed.matter, content: parsed.content };
    }

    const lines = source.split(/\r?\n/);
    const closingDelimiter = lines.findIndex((line) => /^---\s*$/.test(line));
    if (closingDelimiter === -1) {
      report(errors, file, "缺少 front matter 结束分隔线 ---");
      return { data: {}, header: "", content: source };
    }

    const legacyHeader = lines.slice(0, closingDelimiter).join("\n");
    const parsed = matter(`---\n${legacyHeader}\n---\n`);
    return {
      data: parsed.data,
      header: legacyHeader,
      content: lines.slice(closingDelimiter + 1).join("\n"),
    };
  } catch (error) {
    report(errors, file, `front matter 无法解析：${error.message}`);
    return { data: {}, header: "", content: source };
  }
}

function straightQuoteKinds(value) {
  const kinds = [];
  if (value.includes('"')) kinds.push("ASCII 双直引号");
  if (value.includes("'")) kinds.push("ASCII 单直引号");
  return kinds;
}

function validateTypography(file, content, data) {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(content);

  visit(tree, (node) => {
    if (node.type === "text") {
      const kinds = straightQuoteKinds(node.value);
      if (kinds.length > 0) {
        const start = node.position?.start;
        const location = start ? `第 ${start.line} 行第 ${start.column} 列` : "正文";
        report(errors, file, `${location}含${kinds.join("和")}，请改用弯引号`);
      }
    }

    if (node.type === "image" || node.type === "link") {
      for (const [field, value] of [
        ["替代文字", node.alt],
        ["标题", node.title],
      ]) {
        if (typeof value !== "string") continue;
        const kinds = straightQuoteKinds(value);
        if (kinds.length > 0) {
          const line = node.position?.start?.line;
          const location = line ? `第 ${line} 行${field}` : field;
          report(errors, file, `${location}含${kinds.join("和")}，请改用弯引号`);
        }
      }
    }
  });

  function inspectMetadata(value, keyPath) {
    if (typeof value === "string") {
      const kinds = straightQuoteKinds(value);
      if (kinds.length > 0) {
        report(errors, file, `front matter 字段 ${keyPath} 含${kinds.join("和")}，请改用弯引号`);
      }
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item, index) => inspectMetadata(item, `${keyPath}[${index}]`));
      return;
    }
    if (value && typeof value === "object") {
      for (const [key, item] of Object.entries(value)) {
        inspectMetadata(item, keyPath ? `${keyPath}.${key}` : key);
      }
    }
  }

  inspectMetadata(data, "");
}

function toList(value) {
  if (value == null || value === "") return [];
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  return String(value)
    .split(/[,，]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalized(value) {
  return value.normalize("NFKC").toLocaleLowerCase("zh-CN");
}

function duplicates(values) {
  const seen = new Set();
  const duplicateValues = new Set();
  for (const value of values) {
    const key = normalized(value);
    if (seen.has(key)) duplicateValues.add(value);
    seen.add(key);
  }
  return [...duplicateValues];
}

function isDraft(value) {
  if (typeof value === "boolean") return value;
  return typeof value === "string" && /^(true|yes|1)$/i.test(value.trim());
}

function rawScalar(header, key) {
  const match = header.match(new RegExp(`^${key}:\\s*(.*?)\\s*$`, "m"));
  if (!match) return null;
  let value = match[1].replace(/\s+#.*$/, "").trim();
  if (
    value.length >= 2 &&
    ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'")))
  ) {
    value = value.slice(1, -1).trim();
  }
  return value;
}

function isValidPublicationDate(candidate) {
  if (typeof candidate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(candidate)) return false;
  const [year, month, day] = candidate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function hasOwn(data, key) {
  return Object.prototype.hasOwnProperty.call(data, key);
}

if (!fs.existsSync(postsDirectory)) {
  console.error(`内容目录不存在：${postsDirectory}`);
  process.exit(1);
}

const files = fs
  .readdirSync(postsDirectory)
  .filter((file) => file.endsWith(".md") && !file.startsWith("_") && !file.startsWith("."))
  .sort((a, b) => a.localeCompare(b, "zh-CN"));

const records = files.map((file) => {
  const raw = fs.readFileSync(path.join(postsDirectory, file), "utf8");
  const { data, header, content } = parseFrontMatter(file, raw);
  const slug = typeof data.slug === "string" ? data.slug.trim() : "";
  const section = typeof data.section === "string" ? data.section.trim().toLowerCase() : "";
  const categories = toList(data.categories ?? data.category);
  const tags = toList(data.tags);

  validateTypography(file, content, data);

  if (typeof data.title !== "string" || data.title.trim() === "") {
    report(errors, file, "必须填写非空 title");
  }

  if (!isValidPublicationDate(rawScalar(header, "date"))) {
    report(errors, file, "date 必须是有效的 YYYY-MM-DD");
  }

  if (hasOwn(data, "updated") && !isValidPublicationDate(rawScalar(header, "updated"))) {
    report(errors, file, "updated 必须是有效的 YYYY-MM-DD");
  }

  if (categories.length === 0) {
    report(errors, file, "必须填写至少一个 categories/category");
  }

  const fileStem = file.slice(0, -3);
  if (!slugPattern.test(fileStem)) {
    report(errors, file, "文件名必须是小写 ASCII kebab-case，并建议与显式 slug 保持一致");
  }

  if (!slug) {
    report(errors, file, "必须显式填写 slug，不能依赖文件名回退");
  } else if (!slugPattern.test(slug)) {
    report(errors, file, `slug 必须是小写 ASCII kebab-case，当前为 ${JSON.stringify(slug)}`);
  }

  if (!validSections.has(section)) {
    report(
      errors,
      file,
      "section 必须是 essay / review / translation / multimedia 之一"
    );
  }

  if (section === "multimedia") {
    if (prohibitedMediaElement.test(raw)) {
      report(errors, file, "多媒体条目不得包含播放器、嵌入、script 或 style 原生标签");
    }
    if (inlineEventHandler.test(raw)) {
      report(errors, file, "多媒体条目不得包含 onload/onerror 等内联事件属性");
    }
    if (dangerousHtmlUrl.test(raw)) {
      report(errors, file, "多媒体条目不得包含 javascript:/vbscript: URL");
    }
  }

  const repeatedCategories = duplicates(categories);
  if (repeatedCategories.length > 0) {
    report(errors, file, `主题分类存在重复：${repeatedCategories.join("、")}`);
  }

  const repeatedTags = duplicates(tags);
  if (repeatedTags.length > 0) {
    report(errors, file, `标签存在重复：${repeatedTags.join("、")}`);
  }

  const categoryKeys = new Set(categories.map(normalized));
  const overlap = tags.filter((tag) => categoryKeys.has(normalized(tag)));
  if (overlap.length > 0) {
    report(errors, file, `主题分类与标签不得重复：${[...new Set(overlap)].join("、")}`);
  }

  if (hasOwn(data, "featured_order")) {
    const value = data.featured_order;
    const numeric =
      typeof value === "number"
        ? value
        : typeof value === "string" && value.trim() !== ""
          ? Number(value)
          : Number.NaN;
    if (!Number.isFinite(numeric)) {
      report(errors, file, "featured_order 必须是有限数值");
    }
  }

  const hasRelatedPosts = hasOwn(data, "related_posts");
  const relatedPosts = toList(data.related_posts);
  if (hasRelatedPosts && section !== "multimedia") {
    report(errors, file, "related_posts 只允许用于 section: multimedia");
  }
  const repeatedRelatedPosts = duplicates(relatedPosts);
  if (repeatedRelatedPosts.length > 0) {
    report(errors, file, `related_posts 存在重复 slug：${repeatedRelatedPosts.join("、")}`);
  }

  return {
    file,
    slug,
    section,
    draft: isDraft(data.draft),
    relatedPosts,
  };
});

const recordsBySlug = new Map();
for (const record of records) {
  if (!record.slug) continue;
  const existing = recordsBySlug.get(record.slug);
  if (existing) {
    report(errors, record.file, `slug 与 ${existing.file} 重复：${record.slug}`);
  } else {
    recordsBySlug.set(record.slug, record);
  }
}

for (const record of records) {
  for (const relatedSlug of record.relatedPosts) {
    if (!slugPattern.test(relatedSlug)) {
      report(errors, record.file, `related_posts 含非法 slug：${relatedSlug}`);
      continue;
    }
    if (relatedSlug === record.slug) {
      report(errors, record.file, `related_posts 不得指向自身：${relatedSlug}`);
      continue;
    }
    const target = recordsBySlug.get(relatedSlug);
    if (!target) {
      report(errors, record.file, `related_posts 指向不存在的 slug：${relatedSlug}`);
      continue;
    }
    if (target.draft) {
      report(errors, record.file, `related_posts 不得指向草稿：${relatedSlug}`);
    }
    if (target.section === "multimedia") {
      report(errors, record.file, `related_posts 必须指向非多媒体文稿：${relatedSlug}`);
    }
  }
}

for (const warning of warnings) console.warn(`警告：${warning}`);

if (errors.length > 0) {
  console.error(`\n内容校验失败（${errors.length} 项）：`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`内容校验通过：${records.length} 篇文稿，${warnings.length} 项非阻塞警告。`);
