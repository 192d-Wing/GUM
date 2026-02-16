import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { AuthProvider } from "../../providers/AuthProvider";
import { ThemeProvider } from "../../providers/ThemeProvider";
import { WebSocketProvider } from "../../providers/WebSocketProvider";
import TopNav from "../TopNav";

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

function renderTopNav(authenticated: boolean) {
  Object.defineProperty(window, "location", {
    value: {
      pathname: authenticated ? "/" : "/login",
      href: authenticated ? "/" : "/login",
      protocol: "http:",
      host: "localhost:3000",
    },
    writable: true,
  });

  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <MemoryRouter>
      <AuthProvider>
        <ThemeProvider>
          <QueryClientProvider client={qc}>
            <WebSocketProvider>
              <TopNav />
            </WebSocketProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("TopNav", () => {
  it("shows app title", () => {
    renderTopNav(false);
    // Cloudscape renders both wide and narrow headers
    const titles = screen.getAllByText("Crow DNS");
    expect(titles.length).toBeGreaterThanOrEqual(1);
  });

  it("hides utilities when not authenticated", () => {
    renderTopNav(false);
    expect(screen.queryByText("Sign out")).not.toBeInTheDocument();
    expect(screen.queryByText("Light mode")).not.toBeInTheDocument();
  });

  it("shows utilities when authenticated", () => {
    renderTopNav(true);
    // Cloudscape renders utilities as <a role="button" aria-label="...">
    expect(screen.getByRole("button", { name: "Light mode" })).toBeInTheDocument();
  });

  it("shows connection status when authenticated", () => {
    renderTopNav(true);
    // Cloudscape may duplicate elements for responsive layout; check at least one
    const matches = screen.getAllByText("Disconnected");
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });
});
