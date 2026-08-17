import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const postsRoot = path.join(process.cwd(), "source", "_posts");
const creditClause = /(?:^|[；;。｜|])\s*(?:原作|原作者|作者|评论者|受访|采访|翻译|中文译者|译者|编译|校对|编辑|润色|排版|主催|统筹|时间轴)(?:、(?:采访|翻译|校对|编辑|润色|排版))?[：:]/u;
const compactCreditRole = /(原作|原作者|翻译|译者|校对|编辑)(?=[，,；;。]|$)/gu;
const fineScopedBookCredits = new Set([
  "phenomenology-the-basics-introduction-chapters-1-2.md",
]);
const failures = [];

for (const name of fs.readdirSync(postsRoot).filter((entry) => entry.endsWith(".md"))) {
  const pathname = path.join(postsRoot, name);
  const source = fs.readFileSync(pathname, "utf8");
  const parsed = matter(source);
  const isBookDocument = parsed.data.book_document === true;
  const body = parsed.content;
  body.split("\n").forEach((line, index) => {
    const visible = line
      .trim()
      .replace(/^>\s*/u, "")
      .replace(/^[-+*]\s+/u, "")
      .replace(/\]\([^)]*\)/gu, "]")
      .replace(/<br\s*\/?>(?:\\)?$/iu, "")
      .replace(/\\$/u, "")
      .replace(/[*_~`]/gu, "")
      .trim();
    const compactRoles = new Set(
      [...visible.matchAll(compactCreditRole)].map((match) => {
        if (match[1] === "原作者") return "原作";
        if (match[1] === "译者") return "翻译";
        return match[1];
      }),
    );
    const fineScopedCredit =
      isBookDocument &&
      fineScopedBookCredits.has(name) &&
      /^(?:译者|校对)[：:]/u.test(visible);
    const sourceProvenanceOnly =
      isBookDocument &&
      /原作(?:者)?[：:]/u.test(visible) &&
      /[《〈]|Phenomenology:\s*The Basics/u.test(visible) &&
      !/(?:翻译|译者|校对|编辑|润色|排版|编排)[：:]/u.test(visible);
    const duplicateStructuredCredit =
      creditClause.test(visible) &&
      !(fineScopedCredit || sourceProvenanceOnly);
    if (duplicateStructuredCredit || compactRoles.size >= 3) {
      failures.push(`${name}:${index + 1}: ${line.trim()}`);
    }
  });
}

if (failures.length > 0) {
  throw new Error(
    "正文仍含应由页首结构化署名或编辑证据承接的责任行：\n" + failures.join("\n"),
  );
}

console.log("site-wide structured-credit deduplication passed");
