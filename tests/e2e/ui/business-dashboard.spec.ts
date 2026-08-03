import { test, expect, type Page, type Route } from "@playwright/test";

/**
 * Business dashboard widget-state regression suite.
 *
 * Each widget (4 KPI cards + 2 panels) must render three distinct states:
 * loading skeleton, empty-state copy, and an error message — driven purely by
 * the API responses, which we stub at the network layer.
 */

const API_GLOBS = {
  deployments: "**/cloud/deployments",
  subscription: "**/billing/subscriptions/me",
  invoices: "**/billing/invoices",
  leads: "**/crm/leads",
  broadcasts: "**/crm/whatsapp/broadcast",
} as const;

type Mode = "empty" | "populated" | "error" | "hang";

async function stub(page: Page, glob: string, mode: Mode, body: unknown) {
  await page.route(glob, async (route: Route) => {
    if (mode === "hang") {
      // Never resolve — keeps the widget in its loading state.
      await new Promise(() => {});
      return;
    }
    if (mode === "error") {
      await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "boom" }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  });
}

const POPULATED = {
  deployments: [
    { id: "d1", status: "RUNNING" },
    { id: "d2", status: "STOPPED" },
  ],
  subscription: { plan: { name: "Business", priceUSD: 79 } },
  invoices: [
    { id: "i1", number: "INV-001", amountUSD: 79, status: "PAID", createdAt: new Date().toISOString() },
  ],
  leads: [{ id: "l1", status: "OPEN" }, { id: "l2", status: "WON" }],
  broadcasts: [{ id: "b1", sentCount: 10, deliveredCount: 9, failedCount: 1 }],
};

const EMPTY = {
  deployments: [],
  subscription: null,
  invoices: [],
  leads: [],
  broadcasts: [],
};

async function openDashboard(page: Page, modes: Partial<Record<keyof typeof API_GLOBS, Mode>>, bodies: Record<string, unknown>) {
  await page.addInitScript(() => {
    window.localStorage.setItem("voidcloud_token", "e2e-test-token");
  });
  for (const key of Object.keys(API_GLOBS) as (keyof typeof API_GLOBS)[]) {
    await stub(page, API_GLOBS[key], modes[key] ?? "populated", bodies[key]);
  }
  await page.goto("/voidcloud/business/dashboard", { waitUntil: "domcontentloaded" });
}

const KPIS = [
  "kpi-active-vps-instances",
  "kpi-monthly-recurring-revenue",
  "kpi-open-crm-leads",
  "kpi-whatsapp-threads",
];
const PANELS = ["panel-invoices", "panel-vps-breakdown"];

test.describe("business dashboard — loading state", () => {
  test("every widget shows a skeleton while its API is pending", async ({ page }) => {
    await openDashboard(
      page,
      { deployments: "hang", subscription: "hang", invoices: "hang", leads: "hang", broadcasts: "hang" },
      POPULATED,
    );

    for (const id of KPIS) {
      await expect(page.getByTestId(id), `${id} should be loading`).toHaveAttribute("data-state", "loading");
    }
    for (const id of PANELS) {
      await expect(page.getByTestId(id)).toHaveAttribute("data-state", "loading");
    }
    await expect(page.getByTestId("kpi-skeleton").first()).toBeVisible();
    await expect(page.getByTestId("panel-skeleton").first()).toBeVisible();
  });
});

test.describe("business dashboard — empty state", () => {
  test.beforeEach(async ({ page }) => {
    await openDashboard(
      page,
      { deployments: "empty", subscription: "empty", invoices: "empty", leads: "empty", broadcasts: "empty" },
      EMPTY,
    );
  });

  test("each KPI card renders empty-state copy instead of a zero value", async ({ page }) => {
    const expected: Record<string, string> = {
      "kpi-active-vps-instances": "No VPS instances yet",
      "kpi-monthly-recurring-revenue": "No active subscription",
      "kpi-open-crm-leads": "No leads captured yet",
      "kpi-whatsapp-threads": "No broadcasts sent yet",
    };
    for (const [id, copy] of Object.entries(expected)) {
      const card = page.getByTestId(id);
      await expect(card).toHaveAttribute("data-state", "empty");
      await expect(card).toContainText(copy);
    }
  });

  test("each panel renders guidance copy when there is no data", async ({ page }) => {
    await expect(page.getByTestId("panel-invoices")).toHaveAttribute("data-state", "empty");
    await expect(page.getByTestId("panel-invoices")).toContainText("No invoices yet");
    await expect(page.getByTestId("panel-vps-breakdown")).toHaveAttribute("data-state", "empty");
    await expect(page.getByTestId("panel-vps-breakdown")).toContainText("No VPS instances yet");
  });

  test("no global error banner is shown when the APIs simply return nothing", async ({ page }) => {
    await expect(page.getByTestId("panel-invoices")).toHaveAttribute("data-state", "empty");
    await expect(page.getByTestId("dashboard-error-banner")).toHaveCount(0);
  });
});

test.describe("business dashboard — error state", () => {
  test("every widget degrades to an error message and the banner appears", async ({ page }) => {
    await openDashboard(
      page,
      { deployments: "error", subscription: "error", invoices: "error", leads: "error", broadcasts: "error" },
      POPULATED,
    );

    for (const id of KPIS) {
      const card = page.getByTestId(id);
      await expect(card, `${id} should be in error state`).toHaveAttribute("data-state", "error");
      await expect(card).toContainText("Couldn't load this metric");
    }
    await expect(page.getByTestId("panel-invoices")).toContainText("Invoices are temporarily unavailable.");
    await expect(page.getByTestId("panel-vps-breakdown")).toContainText("VPS data is temporarily unavailable.");
    await expect(page.getByTestId("dashboard-error-banner")).toBeVisible();
  });

  test("a single failing widget does not break the others", async ({ page }) => {
    await openDashboard(page, { invoices: "error" }, POPULATED);

    await expect(page.getByTestId("panel-invoices")).toHaveAttribute("data-state", "error");
    await expect(page.getByTestId("kpi-active-vps-instances")).toHaveAttribute("data-state", "ready");
    await expect(page.getByTestId("kpi-active-vps-instances")).toContainText("1");
    await expect(page.getByTestId("panel-vps-breakdown")).toHaveAttribute("data-state", "ready");
  });

  test("Refresh re-runs every widget and recovers after the API comes back", async ({ page }) => {
    let failing = true;
    await page.addInitScript(() => {
      window.localStorage.setItem("voidcloud_token", "e2e-test-token");
    });
    for (const key of Object.keys(API_GLOBS) as (keyof typeof API_GLOBS)[]) {
      await page.route(API_GLOBS[key], async (route: Route) => {
        if (failing) {
          await route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
        } else {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify((POPULATED as Record<string, unknown>)[key]),
          });
        }
      });
    }
    await page.goto("/voidcloud/business/dashboard", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("dashboard-error-banner")).toBeVisible();

    failing = false;
    await page.getByRole("button", { name: "Refresh" }).click();

    await expect(page.getByTestId("kpi-active-vps-instances")).toHaveAttribute("data-state", "ready");
    await expect(page.getByTestId("panel-invoices")).toHaveAttribute("data-state", "ready");
    await expect(page.getByTestId("dashboard-error-banner")).toHaveCount(0);
  });
});
