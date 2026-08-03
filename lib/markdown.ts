/* ============================================================
   Markdown → HTML 渲染管线
   - GFM（表格 / 删除线 / 自动链接）
   - CJK 友好的强调（**中文：**后接中文也能加粗）
   - 标题加 id（便于锚点）
   - 脚注 _ftn/_ftnref 互锚（Word/Outline 导出的脚注可往返跳转）
   - 相对图片路径 attachments/x → /attachments/x；清理 Typora 尺寸标注
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

const SIZE_TITLE = /^\s*=(\d+)x(\d+)\s*$/; // Typora/Hexo 图片尺寸标注

type SourceNote = {
  key: string;
  num: number;
  label: string;
  text: string;
  refs: string[];
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

function extractSourceNotes(md: string): { markdown: string; sourceNotes: SourceNote[] } {
  const defs = new Map<string, SourceNote>();

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

    return `<sup class="source-ref" id="${refId}"><a href="#source-note-${key}" aria-label="文献 ${note.label}">${note.label}</a></sup>`;
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

async function renderSourceNotes(sourceNotes: SourceNote[]): Promise<string> {
  if (sourceNotes.length === 0) return "";

  const items = await Promise.all(
    sourceNotes.map(async (note) => {
      const backrefs = note.refs
        .map(
          (refId) =>
            `<a href="#${refId}" class="source-backref" aria-label="返回文献 ${note.label}">↑</a>`
        )
        .join("");
      const html = String(await processor.process(note.text)).trim();
      return `<li id="source-note-${note.key}" value="${note.num}">${appendBackrefs(html, backrefs)}</li>`;
    })
  );

  return `<section class="source-notes" data-source-notes><h2>文献</h2><ol>${items.join("")}</ol></section>`;
}

/** 修正相对资源路径、外链行为、脚注锚点 */
function rehypeRewrite() {
  return (tree: Root) => {
    visit(tree, "element", (node: Element, index, parent) => {
      const props = node.properties ?? {};

      if (node.tagName === "img" && typeof props.src === "string") {
        const src = props.src;
        const isAbsolute =
          /^https?:\/\//.test(src) || src.startsWith("/") || src.startsWith("data:");
        if (!isAbsolute) props.src = "/" + src.replace(/^\.?\//, "");
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

        const firstIndex = (node.children ?? []).findIndex((child) => {
          const item = child as { type?: string; value?: string };
          return item.type !== "text" || /\S/.test(item.value ?? "");
        });
        const first = firstIndex >= 0 ? node.children?.[firstIndex] as Element | undefined : undefined;
        if (first?.type === "element" && first.tagName === "strong") {
          const label = elementText(first);
          const next = node.children?.[firstIndex + 1] as { type?: string; value?: string } | undefined;
          const classNames = Array.isArray(props.className)
            ? [...props.className]
            : props.className ? [String(props.className)] : [];
          if (/^(摘　要|关键词)：/.test(label)) classNames.push("article-summary-meta");
          if (label === "编按：") classNames.push("editorial-note");
          if (next?.type === "text" && next.value?.startsWith("　")) classNames.push("speaker-turn");
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
  /[\p{Script=Latin}\p{Script=Cyrillic}\p{Script=Greek}0-9 \t\u00a0.,;:!?'\u2018\u2019\u201c\u201d"()[\]{}<>/\\&+%№§#@*=_~\-–—]*[\p{Script=Latin}\p{Script=Cyrillic}\p{Script=Greek}0-9][\p{Script=Latin}\p{Script=Cyrillic}\p{Script=Greek}0-9 \t\u00a0.,;:!?'\u2018\u2019\u201c\u201d"()[\]{}<>/\\&+%№§#@*=_~\-–—]*/gu;
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

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkMath)
  .use(remarkCjkFriendly)
  .use(remarkRehype, {
    allowDangerousHtml: true,
    // GFM 脚注区标签本地化为「注释」，并去掉默认的 sr-only 类（本站将其作为可见的文章要件标题，由 CSS 单独定样式）
    footnoteLabel: "注释",
    footnoteLabelTagName: "h2",
    footnoteLabelProperties: {},
    footnoteBackLabel(referenceIndex, rereferenceIndex) {
      return `返回正文引用 ${referenceIndex + 1}${rereferenceIndex > 1 ? `-${rereferenceIndex}` : ""}`;
    },
    // 返回角标用 ↑(U+2191)，避免默认的 ↩(U+21A9) 在移动端被渲染成彩色 emoji，破坏美术资产一致性
    footnoteBackContent: "↑",
  })
  .use(rehypeSlug)
  .use(rehypeRewrite)
  .use(rehypeCjkEmphasis)
  .use(rehypeSmartQuotes)
  .use(rehypeCjkInterpuncts)
  .use(rehypeRareHanGlyphs)
  .use(rehypeLatinRuns)
  .use(rehypeKatex)
  .use(rehypeStringify, { allowDangerousHtml: true });

function normalizeInlinePageMarkers(markdown: string): string {
  return markdown.replace(/^(<!--[ \t]*page\b[^>]*-->)[ \t]*(?=\S)/gimu, "$1\n\n");
}

export async function renderMarkdown(md: string): Promise<string> {
  const { markdown, sourceNotes } = extractSourceNotes(md);
  const file = await processor.process(normalizeInlinePageMarkers(markdown));
  return sanitizePublicContentHtml(String(file) + await renderSourceNotes(sourceNotes));
}
