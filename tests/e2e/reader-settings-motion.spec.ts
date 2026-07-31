import { expect, test } from "./fixtures";
import type { Locator } from "@playwright/test";

type MotionCapture = {
  maxActiveAnimations: number;
  animationNames: string[];
  sawDialog: boolean;
};

async function captureSettingsMotion(
  page: import("./fixtures").Page,
  action: () => Promise<void>
): Promise<MotionCapture> {
  await page.evaluate(() => {
    const scope = window as typeof window & {
      __settingsMotionCapture?: MotionCapture & { done: boolean };
    };
    const capture = {
      done: false,
      maxActiveAnimations: 0,
      animationNames: [] as string[],
      sawDialog: false,
    };
    scope.__settingsMotionCapture = capture;
    const startedAt = performance.now();

    const sample = () => {
      const dialog = document.querySelector<HTMLElement>(
        '[role="dialog"][aria-label="阅读习惯"]'
      );
      if (dialog) {
        capture.sawDialog = true;
        const activeAnimations = dialog.getAnimations({ subtree: true }).filter((animation) => {
          const duration = Number(animation.effect?.getComputedTiming().duration ?? 0);
          return duration > 0 && animation.playState !== "finished";
        });
        capture.maxActiveAnimations = Math.max(
          capture.maxActiveAnimations,
          activeAnimations.length
        );
        for (const animation of activeAnimations) {
          const name = animation instanceof CSSAnimation ? animation.animationName : "";
          if (name && !capture.animationNames.includes(name)) capture.animationNames.push(name);
        }
      }
      if (performance.now() - startedAt >= 700) {
        capture.done = true;
        return;
      }
      requestAnimationFrame(sample);
    };

    requestAnimationFrame(sample);
  });

  await action();
  await page.waitForFunction(() => (
    window as typeof window & { __settingsMotionCapture?: { done: boolean } }
  ).__settingsMotionCapture?.done === true);
  return page.evaluate(() => {
    const scope = window as typeof window & {
      __settingsMotionCapture?: MotionCapture & { done: boolean };
    };
    const result = scope.__settingsMotionCapture ?? {
      done: true,
      maxActiveAnimations: 0,
      animationNames: [] as string[],
      sawDialog: false,
    };
    delete scope.__settingsMotionCapture;
    return {
      maxActiveAnimations: result.maxActiveAnimations,
      animationNames: result.animationNames,
      sawDialog: result.sawDialog,
    };
  });
}

async function toolPositions(tools: Locator[]) {
  return Promise.all(tools.map((tool) => tool.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
  })));
}

test("reading settings drawer slides while the header tools stay fixed", async ({
  isMobile,
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/posts/guxiang-de-bianzhengfa");

  const reader = page.locator(".reading-edition-page");
  const trigger = reader.getByRole("button", { name: "阅读习惯", exact: true });
  const hanButton = reader.getByRole("button", { name: /切换为(?:简体|繁体)中文/ });
  const themeButton = reader.getByRole("button", { name: "切换明暗主题", exact: true });
  const tools = isMobile ? [hanButton, trigger] : [themeButton, hanButton, trigger];
  const positionsBefore = await toolPositions(tools);

  const opening = await captureSettingsMotion(page, () => trigger.click());
  expect(opening.sawDialog).toBe(true);
  expect(opening.animationNames.some((name) => name.includes("reading-sheet-slide-in"))).toBe(true);
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  expect(await toolPositions(tools)).toEqual(positionsBefore);

  const dialog = page.getByRole("dialog", { name: "阅读习惯" });
  const close = dialog.getByRole("button", { name: "关闭", exact: true });
  const closing = await captureSettingsMotion(page, () => close.click());
  expect(closing.sawDialog).toBe(true);
  expect(closing.animationNames.some((name) => name.includes("reading-sheet-slide-out"))).toBe(true);
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  expect(await toolPositions(tools)).toEqual(positionsBefore);
});
