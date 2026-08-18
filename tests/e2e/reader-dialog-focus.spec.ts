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
  const close = dialog.getByRole("button", { name: "关闭", exact: true });
  const first = dialog.getByRole("button", { name: "字 衬线" });
  const last = dialog.getByRole("button", { name: "清除全部记录" });

  await expect(dialog).toBeFocused();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(close).toBeVisible();
  await expect(trigger).toHaveJSProperty("isConnected", true);
  expect(await trigger.boundingBox()).toEqual(triggerBoxBeforeOpen);

  await page.keyboard.press("Shift+Tab");
  await expect(last).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(close).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(first).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(close).toBeFocused();

  const closingFrames = await captureReadingSettingsButtonFrames(
    page,
    () => page.keyboard.press("Enter")
  );
  expectContinuousSettingsButton(closingFrames);
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  expect(await trigger.boundingBox()).toEqual(triggerBoxBeforeOpen);

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

test("article footnotes preserve the reading position and return to their source", async ({ isMobile, page }) => {
  await page.goto("/books/monogatari-series-articles/chapters/kaiki-speech-self-deception");
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      document.getAnimations()
        .filter((animation) => animation.playState === "running")
        .map((animation) => animation.finished.catch(() => undefined))
    );
  });
  const footnote = page.locator("article.reading-edition-body a[data-footnote-ref]").first();
  await footnote.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  const before = await page.evaluate(() => window.scrollY);
  await footnote.click();

  const referenceSurface = isMobile
    ? page.getByRole("dialog", { name: "文章注释" })
    : page.locator("#reading-right-rail").locator('[data-kind="annotation"]');
  await expect(referenceSurface).toBeVisible();
  expect(Math.abs((await page.evaluate(() => window.scrollY)) - before)).toBeLessThan(8);

  await referenceSurface.getByRole("button", { name: "原文位置" }).click();
  await expect(footnote).toBeFocused();
  await expect(footnote).toBeInViewport();
});

test("article endnote backrefs return to the stable reading line", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/books/monogatari-series-articles/chapters/kaiki-speech-self-deception");
  const backref = page.locator(".reading-edition-appendix a[data-footnote-backref]").first();
  const href = await backref.getAttribute("href");
  expect(href).toMatch(/^#/u);
  const source = page.locator(href!);
  await backref.scrollIntoViewIfNeeded();
  await backref.click();
  await expect(source).toBeFocused();
  await expect(page).toHaveURL(new RegExp(`${href as string}$`, "u"));
  const position = await source.evaluate((element) => ({
    actual: element.getBoundingClientRect().top,
    expected: (document.documentElement.clientHeight || window.innerHeight) * 0.36,
  }));
  expect(Math.abs(position.actual - position.expected)).toBeLessThan(3);
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
