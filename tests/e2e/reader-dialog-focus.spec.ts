import { expect, test } from "./fixtures";

type SettingsButtonFrame = { count: number; visibleCount: number };

async function captureReadingSettingsButtonFrames(
  page: import("./fixtures").Page,
  action: () => Promise<void>
): Promise<SettingsButtonFrame[]> {
  await page.evaluate(() => {
    const scope = window as typeof window & {
      __readingSettingsCapture?: { done: boolean; frames: SettingsButtonFrame[] };
    };
    const capture = { done: false, frames: [] as SettingsButtonFrame[] };
    scope.__readingSettingsCapture = capture;
    const startedAt = performance.now();
    const sample = () => {
      const buttons = Array.from(document.querySelectorAll<HTMLElement>(
        'button[aria-label="阅读习惯"]'
      ));
      const visibleCount = buttons.filter((button) => {
        const rect = button.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return false;
        let ancestor: HTMLElement | null = button;
        while (ancestor) {
          const style = getComputedStyle(ancestor);
          if (style.display === "none"
            || style.visibility === "hidden"
            || style.contentVisibility === "hidden"
            || Number(style.opacity) <= 0) return false;
          ancestor = ancestor.parentElement;
        }
        const left = Math.max(0, rect.left);
        const right = Math.min(window.innerWidth, rect.right);
        const top = Math.max(0, rect.top);
        const bottom = Math.min(window.innerHeight, rect.bottom);
        return right > left && bottom > top;
      }).length;
      capture.frames.push({ count: buttons.length, visibleCount });
      if (performance.now() - startedAt >= 360) {
        capture.done = true;
        return;
      }
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });

  await action();
  await page.waitForFunction(() => (
    window as typeof window & { __readingSettingsCapture?: { done: boolean } }
  ).__readingSettingsCapture?.done === true);
  return page.evaluate(() => {
    const scope = window as typeof window & {
      __readingSettingsCapture?: { done: boolean; frames: SettingsButtonFrame[] };
    };
    const frames = scope.__readingSettingsCapture?.frames ?? [];
    delete scope.__readingSettingsCapture;
    return frames;
  });
}

function expectContinuousSettingsButton(frames: SettingsButtonFrame[]) {
  expect(frames.length).toBeGreaterThan(1);
  expect(frames.every((frame) => frame.count === 1 && frame.visibleCount === 1)).toBe(true);
}

test("reading settings traps focus and restores its trigger", async ({ page }) => {
  await page.goto("/posts/guxiang-de-bianzhengfa");

  const trigger = page.getByRole("button", { name: "阅读习惯", exact: true });
  await trigger.focus();
  await expect(trigger).toBeFocused();
  const triggerBoxBeforeOpen = await trigger.boundingBox();
  const openingFrames = await captureReadingSettingsButtonFrames(
    page,
    () => page.keyboard.press("Enter")
  );
  expectContinuousSettingsButton(openingFrames);
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

  const closingFrames = await captureReadingSettingsButtonFrames(
    page,
    () => page.keyboard.press("Enter")
  );
  expectContinuousSettingsButton(closingFrames);
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
