// Copyright 2026 U.S. Federal Government (in countries where recognized)
// SPDX-License-Identifier: Apache-2.0

import { useQuery } from "@tanstack/react-query";
import apiClient from "../client";
import type { TopEntry } from "../types";
import { useDeploymentApiPrefix, useDeploymentId } from "../useDeploymentApi";

export function useTopQueries(n = 10) {
  const prefix = useDeploymentApiPrefix();
  const deploymentId = useDeploymentId();

  return useQuery<TopEntry[]>({
    queryKey: ["deployments", deploymentId, "analytics", "top-queries", n],
    queryFn: async () => {
      const { data } = await apiClient.get<TopEntry[]>(
        `${prefix}/api/v1/analytics/top-queries`,
        { params: { n } },
      );
      return data;
    },
  });
}

export function useTopClients(n = 10) {
  const prefix = useDeploymentApiPrefix();
  const deploymentId = useDeploymentId();

  return useQuery<TopEntry[]>({
    queryKey: ["deployments", deploymentId, "analytics", "top-clients", n],
    queryFn: async () => {
      const { data } = await apiClient.get<TopEntry[]>(
        `${prefix}/api/v1/analytics/top-clients`,
        { params: { n } },
      );
      return data;
    },
  });
}

export function useTopNxdomains(n = 10) {
  const prefix = useDeploymentApiPrefix();
  const deploymentId = useDeploymentId();

  return useQuery<TopEntry[]>({
    queryKey: ["deployments", deploymentId, "analytics", "top-nxdomains", n],
    queryFn: async () => {
      const { data } = await apiClient.get<TopEntry[]>(
        `${prefix}/api/v1/analytics/top-nxdomains`,
        { params: { n } },
      );
      return data;
    },
  });
}
