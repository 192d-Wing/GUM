// Copyright 2026 U.S. Federal Government (in countries where recognized)
// SPDX-License-Identifier: Apache-2.0

import { test, expect } from "@playwright/test";

// The backend runs in stub auth mode (OIDC disabled), so all requests
// are automatically authenticated as an admin user.

test.describe("Fleet Overview", () => {
  // Clean up any leftover deployments from other spec files so the
  // empty-state test is reliable.
  test.beforeAll(async ({ request }) => {
    const resp = await request.get("/api/v1/deployments");
    if (resp.ok()) {
      const deployments = await resp.json();
      for (const d of deployments) {
        await request.delete(`/api/v1/deployments/${d.id}`);
      }
    }
  });

  test("shows fleet overview heading and health cards", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Fleet overview" })
    ).toBeVisible();

    // Health summary cards
    await expect(page.getByRole("heading", { name: "Total" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Healthy", exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Degraded" })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Unhealthy" })
    ).toBeVisible();
  });

  test("shows empty state when no deployments exist", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByText("No deployments registered yet.")
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Add a deployment" })
    ).toBeVisible();
  });

  test("top nav shows GUM branding and user menu", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "GUM" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Admin User" })
    ).toBeVisible();
  });
});

test.describe("Side Navigation", () => {
  test("fleet-level nav links work", async ({ page }) => {
    await page.goto("/");

    // Navigate to fleet analytics
    await page.getByRole("link", { name: "Fleet analytics" }).click();
    await expect(page).toHaveURL(/fleet-analytics/);
    await expect(
      page.getByRole("heading", { name: "Fleet analytics" })
    ).toBeVisible();

    // Navigate to settings
    await page.getByRole("link", { name: "Settings" }).click();
    await expect(page).toHaveURL(/settings/);
    await expect(page.getByRole("heading", { name: /Settings/ })).toBeVisible();

    // Navigate back to fleet overview
    await page.getByRole("link", { name: "Fleet overview" }).click();
    await expect(page).toHaveURL("/");
  });
});
