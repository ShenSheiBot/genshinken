import { expect, test } from "./fixtures";

const CHAPTER_PATH = "/books/lih-bread-and-authority-in-russia/chapters/chapter-3";
const ARTICLE_PATH = "/posts/guxiang-de-bianzhengfa";

const docketNumber = (page: import("./fixtures").Page) =>
  page.locator("#reading-cover [data-reader-docket-number]");

test("book chapters reuse the article docket and expose the chapter end label", async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto(ARTICLE_PATH);
  await page.evaluate(() => document.fonts.ready);
  const articleFontSize = await docketNumber(page).evaluate((element) =>
    getComputedStyle(element).fontSize
  );

  await page.goto(CHAPTER_PATH);
  await page.evaluate(() => document.fonts.ready);
  const chapterDocket = docketNumber(page);
  const chapterFontSize = await chapterDocket.evaluate((element) =>
    getComputedStyle(element).fontSize
  );

  expect(chapterFontSize).toBe(articleFontSize);
  await expect(chapterDocket.locator("[data-roll]")).toHaveCount(2);
  const digitAnimations = await chapterDocket.locator("[data-roll]").evaluateAll((digits) =>
    digits.map((digit) => ({
      roll: digit.getAttribute("data-roll"),
      animationName: getComputedStyle(digit.firstElementChild as Element).animationName,
    }))
  );
  expect(digitAnimations[0]).toMatchObject({ roll: "up" });
  expect(digitAnimations[0]?.animationName).toContain("docket-digit-up");
  expect(digitAnimations[1]).toMatchObject({ roll: "down" });
  expect(digitAnimations[1]?.animationName).toContain("docket-digit-down");

  const endMark = page.locator('.reading-edition-flow [aria-label="本章完"]');
  await expect(endMark).toBeVisible();
  await expect(endMark).toHaveText("本章完");
});

test("full-book compound numbers remain on one rendered line", async ({ page }) => {
  await page.goto(CHAPTER_PATH);
  const fullBookTab = page.getByRole("tab", { name: "全书目录" });
  await fullBookTab.click();

  const fullBookPanel = page.locator("#reading-index-book");
  const compoundNumber = fullBookPanel.getByText("前 1", { exact: true });
  await expect(compoundNumber).toBeVisible();
  expect(await compoundNumber.evaluate((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    return {
      lineCount: range.getClientRects().length,
      whiteSpace: getComputedStyle(element).whiteSpace,
    };
  })).toEqual({ lineCount: 1, whiteSpace: "nowrap" });
});
