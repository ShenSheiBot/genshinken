import { expect, test, type Page } from "./fixtures";

const TARGET_PATH = "/books/lih-bread-and-authority-in-russia/chapters/chapter-4";
const TARGET_TEXT = "\u56fd\u5bb6\u6709\u673a\u4f53\u7684\u74e6\u89e3";
const MAX_GLYPH_ADVANCE_EM = 1.45;

type ExpandedLine = {
  paragraph: string;
  text: string;
  glyphCount: number;
  averageAdvanceEm: number;
};

async function expandedLines(page: Page, paragraphNeedle?: string): Promise<ExpandedLine[]> {
  return page.locator("article.reading-edition-body").evaluate((article, options) => {
    const findings: ExpandedLine[] = [];
    const paragraphs = Array.from(article.querySelectorAll("p")).filter((paragraph) =>
      !options.paragraphNeedle || paragraph.textContent?.includes(options.paragraphNeedle)
    );

    for (const paragraph of paragraphs) {
      const fontSize = Number.parseFloat(getComputedStyle(paragraph).fontSize);
      if (!Number.isFinite(fontSize) || fontSize <= 0) continue;

      const textNodes: Text[] = [];
      const visit = (node: Node) => {
        for (const child of Array.from(node.childNodes)) {
          if (child.nodeType === Node.TEXT_NODE) textNodes.push(child as Text);
          else visit(child);
        }
      };
      visit(paragraph);

      const glyphs: Array<{
        glyph: string;
        x: number;
        top: number;
        right: number;
        bottom: number;
      }> = [];
      for (const node of textNodes) {
        for (let index = 0; index < (node.textContent ?? "").length; index += 1) {
          const glyph = node.textContent?.[index] ?? "";
          if (/\s/u.test(glyph)) continue;
          const range = document.createRange();
          range.setStart(node, index);
          range.setEnd(node, index + 1);
          const rect = range.getBoundingClientRect();
          if (rect.width <= 0 || rect.height <= 0) continue;
          if (node.parentElement?.closest("sup")) continue;
          glyphs.push({
            glyph,
            x: rect.x,
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom,
          });
        }
      }

      const lines: Array<{ top: number; bottom: number; glyphs: typeof glyphs }> = [];
      for (const glyph of glyphs) {
        let line = lines.find((candidate) => {
          const overlap = Math.min(candidate.bottom, glyph.bottom)
            - Math.max(candidate.top, glyph.top);
          const smallerHeight = Math.min(
            candidate.bottom - candidate.top,
            glyph.bottom - glyph.top
          );
          return overlap >= smallerHeight * 0.5;
        });
        if (!line) {
          line = { top: glyph.top, bottom: glyph.bottom, glyphs: [] };
          lines.push(line);
        } else {
          line.top = Math.min(line.top, glyph.top);
          line.bottom = Math.max(line.bottom, glyph.bottom);
        }
        line.glyphs.push(glyph);
      }

      for (const line of lines) {
        const ordered = line.glyphs.sort((left, right) => left.x - right.x);
        if (ordered.length < 8) continue;
        const lineText = ordered.map(({ glyph }) => glyph).join("");
        const hanRatio = Array.from(lineText).filter((glyph) =>
          /\p{Script=Han}/u.test(glyph)
        ).length / ordered.length;
        if (hanRatio < 0.55) continue;
        const span = ordered.at(-1)!.right - ordered[0].x;
        const averageAdvanceEm = span / ordered.length / fontSize;
        if (averageAdvanceEm <= options.maxGlyphAdvanceEm) continue;
        findings.push({
          paragraph: (paragraph.textContent ?? "").trim().slice(0, 120),
          text: lineText,
          glyphCount: ordered.length,
          averageAdvanceEm: Number(averageAdvanceEm.toFixed(3)),
        });
      }
    }

    return findings;
  }, { paragraphNeedle, maxGlyphAdvanceEm: MAX_GLYPH_ADVANCE_EM });
}

test("reader justification does not stretch the inline-footnote line", async ({ isMobile, page }) => {
  test.skip(Boolean(isMobile), "mobile reader paragraphs are intentionally ragged-right");
  await page.setViewportSize({ width: 868, height: 929 });
  await page.goto(TARGET_PATH);
  await page.evaluate(() => document.fonts.ready);

  expect(await expandedLines(page, TARGET_TEXT)).toEqual([]);
});

test("all public reader routes avoid over-expanded visual lines", async ({ isMobile, page }) => {
  test.setTimeout(120_000);
  test.skip(Boolean(isMobile), "mobile reader paragraphs are intentionally ragged-right");
  await page.setViewportSize({ width: 868, height: 929 });
  const sitemap = await page.request.get("/sitemap.xml");
  expect(sitemap.ok()).toBe(true);
  const routes = Array.from((await sitemap.text()).matchAll(/<loc>(.*?)<\/loc>/gu))
    .map((match) => new URL(match[1]).pathname)
    .filter((pathname) =>
      pathname.startsWith("/posts/") || /^\/books\/[^/]+\/chapters\/[^/]+$/u.test(pathname)
    );

  const failures: Array<{ route: string; lines: ExpandedLine[] }> = [];
  for (const route of routes) {
    const response = await page.goto(route);
    expect(response?.status(), route).toBe(200);
    await page.evaluate(() => document.fonts.ready);
    const lines = await expandedLines(page);
    if (lines.length > 0) failures.push({ route, lines });
  }

  expect(failures).toEqual([]);
});