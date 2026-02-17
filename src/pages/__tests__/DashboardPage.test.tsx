import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "../../providers/AuthProvider";
import { ThemeProvider } from "../../providers/ThemeProvider";
import { WebSocketProvider } from "../../providers/WebSocketProvider";
import { DeploymentProvider } from "../../providers/DeploymentProvider";
import DashboardPage from "../DashboardPage";
import type { Deployment, ServerStats } from "../../api/types";
import apiClient from "../../api/client";
import { vi } from "vitest";

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

const mockGet = apiClient.get as ReturnType<typeof vi.fn>;

const TEST_DEPLOYMENT: Deployment = {
  id: "test-deploy-1",
  name: "test-dns",
  service_type: "crow_dns",
  endpoint_url: "http://localhost:8080",
  health_status: "healthy",
  last_seen: new Date().toISOString(),
  created_at: new Date().toISOString(),
  tags: {},
};

const MOCK_STATS: ServerStats = {
  zone_count: 12,
  cache_size: 5000,
  cache_hits: 800,
  cache_misses: 200,
  cache_evictions: 10,
  cache_expirations: 5,
  metrics_text: "",
};

function renderDashboard(preloadStats?: ServerStats) {
  mockGet.mockResolvedValue({
    data: {
      authenticated: true,
      name: "Test User",
      email: "test@example.com",
      roles: [],
    },
  });

  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  if (preloadStats) {
    qc.setQueryData(["deployments", TEST_DEPLOYMENT.id, "stats"], preloadStats);
  }
  return render(
    <AuthProvider>
      <ThemeProvider>
        <QueryClientProvider client={qc}>
          <DeploymentProvider initialDeployment={TEST_DEPLOYMENT}>
            <WebSocketProvider>
              <DashboardPage />
            </WebSocketProvider>
          </DeploymentProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </AuthProvider>,
  );
}

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders stats when data is preloaded in cache", async () => {
    renderDashboard(MOCK_STATS);

    await waitFor(() => {
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
    });

    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("5,000")).toBeInTheDocument();
    expect(screen.getByText("80.0%")).toBeInTheDocument();
  });

  it("shows loading spinner when no cached data", () => {
    renderDashboard();
    expect(
      document.querySelector('[class*="spinner"]') ||
        screen.queryByText("Dashboard") === null,
    ).toBeTruthy();
  });

  it("computes hit rate correctly for edge cases", async () => {
    const zeroTraffic: ServerStats = {
      ...MOCK_STATS,
      cache_hits: 0,
      cache_misses: 0,
    };
    renderDashboard(zeroTraffic);

    await waitFor(() => {
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
    });

    expect(screen.getByText("0.0%")).toBeInTheDocument();
  });
});
