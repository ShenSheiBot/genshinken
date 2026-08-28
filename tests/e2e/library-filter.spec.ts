import { expect, test } from "./fixtures";

/**
 * /library 是整页静态预渲染的文档：`?tag=…` 等筛选由客户端按查询串应用
 * （data-lib-* 行属性 + 预过滤引导脚本 + LibraryClient）。本套件锁定这条
 * 契约——期望值全部从页面自身的行属性推导，不钉死具体内容。
 */

async function openFacetPanel(page: import("./fixtures").Page, number: string, isMobile: boolean) {
  const panel = page.locator(`[data-facet-number="${number}"]`);
  if (isMobile && !(await panel.getAttribute("open"))) {
    await panel.locator("summary").click();
  }
  return panel;
}

test("facet filtering stays client-applied on the prerendered document", async ({ isMobile, page }) => {
  await page.goto("/library");
  const rows = page.locator("li[data-lib-row]");
  const total = await rows.count();
  expect(total).toBeGreaterThan(0);

  // 从标签面板取第一个可用（非「全部」）的筛选链接，并按行属性推导期望命中数。
  const tagPanel = await openFacetPanel(page, "03", isMobile);
  const tagLink = tagPanel.locator('a[href*="/library?tag="]').first();
  const href = await tagLink.getAttribute("href");
  expect(href).toBeTruthy();
  const tag = new URL(href!, "https://placeholder.invalid").searchParams.get("tag")!;
  const expected = await rows.evaluateAll(
    (elements, needle) =>
      elements.filter((element) =>
        (element.getAttribute("data-lib-tags") ?? "").includes(`|${needle}|`)
      ).length,
    tag
  );
  expect(expected).toBeGreaterThan(0);

  // 点击 facet：URL 更新、行集收窄到期望数、计数标签同步。
  await tagLink.click();
  await expect(page).toHaveURL(/\/library\?tag=/);
  await expect(rows).toHaveCount(expected);
  await expect(
    page.getByLabel(`当前显示 ${expected} 项，共 ${total} 项`)
  ).toBeVisible();

  // 清除筛选恢复全量；等 URL 与网络都落定再做硬加载，别让上一次导航的
  // 在飞请求撞上下一次导航（WebKit 走 CSP 桥接，交叠时 route 会被接管）。
  await page.getByRole("link", { name: "清除全部" }).click();
  await expect(rows).toHaveCount(total);
  await expect(page).toHaveURL(/\/library$/);
  await page.waitForLoadState("networkidle");

  // 硬加载筛选地址：同一份静态文档 + canonical 恒为 /library，水合后行集收窄。
  await page.goto(href!);
  await expect(rows).toHaveCount(expected);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://roof-genshinken-a8f3d7c2.hiddengem.workers.dev/library"
  );
});

test("invalid facet values normalize client-side and keep valid facets", async ({ page }) => {
  await page.goto("/library?contributor=not-a-contributor&role=translator");
  // 旧实现是服务端 307；静态化后由客户端 router.replace 完成同一语义。
  // 规范化要等水合完成，低速引擎/高负载下给足预算。
  await expect(page).toHaveURL(/\/library\?role=translator$/, { timeout: 15_000 });
  await expect(page.locator("li[data-lib-row]").first()).toBeVisible();
});

test("the library document ships the pre-paint prefilter bootstrap", async ({ page }) => {
  const response = await page.goto("/library?tag=definitely-not-a-real-tag");
  expect(response?.status()).toBe(200);
  const html = await response!.text();
  expect(html).toContain('id="library-prefilter-script"');
  // 未知标签会被客户端规范化回 /library 并显示全量列表。
  await expect(page).toHaveURL(/\/library$/, { timeout: 15_000 });
  const rowCount = await page.locator("li[data-lib-row]").count();
  expect(rowCount).toBeGreaterThan(0);
});
