import { test as base } from "@playwright/test";

export { expect, type Page } from "@playwright/test";

const UPGRADED_LOCAL_ORIGIN = "https://127.0.0.1:3100/**";

export const test = base.extend<{ localWebKitCspBridge: void }>({
  localWebKitCspBridge: [
    async ({ browserName, context }, use) => {
      if (browserName === "webkit") {
        await context.route(UPGRADED_LOCAL_ORIGIN, async (route) => {
          const response = await route.fetch({
            url: route.request().url().replace(/^https:/, "http:"),
          });
          await route.fulfill({ response });
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
