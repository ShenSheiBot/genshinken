import { expect, test } from "./fixtures";
import type { Locator } from "@playwright/test";

const BOOK_PATH = "/books/lih-bread-and-authority-in-russia";
const CHAPTER_PATH = `${BOOK_PATH}/chapters/chapter-3`;
const NEXT_CHAPTER_PATH = `${BOOK_PATH}/chapters/chapter-4`;

async function expectPathname(page: import("./fixtures").Page, pathname: string) {
  await expect.poll(() => page.evaluate(() => window.location.pathname)).toBe(pathname);
}

async function toolPositions(tools: Locator[]) {
  return Promise.all(tools.map((tool) => tool.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
  })));
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
  await expectPathname(page, CHAPTER_PATH);

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

  const tools = isMobile
    ? [hanButton, settingsButton]
    : [themeButton, hanButton, settingsButton];
  await page.waitForTimeout(450);
  const positionsBeforeSettings = await toolPositions(tools);

  await settingsButton.click();
  const settingsDialog = page.getByRole("dialog", { name: "阅读习惯", exact: true });
  await expect(settingsDialog).toBeVisible();
  await expect(settingsButton).toHaveAttribute("aria-expanded", "true");
  await expect(settingsDialog.getByRole("button", { name: "关闭", exact: true })).toBeVisible();
  await expect.poll(() => settingsDialog.evaluate((dialog) =>
    getComputedStyle(dialog).animationName
  )).toContain("reading-sheet-slide-in");
  expect(await toolPositions(tools)).toEqual(positionsBeforeSettings);

  const settingsExitStarted = page.waitForFunction(() => {
    const dialog = document.querySelector<HTMLElement>('[role="dialog"][data-sheet="settings"]');
    return dialog !== null
      && getComputedStyle(dialog).animationName.includes("reading-sheet-slide-out");
  });
  await settingsDialog.getByRole("button", { name: "关闭", exact: true }).click();
  await settingsExitStarted;
  await expect(settingsDialog).toBeHidden();
  await expect(settingsButton).toBeFocused();
  expect(await toolPositions(tools)).toEqual(positionsBeforeSettings);

  const exitStarted = page.waitForFunction(({ mobile }) => {
    const reader = document.querySelector(".reading-edition-page");
    const settings = reader?.querySelector<HTMLButtonElement>('button[aria-label="阅读习惯"]') ?? null;
    const han = reader?.querySelector<HTMLButtonElement>('button[aria-label^="切换为"], button[aria-label^="切換為"]') ?? null;
    const theme = reader?.querySelector<HTMLButtonElement>('button[aria-label="切换明暗主题"]') ?? null;
    return document.documentElement.dataset.readingChromeExit === "route"
      && settings !== null
      && han !== null
      && getComputedStyle(settings).animationName.includes("reading-tool-exit")
      && getComputedStyle(han).animationName.includes("reading-tool-exit")
      && (mobile || (theme !== null
        && getComputedStyle(theme).animationName.includes("reading-theme-shift-right")));
  }, { mobile: isMobile });
  await page.getByRole("link", { name: "全书 返回目录", exact: true }).click();
  await exitStarted;
  await expectPathname(page, BOOK_PATH);
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
  await expectPathname(page, NEXT_CHAPTER_PATH);
  await expect.poll(() => page.evaluate(() =>
    sessionStorage.getItem("reader-exit-seen") === "true"
  )).toBe(false);
});
