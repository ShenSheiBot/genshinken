import { expect, test } from "./fixtures";

const route = "/posts/animation-as-machine-takahata-lamarre-critique";
const reference = (page: import("./fixtures").Page) => page.locator("article.reading-edition-body a[data-footnote-ref]").first();

for (const mode of ["sidenotes", "popup", "rail"]) test(`${mode} hides duplicate endnotes on screen but retains them for print`, async ({ page }) => {
  await page.addInitScript((value) => localStorage.setItem("roof_reader_notes", value), mode);
  await page.goto(route);
  const appendix = page.locator("[data-reader-annotations]");
  await expect(appendix).toHaveAttribute("data-reader-enhanced", "true");
  await expect(appendix).toBeHidden();
  await expect(page.locator(".reading-edition-appendix")).toBeHidden();
  await expect(appendix.locator("li")).toHaveCount(20);
  await page.emulateMedia({ media: "print" });
  await expect(appendix).toBeVisible();
  await expect(appendix).toContainText("Crary");
  await page.emulateMedia({ media: "screen" });
  await expect(appendix).toBeHidden();
  // Exercise the independent bibliography sibling even on this note-only article.
  await page.locator(".reading-edition-appendix").evaluate((element) => {
    element.insertAdjacentHTML("beforeend", '<details data-test-bibliography><summary>Bibliography</summary></details>');
  });
  await expect(page.locator("[data-test-bibliography]")).toBeVisible();
  await expect(appendix).toBeHidden();
});

test("an explicit full-table link can reveal its hidden endnote", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("roof_reader_notes", "popup"));
  await page.goto(route);
  await reference(page).click();
  await expect(page.locator("#reader-note-popover")).toBeVisible();
  // Supply a wide-table fixture to the existing full-table navigation handler.
  await page.evaluate(() => {
    document.querySelector("[data-reader-annotations] li")!.insertAdjacentHTML("beforeend",
      '<table id="endnote-wide-table" tabindex="-1"><tr><td>A</td><td>B</td><td>C</td></tr></table>');
    document.getElementById("reader-note-popover")!.insertAdjacentHTML("beforeend",
      '<a href="#endnote-wide-table" data-reference-table-link="true">Full table</a>');
  });
  await page.getByRole("link", { name: "Full table", exact: true }).click();
  await expect(page.locator("[data-reader-annotations]")).toBeVisible();
  await expect(page.locator("#endnote-wide-table")).toBeVisible();
  await expect(page.locator("#endnote-wide-table")).toBeFocused();
});

test.describe("no-JavaScript reading", () => {
  test.use({ javaScriptEnabled: false });
  test("the original endnotes remain visible and linkable", async ({ page }) => {
    await page.goto(route);
    const appendix = page.locator("[data-reader-annotations]");
    await expect(appendix).toBeVisible();
    await expect(appendix.locator("li")).toHaveCount(20);
    await reference(page).focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#user-content-fn-animation-machine-1$/);
    await expect(page.locator("#user-content-fn-animation-machine-1")).toBeInViewport();
  });
});

test("optional popup notes preserve position and return keyboard focus", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("roof_reader_notes", "popup"));
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(route);
  await page.evaluate(() => document.fonts.ready);
  const ref = reference(page);
  await ref.scrollIntoViewIfNeeded();
  await ref.focus();
  await expect(page.locator("#reader-note-popover")).toBeVisible();
  const y = await page.evaluate(() => scrollY);
  await page.keyboard.press("Enter");
  const note = page.locator("#reader-note-popover");
  await expect(note).toBeFocused();
  const targetText = await ref.evaluate((a) => {
    const copy = document.getElementById(a.getAttribute("href")!.slice(1))!.cloneNode(true) as HTMLElement;
    copy.querySelectorAll("a[data-footnote-backref]").forEach((backlink) => backlink.remove());
    return copy.textContent!.trim();
  });
  await expect(note).toContainText(targetText);
  expect(Math.abs(await page.evaluate(() => scrollY) - y)).toBeLessThan(3);
  const box = (await note.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
  await page.keyboard.press("Escape");
  await expect(note).toHaveCount(0);
  await expect(ref).toBeFocused();
  await ref.click();
  await expect(note).toBeVisible();
  await note.getByRole("button", { name: "关闭", exact: true }).click();
  await expect(note).toHaveCount(0);
  await expect(ref).toBeFocused();
  await ref.click();
  await page.locator(".reading-edition-body").click({ position: { x: 2, y: 2 }, force: true });
  await expect(note).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("a saved legacy layout still opens its note rail or mobile sheet", async ({ page, isMobile }) => {
  await page.addInitScript(() => {
    localStorage.setItem("roof_reader_notes", "rail");
    localStorage.setItem("roof_reader_contents", "pinned");
  });
  await page.goto(route);
  await reference(page).click();
  await expect(page.locator("#reader-note-popover")).toHaveCount(0);
  const surface = isMobile ? page.getByRole("dialog", { name: "注释", exact: true }) : page.locator("#reading-right-rail");
  await expect(surface).toBeVisible();
  await expect(surface).toContainText("Crary");
  await surface.getByRole("button", { name: "原文位置", exact: true }).click();
  await expect(reference(page)).toBeFocused();
});

test("direct note links open a popup beside the source text", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("roof_reader_notes", "popup"));
  await page.goto(`${route}#user-content-fn-animation-machine-1`);
  await expect(page.locator("#reader-note-popover")).toBeVisible();
  await expect(page.locator("#reader-note-popover")).toContainText("Crary");
  await expect(reference(page)).toBeInViewport();
});

test("hover notes allow moving into the popup and dismiss on leaving", async ({ page, isMobile }) => {
  test.skip(isMobile, "touch is covered by the click and keyboard test");
  await page.addInitScript(() => localStorage.setItem("roof_reader_notes", "popup"));
  await page.goto(route);
  const ref = reference(page);
  await ref.hover();
  const note = page.locator("#reader-note-popover");
  await expect(note).toBeVisible();
  await note.hover();
  await page.waitForTimeout(300);
  await expect(note).toBeVisible();
  await page.mouse.move(2, 400);
  await expect(note).toHaveCount(0);
});

test("contents auto-hide, remain usable by keyboard, and can be pinned", async ({ page, isMobile }) => {
  test.skip(isMobile, "narrow screens retain the header contents control");
  await page.goto(route);
  const headerContents = page.locator('button[class*="compactTocButton"]');
  await expect(headerContents).toBeHidden();
  const desktopViewport = page.viewportSize()!;
  await page.setViewportSize({ width: 900, height: desktopViewport.height });
  await expect(headerContents).toBeVisible();
  await page.setViewportSize(desktopViewport);
  await expect(headerContents).toBeHidden();
  await reference(page).scrollIntoViewIfNeeded();
  const reveal = page.locator("#reader-hover-contents");
  const trigger = page.locator('#reading-left-rail button[aria-controls="reader-hover-contents"]');
  await expect(reveal).toBeHidden();
  await expect(page.locator("[data-reader-sidenotes]")).toBeVisible();
  expect(await trigger.evaluate((element) => getComputedStyle(element).borderLeftWidth)).toBe("0px");
  await trigger.hover();
  await expect(reveal).toBeVisible();
  await page.mouse.move(700, 700);
  await expect(reveal).toBeHidden();
  await trigger.focus();
  await expect(reveal).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(reveal).toBeHidden();
  await expect(trigger).toBeFocused();
  await page.getByRole("button", { name: "阅读习惯", exact: true }).click();
  await page.getByRole("button", { name: "双栏模式", exact: true }).click();
  await page.getByRole("dialog", { name: "阅读习惯" }).getByRole("button", { name: "关闭", exact: true }).click();
  await expect(page.locator("#reader-hover-contents")).toHaveCount(0);
  await expect(page.locator("#reading-right-rail > div")).toBeVisible();
  await page.reload();
  await expect(page.locator("#reading-right-rail > div")).toBeVisible();
  await expect(page.locator("#reader-hover-contents")).toHaveCount(0);
});

test("hover contents stay open after a heading jump until the mouse leaves", async ({ page, isMobile }) => {
  test.skip(isMobile, "the desktop hover rail is absent on touch screens");
  await page.goto(route);
  const reveal = page.locator("#reader-hover-contents");
  const trigger = page.locator('#reading-left-rail button[aria-controls="reader-hover-contents"]');
  await trigger.hover();
  await expect(reveal).toBeVisible();
  await reveal.locator('[class*="tocJump"]').first().click();
  await expect.poll(() => page.evaluate(() => document.activeElement?.matches("h1, h2, h3, h4, h5, h6"))).toBe(true);
  await page.waitForTimeout(300);
  await expect(reveal).toBeVisible();
  await page.mouse.move(700, 700);
  await expect(reveal).toBeHidden();
  await trigger.hover();
  await expect(reveal).toBeVisible();
  await trigger.click();
  await expect(reveal).toBeVisible();
  await page.mouse.move(700, 700);
  await expect(reveal).toBeHidden();
});

test("hidden contents remain accessible from the header and quiet defaults can be restored", async ({ page }) => {
  await page.goto(route);
  await page.getByRole("button", { name: "阅读习惯", exact: true }).click();
  const settings = page.getByRole("dialog", { name: "阅读习惯" });
  await settings.getByRole("button", { name: "隐藏", exact: true }).click();
  await settings.getByRole("button", { name: "关闭", exact: true }).click();
  await expect(page.locator("#reading-left-rail > div")).toHaveCount(0);
  if (page.viewportSize()!.width >= 1024) {
    await expect(page.locator('button[class*="compactTocButton"]')).toBeVisible();
  }
  const header = page.locator("header").filter({ has: page.getByRole("button", { name: "阅读习惯", exact: true }) });
  await header.locator('button[aria-haspopup="dialog"]').filter({ hasText: /目录|导读/ }).filter({ visible: true }).first().click();
  const contents = page.getByRole("dialog", { name: "文章目录", exact: true });
  await expect(contents).toBeVisible();
  await expect(contents.getByRole("link", { name: "下载 EPUB 电子书" })).toBeVisible();
  await contents.getByRole("button", { name: "关闭", exact: true }).click();
  await page.getByRole("button", { name: "阅读习惯", exact: true }).click();
  await settings.getByRole("button", { name: "纯净模式", exact: true }).click();
  await expect(settings.getByRole("button", { name: "自动收起", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(settings.getByRole("button", { name: "随文旁注", exact: true })).toHaveAttribute("aria-pressed", "true");
});

test("default margin notes align, avoid collisions, and scroll with the article", async ({ page, isMobile }) => {
  await page.goto(route);
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => Promise.all(document.getAnimations().map((animation) => animation.finished.catch(() => {}))));
  await reference(page).scrollIntoViewIfNeeded();
  if (isMobile) {
    await expect(page.locator("[data-reader-sidenotes]")).toHaveCount(0);
    await reference(page).tap();
    await expect(page.locator("#reader-note-popover")).toBeVisible();
    return;
  }
  const notes = page.locator("[data-sidenote-id]");
  await expect(notes).toHaveCount(20);
  await expect.poll(async () => {
    const anchor = (await reference(page).boundingBox())!;
    const note = (await notes.first().boundingBox())!;
    return Math.abs(note.y - anchor.y);
  }).toBeLessThan(3);
  await expect(page.locator("#reader-note-popover")).toHaveCount(0);
  await reference(page).click();
  await expect(notes.first()).toBeFocused();
  // Sample in one browser turn so unrelated asynchronous article reflow cannot
  // be mistaken for a fixed/sticky note while measuring the scroll delta.
  const drift = await notes.first().evaluate((note) => {
    const before = note.getBoundingClientRect().top;
    const oldY = scrollY;
    window.scrollBy({ top: 180, behavior: "instant" });
    return Math.abs(note.getBoundingClientRect().top - before + scrollY - oldY);
  });
  expect(drift).toBeLessThan(2);
  const layout = await notes.evaluateAll((items) => items.map((item) => {
    const rect = item.getBoundingClientRect();
    return { top: rect.top, bottom: rect.bottom, font: parseFloat(getComputedStyle(item).fontSize), overflow: getComputedStyle(item).overflowY };
  }));
  for (let index = 0; index < layout.length; index++) {
    expect(layout[index].font).toBeLessThan(16);
    expect(layout[index].overflow).toBe("visible");
    if (index) expect(layout[index].top).toBeGreaterThanOrEqual(layout[index - 1].bottom + 17);
  }
  await page.getByRole("button", { name: "阅读习惯", exact: true }).click();
  const settings = page.getByRole("dialog", { name: "阅读习惯" });
  await settings.getByRole("button", { name: "字 大", exact: true }).click();
  await settings.getByRole("button", { name: "关闭", exact: true }).click();
  await expect.poll(async () => {
    const boxes = await notes.evaluateAll((items) => items.map((item) => item.getBoundingClientRect().toJSON()));
    return boxes.every((box, index) => !index || box.top >= boxes[index - 1].bottom + 17);
  }).toBe(true);
  await page.setViewportSize({ width: 1100, height: 900 });
  await expect.poll(async () => {
    return notes.evaluateAll((items) => {
      const boxes = items.map((item) => item.getBoundingClientRect());
      const section = document.getElementById("reading-right-rail")!.parentElement!.getBoundingClientRect();
      return boxes.every((box, index) => !index || box.top >= boxes[index - 1].bottom + 17)
        && boxes[boxes.length - 1].bottom <= section.bottom + 1;
    });
  }).toBe(true);
});
