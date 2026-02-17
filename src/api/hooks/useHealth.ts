// Copyright 2026 U.S. Federal Government (in countries where recognized)
// SPDX-License-Identifier: Apache-2.0

import { useQuery } from "@tanstack/react-query";
import apiClient from "../client";
import type { HealthTargetsResponse, HealthTargetState } from "../types";
import { useDeploymentApiPrefix, useDeploymentId } from "../useDeploymentApi";

export function useHealthTargets(refetchInterval: number | false = 10000) {
  const prefix = useDeploymentApiPrefix();
  const deploymentId = useDeploymentId();

  return useQuery<HealthTargetsResponse>({
    queryKey: ["deployments", deploymentId, "health", "targets"],
    queryFn: async () => {
      const { data } = await apiClient.get<HealthTargetsResponse>(
        `${prefix}/api/v1/health/targets`,
      );
      return data;
    },
    refetchInterval,
  });
}

export function useHealthTarget(id: string) {
  const prefix = useDeploymentApiPrefix();
  const deploymentId = useDeploymentId();

  return useQuery<HealthTargetState>({
    queryKey: ["deployments", deploymentId, "health", "targets", id],
    queryFn: async () => {
      const { data } = await apiClient.get<HealthTargetState>(
        `${prefix}/api/v1/health/targets/${encodeURIComponent(id)}`,
      );
      return data;
    },
    enabled: !!id,
  });
}
