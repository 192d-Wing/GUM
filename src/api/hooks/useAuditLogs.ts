import { useQuery } from "@tanstack/react-query";
import apiClient from "../client";
import type { AuditLog } from "../types";

export function useAuditLogs() {
  return useQuery<AuditLog[]>({
    queryKey: ["audit-logs"],
    queryFn: async () => {
      const { data } = await apiClient.get<AuditLog[]>("/api/v1/audit-logs");
      return data;
    },
  });
}
