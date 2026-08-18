import { expect, test, type Page } from "./fixtures";

const DESKTOP_WIDTHS = [1024, 1440] as const;

type TitleLayoutFailure = {
  route: string;
  viewportWidth: number;
  documentOverflow: number;
  lineCount: number;
  lineStartPunctuation: string[];
  singleGlyphLines: string[];
  splitWords: string[];
  segments: Array<{
    text: string;
    leftOverflow: number;
    rightOverflow: number;
  }>;
};

async function titleLayoutFailure(page: Page, route: string, viewportWidth: number) {
  await page.setViewportSize({ width: viewportWidth, height: 900 });
  await page.evaluate(() => new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  }));

  return page.locator("#reading-cover h1").evaluate((heading, options) => {
    const tolerance = 1;
    const forbiddenLineStart = /^[，。！？；：、）》】〕〉」』”’]/u;
    const headingRect = heading.getBoundingClientRect();
    const segments = Array.from(
      heading.querySelectorAll<HTMLElement>("[data-reader-title-segment]")
    ).flatMap((segment) => Array.from(segment.getClientRects()).map((rect) => ({
      text: (segment.textContent ?? "").trim(),
      leftOverflow: Number(Math.max(0, headingRect.left - rect.left).toFixed(2)),
      rightOverflow: Number(Math.max(0, rect.right - headingRect.right).toFixed(2)),
    }))).filter(({ leftOverflow, rightOverflow }) =>
      leftOverflow > tolerance || rightOverflow > tolerance
    );
    const documentOverflow = Number(Math.max(
      0,
      document.documentElement.scrollWidth - document.documentElement.clientWidth
    ).toFixed(2));
    const glyphs: Array<{ glyph: string; top: number; left: number }> = [];
    const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) {
      let offset = 0;
      for (const glyph of Array.from(node.textContent ?? "")) {
        const nextOffset = offset + glyph.length;
        const range = document.createRange();
        range.setStart(node, offset);
        range.setEnd(node, nextOffset);
        const rect = range.getClientRects()[0];
        if (rect && rect.width > 0) glyphs.push({ glyph, top: rect.top, left: rect.left });
        offset = nextOffset;
      }
    }
    const rows: Array<{ top: number; glyphs: Array<{ glyph: string; left: number }> }> = [];
    for (const glyph of glyphs) {
      let row = rows.find((candidate) => Math.abs(candidate.top - glyph.top) < 2);
      if (!row) {
        row = { top: glyph.top, glyphs: [] };
        rows.push(row);
      }
      row.glyphs.push(glyph);
    }
    const titleLines = rows
      .sort((a, b) => a.top - b.top)
      .map((row) => row.glyphs
        .sort((a, b) => a.left - b.left)
        .map(({ glyph }) => glyph)
        .join("")
        .trim())
      .filter(Boolean);
    const lineStartPunctuation = titleLines.filter((line) => forbiddenLineStart.test(line));
    const singleGlyphLines = titleLines.filter((line) => Array.from(
      line.replace(/[\s，。！？；：、）》】〕〉「」『』“”‘’（）【】《》—－｜|/]/gu, "")
    ).length === 1);
    const splitWords = Array.from(
      heading.querySelectorAll<HTMLElement>("[data-reader-title-word]")
    ).filter((word) => {
      const tops: number[] = [];
      const wordWalker = document.createTreeWalker(word, NodeFilter.SHOW_TEXT);
      let wordNode: Node | null;
      while ((wordNode = wordWalker.nextNode())) {
        let offset = 0;
        for (const glyph of Array.from(wordNode.textContent ?? "")) {
          const nextOffset = offset + glyph.length;
          const range = document.createRange();
          range.setStart(wordNode, offset);
          range.setEnd(wordNode, nextOffset);
          const rect = range.getClientRects()[0];
          if (rect && !tops.some((top) => Math.abs(top - rect.top) < 2)) tops.push(rect.top);
          offset = nextOffset;
        }
      }
      return tops.length > 1;
    }).map((word) => (word.textContent ?? "").trim()).filter(Boolean);

    return segments.length > 0
      || documentOverflow > tolerance
      || lineStartPunctuation.length > 0
      || singleGlyphLines.length > 0
      || splitWords.length > 0
      || titleLines.length > 5 ? {
      route: options.route,
      viewportWidth: options.viewportWidth,
      documentOverflow,
      lineCount: titleLines.length,
      lineStartPunctuation,
      singleGlyphLines,
      splitWords,
      segments,
    } : null;
  }, { route, viewportWidth });
}

test("all public reader titles fit the desktop column without typographic orphan lines", async ({ isMobile, page }) => {
  test.setTimeout(180_000);
  test.skip(Boolean(isMobile), "desktop title segments wrap normally below the desktop breakpoint");
  await page.emulateMedia({ reducedMotion: "reduce" });

  const sitemap = await page.request.get("/sitemap.xml");
  expect(sitemap.ok()).toBe(true);
  const routes = Array.from((await sitemap.text()).matchAll(/<loc>(.*?)<\/loc>/gu))
    .map((match) => new URL(match[1]).pathname)
    .filter((pathname) =>
      pathname.startsWith("/posts/") || /^\/books\/[^/]+\/chapters\/[^/]+$/u.test(pathname)
    );

  const failures: TitleLayoutFailure[] = [];
  for (const route of routes) {
    await page.setViewportSize({ width: Math.max(...DESKTOP_WIDTHS), height: 900 });
    const response = await page.goto(route);
    expect(response?.status(), route).toBe(200);
    await page.evaluate(() => document.fonts.ready);

    for (const viewportWidth of DESKTOP_WIDTHS) {
      const failure = await titleLayoutFailure(page, route, viewportWidth);
      if (failure) failures.push(failure);
    }
  }

  expect(failures).toEqual([]);
});
