import { expect, test } from "./fixtures";

type ThemeSurfaceSample = {
  background: string;
  header: string;
  recommendation: string;
};

function rgbChannels(color: string) {
  const channels = color.match(/[\d.]+/g)?.slice(0, 3).map(Number);
  if (!channels || channels.length !== 3) {
    throw new Error(`Expected an RGB color, received: ${color}`);
  }
  return channels;
}

function largestChannelGap(sample: ThemeSurfaceSample) {
  const surfaces = [sample.background, sample.header, sample.recommendation].map(rgbChannels);
  return Math.max(
    ...[0, 1, 2].map((channel) => {
      const values = surfaces.map((surface) => surface[channel]);
      return Math.max(...values) - Math.min(...values);
    })
  );
}

test("homepage background, header, and recommendation change theme in lockstep", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "no-preference" });
  await page.goto("/");

  const themeButton = page.getByRole("button", {
    name: "切换明暗主题",
    exact: true,
  });
  const recommendation = page.locator("main article [data-card-surface]");
  await expect(themeButton).toHaveCount(1);
  await expect(recommendation).not.toHaveCount(0);

  const sampleTransition = async () => {
    const samplePromise = page.evaluate(() =>
      new Promise<ThemeSurfaceSample[]>((resolve, reject) => {
        const header = document.querySelector<HTMLElement>("header.topbar");
        const background = document.querySelector<HTMLElement>("main");
        const leadRecommendation = document.querySelector<HTMLElement>(
          "main article [data-card-surface]"
        );
        if (!background || !header || !leadRecommendation) {
          reject(new Error("Homepage theme surfaces are missing"));
          return;
        }

        const samples: ThemeSurfaceSample[] = [];
        const timeout = window.setTimeout(() => {
          reject(new Error("Theme mutation was not observed"));
        }, 2_000);
        const observer = new MutationObserver(() => {
          observer.disconnect();
          let frame = 0;
          const sampleFrame = () => {
            samples.push({
              background: getComputedStyle(background).backgroundColor,
              header: getComputedStyle(header).backgroundColor,
              recommendation: getComputedStyle(leadRecommendation).backgroundColor,
            });
            frame += 1;
            if (frame >= 8) {
              window.clearTimeout(timeout);
              resolve(samples);
              return;
            }
            window.requestAnimationFrame(sampleFrame);
          };
          window.requestAnimationFrame(sampleFrame);
        });

        observer.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ["data-theme"],
        });
      })
    );

    await themeButton.click();
    return samplePromise;
  };

  for (const direction of ["light to dark", "dark to light"]) {
    const samples = await sampleTransition();
    const channelGaps = samples.map(largestChannelGap);

    expect(
      Math.max(...channelGaps),
      `${direction} theme surfaces diverged: ${JSON.stringify(samples)}`
    ).toBeLessThanOrEqual(3);
  }
});
