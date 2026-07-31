import { expect, test } from "./fixtures";

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

test("reading settings panel animates while opening and closing", async ({ page }) => {
  await page.goto("/posts/guxiang-de-bianzhengfa");
  const trigger = page.getByRole("button", { name: "阅读习惯", exact: true });

  const opening = await captureSettingsMotion(page, () => trigger.click({ force: true }));
  expect(opening.sawDialog).toBe(true);
  expect(opening.animationNames.some((name) => name.includes("reading-settings-panel-in"))).toBe(true);

  const dialogTrigger = page.getByRole("dialog", { name: "阅读习惯" })
    .getByRole("button", { name: "阅读习惯", exact: true });
  const closing = await captureSettingsMotion(page, () => dialogTrigger.click({ force: true }));
  expect(closing.sawDialog).toBe(true);
  expect(closing.animationNames.some((name) => name.includes("reading-settings-panel-out"))).toBe(true);
});
