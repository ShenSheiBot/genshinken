import { expect, test, type Page } from "./fixtures";

const READER_PATH = "/posts/guxiang-de-bianzhengfa";
const ENABLED_KEY = "ub_reading:enabled";
const RECORD_KEY = "ub_reading:v1:post:guxiang-de-bianzhengfa";

test.skip(({ browserName, isMobile }) => (
  browserName !== "chromium" || Boolean(isMobile)
), "cross-tab arbitration is gated once in desktop Chromium");

async function beginLineJump(page: Page, fraction: number) {
  const current = page.getByRole("button", {
    name: /当前第 \d+ 行，点击输入行数跳转/,
  });
  await expect(current).toBeVisible();
  await current.click();
  const input = page.getByRole("textbox", { name: /输入正文行数，共 \d+ 行/ });
  const label = await input.getAttribute("aria-label");
  const total = Number(label?.match(/共 (\d+) 行/)?.[1]);
  expect(total).toBeGreaterThan(10);
  const target = Math.max(2, Math.min(total - 1, Math.round(total * fraction)));
  await input.fill(String(target));
  await input.press("Enter");
  return { target, total };
}

async function storedRecord(page: Page) {
  return page.evaluate((key) => window.localStorage.getItem(key), RECORD_KEY);
}

async function waitForFonts(page: Page) {
  await page.evaluate(() => document.fonts.ready);
}

async function preparePendingPosition(page: Page) {
  const current = page.getByRole("button", {
    name: /当前第 \d+ 行，点击输入行数跳转/,
  });
  await expect(current).toBeVisible();
  const pauseTime = await page.evaluate(() => Date.now() + 60_000);
  await page.clock.pauseAt(pauseTime);
  await page.mouse.wheel(0, 800);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  await page.clock.runFor(100);
  await expect.poll(() => storedRecord(page)).toBeNull();
}

test("a saved reading position restores in a new tab while an explicit hash wins", async ({
  context,
  page,
}) => {
  await page.goto(READER_PATH);
  await waitForFonts(page);
  const { target } = await beginLineJump(page, 0.35);
  await expect.poll(() => storedRecord(page)).not.toBeNull();

  const restored = await context.newPage();
  await restored.goto(READER_PATH);
  await waitForFonts(restored);
  await expect(restored.getByText("已恢复到上次阅读位置", { exact: true })).toBeVisible();
  await expect.poll(async () => {
    const restoredLabel = await restored.getByRole("button", {
      name: /当前第 \d+ 行，点击输入行数跳转/,
    }).getAttribute("aria-label");
    const restoredLine = Number(restoredLabel?.match(/当前第 (\d+) 行/)?.[1]);
    return Math.abs(restoredLine - target);
  }).toBeLessThanOrEqual(3);

  const explicit = await context.newPage();
  await explicit.goto(`${READER_PATH}#reading-cover`);
  await waitForFonts(explicit);
  await expect(explicit.getByText("已恢复到上次阅读位置", { exact: true })).toHaveCount(0);
  await expect.poll(() => explicit.evaluate(() => window.scrollY)).toBeLessThan(80);
});

test("a pending position flushes on close while tracking remains enabled", async ({
  context,
  page,
}) => {
  await page.clock.install();
  await page.goto(READER_PATH);
  await waitForFonts(page);
  const observer = await context.newPage();
  await observer.goto(READER_PATH);
  await waitForFonts(observer);

  await preparePendingPosition(page);
  await page.close();

  await expect.poll(() => storedRecord(observer)).not.toBeNull();
});

test("a remote opt-out cancels a pending write before the source tab closes", async ({
  context,
  page,
}) => {
  await page.clock.install();
  await page.goto(READER_PATH);
  await waitForFonts(page);
  const controller = await context.newPage();
  await controller.goto(READER_PATH);
  await waitForFonts(controller);
  await controller.getByRole("button", { name: "阅读习惯" }).click();
  const remoteSwitch = controller.getByRole("switch", { name: "保存本机阅读记录" });
  await expect(remoteSwitch).toHaveAttribute("aria-checked", "true");

  await preparePendingPosition(page);
  await remoteSwitch.click();
  await expect(remoteSwitch).toHaveAttribute("aria-checked", "false");
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), ENABLED_KEY)).toBe("false");

  await page.close();
  await expect.poll(() => storedRecord(controller)).toBeNull();
});
