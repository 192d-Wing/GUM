import { render, screen, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "../AuthProvider";
import { WebSocketProvider, useWsStatus } from "../WebSocketProvider";

// Mock the API client.
vi.mock("../../api/client", () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}));

import apiClient from "../../api/client";
const mockGet = vi.mocked(apiClient.get);
const mockPost = vi.mocked(apiClient.post);

// Minimal mock WebSocket.
class MockWebSocket {
  static instances: MockWebSocket[] = [];
  url: string;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  readyState = 0;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  close() {
    this.readyState = 3;
    this.onclose?.();
  }

  send() {}

  simulateOpen() {
    this.readyState = 1;
    this.onopen?.();
  }

  simulateMessage(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }
}

function StatusConsumer() {
  const { connected } = useWsStatus();
  return (
    <span data-testid="ws">{connected ? "connected" : "disconnected"}</span>
  );
}

function renderWithProviders(authenticated: boolean) {
  // Mock /auth/me to control auth state.
  if (authenticated) {
    mockGet.mockResolvedValueOnce({
      data: {
        authenticated: true,
        sub: "test-user",
        name: "Test User",
        email: "test@example.com",
        roles: [],
      },
      status: 200,
    } as never);
  } else {
    mockGet.mockRejectedValueOnce(new Error("401"));
  }

  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return {
    qc,
    ...render(
      <AuthProvider>
        <QueryClientProvider client={qc}>
          <WebSocketProvider>
            <StatusConsumer />
          </WebSocketProvider>
        </QueryClientProvider>
      </AuthProvider>,
    ),
  };
}

describe("WebSocketProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MockWebSocket.instances = [];
    vi.stubGlobal("WebSocket", MockWebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not connect when unauthenticated", async () => {
    renderWithProviders(false);
    // Wait for auth check to complete
    await waitFor(() => {
      expect(screen.getByTestId("ws")).toHaveTextContent("disconnected");
    });
    expect(MockWebSocket.instances).toHaveLength(0);
  });

  it("fetches ticket and connects when authenticated", async () => {
    mockPost.mockResolvedValueOnce({ data: { ticket: "test-ticket-uuid" } });

    renderWithProviders(true);

    await waitFor(() => {
      expect(MockWebSocket.instances).toHaveLength(1);
    });
    expect(mockPost).toHaveBeenCalledWith("/api/v1/ws/ticket");
    expect(MockWebSocket.instances[0].url).toContain("ticket=test-ticket-uuid");

    act(() => MockWebSocket.instances[0].simulateOpen());
    expect(screen.getByTestId("ws")).toHaveTextContent("connected");
  });

  it("pushes stats messages into query cache", async () => {
    mockPost.mockResolvedValueOnce({ data: { ticket: "t1" } });
    const { qc } = renderWithProviders(true);

    await waitFor(() => {
      expect(MockWebSocket.instances).toHaveLength(1);
    });
    const ws = MockWebSocket.instances[0];

    act(() => ws.simulateOpen());
    act(() =>
      ws.simulateMessage({
        type: "stats",
        data: {
          zone_count: 5,
          cache_size: 100,
          cache_hits: 50,
          cache_misses: 10,
          cache_evictions: 1,
          cache_expirations: 2,
          metrics_text: "",
        },
      }),
    );

    const cached = qc.getQueryData(["stats"]) as Record<string, unknown>;
    expect(cached.zone_count).toBe(5);
    expect(cached.cache_size).toBe(100);
  });

  it("pushes health messages into query cache", async () => {
    mockPost.mockResolvedValueOnce({ data: { ticket: "t2" } });
    const { qc } = renderWithProviders(true);

    await waitFor(() => {
      expect(MockWebSocket.instances).toHaveLength(1);
    });
    const ws = MockWebSocket.instances[0];

    act(() => ws.simulateOpen());
    act(() =>
      ws.simulateMessage({
        type: "health",
        data: {
          targets: [
            {
              target_id: "web-1",
              healthy: true,
              consecutive_successes: 3,
              consecutive_failures: 0,
              latency_ms: 42,
            },
          ],
        },
      }),
    );

    const cached = qc.getQueryData(["health", "targets"]) as Record<
      string,
      unknown
    >;
    expect(cached).toBeDefined();
    expect((cached as { targets: unknown[] }).targets).toHaveLength(1);
  });

  it("reports disconnected after close", async () => {
    mockPost.mockResolvedValueOnce({ data: { ticket: "t3" } });
    renderWithProviders(true);

    await waitFor(() => {
      expect(MockWebSocket.instances).toHaveLength(1);
    });
    const ws = MockWebSocket.instances[0];

    act(() => ws.simulateOpen());
    expect(screen.getByTestId("ws")).toHaveTextContent("connected");

    act(() => ws.close());
    expect(screen.getByTestId("ws")).toHaveTextContent("disconnected");
  });
});
