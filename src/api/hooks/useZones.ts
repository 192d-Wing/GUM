import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "../client";
import type {
  ZoneSummary,
  CreateZoneRequest,
  CreateZoneResponse,
} from "../types";
import { useDeploymentApiPrefix, useDeploymentId } from "../useDeploymentApi";

export function useZones() {
  const prefix = useDeploymentApiPrefix();
  const deploymentId = useDeploymentId();

  return useQuery<ZoneSummary[]>({
    queryKey: ["deployments", deploymentId, "zones"],
    queryFn: async () => {
      const { data } = await apiClient.get<ZoneSummary[]>(
        `${prefix}/api/v1/zones`,
      );
      return data;
    },
  });
}

export function useZone(name: string) {
  const prefix = useDeploymentApiPrefix();
  const deploymentId = useDeploymentId();

  return useQuery<ZoneSummary>({
    queryKey: ["deployments", deploymentId, "zones", name],
    queryFn: async () => {
      const { data } = await apiClient.get<ZoneSummary>(
        `${prefix}/api/v1/zones/${encodeURIComponent(name)}`,
      );
      return data;
    },
    enabled: !!name,
  });
}

export function useCreateZone() {
  const prefix = useDeploymentApiPrefix();
  const deploymentId = useDeploymentId();
  const queryClient = useQueryClient();

  return useMutation<CreateZoneResponse, Error, CreateZoneRequest>({
    mutationFn: async (body) => {
      const { data } = await apiClient.post<CreateZoneResponse>(
        `${prefix}/api/v1/zones`,
        body,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["deployments", deploymentId, "zones"],
      });
    },
  });
}

export function useDeleteZone() {
  const prefix = useDeploymentApiPrefix();
  const deploymentId = useDeploymentId();
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (name) => {
      await apiClient.delete(
        `${prefix}/api/v1/zones/${encodeURIComponent(name)}`,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["deployments", deploymentId, "zones"],
      });
    },
  });
}
