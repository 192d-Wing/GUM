// Copyright 2026 U.S. Federal Government (in countries where recognized)
// SPDX-License-Identifier: Apache-2.0

import { render, screen, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "../AuthProvider";
import {
  FleetWebSocketProvider,
  useFleetWsStatus,
} from "../FleetWebSocketProvider";

// Mock the API client so AuthProvider's /auth/me call doesn't hit a real server.
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
  const { connected } = useFleetWsStatus();
  return (
    <span data-testid="ws">{connected ? "connected" : "disconnected"}</span>
  );
}

function renderProvider(authenticated: boolean) {
  if (authenticated) {
    mockGet.mockResolvedValueOnce({
      data: {
        authenticated: true,
        sub: "u1",
        name: "User",
        email: "u@test.com",
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
          <FleetWebSocketProvider>
            <StatusConsumer />
          </FleetWebSocketProvider>
        </QueryClientProvider>
      </AuthProvider>,
    ),
  };
}

describe("FleetWebSocketProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MockWebSocket.instances = [];
    vi.stubGlobal("WebSocket", MockWebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("does not connect when unauthenticated", async () => {
    renderProvider(false);

    await waitFor(() => {
      expect(screen.getByTestId("ws")).toHaveTextContent("disconnected");
    });

    expect(MockWebSocket.instances).toHaveLength(0);
  });

  it("connects to fleet ws when authenticated", async () => {
    renderProvider(true);

    await waitFor(() => {
      expect(MockWebSocket.instances).toHaveLength(1);
    });

    expect(MockWebSocket.instances[0].url).toContain("/api/v1/fleet/ws");
  });

  it("sets connected state to true on open", async () => {
    renderProvider(true);

    await waitFor(() => {
      expect(MockWebSocket.instances).toHaveLength(1);
    });

    act(() => MockWebSocket.instances[0].simulateOpen());

    expect(screen.getByTestId("ws")).toHaveTextContent("connected");
  });

  it("stats frame updates deployment stats cache", async () => {
    const { qc } = renderProvider(true);

    await waitFor(() => {
      expect(MockWebSocket.instances).toHaveLength(1);
    });
    const ws = MockWebSocket.instances[0];

    act(() => ws.simulateOpen());
    act(() =>
      ws.simulateMessage({
        deployment_id: "d1",
        deployment_name: "deploy-1",
        type: "stats",
        data: { zone_count: 5 },
      }),
    );

    const cached = qc.getQueryData(["deployments", "d1", "stats"]) as Record<
      string,
      unknown
    >;
    expect(cached).toBeDefined();
    expect(cached.zone_count).toBe(5);
  });

  it("health frame updates deployment health targets cache", async () => {
    const { qc } = renderProvider(true);

    await waitFor(() => {
      expect(MockWebSocket.instances).toHaveLength(1);
    });
    const ws = MockWebSocket.instances[0];

    act(() => ws.simulateOpen());
    act(() =>
      ws.simulateMessage({
        deployment_id: "d2",
        deployment_name: "deploy-2",
        type: "health",
        data: { targets: [{ target_id: "t1", healthy: true }] },
      }),
    );

    const cached = qc.getQueryData([
      "deployments",
      "d2",
      "health",
      "targets",
    ]) as { targets: { target_id: string; healthy: boolean }[] };
    expect(cached).toBeDefined();
    expect(cached.targets).toHaveLength(1);
    expect(cached.targets[0].target_id).toBe("t1");
    expect(cached.targets[0].healthy).toBe(true);
  });

  it("stats frame patches fleet health to mark deployment healthy", async () => {
    const { qc } = renderProvider(true);

    await waitFor(() => {
      expect(MockWebSocket.instances).toHaveLength(1);
    });
    const ws = MockWebSocket.instances[0];

    // Seed the fleet health cache with an unhealthy deployment.
    qc.setQueryData(["fleet", "health"], {
      total: 1,
      healthy: 0,
      degraded: 0,
      unhealthy: 1,
      unknown: 0,
      deployments: [
        {
          id: "d1",
          name: "d",
          service_type: "crow_dns",
          health_status: "unhealthy",
          last_seen: null,
        },
      ],
    });

    act(() => ws.simulateOpen());
    act(() =>
      ws.simulateMessage({
        deployment_id: "d1",
        deployment_name: "deploy-1",
        type: "stats",
        data: { zone_count: 3 },
      }),
    );

    const fleet = qc.getQueryData(["fleet", "health"]) as {
      deployments: {
        id: string;
        health_status: string;
        last_seen: string | null;
      }[];
    };
    expect(fleet).toBeDefined();
    const dep = fleet.deployments.find((d) => d.id === "d1");
    expect(dep).toBeDefined();
    expect(dep!.health_status).toBe("healthy");
    expect(dep!.last_seen).not.toBeNull();
  });

  it("returns to disconnected after ws close", async () => {
    renderProvider(true);

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
