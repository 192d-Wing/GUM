// Copyright 2026 U.S. Federal Government (in countries where recognized)
// SPDX-License-Identifier: Apache-2.0

import { test, expect, request as apiRequest } from "@playwright/test";

test.describe("API Documentation", () => {
  test("Swagger UI loads at /api/docs", async ({ page }) => {
    await page.goto("/api/docs");
    await expect(page.locator("#swagger-ui")).toBeVisible();
    await expect(page.getByText("GUM API")).toBeVisible();
  });

  test("OpenAPI spec is served as JSON", async ({ request }) => {
    const resp = await request.get("/api/docs/openapi.json");
    expect(resp.ok()).toBeTruthy();

    const spec = await resp.json();
    expect(spec.openapi).toBe("3.1.0");
    expect(spec.info.title).toBe("GUM API");
    expect(spec.paths["/api/v1/deployments"]).toBeDefined();
    expect(spec.components.schemas.Deployment).toBeDefined();
  });
});

test.describe("Health Endpoints", () => {
  // Health endpoints are served at /health/* which is not proxied by Vite,
  // so we hit the backend directly at port 4000.
  let backend: Awaited<ReturnType<typeof apiRequest.newContext>>;

  test.beforeAll(async () => {
    backend = await apiRequest.newContext({ baseURL: "http://localhost:4000" });
  });

  test.afterAll(async () => {
    await backend.dispose();
  });

  test("liveness probe returns alive", async () => {
    const resp = await backend.get("/health/live");
    expect(resp.ok()).toBeTruthy();
    const body = await resp.json();
    expect(body.alive).toBe(true);
  });

  test("readiness probe returns ready", async () => {
    const resp = await backend.get("/health/ready");
    expect(resp.ok()).toBeTruthy();
    const body = await resp.json();
    expect(body.ready).toBeDefined();
  });
});
