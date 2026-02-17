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

import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  useDeployments,
  useCreateDeployment,
  useDeleteDeployment,
} from "../useDeployments";
import apiClient from "../../client";
import type { ReactNode } from "react";

const mockGet = vi.mocked(apiClient.get);
const mockPost = vi.mocked(apiClient.post);
const mockDelete = vi.mocked(apiClient.delete);

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

describe("useDeployments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("useDeployments returns loading state initially", () => {
    mockGet.mockReturnValue(new Promise(() => {}) as never);
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useDeployments(), { wrapper: Wrapper });
    expect(result.current.isLoading).toBe(true);
  });

  it("useDeployments returns data on success", async () => {
    mockGet.mockResolvedValue({ data: [{ id: "1", name: "d1" }] } as never);
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useDeployments(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data).toHaveLength(1);
  });

  it("useDeployments uses correct query key", () => {
    mockGet.mockReturnValue(new Promise(() => {}) as never);
    const { Wrapper, queryClient } = createWrapper();

    renderHook(() => useDeployments(), { wrapper: Wrapper });

    expect(queryClient.getQueryState(["deployments"])).toBeTruthy();
  });

  it("useCreateDeployment invalidates deployments on success", async () => {
    const { Wrapper, queryClient } = createWrapper();
    mockPost.mockResolvedValueOnce({
      data: { id: "new", name: "new-deploy" },
    } as never);
    const spy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useCreateDeployment(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      result.current.mutate({
        name: "new-deploy",
        service_type: "crow_dns",
        endpoint_url: "http://localhost",
      });
    });

    await waitFor(() =>
      expect(
        spy.mock.calls.some((call) =>
          JSON.stringify(call[0]).includes("deployments"),
        ),
      ).toBe(true),
    );
  });

  it("useDeleteDeployment invalidates fleet health on success", async () => {
    const { Wrapper, queryClient } = createWrapper();
    mockDelete.mockResolvedValueOnce({ data: undefined } as never);
    const spy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useDeleteDeployment(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      result.current.mutate("dep-1");
    });

    await waitFor(() =>
      expect(
        spy.mock.calls.some((call) =>
          JSON.stringify(call[0]).includes("fleet"),
        ),
      ).toBe(true),
    );
  });
});
