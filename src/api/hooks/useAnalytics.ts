import { useQuery } from "@tanstack/react-query";
import apiClient from "../client";
import type { TopEntry } from "../types";

export function useTopQueries(n = 10) {
  return useQuery<TopEntry[]>({
    queryKey: ["analytics", "top-queries", n],
    queryFn: async () => {
      const { data } = await apiClient.get<TopEntry[]>(
        "/api/v1/analytics/top-queries",
        { params: { n } },
      );
      return data;
    },
  });
}

export function useTopClients(n = 10) {
  return useQuery<TopEntry[]>({
    queryKey: ["analytics", "top-clients", n],
    queryFn: async () => {
      const { data } = await apiClient.get<TopEntry[]>(
        "/api/v1/analytics/top-clients",
        { params: { n } },
      );
      return data;
    },
  });
}

export function useTopNxdomains(n = 10) {
  return useQuery<TopEntry[]>({
    queryKey: ["analytics", "top-nxdomains", n],
    queryFn: async () => {
      const { data } = await apiClient.get<TopEntry[]>(
        "/api/v1/analytics/top-nxdomains",
        { params: { n } },
      );
      return data;
    },
  });
}
