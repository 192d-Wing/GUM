import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "../client";
import type { NtpServerConfig, ReloadResponse } from "../types";
import { useDeploymentApiPrefix, useDeploymentId } from "../useDeploymentApi";

export function useNtpConfig() {
  const prefix = useDeploymentApiPrefix();
  const deploymentId = useDeploymentId();

  return useQuery<NtpServerConfig>({
    queryKey: ["deployments", deploymentId, "ntp-config"],
    queryFn: async () => {
      const { data } = await apiClient.get<NtpServerConfig>(
        `${prefix}/api/v1/config`,
      );
      return data;
    },
  });
}

export function useUpdateNtpConfig() {
  const prefix = useDeploymentApiPrefix();
  const deploymentId = useDeploymentId();
  const queryClient = useQueryClient();

  return useMutation<NtpServerConfig, Error, NtpServerConfig>({
    mutationFn: async (body) => {
      const { data } = await apiClient.put<NtpServerConfig>(
        `${prefix}/api/v1/config`,
        body,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["deployments", deploymentId, "ntp-config"],
      });
    },
  });
}

export function useNtpConfigReload() {
  const prefix = useDeploymentApiPrefix();

  return useMutation<ReloadResponse, Error, void>({
    mutationFn: async () => {
      const { data } = await apiClient.post<ReloadResponse>(
        `${prefix}/api/v1/config/reload`,
      );
      return data;
    },
  });
}
