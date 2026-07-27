import { expect, test } from "./fixtures";

const BOOK_PATH = "/books/lih-bread-and-authority-in-russia";
const CHAPTER_PATH = `${BOOK_PATH}/chapters/chapter-3`;
const NEXT_CHAPTER_PATH = `${BOOK_PATH}/chapters/chapter-4`;

test("book chapter routes preserve the reader chrome entry and exit motion contract", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto(BOOK_PATH);
  const chapterLink = page.locator(`a[href="${CHAPTER_PATH}"]`);
  await expect(chapterLink).toHaveCount(1);
  await chapterLink.click();
  await expect(page).toHaveURL(CHAPTER_PATH);

  const settingsButton = page.getByRole("button", { name: "阅读习惯", exact: true });
  const themeButton = page.getByRole("button", { name: "切换明暗主题", exact: true });
  await expect(settingsButton).toBeVisible();
  await expect.poll(() => settingsButton.evaluate((button) =>
    getComputedStyle(button).animationName
  )).toContain("reading-tool-enter");
  await expect.poll(() => themeButton.evaluate((button) =>
    getComputedStyle(button).animationName
  )).toContain("reading-theme-shift-left");

  await settingsButton.click();
  const settingsDialog = page.getByRole("dialog", { name: "阅读习惯", exact: true });
  const sheetSettingsButton = settingsDialog.getByRole("button", { name: "阅读习惯", exact: true });
  await expect(sheetSettingsButton).toBeVisible();
  await sheetSettingsButton.click();
  await expect(settingsDialog).toBeHidden();
  await expect(page.getByRole("button", { name: "阅读习惯", exact: true })).toHaveJSProperty(
    "isConnected",
    true
  );
  expect(await page.getByRole("button", { name: "阅读习惯", exact: true }).evaluate((button) =>
    getComputedStyle(button).animationName
  )).not.toContain("reading-tool-enter");

  const exitStarted = page.waitForFunction(() => {
    const button = document.querySelector<HTMLButtonElement>('button[aria-label="阅读习惯"]');
    return document.documentElement.dataset.readingChromeExit === "route"
      && button !== null
      && getComputedStyle(button).animationName.includes("reading-tool-exit");
  });
  await page.getByRole("link", { name: "全书 返回目录", exact: true }).click();
  await exitStarted;
  await expect(page).toHaveURL(BOOK_PATH);
});

test("moving between book chapters does not play the reader exit animation", async ({ page }) => {
  await page.goto(CHAPTER_PATH);
  await page.evaluate(() => {
    sessionStorage.removeItem("reader-exit-seen");
    new MutationObserver(() => {
      if (document.documentElement.dataset.readingChromeExit === "route") {
        sessionStorage.setItem("reader-exit-seen", "true");
      }
    }).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-reading-chrome-exit"],
    });
  });

  await page.getByRole("link", { name: /下一章/ }).click();
  await expect(page).toHaveURL(NEXT_CHAPTER_PATH);
  await expect.poll(() => page.evaluate(() =>
    sessionStorage.getItem("reader-exit-seen") === "true"
  )).toBe(false);
});
