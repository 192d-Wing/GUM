import { test, expect } from "@playwright/test";

// Tests for deployment CRUD via the Settings page.
// The backend uses stub auth (OIDC disabled) and a fresh SQLite DB.

test.describe("Deployment CRUD", () => {
  // Clean up any leftover deployments from prior runs
  test.beforeAll(async ({ request }) => {
    const resp = await request.get("/api/v1/deployments");
    if (resp.ok()) {
      const deployments = await resp.json();
      for (const d of deployments) {
        await request.delete(`/api/v1/deployments/${d.id}`);
      }
    }
  });

  test.beforeEach(async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: /Settings/ })).toBeVisible();
  });

  test("shows empty table when no deployments", async ({ page }) => {
    await expect(page.getByText("No deployments registered")).toBeVisible();
  });

  test("can create a new Crow DNS deployment", async ({ page }) => {
    // Open the add modal
    await page.getByRole("button", { name: "Add deployment" }).click();

    // Fill the form
    await page.getByLabel("Name").fill("e2e-dns-test");
    // Service type defaults to Crow DNS
    await page.getByLabel("Endpoint URL").fill("http://localhost:9999");

    // Submit
    await page.getByRole("button", { name: "Add", exact: true }).click();

    // Wait for modal to close and verify deployment appears in the table
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(
      page.getByText("e2e-dns-test", { exact: true })
    ).toBeVisible();
    await expect(page.getByText("http://localhost:9999")).toBeVisible();
  });

  test("can create and then delete a deployment", async ({ page }) => {
    // Create
    await page.getByRole("button", { name: "Add deployment" }).click();
    await page.getByLabel("Name").fill("e2e-to-delete");
    await page.getByLabel("Endpoint URL").fill("http://localhost:8888");
    await page.getByRole("button", { name: "Add", exact: true }).click();

    // Wait for modal to close
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(
      page.getByText("e2e-to-delete", { exact: true })
    ).toBeVisible();

    // Select the row (click the radio in the matching row)
    await page
      .locator("tr")
      .filter({ hasText: "e2e-to-delete" })
      .getByRole("radio")
      .click();

    // Delete
    await page.getByRole("button", { name: "Remove" }).click();

    // Verify it's gone
    await expect(
      page.getByText("e2e-to-delete", { exact: true })
    ).not.toBeVisible();
  });

  test("validates required fields", async ({ page }) => {
    await page.getByRole("button", { name: "Add deployment" }).click();

    // Submit button should be disabled when fields are empty
    await expect(
      page.getByRole("button", { name: "Add", exact: true })
    ).toBeDisabled();
  });
});
