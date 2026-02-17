// Copyright 2026 U.S. Federal Government (in countries where recognized)
// SPDX-License-Identifier: Apache-2.0

import { useQuery } from "@tanstack/react-query";
import apiClient from "../client";
import type { NtpSyncStatus } from "../types";
import { useDeploymentApiPrefix, useDeploymentId } from "../useDeploymentApi";

export function useNtpSync(refetchInterval: number | false = 5000) {
  const prefix = useDeploymentApiPrefix();
  const deploymentId = useDeploymentId();

  return useQuery<NtpSyncStatus>({
    queryKey: ["deployments", deploymentId, "ntp-sync"],
    queryFn: async () => {
      const { data } = await apiClient.get<NtpSyncStatus>(
        `${prefix}/api/v1/sync`,
      );
      return data;
    },
    refetchInterval,
  });
}
