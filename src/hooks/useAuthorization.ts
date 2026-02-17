// Copyright 2026 U.S. Federal Government (in countries where recognized)
// SPDX-License-Identifier: Apache-2.0

import { useMemo } from "react";
import { useAuth } from "../providers/AuthProvider";

/** Check if the current user has a specific role. */
export function useHasRole(role: string): boolean {
  const { user } = useAuth();
  return useMemo(() => user?.roles?.includes(role) ?? false, [user, role]);
}

/** Check if the current user has the "admin" role. */
export function useIsAdmin(): boolean {
  return useHasRole("admin");
}
