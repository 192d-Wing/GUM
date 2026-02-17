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
import { useAuditLogs } from "../useAuditLogs";
import apiClient from "../../client";
import type { ReactNode } from "react";

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

describe("useAuditLogs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns loading state initially", () => {
    mockGet.mockReturnValue(new Promise(() => {}) as never);
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useAuditLogs(), { wrapper: Wrapper });
    expect(result.current.isLoading).toBe(true);
  });

  it("returns paginated data on success", async () => {
    const page = {
      items: [
        {
          id: "1",
          timestamp: "2025-01-01T00:00:00Z",
          actor_sub: "u1",
          actor_name: "Alice",
          action: "create",
          resource_type: "deployment",
          resource_id: "d1",
          resource_name: "prod-dns",
          details: {},
        },
      ],
      total: 1,
    };
    mockGet.mockResolvedValue({ data: page } as never);
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useAuditLogs(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data!.items).toHaveLength(1);
    expect(result.current.data!.total).toBe(1);
  });

  it("passes limit and offset as query params", async () => {
    mockGet.mockResolvedValue({ data: { items: [], total: 0 } } as never);
    const { Wrapper } = createWrapper();

    renderHook(() => useAuditLogs({ limit: 25, offset: 50 }), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(mockGet).toHaveBeenCalledWith("/api/v1/audit-logs", {
      params: { limit: 25, offset: 50 },
    });
  });

  it("uses distinct query keys for different pages", () => {
    mockGet.mockReturnValue(new Promise(() => {}) as never);
    const { Wrapper, queryClient } = createWrapper();

    renderHook(() => useAuditLogs({ limit: 50, offset: 0 }), {
      wrapper: Wrapper,
    });
    renderHook(() => useAuditLogs({ limit: 50, offset: 50 }), {
      wrapper: Wrapper,
    });

    expect(queryClient.getQueryState(["audit-logs", 50, 0])).toBeTruthy();
    expect(queryClient.getQueryState(["audit-logs", 50, 50])).toBeTruthy();
  });
});
