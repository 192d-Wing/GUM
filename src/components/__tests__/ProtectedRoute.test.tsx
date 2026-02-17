import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../providers/AuthProvider", () => ({
  useAuth: vi.fn(),
}));

import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import ProtectedRoute from "../ProtectedRoute";
import { useAuth } from "../../providers/AuthProvider";

const mockUseAuth = vi.mocked(useAuth);

describe("ProtectedRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows spinner when loading", () => {
    mockUseAuth.mockReturnValue({
      loading: true,
      isAuthenticated: false,
      user: null,
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter>
        <ProtectedRoute>
          <span>child</span>
        </ProtectedRoute>
      </MemoryRouter>,
    );

    // Cloudscape Spinner renders as spans — verify children are hidden and spinner container exists
    expect(screen.queryByText("child")).not.toBeInTheDocument();
    expect(document.querySelector("[class*='size-large']")).toBeTruthy();
  });

  it("redirects when not authenticated", () => {
    mockUseAuth.mockReturnValue({
      loading: false,
      isAuthenticated: false,
      user: null,
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter>
        <ProtectedRoute>
          <span>child</span>
        </ProtectedRoute>
      </MemoryRouter>,
    );

    expect(screen.queryByText("child")).not.toBeInTheDocument();
  });

  it("renders children when authenticated", () => {
    mockUseAuth.mockReturnValue({
      loading: false,
      isAuthenticated: true,
      user: {
        authenticated: true,
        sub: "u",
        name: "U",
        email: "u@test.com",
        roles: [],
      },
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter>
        <ProtectedRoute>
          <span>child</span>
        </ProtectedRoute>
      </MemoryRouter>,
    );

    expect(screen.getByText("child")).toBeInTheDocument();
  });
});
