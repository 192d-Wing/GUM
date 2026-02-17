import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "../client";
import type { IpRangeList } from "../types";
import { useDeploymentApiPrefix, useDeploymentId } from "../useDeploymentApi";

export function useNtpAllowList() {
  const prefix = useDeploymentApiPrefix();
  const deploymentId = useDeploymentId();

  return useQuery<IpRangeList>({
    queryKey: ["deployments", deploymentId, "ntp-access", "allow"],
    queryFn: async () => {
      const { data } = await apiClient.get<IpRangeList>(
        `${prefix}/api/v1/access/allow`,
      );
      return data;
    },
  });
}

export function useUpdateNtpAllowList() {
  const prefix = useDeploymentApiPrefix();
  const deploymentId = useDeploymentId();
  const queryClient = useQueryClient();

  return useMutation<void, Error, IpRangeList>({
    mutationFn: async (body) => {
      await apiClient.put(`${prefix}/api/v1/access/allow`, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["deployments", deploymentId, "ntp-access", "allow"],
      });
    },
  });
}

export function useNtpDenyList() {
  const prefix = useDeploymentApiPrefix();
  const deploymentId = useDeploymentId();

  return useQuery<IpRangeList>({
    queryKey: ["deployments", deploymentId, "ntp-access", "deny"],
    queryFn: async () => {
      const { data } = await apiClient.get<IpRangeList>(
        `${prefix}/api/v1/access/deny`,
      );
      return data;
    },
  });
}

export function useUpdateNtpDenyList() {
  const prefix = useDeploymentApiPrefix();
  const deploymentId = useDeploymentId();
  const queryClient = useQueryClient();

  return useMutation<void, Error, IpRangeList>({
    mutationFn: async (body) => {
      await apiClient.put(`${prefix}/api/v1/access/deny`, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["deployments", deploymentId, "ntp-access", "deny"],
      });
    },
  });
}
