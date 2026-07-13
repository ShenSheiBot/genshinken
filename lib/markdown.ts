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
import remarkCjkFriendly from "remark-cjk-friendly";
import remarkRehype from "remark-rehype";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import { visit } from "unist-util-visit";
import type { Root, Element } from "hast";

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

        const first = (node.children ?? []).find((child) => {
          const item = child as { type?: string; value?: string };
          return item.type !== "text" || /\S/.test(item.value ?? "");
        }) as Element | undefined;
        if (first?.type === "element" && first.tagName === "strong") {
          const label = elementText(first);
          if (/^(摘　要|关键词)：/.test(label)) {
            const cn = props.className as unknown;
            props.className = Array.isArray(cn)
              ? [...cn, "article-summary-meta"]
              : cn ? [String(cn), "article-summary-meta"] : ["article-summary-meta"];
          }
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
  /[([{<"]?[\p{Script=Latin}\p{Script=Cyrillic}\p{Script=Greek}0-9][\p{Script=Latin}\p{Script=Cyrillic}\p{Script=Greek}0-9 \t\u00a0.,;:!?'\u2019"()[\]{}<>/\\&+%№§#@*=_~\-–—]*/gu;
const LATIN_WORD_CHAR = /[\p{Script=Latin}\p{Script=Cyrillic}\p{Script=Greek}0-9]/u;
const LATIN_SPACE = /[ \t\u00a0]/u;
const LATIN_QUOTE_PUNCT = /[.,;:!?)]/u;
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

type TextNode = { type: "text"; value: string };
type InlineRunNode = TextNode | Element;
type LatinState = { sq: boolean };

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

function isLatinWordChar(ch: string | undefined): boolean {
  return Boolean(ch && LATIN_WORD_CHAR.test(ch));
}

function nextNonSpace(value: string, start: number): string | undefined {
  for (let i = start; i < value.length; i++) {
    if (!LATIN_SPACE.test(value[i])) return value[i];
  }
  return undefined;
}

function updateLatinQuoteState(value: string, state: LatinState) {
  let open = state.sq;
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (ch === OPEN_SQ) {
      open = true;
      continue;
    }
    if (ch !== CLOSE_SQ) continue;

    const prev = value[i - 1];
    const directNext = value[i + 1];
    const next = nextNonSpace(value, i + 1);
    if (isLatinWordChar(prev) && isLatinWordChar(directNext)) continue;
    if (open) {
      open = false;
    } else if (!isLatinWordChar(prev) && isLatinWordChar(next)) {
      open = true;
    }
  }
  state.sq = open;
}

function openSingleBefore(value: string, index: number, state: LatinState): boolean {
  const inner = { sq: state.sq };
  for (let i = 0; i < index; i++) {
    const ch = value[i];
    if (ch === OPEN_SQ) {
      inner.sq = true;
      continue;
    }
    if (ch !== CLOSE_SQ) continue;

    const prev = value[i - 1];
    const directNext = value[i + 1];
    const next = nextNonSpace(value, i + 1);
    if (isLatinWordChar(prev) && isLatinWordChar(directNext)) continue;
    if (inner.sq) {
      inner.sq = false;
    } else if (!isLatinWordChar(prev) && isLatinWordChar(next)) {
      inner.sq = true;
    }
  }
  return inner.sq;
}

function isOuterLatinQuote(text: string, index: number, source: string, sourceIndex: number, state: LatinState): boolean {
  const ch = text[index];
  if (ch === CLOSE_DQ) return true;
  if (ch !== CLOSE_SQ) return false;

  const prev = text[index - 1];
  const directNext = text[index + 1];
  const next = nextNonSpace(text, index + 1);

  if (isLatinWordChar(prev) && isLatinWordChar(directNext)) return false;
  if (openSingleBefore(source, sourceIndex, state)) return true;
  if (isLatinWordChar(prev) && isLatinWordChar(next)) return false;
  if (isLatinWordChar(prev) && (next === "." || next === ",")) return false;
  return true;
}

function pushLatinPieces(out: InlineRunNode[], text: string, source: string, matchIndex: number, state: LatinState) {
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    if (!isOuterLatinQuote(text, i, source, matchIndex + i, state)) continue;

    pushLatin(out, text.slice(start, i));
    let end = i + 1;
    while (end < text.length && LATIN_QUOTE_PUNCT.test(text[end])) end++;
    pushText(out, text.slice(i, end));
    start = end;
    i = end - 1;
  }
  pushLatin(out, text.slice(start));
}

function splitLatinRuns(value: string, state: LatinState): InlineRunNode[] {
  const out: InlineRunNode[] = [];
  let last = 0;
  for (const match of value.matchAll(LATIN_RUN)) {
    const index = match.index ?? 0;
    const text = match[0];
    if (index > last) {
      const plain = value.slice(last, index);
      out.push({ type: "text", value: plain });
      updateLatinQuoteState(plain, state);
    }
    pushLatinPieces(out, text, value, index, state);
    updateLatinQuoteState(text, state);
    last = index + text.length;
  }
  if (last === 0) return [{ type: "text", value }];
  if (last < value.length) {
    const rest = value.slice(last);
    out.push({ type: "text", value: rest });
    updateLatinQuoteState(rest, state);
  }
  return out;
}

function rehypeLatinRuns() {
  const walk = (node: { type?: string; tagName?: string; value?: string; children?: unknown[] }, state: LatinState) => {
    if (node.type === "element" && node.tagName && LATIN_SKIP.has(node.tagName)) return;
    if (!Array.isArray(node.children)) return;

    const next: unknown[] = [];
    for (const raw of node.children) {
      const child = raw as { type?: string; tagName?: string; value?: string; children?: unknown[] };
      if (child.type === "text" && typeof child.value === "string") {
        next.push(...splitLatinRuns(child.value, state));
      } else {
        walk(child, state);
        next.push(child);
      }
    }
    node.children = next;
  };
  return (tree: Root) => walk(tree as unknown as { children: unknown[] }, { sq: false });
}

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkCjkFriendly)
  .use(remarkRehype, {
    allowDangerousHtml: true,
    // GFM 脚注区标签本地化为「注释」，并去掉默认的 sr-only 类（本站将其作为可见的文章要件标题，由 CSS 单独定样式）
    footnoteLabel: "注释",
    footnoteLabelTagName: "h2",
    footnoteLabelProperties: {},
    // 返回角标用 ↑(U+2191)，避免默认的 ↩(U+21A9) 在移动端被渲染成彩色 emoji，破坏美术资产一致性
    footnoteBackContent: "↑",
  })
  .use(rehypeSlug)
  .use(rehypeRewrite)
  .use(rehypeCjkEmphasis)
  .use(rehypeSmartQuotes)
  .use(rehypeCjkInterpuncts)
  .use(rehypeLatinRuns)
  .use(rehypeStringify, { allowDangerousHtml: true });

export async function renderMarkdown(md: string): Promise<string> {
  const { markdown, sourceNotes } = extractSourceNotes(md);
  const file = await processor.process(markdown);
  return String(file) + await renderSourceNotes(sourceNotes);
}
