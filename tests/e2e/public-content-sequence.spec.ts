import { expect, test } from "./fixtures";

const CHAPTER_PATH = "/books/lih-bread-and-authority-in-russia/chapters/chapter-3";
const BOOK_PATH = "/books/lih-bread-and-authority-in-russia";
const REFERENCE_PATH = `${BOOK_PATH}/chapters/bibliography`;

test("home and library collapse each serial into one shared publication number", async ({
  isMobile,
  page,
}) => {
  await page.goto("/library");

  // 期望从页面自身推导（C3）：不钉死内容数量——2026-08 内容从 21 涨到 37
  // 时，硬编码的「21 项」让本套件在内容更新后误红。
  const rowCount = await page.locator("li[data-lib-row]").count();
  expect(rowCount).toBeGreaterThan(0);
  await expect(
    page.getByLabel(`当前显示 ${rowCount} 项，共 ${rowCount} 项`)
  ).toBeVisible();
  const sectionFacet = page.locator('[data-facet-number="01"]');
  if (isMobile) {
    await expect(sectionFacet).not.toHaveAttribute("open", "");
    await sectionFacet.locator("summary").click();
  }
  await expect(sectionFacet.getByRole("link", { name: /^译\s*\d+$/u })).toBeVisible();

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
  await expect(
    page.locator("main > header").getByText(String(rowCount), { exact: true })
  ).toBeVisible();
  // 主页展示某本书的连载条目即可——具体哪本随内容更新轮换，钉死
  // slug 会在新内容顶掉旧书时误红。章节页永不直接上主页。
  await expect(page.locator('main article a[href^="/books/"]').first()).toBeAttached();
  await expect(page.locator('main a[href^="/books/"][href*="/chapters/"]')).toHaveCount(0);

  await page.goto(REFERENCE_PATH);
  await expect(page.locator("#reading-cover")).toContainText("文献");
  await expect(page.locator("#reading-cover")).toContainText(`第 ${libraryNumber} 号`);
  await expect(page.locator("#reading-cover")).toContainText(
    new RegExp(`译\\s*${translationNumber?.split("").join("\\s*")}`, "u")
  );
});
