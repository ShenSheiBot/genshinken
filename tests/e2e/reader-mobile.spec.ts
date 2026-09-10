import { expect, test } from "./fixtures";

const READER_PATH = "/posts/guxiang-de-bianzhengfa";

test("mobile reader controls and sheet stay inside the visual viewport", async ({
  isMobile,
  page,
}) => {
  test.skip(!isMobile, "mobile engine projects own this layout contract");

  await page.goto(READER_PATH);
  await page.evaluate(() => document.fonts.ready);

  const reader = page.locator("main.reading-edition-page");
  const tocTrigger = reader.getByRole("button", { name: /^文章目录：/ });
  await expect(tocTrigger).toBeVisible();
  await expect(reader.getByRole("button", { name: /切.*中文/ })).toBeVisible();
  await expect(reader.getByRole("button", { name: "阅读习惯" })).toBeVisible();
  await expect(reader.getByRole("navigation", { name: "全站导航" })).toBeHidden();
  await expect(reader.getByRole("button", { name: "切换明暗主题" })).toBeHidden();

  const documentWidth = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(documentWidth.scroll).toBeLessThanOrEqual(documentWidth.client + 1);

  await tocTrigger.click();
  const dialog = page.getByRole("dialog", { name: "文章目录" });
  await expect(dialog).toBeVisible();
  await expect(page.locator("body")).toHaveCSS("overflow", "hidden");
  await expect(page.getByRole("button", { name: "复制本页 BibTeX 引用" })).toBeVisible();
  await expect(page.getByRole("link", { name: "下载本页 BibTeX 引用" })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "返回篇首" })).toBeVisible();

  await expect.poll(async () => dialog.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const viewport = window.visualViewport;
    const left = viewport?.offsetLeft ?? 0;
    const top = viewport?.offsetTop ?? 0;
    const right = left + (viewport?.width ?? window.innerWidth);
    const bottom = top + (viewport?.height ?? window.innerHeight);
    const tolerance = 2;
    return (
      rect.left >= left - tolerance
      && rect.top >= top - tolerance
      && rect.right <= right + tolerance
      && rect.bottom <= bottom + tolerance
    );
  })).toBe(true);
});
