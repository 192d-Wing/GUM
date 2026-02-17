// Copyright 2026 U.S. Federal Government (in countries where recognized)
// SPDX-License-Identifier: Apache-2.0

vi.mock("../../client", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}));

import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useStats } from "../useStats";
import apiClient from "../../client";
import type { ReactNode } from "react";
import type { Deployment, ServerStats } from "../../types";
import { DeploymentProvider } from "../../../providers/DeploymentProvider";

const mockGet = vi.mocked(apiClient.get);

const mockDeployment: Deployment = {
  id: "dep-123",
  name: "test-deployment",
  service_type: "crow_dns",
  endpoint_url: "http://localhost:8080",
  health_status: "healthy",
  last_seen: "2026-01-01T00:00:00Z",
  created_at: "2025-12-01T00:00:00Z",
  tags: {},
};

const mockStats: ServerStats = {
  zone_count: 5,
  cache_size: 1024,
  cache_hits: 500,
  cache_misses: 50,
  cache_evictions: 10,
  cache_expirations: 20,
  metrics_text: "some_metric 42",
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <DeploymentProvider initialDeployment={mockDeployment}>
          {children}
        </DeploymentProvider>
      </QueryClientProvider>
    );
  }
  return { Wrapper, queryClient };
}

describe("useStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches stats for active deployment", async () => {
    mockGet.mockResolvedValue({ data: mockStats } as never);
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useStats(false), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.zone_count).toBe(5);
    expect(result.current.data?.cache_hits).toBe(500);
    expect(mockGet).toHaveBeenCalledWith(
      `/api/v1/deployments/${mockDeployment.id}/proxy/api/v1/stats`,
    );
  });

  it("uses correct query key", () => {
    mockGet.mockReturnValue(new Promise(() => {}) as never);
    const { Wrapper, queryClient } = createWrapper();

    renderHook(() => useStats(false), { wrapper: Wrapper });

    expect(
      queryClient.getQueryState(["deployments", mockDeployment.id, "stats"]),
    ).toBeTruthy();
  });
});
