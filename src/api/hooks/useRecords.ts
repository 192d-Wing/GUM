import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "../client";
import type { RecordEntry, AddRecordRequest, DeleteRecordQuery } from "../types";

export function useRecords(zoneName: string) {
  return useQuery<RecordEntry[]>({
    queryKey: ["records", zoneName],
    queryFn: async () => {
      const { data } = await apiClient.get<RecordEntry[]>(
        `/api/v1/zones/${encodeURIComponent(zoneName)}/records`,
      );
      return data;
    },
    enabled: !!zoneName,
  });
}

export function useAddRecord(zoneName: string) {
  const queryClient = useQueryClient();
  return useMutation<void, Error, AddRecordRequest>({
    mutationFn: async (body) => {
      await apiClient.post(`/api/v1/zones/${encodeURIComponent(zoneName)}/records`, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["records", zoneName] });
    },
  });
}

export function useDeleteRecord(zoneName: string) {
  const queryClient = useQueryClient();
  return useMutation<void, Error, DeleteRecordQuery>({
    mutationFn: async ({ name, rtype }) => {
      await apiClient.delete(`/api/v1/zones/${encodeURIComponent(zoneName)}/records`, {
        params: { name, rtype },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["records", zoneName] });
    },
  });
}
