import { expect, test } from "@playwright/test";

const EDITIONS = [
  {
    language: "English",
    path: "/en/books/monogatari-series-essays/chapters/kaiki-speech-fracture-self-deception",
    dialog: "Notes",
    close: "Close notes",
    origin: "Return to text",
    noteText: "On Nadeko",
  },
  {
    language: "Japanese",
    path: "/ja/books/monogatari-series-ronko/chapters/kaiki-gensetsu-hasai-jiko-giman",
    dialog: "注",
    close: "注を閉じる",
    origin: "本文位置",
    noteText: "千石撫子",
  },
] as const;

for (const edition of EDITIONS) test(`${edition.language} footnotes open beside the text without losing the reading position`, async ({ isMobile, page }) => {
  test.skip(!process.env.ROOF_TRANSLATION_PREVIEW, "review editions require the translation preview build");

  await page.goto(edition.path);
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('[data-translation-references-ready="true"]')).toBeAttached();
  const reference = page.locator("a[data-footnote-ref]").first();
  await reference.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    const state = window as Window & { __translationFootnoteClickY?: number };
    document.addEventListener("pointerdown", () => {
      state.__translationFootnoteClickY = window.scrollY;
    }, { capture: true, once: true });
  });

  await reference.click();

  if (isMobile) {
    const dialog = page.getByRole("dialog", { name: edition.dialog });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(edition.noteText);
    await dialog.getByRole("button", { name: edition.close }).click();
    await expect(reference).toBeFocused();
  } else {
    const desk = page.locator("[data-translation-reference-desk]");
    const rail = page.locator("[data-translation-reference-rail]");
    const body = page.locator("[data-translation-body]");
    await expect(desk).toBeVisible();
    await expect(desk).toContainText(edition.noteText);
    const [railBox, bodyBox] = await Promise.all([rail.boundingBox(), body.boundingBox()]);
    expect(railBox).not.toBeNull();
    expect(bodyBox).not.toBeNull();
    expect(railBox!.x).toBeGreaterThan(bodyBox!.x + bodyBox!.width);
  }

  const { before, after } = await page.evaluate(() => ({
    before: (window as Window & { __translationFootnoteClickY?: number }).__translationFootnoteClickY ?? -1,
    after: window.scrollY,
  }));
  expect(before).toBeGreaterThanOrEqual(0);
  expect(Math.abs(after - before)).toBeLessThan(8);

  if (isMobile) {
    await reference.click();
    const dialog = page.getByRole("dialog", { name: edition.dialog });
    await dialog.getByRole("button", { name: edition.origin }).click();
    await expect(dialog).toBeHidden();
    await expect(reference).toBeFocused();
    await expect(reference).toBeInViewport();
    await expect(page).not.toHaveURL(/#user-content-fn-/u);
  }
});

for (const edition of EDITIONS) test(`${edition.language} appendix backrefs return to the stable reading line`, async ({ page }) => {
  test.skip(!process.env.ROOF_TRANSLATION_PREVIEW, "review editions require the translation preview build");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(edition.path);
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('[data-translation-references-ready="true"]')).toBeAttached();

  const backref = page.locator("[data-translation-appendices] a[data-footnote-backref]").first();
  const href = await backref.getAttribute("href");
  expect(href).toMatch(/^#/u);
  await backref.scrollIntoViewIfNeeded();
  await backref.click();

  const target = page.locator(href as string);
  await expect(target).toBeFocused();
  await expect(page).toHaveURL(new RegExp(`${href as string}$`, "u"));
  const position = await target.evaluate((element) => ({
    actual: element.getBoundingClientRect().top,
    expected: (document.documentElement.clientHeight || window.innerHeight) * 0.36,
  }));
  expect(Math.abs(position.actual - position.expected)).toBeLessThan(3);
});

test("translations without apparatus do not reserve an empty reference rail", async ({ isMobile, page }) => {
  test.skip(isMobile, "the compact layout has one column by design");
  test.skip(!process.env.ROOF_TRANSLATION_PREVIEW, "review editions require the translation preview build");

  await page.goto("/en/posts/fear-of-monsters-america-home-of-titans");
  await expect(page.locator("[data-translation-reference-rail]")).toHaveCount(0);
  const columns = await page.locator("section[class*='reading']").evaluate((element) =>
    getComputedStyle(element).gridTemplateColumns.split(" ").filter(Boolean)
  );
  expect(columns).toHaveLength(2);
});
