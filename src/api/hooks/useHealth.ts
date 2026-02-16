import { useQuery } from "@tanstack/react-query";
import apiClient from "../client";
import type { HealthTargetsResponse, HealthTargetState } from "../types";

export function useHealthTargets(refetchInterval: number | false = 10000) {
  return useQuery<HealthTargetsResponse>({
    queryKey: ["health", "targets"],
    queryFn: async () => {
      const { data } = await apiClient.get<HealthTargetsResponse>(
        "/api/v1/health/targets",
      );
      return data;
    },
    refetchInterval,
  });
}

export function useHealthTarget(id: string) {
  return useQuery<HealthTargetState>({
    queryKey: ["health", "targets", id],
    queryFn: async () => {
      const { data } = await apiClient.get<HealthTargetState>(
        `/api/v1/health/targets/${encodeURIComponent(id)}`,
      );
      return data;
    },
    enabled: !!id,
  });
}
