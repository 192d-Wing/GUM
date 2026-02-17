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
import { useFleetHealth } from "../useFleetHealth";
import apiClient from "../../client";
import type { ReactNode } from "react";
import type { FleetHealth } from "../../types";

const mockGet = vi.mocked(apiClient.get);

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }
  return { Wrapper, queryClient };
}

const mockFleetHealth: FleetHealth = {
  total: 3,
  healthy: 2,
  degraded: 1,
  unhealthy: 0,
  unknown: 0,
  deployments: [
    {
      id: "dep-1",
      name: "prod-dns",
      service_type: "crow_dns",
      health_status: "healthy",
      last_seen: "2026-01-01T00:00:00Z",
    },
    {
      id: "dep-2",
      name: "staging-dns",
      service_type: "crow_dns",
      health_status: "healthy",
      last_seen: "2026-01-01T00:00:00Z",
    },
    {
      id: "dep-3",
      name: "dev-ntp",
      service_type: "ntp",
      health_status: "degraded",
      last_seen: null,
    },
  ],
};

describe("useFleetHealth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches fleet health data", async () => {
    mockGet.mockResolvedValue({ data: mockFleetHealth } as never);
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useFleetHealth(false), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.total).toBe(3);
    expect(result.current.data?.healthy).toBe(2);
    expect(result.current.data?.deployments).toHaveLength(3);
  });

  it("uses correct query key", () => {
    mockGet.mockReturnValue(new Promise(() => {}) as never);
    const { Wrapper, queryClient } = createWrapper();

    renderHook(() => useFleetHealth(false), { wrapper: Wrapper });

    expect(queryClient.getQueryState(["fleet", "health"])).toBeTruthy();
  });
});
