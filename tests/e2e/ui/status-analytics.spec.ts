import { test, expect, type Page } from "@playwright/test";

/**
 * Reliability funnel: the /status page must emit an outcome event on every
 * load attempt (reachable or not) and a retry event when the user clicks Retry.
 * Events are read back from the analytics localStorage buffer.
 */

const QUEUE_KEY = "voidcloud_analytics_queue";

async function events(page: Page) {
  return page.evaluate((key) => {
    try {
      return JSON.parse(window.localStorage.getItem(key) ?? "[]") as Array<{
        name: string;
        props?: Record<string, unknown>;
      }>;
    } catch {
      return [];
    }
  }, QUEUE_KEY);
}

test.describe("/status analytics", () => {
  test("emits an unreachable outcome and a retry event when the API is down", async ({ page }) => {
    await page.route("**/monitoring/**", (route) => route.abort());
    await page.goto("/status", { waitUntil: "domcontentloaded" });

    await expect(page.getByTestId("status-error")).toBeVisible();
    await expect
      .poll(async () => (await events(page)).filter((e) => e.name === "status_api_outcome").length)
      .toBeGreaterThan(0);

    const first = (await events(page)).find((e) => e.name === "status_api_outcome");
    expect(first?.props?.outcome).toBe("unreachable");
    expect(first?.props?.trigger).toBe("initial");

    await page.getByTestId("status-retry").click();

    await expect
      .poll(async () => (await events(page)).filter((e) => e.name === "status_retry_clicked").length)
      .toBe(1);
    await expect
      .poll(async () => (await events(page)).filter((e) => e.name === "status_api_outcome").length)
      .toBe(2);

    const retryOutcome = (await events(page)).filter((e) => e.name === "status_api_outcome")[1];
    expect(retryOutcome?.props?.trigger).toBe("retry");
    expect(retryOutcome?.props?.attempt).toBe(2);
  });

  test("emits a reachable outcome and renders per-service readiness", async ({ page }) => {
    await page.route("**/monitoring/incidents/public", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ overall: "OPERATIONAL", incidents: [] }),
      }),
    );
    await page.route("**/monitoring/status/services", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          overall: "DEGRADED",
          healthPercent: 92,
          checkedAt: new Date().toISOString(),
          components: [
            { key: "auth", label: "Authentication", status: "UP", responseTimeMs: 42, lastChecked: new Date().toISOString() },
            { key: "billing", label: "Billing & payments", status: "DEGRADED", responseTimeMs: 1300, lastChecked: new Date().toISOString() },
          ],
        }),
      }),
    );

    await page.goto("/status", { waitUntil: "domcontentloaded" });

    await expect(page.getByTestId("status-component-auth")).toContainText("Authentication");
    await expect(page.getByTestId("status-component-billing")).toContainText("DEGRADED");
    await expect(page.getByTestId("status-error")).toHaveCount(0);

    const outcome = (await events(page)).find((e) => e.name === "status_api_outcome");
    expect(outcome?.props?.outcome).toBe("reachable");
    expect(outcome?.props?.services).toBe(true);
    expect(outcome?.props?.overall).toBe("DEGRADED");
  });

  test("still reports reachable when only the incidents feed responds", async ({ page }) => {
    await page.route("**/monitoring/incidents/public", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ overall: "OPERATIONAL", incidents: [] }),
      }),
    );
    await page.route("**/monitoring/status/services", (route) => route.abort());

    await page.goto("/status", { waitUntil: "domcontentloaded" });

    await expect(page.getByTestId("status-components")).toContainText(
      "Per-service readiness is temporarily unavailable.",
    );
    const outcome = (await events(page)).find((e) => e.name === "status_api_outcome");
    expect(outcome?.props?.outcome).toBe("reachable");
    expect(outcome?.props?.services).toBe(false);
  });
});
