import { expect, test } from "./fixtures";

const CHAPTER_PATH = "/books/lih-bread-and-authority-in-russia/chapters/chapter-3";
const BOOK_PATH = "/books/lih-bread-and-authority-in-russia";
const REFERENCE_PATH = `${BOOK_PATH}/chapters/bibliography`;

test("home and library collapse each serial into one shared publication number", async ({
  isMobile,
  page,
}) => {
  await page.goto("/library");

  await expect(page.getByLabel("当前显示 21 项，共 21 项")).toBeVisible();
  const sectionFacet = page.locator('[data-facet-number="01"]');
  if (isMobile) {
    await expect(sectionFacet).not.toHaveAttribute("open", "");
    await sectionFacet.locator("summary").click();
  }
  await expect(sectionFacet.getByRole("link", { name: /^译\s*06$/u })).toBeVisible();

  const bookRow = page.locator(`li:has(a[href="${BOOK_PATH}"])`);
  await expect(bookRow).toBeVisible();
  await expect(page.locator(`a[href="${CHAPTER_PATH}"]`)).toHaveCount(0);
  await expect(page.locator(`a[href="${REFERENCE_PATH}"]`)).toHaveCount(0);
  const libraryNumber = (await bookRow.locator("b").first().textContent())?.trim();
  const translationNumber = (await bookRow.locator("i").first().textContent())?.trim();
  expect(libraryNumber).toMatch(/^\d+$/u);
  expect(translationNumber).toMatch(/^\d+$/u);

  await page.goto(CHAPTER_PATH);
  await expect(page.locator("#reading-cover")).toContainText(`第 ${libraryNumber} 号`);
  await expect(page.locator("#reading-cover")).toContainText(
    new RegExp(`译\\s*${translationNumber?.split("").join("\\s*")}`, "u")
  );

  await page.goto("/");
  await expect(page.locator("main > header").getByText("21", { exact: true })).toBeVisible();
  await expect(page.locator(`main article a[href="${BOOK_PATH}"]`).first()).toBeAttached();
  await expect(page.locator('main a[href^="/books/"][href*="/chapters/"]')).toHaveCount(0);

  await page.goto(REFERENCE_PATH);
  await expect(page.locator("#reading-cover")).toContainText("文献");
  await expect(page.locator("#reading-cover")).toContainText(`第 ${libraryNumber} 号`);
  await expect(page.locator("#reading-cover")).toContainText(
    new RegExp(`译\\s*${translationNumber?.split("").join("\\s*")}`, "u")
  );
});
