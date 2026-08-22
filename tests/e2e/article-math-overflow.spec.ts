import { expect, test } from "./fixtures";

for (const slug of [
  "sep-compositionality",
  "sep-rudolf-carnap-supplement-c-inductive-logic",
  "sep-rudolf-carnap-supplement-e-scientific-theory-reconstruction-part-3",
]) {
  test(`${slug} keeps long mathematics inside the reading viewport`, async ({ page }) => {
    const response = await page.goto(`/posts/${slug}`);
    expect(response?.ok()).toBe(true);

    await expect(page.locator(".art-body .katex").first()).toBeVisible();
    const viewport = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.clientWidth + 1);
  });
}

test("inline mathematics keeps KaTeX's native text baseline", async ({ page }) => {
  const response = await page.goto("/posts/sep-compositionality");
  expect(response?.ok()).toBe(true);

  const inlineMath = page.locator(".art-body p > .katex").first();
  await expect(inlineMath).toBeVisible();
  const style = await inlineMath.evaluate((element) => {
    const computed = getComputedStyle(element);
    const paragraph = element.closest("p");
    if (!paragraph) throw new Error("inline mathematics must remain inside prose");
    const paragraphStyle = getComputedStyle(paragraph);
    return {
      display: computed.display,
      overflowX: computed.overflowX,
      overflowY: computed.overflowY,
      verticalAlign: computed.verticalAlign,
      fontSizeRatio:
        Number.parseFloat(computed.fontSize) /
        Number.parseFloat(paragraphStyle.fontSize),
    };
  });

  expect(style).toMatchObject({
    display: "inline",
    overflowX: "visible",
    overflowY: "visible",
    verticalAlign: "baseline",
  });
  expect(style.fontSizeRatio).toBeGreaterThanOrEqual(0.98);
  expect(style.fontSizeRatio).toBeLessThanOrEqual(1.02);
});

test("the compositionality table of contents navigates to real section anchors", async ({ page }) => {
  const response = await page.goto("/posts/sep-compositionality");
  expect(response?.ok()).toBe(true);

  const contents = page.locator('h2[id="目录"] + ul');
  const firstSection = contents.locator('a[href="#1-clarifications"]');
  const nestedSection = contents.locator('a[href="#421-conditionals"]');
  const bibliography = contents.locator('a[href="https://plato.stanford.edu/entries/compositionality/#Bib"]');
  await expect(firstSection).toHaveText("1. Clarifications");
  await expect(nestedSection).toHaveText("4.2.1 Conditionals");
  await expect(bibliography).toHaveText("Bibliography（原词条）");
  await expect(page.locator('[id="1-clarifications"]')).toHaveCount(1);
  await expect(page.locator('[id="421-conditionals"]')).toHaveCount(1);
});
