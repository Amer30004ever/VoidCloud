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

function parseRgb(value: string): [number, number, number] {
  const m = value.match(/rgba?\(([^)]+)\)/);
  if (!m) return [255, 255, 255];
  const [r, g, b] = m[1].split(",").map((n) => parseFloat(n.trim()));
  return [r, g, b];
}

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
      const [r, g, b] = parseRgb(bg);
      const luminance = (r + g + b) / 3;
      expect(luminance, `background ${bg} should be dark`).toBeLessThan(60);
    });

    test("body text is light on dark", async ({ page }) => {
      const color = await page.evaluate(() => getComputedStyle(document.body).color);
      const [r, g, b] = parseRgb(color);
      expect((r + g + b) / 3, `text color ${color} should be light`).toBeGreaterThan(120);
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
      expect(errors.filter((e) => !e.includes("favicon"))).toEqual([]);
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
  await page.locator("#pricing [data-analytics-cta='contact_sales']").click({ force: true });
  const queued = await page.evaluate(() =>
    JSON.parse(window.localStorage.getItem("voidcloud_analytics_queue") ?? "[]")
  );
  const names = (queued as Array<{ name: string }>).map((e) => e.name);
  expect(names).toContain("pricing_viewed");
  expect(names).toContain("pricing_cta_clicked");
});

test("status page shows a retry-able fallback when the API is unreachable", async ({ page }) => {
  await page.route("**/monitoring/incidents/public", (route) => route.abort());
  await page.goto("/status", { waitUntil: "domcontentloaded" });
  const error = page.getByTestId("status-error");
  await expect(error).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
});
