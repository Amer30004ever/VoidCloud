import { test, expect, devices } from "@playwright/test";

/**
 * Mobile authenticated route regression (Prompt 5.13b follow-up).
 *
 * Verifies that login, OAuth buttons, and post-login routes are usable at
 * mobile widths (iPhone 12 Pro viewport). These run against the same stubbed
 * API layer as the desktop dashboard specs.
 */

test.describe("mobile — login page", () => {
  test.use({ ...devices["iPhone 12 Pro"] });

  test("renders the login form and all social providers", async ({ page }) => {
    await page.goto("/voidcloud/login", { waitUntil: "domcontentloaded" });

    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();

    await expect(page.getByRole("button", { name: "Google" })).toBeVisible();
    await expect(page.getByRole("button", { name: "GitHub" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Gitea" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Portainer" })).toBeVisible();
  });

  test("social buttons are tappable (no hover-only affordances)", async ({ page }) => {
    await page.goto("/voidcloud/login", { waitUntil: "domcontentloaded" });

    const buttons = [
      page.getByRole("button", { name: "Google" }),
      page.getByRole("button", { name: "GitHub" }),
      page.getByRole("button", { name: "Gitea" }),
      page.getByRole("button", { name: "Portainer" }),
    ];

    for (const btn of buttons) {
      await expect(btn).toBeVisible();
      await expect(btn).toBeEnabled();
      const box = await btn.boundingBox();
      expect(box?.width).toBeGreaterThan(40);
      expect(box?.height).toBeGreaterThan(40);
    }
  });
});

test.describe("mobile — authenticated routes", () => {
  test.use({ ...devices["iPhone 12 Pro"] });

  test("business dashboard loads on mobile after auth", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("voidcloud_token", "e2e-test-token");
    });
    await page.route("**/cloud/deployments", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
    });
    await page.route("**/billing/subscriptions/me", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(null) });
    });
    await page.route("**/billing/invoices", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
    });
    await page.route("**/crm/leads", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
    });
    await page.route("**/crm/whatsapp/broadcast", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
    });

    await page.goto("/voidcloud/business/dashboard", { waitUntil: "domcontentloaded" });

    await expect(page.getByTestId("kpi-active-vps-instances")).toHaveAttribute("data-state", "empty");
    await expect(page.getByTestId("panel-invoices")).toHaveAttribute("data-state", "empty");
  });

  test("user dashboard loads on mobile after auth", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("voidcloud_token", "e2e-test-token");
    });
    await page.route("**/vps/instances", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
    });

    await page.goto("/voidcloud/user/dashboard", { waitUntil: "domcontentloaded" });

    await expect(page.getByTestId("user-dashboard")).toBeVisible();
  });
});
