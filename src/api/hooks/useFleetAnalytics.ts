// Copyright 2026 U.S. Federal Government (in countries where recognized)
// SPDX-License-Identifier: Apache-2.0

import { useQuery } from "@tanstack/react-query";
import apiClient from "../client";
import type { FleetTopEntry } from "../types";

export function useFleetTopQueries(n = 20) {
  return useQuery<FleetTopEntry[]>({
    queryKey: ["fleet", "analytics", "top-queries", n],
    queryFn: async () => {
      const { data } = await apiClient.get<FleetTopEntry[]>(
        "/api/v1/fleet/analytics/top-queries",
        { params: { n } },
      );
      return data;
    },
    refetchInterval: 30_000,
  });
}

export function useFleetTopClients(n = 20) {
  return useQuery<FleetTopEntry[]>({
    queryKey: ["fleet", "analytics", "top-clients", n],
    queryFn: async () => {
      const { data } = await apiClient.get<FleetTopEntry[]>(
        "/api/v1/fleet/analytics/top-clients",
        { params: { n } },
      );
      return data;
    },
    refetchInterval: 30_000,
  });
}
