import { useQuery } from "@tanstack/react-query";
import apiClient from "../client";
import type { ServerStats } from "../types";
import { useDeploymentApiPrefix, useDeploymentId } from "../useDeploymentApi";

export function useStats(refetchInterval: number | false = 5000) {
  const prefix = useDeploymentApiPrefix();
  const deploymentId = useDeploymentId();

  return useQuery<ServerStats>({
    queryKey: ["deployments", deploymentId, "stats"],
    queryFn: async () => {
      const { data } = await apiClient.get<ServerStats>(
        `${prefix}/api/v1/stats`,
      );
      return data;
    },
    refetchInterval,
  });
}
