const FULL_WIDTH_GLYPH = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\u3000-\u303f\uff01-\uff60]/u;
const NARROW_GLYPH = /[\p{ASCII}\uff61-\uff9f]/u;

/** Keep only segments that fit the narrowest reader cover indivisible. */
export function isCompactTitleSegment(text: string): boolean {
  let em = 0;
  for (const glyph of Array.from(text.trim())) {
    if (/\s/u.test(glyph)) em += 0.35;
    else if (NARROW_GLYPH.test(glyph)) em += 0.58;
    else if (FULL_WIDTH_GLYPH.test(glyph)) em += 1;
    else em += 0.75;
  }
  return em > 0 && em <= 5.25;
}
