import { useMutation } from "@tanstack/react-query";
import apiClient from "../client";
import type { ReloadResponse } from "../types";

export function useConfigReload() {
  return useMutation<ReloadResponse, Error, void>({
    mutationFn: async () => {
      const { data } = await apiClient.post<ReloadResponse>(
        "/api/v1/config/reload",
      );
      return data;
    },
  });
}
