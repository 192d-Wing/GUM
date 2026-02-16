import { useQuery } from "@tanstack/react-query";
import apiClient from "../client";
import type { AlertsResponse, AlertRuleSummary } from "../types";

export function useAlerts(refetchInterval = 10000) {
  return useQuery<AlertsResponse>({
    queryKey: ["alerts"],
    queryFn: async () => {
      const { data } = await apiClient.get<AlertsResponse>("/api/v1/alerts");
      return data;
    },
    refetchInterval,
  });
}

export function useAlertRules() {
  return useQuery<AlertRuleSummary[]>({
    queryKey: ["alerts", "rules"],
    queryFn: async () => {
      const { data } = await apiClient.get<AlertRuleSummary[]>(
        "/api/v1/alerts/rules",
      );
      return data;
    },
  });
}
