import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "../client";
import type { DomainListResponse, UpdateListRequest } from "../types";

export function useBlocklist() {
  return useQuery<DomainListResponse>({
    queryKey: ["firewall", "blocklist"],
    queryFn: async () => {
      const { data } = await apiClient.get<DomainListResponse>(
        "/api/v1/firewall/blocklist",
      );
      return data;
    },
  });
}

export function useUpdateBlocklist() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, UpdateListRequest>({
    mutationFn: async (body) => {
      await apiClient.put("/api/v1/firewall/blocklist", body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["firewall", "blocklist"] });
    },
  });
}

export function useAllowlist() {
  return useQuery<DomainListResponse>({
    queryKey: ["firewall", "allowlist"],
    queryFn: async () => {
      const { data } = await apiClient.get<DomainListResponse>(
        "/api/v1/firewall/allowlist",
      );
      return data;
    },
  });
}

export function useUpdateAllowlist() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, UpdateListRequest>({
    mutationFn: async (body) => {
      await apiClient.put("/api/v1/firewall/allowlist", body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["firewall", "allowlist"] });
    },
  });
}
