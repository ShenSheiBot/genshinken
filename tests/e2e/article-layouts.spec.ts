import { expect, test } from "./fixtures";

const cases = [
  ["animation-criticism-dimensions-resource-directory", "resources"],
  ["concrete-revolutio-timeline", "timeline"],
  ["feminist-theory-modernity-postmodernity", "reading-path"],
  ["japanese-subculture-books-recommendations", "book-list"],
  ["japan-00s-anime-criticism-podcast", "podcast"],
  ["roof-genshiken-reader-group-summer-2024", "contact"],
  ["manga-signal-of-noise", "comic"],
] as const;

for (const [slug, layout] of cases) {
  test(`${slug} renders its declared article layout without viewport overflow`, async ({ page }) => {
    const response = await page.goto(`/posts/${slug}`);
    expect(response?.ok()).toBe(true);

    const section = page.locator(`.article-layout-${layout}`);
    await expect(section).toBeVisible();
    const viewport = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.clientWidth + 1);
  });
}

test("the timeline exposes machine-readable date labels", async ({ page }) => {
  await page.goto("/posts/concrete-revolutio-timeline");
  const dates = page.locator(".article-layout-timeline time.article-timeline-date");
  await expect(dates.first()).toHaveText("神化14年10月");
  expect(await dates.count()).toBeGreaterThan(20);
});

test("the reading path keeps every published chapter link in one index", async ({ page }) => {
  await page.goto("/posts/feminist-theory-modernity-postmodernity");
  await expect(page.locator(".article-layout-reading-path > p")).toHaveCount(10);
});

test("the compact book list keeps all source recommendations", async ({ page }) => {
  await page.goto("/posts/japanese-subculture-books-recommendations");
  await expect(page.locator(".article-layout-book-list > ul > li")).toHaveCount(3);
});
