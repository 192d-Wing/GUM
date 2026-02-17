// Copyright 2026 U.S. Federal Government (in countries where recognized)
// SPDX-License-Identifier: Apache-2.0

import { test, expect } from "@playwright/test";

// Tests for navigating into a deployment's detail view.
// Creates a deployment via the API, then navigates to it.

test.describe("Deployment Detail", () => {
  let deploymentId: string;

  test.beforeAll(async ({ request }) => {
    // Create a deployment via API for the detail tests
    const resp = await request.post("/api/v1/deployments", {
      data: {
        name: "e2e-detail-test",
        service_type: "crow_dns",
        endpoint_url: "http://localhost:7777",
      },
    });
    expect(resp.ok()).toBeTruthy();
    const body = await resp.json();
    deploymentId = body.id;
  });

  test.afterAll(async ({ request }) => {
    if (deploymentId) {
      await request.delete(`/api/v1/deployments/${deploymentId}`);
    }
  });

  test("can navigate from fleet overview to deployment detail", async ({
    page,
  }) => {
    await page.goto("/");

    // Wait for deployment card to appear
    await expect(page.getByText("e2e-detail-test")).toBeVisible();

    // Click the deployment link
    await page.getByText("e2e-detail-test").click();

    // Should navigate to the deployment detail page
    await expect(page).toHaveURL(new RegExp(`/deployments/${deploymentId}`));

    // Dashboard link in side nav should be active/visible
    await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible();
  });

  test("deployment side nav shows DNS sections", async ({ page }) => {
    await page.goto(`/deployments/${deploymentId}`);

    // DNS-specific nav items should be visible
    await expect(page.getByRole("link", { name: "Zones" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Firewall" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Analytics" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Health checks" })
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Users" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Configuration" })
    ).toBeVisible();
  });

  test("can navigate through deployment sub-pages", async ({ page }) => {
    await page.goto(`/deployments/${deploymentId}`);

    // Navigate to Zones
    await page.getByRole("link", { name: "Zones" }).click();
    await expect(page).toHaveURL(new RegExp(`/zones`));
    await expect(page.getByRole("heading", { name: "Zones" })).toBeVisible();

    // Navigate to Firewall
    await page.getByRole("link", { name: "Firewall" }).click();
    await expect(page).toHaveURL(new RegExp(`/firewall`));
    await expect(
      page.getByRole("heading", { name: "Firewall" })
    ).toBeVisible();

    // Navigate to Analytics
    await page.getByRole("link", { name: "Analytics" }).click();
    await expect(page).toHaveURL(new RegExp(`/analytics`));
    await expect(
      page.getByRole("heading", { name: "Analytics" })
    ).toBeVisible();
  });
});
