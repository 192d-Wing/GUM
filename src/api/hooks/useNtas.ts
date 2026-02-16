import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "../client";
import type { NtaListResponse, AddNtaRequest, NtaActionResponse } from "../types";

export function useNtas() {
  return useQuery<NtaListResponse>({
    queryKey: ["ntas"],
    queryFn: async () => {
      const { data } = await apiClient.get<NtaListResponse>("/api/v1/ntas");
      return data;
    },
  });
}

export function useAddNta() {
  const queryClient = useQueryClient();
  return useMutation<NtaActionResponse, Error, AddNtaRequest>({
    mutationFn: async (body) => {
      const { data } = await apiClient.post<NtaActionResponse>(
        "/api/v1/ntas",
        body,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ntas"] });
    },
  });
}

export function useDeleteNta() {
  const queryClient = useQueryClient();
  return useMutation<NtaActionResponse, Error, string>({
    mutationFn: async (zone) => {
      const { data } = await apiClient.delete<NtaActionResponse>(
        `/api/v1/ntas/${encodeURIComponent(zone)}`,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ntas"] });
    },
  });
}
