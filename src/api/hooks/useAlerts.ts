import { useQuery } from "@tanstack/react-query";
import apiClient from "../client";
import type { AlertsResponse, AlertRuleSummary } from "../types";
import { useDeploymentApiPrefix, useDeploymentId } from "../useDeploymentApi";

export function useAlerts(refetchInterval = 10000) {
  const prefix = useDeploymentApiPrefix();
  const deploymentId = useDeploymentId();

  return useQuery<AlertsResponse>({
    queryKey: ["deployments", deploymentId, "alerts"],
    queryFn: async () => {
      const { data } = await apiClient.get<AlertsResponse>(
        `${prefix}/api/v1/alerts`,
      );
      return data;
    },
    refetchInterval,
  });
}

export function useAlertRules() {
  const prefix = useDeploymentApiPrefix();
  const deploymentId = useDeploymentId();

  return useQuery<AlertRuleSummary[]>({
    queryKey: ["deployments", deploymentId, "alerts", "rules"],
    queryFn: async () => {
      const { data } = await apiClient.get<AlertRuleSummary[]>(
        `${prefix}/api/v1/alerts/rules`,
      );
      return data;
    },
  });
}
