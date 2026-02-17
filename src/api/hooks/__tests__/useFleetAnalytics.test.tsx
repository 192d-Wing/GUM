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
import { useFleetTopQueries, useFleetTopClients } from "../useFleetAnalytics";
import apiClient from "../../client";
import type { ReactNode } from "react";
import type { FleetTopEntry } from "../../types";

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

const mockTopQueries: FleetTopEntry[] = [
  { key: "example.com", count: 150, deployments: ["dep-1", "dep-2"] },
  { key: "test.org", count: 80, deployments: ["dep-1"] },
];

const mockTopClients: FleetTopEntry[] = [
  { key: "192.168.1.10", count: 500, deployments: ["dep-1"] },
  { key: "10.0.0.5", count: 300, deployments: ["dep-2", "dep-3"] },
];

describe("useFleetAnalytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("useFleetTopQueries fetches data", async () => {
    mockGet.mockResolvedValue({ data: mockTopQueries } as never);
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useFleetTopQueries(20), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data).toHaveLength(2);
    expect(result.current.data![0].key).toBe("example.com");
    expect(result.current.data![0].count).toBe(150);
  });

  it("useFleetTopClients fetches data", async () => {
    mockGet.mockResolvedValue({ data: mockTopClients } as never);
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useFleetTopClients(20), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data).toHaveLength(2);
    expect(result.current.data![0].key).toBe("192.168.1.10");
    expect(result.current.data![0].count).toBe(500);
  });
});
