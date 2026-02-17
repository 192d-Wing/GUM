import { useMutation } from "@tanstack/react-query";
import apiClient from "../client";
import type { ReloadResponse } from "../types";
import { useDeploymentApiPrefix } from "../useDeploymentApi";

export function useConfigReload() {
  const prefix = useDeploymentApiPrefix();

  return useMutation<ReloadResponse, Error, void>({
    mutationFn: async () => {
      const { data } = await apiClient.post<ReloadResponse>(
        `${prefix}/api/v1/config/reload`,
      );
      return data;
    },
  });
}
