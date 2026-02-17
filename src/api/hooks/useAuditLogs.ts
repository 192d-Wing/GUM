import { useQuery } from "@tanstack/react-query";
import apiClient from "../client";
import type { AuditLogPage } from "../types";

interface AuditLogParams {
  limit?: number;
  offset?: number;
}

export function useAuditLogs(params: AuditLogParams = {}) {
  return useQuery<AuditLogPage>({
    queryKey: ["audit-logs", params.limit, params.offset],
    queryFn: async () => {
      const { data } = await apiClient.get<AuditLogPage>("/api/v1/audit-logs", {
        params,
      });
      return data;
    },
  });
}
