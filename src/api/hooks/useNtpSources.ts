import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "../client";
import type {
  NtpSource,
  NtpSourceDetail,
  CreateNtpSourceRequest,
} from "../types";
import { useDeploymentApiPrefix, useDeploymentId } from "../useDeploymentApi";

export function useNtpSources() {
  const prefix = useDeploymentApiPrefix();
  const deploymentId = useDeploymentId();

  return useQuery<NtpSource[]>({
    queryKey: ["deployments", deploymentId, "ntp-sources"],
    queryFn: async () => {
      const { data } = await apiClient.get<NtpSource[]>(
        `${prefix}/api/v1/sources`,
      );
      return data;
    },
  });
}

export function useNtpSource(id: string) {
  const prefix = useDeploymentApiPrefix();
  const deploymentId = useDeploymentId();

  return useQuery<NtpSourceDetail>({
    queryKey: ["deployments", deploymentId, "ntp-sources", id],
    queryFn: async () => {
      const { data } = await apiClient.get<NtpSourceDetail>(
        `${prefix}/api/v1/sources/${encodeURIComponent(id)}`,
      );
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateNtpSource() {
  const prefix = useDeploymentApiPrefix();
  const deploymentId = useDeploymentId();
  const queryClient = useQueryClient();

  return useMutation<NtpSource, Error, CreateNtpSourceRequest>({
    mutationFn: async (body) => {
      const { data } = await apiClient.post<NtpSource>(
        `${prefix}/api/v1/sources`,
        body,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["deployments", deploymentId, "ntp-sources"],
      });
    },
  });
}

export function useDeleteNtpSource() {
  const prefix = useDeploymentApiPrefix();
  const deploymentId = useDeploymentId();
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await apiClient.delete(
        `${prefix}/api/v1/sources/${encodeURIComponent(id)}`,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["deployments", deploymentId, "ntp-sources"],
      });
    },
  });
}
