// Copyright 2026 U.S. Federal Government (in countries where recognized)
// SPDX-License-Identifier: Apache-2.0

import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { AuthProvider } from "../../providers/AuthProvider";
import { ThemeProvider } from "../../providers/ThemeProvider";
import { WebSocketProvider } from "../../providers/WebSocketProvider";
import TopNav from "../TopNav";
import apiClient from "../../api/client";

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

const mockGet = apiClient.get as ReturnType<typeof vi.fn>;

function renderTopNav(authenticated: boolean) {
  if (authenticated) {
    mockGet.mockResolvedValue({
      data: {
        authenticated: true,
        name: "Test User",
        email: "test@example.com",
        roles: [],
      },
    });
  } else {
    mockGet.mockRejectedValue(new Error("Unauthorized"));
  }

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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows app title", async () => {
    renderTopNav(false);
    await waitFor(() => {
      const titles = screen.getAllByText("GUM");
      expect(titles.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("hides utilities when not authenticated", async () => {
    renderTopNav(false);
    await waitFor(() => {
      expect(screen.queryByText("Light mode")).not.toBeInTheDocument();
    });
  });

  it("shows utilities when authenticated", async () => {
    renderTopNav(true);
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Light mode" }),
      ).toBeInTheDocument();
    });
  });

  it("shows user name when authenticated", async () => {
    renderTopNav(true);
    await waitFor(() => {
      // Cloudscape renders the dropdown trigger as a button with aria-label
      expect(
        screen.getByRole("button", { name: "Test User" }),
      ).toBeInTheDocument();
    });
  });
});
