import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "../client";
import type { DomainListResponse, UpdateListRequest } from "../types";
import { useDeploymentApiPrefix, useDeploymentId } from "../useDeploymentApi";

export function useBlocklist() {
  const prefix = useDeploymentApiPrefix();
  const deploymentId = useDeploymentId();

  return useQuery<DomainListResponse>({
    queryKey: ["deployments", deploymentId, "firewall", "blocklist"],
    queryFn: async () => {
      const { data } = await apiClient.get<DomainListResponse>(
        `${prefix}/api/v1/firewall/blocklist`,
      );
      return data;
    },
  });
}

export function useUpdateBlocklist() {
  const prefix = useDeploymentApiPrefix();
  const deploymentId = useDeploymentId();
  const queryClient = useQueryClient();

  return useMutation<void, Error, UpdateListRequest>({
    mutationFn: async (body) => {
      await apiClient.put(`${prefix}/api/v1/firewall/blocklist`, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["deployments", deploymentId, "firewall", "blocklist"],
      });
    },
  });
}

export function useAllowlist() {
  const prefix = useDeploymentApiPrefix();
  const deploymentId = useDeploymentId();

  return useQuery<DomainListResponse>({
    queryKey: ["deployments", deploymentId, "firewall", "allowlist"],
    queryFn: async () => {
      const { data } = await apiClient.get<DomainListResponse>(
        `${prefix}/api/v1/firewall/allowlist`,
      );
      return data;
    },
  });
}

export function useUpdateAllowlist() {
  const prefix = useDeploymentApiPrefix();
  const deploymentId = useDeploymentId();
  const queryClient = useQueryClient();

  return useMutation<void, Error, UpdateListRequest>({
    mutationFn: async (body) => {
      await apiClient.put(`${prefix}/api/v1/firewall/allowlist`, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["deployments", deploymentId, "firewall", "allowlist"],
      });
    },
  });
}
