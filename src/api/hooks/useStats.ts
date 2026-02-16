import { useQuery } from "@tanstack/react-query";
import apiClient from "../client";
import type { ServerStats } from "../types";

export function useStats(refetchInterval: number | false = 5000) {
  return useQuery<ServerStats>({
    queryKey: ["stats"],
    queryFn: async () => {
      const { data } = await apiClient.get<ServerStats>("/api/v1/stats");
      return data;
    },
    refetchInterval,
  });
}
