// Copyright 2026 U.S. Federal Government (in countries where recognized)
// SPDX-License-Identifier: Apache-2.0

vi.mock("../../providers/AuthProvider", () => ({
  useAuth: vi.fn(),
}));

import { renderHook } from "@testing-library/react";
import { useAuth } from "../../providers/AuthProvider";
import { useHasRole, useIsAdmin } from "../useAuthorization";

const mockUseAuth = vi.mocked(useAuth);

describe("useAuthorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("useHasRole returns false when user is null", () => {
    mockUseAuth.mockReturnValue({
      loading: false,
      isAuthenticated: false,
      user: null,
      login: vi.fn(),
      logout: vi.fn(),
    });

    const { result } = renderHook(() => useHasRole("admin"));
    expect(result.current).toBe(false);
  });

  it("useHasRole returns false when role is absent", () => {
    mockUseAuth.mockReturnValue({
      loading: false,
      isAuthenticated: true,
      user: {
        authenticated: true,
        sub: "u",
        name: "User",
        email: "u@test.com",
        roles: ["viewer"],
      },
      login: vi.fn(),
      logout: vi.fn(),
    });

    const { result } = renderHook(() => useHasRole("admin"));
    expect(result.current).toBe(false);
  });

  it("useHasRole returns true when role is present", () => {
    mockUseAuth.mockReturnValue({
      loading: false,
      isAuthenticated: true,
      user: {
        authenticated: true,
        sub: "u",
        name: "User",
        email: "u@test.com",
        roles: ["admin"],
      },
      login: vi.fn(),
      logout: vi.fn(),
    });

    const { result } = renderHook(() => useHasRole("admin"));
    expect(result.current).toBe(true);
  });

  it("useIsAdmin returns true for admin", () => {
    mockUseAuth.mockReturnValue({
      loading: false,
      isAuthenticated: true,
      user: {
        authenticated: true,
        sub: "u",
        name: "User",
        email: "u@test.com",
        roles: ["admin"],
      },
      login: vi.fn(),
      logout: vi.fn(),
    });

    const { result } = renderHook(() => useIsAdmin());
    expect(result.current).toBe(true);
  });

  it("useIsAdmin returns false for non-admin", () => {
    mockUseAuth.mockReturnValue({
      loading: false,
      isAuthenticated: true,
      user: {
        authenticated: true,
        sub: "u",
        name: "User",
        email: "u@test.com",
        roles: ["viewer"],
      },
      login: vi.fn(),
      logout: vi.fn(),
    });

    const { result } = renderHook(() => useIsAdmin());
    expect(result.current).toBe(false);
  });
});
