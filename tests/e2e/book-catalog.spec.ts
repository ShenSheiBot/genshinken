import { expect, test } from "./fixtures";

const sepBookHrefs = [
  "/books/sep-deflationary-theory-of-truth",
  "/books/sep-deleuze",
  "/books/sep-hegel-aesthetics",
  "/books/sep-john-rawls",
  "/books/sep-max-weber",
  "/books/sep-natural-kinds",
].sort();

test("the books index groups SEP without replacing its independent book routes", async ({ page }) => {
  const response = await page.goto("/books");
  expect(response?.ok()).toBe(true);

  const collection = page.locator('[data-book-collection="sep"]');
  await expect(collection).toHaveCount(1);
  await expect(collection.getByRole("heading", { name: "斯坦福哲学百科" })).toBeVisible();

  const hrefs = await collection
    .locator('a[aria-label^="进入书籍："]')
    .evaluateAll((links) => links.map((link) => link.getAttribute("href") ?? "").sort());
  expect(hrefs).toEqual(sepBookHrefs);
});

test("the books index remains within the narrow viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/books");

  const viewport = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.clientWidth + 1);
});
