import { expect, test } from "./fixtures";

// Run against a build with translated preview editions enabled.
const cases = [
  "/ja/posts/wonder-egg-priority-production-notes-episode-03",
  "/ja/posts/anime-kamiiro-seikaku-teiryo-bunseki",
  "/ja/books/phenomenology-the-basics",
  "/en/posts/friends-quarrel-shonen-manga",
  "/en/posts/toward-post-revolution-concrete-revolutio-revisited",
  "/ja/books/reading-feminist-theory/chapters/chapter-05-intersectionality",
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
          for (const rect of range.getClientRects()) {
            if (rect.left < Math.max(0, box.left) - 2 || rect.right > Math.min(innerWidth, box.right) + 2) {
              failures.push(walker.currentNode.textContent ?? "");
            }
          }
        }
        return failures;
      });
      expect(outside, `${route} at ${width}px`).toEqual([]);
      if (route.includes("wonder-egg-priority")) {
        const episode = heading.getByText("第3話", { exact: true });
        await expect(episode).toHaveCount(1);
        expect(await episode.evaluate((word) => new Set(Array.from(word.getClientRects(), (rect) => Math.round(rect.top))).size)).toBe(1);
      }
      if (route.includes("toward-post-revolution")) {
        const compound = heading.getByText("Post-Revolution", { exact: true });
        await expect(compound).toHaveCount(1);
        expect(await compound.evaluate((word) => new Set(Array.from(word.getClientRects(), (rect) => Math.round(rect.top))).size)).toBe(1);
      }
      if (route.includes("chapter-05-intersectionality")) {
        const loanword = heading.getByText("インターセクショナリティ", { exact: true });
        await expect(loanword).toHaveCount(1);
        expect(await loanword.evaluate((word) => new Set(Array.from(word.getClientRects(), (rect) => Math.round(rect.top))).size)).toBe(1);
      }
    }
  });
}
