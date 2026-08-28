import { expect, test, type Page } from "./fixtures";

const READER_PATH = "/posts/guxiang-de-bianzhengfa";

async function exposeCitationCopy(page: Page, isMobile: boolean | undefined) {
  if (isMobile) {
    await page.getByRole("button", { name: /^文章目录：/ }).click();
    await expect(page.getByRole("dialog", { name: "文章目录" })).toBeVisible();
  }
  const copy = page.getByRole("button", { name: "复制本页 BibTeX 引用" });
  await expect(copy).toBeVisible();
  return copy;
}

test("BibTeX copy writes the published citation and announces success", async ({ isMobile, page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          Reflect.set(window, "__roofClipboardText", text);
        },
      },
    });
  });
  await page.goto(READER_PATH);

  const expected = await page.evaluate(async () => (
    await fetch(`${window.location.pathname}/cite.bib`)
  ).text());
  const copy = await exposeCitationCopy(page, isMobile);
  await copy.click();

  await expect(copy).toContainText("已复制");
  await expect(page.getByRole("status")).toHaveText("BibTeX 已复制到剪贴板");
  const copied = await page.evaluate(() => String(
    Reflect.get(window, "__roofClipboardText") ?? ""
  ));
  expect(copied.trimEnd()).toBe(expected.trimEnd());
});

test("BibTeX copy rejection exposes live feedback and remains retryable", async ({ isMobile, page }) => {
  await page.addInitScript(() => {
    let attempts = 0;
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          attempts += 1;
          Reflect.set(window, "__roofClipboardAttempts", attempts);
          if (attempts === 1) throw new Error("clipboard rejected for test");
          Reflect.set(window, "__roofClipboardText", text);
        },
      },
    });
  });
  await page.goto(READER_PATH);
  const expected = await page.evaluate(async () => (
    await fetch(`${window.location.pathname}/cite.bib`)
  ).text());

  const copy = await exposeCitationCopy(page, isMobile);
  await copy.click();

  await expect(page.getByRole("status")).toHaveText("复制失败，请重试");
  await expect(copy).toBeEnabled();
  await copy.click();

  await expect(copy).toContainText("已复制");
  await expect(page.getByRole("status")).toHaveText("BibTeX 已复制到剪贴板");
  const retry = await page.evaluate(() => ({
    attempts: Number(Reflect.get(window, "__roofClipboardAttempts") ?? 0),
    text: String(Reflect.get(window, "__roofClipboardText") ?? ""),
  }));
  expect(retry.attempts).toBe(2);
  expect(retry.text.trimEnd()).toBe(expected.trimEnd());
});
