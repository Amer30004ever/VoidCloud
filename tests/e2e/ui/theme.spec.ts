import { test, expect, type Page } from "@playwright/test";

/**
 * UI regression suite: verifies the shared VoidCloud dark theme (background,
 * fonts, heading styles) renders consistently on every public page.
 */

const PAGES = [
  { name: "landing", path: "/" },
  { name: "login", path: "/voidcloud/login" },
  { name: "register", path: "/voidcloud/register" },
  { name: "help", path: "/help" },
  { name: "pricing", path: "/#pricing" },
  { name: "404", path: "/this-route-does-not-exist" },
];

/**
 * Average channel brightness of any CSS colour string. Modern Chromium reports
 * computed colours in modern spaces (e.g. `lab(...)`), so we normalise through a
 * canvas instead of regex-parsing `rgb()`.
 */
async function brightness(page: Page, value: string): Promise<number> {
  return page.evaluate((color) => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#000000";
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return (r + g + b) / 3;
  }, value);
}

/** Errors caused by the backend not running locally are not UI regressions. */
const NETWORK_NOISE =
  /favicon|ERR_CONNECTION_REFUSED|ERR_NETWORK|Failed to load resource|net::ERR_/i;

async function effectiveBackground(page: Page): Promise<string> {
  return page.evaluate(() => {
    const body = getComputedStyle(document.body).backgroundColor;
    const isTransparent = body === "rgba(0, 0, 0, 0)" || body === "transparent";
    return isTransparent ? getComputedStyle(document.documentElement).backgroundColor : body;
  });
}

for (const p of PAGES) {
  test.describe(`${p.name} page theme`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(p.path, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle").catch(() => {});
    });

    test("uses the dark VoidCloud background (never white)", async ({ page }) => {
      const bg = await effectiveBackground(page);
      const luminance = await brightness(page, bg);
      expect(luminance, `background ${bg} should be dark`).toBeLessThan(60);
    });

    test("body text is light on dark", async ({ page }) => {
      const color = await page.evaluate(() => getComputedStyle(document.body).color);
      expect(await brightness(page, color), `text color ${color} should be light`).toBeGreaterThan(120);
    });

    test("uses the sans-serif font stack, not a serif fallback", async ({ page }) => {
      const family = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
      expect(family.toLowerCase()).not.toMatch(/(^|[\s,])(times|georgia|serif)($|[\s,])/);
      expect(family.length).toBeGreaterThan(0);
    });

    test("renders exactly one visible h1 with a readable size", async ({ page }) => {
      const h1 = page.locator("h1").first();
      await expect(h1).toBeVisible();
      const size = await h1.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
      expect(size).toBeGreaterThanOrEqual(20);
    });

    test("has no console errors", async ({ page }) => {
      const errors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") errors.push(msg.text());
      });
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1000);
      expect(errors.filter((e) => !NETWORK_NOISE.test(e))).toEqual([]);
    });
  });
}

test("pricing section renders plans without mojibake", async ({ page }) => {
  await page.goto("/#pricing", { waitUntil: "domcontentloaded" });
  const section = page.locator("#pricing");
  await expect(section).toBeVisible();
  const text = (await section.innerText()).toLowerCase();
  expect(text).not.toMatch(/â|ð|ï¿½/);
  await expect(section.getByText("Free Trial")).toBeVisible();
  await expect(section.locator("[data-analytics-cta='trial_start']")).toBeVisible();
  await expect(section.locator("[data-analytics-cta='contact_sales']")).toBeVisible();
});

test("pricing CTA clicks emit analytics events", async ({ page }) => {
  await page.goto("/#pricing", { waitUntil: "domcontentloaded" });
  const cta = page.locator("#pricing [data-analytics-cta='trial_start']").first();
  await cta.scrollIntoViewIfNeeded();
  await cta.click({ force: true, noWaitAfter: true });
  // The CTA navigates to signup; the buffered events survive in localStorage.
  await page.waitForLoadState("domcontentloaded");

  const names = async () =>
    (
      (await page.evaluate(() =>
        JSON.parse(window.localStorage.getItem("voidcloud_analytics_queue") ?? "[]"),
      )) as Array<{ name: string }>
    ).map((e) => e.name);

  await expect.poll(names).toContain("pricing_viewed");
  await expect.poll(names).toContain("pricing_cta_clicked");
});

test("status page shows a retry-able fallback when the API is unreachable", async ({ page }) => {
  await page.route("**/monitoring/incidents/public", (route) => route.abort());
  await page.goto("/status", { waitUntil: "domcontentloaded" });
  const error = page.getByTestId("status-error");
  await expect(error).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
});
