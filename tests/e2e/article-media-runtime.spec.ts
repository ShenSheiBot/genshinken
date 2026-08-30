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

test("starting another native article player pauses the previous one", async ({ page }) => {
  const response = await page.goto("/posts/japan-00s-anime-criticism-podcast");
  expect(response?.ok()).toBe(true);
  await expect(page.locator("[data-audio-transport]")).toBeVisible();

  const pauseCalls = await page.evaluate(async () => {
    const article = document.querySelector("article");
    if (!article) throw new Error("article not found");
    const players = ["first", "second"].map((id) => {
      const audio = document.createElement("audio");
      audio.id = id;
      audio.className = "article-audio-native";
      audio.dataset.roofAudio = "r2";
      audio.dataset.pauseCalls = "0";
      audio.pause = () => {
        audio.dataset.pauseCalls = String(Number(audio.dataset.pauseCalls) + 1);
      };
      article.append(audio);
      return audio;
    });
    players[0].dispatchEvent(new Event("play"));
    players[1].dispatchEvent(new Event("play"));
    await new Promise((resolve) => setTimeout(resolve, 0));
    return players.map((audio) => Number(audio.dataset.pauseCalls));
  });

  expect(pauseCalls[0]).toBeGreaterThan(0);
});

test("activating another NetEase player resets only the previous iframe", async ({ page }) => {
  await page.route("https://music.163.com/outchain/player?**", async (route) => {
    await route.fulfill({ contentType: "text/html", body: "<!doctype html><button>play</button>" });
  });
  const response = await page.goto("/posts/sekaikei-syndrome-music-interview");
  expect(response?.ok()).toBe(true);

  const players = page.locator("iframe.article-music-iframe");
  await expect.poll(() => players.count()).toBeGreaterThan(1);
  const first = players.nth(0);
  const second = players.nth(1);
  await first.evaluate((iframe) => {
    iframe.dataset.srcMutations = "0";
    new MutationObserver(() => {
      iframe.dataset.srcMutations = String(Number(iframe.dataset.srcMutations) + 1);
    }).observe(iframe, { attributes: true, attributeFilter: ["src"] });
  });
  await second.evaluate((iframe) => {
    iframe.dataset.srcMutations = "0";
    new MutationObserver(() => {
      iframe.dataset.srcMutations = String(Number(iframe.dataset.srcMutations) + 1);
    }).observe(iframe, { attributes: true, attributeFilter: ["src"] });
  });

  await first.focus();
  await page.waitForTimeout(150);
  await second.focus();
  await expect.poll(() => first.getAttribute("data-src-mutations")).toBe("1");
  await expect(second).toHaveAttribute("data-src-mutations", "0");
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
