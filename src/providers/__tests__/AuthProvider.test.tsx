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
const mockPost = vi.mocked(apiClient.post);

function AuthConsumer() {
  const { isAuthenticated, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="auth">{isAuthenticated ? "yes" : "no"}</span>
      <button onClick={() => login("test-token-123")}>Login</button>
      <button onClick={() => logout()}>Logout</button>
    </div>
  );
}

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: we're on a non-login page, so isAuthenticated starts true.
    Object.defineProperty(window, "location", {
      value: { pathname: "/", href: "/" },
      writable: true,
    });
  });

  it("starts unauthenticated when on /login", () => {
    Object.defineProperty(window, "location", {
      value: { pathname: "/login", href: "/login" },
      writable: true,
    });
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );
    expect(screen.getByTestId("auth")).toHaveTextContent("no");
  });

  it("starts authenticated when on non-login page", () => {
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );
    expect(screen.getByTestId("auth")).toHaveTextContent("yes");
  });

  it("login() calls server and sets authenticated on success", async () => {
    Object.defineProperty(window, "location", {
      value: { pathname: "/login", href: "/login" },
      writable: true,
    });
    mockPost.mockResolvedValueOnce({ data: { ok: true }, status: 200 });
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    expect(screen.getByTestId("auth")).toHaveTextContent("no");
    await user.click(screen.getByText("Login"));

    await waitFor(() => {
      expect(screen.getByTestId("auth")).toHaveTextContent("yes");
    });
    expect(mockPost).toHaveBeenCalledWith("/api/v1/auth/login", {
      token: "test-token-123",
    });
  });

  it("logout() calls server and clears authentication", async () => {
    mockPost.mockResolvedValueOnce({ data: {}, status: 200 });
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    expect(screen.getByTestId("auth")).toHaveTextContent("yes");
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
