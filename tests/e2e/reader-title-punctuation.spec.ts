import { expect, test } from "./fixtures";

const OPEN_PUNCTUATION = new Set(["\u201c", "\u2018", "\u300a", "\u3008"]);
const CLOSE_PUNCTUATION = new Set(["\u201d", "\u2019", "\u300b", "\u3009"]);

const TITLE_CASES = [
  {
    label: "Chinese quotation marks",
    path: "/books/shulgin-dni/chapters/penultimate-days",
    title: "“立宪”的倒数第二日",
  },
  {
    label: "Chinese book-title marks",
    path: "/posts/bozhong-zhi-yao",
    title: "《播种之谣》——在无父的时代重构时代传承的想象力",
  },
] as const;

for (const titleCase of TITLE_CASES) {
  test(`reader main title trims only the outer half-em of ${titleCase.label}`, async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.goto(titleCase.path);
    await page.evaluate(() => document.fonts.ready);

    const title = page.locator("#reading-cover h1");
    await expect(title).toBeVisible();
    await expect(title).toHaveText(titleCase.title);
    await expect(title).toHaveAccessibleName(titleCase.title);

    const report = await title.evaluate((heading, punctuation) => {
      const open = new Set(punctuation.open);
      const close = new Set(punctuation.close);
      const titleStyle = getComputedStyle(heading);
      const titleFontSize = Number.parseFloat(titleStyle.fontSize);
      const expected = Array.from(heading.textContent ?? "")
        .filter((glyph) => open.has(glyph) || close.has(glyph))
        .map((glyph) => ({ glyph, side: open.has(glyph) ? "open" : "close" }));
      const markers = Array.from(
        heading.querySelectorAll<HTMLElement>("[data-reader-title-punctuation]")
      ).map((marker) => {
        const style = getComputedStyle(marker);
        return {
          glyph: marker.textContent ?? "",
          side: marker.dataset.readerTitlePunctuation ?? "",
          marginInlineStartEm: Number.parseFloat(style.marginInlineStart) / titleFontSize,
          marginInlineEndEm: Number.parseFloat(style.marginInlineEnd) / titleFontSize,
          fontFamily: style.fontFamily,
          fontSize: style.fontSize,
          display: style.display,
          transform: style.transform,
          clipPath: style.clipPath,
        };
      });

      return {
        expected,
        markers,
        titleFontFamily: titleStyle.fontFamily,
        titleFontSize: titleStyle.fontSize,
        bodyMarkerCount: document.querySelectorAll(
          ".reading-edition-body [data-reader-title-punctuation]"
        ).length,
      };
    }, {
      open: Array.from(OPEN_PUNCTUATION),
      close: Array.from(CLOSE_PUNCTUATION),
    });

    expect(report.expected.length, "the fixture must contain title punctuation").toBeGreaterThan(0);
    expect(
      report.markers.map(({ glyph, side }) => ({ glyph, side })),
      "every target punctuation glyph in the main title must be marked once"
    ).toEqual(report.expected);

    for (const marker of report.markers) {
      expect(marker.fontFamily, `${marker.glyph} must retain the title font`).toBe(
        report.titleFontFamily
      );
      expect(marker.fontSize, `${marker.glyph} must retain the title font size`).toBe(
        report.titleFontSize
      );
      expect(marker.display, `${marker.glyph} must retain normal inline line-breaking`).toBe(
        "inline"
      );
      expect(marker.transform, `${marker.glyph} must not be scaled`).toBe("none");
      expect(marker.clipPath, `${marker.glyph} must not be clipped`).toBe("none");

      const outerMargin = marker.side === "open"
        ? marker.marginInlineStartEm
        : marker.marginInlineEndEm;
      const innerMargin = marker.side === "open"
        ? marker.marginInlineEndEm
        : marker.marginInlineStartEm;
      expect(
        outerMargin,
        `${marker.glyph} must remove approximately half an em on its outer side`
      ).toBeGreaterThanOrEqual(-0.58);
      expect(
        outerMargin,
        `${marker.glyph} must remove approximately half an em on its outer side`
      ).toBeLessThanOrEqual(-0.42);
      expect(
        Math.abs(innerMargin),
        `${marker.glyph} must preserve its inner-side spacing`
      ).toBeLessThanOrEqual(0.02);
    }

    expect(report.bodyMarkerCount, "title punctuation treatment must not enter article prose").toBe(0);
  });
}
