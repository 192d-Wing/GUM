import { useQuery } from "@tanstack/react-query";
import apiClient from "../client";
import type { FleetHealth } from "../types";

export function useFleetHealth(refetchInterval: number | false = 30_000) {
  return useQuery<FleetHealth>({
    queryKey: ["fleet", "health"],
    queryFn: async () => {
      const { data } = await apiClient.get<FleetHealth>("/api/v1/fleet/health");
      return data;
    },
    refetchInterval,
  });
}
