import { expect, test } from "@playwright/test";

test("build timestamp is scoped to the About page", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('[data-build-timestamp]')).toHaveCount(0);
  await expect(page.locator('meta[name="roof-build-timestamp"]')).toHaveCount(0);

  await page.goto("/about");
  const metadata = page.locator('meta[name="roof-build-timestamp"]');
  await expect(metadata).toHaveCount(1);
  await expect(metadata).toHaveAttribute("content", /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u);

  const timestamp = page.locator('[data-build-timestamp]');
  await expect(timestamp).toBeVisible();
  await expect(timestamp).toContainText("最新修改");
  await expect(timestamp).toContainText(/\d{4}\.\d{2}\.\d{2} UTC \d{2}:\d{2}:\d{2}/u);

  await page.goto("/");
  await expect(page.locator('[data-build-timestamp]')).toHaveCount(0);
});
