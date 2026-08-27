/* ============================================================
   Markdown → HTML 渲染管线
   - GFM（表格 / 删除线 / 自动链接）
   - CJK 友好的强调（**中文：**后接中文也能加粗）
   - 标题加 id（便于锚点）
   - 脚注 _ftn/_ftnref 互锚（Word/Outline 导出的脚注可往返跳转）
   - 文章归档与微信图片指向 R2；其他相对图片路径 attachments/x → /attachments/x
   - 外链 target=_blank；失效的 mention:// 链接降级为纯文本
   ============================================================ */
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkCjkFriendly from "remark-cjk-friendly";
import remarkRehype from "remark-rehype";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import { visit } from "unist-util-visit";
import type { Root, Element } from "hast";
import { sanitizePublicContentHtml } from "./media-material-runtime.mjs";
import { rewriteArchiveAssetUrl } from "./archive-assets-runtime.mjs";
import { escapeLiteralCurrencyDollars } from "./markdown-math.mjs";
import {
  isR2AudioCoverUrl,
  isWechatAudioSource,
  isWechatVideoSource,
  neteaseSongIdFromTitle,
  neteaseSongIdFromUrl,
} from "./article-media-contract-runtime.mjs";
import type { ArticleVideoSource } from "./article-media-contract";
import type { ContentFormat } from "./posts";

const SIZE_TITLE = /^\s*=(\d+)x(\d+)\s*$/; // Typora/Hexo 图片尺寸标注
const VIDEO_SOURCE_TITLE = /^\s*=(\d+)x(\d+)\s+(\d{1,3}):([0-5]\d)\s*$/u;

type SourceNote = {
  key: string;
  num: number;
  label: string;
  text: string;
  refs: string[];
};

type RenderLanguage = "zh" | "en" | "ja";

export type RenderedApparatusParts = {
  main: string;
  notes: string;
  sources: string;
};

function pullRenderedSection(html: string, className: string): { html: string; rest: string } {
  const pattern = new RegExp(
    `<section\\b[^>]*class="[^"]*\\b${className}\\b[^"]*"[^>]*>[\\s\\S]*?<\\/section>`,
    "iu"
  );
  const match = html.match(pattern);
  if (!match) return { html: "", rest: html };
  return { html: match[0], rest: html.replace(match[0], "") };
}

export function splitRenderedApparatus(html: string): RenderedApparatusParts {
  const notes = pullRenderedSection(html, "footnotes");
  const sources = pullRenderedSection(notes.rest, "source-notes");
  return {
    main: sources.rest,
    notes: notes.html,
    sources: sources.html,
  };
}

export function countRenderedListItems(html: string): number {
  return (html.match(/<li\b/giu) ?? []).length;
}

const RENDER_LABELS = {
  zh: {
    notes: "注释",
    sources: "文献",
    source: "文献",
    backToBody: "返回正文引用",
    backToSource: "返回文献",
    slides: "连续图版",
  },
  en: {
    notes: "Notes",
    sources: "Sources",
    source: "Source",
    backToBody: "Back to text reference",
    backToSource: "Back to source",
    slides: "Image sequence",
  },
  ja: {
    notes: "注釈",
    sources: "文献",
    source: "文献",
    backToBody: "本文の参照箇所に戻る",
    backToSource: "文献に戻る",
    slides: "連続図版",
  },
} as const;

type MarkdownNode = {
  type?: string;
  value?: string;
  url?: string;
  children?: MarkdownNode[];
};

const SOURCE_NOTE_DEF = /^\[\^w(\d+)\]:[ \t]*(.*)$/gm;
const SOURCE_NOTE_REF = /\[\^w(\d+)\]/g;

function toRoman(n: number): string {
  const pairs: [number, string][] = [
    [1000, "m"],
    [900, "cm"],
    [500, "d"],
    [400, "cd"],
    [100, "c"],
    [90, "xc"],
    [50, "l"],
    [40, "xl"],
    [10, "x"],
    [9, "ix"],
    [5, "v"],
    [4, "iv"],
    [1, "i"],
  ];
  let out = "";
  for (const [value, roman] of pairs) {
    while (n >= value) {
      out += roman;
      n -= value;
    }
  }
  return out;
}

const CJK_TEXT = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;

function extractSourceNotes(
  md: string,
  language: RenderLanguage
): { markdown: string; sourceNotes: SourceNote[] } {
  const defs = new Map<string, SourceNote>();
  const labels = RENDER_LABELS[language];

  let markdown = md.replace(SOURCE_NOTE_DEF, (_match, rawNum: string, text: string) => {
    const num = Number(rawNum);
    const key = `w${rawNum}`;
    defs.set(key, { key, num, label: toRoman(num), text, refs: [] });
    return "";
  });

  const refCounts = new Map<string, number>();
  markdown = markdown.replace(SOURCE_NOTE_REF, (match, rawNum: string) => {
    const key = `w${rawNum}`;
    const note = defs.get(key);
    if (!note) return match;

    const next = (refCounts.get(key) ?? 0) + 1;
    refCounts.set(key, next);
    const refId = `source-ref-${key}-${next}`;
    note.refs.push(refId);

    return `<sup class="source-ref" id="${refId}"><a href="#source-note-${key}" aria-label="${labels.source} ${note.label}">${note.label}</a></sup>`;
  });

  return {
    markdown,
    sourceNotes: Array.from(defs.values()).sort((a, b) => a.num - b.num),
  };
}

function appendBackrefs(html: string, backrefs: string): string {
  if (!backrefs) return html;
  return /<\/p>\s*$/.test(html) ? html.replace(/<\/p>\s*$/, `${backrefs}</p>`) : html + backrefs;
}

function markdownNodeText(node: MarkdownNode): string {
  if (typeof node.value === "string") return node.value;
  return (node.children ?? []).map(markdownNodeText).join("");
}

/**
 * GFM moves footnote definitions into a generated notes section. Source-side
 * grouping headings immediately before those definitions would otherwise stay
 * behind as empty headings in the article body.
 */
function remarkRemoveDetachedNoteHeadings() {
  const noteHeading = /^(?:译注|附录|注释|脚注|Notes?|Footnotes?|注釈)$/iu;
  return (tree: MarkdownNode) => {
    const children = tree.children ?? [];
    for (let index = children.length - 2; index >= 0; index -= 1) {
      const node = children[index];
      const next = children[index + 1];
      if (node.type !== "heading" || next.type !== "footnoteDefinition") continue;
      if (noteHeading.test(markdownNodeText(node).trim())) children.splice(index, 1);
    }
  };
}

const SEPARATE_QUOTATIONS_MARKER = /^\s*<!--\s*separate-quotations\s*-->\s*$/iu;

/**
 * CommonMark treats blockquotes separated by a blank line as independent
 * containers. Archive sources frequently use those blank lines only to keep
 * paragraphs, translations and attributions readable, so preserving the raw
 * Markdown nodes would draw a new quotation rail around every paragraph.
 *
 * Merge adjacent blockquotes by default while keeping their child blocks
 * distinct. Editors can preserve a deliberate boundary with the exact marker
 * `<!--separate-quotations-->` between two quotations.
 */
function remarkMergeAdjacentBlockquotes() {
  return (tree: MarkdownNode) => {
    const walk = (node: MarkdownNode) => {
      const children = node.children;
      if (!children) return;

      let index = 0;
      while (index < children.length - 1) {
        const current = children[index];
        const next = children[index + 1];

        if (
          current.type === "blockquote"
          && next.type === "html"
          && typeof next.value === "string"
          && SEPARATE_QUOTATIONS_MARKER.test(next.value)
          && children[index + 2]?.type === "blockquote"
        ) {
          children.splice(index + 1, 1);
          index += 1;
          continue;
        }

        if (current.type === "blockquote" && next.type === "blockquote") {
          current.children ??= [];
          current.children.push(...(next.children ?? []));
          children.splice(index + 1, 1);
          continue;
        }

        index += 1;
      }

      for (const child of children) walk(child);
    };

    walk(tree);
  };
}

/**
 * remark-gfm treats CJK punctuation as part of an autolink literal. A source
 * such as `https://example.com）后文` would therefore turn the entire
 * remainder of the paragraph into the link target. Explicit Markdown links
 * are left untouched; this only trims literal links whose visible text is the
 * URL itself.
 */
function remarkTrimCjkAutolinkTail() {
  const cjkBoundary = /[，。；：！？、（）［］【】《》“”‘’]/u;

  return (tree: MarkdownNode) => {
    const walk = (node: MarkdownNode) => {
      const children = node.children ?? [];
      for (let index = 0; index < children.length; index += 1) {
        const child = children[index];
        const visible = child.children?.length === 1 && child.children[0].type === "text"
          ? child.children[0].value
          : undefined;
        if (
          child.type === "link"
          && typeof child.url === "string"
          && typeof visible === "string"
          && (
            visible === child.url
            || `http://${visible}` === child.url
            || `https://${visible}` === child.url
          )
        ) {
          const visibleBoundary = visible.search(cjkBoundary);
          const urlBoundary = child.url.search(cjkBoundary);
          if (visibleBoundary > 0 && urlBoundary > 0) {
            const url = child.url.slice(0, urlBoundary);
            const visibleUrl = visible.slice(0, visibleBoundary);
            const tail = visible.slice(visibleBoundary);
            child.url = url;
            child.children![0].value = visibleUrl;
            children.splice(index + 1, 0, { type: "text", value: tail });
            index += 1;
          }
        }
        walk(child);
      }
    };
    walk(tree);
  };
}

async function renderSourceNotes(
  sourceNotes: SourceNote[],
  language: RenderLanguage,
  activeProcessor: ReturnType<typeof createProcessor>
): Promise<string> {
  if (sourceNotes.length === 0) return "";
  const labels = RENDER_LABELS[language];

  const items = await Promise.all(
    sourceNotes.map(async (note) => {
      const backrefs = note.refs
        .map(
          (refId) =>
            `<a href="#${refId}" class="source-backref" aria-label="${labels.backToSource} ${note.label}">↑</a>`
        )
        .join("");
      const html = String(await activeProcessor.process(escapeLiteralCurrencyDollars(note.text))).trim();
      return `<li id="source-note-${note.key}" value="${note.num}">${appendBackrefs(html, backrefs)}</li>`;
    })
  );

  return `<section class="source-notes" data-source-notes><h2>${labels.sources}</h2><ol>${items.join("")}</ol></section>`;
}

/** 修正相对资源路径、外链行为、脚注锚点 */
function rehypeRewrite(format: ContentFormat = "article") {
  return (tree: Root) => {
    // Plain-text speaker labels are recovered only when the same label recurs in
    // the top-level interview transcript.  A single early colon is much more
    // likely to be prose or metadata ("原文：", "Tracklist：", a clock time,
    // or "https:") than a speaker turn.  Limiting inference to top-level,
    // repeated labels also keeps ordered lists such as track listings intact.
    const implicitSpeakerCounts = new Map<string, number>();
    if (format === "interview" || format === "qa") {
      visit(tree, "element", (node: Element, _index, parent) => {
        if (node.tagName !== "p" || parent?.type !== "root") return;
        const first = (node.children ?? []).find((child) => {
          const item = child as { type?: string; value?: string };
          return item.type !== "text" || /\S/.test(item.value ?? "");
        }) as { type?: string; value?: string } | undefined;
        const match = first?.type === "text"
          ? first.value?.match(/^((?:Q|A|[\p{L}\p{N}·・（）()／/、 ]{1,24})[：:])\s*/u)
          : null;
        const excluded = match
          ? /^(?:https?|翻译|译者|校对|编辑|原文|来源|采访|摄影|整理|受访者|追记\d*|后记|附记)[：:]$/u.test(match[1])
          : false;
        if (match && !excluded) {
          implicitSpeakerCounts.set(match[1], (implicitSpeakerCounts.get(match[1]) ?? 0) + 1);
        }
      });
    }

    visit(tree, "element", (node: Element, index, parent) => {
      const props = node.properties ?? {};

      if (node.tagName === "img" && typeof props.src === "string") {
        const src = props.src;
        const isAbsolute =
          /^https?:\/\//.test(src) || src.startsWith("/") || src.startsWith("data:");
        if (!isAbsolute) props.src = "/" + src.replace(/^\.?\//, "");
        props.src = rewriteArchiveAssetUrl(String(props.src));
        // 清理 " =1535x1024" 这类尺寸标注，转成 width/height 以减少布局抖动
        if (typeof props.title === "string") {
          const m = props.title.match(SIZE_TITLE);
          if (m) {
            props.width = Number(m[1]);
            props.height = Number(m[2]);
            delete props.title;
          }
        }
        props.loading = "lazy";
        props.decoding = "async";
      }

      if (node.tagName === "a" && typeof props.href === "string") {
        const href = props.href;
        if (/^https?:\/\//.test(href)) {
          props.target = "_blank";
          props.rel = "noopener noreferrer";
        } else if (/^mention:/i.test(href)) {
          // Outline 内部 mention:// 在公网无意义 —— 降级为不可点击的纯文本
          delete props.href;
        } else if (/^#_ftnref(\d+)$/.test(href)) {
          // 脚注定义处的回链 —— 它自身是正文角标的跳转目标
          props.id = "_ftn" + href.match(/^#_ftnref(\d+)$/)![1];
        } else if (/^#_ftn(\d+)$/.test(href)) {
          // 正文角标 —— 它自身是脚注定义回链的跳转目标
          props.id = "_ftnref" + href.match(/^#_ftn(\d+)$/)![1];
        }
      }

      // 承接段标记：紧邻其上、独立成行的 <!--continue-->（译前处理注入）→ 抹掉标记并给本段加 .cont（首行不缩进）
      if (node.tagName === "p" && parent && typeof index === "number") {
        const sibs = (parent as { children: Array<{ type?: string; value?: string }> }).children;
        let j = index - 1;
        while (j >= 0) {
          const sib = sibs[j];
          if (sib && sib.type === "text" && /^\s*$/.test(sib.value ?? "")) { j--; continue; }
          if (sib && sib.type === "raw" && /^<!--\s*continue\s*-->/.test(sib.value ?? "")) {
            sib.value = ""; // 抹掉标记输出
            const cn = props.className as unknown;
            props.className = Array.isArray(cn) ? [...cn, "cont"] : cn ? [String(cn), "cont"] : ["cont"];
          }
          break;
        }

        let firstIndex = (node.children ?? []).findIndex((child) => {
          const item = child as { type?: string; value?: string };
          return item.type !== "text" || /\S/.test(item.value ?? "");
        });
        if (
          (format === "interview" || format === "qa")
          && parent?.type === "root"
          && firstIndex >= 0
        ) {
          const firstText = node.children?.[firstIndex] as { type?: string; value?: string } | undefined;
          const match = firstText?.type === "text"
            ? firstText.value?.match(/^((?:Q|A|[\p{L}\p{N}·・（）()／/、 ]{1,24})[：:])\s*/u)
            : null;
          const isCreditOrSourceLabel = match
            ? /^(?:https?|翻译|译者|校对|编辑|原文|来源|采访|摄影|整理|受访者|追记\d*|后记|附记)[：:]$/u.test(match[1])
            : false;
          const isRepeatedSpeaker = match
            ? (implicitSpeakerCounts.get(match[1]) ?? 0) >= 2
            : false;
          const isQuestionAnswerLabel = match ? /^(?:Q|A)[：:]$/u.test(match[1]) : false;
          if (
            match
            && !isCreditOrSourceLabel
            && (isRepeatedSpeaker || isQuestionAnswerLabel)
            && firstText?.value != null
          ) {
            const label = match[1];
            const remainder = firstText.value.slice(match[0].length);
            node.children?.splice(
              firstIndex,
              1,
              { type: "element", tagName: "strong", properties: {}, children: [{ type: "text", value: label }] },
              ...(remainder ? [{ type: "text", value: remainder } as const] : [])
            );
            firstIndex = (node.children ?? []).findIndex((child) => {
              const item = child as { type?: string; value?: string };
              return item.type !== "text" || /\S/.test(item.value ?? "");
            });
          }
        }
        const first = firstIndex >= 0 ? node.children?.[firstIndex] as Element | undefined : undefined;
        if (first?.type === "element" && first.tagName === "strong") {
          const label = elementText(first);
          const next = node.children?.[firstIndex + 1] as { type?: string; value?: string } | undefined;
          const classNames = Array.isArray(props.className)
            ? [...props.className]
            : props.className ? [String(props.className)] : [];
          const isSummaryLabel = /^(摘　要|关键词)：/.test(label);
          const isEditorialLabel = label === "编按：";
          if (isSummaryLabel) classNames.push("article-summary-meta");
          if (isEditorialLabel) classNames.push("editorial-note");
          const isSpeakerLabel = !isSummaryLabel && !isEditorialLabel
            && /^[\p{L}\p{N}·・—－（）()／/、 ]{1,24}[：:]$/u.test(label);
          const isInterviewPrompt = /^——\S/u.test(label) && firstIndex === (node.children?.length ?? 0) - 1;
          const hasExplicitSpeakerGap = next?.type === "text" && next.value?.startsWith("　");
          if (hasExplicitSpeakerGap || (isSpeakerLabel && next?.type === "text") || isInterviewPrompt) {
            classNames.push("speaker-turn");
          }
          if (classNames.length > 0) props.className = Array.from(new Set(classNames));
        }
      }

      node.properties = props;
    });
  };
}

function elementText(node: Element): string {
  let out = "";
  for (const child of node.children ?? []) {
    if (child.type === "text") out += child.value;
    if (child.type === "element") out += elementText(child);
  }
  return out;
}

function rehypeCjkEmphasis() {
  return (tree: Root) => {
    visit(tree, "element", (node: Element) => {
      if (node.tagName === "em" && CJK_TEXT.test(elementText(node))) {
        node.tagName = "strong";
      }
    });
  };
}

/* ---------------- 弯引号规范化（构建期）----------------
   正文里的 ASCII 直引号 " ' 统一改成方向性 Unicode 引号 “ ” ‘ ’，
   由字体按中英文环境渲染为全角/半角。只处理文本节点，跳过 code/pre，
   也不会碰到 Markdown 语法里的引号（如图片 title），因为那些不是文本节点。 */
const OPEN_DQ = "“", CLOSE_DQ = "”", OPEN_SQ = "‘", CLOSE_SQ = "’";
const Q_BLOCK = new Set([
  "p", "li", "blockquote", "h1", "h2", "h3", "h4", "h5", "h6",
  "td", "th", "figcaption", "dd", "dt", "summary",
]);
const Q_SKIP = new Set(["code", "pre", "kbd", "samp", "script", "style"]);
const isWordChar = (ch: string) => /[A-Za-z0-9]/.test(ch);
const LATIN_SKIP = new Set([
  "code",
  "pre",
  "kbd",
  "samp",
  "script",
  "style",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
]);
const LATIN_RUN =
  /[\p{Script=Latin}\p{Script=Cyrillic}\p{Script=Greek}0-9 \t\u00a0.,;:!?'′″\u2018\u2019\u201c\u201d"()[\]{}<>/\\&+%№§#@*=_~\-–—]*[\p{Script=Latin}\p{Script=Cyrillic}\p{Script=Greek}0-9][\p{Script=Latin}\p{Script=Cyrillic}\p{Script=Greek}0-9 \t\u00a0.,;:!?'′″\u2018\u2019\u201c\u201d"()[\]{}<>/\\&+%№§#@*=_~\-–—]*/gu;
const LATIN_WORD_CHAR = /[\p{Script=Latin}\p{Script=Cyrillic}\p{Script=Greek}0-9]/u;
const CJK_INTERPUNCT = /[·・…]/u;

function smartenText(value: string, state: { dq: boolean; sq: boolean }): string {
  let out = "";
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (ch === '"') {
      out += state.dq ? CLOSE_DQ : OPEN_DQ;
      state.dq = !state.dq;
    } else if (ch === "'") {
      const prev = i > 0 ? value[i - 1] : "";
      const next = i + 1 < value.length ? value[i + 1] : "";
      if (isWordChar(prev) && isWordChar(next)) {
        out += CLOSE_SQ; // 词内撇号：it's / don't
      } else {
        out += state.sq ? CLOSE_SQ : OPEN_SQ;
        state.sq = !state.sq;
      }
    } else {
      out += ch;
    }
  }
  return out;
}

function rehypeSmartQuotes() {
  const walk = (node: { type?: string; tagName?: string; value?: string; children?: unknown[] }, state: { dq: boolean; sq: boolean }) => {
    if (node.type === "element" && node.tagName && Q_SKIP.has(node.tagName)) return;
    // 引号配对在每个块级元素内重置，跨行内元素（em/strong/a）仍连续
    const st = node.type === "element" && node.tagName && Q_BLOCK.has(node.tagName)
      ? { dq: false, sq: false }
      : state;
    for (const raw of node.children ?? []) {
      const child = raw as { type?: string; value?: string; children?: unknown[] };
      if (child.type === "text" && typeof child.value === "string") {
        child.value = smartenText(child.value, st);
      } else if (child.type === "element") {
        walk(child, st);
      }
    }
  };
  return (tree: Root) => walk(tree as unknown as { children: unknown[] }, { dq: false, sq: false });
}

function rehypeCjkInterpuncts() {
  const walk = (node: { type?: string; tagName?: string; children?: unknown[] }) => {
    if (node.type === "element" && node.tagName && Q_SKIP.has(node.tagName)) return;
    if (!Array.isArray(node.children)) return;

    const next: unknown[] = [];
    for (const raw of node.children) {
      const child = raw as { type?: string; value?: string; tagName?: string; children?: unknown[] };
      if (child.type === "text" && typeof child.value === "string" && CJK_INTERPUNCT.test(child.value)) {
        const parts = child.value.split(/([·・…])/u);
        for (const part of parts) {
          if (!part) continue;
          if (CJK_INTERPUNCT.test(part)) {
            next.push({
              type: "element",
              tagName: "span",
              properties: { className: ["cjk-interpunct"] },
              children: [{ type: "text", value: part }],
            });
          } else {
            next.push({ type: "text", value: part });
          }
        }
      } else {
        walk(child);
        next.push(child);
      }
    }
    node.children = next;
  };
  return (tree: Root) => walk(tree as unknown as { children: unknown[] });
}

function rehypeRareHanGlyphs() {
  const walk = (node: { type?: string; tagName?: string; children?: unknown[] }) => {
    if (node.type === "element" && node.tagName && Q_SKIP.has(node.tagName)) return;
    if (!Array.isArray(node.children)) return;

    const next: unknown[] = [];
    for (const raw of node.children) {
      const child = raw as { type?: string; value?: string; tagName?: string; children?: unknown[] };
      if (child.type === "text" && typeof child.value === "string" && child.value.includes("\u4337")) {
        for (const part of child.value.split(/(\u4337)/u)) {
          if (!part) continue;
          next.push(
            part === "\u4337"
              ? {
                  type: "element",
                  tagName: "span",
                  properties: { className: ["rare-han"] },
                  children: [{ type: "text", value: part }],
                }
              : { type: "text", value: part }
          );
        }
      } else {
        walk(child);
        next.push(child);
      }
    }
    node.children = next;
  };
  return (tree: Root) => walk(tree as unknown as { children: unknown[] });
}

type TextNode = { type: "text"; value: string };
type InlineRunNode = TextNode | Element;
type TextReference = { node: TextNode; start: number; end: number };
type ScriptContext = "cjk" | "latin" | null;

function pushText(out: InlineRunNode[], value: string) {
  if (value) out.push({ type: "text", value });
}

function pushLatin(out: InlineRunNode[], value: string) {
  if (!value) return;
  const leading = value.match(/^[ \t\u00a0]+/u)?.[0] ?? "";
  const trailing = value.match(/[ \t\u00a0]+$/u)?.[0] ?? "";
  const core = value.slice(leading.length, value.length - trailing.length);
  pushText(out, leading);
  for (const part of core.split(/([·・…])/u)) {
    if (!part) continue;
    if (CJK_INTERPUNCT.test(part)) {
      out.push({
        type: "element",
        tagName: "span",
        properties: { className: ["cjk-interpunct"] },
        children: [{ type: "text", value: part }],
      });
      continue;
    }
    out.push({
      type: "element",
      tagName: "span",
      properties: { className: ["latin-run"] },
      children: [{ type: "text", value: part }],
    });
  }
  pushText(out, trailing);
}

function isLatinWordChar(ch: string | undefined) {
  return Boolean(ch && LATIN_WORD_CHAR.test(ch));
}

function scriptBefore(value: string, start: number): ScriptContext {
  for (let i = start - 1; i >= 0; i--) {
    if (CJK_TEXT.test(value[i])) return "cjk";
    if (isLatinWordChar(value[i])) return "latin";
  }
  return null;
}

function scriptAfter(value: string, start: number): ScriptContext {
  for (let i = start + 1; i < value.length; i++) {
    if (CJK_TEXT.test(value[i])) return "cjk";
    if (isLatinWordChar(value[i])) return "latin";
  }
  return null;
}

function isCjkQuotePair(before: ScriptContext, after: ScriptContext) {
  return before === "cjk" || after === "cjk";
}

function cjkQuotePositions(value: string) {
  // Quote glyphs inherit the script of the quoted span, including across em/strong/a nodes.
  const positions = new Set<number>();
  const opens: Array<{ glyph: typeof OPEN_SQ | typeof OPEN_DQ; index: number }> = [];

  for (let index = 0; index < value.length; index++) {
    const glyph = value[index];
    if (glyph === OPEN_SQ || glyph === OPEN_DQ) {
      opens.push({ glyph, index });
      continue;
    }

    if (glyph !== CLOSE_SQ && glyph !== CLOSE_DQ) continue;
    if (glyph === CLOSE_SQ && isLatinWordChar(value[index - 1]) && isLatinWordChar(value[index + 1])) continue;

    const openingGlyph = glyph === CLOSE_SQ ? OPEN_SQ : OPEN_DQ;
    const openingIndex = opens.map((entry) => entry.glyph).lastIndexOf(openingGlyph);
    if (openingIndex === -1) {
      if (isCjkQuotePair(scriptBefore(value, index), scriptAfter(value, index))) positions.add(index);
      continue;
    }

    const [opening] = opens.splice(openingIndex, 1);
    const containsCjk = CJK_TEXT.test(value.slice(opening.index + 1, index));
    if (containsCjk || isCjkQuotePair(scriptBefore(value, opening.index), scriptAfter(value, index))) {
      positions.add(opening.index);
      positions.add(index);
    }
  }

  opens.forEach((opening) => {
    if (isCjkQuotePair(scriptBefore(value, opening.index), scriptAfter(value, opening.index))) {
      positions.add(opening.index);
    }
  });

  return positions;
}

function hasClass(node: { properties?: { className?: unknown } }, className: string) {
  const raw = node.properties?.className;
  const classes = Array.isArray(raw) ? raw.map(String) : typeof raw === "string" ? raw.split(/\s+/) : [];
  return classes.includes(className);
}

function collectInlineText(
  node: { children?: unknown[] },
  references: TextReference[]
) {
  for (const raw of node.children ?? []) {
    const child = raw as { type?: string; tagName?: string; value?: string; children?: unknown[]; properties?: { className?: unknown } };
    if (child.type === "text" && typeof child.value === "string") {
      const start = references.length === 0 ? 0 : references[references.length - 1].end;
      references.push({ node: child as TextNode, start, end: start + child.value.length });
      continue;
    }
    if (child.type !== "element" || !child.tagName) continue;
    if (LATIN_SKIP.has(child.tagName) || hasClass(child, "cjk-interpunct")) continue;
    if (Q_BLOCK.has(child.tagName)) continue;
    collectInlineText(child, references);
  }
}

function latinMask(value: string) {
  const mask = new Uint8Array(value.length);
  const matcher = new RegExp(LATIN_RUN);
  for (const match of value.matchAll(matcher)) {
    const start = match.index ?? 0;
    mask.fill(1, start, start + match[0].length);
  }
  cjkQuotePositions(value).forEach((index) => {
    mask[index] = 0;
  });
  return mask;
}

function replaceTextWithRuns(reference: TextReference, mask: Uint8Array): InlineRunNode[] {
  const out: InlineRunNode[] = [];
  const { value } = reference.node;
  let start = 0;
  let latin = mask[reference.start] === 1;

  for (let index = 1; index < value.length; index++) {
    const nextLatin = mask[reference.start + index] === 1;
    if (nextLatin === latin) continue;
    const part = value.slice(start, index);
    if (latin) pushLatin(out, part);
    else pushText(out, part);
    start = index;
    latin = nextLatin;
  }

  const part = value.slice(start);
  if (latin) pushLatin(out, part);
  else pushText(out, part);
  return out;
}

function replaceInlineText(
  node: { children?: unknown[] },
  replacements: Map<TextNode, InlineRunNode[]>
) {
  if (!Array.isArray(node.children)) return;
  const next: unknown[] = [];
  for (const raw of node.children) {
    const child = raw as { type?: string; children?: unknown[] };
    if (child.type === "text" && replacements.has(child as TextNode)) {
      next.push(...replacements.get(child as TextNode)!);
      continue;
    }
    replaceInlineText(child, replacements);
    next.push(child);
  }
  node.children = next;
}

function latinizeBlock(node: { children?: unknown[] }) {
  const references: TextReference[] = [];
  collectInlineText(node, references);
  if (references.length === 0) return;

  const value = references.map((reference) => reference.node.value).join("");
  const mask = latinMask(value);
  const replacements = new Map<TextNode, InlineRunNode[]>();
  references.forEach((reference) => {
    if (mask.subarray(reference.start, reference.end).some(Boolean)) {
      replacements.set(reference.node, replaceTextWithRuns(reference, mask));
    }
  });
  if (replacements.size > 0) replaceInlineText(node, replacements);
}

function rehypeLatinRuns() {
  const walk = (node: { type?: string; tagName?: string; children?: unknown[] }) => {
    if (node.type === "element" && node.tagName && LATIN_SKIP.has(node.tagName)) return;
    if (node.type === "element" && node.tagName && Q_BLOCK.has(node.tagName)) {
      latinizeBlock(node);
    }
    for (const raw of node.children ?? []) {
      const child = raw as { type?: string; tagName?: string; children?: unknown[] };
      if (child.type === "element") walk(child);
    }
  };
  return (tree: Root) => walk(tree as unknown as { children: unknown[] });
}

const TABLE_CAPTION_MARKER = "[表题]";
const TABLE_NOTE_MARKER = "[表注]";

type TableFigureNode = {
  type?: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: TableFigureNode[];
};

type MarkerParagraphNode = TableFigureNode & {
  type: "element";
  tagName: "p";
};

function markerParagraph(node: TableFigureNode | undefined, marker: string): node is MarkerParagraphNode {
  if (node?.type !== "element" || node.tagName !== "p") return false;
  return elementText(node as Element).trimStart().startsWith(marker);
}

function stripParagraphMarker(node: TableFigureNode, marker: string): void {
  const strip = (current: TableFigureNode): boolean => {
    if (current.type === "text" && typeof current.value === "string") {
      const leading = current.value.match(/^\s*/u)?.[0].length ?? 0;
      if (current.value.slice(leading).startsWith(marker)) {
        current.value = current.value.slice(leading + marker.length).replace(/^\s*/u, "");
        return true;
      }
    }
    for (const child of current.children ?? []) {
      if (strip(child)) return true;
    }
    return false;
  };
  strip(node);
}

function significantSibling(children: TableFigureNode[], start: number, direction: -1 | 1): number {
  for (let index = start; index >= 0 && index < children.length; index += direction) {
    const node = children[index];
    if (node.type !== "text" || /\S/u.test(node.value ?? "")) return index;
  }
  return -1;
}

function rehypeTableFigures() {
  const walk = (parent: TableFigureNode) => {
    const children = parent.children;
    if (!children) return;

    for (let index = 0; index < children.length; index += 1) {
      const table = children[index];
      if (table.type !== "element" || table.tagName !== "table") continue;

      const captionIndex = significantSibling(children, index - 1, -1);
      const caption = captionIndex >= 0 ? children[captionIndex] : undefined;
      if (!markerParagraph(caption, TABLE_CAPTION_MARKER)) continue;
      stripParagraphMarker(caption, TABLE_CAPTION_MARKER);

      const notes: TableFigureNode[] = [];
      let endIndex = index;
      let nextIndex = significantSibling(children, index + 1, 1);
      while (nextIndex >= 0 && markerParagraph(children[nextIndex], TABLE_NOTE_MARKER)) {
        const note = children[nextIndex];
        stripParagraphMarker(note, TABLE_NOTE_MARKER);
        note.properties = { ...(note.properties ?? {}), className: ["article-table-note"] };
        notes.push(note);
        endIndex = nextIndex;
        nextIndex = significantSibling(children, nextIndex + 1, 1);
      }

      const className = table.properties?.className;
      table.properties = {
        ...(table.properties ?? {}),
        className: Array.from(new Set([
          ...(Array.isArray(className) ? className.map(String) : className ? [String(className)] : []),
          "article-table-grid",
        ])),
      };

      const figure: TableFigureNode = {
        type: "element",
        tagName: "figure",
        properties: { className: ["article-table"] },
        children: [
          {
            type: "element",
            tagName: "figcaption",
            properties: { className: ["article-table-caption"] },
            children: caption.children ?? [],
          },
          {
            type: "element",
            tagName: "div",
            properties: { className: ["article-table-scroll"] },
            children: [table],
          },
          ...(notes.length > 0
            ? [{
                type: "element",
                tagName: "div",
                properties: { className: ["article-table-notes"] },
                children: notes,
              } satisfies TableFigureNode]
            : []),
        ],
      };

      children.splice(captionIndex, endIndex - captionIndex + 1, figure);
      index = captionIndex;
    }

    for (const child of children) {
      if (child.type === "element") walk(child);
    }
  };

  return (tree: Root) => walk(tree as unknown as TableFigureNode);
}

const FIGURE_CAPTION_MARKER = "[图题]";
const FIGURE_NOTE_MARKER = "[图注]";
const AUDIO_CAPTION_MARKER = "[音频]";
const MUSIC_CAPTION_MARKER = "[音乐]";
const VIDEO_CAPTION_MARKER = "[视频]";
const PROFILE_NAME_MARKER = "[人物]";
const PROFILE_BIO_MARKER = "[人物简介]";
const PROFILE_AUTHOR_NAME_MARKER = "[作者]";
const PROFILE_AUTHOR_BIO_MARKER = "[作者简介]";
const PROFILE_CARD_NAME_MARKER = "[名片]";
const PROFILE_CARD_BIO_MARKER = "[名片简介]";
const GALLERY_TITLE_MARKER = "[图组]";
const GALLERY_END_MARKER = "[图组结束]";
const SLIDES_TITLE_MARKER = "[幻灯]";
const SLIDES_END_MARKER = "[幻灯结束]";
const ARTICLE_LAYOUT_END_MARKER = "[版式结束]";
const ARTICLE_LAYOUT_MARKERS = new Map([
  ["[版式:资料目录]", "resources"],
  ["[版式:时间轴]", "timeline"],
  ["[版式:阅读路径]", "reading-path"],
  ["[版式:书单]", "book-list"],
  ["[版式:播客]", "podcast"],
  ["[版式:联络卡]", "contact"],
  ["[版式:漫画]", "comic"],
] as const);
/** Discrete display widths; each needs a matching rule in globals.css. */
const FIGURE_WIDTHS = new Set(["25", "33", "50", "66", "75", "100"]);
const FIGURE_WIDTH_TITLE = /^\s*=\s*(\d{1,3})%\s*$/u;
const AUDIO_DURATION_TITLE = /^\s*(\d{1,3}):([0-5]\d)\s*$/u;
const BLOCK_MEDIA_MARKERS = [
  FIGURE_CAPTION_MARKER,
  FIGURE_NOTE_MARKER,
  PROFILE_NAME_MARKER,
  PROFILE_BIO_MARKER,
  PROFILE_AUTHOR_NAME_MARKER,
  PROFILE_AUTHOR_BIO_MARKER,
  PROFILE_CARD_NAME_MARKER,
  PROFILE_CARD_BIO_MARKER,
] as const;

function hasNodeClass(node: TableFigureNode, name: string) {
  const className = node.properties?.className;
  return Array.isArray(className) && className.includes(name);
}

function addTimelineDate(node: TableFigureNode): boolean {
  if (node.type !== "element" || node.tagName !== "p") return false;
  const pattern = /^(神化\d+年(?:\d+月)?)\s+/u;
  const strip = (current: TableFigureNode): string | undefined => {
    if (current.type === "text" && typeof current.value === "string") {
      const match = pattern.exec(current.value);
      if (!match) return undefined;
      current.value = current.value.slice(match[0].length);
      return match[1];
    }
    for (const child of current.children ?? []) {
      const date = strip(child);
      if (date) return date;
    }
    return undefined;
  };
  const date = strip(node);
  if (!date) return false;
  node.properties = { ...(node.properties ?? {}), className: ["article-timeline-item"] };
  node.children = [
    {
      type: "element",
      tagName: "time",
      properties: { className: ["article-timeline-date"] },
      children: [{ type: "text", value: date }],
    },
    ...(node.children ?? []),
  ];
  return true;
}

/**
 * Wrap explicitly declared non-essay content in one reusable semantic shell.
 * Markdown owns the editorial choice; the renderer never guesses from image
 * count, link density, or a title. Variants remain CSS concerns, except that a
 * declared timeline exposes its leading date as a real <time> label.
 */
function rehypeArticleLayouts() {
  const walk = (parent: TableFigureNode) => {
    const children = parent.children;
    if (!children) return;

    for (let index = 0; index < children.length; index += 1) {
      const start = children[index];
      const layout = Array.from(ARTICLE_LAYOUT_MARKERS.entries()).find(([marker]) => markerParagraph(start, marker));
      if (!layout) continue;

      let endIndex = significantSibling(children, index + 1, 1);
      while (endIndex >= 0 && !markerParagraph(children[endIndex], ARTICLE_LAYOUT_END_MARKER)) {
        endIndex = significantSibling(children, endIndex + 1, 1);
      }
      if (endIndex < 0) continue;

      const [, variant] = layout;
      const content = children.slice(index + 1, endIndex);
      if (variant === "timeline") {
        for (const node of content) addTimelineDate(node);
      }
      children.splice(index, endIndex - index + 1, {
        type: "element",
        tagName: "section",
        properties: {
          className: ["article-layout", `article-layout-${variant}`],
          "data-layout": variant,
        },
        children: content,
      });
    }

    for (const child of children) {
      if (child.type === "element") walk(child);
    }
  };

  return (tree: Root) => walk(tree as unknown as TableFigureNode);
}

/**
 * CommonMark keeps consecutive marker/image lines in one paragraph unless
 * authors insert blank lines. Split that compact spelling into real block
 * siblings before the semantic figure transforms run.
 */
function rehypeSplitCompactMediaMarkers() {
  const walk = (parent: TableFigureNode) => {
    const children = parent.children;
    if (!children) return;

    for (let index = 0; index < children.length; index += 1) {
      const paragraph = children[index];
      if (paragraph.type !== "element" || paragraph.tagName !== "p" || !paragraph.children) continue;
      const imageIndex = paragraph.children.findIndex(
        (child) => child.type === "element" && child.tagName === "img"
      );
      if (imageIndex < 0) continue;
      if (paragraph.children.filter((child) => child.type === "element" && child.tagName === "img").length !== 1) continue;

      const before = paragraph.children.slice(0, imageIndex);
      const after = paragraph.children.slice(imageIndex + 1);
      if (!before.every((child) => child.type === "text") || !after.every((child) => child.type === "text")) continue;
      const rawBeforeText = before.map((child) => child.value ?? "").join("");
      const afterText = after.map((child) => child.value ?? "").join("").trim();
      const markerOffset = BLOCK_MEDIA_MARKERS.reduce((found, marker) => {
        const offset = rawBeforeText.lastIndexOf(`\n${marker}`);
        return Math.max(found, offset >= 0 ? offset + 1 : rawBeforeText.startsWith(marker) ? 0 : -1);
      }, -1);
      if (markerOffset < 0) continue;
      const leadingText = rawBeforeText.slice(0, markerOffset).trim();
      const beforeText = rawBeforeText.slice(markerOffset).trim();
      if (afterText && !BLOCK_MEDIA_MARKERS.some((marker) => afterText.startsWith(marker))) continue;

      const replacement: TableFigureNode[] = [
        ...(leadingText
          ? [{
              type: "element" as const,
              tagName: "p",
              properties: {},
              children: [{ type: "text" as const, value: leadingText }],
            }]
          : []),
        { type: "element", tagName: "p", properties: {}, children: [{ type: "text", value: beforeText }] },
        {
          type: "element",
          tagName: "p",
          properties: {},
          children: [paragraph.children[imageIndex]],
        },
      ];
      if (afterText) {
        replacement.push({
          type: "element",
          tagName: "p",
          properties: {},
          children: [{ type: "text", value: afterText }],
        });
      }
      children.splice(index, 1, ...replacement);
      index += replacement.length - 1;
    }

    for (const child of children) {
      if (child.type === "element") walk(child);
    }
  };

  return (tree: Root) => walk(tree as unknown as TableFigureNode);
}

/** The lone `img` of an image-only paragraph, or undefined when the paragraph holds anything else. */
function soleImage(node: TableFigureNode | undefined): TableFigureNode | undefined {
  if (node?.type !== "element" || node.tagName !== "p") return undefined;
  const elements = (node.children ?? []).filter(
    (child) => child.type !== "text" || /\S/u.test(child.value ?? "")
  );
  if (elements.length !== 1) return undefined;
  const only = elements[0];
  return only.type === "element" && only.tagName === "img" ? only : undefined;
}

/** A display-math block before rehype-katex turns it into rendered KaTeX. */
function soleDisplayMath(node: TableFigureNode | undefined): TableFigureNode | undefined {
  if (node?.type !== "element" || node.tagName !== "pre") return undefined;
  const children = (node.children ?? []).filter(
    (child) => child.type !== "text" || /\S/u.test(child.value ?? "")
  );
  return children.length === 1 && hasNodeClass(children[0], "math-display") ? node : undefined;
}

/** The lone anchor of a link-only paragraph, or undefined for mixed prose. */
function soleLink(node: TableFigureNode | undefined): TableFigureNode | undefined {
  if (node?.type !== "element" || node.tagName !== "p") return undefined;
  const elements = (node.children ?? []).filter(
    (child) => child.type !== "text" || /\S/u.test(child.value ?? "")
  );
  if (elements.length !== 1) return undefined;
  const only = elements[0];
  return only.type === "element" && only.tagName === "a" ? only : undefined;
}

/**
 * Convert one explicit audio marker and its R2-managed MP3 into a semantic
 * audio figure. A published cover is used when present but is never invented.
 * The native controls remain as a no-JS fallback; ArticleAudioRuntime adds the
 * themed transport after hydration.
 */
function rehypeArticleAudio() {
  const walk = (parent: TableFigureNode) => {
    const children = parent.children;
    if (!children) return;

    for (let index = 0; index < children.length; index += 1) {
      const caption = children[index];
      if (!markerParagraph(caption, AUDIO_CAPTION_MARKER)) continue;

      const linkIndex = significantSibling(children, index + 1, 1);
      const link = linkIndex >= 0 ? soleLink(children[linkIndex]) : undefined;
      const href = link?.properties?.href;
      const title = link?.properties?.title;
      const duration = typeof title === "string" ? AUDIO_DURATION_TITLE.exec(title) : null;
      if (typeof href !== "string" || !isWechatAudioSource(href) || !duration) continue;

      const coverIndex = significantSibling(children, linkIndex + 1, 1);
      const coverParagraph = coverIndex >= 0 ? children[coverIndex] : undefined;
      const cover = soleImage(coverParagraph);
      const coverSrc = cover?.properties?.src;
      const width = Number(cover?.properties?.width);
      const height = Number(cover?.properties?.height);
      const audioSrc = rewriteArchiveAssetUrl(href);
      const hasPublishedCover =
        typeof coverSrc === "string"
        && isR2AudioCoverUrl(coverSrc)
        && Boolean(width)
        && Boolean(height)
        && coverSrc.slice(0, coverSrc.lastIndexOf("/")) === audioSrc.slice(0, audioSrc.lastIndexOf("/"));

      const expectedSeconds = Number(duration[1]) * 60 + Number(duration[2]);
      stripParagraphMarker(caption, AUDIO_CAPTION_MARKER);
      const captionText = elementText(caption as Element).trim();
      if (hasPublishedCover) {
        cover!.properties = {
          ...(cover!.properties ?? {}),
          className: ["article-audio-cover"],
          loading: "eager",
        };
      }

      children.splice(index, (hasPublishedCover ? coverIndex : linkIndex) - index + 1, {
        type: "element",
        tagName: "figure",
        properties: {
          className: ["article-audio", ...(hasPublishedCover ? [] : ["article-audio-compact"])],
        },
        children: [
          ...(hasPublishedCover
            ? [{
                type: "element" as const,
                tagName: "div",
                properties: { className: ["article-audio-artwork"] },
                children: [cover!],
              }]
            : []),
          {
            type: "element",
            tagName: "div",
            properties: { className: ["article-audio-body"] },
            children: [
              {
                type: "element",
                tagName: "p",
                properties: { className: ["article-audio-kicker"] },
                children: [{
                  type: "text",
                  value: hasPublishedCover ? "ROOF PODCAST / EPISODE" : "ROOF AUDIO / ARCHIVE",
                }],
              },
              {
                type: "element",
                tagName: "figcaption",
                properties: { className: ["article-audio-caption"] },
                children: caption.children ?? [],
              },
              {
                type: "element",
                tagName: "audio",
                properties: {
                  className: ["article-audio-native"],
                  "data-roof-audio": "r2",
                  "data-roof-audio-duration": String(expectedSeconds),
                  src: audioSrc,
                  controls: true,
                  preload: "metadata",
                  ...(captionText ? { "aria-label": captionText } : {}),
                },
                children: [],
              },
            ],
          },
        ],
      });
    }

    for (const child of children) {
      if (child.type === "element") walk(child);
    }
  };

  return (tree: Root) => walk(tree as unknown as TableFigureNode);
}

/**
 * Convert an explicit external-music marker and a verified NetEase song link
 * into a semantic card. The server output remains a useful ordinary link;
 * ArticleMusicRuntime adds NetEase's official outchain player after hydration.
 */
function rehypeArticleMusic() {
  const walk = (parent: TableFigureNode) => {
    const children = parent.children;
    if (!children) return;

    for (let index = 0; index < children.length; index += 1) {
      const caption = children[index];
      if (!markerParagraph(caption, MUSIC_CAPTION_MARKER)) continue;

      const linkIndex = significantSibling(children, index + 1, 1);
      const link = linkIndex >= 0 ? soleLink(children[linkIndex]) : undefined;
      const href = link?.properties?.href;
      const title = link?.properties?.title;
      const hrefId = typeof href === "string" ? neteaseSongIdFromUrl(href) : undefined;
      const titleId = typeof title === "string" ? neteaseSongIdFromTitle(title) : undefined;
      if (!hrefId || hrefId !== titleId) continue;

      stripParagraphMarker(caption, MUSIC_CAPTION_MARKER);
      const captionText = elementText(caption as Element).trim();
      delete link?.properties?.title;
      link!.properties = {
        ...(link!.properties ?? {}),
        className: ["article-music-fallback"],
        target: "_blank",
        rel: "noopener noreferrer",
      };

      children.splice(index, linkIndex - index + 1, {
        type: "element",
        tagName: "figure",
        properties: {
          className: ["article-music"],
          "data-roof-music": "netease",
          "data-roof-music-id": hrefId,
          ...(captionText ? { "aria-label": captionText } : {}),
        },
        children: [
          {
            type: "element",
            tagName: "div",
            properties: { className: ["article-music-head"] },
            children: [
              {
                type: "element",
                tagName: "p",
                properties: { className: ["article-music-kicker"] },
                children: [{ type: "text", value: "LISTEN / NETEASE CLOUD MUSIC" }],
              },
              {
                type: "element",
                tagName: "figcaption",
                properties: { className: ["article-music-caption"] },
                children: caption.children ?? [],
              },
            ],
          },
          {
            type: "element",
            tagName: "div",
            properties: { className: ["article-music-player"], "data-music-player": "" },
            children: [link!],
          },
        ],
      });
    }

    for (const child of children) {
      if (child.type === "element") walk(child);
    }
  };

  return (tree: Root) => walk(tree as unknown as TableFigureNode);
}

/**
 * Convert an explicit `[视频]` caption and one or more R2-managed MP4 links
 * into a native player. Multiple declared sizes become an explicit quality
 * set; arbitrary links and raw HTML never enter this path.
 */
function rehypeArticleVideos() {
  const walk = (parent: TableFigureNode) => {
    const children = parent.children;
    if (!children) return;

    for (let index = 0; index < children.length; index += 1) {
      const caption = children[index];
      if (!markerParagraph(caption, VIDEO_CAPTION_MARKER)) continue;

      const sources: ArticleVideoSource[] = [];
      const durations = new Set<number>();
      let lastLinkIndex = index;
      let linkIndex = significantSibling(children, index + 1, 1);
      while (linkIndex >= 0) {
        const link = soleLink(children[linkIndex]);
        const href = link?.properties?.href;
        const title = link?.properties?.title;
        if (typeof href !== "string" || !isWechatVideoSource(href) || typeof title !== "string") break;
        const size = VIDEO_SOURCE_TITLE.exec(title);
        if (!size) break;
        const width = Number(size[1]);
        const height = Number(size[2]);
        const durationSeconds = Number(size[3]) * 60 + Number(size[4]);
        if (!width || !height || !durationSeconds) break;
        durations.add(durationSeconds);
        sources.push({
          label: `${height}P`,
          width,
          height,
          src: rewriteArchiveAssetUrl(href),
        });
        lastLinkIndex = linkIndex;
        linkIndex = significantSibling(children, linkIndex + 1, 1);
      }
      if (sources.length === 0 || durations.size !== 1) continue;
      const durationSeconds = [...durations][0];
      sources.sort((left, right) => right.height - left.height || right.width - left.width);
      const primary = sources[0];
      const originalHref = sources.find((source) => /\/original-\d+x\d+\.mp4$/u.test(source.src))?.src;
      if (!originalHref) continue;
      const posterHref = originalHref.replace(
        /\/original-\d+x\d+\.mp4$/u,
        `/poster-${primary.width}x${primary.height}.jpg`
      );
      stripParagraphMarker(caption, VIDEO_CAPTION_MARKER);
      const captionText = elementText(caption as Element).trim();

      children.splice(index, lastLinkIndex - index + 1, {
        type: "element",
        tagName: "figure",
        properties: { className: ["article-video"] },
        children: [
          {
            type: "element",
            tagName: "video",
            properties: {
              className: ["article-video-player"],
              "data-roof-video": "r2",
              "data-roof-video-duration": String(durationSeconds),
              ...(sources.length > 1
                ? { "data-roof-video-sources": JSON.stringify(sources) }
                : {}),
              src: primary.src,
              poster: posterHref,
              controls: true,
              preload: "metadata",
              playsInline: true,
              width: primary.width,
              height: primary.height,
              ...(captionText ? { "aria-label": captionText } : {}),
            },
            children: [],
          },
          {
            type: "element",
            tagName: "figcaption",
            properties: { className: ["article-video-caption"] },
            children: caption.children ?? [],
          },
        ],
      });
    }

    for (const child of children) {
      if (child.type === "element") walk(child);
    }
  };

  return (tree: Root) => walk(tree as unknown as TableFigureNode);
}

/**
 * Turn a `[图题]` paragraph plus the image or display formula that follows it
 * into a captioned `<figure>`, with the caption printed below the plate as in
 * the source editions. Images without the marker are left alone, so alt text
 * that is a placeholder rather than a legend never leaks into the page.
 */
function rehypeImageFigures() {
  const walk = (parent: TableFigureNode) => {
    const children = parent.children;
    if (!children) return;

    for (let index = 0; index < children.length; index += 1) {
      const caption = children[index];
      if (!markerParagraph(caption, FIGURE_CAPTION_MARKER)) continue;

      const mediaIndex = significantSibling(children, index + 1, 1);
      const paragraph = mediaIndex >= 0 ? children[mediaIndex] : undefined;
      const image = soleImage(paragraph);
      const media = image ?? soleDisplayMath(paragraph);
      if (!media) continue;
      stripParagraphMarker(caption, FIGURE_CAPTION_MARKER);

      let width: string | undefined;
      if (image) {
        const title = image.properties?.title;
        if (typeof title === "string") {
          const match = FIGURE_WIDTH_TITLE.exec(title);
          if (match && FIGURE_WIDTHS.has(match[1])) {
            width = match[1];
            delete image.properties?.title;
          }
        }
      }

      const notes: TableFigureNode[] = [];
      let endIndex = mediaIndex;
      let nextIndex = significantSibling(children, mediaIndex + 1, 1);
      while (nextIndex >= 0 && markerParagraph(children[nextIndex], FIGURE_NOTE_MARKER)) {
        const note = children[nextIndex];
        stripParagraphMarker(note, FIGURE_NOTE_MARKER);
        note.properties = { ...(note.properties ?? {}), className: ["article-figure-note"] };
        notes.push(note);
        endIndex = nextIndex;
        nextIndex = significantSibling(children, nextIndex + 1, 1);
      }

      const figure: TableFigureNode = {
        type: "element",
        tagName: "figure",
        properties: {
          className: ["article-figure"],
          ...(width ? { "data-width": width } : {}),
        },
        children: [
          media,
          {
            type: "element",
            tagName: "figcaption",
            properties: { className: ["article-figure-caption"] },
            children: caption.children ?? [],
          },
          ...(notes.length > 0
            ? [{
                type: "element",
                tagName: "div",
                properties: { className: ["article-figure-notes"] },
                children: notes,
              } satisfies TableFigureNode]
            : []),
        ],
      };

      children.splice(index, endIndex - index + 1, figure);
    }

    for (const child of children) {
      if (child.type === "element") walk(child);
    }
  };

  return (tree: Root) => walk(tree as unknown as TableFigureNode);
}

/**
 * Turn a compact portrait record into a semantic profile plate. Profiles use
 * the same discrete image widths as ordinary figures, but keep the person's
 * name separate from the longer biographical note so the figure index remains
 * concise.
 */
function rehypeProfileFigures() {
  const walk = (parent: TableFigureNode) => {
    const children = parent.children;
    if (!children) return;

    for (let index = 0; index < children.length; index += 1) {
      const name = children[index];
      const nameMarker = [PROFILE_NAME_MARKER, PROFILE_AUTHOR_NAME_MARKER, PROFILE_CARD_NAME_MARKER]
        .find((marker) => markerParagraph(name, marker));
      if (!nameMarker) continue;

      const imageIndex = significantSibling(children, index + 1, 1);
      const paragraph = imageIndex >= 0 ? children[imageIndex] : undefined;
      const image = soleImage(paragraph);
      if (!image) continue;
      stripParagraphMarker(name, nameMarker);
      const bioMarker = nameMarker === PROFILE_NAME_MARKER
        ? PROFILE_BIO_MARKER
        : nameMarker === PROFILE_AUTHOR_NAME_MARKER
          ? PROFILE_AUTHOR_BIO_MARKER
          : PROFILE_CARD_BIO_MARKER;
      const compact = nameMarker !== PROFILE_NAME_MARKER;

      let width = "25";
      const title = image.properties?.title;
      if (typeof title === "string") {
        const match = FIGURE_WIDTH_TITLE.exec(title);
        if (match && FIGURE_WIDTHS.has(match[1])) {
          width = match[1];
          delete image.properties?.title;
        }
      }

      const bios: TableFigureNode[] = [];
      let endIndex = imageIndex;
      let nextIndex = significantSibling(children, imageIndex + 1, 1);
      while (nextIndex >= 0 && markerParagraph(children[nextIndex], bioMarker)) {
        const bio = children[nextIndex];
        stripParagraphMarker(bio, bioMarker);
        bio.properties = { ...(bio.properties ?? {}), className: ["article-profile-bio"] };
        bios.push(bio);
        endIndex = nextIndex;
        nextIndex = significantSibling(children, nextIndex + 1, 1);
      }

      const profile: TableFigureNode = {
        type: "element",
        tagName: "figure",
        properties: {
          className: compact ? ["article-profile", "article-profile-compact"] : ["article-profile"],
          "data-width": width,
        },
        children: [
          image,
          {
            type: "element",
            tagName: "figcaption",
            properties: { className: ["article-profile-name"] },
            children: name.children ?? [],
          },
          ...(bios.length > 0
            ? [{
                type: "element",
                tagName: "div",
                properties: { className: ["article-profile-copy"] },
                children: bios,
              } satisfies TableFigureNode]
            : []),
        ],
      };

      children.splice(index, endIndex - index + 1, profile);
    }

    for (const child of children) {
      if (child.type === "element") walk(child);
    }
  };

  return (tree: Root) => walk(tree as unknown as TableFigureNode);
}

/**
 * Group explicitly delimited semantic figures into a comparison grid. The
 * closing marker makes the editorial decision visible in Markdown and avoids
 * treating merely adjacent illustrations as a gallery.
 */
function rehypeImageGalleries() {
  const walk = (parent: TableFigureNode) => {
    const children = parent.children;
    if (!children) return;

    for (let index = 0; index < children.length; index += 1) {
      const title = children[index];
      if (!markerParagraph(title, GALLERY_TITLE_MARKER)) continue;

      const figures: TableFigureNode[] = [];
      let cursor = significantSibling(children, index + 1, 1);
      let endIndex = -1;
      while (cursor >= 0) {
        const node = children[cursor];
        if (markerParagraph(node, GALLERY_END_MARKER)) {
          endIndex = cursor;
          break;
        }
        if (node.type !== "element" || node.tagName !== "figure" || !hasNodeClass(node, "article-figure")) break;
        figures.push(node);
        cursor = significantSibling(children, cursor + 1, 1);
      }
      if (endIndex < 0 || figures.length < 2) continue;

      stripParagraphMarker(title, GALLERY_TITLE_MARKER);
      const gallery: TableFigureNode = {
        type: "element",
        tagName: "figure",
        properties: { className: ["article-gallery"], "data-count": String(figures.length) },
        children: [
          {
            type: "element",
            tagName: "figcaption",
            properties: { className: ["article-gallery-title"] },
            children: title.children ?? [],
          },
          {
            type: "element",
            tagName: "div",
            properties: { className: ["article-gallery-grid"] },
            children: figures,
          },
        ],
      };
      children.splice(index, endIndex - index + 1, gallery);
    }

    for (const child of children) {
      if (child.type === "element") walk(child);
    }
  };

  return (tree: Root) => walk(tree as unknown as TableFigureNode);
}

/**
 * Turn an explicitly delimited run of captioned figures into a horizontal,
 * scroll-snapping sequence. This is reserved for page-by-page scans and
 * consecutive frames whose order matters; ordinary adjacent images stay in
 * the document flow.
 */
function rehypeImageSlides(language: RenderLanguage = "zh") {
  const walk = (parent: TableFigureNode) => {
    const children = parent.children;
    if (!children) return;

    for (let index = 0; index < children.length; index += 1) {
      const title = children[index];
      if (!markerParagraph(title, SLIDES_TITLE_MARKER)) continue;

      const figures: TableFigureNode[] = [];
      let cursor = significantSibling(children, index + 1, 1);
      let endIndex = -1;
      while (cursor >= 0) {
        const node = children[cursor];
        if (markerParagraph(node, SLIDES_END_MARKER)) {
          endIndex = cursor;
          break;
        }
        if (node.type !== "element" || node.tagName !== "figure" || !hasNodeClass(node, "article-figure")) break;
        figures.push(node);
        cursor = significantSibling(children, cursor + 1, 1);
      }
      if (endIndex < 0 || figures.length < 2) continue;

      stripParagraphMarker(title, SLIDES_TITLE_MARKER);
      figures.forEach((figure, figureIndex) => {
        figure.properties = {
          ...(figure.properties ?? {}),
          "data-slide": String(figureIndex + 1),
          "data-total": String(figures.length),
        };
      });
      const slides: TableFigureNode = {
        type: "element",
        tagName: "figure",
        properties: { className: ["article-slides"], "data-count": String(figures.length) },
        children: [
          {
            type: "element",
            tagName: "figcaption",
            properties: { className: ["article-slides-title"] },
            children: title.children ?? [],
          },
          {
            type: "element",
            tagName: "div",
            properties: {
              className: ["article-slides-track"],
              role: "region",
              "aria-label": RENDER_LABELS[language].slides,
              tabIndex: 0,
            },
            children: figures,
          },
        ],
      };
      children.splice(index, endIndex - index + 1, slides);
    }

    for (const child of children) {
      if (child.type === "element") walk(child);
    }
  };

  return (tree: Root) => walk(tree as unknown as TableFigureNode);
}

/**
 * Consume an explicit print-width hint on an otherwise bare image paragraph.
 * Width is independent from caption semantics: alt text remains accessibility
 * text and must not become a visible legend merely because an editor sized the
 * plate.
 */
function rehypeBareImageWidths() {
  const walk = (parent: TableFigureNode) => {
    for (const node of parent.children ?? []) {
      if (node.type !== "element") continue;
      if (node.tagName === "p") {
        const image = soleImage(node);
        const title = image?.properties?.title;
        if (image && typeof title === "string") {
          const match = FIGURE_WIDTH_TITLE.exec(title);
          if (match && FIGURE_WIDTHS.has(match[1])) {
            delete image.properties?.title;
            node.properties = {
              ...(node.properties ?? {}),
              className: ["article-image"],
              "data-width": match[1],
            };
          }
        }
      }
      walk(node);
    }
  };
  return (tree: Root) => walk(tree as unknown as TableFigureNode);
}

function createProcessor(
  format: ContentFormat = "article",
  language: RenderLanguage = "zh"
) {
  const labels = RENDER_LABELS[language];
  return unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkMath)
  .use(remarkCjkFriendly)
  .use(remarkTrimCjkAutolinkTail)
  .use(remarkRemoveDetachedNoteHeadings)
  .use(remarkMergeAdjacentBlockquotes)
  .use(remarkRehype, {
    allowDangerousHtml: true,
    // GFM 脚注区标签本地化为「注释」，并去掉默认的 sr-only 类（本站将其作为可见的文章要件标题，由 CSS 单独定样式）
    footnoteLabel: labels.notes,
    footnoteLabelTagName: "h2",
    footnoteLabelProperties: {},
    footnoteBackLabel(referenceIndex, rereferenceIndex) {
      return `${labels.backToBody} ${referenceIndex + 1}${rereferenceIndex > 1 ? `-${rereferenceIndex}` : ""}`;
    },
    // 返回角标用 ↑(U+2191)，避免默认的 ↩(U+21A9) 在移动端被渲染成彩色 emoji，破坏美术资产一致性
    footnoteBackContent: "↑",
  })
  .use(rehypeSlug)
  .use(rehypeRewrite, format)
  .use(rehypeArticleLayouts)
  .use(rehypeTableFigures)
  .use(rehypeSplitCompactMediaMarkers)
  .use(rehypeArticleAudio)
  .use(rehypeArticleMusic)
  .use(rehypeArticleVideos)
  .use(rehypeProfileFigures)
  .use(rehypeImageFigures)
  .use(rehypeImageGalleries)
  .use(() => rehypeImageSlides(language))
  .use(rehypeBareImageWidths)
  .use(rehypeCjkEmphasis)
  .use(rehypeSmartQuotes)
  .use(rehypeCjkInterpuncts)
  .use(rehypeRareHanGlyphs)
  .use(rehypeLatinRuns)
  .use(rehypeKatex)
  .use(rehypeStringify, { allowDangerousHtml: true });
}

const processor = createProcessor();

function normalizeInlinePageMarkers(markdown: string): string {
  return markdown.replace(/^(<!--[ \t]*page\b[^>]*-->)[ \t]*(?=\S)/gimu, "$1\n\n");
}

export async function renderMarkdown(
  md: string,
  options: { format?: ContentFormat; language?: RenderLanguage } = {}
): Promise<string> {
  const language = options.language ?? "zh";
  const { markdown, sourceNotes } = extractSourceNotes(md, language);
  const activeProcessor = language === "zh" && (!options.format || options.format === "article")
    ? processor
    : createProcessor(options.format ?? "article", language);
  const file = await activeProcessor.process(
    escapeLiteralCurrencyDollars(normalizeInlinePageMarkers(markdown))
  );
  return sanitizePublicContentHtml(
    String(file) + await renderSourceNotes(sourceNotes, language, activeProcessor)
  );
}
