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

/** 修正相对资源路径、外链行为、脚注锚点 */
function rehypeRewrite() {
  return (tree: Root) => {
    visit(tree, "element", (node: Element) => {
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

      node.properties = props;
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

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkCjkFriendly)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeSlug)
  .use(rehypeRewrite)
  .use(rehypeSmartQuotes)
  .use(rehypeStringify, { allowDangerousHtml: true });

export async function renderMarkdown(md: string): Promise<string> {
  const file = await processor.process(md);
  return String(file);
}
