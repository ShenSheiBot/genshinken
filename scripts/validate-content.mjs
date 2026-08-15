import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import { CONTRIBUTORS } from "../lib/contributors.ts";
import {
  parseLegacyYamlFrontMatter,
  parseYamlFrontMatter,
} from "../lib/safe-front-matter.mjs";
import {
  bookCitationDefaults,
  mergeCitation,
  pageCitationDefaults,
  parseCitationInput,
} from "../lib/citations.ts";

const postsDirectory = path.join(process.cwd(), "source", "_posts");
const booksDirectory = path.join(process.cwd(), "source", "_books");
const topicsDirectory = path.join(process.cwd(), "source", "_topics");
const tagAliasFile = path.join(process.cwd(), "editorial-sources", "tag-aliases.json");
const publicDirectory = path.join(process.cwd(), "public");
const validSections = new Set(["essay", "review", "translation", "community", "multimedia", "negative"]);
const validHanScripts = new Set(["hans", "hant"]);
const validBookStatuses = new Set(["serializing", "complete", "paused"]);
const validBookChapterStatuses = new Set(["published", "forthcoming"]);
const validBookChapterPresentations = new Set(["reading", "reference", "navigation"]);
const validTopicStatuses = new Set(["ongoing", "complete", "archived"]);
const validTopicItemTypes = new Set(["post", "book", "media"]);
const tagAliases = fs.existsSync(tagAliasFile)
  ? JSON.parse(fs.readFileSync(tagAliasFile, "utf8")).aliases ?? {}
  : {};
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const prohibitedMediaElement = /<\s*\/?\s*(?:iframe|video|audio|object|embed|script|style)\b/i;
const inlineEventHandler = /\son[a-z][\w:-]*\s*=/i;
const dangerousHtmlUrl = /\s(?:href|src)\s*=\s*["']?\s*(?:javascript|vbscript):/i;
const protocolLessAngleLink = /<www\.[^<>\s]+>/iu;
const brokenOrderedListMarker = /^\s{0,3}\d{1,2}\.(?=\p{Script=Han})/u;
const internalEditorialLanguage = /(?:待逐篇清洗|清洗后纳入|原始(?:篇目|连载)证据|合并文库的构建源|快照与专篇|归档说明|档案说明|本站据.{0,40}(?:整理|归档)|连载暂列暂停|连载状态据此标为|后续.{0,20}未见发布|暂未见正式后续|不因此自动成为|并非按作品名重新聚类|不在本专题中扩收|不把.{0,40}扩入活动档案)/u;

assert.match(
  "<www.example.org/path>",
  protocolLessAngleLink,
  "the content gate must reject protocol-less angle-bracket links"
);
assert.doesNotMatch(
  "<https://www.example.org/path>",
  protocolLessAngleLink,
  "valid HTTP(S) autolinks must remain accepted"
);
assert.match("4.由于举办经验不足", brokenOrderedListMarker, "missing list-marker space must be detected");
assert.doesNotMatch("4. 由于举办经验不足", brokenOrderedListMarker, "valid ordered lists must remain accepted");
assert.match(
  "其余十一章已有原始篇目证据，待逐篇清洗后纳入。",
  internalEditorialLanguage,
  "internal archive workflow language must be detected"
);
assert.doesNotMatch(
  "中文译文收录第一部五章与第二部前五章。",
  internalEditorialLanguage,
  "reader-facing coverage statements must remain accepted"
);
const errors = [];
const warnings = [];

function berlinDateISO(value = process.env.UN_CANON_BUILD_TIMESTAMP) {
  const date = value ? new Date(value) : new Date();
  const safeDate = Number.isNaN(date.valueOf()) ? new Date() : date;
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(safeDate);
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${byType.year}-${byType.month}-${byType.day}`;
}

const publicationCutoffISO = berlinDateISO();

const creditFields = [
  { role: "作者", keys: ["post_author", "author", "作者"], required: true },
  { role: "译者", keys: ["translator", "译者", "翻译"], required: false },
  { role: "校对", keys: ["proofreader", "校对", "校对者", "校"], required: false },
];
const unsupportedCreditFields = ["editor", "编者", "编辑"];

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
  if (protocolLessAngleLink.test(value)) {
    report(errors, file, `${label} 的尖括号链接必须包含 http:// 或 https:// 协议`);
  }
}

function validatePublicEditorialVoice(file, value, keyPath = "公开内容") {
  if (typeof value === "string") {
    if (internalEditorialLanguage.test(value)) {
      report(errors, file, `${keyPath} 泄露内部归档／清洗判断，请改写为面向读者的内容与范围说明`);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => validatePublicEditorialVoice(file, item, `${keyPath}[${index}]`));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      validatePublicEditorialVoice(file, item, `${keyPath}.${key}`);
    }
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
    if (/^---[^\r\n]*\r?(?:\n|$)/.test(source)) {
      const parsed = parseYamlFrontMatter(source);
      return { data: parsed.data, header: parsed.matter, content: parsed.content };
    }

    const lines = source.split(/\r?\n/);
    const closingDelimiter = lines.findIndex((line) => /^---\s*$/.test(line));
    if (closingDelimiter === -1) {
      report(errors, file, "缺少 front matter 结束分隔线 ---");
      return { data: {}, header: "", content: source };
    }

    const legacyHeader = lines.slice(0, closingDelimiter).join("\n");
    const parsed = parseLegacyYamlFrontMatter(legacyHeader);
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
  content.split(/\r?\n/u).forEach((line, index) => {
    if (brokenOrderedListMarker.test(line)) {
      report(
        errors,
        file,
        `第 ${index + 1} 行疑似有序列表序号后缺少空格；请写成“${line.trimStart().match(/^\d+\./u)?.[0]} …”`,
      );
    }
  });

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

/* ---------------- 随笔正文排版契约（TYPO-P1/P2/P3/P4/P5） ----------------
   2026-08 的 343 处手工标点修复（8573c815、d23f1346）暴露的规则此前只存在
   于提交信息里，门禁从未检查。这里按「段尾字符白名单 + 字符类禁令」实现，
   不做坏模式枚举（枚举法漏掉过以）结尾的段落）。适用范围：非 book_document
   的文稿——译制书籍源含索引、书目、表格等结构，段末句号规则不适用。
   存量违规登记在 scripts/typography-grandfathered.json，只减不增：修复后
   必须同步从豁免清单移除，新增违规立即报错。 */
const PROSE_TERMINAL = /[。！？…—：；.!?][”’》〉」』）】"')\]]*$/u;
const STAGE_DIRECTION = /】$/u; // 演讲记录的舞台指示：【掌声】【笑声】
// 引文出处括号：。”（《列宁全集》…）；引文以省略号收尾、后带补语括号或书名号
// 闭合符时同属一类（〔……〕”（…）），故句读与（ 之间允许任意闭合符。
const CITATION_PAREN = /[。！？…][”’》〉」』）】〕]*（[^（）]+）$/u;
const MARKER_LINE = /^[[〔［]/u; // [图题]/[表注]/〔章题注〕等标记行
const ATTRIBUTION_LINE = /^[—―─]/u; // 题词署名行：——某某
const CJK_HALFWIDTH_HYPHEN = /\p{Script=Han}-[\p{Script=Han}0-9]|[0-9]-\p{Script=Han}/gu;
const CJK_YEAR_SPAN = /\p{Script=Han}.{0,2}\d{4}\s*-\s*\d{1,4}(?!\d)|\d{4}\s*-\s*\d{1,4}(?!\d)(?=.{0,2}\p{Script=Han})/gu;

// 按脚本自身位置解析（而非 cwd）：verify-negative-section.mjs 会在临时
// 沙箱目录里以本脚本跑 fixture，沙箱只复制 source/ 与 public/。
const grandfatheredTypography = JSON.parse(
  fs.readFileSync(new URL("./typography-grandfathered.json", import.meta.url), "utf8")
);
const grandfatheredUnused = {
  terminal: new Map(Object.entries(grandfatheredTypography.terminal).flatMap(([file, keys]) =>
    keys.map((key, index) => [`${file}#${key}#${index}`, { file, key }])
  )),
  hyphen: new Map(Object.entries(grandfatheredTypography.hyphen).flatMap(([file, keys]) =>
    keys.map((key, index) => [`${file}#${key}#${index}`, { file, key }])
  )),
};

function consumeGrandfathered(kind, ledgerFile, key) {
  for (const [id, entry] of grandfatheredUnused[kind]) {
    if (entry.file === ledgerFile && entry.key === key) {
      grandfatheredUnused[kind].delete(id);
      return true;
    }
  }
  return false;
}

function paragraphProseText(node) {
  let out = "";
  (function walk(child) {
    if (child.type === "text" || child.type === "inlineCode") out += child.value;
    else if (child.type === "footnoteReference" || child.type === "image") return;
    else if (child.children) child.children.forEach(walk);
  })(node);
  return out.trim();
}

const tableLikeParagraph = (text) =>
  (text.match(/\d+(?:\.\d+)?%/gu) || []).length >= 3 || (text.match(/　/gu) || []).length >= 2;

/** 站外资源行：整段实质是入口链接（网盘/镜像 + 提取码），不是行文句子。
    判据取「段内含链接，且链接以外的文字不超过 24 字」，普通行文里的内链
    段落（链接外仍是成句的散文）因此不受豁免。 */
function resourceLine(node) {
  const hasLink = (node.children ?? []).some(
    (child) => child.type === "link" || child.type === "linkReference"
  );
  if (!hasLink) return false;
  let outside = "";
  (function walk(child) {
    if (child.type === "link" || child.type === "linkReference") return;
    if (child.type === "text" || child.type === "inlineCode") outside += child.value;
    else if (child.children) child.children.forEach(walk);
  })(node);
  return outside.trim().length <= 24;
}

function validateProseTypography(file, content, ledgerFile, title = "") {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(content);

  (function walk(node, skip) {
    if (["heading", "html", "code", "table"].includes(node.type)) return;
    const nestedSkip = skip || ["blockquote", "list", "footnoteDefinition"].includes(node.type);

    if (node.type === "paragraph" && !skip) {
      const text = paragraphProseText(node);
      if (
        text && /\p{Script=Han}/u.test(text) && text.length >= 10 &&
        !MARKER_LINE.test(text) && !ATTRIBUTION_LINE.test(text) && !tableLikeParagraph(text) &&
        // 标题回显行：多媒体条目的「原始说明」按存档原样以标题起头。
        text !== title && !resourceLine(node) &&
        !PROSE_TERMINAL.test(text) && !STAGE_DIRECTION.test(text) && !CITATION_PAREN.test(text) &&
        !consumeGrandfathered("terminal", ledgerFile, text.slice(-24))
      ) {
        const line = node.position?.start?.line;
        report(errors, file, `${line ? `第 ${line} 行` : "正文"}段落未以句读收尾（…${text.slice(-18)}），正文段落须以 。！？…—：； 等终结（TYPO-P1）`);
      }
    }

    if ((node.type === "text" || node.type === "inlineCode") && node.value && !skip) {
      for (const match of node.value.matchAll(CJK_HALFWIDTH_HYPHEN)) {
        const key = node.value.slice(Math.max(0, match.index - 4), match.index + 8);
        if (consumeGrandfathered("hyphen", ledgerFile, key)) continue;
        const line = node.position?.start?.line;
        report(errors, file, `${line ? `第 ${line} 行` : "正文"}汉字相邻处使用半角连字符（…${key}…），须改用全角 －（TYPO-P4）`);
      }
      for (const match of node.value.matchAll(CJK_YEAR_SPAN)) {
        const line = node.position?.start?.line;
        report(errors, file, `${line ? `第 ${line} 行` : "正文"}中文语境的年份区间用了半角连字符（…${node.value.slice(Math.max(0, match.index - 4), match.index + 12)}…），须写全并用全角 －（TYPO-P5）`);
      }
    }

    node.children?.forEach((child) => walk(child, nestedSkip));
  })(tree, false);
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

function validateControlledTags(file, tags) {
  const repeatedTags = duplicates(tags);
  if (repeatedTags.length > 0) {
    report(errors, file, `标签存在重复：${repeatedTags.join("、")}`);
  }

  const deprecatedTags = tags.filter((tag) => Object.prototype.hasOwnProperty.call(tagAliases, tag));
  if (deprecatedTags.length > 0) {
    const replacements = deprecatedTags.map((tag) => `${tag}→${tagAliases[tag]}`);
    report(errors, file, `标签使用已裁定别名，请改用规范词：${replacements.join("、")}`);
  }
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

const titleFunctionWordStart = /^[的之与及而或于在把被从向为以]/u;

function badTitleStart(value) {
  return titleFunctionWordStart.test(value) && !/^(为何|为了|为着)/u.test(value);
}

function titleLength(value) {
  return Array.from(String(value).replace(/\s+/gu, "")).length;
}

function titleWordBoundaries(title) {
  const boundaries = new Set();
  if (typeof Intl.Segmenter === "function") {
    const segmenter = new Intl.Segmenter("zh-CN", { granularity: "word" });
    for (const segment of segmenter.segment(title)) {
      boundaries.add(segment.index + segment.segment.length);
    }
  }
  for (let index = 1; index < title.length; index += 1) {
    if (/[，。！？；：、—）】》]/u.test(title[index - 1])) boundaries.add(index);
  }
  boundaries.delete(0);
  boundaries.delete(title.length);
  return boundaries;
}

function suggestTitleBreaks(title) {
  if (titleLength(title) <= 8) return [title];
  const boundaries = [...titleWordBoundaries(title)];
  const candidates = boundaries.length > 0
    ? boundaries
    : Array.from({ length: Math.max(0, title.length - 1) }, (_, index) => index + 1);
  const best = candidates
    .map((index) => {
      const first = title.slice(0, index);
      const second = title.slice(index);
      const firstLength = titleLength(first);
      const secondLength = titleLength(second);
      const badStart = badTitleStart(second) ? 100 : 0;
      const punctuationBonus = /[，。！？；：、—]$/u.test(first) ? -4 : 0;
      return { first, second, score: Math.abs(firstLength - secondLength) + badStart + punctuationBonus };
    })
    .sort((a, b) => a.score - b.score)[0];
  return best ? [best.first, best.second] : [title];
}

function validateTitleBreaks(file, data) {
  const title = nonEmptyString(data.title) ? data.title.trim() : "";
  if (!title) return;
  if (hasOwn(data, "home_title_breaks")) {
    const homeSegments = stringArray(
      data.home_title_breaks,
      file,
      "home_title_breaks",
      { required: true }
    );
    if (homeSegments.length === 0 || homeSegments.join("") !== title) {
      report(errors, file, "home_title_breaks 按顺序拼接后必须与 title 完全一致");
    }
  }
  if (!hasOwn(data, "title_breaks")) {
    report(
      warnings,
      file,
      `未填写 title_breaks；建议：title_breaks: ${JSON.stringify(suggestTitleBreaks(title))}`
    );
    return;
  }
  const segments = stringArray(data.title_breaks, file, "title_breaks", { required: true });
  if (segments.length === 0 || segments.join("") !== title) {
    report(errors, file, "title_breaks 按顺序拼接后必须与 title 完全一致");
    return;
  }
  const wordBoundaries = titleWordBoundaries(title);
  let offset = 0;
  segments.slice(0, -1).forEach((segment, index) => {
    offset += segment.length;
    const next = segments[index + 1];
    if (badTitleStart(next)) {
      report(warnings, file, `title_breaks[${index + 1}] 以非实词“${next[0]}”开头，建议前移断点`);
    }
    if (wordBoundaries.size > 0 && !wordBoundaries.has(offset)) {
      report(warnings, file, `title_breaks 在“${segment.slice(-3)}｜${next.slice(0, 3)}”之间可能切入实词`);
    }
  });
  if (segments.length === 2) {
    const lengths = segments.map(titleLength);
    const shorter = Math.min(...lengths);
    const longer = Math.max(...lengths);
    if (shorter / longer < 0.5) {
      report(warnings, file, `title_breaks 两行长度差距过大（${lengths.join(" / ")}），请重新平衡`);
    }
  }
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

/** Absent is fine; present but blank is not. Used for fields a source edition may simply lack. */
function optionalRecordString(record, field, file) {
  if (record[field] == null) return undefined;
  return requiredRecordString(record, field, file);
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
  const script = typeof data.script === "string" ? data.script.trim().toLowerCase() : "";
  const categories = toList(data.categories ?? data.category);
  const tags = toList(data.tags);
  const dateISO = rawScalar(header, "date") ?? "";
  const updatedISO = rawScalar(header, "updated") ?? dateISO;
  const draft = isDraft(data.draft);
  const bookDocument = isDraft(data.book_document);

  if (hasOwn(data, "book_document") && typeof data.book_document !== "boolean") {
    report(errors, file, "book_document 必须是布尔值 true / false");
  }

  validateTypography(file, content, data);
  validatePublicEditorialVoice(file, data, "front matter");
  if (!bookDocument) {
    validateProseTypography(
      file,
      content,
      `source/_posts/${file}`,
      typeof data.title === "string" ? data.title.trim() : ""
    );
  }

  if (typeof data.title !== "string" || data.title.trim() === "") {
    report(errors, file, "必须填写非空 title");
  }
  validateTitleBreaks(file, data);

  for (const field of creditFields) {
    const key = field.keys.find((candidate) => {
      const value = data[candidate];
      return value != null && (Array.isArray(value) ? value.length > 0 : String(value).trim() !== "");
    });
    const names = key ? splitCreditNames(data[key]) : [];
    validateContributorNames(file, field.role, names, { required: field.required });
  }

  let citationKey = "";
  try {
    const citationInput = data.citation == null
      ? undefined
      : parseCitationInput(data.citation, `${file}: citation`);
    if (citationInput && !citationInput.itemType) {
      report(errors, file, "citation.itemType 必须显式填写 Zotero item type");
    }
    const creators = creditFields.flatMap((field) => {
      if (field.role === "校对") return [];
      const key = field.keys.find((candidate) => {
        const value = data[candidate];
        return value != null && (Array.isArray(value) ? value.length > 0 : String(value).trim() !== "");
      });
      if (!key) return [];
      const creatorType = field.role === "译者" ? "translator" : "author";
      return splitCreditNames(data[key]).map((name) => ({ creatorType, name }));
    });
    const citation = mergeCitation(
      pageCitationDefaults({
        slug,
        section,
        script,
        title: nonEmptyString(data.title) ? data.title.trim() : file.slice(0, -3),
        subtitle: nonEmptyString(data.subtitle) ? data.subtitle.trim() : undefined,
        creators,
        date: dateISO,
        abstractNote: nonEmptyString(data.excerpt) ? data.excerpt.trim() : undefined,
        rights: nonEmptyString(data.license) ? data.license.trim() : undefined,
      }),
      citationInput,
      `${file}: citation`
    );
    citationKey = citation.citationKey;
  } catch (error) {
    report(errors, file, error instanceof Error ? error.message : String(error));
  }

  for (const field of unsupportedCreditFields) {
    if (hasOwn(data, field)) {
      report(errors, file, `${field} 不是受支持的署名字段；只允许作者、译者与校对`);
    }
  }

  if (!isValidPublicationDate(rawScalar(header, "date"))) {
    report(errors, file, "date 必须是有效的 YYYY-MM-DD");
  }

  if (hasOwn(data, "updated") && !isValidPublicationDate(rawScalar(header, "updated"))) {
    report(errors, file, "updated 必须是有效的 YYYY-MM-DD");
  }

  const originalDateISO = rawScalar(header, "original_date") ?? "";
  if (hasOwn(data, "original_date") && !isValidPublicationDate(originalDateISO)) {
    report(errors, file, "original_date 必须是有效的 YYYY-MM-DD");
  }
  if (section === "negative" && !isValidPublicationDate(originalDateISO)) {
    report(errors, file, "section: negative 必须填写 original_date，作为原文写作日期");
  }

  // 与书籍(updatedAt>=publishedAt)、专题(updated>=published)对称：修订日不得早于发布日，
  // 否则会生成早于发布的 sitemap lastmod 与 JSON-LD dateModified。
  if (updatedISO && dateISO && updatedISO < dateISO) {
    report(errors, file, `updated (${updatedISO}) 不能早于 date (${dateISO})`);
  }
  if (!draft && dateISO > publicationCutoffISO) {
    report(errors, file, `date (${dateISO}) 晚于公开构建日期 (${publicationCutoffISO})；请设为草稿或延后部署`);
  }
  if (!draft && updatedISO > publicationCutoffISO) {
    report(errors, file, `updated (${updatedISO}) 晚于公开构建日期 (${publicationCutoffISO})`);
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
      "section 必须是 essay / review / translation / community / multimedia / negative 之一"
    );
  }

  if (!validHanScripts.has(script)) {
    report(errors, file, "script 必须显式填写 hans 或 hant");
  }

  // 正文 HTML 消毒门禁：所有栏目都扫描（此前仅 multimedia），堵住 essay/review/translation
  // 正文经 lib/markdown.ts allowDangerousHtml 原样透传 + dangerouslySetInnerHTML 注入的存储型 XSS 面。
  validateUntrustedHtml(file, raw, section === "multimedia" ? "多媒体条目" : "正文");

  const repeatedCategories = duplicates(categories);
  if (repeatedCategories.length > 0) {
    report(errors, file, `主题分类存在重复：${repeatedCategories.join("、")}`);
  }

  validateControlledTags(file, tags);

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
    script,
    section,
    draft,
    bookDocument,
    relatedPosts,
    dateISO,
    updatedISO,
    citationKey,
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
    if (target.bookDocument) {
      report(errors, record.file, `related_posts 不得指向书籍构建源：${relatedSlug}`);
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
    validatePublicEditorialVoice(file, data, "书籍清单");
    const id = stableRecordId(data, "id", file);
    const slug = stableRecordId(data, "slug", file);
    const documentSlug = stableRecordId(data, "documentSlug", file);
    const script = requiredRecordString(data, "script", file);
    if (script && !validHanScripts.has(script)) {
      report(errors, file, "script 必须显式填写 hans 或 hant");
    }
    const title = requiredRecordString(data, "title", file);
    optionalRecordString(data, "subtitle", file);
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
    if (publishedAt > publicationCutoffISO) {
      report(errors, file, `publishedAt (${publishedAt}) 晚于公开构建日期 (${publicationCutoffISO})`);
    }
    if (updatedAt > publicationCutoffISO) {
      report(errors, file, `updatedAt (${updatedAt}) 晚于公开构建日期 (${publicationCutoffISO})`);
    }
    const latestChapterId = stableRecordId(data, "latestChapterId", file);
    const authors = stringArray(data.authors, file, "authors", { required: true });
    const translators = stringArray(data.translators, file, "translators");
    const proofreaders = data.proofreaders == null
      ? []
      : stringArray(data.proofreaders, file, "proofreaders");
    validateContributorNames(file, "authors", authors, { required: true });
    validateContributorNames(file, "translators", translators);
    validateContributorNames(file, "proofreaders", proofreaders);
    validateBookDownloadUrl(file, "pdfUrl", data.pdfUrl);
    validateBookDownloadUrl(file, "epubUrl", data.epubUrl);
    if (hasOwn(data, "originalBibtex") || hasOwn(data, "translationBibtex")) {
      report(errors, file, "请把原始 BibTeX 字符串迁移到 Zotero 结构化 citations 对象");
    }

    const citationKeys = [];
    try {
      if (!isRecord(data.citations)) throw new Error(`${file}: citations 必须是对象`);
      const translationInput = parseCitationInput(
        data.citations.translation,
        `${file}: citations.translation`
      );
      if (translationInput.itemType !== "book") {
        throw new Error(`${file}: citations.translation.itemType 必须是 book`);
      }
      const creatorName = (name) => {
        const id = contributorIdFor(name);
        return CONTRIBUTORS.find((contributor) => contributor.id === id)?.displayName ?? name;
      };
      const translation = mergeCitation(
        bookCitationDefaults({
          slug,
          script,
          title,
          subtitle: nonEmptyString(data.subtitle) ? data.subtitle.trim() : undefined,
          creators: [
            ...authors.map((name) => ({ creatorType: "author", name: creatorName(name) })),
            ...translators.map((name) => ({ creatorType: "translator", name: creatorName(name) })),
          ],
          date: publishedAt,
          abstractNote: nonEmptyString(data.description) ? data.description.trim() : undefined,
        }),
        translationInput,
        `${file}: citations.translation`
      );
      citationKeys.push(translation.citationKey);

      if (data.citations.original != null) {
        const originalInput = parseCitationInput(
          data.citations.original,
          `${file}: citations.original`
        );
        if (originalInput.itemType !== "book") {
          throw new Error(`${file}: citations.original.itemType 必须是 book`);
        }
        const original = mergeCitation(
          {
            itemType: "book",
            citationKey: originalInput.citationKey ?? "",
            title: originalInput.title ?? "",
            creators: originalInput.creators ?? [],
          },
          originalInput,
          `${file}: citations.original`
        );
        citationKeys.push(original.citationKey);
      }
    } catch (error) {
      report(errors, file, error instanceof Error ? error.message : String(error));
    }

    const fileStem = fileName.slice(0, -5);
    if (slug && fileStem !== slug) {
      report(errors, file, `文件名必须与 slug 一致：${slug}.json`);
    }
    if (!title) report(errors, file, "书名不能为空");

    const chapterIds = new Set();
    const publishedChapterIds = new Set();
    const chapterNumbers = new Set();
    const chapterAnchors = new Set();
    if (!Array.isArray(data.chapters) || data.chapters.length === 0) {
      report(errors, file, "chapters 至少需要一个章节");
    } else {
      const validateChapter = (value, label, ancestorForthcoming = false) => {
        if (!isRecord(value)) {
          report(errors, label, "章节必须是对象");
          return;
        }
        const chapterId = stableRecordId(value, "id", label);
        const number = requiredRecordString(value, "number", label);
        requiredRecordString(value, "title", label);
        const status = hasOwn(value, "status")
          ? requiredRecordString(value, "status", label)
          : "published";
        if (status && !validBookChapterStatuses.has(status)) {
          report(errors, label, "status 必须是 published / forthcoming 之一");
        }
        const presentation = hasOwn(value, "presentation")
          ? requiredRecordString(value, "presentation", label)
          : "reading";
        if (presentation && !validBookChapterPresentations.has(presentation)) {
          report(errors, label, "presentation 必须是 reading / reference / navigation 之一");
        }

        if (hasOwn(value, "tags")) {
          const chapterTags = stringArray(value.tags, label, "tags");
          validateControlledTags(label, chapterTags);
        }

        for (const field of ["authors", "translators", "proofreaders"]) {
          if (!hasOwn(value, field)) continue;
          const names = stringArray(value[field], label, field);
          if (field === "authors" && names.length === 0) {
            report(errors, label, "authors 如填写不得为空");
          }
          validateContributorNames(label, field, names, { required: field === "authors" });
        }

        const published = status === "published";
        if (published && ancestorForthcoming) {
          report(errors, label, "published 节点不得位于 forthcoming 祖先节点之下");
        }
        let anchor = "";
        let chapterDate = "";
        if (published) {
          anchor = requiredRecordString(value, "anchor", label);
          chapterDate = recordDate(value, "publishedAt", label);
        } else if (status === "forthcoming") {
          if (hasOwn(value, "anchor")) report(errors, label, "forthcoming 节点不得填写 anchor");
          if (hasOwn(value, "publishedAt")) {
            report(errors, label, "forthcoming 节点不得填写 publishedAt");
          }
        }
        if (chapterDate && updatedAt && chapterDate > updatedAt) {
          report(errors, label, "publishedAt 不能晚于书籍 updatedAt");
        }
        if (chapterDate > publicationCutoffISO) {
          report(errors, label, `publishedAt (${chapterDate}) 晚于公开构建日期 (${publicationCutoffISO})`);
        }
        if (chapterId && published) publishedChapterIds.add(chapterId);
        for (const [set, candidate, field] of [
          [chapterIds, chapterId, "id"],
          [chapterNumbers, number, "number"],
          [chapterAnchors, published ? anchor : "", "anchor"],
        ]) {
          if (!candidate) continue;
          if (set.has(candidate)) report(errors, label, `${field} 重复：${candidate}`);
          set.add(candidate);
        }

        let inlineSections = [];
        if (hasOwn(value, "sections")) {
          if (!Array.isArray(value.sections)) {
            report(errors, label, "sections 如填写必须是分篇数组");
          } else {
            inlineSections = value.sections;
            if (presentation !== "reading") {
              report(errors, label, "只有 reading 章节可以声明 sections");
            }
            let encounteredForthcomingSection = false;
            value.sections.forEach((section, sectionIndex) => {
              const sectionLabel = `${label}.sections[${sectionIndex}]`;
              if (!isRecord(section)) {
                report(errors, sectionLabel, "分篇必须是对象");
                return;
              }
              const sectionId = stableRecordId(section, "id", sectionLabel);
              const sectionNumber = requiredRecordString(section, "number", sectionLabel);
              requiredRecordString(section, "title", sectionLabel);
              if (!hasOwn(section, "status")) {
                report(errors, sectionLabel, "分篇必须显式填写 status");
              }
              const sectionStatus = hasOwn(section, "status")
                ? requiredRecordString(section, "status", sectionLabel)
                : "published";
              if (sectionStatus && !validBookChapterStatuses.has(sectionStatus)) {
                report(errors, sectionLabel, "status 必须是 published / forthcoming 之一");
              }
              const sectionPublished = sectionStatus === "published";
              if (sectionStatus === "forthcoming") encounteredForthcomingSection = true;
              else if (sectionPublished && encounteredForthcomingSection) {
                report(errors, sectionLabel, "published 分篇必须排在 forthcoming 分篇之前");
              }
              if (sectionPublished && status === "forthcoming") {
                report(errors, sectionLabel, "published 分篇不得位于 forthcoming 章节之下");
              }
              let sectionAnchor = "";
              let sectionDate = "";
              if (sectionPublished) {
                sectionAnchor = requiredRecordString(section, "anchor", sectionLabel);
                sectionDate = recordDate(section, "publishedAt", sectionLabel);
              } else if (sectionStatus === "forthcoming") {
                if (hasOwn(section, "anchor")) report(errors, sectionLabel, "forthcoming 分篇不得填写 anchor");
                if (hasOwn(section, "publishedAt")) {
                  report(errors, sectionLabel, "forthcoming 分篇不得填写 publishedAt");
                }
              }
              if (sectionDate && updatedAt && sectionDate > updatedAt) {
                report(errors, sectionLabel, "publishedAt 不能晚于书籍 updatedAt");
              }
              if (sectionDate > publicationCutoffISO) {
                report(
                  errors,
                  sectionLabel,
                  `publishedAt (${sectionDate}) 晚于公开构建日期 (${publicationCutoffISO})`
                );
              }
              for (const [set, candidate, field] of [
                [chapterIds, sectionId, "id"],
                [chapterNumbers, sectionNumber, "number"],
                [chapterAnchors, sectionPublished ? sectionAnchor : "", "anchor"],
              ]) {
                if (!candidate) continue;
                if (set.has(candidate)) report(errors, sectionLabel, `${field} 重复：${candidate}`);
                set.add(candidate);
              }
            });
          }
        }

        if (hasOwn(value, "children")) {
          if (!Array.isArray(value.children)) {
            report(errors, label, "children 如填写必须是章节数组");
          } else {
            if (inlineSections.length > 0 && value.children.length > 0) {
              report(errors, label, "sections 不得与 children 章节路由同时使用");
            }
            value.children.forEach((child, childIndex) => {
              validateChapter(
                child,
                `${label}.children[${childIndex}]`,
                ancestorForthcoming || status === "forthcoming"
              );
            });
          }
        }
      };

      data.chapters.forEach((value, index) => {
        validateChapter(value, `${file}#chapters[${index}]`);
      });
    }
    if (latestChapterId && !chapterIds.has(latestChapterId)) {
      report(errors, file, `latestChapterId 未指向已声明章节：${latestChapterId}`);
    } else if (latestChapterId && !publishedChapterIds.has(latestChapterId)) {
      report(errors, file, `latestChapterId 必须指向 published 章节：${latestChapterId}`);
    }

    return {
      file,
      id,
      slug,
      documentSlug,
      script,
      publishedAt,
      updatedAt,
      citationKeys,
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
    if (!document.bookDocument) {
      report(errors, book.file, `documentSlug 指向的文稿必须填写 book_document: true：${book.documentSlug}`);
    }
    if (book.script && document.script && book.script !== document.script) {
      report(
        errors,
        book.file,
        `script (${book.script}) 必须与正文 script (${document.script}) 一致`
      );
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

for (const document of records.filter((record) => record.bookDocument)) {
  if (!bookDocuments.has(document.slug)) {
    report(errors, document.file, "book_document: true 的文稿必须由一本书的 documentSlug 引用");
  }
}

const citationKeyOwners = new Map();
for (const record of records) {
  if (!record.citationKey) continue;
  citationKeyOwners.set(record.citationKey, record.file);
}
for (const book of bookRecords) {
  for (const citationKey of book.citationKeys) {
    const previous = citationKeyOwners.get(citationKey);
    if (previous) {
      report(errors, book.file, `citationKey 与 ${previous} 重复：${citationKey}`);
    } else {
      citationKeyOwners.set(citationKey, book.file);
    }
  }
}

const topicRecords = markdownFiles(topicsDirectory).map((fileName) => {
  const file = path.join("source", "_topics", fileName).replaceAll("\\", "/");
  const raw = fs.readFileSync(path.join(topicsDirectory, fileName), "utf8");
  const { data, header, content } = parseFrontMatter(file, raw);
  validateTypography(file, content, data);
  validatePublicEditorialVoice(file, data, "专题清单");
  validatePublicEditorialVoice(file, content, "专题导语");

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
  if (published > publicationCutoffISO) {
    report(errors, file, `published (${published}) 晚于公开构建日期 (${publicationCutoffISO})`);
  }
  if (updated > publicationCutoffISO) {
    report(errors, file, `updated (${updated}) 晚于公开构建日期 (${publicationCutoffISO})`);
  }

  const groupIds = new Set();
  const groupNumbers = new Set();
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
      const rawGroupNumber = value.number == null || value.number === ""
        ? String(groupIndex + 1)
        : typeof value.number === "number" ? String(value.number) : String(value.number).trim();
      if (!/^\d{1,2}$/.test(rawGroupNumber)) {
        report(errors, groupFile, "number 只能是一到两位数字，如 00");
      } else {
        const normalizedGroupNumber = rawGroupNumber.padStart(2, "0");
        if (groupNumbers.has(normalizedGroupNumber)) {
          report(errors, groupFile, `number 重复：${normalizedGroupNumber}`);
        }
        groupNumbers.add(normalizedGroupNumber);
      }
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

// 排版豁免清单只减不增：被修复的存量违规必须同步从
// scripts/typography-grandfathered.json 移除，防止清单腐化成永久后门。
for (const [kind, unused] of Object.entries(grandfatheredUnused)) {
  for (const { file, key } of unused.values()) {
    report(
      errors,
      file,
      `排版豁免清单存在已失效的 ${kind} 条目（…${key}…）——该处已修复或文本已变动，请从 scripts/typography-grandfathered.json 移除`
    );
  }
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
