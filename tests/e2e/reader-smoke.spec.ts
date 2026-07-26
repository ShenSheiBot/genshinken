import { expect, test } from "@playwright/test";

test("reader exposes the production reading contract", async ({ page }) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => {
    pageErrors.push(error.stack ?? error.message);
  });

  const response = await page.goto("/posts/guxiang-de-bianzhengfa");
  expect(response?.ok()).toBe(true);

  const reader = page.locator("main.reading-edition-page");
  const title = reader.getByRole("heading", { level: 1 });
  const article = reader.locator("article.reading-edition-body");

  await expect(reader).toBeVisible();
  await expect(title).toBeVisible();
  await expect(title).toContainText(/\S/);
  await expect(article).toBeVisible();
  await expect(article).toContainText(/\S/);
  await expect(reader.locator('[aria-label="正文完"]')).toBeVisible();

  await expect(reader.locator(".reading-edition-flow").first()).toBeVisible();
  await expect(page.locator('a[href*="/prototype"]')).toHaveCount(0);

  const prototypeTokens = await page.locator("*").evaluateAll((elements) =>
    elements.flatMap((element) =>
      Array.from(element.attributes)
        .flatMap((attribute) => [attribute.name, attribute.value])
        .filter((token) => token.includes("reading-prototype-"))
    )
  );
  expect(prototypeTokens).toEqual([]);

  await page.evaluate(() => document.fonts.ready);
  const viewport = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.clientWidth + 1);

  await page.getByRole("button", { name: "阅读习惯" }).click();
  const settings = page.getByRole("dialog", { name: "阅读习惯" });
  await expect(settings).toBeVisible();
  await expect(
    settings.getByRole("switch", { name: "保存本机阅读记录" })
  ).toHaveAttribute("aria-checked", /^(true|false)$/);

  await settings.getByRole("button", { name: "关闭" }).click();
  await expect(settings).toBeHidden();

  expect(consoleErrors, "browser console errors").toEqual([]);
  expect(pageErrors, "uncaught page errors").toEqual([]);
});
