import { useQuery } from "@tanstack/react-query";
import apiClient from "../client";
import type { CatalogSummary, CatalogDetail } from "../types";
import { useDeploymentApiPrefix, useDeploymentId } from "../useDeploymentApi";

export function useCatalogs() {
  const prefix = useDeploymentApiPrefix();
  const deploymentId = useDeploymentId();

  return useQuery<CatalogSummary[]>({
    queryKey: ["deployments", deploymentId, "catalogs"],
    queryFn: async () => {
      const { data } = await apiClient.get<CatalogSummary[]>(
        `${prefix}/api/v1/catalogs`,
      );
      return data;
    },
  });
}

export function useCatalog(name: string) {
  const prefix = useDeploymentApiPrefix();
  const deploymentId = useDeploymentId();

  return useQuery<CatalogDetail>({
    queryKey: ["deployments", deploymentId, "catalogs", name],
    queryFn: async () => {
      const { data } = await apiClient.get<CatalogDetail>(
        `${prefix}/api/v1/catalogs/${encodeURIComponent(name)}`,
      );
      return data;
    },
    enabled: !!name,
  });
}
