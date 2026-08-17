/* ============================================================
   排版规则注册表 — 规则→检查的强制映射。
   2026-08 诊断结论：343 处手工修复的 8 类排版问题里 7 类从未成文、
   1 类成文但零检查，而架构上没有任何机制暴露"规则存在但无检查"。
   本脚本就是那个机制：docs/delivery-standards.md 每声明一个
   [TYPO-*] 规则 ID，这里必须登记它的执法方式——自动检查须给出
   脚本与锚点（锚点须真实存在于该脚本中），人工审读须显式豁免并
   给出理由。文档新增规则而未登记、登记了文档没有的规则、锚点
   失效，三者都直接失败。
   ============================================================ */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

/** 每条规则：{ enforcedBy: { script, anchor } } 或 { manualReview: "理由" }。 */
const REGISTRY = {
  "TYPO-P1": {
    enforcedBy: { script: "scripts/validate-content.mjs", anchor: "TYPO-P1" },
  },
  "TYPO-P2": {
    // P1 的段尾白名单不含 、 ，，同一检查天然覆盖。
    enforcedBy: { script: "scripts/validate-content.mjs", anchor: "PROSE_TERMINAL" },
  },
  "TYPO-P3": {
    manualReview:
      "多段引文按中文惯例逐段重开引号，逐段自动配平误报率过高；引文收尾漏句号由 P1 捕获，其余靠人工审读。",
  },
  "TYPO-P4": {
    enforcedBy: { script: "scripts/validate-content.mjs", anchor: "TYPO-P4" },
  },
  "TYPO-P5": {
    enforcedBy: { script: "scripts/validate-content.mjs", anchor: "TYPO-P5" },
  },
  "TYPO-P6": {
    manualReview: "顿号/逗号的名词并列判定是语义问题，自动断言误报率过高。",
  },
  "TYPO-P7": {
    // 仅执法已复现的低误报形态：独立“注释/脚注”行后紧跟普通编号列表。
    // 其他裸编号仍需人工判断，避免把数学编号、页码和正常枚举误判为脚注。
    enforcedBy: { script: "scripts/validate-content.mjs", anchor: "manualFootnoteSection" },
  },
  "TYPO-P8": {
    manualReview: "整段引文是否该转 blockquote 是编辑判断，无法自动断言。",
  },
  "TYPO-P9": {
    // 只拒绝同篇已有直接数字定义时仍留在定义块之前的裸数字调用；
    // 没有定义的来源缺口仍可忠实保留为非链接标记。
    enforcedBy: { script: "scripts/validate-content.mjs", anchor: "numericFootnoteDefinitions" },
  },
  "TYPO-L1": {
    // 过撑行是版面缺陷，只有真实排版能测量：全语料枚举阅读路由 + 逐行字面步进。
    enforcedBy: {
      script: "tests/e2e/reader-line-justification.spec.ts",
      anchor: "MAX_GLYPH_ADVANCE_EM",
    },
  },
  "TYPO-G1": {
    // [图题]/[图注]/[表题]/[表注] 标记不得字面渲染进页面——全语料渲染扫描。
    enforcedBy: { script: "scripts/verify-markdown-typography.mjs", anchor: "markerLeak" },
  },
  "TYPO-G3": {
    enforcedBy: { script: "scripts/verify-markdown-typography.mjs", anchor: "invalidWidth" },
  },
  "TYPO-G4": {
    enforcedBy: { script: "scripts/verify-markdown-typography.mjs", anchor: "markerLeak" },
  },
};

const docPath = path.join(root, "docs", "delivery-standards.md");
const doc = fs.readFileSync(docPath, "utf8");
const declared = new Set([...doc.matchAll(/\[(TYPO-[A-Z]+\d+)\]/gu)].map(([, id]) => id));
assert.ok(declared.size > 0, "delivery-standards.md 必须声明 [TYPO-*] 规则 ID");

for (const id of declared) {
  assert.ok(
    Object.hasOwn(REGISTRY, id),
    `规则 ${id} 已写入 delivery-standards.md 但未在 verify-typography-registry.mjs 登记执法方式——` +
      `补自动检查并登记锚点，或显式登记 manualReview 豁免与理由`
  );
}
for (const [id, entry] of Object.entries(REGISTRY)) {
  if (id.startsWith("TYPO-P")) {
    assert.ok(declared.has(id), `注册表登记了 ${id} 但 delivery-standards.md 未声明——文档与注册表须同步`);
  }
  if (entry.enforcedBy) {
    const scriptPath = path.join(root, ...entry.enforcedBy.script.split("/"));
    assert.ok(fs.existsSync(scriptPath), `${id} 的执法脚本不存在：${entry.enforcedBy.script}`);
    const source = fs.readFileSync(scriptPath, "utf8");
    assert.ok(
      source.includes(entry.enforcedBy.anchor),
      `${id} 的执法锚点「${entry.enforcedBy.anchor}」在 ${entry.enforcedBy.script} 中不存在——检查被移除或改名了`
    );
  } else {
    assert.ok(
      typeof entry.manualReview === "string" && entry.manualReview.length >= 10,
      `${id} 的人工审读豁免必须给出理由`
    );
  }
}

const enforced = Object.values(REGISTRY).filter((entry) => entry.enforcedBy).length;
const waived = Object.values(REGISTRY).length - enforced;
console.log(
  `typography rule registry passed: ${declared.size} 条文档规则，${enforced} 条自动执法，${waived} 条显式人工豁免`
);
