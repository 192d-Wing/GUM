import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "../client";
import type {
  ZoneSummary,
  CreateZoneRequest,
  CreateZoneResponse,
} from "../types";

export function useZones() {
  return useQuery<ZoneSummary[]>({
    queryKey: ["zones"],
    queryFn: async () => {
      const { data } = await apiClient.get<ZoneSummary[]>("/api/v1/zones");
      return data;
    },
  });
}

export function useZone(name: string) {
  return useQuery<ZoneSummary>({
    queryKey: ["zones", name],
    queryFn: async () => {
      const { data } = await apiClient.get<ZoneSummary>(
        `/api/v1/zones/${encodeURIComponent(name)}`,
      );
      return data;
    },
    enabled: !!name,
  });
}

export function useCreateZone() {
  const queryClient = useQueryClient();
  return useMutation<CreateZoneResponse, Error, CreateZoneRequest>({
    mutationFn: async (body) => {
      const { data } = await apiClient.post<CreateZoneResponse>(
        "/api/v1/zones",
        body,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["zones"] });
    },
  });
}

export function useDeleteZone() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (name) => {
      await apiClient.delete(`/api/v1/zones/${encodeURIComponent(name)}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["zones"] });
    },
  });
}
