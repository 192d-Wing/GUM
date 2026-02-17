// Copyright 2026 U.S. Federal Government (in countries where recognized)
// SPDX-License-Identifier: Apache-2.0

import { renderHook } from "@testing-library/react";
import { useDeploymentApiPrefix, useDeploymentId } from "../useDeploymentApi";
import { DeploymentProvider } from "../../providers/DeploymentProvider";
import type { Deployment } from "../types";
import type { ReactNode } from "react";

const TEST_DEPLOYMENT: Deployment = {
  id: "dep-456",
  name: "test",
  service_type: "crow_dns",
  endpoint_url: "http://localhost:9999",
  health_status: "unknown",
  last_seen: null,
  created_at: "2024-01-01T00:00:00Z",
  tags: {},
};

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <DeploymentProvider initialDeployment={TEST_DEPLOYMENT}>
      {children}
    </DeploymentProvider>
  );
}

function EmptyWrapper({ children }: { children: ReactNode }) {
  return <DeploymentProvider>{children}</DeploymentProvider>;
}

describe("useDeploymentApi", () => {
  it("useDeploymentApiPrefix returns correct prefix", () => {
    const { result } = renderHook(() => useDeploymentApiPrefix(), {
      wrapper: Wrapper,
    });
    expect(result.current).toBe("/api/v1/deployments/dep-456/proxy");
  });

  it("useDeploymentApiPrefix throws with no deployment", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() =>
      renderHook(() => useDeploymentApiPrefix(), { wrapper: EmptyWrapper }),
    ).toThrow("No active deployment");
    spy.mockRestore();
  });

  it("useDeploymentId returns id", () => {
    const { result } = renderHook(() => useDeploymentId(), {
      wrapper: Wrapper,
    });
    expect(result.current).toBe("dep-456");
  });

  it("useDeploymentId throws with no deployment", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() =>
      renderHook(() => useDeploymentId(), { wrapper: EmptyWrapper }),
    ).toThrow("No active deployment");
    spy.mockRestore();
  });
});
