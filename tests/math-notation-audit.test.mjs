import assert from "node:assert/strict";
import test from "node:test";

import { auditMarkdown } from "../scripts/audit-math-notation.mjs";

test("warns about attempted TeX subscripts and plain indexed sets", () => {
  const warnings = auditMarkdown("变量 *a_1*，集合 {a1、a2、a3、…、an}。", "sample.md");
  assert.deepEqual(
    warnings.flatMap((warning) => warning.reasons),
    ["斜体中含字面 TeX 下标", "连续编号变量仍是正文数字"],
  );
});

test("warns about formal logic left in prose", () => {
  const warnings = auditMarkdown("(K) ∀x(x是类型C的实例 ↔ Dx).", "sample.md");
  assert.ok(warnings.some((warning) => warning.reasons.includes("量词或证明符号仍在正文模式")));
  assert.ok(warnings.some((warning) => warning.reasons.includes("形式标签与定义仍在正文模式")));

  const relationWarnings = auditMarkdown("M(ϕ) = M(ψ)。", "sample.md");
  assert.ok(relationWarnings.some((warning) => warning.reasons.includes("形式关系式仍在正文模式")));

  for (const candidate of ["Y=f(x)", "A≡E", "1+1=3", "M=&lt;D,f&gt;"]) {
    assert.ok(
      auditMarkdown(candidate, "sample.md").some((warning) =>
        warning.reasons.includes("形式关系式仍在正文模式"),
      ),
      candidate,
    );
  }

  const contextualWarnings = auditMarkdown("话语结构里的S1、S2与Φ符号。", "sample.md");
  assert.ok(
    contextualWarnings.some((warning) => warning.reasons.includes("形式语境中的符号仍在正文模式")),
  );

  const chemistryWarnings = auditMarkdown("化合物水是H2O，二氧化碳是CO2。", "sample.md");
  assert.ok(
    chemistryWarnings.some((warning) => warning.reasons.includes("化学式下标仍是正文数字")),
  );
});

test("does not warn for KaTeX, code, links, usernames, isolated formula-like strings, or Turn A Gundam", () => {
  const markdown = [
    "$S = \\{a_1, a_2, a_3, \\dots, a_n\\}$",
    "`a_1`",
    "[August_Rush](https://example.com/August_Rush)",
    "H2O、S1/S2、《∀高达》、∀ガンダム与页码P74、P107、P183。",
    "颜文字(╯‵□′)╯︵┻━┻与原稿中的□□□占位符。",
    "大男子主义的满足 = 某种叙事判断，而不是形式定义。",
    "develop feelings → date and fall in love (repeat as necessary) → marry",
  ].join("\n\n");
  assert.deepEqual(auditMarkdown(markdown, "sample.md"), []);
});
