import { expect, test } from "./fixtures";

const ARTICLE_PATH = "/posts/azuma-superflat-japanese-postmodernity";
const CHAPTER_PATH = "/books/zero-years-imagination/chapters/chapter-02";
const BOOK_PATH = "/books/zero-years-imagination";
const COMPOUND_NUMBER_CHAPTER_PATH =
  "/books/meta-animation-criticism/chapters/i-i-sublime-tide";

const docketNumber = (page: import("./fixtures").Page) =>
  page.locator("#reading-cover [data-reader-docket-number]");

test("book chapter series line matches the topic cover hierarchy", async ({ page }) => {
  await page.goto(CHAPTER_PATH);

  const seriesLine = page.locator("#reading-cover p").filter({
    has: page.locator(`a[href="${BOOK_PATH}"]`),
  });
  await expect(seriesLine).toHaveCount(1);

  const hierarchy = await seriesLine.evaluate((element) => {
    const children = Array.from(element.children) as HTMLElement[];
    const [eyebrow, title, chapter] = children;
    const tokenColor = (token: string) => {
      const probe = document.createElement("span");
      probe.style.color = `var(${token})`;
      element.append(probe);
      const color = getComputedStyle(probe).color;
      probe.remove();
      return color;
    };

    return {
      order: children.map((child) => ({
        tag: child.tagName.toLowerCase(),
        text: child.textContent?.trim(),
      })),
      colors: {
        eyebrow: getComputedStyle(eyebrow).color,
        title: getComputedStyle(title).color,
        chapter: getComputedStyle(chapter).color,
      },
      titleHref: title.getAttribute("href"),
      titleWeight: getComputedStyle(title).fontWeight,
      lineWeight: getComputedStyle(element).fontWeight,
      palette: {
        grey: tokenColor("--ink-faint"),
        black: tokenColor("--ink"),
        accent: tokenColor("--accent"),
      },
    };
  });

  expect(hierarchy.order).toEqual([
    { tag: "b", text: "连载" },
    { tag: "a", text: "零零年代的想象力：宇野常宽全十六章中文译文" },
    { tag: "strong", text: "第二章" },
  ]);
  expect(hierarchy.colors).toEqual({
    eyebrow: hierarchy.palette.grey,
    title: hierarchy.palette.black,
    chapter: hierarchy.palette.accent,
  });
  expect(hierarchy.titleHref).toBe(BOOK_PATH);
  expect(hierarchy.titleWeight).toBe(hierarchy.lineWeight);
});

test("book chapters reuse the article docket and expose chapter navigation", async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto(ARTICLE_PATH);
  await page.evaluate(() => document.fonts.ready);
  const articleFontSize = await docketNumber(page).evaluate((element) =>
    getComputedStyle(element).fontSize
  );

  await page.goto(CHAPTER_PATH);
  await page.evaluate(() => document.fonts.ready);
  const chapterDocket = docketNumber(page);
  const chapterFontSize = await chapterDocket.evaluate((element) =>
    getComputedStyle(element).fontSize
  );

  expect(chapterFontSize).toBe(articleFontSize);
  await expect(chapterDocket.locator("[data-roll]")).toHaveCount(2);

  const endMark = page.locator('.reading-edition-flow [aria-label="本章完"]');
  await expect(endMark).toBeVisible();
  await expect(endMark).toHaveText("本章完");

  const navigation = page.getByRole("navigation", { name: "章节导航" });
  await expect(navigation.getByRole("link", { name: /上一章/ })).toBeVisible();
  await expect(navigation.getByRole("link", { name: /返回目录/ })).toHaveAttribute(
    "href",
    BOOK_PATH
  );
  await expect(navigation.getByRole("link", { name: /下一章/ })).toBeVisible();
});

test("full-book compound numbers remain on one rendered line", async ({ isMobile, page }) => {
  await page.goto(COMPOUND_NUMBER_CHAPTER_PATH);
  let fullBookTab = page.getByRole("tab", { name: "全书目录" });
  if (isMobile) {
    await page.getByRole("button", { name: /^文章目录：/ }).click();
    const catalogue = page.getByRole("dialog", { name: "文章目录" });
    await expect(catalogue).toBeVisible();
    fullBookTab = catalogue.getByRole("tab", { name: "全书目录" });
  }
  await fullBookTab.click();

  const compoundNumber = page.locator("#reading-index-book").getByText("I.i", { exact: true });
  await expect(compoundNumber).toBeVisible();
  expect(await compoundNumber.evaluate((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    return {
      lineCount: range.getClientRects().length,
      whiteSpace: getComputedStyle(element).whiteSpace,
    };
  })).toEqual({ lineCount: 1, whiteSpace: "nowrap" });
});
