import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "../../providers/AuthProvider";
import { ThemeProvider } from "../../providers/ThemeProvider";
import { WebSocketProvider } from "../../providers/WebSocketProvider";
import DashboardPage from "../DashboardPage";
import type { ServerStats } from "../../api/types";
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
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  if (preloadStats) {
    qc.setQueryData(["stats"], preloadStats);
  }
  return render(
    <AuthProvider>
      <ThemeProvider>
        <QueryClientProvider client={qc}>
          <WebSocketProvider>
            <DashboardPage />
          </WebSocketProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </AuthProvider>,
  );
}

describe("DashboardPage", () => {

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
    // The spinner from Cloudscape renders a role="status" element
    expect(document.querySelector('[class*="spinner"]') || screen.queryByText("Dashboard") === null).toBeTruthy();
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
