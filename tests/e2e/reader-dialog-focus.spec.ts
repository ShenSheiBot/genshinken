import { expect, test } from "./fixtures";

test("reading settings traps focus and restores its trigger", async ({ page }) => {
  await page.goto("/posts/guxiang-de-bianzhengfa");

  const trigger = page.getByRole("button", { name: "阅读习惯", exact: true });
  await trigger.focus();
  await expect(trigger).toBeFocused();
  const triggerBoxBeforeOpen = await trigger.boundingBox();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "阅读习惯" });
  const dialogHeader = dialog.locator("header").first();
  const dialogHeading = dialogHeader.getByRole("heading", { name: "阅读习惯", exact: true });
  const dialogTrigger = dialogHeader.getByRole("button", { name: "阅读习惯", exact: true });
  const first = dialog.getByRole("button", { name: "字 衬线" });
  const last = dialog.getByRole("button", { name: "清除全部记录" });

  await expect(dialog).toBeFocused();
  await expect(page.getByRole("button", { name: "阅读习惯", exact: true })).toHaveCount(1);
  await expect(dialogTrigger).toBeVisible();
  await expect(dialog.getByRole("button", { name: "关闭", exact: true })).toHaveCount(0);
  await expect(dialog.getByText("×", { exact: true })).toHaveCount(0);
  const [headingBox, triggerBox] = await Promise.all([
    dialogHeading.boundingBox(),
    dialogTrigger.boundingBox(),
  ]);
  expect(headingBox).not.toBeNull();
  expect(triggerBox).not.toBeNull();
  expect(triggerBoxBeforeOpen).not.toBeNull();
  expect(triggerBox!.width).toBe(triggerBoxBeforeOpen!.width);
  expect(triggerBox!.height).toBe(triggerBoxBeforeOpen!.height);
  expect(triggerBox!.x).toBeGreaterThan(headingBox!.x + headingBox!.width);
  expect(Math.min(headingBox!.y + headingBox!.height, triggerBox!.y + triggerBox!.height)
    - Math.max(headingBox!.y, triggerBox!.y)).toBeGreaterThan(0);
  await page.keyboard.press("Shift+Tab");
  await expect(last).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dialogTrigger).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(first).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(dialogTrigger).toBeFocused();

  await page.keyboard.press("Enter");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();

  await page.keyboard.press("Enter");
  await expect(dialog).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("mobile annotation dialog returns focus to the footnote", async ({ isMobile, page }) => {
  test.skip(!isMobile, "annotation references use the compact dialog on mobile projects");

  await page.goto("/posts/lih-lenin-disputed");
  const footnote = page.locator("article.reading-edition-body a[data-footnote-ref]").first();
  await footnote.focus();
  await page.keyboard.press("Enter");

  const dialog = page.getByRole("dialog", { name: "文章注释" });
  const last = dialog.getByRole("button", { name: "原文位置" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toBeFocused();

  await page.keyboard.press("Shift+Tab");
  await expect(last).toBeFocused();
  await page.keyboard.press("Tab");
  await expect.poll(() => dialog.evaluate((element) => {
    const focusable = Array.from(element.querySelectorAll<HTMLElement>(
      "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])"
    )).filter((candidate) => (
      candidate.getClientRects().length > 0
      && !candidate.closest("[inert], [aria-hidden='true']")
    ));
    return document.activeElement === focusable[0];
  })).toBe(true);

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(footnote).toBeFocused();
});

test("mobile annotation deep link restores focus to its source", async ({ isMobile, page }) => {
  test.skip(!isMobile, "annotation references use the compact dialog on mobile projects");

  const referenceId = "user-content-fn-e15";
  await page.goto(`/posts/lih-lenin-disputed#${referenceId}`);
  const footnote = page.locator(
    `article.reading-edition-body a[data-footnote-ref][href="#${referenceId}"]`
  ).first();
  const dialog = page.getByRole("dialog", { name: "文章注释" });

  await expect(dialog).toBeVisible();
  await expect(dialog).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(footnote).toBeFocused();
});
