import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import { visit } from "unist-util-visit";

const UNESCAPED_DOLLAR = /(?<!\\)\$/gu;
const CURRENCY_AMOUNT = /^(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?/u;
const STRONG_MATH_SYNTAX = /[\\_^{}=+*/<>]/u;
const PROSE_WORD = /\p{L}+/gu;

function dollarOffsets(value) {
  return [...value.matchAll(UNESCAPED_DOLLAR)].map((match) => match.index ?? 0);
}

function currencyAmountEnd(value, dollarOffset) {
  const amount = CURRENCY_AMOUNT.exec(value.slice(dollarOffset + 1));
  return amount ? dollarOffset + 1 + amount[0].length : -1;
}

function isLiteralCurrencyDollar(value, offsets, offsetIndex) {
  const dollarOffset = offsets[offsetIndex];
  const amountEnd = currencyAmountEnd(value, dollarOffset);
  if (amountEnd < 0) return false;

  // `$5$` and `$2x+1$` are ordinary inline formulae. A numeric dollar with
  // no closing delimiter, however, is much more likely to be a price.
  if (value[amountEnd] === "$" || /[A-Za-z\\_^{}=+*/<>]/u.test(value[amountEnd] ?? "")) {
    return false;
  }

  const nextDollar = offsets[offsetIndex + 1];
  if (nextDollar === undefined) return true;

  // The failure mode we need to prevent is prose containing two prices:
  // `$5 and $10` or `价格$5，会员价$10`. remark-math otherwise consumes the
  // text between both currency signs as one formula.
  const between = value.slice(amountEnd, nextDollar);
  const nextStartsAmount = currencyAmountEnd(value, nextDollar) >= 0;
  if (nextStartsAmount && between.length > 0 && !STRONG_MATH_SYNTAX.test(between)) {
    return true;
  }

  // A price can be followed by ordinary prose and then a genuine formula:
  // `The total is $5 million and formula $x$.` Numeric formulae remain
  // unambiguous when the closing dollar follows the number immediately, when
  // TeX syntax appears, or when the intervening token is a single variable.
  if (STRONG_MATH_SYNTAX.test(between)) return false;
  const words = between.match(PROSE_WORD) ?? [];
  return words.length > 1 || words.some((word) => [...word].length > 1);
}

export function hasUnpairedMathDelimiter(line) {
  const offsets = dollarOffsets(line);
  const mathOffsets = offsets.filter((_, index) => !isLiteralCurrencyDollar(line, offsets, index));
  return mathOffsets.length % 2 !== 0;
}

/**
 * Escape currency signs before remark-math pairs delimiters. A lightweight
 * Markdown parse supplies exact text-node offsets, so code spans, code fences,
 * link destinations and HTML attributes are never rewritten. Authors can
 * always force a literal sign with `\$` when the surrounding prose is
 * genuinely ambiguous.
 */
export function escapeLiteralCurrencyDollars(markdown) {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(markdown);
  const offsetsToEscape = [];

  visit(tree, "text", (node, _index, parent) => {
    if (parent?.type === "link" || parent?.type === "linkReference") return;
    const start = node.position?.start?.offset;
    const end = node.position?.end?.offset;
    if (!Number.isInteger(start) || !Number.isInteger(end)) return;

    const raw = markdown.slice(start, end);
    const offsets = dollarOffsets(raw);
    offsets.forEach((offset, index) => {
      if (isLiteralCurrencyDollar(raw, offsets, index)) {
        offsetsToEscape.push(start + offset);
      }
    });
  });

  if (offsetsToEscape.length === 0) return markdown;
  let escaped = markdown;
  for (const offset of [...new Set(offsetsToEscape)].sort((a, b) => b - a)) {
    escaped = `${escaped.slice(0, offset)}\\${escaped.slice(offset)}`;
  }
  return escaped;
}
