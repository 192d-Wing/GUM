import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "../client";
import type { RecordEntry, AddRecordRequest, DeleteRecordQuery } from "../types";
import { useDeploymentApiPrefix, useDeploymentId } from "../useDeploymentApi";

export function useRecords(zoneName: string) {
  const prefix = useDeploymentApiPrefix();
  const deploymentId = useDeploymentId();

  return useQuery<RecordEntry[]>({
    queryKey: ["deployments", deploymentId, "records", zoneName],
    queryFn: async () => {
      const { data } = await apiClient.get<RecordEntry[]>(
        `${prefix}/api/v1/zones/${encodeURIComponent(zoneName)}/records`,
      );
      return data;
    },
    enabled: !!zoneName,
  });
}

export function useAddRecord(zoneName: string) {
  const prefix = useDeploymentApiPrefix();
  const deploymentId = useDeploymentId();
  const queryClient = useQueryClient();

  return useMutation<void, Error, AddRecordRequest>({
    mutationFn: async (body) => {
      await apiClient.post(
        `${prefix}/api/v1/zones/${encodeURIComponent(zoneName)}/records`,
        body,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["deployments", deploymentId, "records", zoneName],
      });
    },
  });
}

export function useDeleteRecord(zoneName: string) {
  const prefix = useDeploymentApiPrefix();
  const deploymentId = useDeploymentId();
  const queryClient = useQueryClient();

  return useMutation<void, Error, DeleteRecordQuery>({
    mutationFn: async ({ name, rtype }) => {
      await apiClient.delete(
        `${prefix}/api/v1/zones/${encodeURIComponent(zoneName)}/records`,
        { params: { name, rtype } },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["deployments", deploymentId, "records", zoneName],
      });
    },
  });
}
