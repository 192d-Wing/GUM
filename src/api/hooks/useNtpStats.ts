import { useQuery } from "@tanstack/react-query";
import apiClient from "../client";
import type { NtpServerStats, TopEntry } from "../types";
import { useDeploymentApiPrefix, useDeploymentId } from "../useDeploymentApi";

export function useNtpStats(refetchInterval: number | false = 5000) {
  const prefix = useDeploymentApiPrefix();
  const deploymentId = useDeploymentId();

  return useQuery<NtpServerStats>({
    queryKey: ["deployments", deploymentId, "ntp-stats"],
    queryFn: async () => {
      const { data } = await apiClient.get<NtpServerStats>(
        `${prefix}/api/v1/stats`,
      );
      return data;
    },
    refetchInterval,
  });
}

export function useNtpTopClients(n = 10) {
  const prefix = useDeploymentApiPrefix();
  const deploymentId = useDeploymentId();

  return useQuery<TopEntry[]>({
    queryKey: ["deployments", deploymentId, "ntp-analytics", "top-clients", n],
    queryFn: async () => {
      const { data } = await apiClient.get<TopEntry[]>(
        `${prefix}/api/v1/analytics/top-clients`,
        { params: { n } },
      );
      return data;
    },
  });
}
