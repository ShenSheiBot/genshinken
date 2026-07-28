import { expect, test } from "./fixtures";

const CHAPTER_PATH = "/books/lih-bread-and-authority-in-russia/chapters/chapter-3";
const ARTICLE_PATH = "/posts/guxiang-de-bianzhengfa";
const MULTIPART_CHAPTER_PATH = "/books/shulgin-dni/chapters/penultimate-days";
const LEGACY_PART_PATH = "/books/shulgin-dni/chapters/penultimate-1916-11-03";
const BEFORE_MULTIPART_CHAPTER_PATH = "/books/shulgin-dni/chapters/constitutional-day-three";
const MULTIPART_SECTION_TITLE = "1916年11月3日";
const MULTIPART_SECTION_PATH = `${MULTIPART_CHAPTER_PATH}#${encodeURIComponent(MULTIPART_SECTION_TITLE)}`;

const docketNumber = (page: import("./fixtures").Page) =>
  page.locator("#reading-cover [data-reader-docket-number]");

test("book chapter series line matches the topic cover hierarchy", async ({ page }) => {
  await page.goto(MULTIPART_CHAPTER_PATH);

  const seriesLine = page.locator("#reading-cover p").filter({
    has: page.locator('a[href="/books/shulgin-dni"]'),
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
        red: tokenColor("--accent"),
      },
    };
  });

  expect(hierarchy.order).toEqual([
    { tag: "b", text: "连载" },
    { tag: "a", text: "往日：忆一九〇五年立宪与一九一七年二月革命" },
    { tag: "strong", text: "第五章" },
  ]);
  expect(hierarchy.colors).toEqual({
    eyebrow: hierarchy.palette.grey,
    title: hierarchy.palette.black,
    chapter: hierarchy.palette.red,
  });
  expect(hierarchy.titleHref).toBe("/books/shulgin-dni");
  expect(hierarchy.titleWeight).toBe(hierarchy.lineWeight);
});

test("book chapters reuse the article docket and expose the chapter end label", async ({ page }) => {
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
  const digitAnimations = await chapterDocket.locator("[data-roll]").evaluateAll((digits) =>
    digits.map((digit) => ({
      roll: digit.getAttribute("data-roll"),
      animationName: getComputedStyle(digit.firstElementChild as Element).animationName,
    }))
  );
  expect(digitAnimations[0]).toMatchObject({ roll: "up" });
  expect(digitAnimations[0]?.animationName).toContain("docket-digit-up");
  expect(digitAnimations[1]).toMatchObject({ roll: "down" });
  expect(digitAnimations[1]?.animationName).toContain("docket-digit-down");

  const endMark = page.locator('.reading-edition-flow [aria-label="本章完"]');
  await expect(endMark).toBeVisible();
  await expect(endMark).toHaveText("本章完");
});

test("full-book compound numbers remain on one rendered line", async ({ isMobile, page }) => {
  await page.goto(CHAPTER_PATH);
  let fullBookTab = page.getByRole("tab", { name: "全书目录" });
  if (isMobile) {
    await page.getByRole("button", { name: /^文章目录：/ }).click();
    const catalogue = page.getByRole("dialog", { name: "文章目录" });
    await expect(catalogue).toBeVisible();
    fullBookTab = catalogue.getByRole("tab", { name: "全书目录" });
  }
  await fullBookTab.click();

  const fullBookPanel = page.locator("#reading-index-book");
  const compoundNumber = fullBookPanel.getByText("前 1", { exact: true });
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

test("shared chapter parts render as subtitles on one chapter page", async ({ isMobile, page }) => {
  const response = await page.goto(MULTIPART_CHAPTER_PATH);
  expect(response?.status()).toBe(200);

  await expect(page.getByRole("heading", { name: "本节目录", exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "“立宪”的倒数第二日", level: 1 })).toBeVisible();
  const publishedSubtitle = page.locator("article.reading-edition-body h3").filter({
    hasText: "1916年11月3日",
  });
  await expect(publishedSubtitle).toBeVisible();
  const subtitleMarker = await publishedSubtitle.evaluate((heading) => {
    const marker = getComputedStyle(heading, "::before");
    const probe = document.createElement("span");
    probe.style.color = "var(--accent)";
    heading.append(probe);
    const accent = getComputedStyle(probe).color;
    probe.remove();
    return {
      content: marker.content,
      counterIncrement: getComputedStyle(heading).counterIncrement,
      color: marker.color,
      accent,
    };
  });
  expect(subtitleMarker.content).toBe("counter(reading-section, decimal-leading-zero)");
  expect(subtitleMarker.counterIncrement).toContain("reading-section");
  expect(subtitleMarker.color).toBe(subtitleMarker.accent);
  await expect(page.locator("article.reading-edition-body")).toContainText("四下里静极了");

  const chapterNavigation = page.getByRole("navigation", { name: "章节导航" });
  await expect(chapterNavigation.getByRole("link")).toHaveCount(2);
  await expect(chapterNavigation.getByRole("link", { name: /上一章/ })).toBeVisible();
  await expect(chapterNavigation.getByRole("link", { name: /下一章/ })).toHaveCount(0);

  let fullBookTab = page.getByRole("tab", { name: "全书目录" });
  if (isMobile) {
    await page.getByRole("button", { name: /^文章目录：/ }).click();
    const catalogue = page.getByRole("dialog", { name: "文章目录" });
    await expect(catalogue).toBeVisible();
    fullBookTab = catalogue.getByRole("tab", { name: "全书目录" });
  }
  await fullBookTab.click();
  const fullBookPanel = page.locator("#reading-index-book");
  const penultimateSections = fullBookPanel.getByLabel("“立宪”的倒数第二日的次级标题");
  await expect(penultimateSections.getByRole("button", { name: "1916年11月3日" })).toBeVisible();
  await expect(penultimateSections.locator('[data-status="forthcoming"]')).toHaveCount(2);
  await expect(penultimateSections.locator('[data-status="forthcoming"]').filter({ hasText: "1916年11月至12月" })).toHaveAttribute("aria-disabled", "true");
  await expect(penultimateSections.locator('[data-status="forthcoming"]').filter({ hasText: "1917年2月26日" })).toHaveAttribute("aria-disabled", "true");
  await expect(penultimateSections.locator('a, button').filter({ hasText: /1916年11月至12月|1917年2月26日/ })).toHaveCount(0);

  const lastDaysDisclosure = fullBookPanel.getByRole("button", {
    name: /(?:展开|折叠)“立宪”的最后几天的次级标题/,
  });
  if (await lastDaysDisclosure.getAttribute("aria-expanded") === "false") {
    await lastDaysDisclosure.click();
  }
  const lastDaysSections = fullBookPanel.getByLabel("“立宪”的最后几天的次级标题");
  await expect(lastDaysSections.locator('[data-status="forthcoming"]')).toHaveCount(5);

  await page.goto("/books/shulgin-dni");
  await expect(page.getByText("已发布 6 / 全部 8", { exact: false })).toBeVisible();
  const sectionRows = page.locator("li[data-section-status]");
  await expect(sectionRows).toHaveCount(8);
  await expect(page.locator('li[data-section-status="published"] a[href="/books/shulgin-dni/chapters/penultimate-days#1916%E5%B9%B411%E6%9C%883%E6%97%A5"]')).toHaveCount(1);
  await expect(page.locator('li[data-section-status="forthcoming"]')).toHaveCount(7);
  await expect(page.locator('li[data-section-status="forthcoming"] a, li[data-section-status="forthcoming"] button')).toHaveCount(0);

  const legacyResponse = await page.goto(LEGACY_PART_PATH);
  expect(legacyResponse?.status()).toBe(404);
});

test("full-book subtitles jump across chapters and within the current chapter", async ({
  isMobile,
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(BEFORE_MULTIPART_CHAPTER_PATH);

  let fullBookTab = page.getByRole("tab", { name: "全书目录" });
  if (isMobile) {
    await page.getByRole("button", { name: /^文章目录：/ }).click();
    const catalogue = page.getByRole("dialog", { name: "文章目录" });
    await expect(catalogue).toBeVisible();
    fullBookTab = catalogue.getByRole("tab", { name: "全书目录" });
  }
  await fullBookTab.click();

  let fullBookPanel = page.locator("#reading-index-book");
  const multipartDisclosure = fullBookPanel.getByRole("button", {
    name: /(?:展开|折叠)“立宪”的倒数第二日的次级标题/,
  });
  if (await multipartDisclosure.getAttribute("aria-expanded") === "false") {
    await multipartDisclosure.click();
  }
  const crossChapterLink = fullBookPanel.getByRole("link", {
    name: MULTIPART_SECTION_TITLE,
    exact: true,
  });
  await expect(crossChapterLink).toHaveAttribute("href", MULTIPART_SECTION_PATH);
  await crossChapterLink.click();
  await expect(page).toHaveURL(MULTIPART_SECTION_PATH);

  const subtitle = page.locator(
    `article.reading-edition-body h3[id="${MULTIPART_SECTION_TITLE}"]`
  );
  await expect(subtitle).toBeVisible();
  await expect(subtitle).toBeInViewport();
  await expect.poll(() => subtitle.evaluate((element) =>
    element.getBoundingClientRect().top
  )).toBeLessThan(240);

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  fullBookTab = page.getByRole("tab", { name: "全书目录" });
  let currentCatalogue: import("@playwright/test").Locator | null = null;
  if (isMobile) {
    await page.getByRole("button", { name: /^文章目录：/ }).click();
    currentCatalogue = page.getByRole("dialog", { name: "文章目录" });
    await expect(currentCatalogue).toBeVisible();
    fullBookTab = currentCatalogue.getByRole("tab", { name: "全书目录" });
  }
  await fullBookTab.click();
  fullBookPanel = page.locator("#reading-index-book");
  const currentSectionButton = fullBookPanel.getByRole("button", {
    name: MULTIPART_SECTION_TITLE,
    exact: true,
  });
  await expect(currentSectionButton).toBeVisible();
  await currentSectionButton.click();
  await expect(page).toHaveURL(MULTIPART_SECTION_PATH);
  await expect(subtitle).toBeFocused();
  await expect(subtitle).toBeInViewport();
  await expect.poll(() => subtitle.evaluate((element) =>
    element.getBoundingClientRect().top
  )).toBeLessThan(240);
  if (currentCatalogue) await expect(currentCatalogue).toBeHidden();
});
