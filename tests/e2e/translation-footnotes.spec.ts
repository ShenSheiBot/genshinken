import { expect, test } from "@playwright/test";

const EDITIONS = [
  {
    language: "English",
    path: "/en/books/monogatari-series-essays/chapters/kaiki-speech-fracture-self-deception",
    dialog: "Notes",
    close: "Close",
    origin: "In the text",
    noteText: "Jacques Lacan",
  },
  {
    language: "Japanese",
    path: "/ja/books/monogatari-series-ronko/chapters/kaiki-gensetsu-hasai-jiko-giman",
    dialog: "注",
    close: "閉じる",
    origin: "本文位置",
    noteText: "千石撫子",
  },
] as const;

for (const edition of EDITIONS) test(`${edition.language} footnotes open beside the text without losing the reading position`, async ({ page }) => {
  test.skip(!process.env.ROOF_TRANSLATION_PREVIEW, "review editions require the translation preview build");

  await page.goto(edition.path);
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator(".reading-edition-body")).toBeAttached();
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

  const compact = await page.evaluate(() => !window.matchMedia("(min-width: 1024px)").matches);
  if (compact) {
    const dialog = page.getByRole("dialog", { name: edition.dialog });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(edition.noteText);
    await dialog.getByRole("button", { name: edition.close }).click();
    await expect(reference).toBeFocused();
  } else {
    const desk = page.locator("#reading-right-rail > div");
    const rail = page.locator("#reading-right-rail");
    const body = page.locator(".reading-edition-body");
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

  if (compact) {
    await reference.click();
    const dialog = page.getByRole("dialog", { name: edition.dialog });
    await dialog.getByRole("button", { name: edition.origin }).click();
    await expect(dialog).toBeHidden();
    await expect(reference).toBeFocused();
    await expect(reference).toBeInViewport();
    await expect(page).not.toHaveURL(/#user-content-fn-/u);
  }
});

test("localized appendices show only the outer notes heading", async ({ page }) => {
  const slug = "nausicaa-wily-beast-entrusting-world-to-idol";
  for (const path of [`/posts/${slug}`, `/en/posts/${slug}`, `/ja/posts/${slug}`]) {
    await page.goto(path);
    const appendix = page.locator(".reading-edition-appendix").first();
    await expect(appendix.locator(":scope > details > summary span")).toBeVisible();
    await expect(appendix.locator(".footnotes > h2")).toBeHidden();
  }
});

test("localized credit marks do not inherit Chinese role stamps", async ({ isMobile, page }) => {
  test.skip(isMobile, "the compact reader does not render the desktop credit rail");

  const slug = "nausicaa-wily-beast-entrusting-world-to-idol";
  const editions = [
    { path: `/en/posts/${slug}`, authorLabel: "Author", authorMark: "A", translatorLabel: "Translation", translatorMark: "T" },
    { path: `/ja/posts/${slug}`, authorLabel: "著者", authorMark: "著", translatorLabel: "翻訳", translatorMark: "訳" },
  ];

  for (const edition of editions) {
    await page.goto(edition.path);
    await expect(page.locator(`[role="img"][aria-label="${edition.authorLabel}"]`).first()).toHaveText(edition.authorMark);
    await expect(page.locator(`[role="img"][aria-label="${edition.translatorLabel}"]`).first()).toHaveText(edition.translatorMark);
  }
});

for (const edition of EDITIONS) test(`${edition.language} tablet layout keeps the shared single-column reader and footnote sheet`, async ({ page }) => {
  test.skip(!process.env.ROOF_TRANSLATION_PREVIEW, "review editions require the translation preview build");

  await page.setViewportSize({ width: 900, height: 1180 });
  await page.goto(edition.path);
  await page.evaluate(() => document.fonts.ready);

  await expect(page.locator("#reading-left-rail")).toBeHidden();
  await expect(page.locator("#reading-right-rail")).toBeHidden();
  await expect(page.locator(".reading-edition-body")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);

  const reference = page.locator("a[data-footnote-ref]").first();
  await reference.scrollIntoViewIfNeeded();
  await reference.click();
  const dialog = page.getByRole("dialog", { name: edition.dialog });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(edition.noteText);
});

for (const edition of EDITIONS) test(`${edition.language} appendix backrefs return to the stable reading line`, async ({ page }) => {
  test.skip(!process.env.ROOF_TRANSLATION_PREVIEW, "review editions require the translation preview build");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(edition.path);
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator(".reading-edition-body")).toBeAttached();

  const backref = page.locator(".reading-edition-appendix a[data-footnote-backref]").first();
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

  await page.goto("/en/posts/adventures-of-the-name-of-the-father");
  await expect(page.locator("#reading-right-rail")).toHaveCount(0);
  await expect(page.locator(".reading-edition-body")).toBeVisible();
});

test("localized contents and figure tabs size to their labels without overlap", async ({ page }) => {
  test.skip(!process.env.ROOF_TRANSLATION_PREVIEW, "review editions require the translation preview build");

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/en/posts/nausicaa-wily-beast-entrusting-world-to-idol");
  await page.evaluate(() => document.fonts.ready);

  const tabs = page.locator('#reading-left-rail [role="tab"]');
  await expect(tabs).toHaveCount(2);
  await expect(tabs.nth(0)).toHaveText("Contents");
  await expect(tabs.nth(1)).toHaveText("Figures");
  const boxes = await tabs.evaluateAll((elements) => elements.map((element) => {
    const box = element.getBoundingClientRect();
    return { left: box.left, right: box.right, clientWidth: element.clientWidth, scrollWidth: element.scrollWidth };
  }));
  expect(boxes[0].right).toBeLessThan(boxes[1].left);
  expect(boxes.every((box) => box.scrollWidth <= box.clientWidth)).toBe(true);

  await tabs.nth(1).click();
  await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#reading-index-figures")).toBeVisible();
});

test("edition switches use the shared reading transition without trapping the current edition", async ({ page }) => {
  await page.goto("/ja/posts/what-is-cloud-behavior-ontology-internal-heterogeneity");

  const current = page.locator('a[aria-current="page"]');
  await expect(current).not.toHaveAttribute("data-reading-edition-switch", "");
  await current.click();
  await expect(page.locator("html")).not.toHaveAttribute("data-reading-chrome-exit", "route");

  const english = page.locator('a[data-reading-edition-switch][href^="/en/"]');
  await english.click({ noWaitAfter: true });
  await expect(page.locator("html")).toHaveAttribute("data-reading-chrome-exit", "route");
  const entrySeen = expect(page.locator("html")).toHaveAttribute("data-reading-chrome-entry", "route", { timeout: 10_000 });
  await page.waitForURL(/\/en\/posts\/what-is-cloud-behavior-ontology-internal-heterogeneity$/u);
  await entrySeen;
  await expect(page.locator(".reading-edition-page")).toHaveAttribute("lang", "en");
});

test("edition switches preserve the shared transition across localized and Chinese root layouts", async ({ page }) => {
  const slug = "what-is-cloud-behavior-ontology-internal-heterogeneity";
  await page.goto(`/ja/posts/${slug}`);

  await page.locator(`a[data-reading-edition-switch][href="/posts/${slug}"]`).click({ noWaitAfter: true });
  await expect(page.locator("html")).toHaveAttribute("data-reading-chrome-exit", "route");
  const chineseEntrySeen = expect(page.locator("html")).toHaveAttribute("data-reading-chrome-entry", "route", { timeout: 10_000 });
  await page.waitForURL((url) => url.pathname === `/posts/${slug}`);
  await chineseEntrySeen;

  await page.locator(`a[data-reading-edition-switch][href="/ja/posts/${slug}"]`).click({ noWaitAfter: true });
  await expect(page.locator("html")).toHaveAttribute("data-reading-chrome-exit", "route");
  const japaneseEntrySeen = expect(page.locator("html")).toHaveAttribute("data-reading-chrome-entry", "route", { timeout: 10_000 });
  await page.waitForURL((url) => url.pathname === `/ja/posts/${slug}`);
  await japaneseEntrySeen;
});

test("edition switching still navigates when session storage rejects the optional entry intent", async ({ page }) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function setItem(key, value) {
      if (key === "roof_reading_entry_intent") throw new DOMException("blocked", "SecurityError");
      return original.call(this, key, value);
    };
  });
  await page.goto("/ja/posts/what-is-cloud-behavior-ontology-internal-heterogeneity");
  await page.locator('a[data-reading-edition-switch][href^="/en/"]').click({ noWaitAfter: true });
  await page.waitForURL(/\/en\/posts\/what-is-cloud-behavior-ontology-internal-heterogeneity$/u);
  await expect(page.locator(".reading-edition-page")).toHaveAttribute("lang", "en");
});
