import { expect, test } from "@playwright/test";

test("searches public prose and preserves section anchors", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "搜索本站" }).click();

  const dialog = page.getByRole("dialog", { name: "在屋顶寻找文本" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("searchbox").fill("母性敌托邦");

  const result = dialog.getByRole("link", {
    name: /富野由悠季与“母性敌托邦”（下）/,
  }).first();
  await expect(result).toBeVisible();
  await expect(result).toHaveAttribute(
    "href",
    /^\/books\/maternal-dystopia\/chapters\/tomino-lower#.+/u
  );
  await expect(result).not.toHaveAttribute("href", /\.html(?:#|$)/u);
});

test("offers canonical library links for matching tags", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "搜索本站" }).click();
  await page.getByRole("searchbox").fill("日本动画史");

  await expect(page.getByRole("link", { name: /#日本动画史/ }).first()).toHaveAttribute(
    "href",
    "/library?tag=%E6%97%A5%E6%9C%AC%E5%8A%A8%E7%94%BB%E5%8F%B2"
  );
});

test("opens from the keyboard and closes with Escape", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Control+K");
  await expect(page.getByRole("dialog", { name: "在屋顶寻找文本" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "在屋顶寻找文本" })).toBeHidden();
});
