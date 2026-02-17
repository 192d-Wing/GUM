// Copyright 2026 U.S. Federal Government (in countries where recognized)
// SPDX-License-Identifier: Apache-2.0

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "../client";
import type {
  NtaListResponse,
  AddNtaRequest,
  NtaActionResponse,
} from "../types";
import { useDeploymentApiPrefix, useDeploymentId } from "../useDeploymentApi";

export function useNtas() {
  const prefix = useDeploymentApiPrefix();
  const deploymentId = useDeploymentId();

  return useQuery<NtaListResponse>({
    queryKey: ["deployments", deploymentId, "ntas"],
    queryFn: async () => {
      const { data } = await apiClient.get<NtaListResponse>(
        `${prefix}/api/v1/ntas`,
      );
      return data;
    },
  });
}

export function useAddNta() {
  const prefix = useDeploymentApiPrefix();
  const deploymentId = useDeploymentId();
  const queryClient = useQueryClient();

  return useMutation<NtaActionResponse, Error, AddNtaRequest>({
    mutationFn: async (body) => {
      const { data } = await apiClient.post<NtaActionResponse>(
        `${prefix}/api/v1/ntas`,
        body,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["deployments", deploymentId, "ntas"],
      });
    },
  });
}

export function useDeleteNta() {
  const prefix = useDeploymentApiPrefix();
  const deploymentId = useDeploymentId();
  const queryClient = useQueryClient();

  return useMutation<NtaActionResponse, Error, string>({
    mutationFn: async (zone) => {
      const { data } = await apiClient.delete<NtaActionResponse>(
        `${prefix}/api/v1/ntas/${encodeURIComponent(zone)}`,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["deployments", deploymentId, "ntas"],
      });
    },
  });
}
