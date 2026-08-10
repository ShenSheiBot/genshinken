import { test as base } from "@playwright/test";

export { expect, type Page } from "@playwright/test";

const UPGRADED_LOCAL_ORIGIN = "https://127.0.0.1:3100/**";

// 导航会取消仍在飞的请求（点 facet 后紧接着硬加载、章节间跳转等），Playwright
// 随即自己接管那条 route——此时桥接里的 fetch/fulfill 抛的是竞态噪声，不是被测
// 契约的失败。只吞这几种签名，其余照抛，免得真正的桥接故障被静默。
const NAVIGATION_RACE =
  /Route is already handled|Request (?:was )?aborted|frame was detached|Target (?:page|closed)|(?:context|browser) (?:has been |was )?closed/i;

export const test = base.extend<{ localWebKitCspBridge: void }>({
  localWebKitCspBridge: [
    async ({ browserName, context }, use) => {
      if (browserName === "webkit") {
        await context.route(UPGRADED_LOCAL_ORIGIN, async (route) => {
          try {
            const response = await route.fetch({
              url: route.request().url().replace(/^https:/, "http:"),
            });
            await route.fulfill({ response });
          } catch (error) {
            if (!NAVIGATION_RACE.test(String(error))) throw error;
          }
        });
      }

      try {
        await use();
      } finally {
        if (browserName === "webkit") {
          await context.unrouteAll({ behavior: "wait" });
        }
      }
    },
    { auto: true },
  ],
});
