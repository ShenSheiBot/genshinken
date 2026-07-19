import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import { CONTRIBUTORS } from "../lib/contributors.ts";

const postsDirectory = path.join(process.cwd(), "source", "_posts");
const booksDirectory = path.join(process.cwd(), "source", "_books");
const topicsDirectory = path.join(process.cwd(), "source", "_topics");
const publicDirectory = path.join(process.cwd(), "public");
const validSections = new Set(["essay", "review", "translation", "multimedia"]);
const validBookStatuses = new Set(["serializing", "complete", "paused"]);
const validTopicStatuses = new Set(["ongoing", "complete", "archived"]);
const validTopicItemTypes = new Set(["post", "book", "media"]);
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const prohibitedMediaElement = /<\s*\/?\s*(?:iframe|video|audio|object|embed|script|style)\b/i;
const inlineEventHandler = /\son[a-z][\w:-]*\s*=/i;
const dangerousHtmlUrl = /\s(?:href|src)\s*=\s*["']?\s*(?:javascript|vbscript):/i;
const errors = [];
const warnings = [];

const creditFields = [
  { role: "作者", keys: ["post_author", "author", "作者"], required: true },
  { role: "译者", keys: ["translator", "译者", "翻译"], required: false },
];
const unsupportedCreditFields = ["editor", "编者", "编辑", "proofreader", "校对", "校对者", "校"];

function report(collection, file, message) {
  collection.push(`${file}: ${message}`);
}

function validateUntrustedHtml(file, value, label) {
  if (prohibitedMediaElement.test(value)) {
    report(errors, file, `${label} 不得包含播放器、嵌入、script 或 style 原生标签`);
  }
  if (inlineEventHandler.test(value)) {
    report(errors, file, `${label} 不得包含 onload/onerror 等内联事件属性`);
  }
  if (dangerousHtmlUrl.test(value)) {
    report(errors, file, `${label} 不得包含 javascript:/vbscript: URL`);
  }
}

// 正文本地图片存在性校验：src 映射到 public/ 下（渲染管线把 attachments/x 与 /x
// 都改写为 /attachments/... 或 /x）；写错图名会静默上线 404 破图，这里在构建期拦下。
function checkLocalAsset(file, rawSrc, line) {
  const src = String(rawSrc ?? "").trim();
  if (!src || /^(https?:|data:|mailto:|tel:|#)/i.test(src) || src.startsWith("//")) return;
  const pathname = src.replace(/^\.?\//, "").split(/[?#]/, 1)[0];
  if (!pathname) return;
  const root = path.resolve(publicDirectory);
  const asset = path.resolve(publicDirectory, pathname);
  if (!asset.startsWith(`${root}${path.sep}`) || !fs.existsSync(asset) || !fs.statSync(asset).isFile()) {
    report(errors, file, `${line ? `第 ${line} 行` : "正文"}图片指向的 public 文件不存在：${src}`);
  }
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

    if (node.type === "image" && typeof node.url === "string") {
      checkLocalAsset(file, node.url, node.position?.start?.line);
    }

    // 残留的 Outline mention:// 内链在公网无意义，渲染期会被静默降级为死链纯文本；构建期拦下。
    if (node.type === "link" && typeof node.url === "string" && /^\s*mention:/i.test(node.url)) {
      const line = node.position?.start?.line;
      report(errors, file, `${line ? `第 ${line} 行` : "正文"}残留 Outline mention:// 内链，请替换为真实 URL 或纯文本`);
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

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}

function stringArray(value, file, field, { required = false } = {}) {
  if (!Array.isArray(value)) {
    report(errors, file, `${field} 必须是字符串数组`);
    return [];
  }
  const strings = [];
  value.forEach((item, index) => {
    if (!nonEmptyString(item)) {
      report(errors, file, `${field}[${index}] 必须是非空字符串`);
    } else {
      strings.push(item.trim());
    }
  });
  if (required && strings.length === 0) report(errors, file, `${field} 至少需要一项`);
  return strings;
}

function validateBookDownloadUrl(file, field, value) {
  if (value == null) return;
  if (!nonEmptyString(value)) {
    report(errors, file, `${field} 如填写必须是非空 URL`);
    return;
  }

  const href = value.trim();
  if (href.startsWith("/")) {
    const base = new URL("https://un-canon.invalid");
    let resolved;
    try {
      resolved = new URL(href, base);
    } catch {
      report(errors, file, `${field} 必须是站内根相对路径或 HTTP(S) URL`);
      return;
    }
    if (resolved.origin !== base.origin) {
      report(errors, file, `${field} 不能使用 protocol-relative 或反斜杠伪装的外站 URL`);
      return;
    }

    const pathname = href.split(/[?#]/, 1)[0];
    const root = path.resolve(publicDirectory);
    const asset = path.resolve(publicDirectory, `.${pathname}`);
    if (!asset.startsWith(`${root}${path.sep}`) || !fs.existsSync(asset) || !fs.statSync(asset).isFile()) {
      report(errors, file, `${field} 指向的 public 文件不存在：${href}`);
    }
    return;
  }

  try {
    const parsed = new URL(href);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") return;
  } catch {
    // Report the field-specific error below.
  }
  report(errors, file, `${field} 必须是站内根相对路径或 HTTP(S) URL`);
}

function markdownFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs
    .readdirSync(directory)
    .filter((file) => file.endsWith(".md") && !file.startsWith("_") && !file.startsWith("."))
    .sort((a, b) => a.localeCompare(b, "zh-CN"));
}

function jsonFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs
    .readdirSync(directory)
    .filter((file) => file.endsWith(".json") && !file.startsWith("_") && !file.startsWith("."))
    .sort((a, b) => a.localeCompare(b, "en"));
}

function splitCreditNames(value) {
  const values = Array.isArray(value) ? value : [value];
  return values.flatMap((item) =>
    String(item)
      .split(/[,，、;；\n]+|\u3000+/u)
      .map((name) => name.trim())
      .filter(Boolean)
  );
}

const contributorIds = new Set();
const contributorNames = new Map();
const teamOrders = new Set();
for (const contributor of CONTRIBUTORS) {
  const file = "lib/contributors.ts";
  if (!slugPattern.test(contributor.id)) {
    report(errors, file, `贡献者 id 必须是小写 ASCII kebab-case：${contributor.id}`);
  }
  if (contributorIds.has(contributor.id)) {
    report(errors, file, `贡献者 id 重复：${contributor.id}`);
  }
  contributorIds.add(contributor.id);

  for (const name of [contributor.displayName, ...contributor.aliases]) {
    if (!nonEmptyString(name)) {
      report(errors, file, `贡献者 ${contributor.id} 含空白姓名或别名`);
      continue;
    }
    const key = normalized(name.trim().replace(/\s+/gu, " "));
    const owner = contributorNames.get(key);
    if (owner && owner !== contributor.id) {
      report(errors, file, `姓名或别名“${name}”同时属于 ${owner} 与 ${contributor.id}`);
    } else {
      contributorNames.set(key, contributor.id);
    }
  }

  if (contributor.teamOrder != null) {
    if (!Number.isInteger(contributor.teamOrder) || contributor.teamOrder < 0) {
      report(errors, file, `${contributor.id} 的 teamOrder 必须是非负整数`);
    } else if (teamOrders.has(contributor.teamOrder)) {
      report(errors, file, `teamOrder 重复：${contributor.teamOrder}`);
    }
    teamOrders.add(contributor.teamOrder);
  }
  if (!contributor.teamMember && (contributor.teamTitle || contributor.bio || contributor.teamOrder != null)) {
    report(warnings, file, `${contributor.id} 不是团队成员，但填写了团队展示字段`);
  }
}

function contributorIdFor(value) {
  const trimmed = String(value).trim();
  if (contributorIds.has(trimmed)) return trimmed;
  return contributorNames.get(normalized(trimmed.replace(/\s+/gu, " "))) ?? null;
}

function validateContributorNames(file, field, names, { required = false } = {}) {
  if (required && names.length === 0) report(errors, file, `${field} 至少需要一位贡献者`);
  const ids = [];
  for (const name of names) {
    const id = contributorIdFor(name);
    if (!id) {
      report(errors, file, `${field} 署名“${name}”尚未登记到 lib/contributors.ts`);
    } else {
      ids.push(id);
    }
  }
  const repeated = duplicates(ids);
  if (repeated.length > 0) report(errors, file, `${field} 含重复贡献者：${repeated.join("、")}`);
}

function requiredRecordString(record, field, file) {
  const value = record[field];
  if (!nonEmptyString(value)) {
    report(errors, file, `${field} 必须是非空字符串`);
    return "";
  }
  return value.trim();
}

function stableRecordId(record, field, file) {
  const value = requiredRecordString(record, field, file);
  if (value && !slugPattern.test(value)) {
    report(errors, file, `${field} 必须是小写 ASCII kebab-case：${value}`);
  }
  return value;
}

function recordDate(record, field, file) {
  const value = requiredRecordString(record, field, file);
  if (value && !isValidPublicationDate(value)) {
    report(errors, file, `${field} 必须是有效的 YYYY-MM-DD`);
  }
  return value;
}

if (!fs.existsSync(postsDirectory)) {
  console.error(`内容目录不存在：${postsDirectory}`);
  process.exit(1);
}

const files = markdownFiles(postsDirectory);

const records = files.map((file) => {
  const raw = fs.readFileSync(path.join(postsDirectory, file), "utf8");
  const { data, header, content } = parseFrontMatter(file, raw);
  const slug = typeof data.slug === "string" ? data.slug.trim() : "";
  const section = typeof data.section === "string" ? data.section.trim().toLowerCase() : "";
  const categories = toList(data.categories ?? data.category);
  const tags = toList(data.tags);
  const dateISO = rawScalar(header, "date") ?? "";
  const updatedISO = rawScalar(header, "updated") ?? dateISO;

  validateTypography(file, content, data);

  if (typeof data.title !== "string" || data.title.trim() === "") {
    report(errors, file, "必须填写非空 title");
  }

  for (const field of creditFields) {
    const key = field.keys.find((candidate) => {
      const value = data[candidate];
      return value != null && (Array.isArray(value) ? value.length > 0 : String(value).trim() !== "");
    });
    const names = key ? splitCreditNames(data[key]) : [];
    validateContributorNames(file, field.role, names, { required: field.required });
  }
  for (const field of unsupportedCreditFields) {
    if (hasOwn(data, field)) {
      report(errors, file, `${field} 不是受支持的署名字段；只允许作者与译者`);
    }
  }

  if (!isValidPublicationDate(rawScalar(header, "date"))) {
    report(errors, file, "date 必须是有效的 YYYY-MM-DD");
  }

  if (hasOwn(data, "updated") && !isValidPublicationDate(rawScalar(header, "updated"))) {
    report(errors, file, "updated 必须是有效的 YYYY-MM-DD");
  }

  // 与书籍(updatedAt>=publishedAt)、专题(updated>=published)对称：修订日不得早于发布日，
  // 否则会生成早于发布的 sitemap lastmod 与 JSON-LD dateModified。
  if (updatedISO && dateISO && updatedISO < dateISO) {
    report(errors, file, `updated (${updatedISO}) 不能早于 date (${dateISO})`);
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

  // 正文 HTML 消毒门禁：所有栏目都扫描（此前仅 multimedia），堵住 essay/review/translation
  // 正文经 lib/markdown.ts allowDangerousHtml 原样透传 + dangerouslySetInnerHTML 注入的存储型 XSS 面。
  validateUntrustedHtml(file, raw, section === "multimedia" ? "多媒体条目" : "正文");

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
    dateISO,
    updatedISO,
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

const bookRecords = jsonFiles(booksDirectory)
  .map((fileName) => {
    const file = path.join("source", "_books", fileName).replaceAll("\\", "/");
    let data;
    try {
      data = JSON.parse(fs.readFileSync(path.join(booksDirectory, fileName), "utf8"));
    } catch (error) {
      report(errors, file, `JSON 无法解析：${error.message}`);
      return null;
    }
    if (!isRecord(data)) {
      report(errors, file, "清单顶层必须是对象");
      return null;
    }

    validateTypography(file, "", data);
    const id = stableRecordId(data, "id", file);
    const slug = stableRecordId(data, "slug", file);
    const documentSlug = stableRecordId(data, "documentSlug", file);
    const title = requiredRecordString(data, "title", file);
    requiredRecordString(data, "subtitle", file);
    requiredRecordString(data, "description", file);
    const status = requiredRecordString(data, "status", file);
    if (status && !validBookStatuses.has(status)) {
      report(errors, file, "status 必须是 serializing / complete / paused 之一");
    }
    const publishedAt = recordDate(data, "publishedAt", file);
    const updatedAt = recordDate(data, "updatedAt", file);
    if (publishedAt && updatedAt && updatedAt < publishedAt) {
      report(errors, file, "updatedAt 不能早于 publishedAt");
    }
    const startAnchor = requiredRecordString(data, "startAnchor", file);
    const latestChapterId = stableRecordId(data, "latestChapterId", file);
    const authors = stringArray(data.authors, file, "authors", { required: true });
    const translators = stringArray(data.translators, file, "translators");
    validateContributorNames(file, "authors", authors, { required: true });
    validateContributorNames(file, "translators", translators);
    validateBookDownloadUrl(file, "pdfUrl", data.pdfUrl);
    validateBookDownloadUrl(file, "epubUrl", data.epubUrl);

    const fileStem = fileName.slice(0, -5);
    if (slug && fileStem !== slug) {
      report(errors, file, `文件名必须与 slug 一致：${slug}.json`);
    }
    if (!title) report(errors, file, "书名不能为空");

    const chapterIds = new Set();
    const chapterNumbers = new Set();
    const chapterAnchors = new Set();
    if (!Array.isArray(data.chapters) || data.chapters.length === 0) {
      report(errors, file, "chapters 至少需要一个章节");
    } else {
      data.chapters.forEach((value, index) => {
        const label = `${file}#chapters[${index}]`;
        if (!isRecord(value)) {
          report(errors, label, "章节必须是对象");
          return;
        }
        const chapterId = stableRecordId(value, "id", label);
        const number = requiredRecordString(value, "number", label);
        requiredRecordString(value, "title", label);
        const anchor = requiredRecordString(value, "anchor", label);
        const chapterDate = recordDate(value, "publishedAt", label);
        if (chapterDate && updatedAt && chapterDate > updatedAt) {
          report(errors, label, "publishedAt 不能晚于书籍 updatedAt");
        }
        for (const [set, candidate, field] of [
          [chapterIds, chapterId, "id"],
          [chapterNumbers, number, "number"],
          [chapterAnchors, anchor, "anchor"],
        ]) {
          if (!candidate) continue;
          if (set.has(candidate)) report(errors, label, `${field} 重复：${candidate}`);
          set.add(candidate);
        }
      });
    }
    if (latestChapterId && !chapterIds.has(latestChapterId)) {
      report(errors, file, `latestChapterId 未指向已声明章节：${latestChapterId}`);
    }

    return {
      file,
      id,
      slug,
      documentSlug,
      publishedAt,
      updatedAt,
      startAnchor,
    };
  })
  .filter(Boolean);

const booksBySlug = new Map();
const bookIds = new Map();
const bookDocuments = new Map();
for (const book of bookRecords) {
  for (const [map, value, field] of [
    [bookIds, book.id, "id"],
    [booksBySlug, book.slug, "slug"],
    [bookDocuments, book.documentSlug, "documentSlug"],
  ]) {
    if (!value) continue;
    const previous = map.get(value);
    if (previous) report(errors, book.file, `${field} 与 ${previous.file} 重复：${value}`);
    else map.set(value, book);
  }

  const document = recordsBySlug.get(book.documentSlug);
  if (!document) {
    report(errors, book.file, `documentSlug 指向不存在的文稿：${book.documentSlug}`);
  } else {
    if (document.draft) report(errors, book.file, `documentSlug 不得指向草稿：${book.documentSlug}`);
    if (document.section === "multimedia") {
      report(errors, book.file, `documentSlug 必须指向非多媒体文稿：${book.documentSlug}`);
    }
    if (book.updatedAt && document.updatedISO && book.updatedAt !== document.updatedISO) {
      report(
        errors,
        book.file,
        `updatedAt (${book.updatedAt}) 必须与正文 updated/date (${document.updatedISO}) 一致`
      );
    }
  }
}

const topicRecords = markdownFiles(topicsDirectory).map((fileName) => {
  const file = path.join("source", "_topics", fileName).replaceAll("\\", "/");
  const raw = fs.readFileSync(path.join(topicsDirectory, fileName), "utf8");
  const { data, header, content } = parseFrontMatter(file, raw);
  validateTypography(file, content, data);

  const fileStem = fileName.slice(0, -3);
  const slug = nonEmptyString(data.slug) ? data.slug.trim() : fileStem;
  if (!slugPattern.test(fileStem)) report(errors, file, "文件名必须是小写 ASCII kebab-case");
  if (!slugPattern.test(slug)) report(errors, file, `slug 必须是小写 ASCII kebab-case：${slug}`);
  if (slug !== fileStem) report(errors, file, `slug 必须与文件名一致：${fileStem}`);
  if (!nonEmptyString(data.title)) report(errors, file, "必须填写非空 title");
  if (!nonEmptyString(data.summary)) report(errors, file, "必须填写非空 summary");
  if (!nonEmptyString(content) && !nonEmptyString(data.introduction)) {
    report(errors, file, "必须在正文或 introduction 字段填写专题导语");
  }
  validateUntrustedHtml(
    file,
    nonEmptyString(data.introduction) ? data.introduction : content,
    "专题导语"
  );

  const status = nonEmptyString(data.status) ? data.status.trim() : "";
  if (!validTopicStatuses.has(status)) {
    report(errors, file, "status 必须是 ongoing / complete / archived 之一");
  }
  const published = rawScalar(header, "published") ?? "";
  const updated = rawScalar(header, "updated") ?? published;
  if (!isValidPublicationDate(published)) report(errors, file, "published 必须是有效的 YYYY-MM-DD");
  if (!isValidPublicationDate(updated)) report(errors, file, "updated 必须是有效的 YYYY-MM-DD");
  if (published && updated && updated < published) report(errors, file, "updated 不能早于 published");

  const groupIds = new Set();
  const itemRefs = new Set();
  if (!Array.isArray(data.groups) || data.groups.length === 0) {
    report(errors, file, "groups 至少需要一个分组");
  } else {
    data.groups.forEach((value, groupIndex) => {
      const groupFile = `${file}#groups[${groupIndex}]`;
      if (!isRecord(value)) {
        report(errors, groupFile, "分组必须是对象");
        return;
      }
      const groupId = nonEmptyString(value.id) ? value.id.trim() : "";
      if (!slugPattern.test(groupId)) report(errors, groupFile, "id 必须是小写 ASCII kebab-case");
      if (groupIds.has(groupId)) report(errors, groupFile, `id 重复：${groupId}`);
      if (groupId) groupIds.add(groupId);
      if (!nonEmptyString(value.title)) report(errors, groupFile, "title 不能为空");
      if (!Array.isArray(value.items) || value.items.length === 0) {
        report(errors, groupFile, "items 至少需要一个条目");
        return;
      }

      value.items.forEach((item, itemIndex) => {
        const itemFile = `${groupFile}.items[${itemIndex}]`;
        if (!isRecord(item)) {
          report(errors, itemFile, "条目必须是对象");
          return;
        }
        const type = nonEmptyString(item.type) ? item.type.trim() : "";
        const ref = nonEmptyString(item.ref) ? item.ref.trim() : "";
        if (!validTopicItemTypes.has(type)) {
          report(errors, itemFile, "type 必须是 post / book / media 之一");
        }
        if (!slugPattern.test(ref)) report(errors, itemFile, `ref 必须是小写 ASCII kebab-case：${ref}`);
        if (hasOwn(item, "editorialNote") && !nonEmptyString(item.editorialNote)) {
          report(errors, itemFile, "editorialNote 如填写则必须是非空字符串");
        }
        const itemKey = `${type}:${ref}`;
        if (itemRefs.has(itemKey)) report(errors, itemFile, `条目引用重复：${itemKey}`);
        if (type && ref) itemRefs.add(itemKey);

        if (type === "book") {
          if (!booksBySlug.has(ref)) report(errors, itemFile, `找不到书籍：${ref}`);
          return;
        }
        const post = recordsBySlug.get(ref);
        if (!post) {
          report(errors, itemFile, `找不到文稿：${ref}`);
          return;
        }
        if (post.draft) report(errors, itemFile, `不得引用草稿：${ref}`);
        if (type === "media" && post.section !== "multimedia") {
          report(errors, itemFile, `media 必须引用 multimedia 文稿：${ref}`);
        }
        if (type === "post" && post.section === "multimedia") {
          report(errors, itemFile, `multimedia 文稿必须使用 media 类型：${ref}`);
        }
      });
    });
  }

  return { file, slug };
});

const topicsBySlug = new Map();
for (const topic of topicRecords) {
  if (!topic.slug) continue;
  const previous = topicsBySlug.get(topic.slug);
  if (previous) report(errors, topic.file, `slug 与 ${previous.file} 重复：${topic.slug}`);
  else topicsBySlug.set(topic.slug, topic);
}

for (const warning of warnings) console.warn(`警告：${warning}`);

if (errors.length > 0) {
  console.error(`\n内容校验失败（${errors.length} 项）：`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `内容校验通过：${records.length} 篇文稿，${CONTRIBUTORS.length} 位贡献者，` +
  `${bookRecords.length} 本书，${topicRecords.length} 个专题，${warnings.length} 项非阻塞警告。`
);
