import { expect, test } from "./fixtures";

test("the custom podcast controls remove the native fallback from interaction", async ({ page }) => {
  const response = await page.goto("/posts/japan-00s-anime-criticism-podcast");
  expect(response?.ok()).toBe(true);

  await expect(page.locator("[data-audio-transport]")).toBeVisible();
  const native = page.locator("audio.article-audio-native");
  await expect(native).toHaveAttribute("aria-hidden", "true");
  await expect(native).toHaveAttribute("inert", "");
  await expect(native).toHaveAttribute("tabindex", "-1");
  await expect(native).toBeHidden();
  expect(await native.evaluate((audio) => (audio as HTMLAudioElement).controls)).toBe(false);

  await expect(page.locator(".article-audio-play")).toBeVisible();
  await expect(page.locator(".article-audio-progress")).toBeVisible();
  await expect(page.locator(".article-audio-speed select")).toBeVisible();
});

test("a failed video quality switch restores the last working source", async ({ page }) => {
  const response = await page.goto("/posts/from-reproduction-to-simulacra-modern-turn-in-cultural-consumption");
  expect(response?.ok()).toBe(true);

  const select = page.locator(".article-video-quality select");
  const video = page.locator("video.article-video-player");
  await expect(select).toBeVisible();
  const options = await select.locator("option").evaluateAll((items) =>
    items.map((item) => ({ label: item.textContent ?? "", value: (item as HTMLOptionElement).value }))
  );
  expect(options.length).toBeGreaterThan(1);
  const previous = options[0];
  const failing = options.at(-1)!;

  await page.evaluate((failingSource) => {
    HTMLMediaElement.prototype.load = function load() {
      const event = this.src === failingSource ? "error" : "loadedmetadata";
      queueMicrotask(() => this.dispatchEvent(new Event(event)));
    };
  }, failing.value);

  await select.selectOption(failing.value);
  await expect(select).toHaveValue(previous.value);
  await expect(select).toBeEnabled();
  await expect(video).toHaveAttribute("src", previous.value);
  await expect(video).toHaveAttribute("data-roof-video-quality", previous.label);
  expect(await video.evaluate((element) => (element as HTMLVideoElement).currentSrc)).toBe(previous.value);
});
