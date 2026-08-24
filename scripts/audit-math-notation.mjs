import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import { unified } from "unified";

const DEFAULT_ROOTS = ["source/_posts", "source/_books", "source/_translations"];
const IGNORED_ANCESTORS = new Set([
  "code",
  "definition",
  "html",
  "image",
  "imageReference",
  "inlineCode",
  "inlineMath",
  "link",
  "linkReference",
  "math",
]);
const CHEMICAL_ELEMENTS = new Set(
  "H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og".split(
    " ",
  ),
);

function replaceFrontmatterWithBlankLines(markdown) {
  if (!markdown.startsWith("---\n")) return markdown;
  const end = markdown.indexOf("\n---\n", 4);
  if (end === -1) return markdown;
  return `${"\n".repeat(markdown.slice(0, end + 5).split("\n").length - 1)}${markdown.slice(end + 5)}`;
}

function compact(value) {
  return value.replace(/\s+/gu, " ").trim();
}

function hasChemicalFormulaNeedingSubscripts(text) {
  if (!/(?:化学|分子|原子|化合物|官能团|结构式|实验式|同分异构|氢|氧|碳)/u.test(text)) return false;
  for (const match of text.matchAll(/\b(?:[A-Z][a-z]?\d*){2,}\b/gu)) {
    const tokens = [...match[0].matchAll(/([A-Z][a-z]?)(\d*)/gu)];
    if (
      tokens.length >= 2 &&
      tokens.some((token) => token[2] !== "") &&
      tokens.map((token) => token[0]).join("") === match[0] &&
      tokens.every((token) => CHEMICAL_ELEMENTS.has(token[1]))
    ) {
      return true;
    }
  }
  return false;
}

export function mathNotationReasons(value, ancestors = []) {
  const text = compact(value);
  if (!text || ancestors.some((node) => IGNORED_ANCESTORS.has(node.type))) return [];

  const reasons = [];
  const parent = ancestors.at(-1);

  // A short italic token such as *a_1* is almost always an attempted TeX
  // subscript. Restricting this to emphasis avoids usernames and filenames.
  if (
    parent?.type === "emphasis" &&
    /^(?:[A-Za-zΑ-Ωα-ω][A-Za-zΑ-Ωα-ω0-9]*_[{]?[A-Za-zΑ-Ωα-ω0-9]+[}]?)(?:\s*[,、，…]\s*[A-Za-zΑ-Ωα-ω][A-Za-zΑ-Ωα-ω0-9]*_[{]?[A-Za-zΑ-Ωα-ω0-9]+[}]?)*$/u.test(
      text,
    )
  ) {
    reasons.push("斜体中含字面 TeX 下标");
  }

  // Three or more indexed variables with the same stem are a strong signal;
  // ordinary model names such as S1/S2 and chemical formulae do not match.
  const indexedSequence = text.match(
    /\b([A-Za-zΑ-Ωα-ω])([0-9])(?:\s*[,、，]\s*\1[0-9]){2,}(?:\s*[,、，]\s*…\s*[,、，]?\s*\1(?:[0-9]|[A-Za-zΑ-Ωα-ω]))?/u,
  );
  if (indexedSequence) reasons.push("连续编号变量仍是正文数字");

  if (hasChemicalFormulaNeedingSubscripts(text)) reasons.push("化学式下标仍是正文数字");

  if (/[∀∃⊢⊨]/u.test(text) && !/∀(?:高达|ガンダム)/u.test(text)) {
    reasons.push("量词或证明符号仍在正文模式");
  }

  const formalRelations = [
    /\b[A-Za-zΑ-Ωα-ω][A-Za-zΑ-Ωα-ω0-9]{0,2}\s*\([^\n()]{0,40}\)\s*(?:↔|≡|⊊|⊆|⊂|∈|∉|≠|(?<![<>=])=(?!=)|→)\s*[A-Za-zΑ-Ωα-ω{λ]/u,
    /\b[A-Za-zΑ-Ωα-ω][0-9]*\s*(?:↔|≡|⊊|⊆|⊂|∈|∉|≠|(?<![<>=])=(?!=)|→)\s*(?:\{|[A-Za-zΑ-Ωα-ω][0-9]*(?:\s|[,.，。；;)]|$))/u,
    /λ[A-Za-zΑ-Ωα-ω][^。；;\n]{0,80}(?:↔|≡|≠|(?<![<>=])=(?!=)|→)/u,
    /\{[^\n{}]{1,100}\}\s*(?:↔|≡|⊊|⊆|⊂|∈|∉|≠|(?<![<>=])=(?!=)|→)/u,
    /\b(?:[A-Z0-9](?:\s*\+\s*[A-Z0-9])*)\s*(?:≡|(?<![<>=])=(?!=))\s*(?:[A-Z0-9](?:\s*[+\-]\s*[A-Z0-9])*)/u,
    /\b[A-Z]\s*=\s*[A-Za-zΑ-Ωα-ω]\s*\([^\n()]{0,80}\)/u,
    /(?:<|&lt;)[A-Za-zΑ-Ωα-ω](?:\s*[,，]\s*[A-Za-zΑ-Ωα-ω])+(?:>|&gt;)/u,
  ];
  if (formalRelations.some((pattern) => pattern.test(text))) reasons.push("形式关系式仍在正文模式");

  const indexedDiscourseLabels =
    /\bS1\b/u.test(text) && /\bS2\b/u.test(text) && /(?:话语|位置|代理|能指|坐标|公式)/u.test(text);
  if (
    /(?:S\(A\)|T\(P\)|λ[A-Za-zΑ-Ωα-ω]|[＄$\\]?[◇◊]a|[Φφϕ])/u.test(text) ||
    indexedDiscourseLabels
  ) {
    reasons.push("形式语境中的符号仍在正文模式");
  }

  if (
    /^\((?:[A-Z](?:-[A-Za-z*]+)?|[A-Z][′″']|[0-9]+[′″'])\)\s*/u.test(text) &&
    /(?:当且仅当|if and only if|iff|∀|∃|↔|⊢|⊨|\b[A-Za-zΑ-Ωα-ω]\b)/u.test(text)
  ) {
    reasons.push("形式标签与定义仍在正文模式");
  }

  return [...new Set(reasons)];
}

export function auditMarkdown(markdown, file = "<markdown>") {
  const tree = unified().use(remarkParse).use(remarkMath).parse(replaceFrontmatterWithBlankLines(markdown));
  const warnings = [];

  function walk(node, ancestors) {
    if (node.type === "text") {
      const fragments = node.value.split("\n");
      for (const [offset, fragment] of fragments.entries()) {
        const reasons = mathNotationReasons(fragment, ancestors);
        if (reasons.length > 0) {
          warnings.push({
            file,
            line: (node.position?.start?.line ?? 0) + offset,
            reasons,
            excerpt: compact(fragment).slice(0, 160),
          });
        }
      }
    }
    for (const child of node.children ?? []) walk(child, [...ancestors, node]);
  }

  walk(tree, []);

  const lines = markdown.split(/\r?\n/u);
  const grouped = new Map();
  for (const warning of warnings) {
    const key = `${warning.file}:${warning.line}`;
    const current = grouped.get(key) ?? { ...warning, reasons: [] };
    current.reasons.push(...warning.reasons);
    current.reasons = [...new Set(current.reasons)];
    current.excerpt = compact(lines[warning.line - 1] ?? warning.excerpt).slice(0, 160);
    grouped.set(key, current);
  }
  return [...grouped.values()];
}

function markdownFiles(root) {
  if (!fs.existsSync(root)) return [];
  const files = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const absolute = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...markdownFiles(absolute));
    else if (entry.isFile() && absolute.endsWith(".md")) files.push(absolute);
  }
  return files;
}

export function auditRoots(roots = DEFAULT_ROOTS) {
  return roots
    .flatMap((root) => markdownFiles(root))
    .sort()
    .flatMap((file) => auditMarkdown(fs.readFileSync(file, "utf8"), file));
}

function main() {
  const warnings = auditRoots(process.argv.slice(2).length > 0 ? process.argv.slice(2) : DEFAULT_ROOTS);
  for (const warning of warnings) {
    console.warn(
      `数学记号警告：${warning.file}:${warning.line} ${warning.reasons.join("；")}\n  ${warning.excerpt}`,
    );
  }
  console.log(`数学记号审计完成：${warnings.length} 项非阻塞候选。`);
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) main();
