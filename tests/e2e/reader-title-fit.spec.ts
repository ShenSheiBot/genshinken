import { expect, test, type Page } from "./fixtures";

const READER_WIDTHS = [390, 1024, 1440] as const;

type TitleLayoutFailure = {
  route: string;
  viewportWidth: number;
  documentOverflow: number;
  viewportLeftOverflow: number;
  viewportRightOverflow: number;
  fontSize: number;
  lineCount: number;
  lineStartPunctuation: string[];
  singleGlyphLines: string[];
  splitWords: string[];
  wrappedSegments: string[];
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
    const fixedSegments = heading.hasAttribute("data-reader-title-fixed");
    const forbiddenLineStart = /^[，。！？；：、）》】〕〉」』”’]/u;
    const headingRect = heading.getBoundingClientRect();
    const segmentElements = Array.from(
      heading.querySelectorAll<HTMLElement>("[data-reader-title-segment]")
    );
    const segmentTexts = segmentElements
      .map((segment) => (segment.textContent ?? "").trim())
      .filter(Boolean);
    const segments = segmentElements.map((segment) => {
      const rect = segment.getBoundingClientRect();
      return {
        text: (segment.textContent ?? "").trim(),
        leftOverflow: fixedSegments
          ? 0
          : Number(Math.max(0, headingRect.left - rect.left).toFixed(2)),
        rightOverflow: fixedSegments
          ? Number(Math.max(0, segment.scrollWidth - segment.clientWidth).toFixed(2))
          : Number(Math.max(0, rect.right - headingRect.right).toFixed(2)),
      };
    }).filter(({ leftOverflow, rightOverflow }) =>
      leftOverflow > tolerance || rightOverflow > tolerance
    );
    const documentOverflow = Number(Math.max(
      0,
      document.documentElement.scrollWidth - document.documentElement.clientWidth
    ).toFixed(2));
    const glyphs: Array<{ glyph: string; top: number; left: number; right: number }> = [];
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
        if (rect && rect.width > 0) {
          glyphs.push({ glyph, top: rect.top, left: rect.left, right: rect.right });
        }
        offset = nextOffset;
      }
    }
    const rows: Array<{
      top: number;
      glyphs: Array<{ glyph: string; left: number; right: number }>;
    }> = [];
    for (const glyph of glyphs) {
      let row = rows.find((candidate) => Math.abs(candidate.top - glyph.top) < 2);
      if (!row) {
        row = { top: glyph.top, glyphs: [] };
        rows.push(row);
      }
      row.glyphs.push(glyph);
    }
    const titleLines = fixedSegments ? segmentTexts : rows
        .sort((a, b) => a.top - b.top)
        .map((row) => row.glyphs
          .sort((a, b) => a.left - b.left)
          .map(({ glyph }) => glyph)
          .join("")
          .trim())
        .filter(Boolean);
    const lineStartPunctuation = titleLines.filter((line) => forbiddenLineStart.test(line));
    const singleGlyphLines = titleLines.length > 1
      && (fixedSegments || options.viewportWidth >= 1024)
      ? titleLines.filter((line) => Array.from(
        line.replace(/[\s，。！？；：、）》】〕〉「」『』“”‘’（）【】《》—－｜|/]/gu, "")
      ).length === 1)
      : [];
    const wrappedSegments = fixedSegments ? segmentElements.filter((segment) => {
      const style = getComputedStyle(segment);
      return style.display !== "block" || style.whiteSpace !== "nowrap";
    }).map((segment) => (segment.textContent ?? "").trim()).filter(Boolean) : [];
    const splitWords = fixedSegments ? [] : Array.from(
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
    const viewportLeftOverflow = Number(Math.max(
      0,
      fixedSegments
        ? -headingRect.left
        : -Math.min(headingRect.left, ...glyphs.map(({ left }) => left))
    ).toFixed(2));
    const viewportRightOverflow = Number(Math.max(
      0,
      (fixedSegments
        ? headingRect.right
        : Math.max(headingRect.right, ...glyphs.map(({ right }) => right)))
        - document.documentElement.clientWidth
    ).toFixed(2));
    const fontSize = Number.parseFloat(getComputedStyle(heading).fontSize);
    const minimumReadableFontSize = options.viewportWidth < 1024 ? 24.1 : 44.1;
    const undersized = fixedSegments && fontSize < minimumReadableFontSize;
    const tooManyLines = titleLines.length > 6
      && (fixedSegments || options.viewportWidth >= 1024);

    return segments.length > 0
      || viewportLeftOverflow > tolerance
      || viewportRightOverflow > tolerance
      || lineStartPunctuation.length > 0
      || singleGlyphLines.length > 0
      || splitWords.length > 0
      || (fixedSegments && wrappedSegments.length > 0)
      || undersized
      || tooManyLines ? {
      route: options.route,
      viewportWidth: options.viewportWidth,
      documentOverflow,
      viewportLeftOverflow,
      viewportRightOverflow,
      fontSize,
      lineCount: titleLines.length,
      lineStartPunctuation,
      singleGlyphLines,
      splitWords,
      wrappedSegments,
      segments,
    } : null;
  }, { route, viewportWidth });
}

test("all public reader titles fit the reader column without typographic orphan lines", async ({ isMobile, page }) => {
  test.setTimeout(240_000);
  test.skip(Boolean(isMobile), "the desktop project exercises every reader width once");
  await page.emulateMedia({ reducedMotion: "reduce" });

  const sitemap = await page.request.get("/sitemap.xml");
  expect(sitemap.ok()).toBe(true);
  const routes = Array.from((await sitemap.text()).matchAll(/<loc>(.*?)<\/loc>/gu))
    .map((match) => new URL(match[1]).pathname)
    .filter((pathname) =>
      /^\/(?:en\/|ja\/)?posts\//u.test(pathname)
      || /^\/(?:en\/|ja\/)?books\/[^/]+\/chapters\/[^/]+$/u.test(pathname)
    );

  const failures: TitleLayoutFailure[] = [];
  for (const route of routes) {
    await page.setViewportSize({ width: Math.max(...READER_WIDTHS), height: 900 });
    const response = await page.goto(route);
    expect(response?.status(), route).toBe(200);
    await page.evaluate(() => document.fonts.ready);

    if (/^\/(?:en|ja)\//u.test(route)) {
      const visibleTitle = (await page.locator("#reading-cover h1").textContent())?.trim();
      const metadataTitle = await page.locator('meta[property="og:title"]').getAttribute("content");
      expect(visibleTitle, `${route}: rendered title must preserve the localized metadata title`).toBe(metadataTitle);
    }

    for (const viewportWidth of READER_WIDTHS) {
      const failure = await titleLayoutFailure(page, route, viewportWidth);
      if (failure) failures.push(failure);
    }
  }

  expect(failures).toEqual([]);
});

test("compact editorial title segments stay on one line on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const response = await page.goto("/posts/asada-image-evolution-theory-1986-video");
  expect(response?.status()).toBe(200);
  await page.evaluate(() => document.fonts.ready);

  const segments = page.locator("#reading-cover h1 [data-reader-title-compact]");
  expect(await segments.count()).toBeGreaterThan(0);
  for (const segment of await segments.all()) {
    expect(await segment.evaluate((element) => {
      const lines = new Set(Array.from(element.getClientRects()).map((rect) => Math.round(rect.top)));
      return lines.size;
    }), await segment.textContent() ?? "compact title segment").toBe(1);
  }
});
