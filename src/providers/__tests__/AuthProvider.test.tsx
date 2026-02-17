import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider, useAuth } from "../AuthProvider";

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

function AuthConsumer() {
  const { isAuthenticated, loading, user, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="loading">{loading ? "yes" : "no"}</span>
      <span data-testid="auth">{isAuthenticated ? "yes" : "no"}</span>
      <span data-testid="name">{user?.name ?? ""}</span>
      <button onClick={() => login()}>Login</button>
      <button onClick={() => logout()}>Logout</button>
    </div>
  );
}

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: mock /auth/me to return unauthenticated
    mockGet.mockRejectedValue(new Error("not authenticated"));
    // Save original location
    Object.defineProperty(window, "location", {
      value: { pathname: "/", href: "/", assign: vi.fn() },
      writable: true,
    });
  });

  it("starts in loading state then resolves as unauthenticated", async () => {
    mockGet.mockRejectedValueOnce(new Error("401"));
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    // Initially loading
    expect(screen.getByTestId("loading")).toHaveTextContent("yes");

    // After /auth/me resolves, loading ends
    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("no");
    });
    expect(screen.getByTestId("auth")).toHaveTextContent("no");
  });

  it("resolves as authenticated when /auth/me succeeds", async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        authenticated: true,
        sub: "user-1",
        name: "Test User",
        email: "test@example.com",
        roles: ["admin"],
      },
      status: 200,
    });

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("auth")).toHaveTextContent("yes");
    });
    expect(screen.getByTestId("name")).toHaveTextContent("Test User");
    expect(mockGet).toHaveBeenCalledWith("/api/v1/auth/me");
  });

  it("login() redirects to OIDC login endpoint", async () => {
    mockGet.mockRejectedValueOnce(new Error("401"));
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("no");
    });
    await user.click(screen.getByText("Login"));

    expect(window.location.href).toBe("/api/v1/auth/oidc/login");
  });

  it("logout() calls server and clears authentication", async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        authenticated: true,
        sub: "user-1",
        name: "Test User",
        email: "test@example.com",
        roles: [],
      },
      status: 200,
    });
    mockPost.mockResolvedValueOnce({ data: { success: true }, status: 200 });
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("auth")).toHaveTextContent("yes");
    });
    await user.click(screen.getByText("Logout"));

    await waitFor(() => {
      expect(screen.getByTestId("auth")).toHaveTextContent("no");
    });
    expect(mockPost).toHaveBeenCalledWith("/api/v1/auth/logout");
  });

  it("useAuth throws when used outside provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<AuthConsumer />)).toThrow(
      "useAuth must be used within AuthProvider",
    );
    spy.mockRestore();
  });
});
