import { describe, it, expect } from "vitest";
import { matchesToken, matchesQuery } from "../filterUtils";
import type { Deployment } from "../../api/types";

const BASE_DEPLOYMENT: Deployment = {
  id: "d-1",
  name: "prod-dns-east",
  service_type: "crow_dns",
  endpoint_url: "http://localhost:9999",
  health_status: "healthy",
  last_seen: null,
  created_at: "2024-01-01T00:00:00Z",
  tags: { env: "production", region: "us-east" },
};

function token(value: string, propertyKey?: string, operator?: string) {
  return { value, propertyKey, operator } as Parameters<typeof matchesToken>[1];
}

describe("matchesToken", () => {
  it("free-text matches name case-insensitively", () => {
    expect(matchesToken(BASE_DEPLOYMENT, token("PROD-DNS"))).toBe(true);
  });

  it("free-text no match", () => {
    expect(matchesToken(BASE_DEPLOYMENT, token("ntp-server"))).toBe(false);
  });

  it("= operator on service_type", () => {
    expect(
      matchesToken(BASE_DEPLOYMENT, token("crow_dns", "service_type", "=")),
    ).toBe(true);
    expect(
      matchesToken(BASE_DEPLOYMENT, token("ntp", "service_type", "=")),
    ).toBe(false);
  });

  it("!= operator", () => {
    expect(
      matchesToken(BASE_DEPLOYMENT, token("ntp", "service_type", "!=")),
    ).toBe(true);
    expect(
      matchesToken(BASE_DEPLOYMENT, token("crow_dns", "service_type", "!=")),
    ).toBe(false);
  });

  it(": (contains) on name", () => {
    expect(matchesToken(BASE_DEPLOYMENT, token("dns", "name", ":"))).toBe(true);
    expect(matchesToken(BASE_DEPLOYMENT, token("ntp", "name", ":"))).toBe(
      false,
    );
  });

  it("!: (not contains)", () => {
    expect(matchesToken(BASE_DEPLOYMENT, token("ntp", "name", "!:"))).toBe(
      true,
    );
    expect(matchesToken(BASE_DEPLOYMENT, token("dns", "name", "!:"))).toBe(
      false,
    );
  });

  it("tag = filter", () => {
    expect(
      matchesToken(BASE_DEPLOYMENT, token("env=production", "tag", "=")),
    ).toBe(true);
    expect(
      matchesToken(BASE_DEPLOYMENT, token("env=staging", "tag", "=")),
    ).toBe(false);
  });

  it("tag !: filter", () => {
    expect(matchesToken(BASE_DEPLOYMENT, token("staging", "tag", "!:"))).toBe(
      true,
    );
    expect(
      matchesToken(BASE_DEPLOYMENT, token("production", "tag", "!:")),
    ).toBe(false);
  });
});

describe("matchesQuery", () => {
  it("empty tokens always matches", () => {
    expect(
      matchesQuery(BASE_DEPLOYMENT, { tokens: [], operation: "and" }),
    ).toBe(true);
  });

  it("AND requires all tokens to match", () => {
    expect(
      matchesQuery(BASE_DEPLOYMENT, {
        tokens: [
          token("crow_dns", "service_type", "="),
          token("healthy", "health_status", "="),
        ],
        operation: "and",
      }),
    ).toBe(true);

    expect(
      matchesQuery(BASE_DEPLOYMENT, {
        tokens: [
          token("crow_dns", "service_type", "="),
          token("unhealthy", "health_status", "="),
        ],
        operation: "and",
      }),
    ).toBe(false);
  });

  it("OR requires any token to match", () => {
    expect(
      matchesQuery(BASE_DEPLOYMENT, {
        tokens: [
          token("ntp", "service_type", "="),
          token("healthy", "health_status", "="),
        ],
        operation: "or",
      }),
    ).toBe(true);

    expect(
      matchesQuery(BASE_DEPLOYMENT, {
        tokens: [
          token("ntp", "service_type", "="),
          token("unhealthy", "health_status", "="),
        ],
        operation: "or",
      }),
    ).toBe(false);
  });
});
