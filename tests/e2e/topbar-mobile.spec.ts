import { expect, test, type Page } from "./fixtures";

const MOBILE_WIDTHS = [320, 360, 375, 390, 412, 430] as const;

async function expectCompactTopBarToFit(page: Page, width: number) {
  await page.setViewportSize({ width, height: 812 });

  const header = page.locator("header.topbar");
  const brand = header.getByRole("link", { name: "返回首页" });
  const navigationTrigger = header.getByRole("button", { name: "全站导航" });
  const search = header.getByRole("button", { name: "搜索" });
  const theme = header.getByRole("button", { name: "切换明暗主题" });

  await expect(header).toBeVisible();
  await expect(brand).toBeVisible();
  await expect(navigationTrigger).toBeVisible();
  await expect(navigationTrigger).toHaveText(/导航/);
  await expect(search).toBeVisible();
  await expect(theme).toBeVisible();
  await expect(header.locator(".brandName")).toBeHidden();
  await expect(header.locator(".global-section-nav")).toBeHidden();

  const geometry = await header.evaluate((element) => {
    const controls = [
      element.querySelector<HTMLElement>(".brand"),
      element.querySelector<HTMLElement>(".mobile-global-nav-trigger"),
      element.querySelector<HTMLElement>(".search-trigger"),
      element.querySelector<HTMLElement>(".toggle"),
    ];
    if (controls.some((control) => !control)) throw new Error("Topbar control is missing");

    const rects = controls.map((control) => {
      const rect = control!.getBoundingClientRect();
      return { left: rect.left, right: rect.right, width: rect.width };
    });
    const label = element.querySelector<HTMLElement>(".mobile-global-nav-trigger span");
    if (!label) throw new Error("Navigation trigger label is missing");

    return {
      viewportWidth: document.documentElement.clientWidth,
      documentWidth: document.documentElement.scrollWidth,
      headerClientWidth: element.clientWidth,
      headerScrollWidth: element.scrollWidth,
      labelClientWidth: label.clientWidth,
      labelScrollWidth: label.scrollWidth,
      rects,
    };
  });

  expect(geometry.documentWidth, `${width}px document overflow`).toBeLessThanOrEqual(geometry.viewportWidth + 1);
  expect(geometry.headerScrollWidth, `${width}px header overflow`).toBeLessThanOrEqual(geometry.headerClientWidth + 1);
  expect(geometry.labelScrollWidth, `${width}px navigation label clipping`).toBeLessThanOrEqual(geometry.labelClientWidth + 1);
  geometry.rects.forEach((rect, index) => {
    expect(rect.width, `${width}px control ${index} collapsed`).toBeGreaterThan(0);
    expect(rect.left, `${width}px control ${index} crossed the left edge`).toBeGreaterThanOrEqual(-1);
    expect(rect.right, `${width}px control ${index} crossed the right edge`).toBeLessThanOrEqual(geometry.viewportWidth + 1);
    if (index > 0) {
      expect(rect.left, `${width}px controls ${index - 1} and ${index} overlap`).toBeGreaterThanOrEqual(geometry.rects[index - 1].right - 1);
    }
  });

  await navigationTrigger.click();
  const mobileNavigation = page.getByRole("navigation", { name: "移动端全站导航" });
  await expect(mobileNavigation).toBeVisible();
  await expect(mobileNavigation.getByRole("link")).toHaveCount(4);
  for (const label of ["专题", "连载", "文库", "关于"]) {
    const link = mobileNavigation.getByRole("link", { name: label, exact: true });
    await expect(link).toBeVisible();
    const rect = await link.boundingBox();
    expect(rect, `${width}px ${label} link has no box`).not.toBeNull();
    expect(rect!.height, `${width}px ${label} touch target is too short`).toBeGreaterThanOrEqual(44);
    expect(rect!.x, `${width}px ${label} crossed the left edge`).toBeGreaterThanOrEqual(-1);
    expect(rect!.x + rect!.width, `${width}px ${label} crossed the right edge`).toBeLessThanOrEqual(geometry.viewportWidth + 1);
  }

  await page.keyboard.press("Escape");
  await expect(mobileNavigation).toBeHidden();
  await expect(navigationTrigger).toBeFocused();
}

test("ordinary-page mobile navigation stays uncrowded from 320px through 430px", async ({
  isMobile,
  page,
}) => {
  test.skip(!isMobile, "mobile Chromium and WebKit own the compact topbar contract");

  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);

  for (const width of MOBILE_WIDTHS) {
    await test.step(`${width}px`, async () => {
      await expectCompactTopBarToFit(page, width);
    });
  }

  await page.setViewportSize({ width: 320, height: 812 });
  await page.getByRole("button", { name: "全站导航" }).click();
  await page.getByRole("navigation", { name: "移动端全站导航" }).getByRole("link", {
    name: "专题",
    exact: true,
  }).click();
  await expect(page).toHaveURL(/\/topics\/?$/);

  const navigationTrigger = page.getByRole("button", { name: "全站导航" });
  await expect(navigationTrigger).toBeVisible();
  await navigationTrigger.click();
  await expect(page.getByRole("navigation", { name: "移动端全站导航" }).getByRole("link", {
    name: "专题",
    exact: true,
  })).toHaveAttribute("aria-current", "page");
});
