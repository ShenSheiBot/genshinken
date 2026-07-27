import { expect, test } from "./fixtures";
import type { Locator } from "@playwright/test";

const BOOK_PATH = "/books/lih-bread-and-authority-in-russia";
const CHAPTER_PATH = `${BOOK_PATH}/chapters/chapter-3`;
const NEXT_CHAPTER_PATH = `${BOOK_PATH}/chapters/chapter-4`;

async function slowCssAnimation(locator: Locator, animationName: string) {
  return locator.evaluate((element, expectedName) => {
    const animation = element.getAnimations().find((candidate) =>
      (candidate as CSSAnimation).animationName.includes(expectedName)
    );
    if (!animation) throw new Error(`missing ${expectedName} animation`);
    animation.playbackRate = 0.05;
    animation.currentTime = 100;
    animation.play();
    return Number(animation.currentTime);
  }, animationName);
}

async function cssAnimationState(locator: Locator, animationName: string) {
  return locator.evaluate((element, expectedName) => {
    const animation = element.getAnimations().find((candidate) =>
      (candidate as CSSAnimation).animationName.includes(expectedName)
    );
    if (!animation) return null;
    return {
      currentTime: Number(animation.currentTime),
      endTime: Number(animation.effect?.getComputedTiming().endTime),
      playState: animation.playState,
    };
  }, animationName);
}

test("book chapter routes preserve the reader chrome entry and exit motion contract", async ({
  isMobile,
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto(BOOK_PATH);
  const chapterLink = page.locator(`a[href="${CHAPTER_PATH}"]`);
  await expect(chapterLink).toHaveCount(1);
  await chapterLink.click();
  await expect(page).toHaveURL(CHAPTER_PATH);

  const settingsButton = page.getByRole("button", { name: "阅读习惯", exact: true });
  const hanButton = page.getByRole("button", { name: /切换为(?:简体|繁体)中文/ });
  const themeButton = page.getByRole("button", { name: "切换明暗主题", exact: true });
  await expect(settingsButton).toBeVisible();
  await expect(hanButton).toBeVisible();
  await expect.poll(() => settingsButton.evaluate((button) =>
    getComputedStyle(button).animationName
  )).toContain("reading-tool-enter");
  await expect.poll(() => hanButton.evaluate((button) =>
    getComputedStyle(button).animationName
  )).toContain("reading-tool-enter");
  if (!isMobile) {
    await expect(themeButton).toBeVisible();
    await expect.poll(() => themeButton.evaluate((button) =>
      getComputedStyle(button).animationName
    )).toContain("reading-theme-shift-left");
  }

  const hanTimeBeforeSettings = await slowCssAnimation(hanButton, "reading-tool-enter");
  const themeTimeBeforeSettings = !isMobile
    ? await slowCssAnimation(themeButton, "reading-theme-shift-left")
    : null;

  await settingsButton.click();
  const settingsDialog = page.getByRole("dialog", { name: "阅读习惯", exact: true });
  const sheetSettingsButton = settingsDialog.getByRole("button", { name: "阅读习惯", exact: true });
  await expect(sheetSettingsButton).toBeVisible();
  const hanAnimation = await cssAnimationState(hanButton, "reading-tool-enter");
  expect(hanAnimation).not.toBeNull();
  expect(hanAnimation!.playState).toBe("running");
  expect(hanAnimation!.currentTime).toBeGreaterThan(hanTimeBeforeSettings);
  expect(hanAnimation!.currentTime).toBeLessThan(hanAnimation!.endTime);
  if (!isMobile) {
    const themeAnimation = await cssAnimationState(themeButton, "reading-theme-shift-left");
    expect(themeAnimation).not.toBeNull();
    expect(themeAnimation!.playState).toBe("running");
    expect(themeAnimation!.currentTime).toBeGreaterThan(themeTimeBeforeSettings!);
    expect(themeAnimation!.currentTime).toBeLessThan(themeAnimation!.endTime);
  }
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
