import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../providers/AuthProvider", () => ({
  useAuth: vi.fn(),
}));

import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import LoginPage from "../LoginPage";
import { useAuth } from "../../providers/AuthProvider";

const mockUseAuth = vi.mocked(useAuth);
const mockNavigate = vi.fn();

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows SSO button when unauthenticated", () => {
    mockUseAuth.mockReturnValue({
      loading: false,
      isAuthenticated: false,
      user: null,
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("Sign in with SSO")).toBeInTheDocument();
    expect(screen.getByText("Sign in to GUM")).toBeInTheDocument();
  });

  it("clicking button calls login", () => {
    const loginFn = vi.fn();
    mockUseAuth.mockReturnValue({
      loading: false,
      isAuthenticated: false,
      user: null,
      login: loginFn,
      logout: vi.fn(),
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByText("Sign in with SSO"));
    expect(loginFn).toHaveBeenCalledOnce();
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
        <LoginPage />
      </MemoryRouter>,
    );

    // Spinner renders, SSO button does not
    expect(screen.queryByText("Sign in with SSO")).not.toBeInTheDocument();
    expect(document.querySelector("[class*='size-large']")).toBeTruthy();
  });

  it("redirects when already authenticated", () => {
    mockUseAuth.mockReturnValue({
      loading: false,
      isAuthenticated: true,
      user: {
        authenticated: true,
        sub: "u",
        name: "User",
        email: "u@test.com",
        roles: [],
      },
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
  });
});
