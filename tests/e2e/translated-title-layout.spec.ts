import { expect, test } from "./fixtures";

// Run against a build with translated preview editions enabled.
const cases = [
  "/ja/posts/jojo5-golden-wind-direction-analysis-episode-02",
  "/ja/posts/anime-kamiiro-seikaku-teiryo-bunseki",
  "/ja/books/phenomenology-the-basics",
  "/en/posts/friends-quarrel-shonen-manga",
  "/en/posts/toward-post-revolution-concrete-revolutio-revisited",
  "/ja/books/meta-anime-hyoron/chapters/i-i-sublime-tide",
];

for (const route of cases) {
  test(`translated cover fits its column: ${route}`, async ({ page }) => {
    test.skip(!process.env.ROOF_TRANSLATION_PREVIEW, "requires the translation preview build");
    await page.emulateMedia({ reducedMotion: "reduce" });
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    const heading = page.locator("main h1").first();
    await expect(heading).toBeVisible();
    for (const width of [390, 768, 1442]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(() => document.fonts.ready);
      const outside = await heading.evaluate((title) => {
        const box = title.getBoundingClientRect();
        const walker = document.createTreeWalker(title, NodeFilter.SHOW_TEXT);
        const failures: string[] = [];
        while (walker.nextNode()) {
          const range = document.createRange();
          range.selectNodeContents(walker.currentNode);
          // Same rule as scripts/verify-translation-title-layout.mjs and
          // docs/translation-title-layout.md: only marked punctuation may hang
          // by its own optical margin, and nothing may leave the viewport.
          const parent = walker.currentNode.parentElement!;
          const style = getComputedStyle(parent);
          const side = parent.dataset.readerTitlePunctuation;
          const hangLeft = side === "open" ? Math.max(0, -parseFloat(style.marginLeft)) : 0;
          const hangRight = side === "close" ? Math.max(0, -parseFloat(style.marginRight)) : 0;
          for (const rect of range.getClientRects()) {
            if (rect.left < Math.max(0, box.left - hangLeft) - 2 || rect.right > Math.min(innerWidth, box.right + hangRight) + 2) {
              failures.push(walker.currentNode.textContent ?? "");
            }
          }
        }
        return failures;
      });
      expect(outside, `${route} at ${width}px`).toEqual([]);
      if (route.includes("jojo5-golden-wind")) {
        const episode = heading.getByText("第02話", { exact: true });
        await expect(episode).toHaveCount(1);
        expect(await episode.evaluate((word) => new Set(Array.from(word.getClientRects(), (rect) => Math.round(rect.top))).size)).toBe(1);
      }
      if (route.includes("toward-post-revolution")) {
        const compound = heading.getByText("Post-Revolution", { exact: true });
        await expect(compound).toHaveCount(1);
        expect(await compound.evaluate((word) => new Set(Array.from(word.getClientRects(), (rect) => Math.round(rect.top))).size)).toBe(1);
      }
      if (route.includes("i-i-sublime-tide")) {
        const loanword = heading.getByText("ゾンビランドサガ", { exact: true });
        await expect(loanword).toHaveCount(1);
        expect(await loanword.evaluate((word) => new Set(Array.from(word.getClientRects(), (rect) => Math.round(rect.top))).size)).toBe(1);
      }
    }
  });
}
