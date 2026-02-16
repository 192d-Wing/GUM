import { useQuery } from "@tanstack/react-query";
import apiClient from "../client";
import type { CatalogSummary, CatalogDetail } from "../types";

export function useCatalogs() {
  return useQuery<CatalogSummary[]>({
    queryKey: ["catalogs"],
    queryFn: async () => {
      const { data } = await apiClient.get<CatalogSummary[]>(
        "/api/v1/catalogs",
      );
      return data;
    },
  });
}

export function useCatalog(name: string) {
  return useQuery<CatalogDetail>({
    queryKey: ["catalogs", name],
    queryFn: async () => {
      const { data } = await apiClient.get<CatalogDetail>(
        `/api/v1/catalogs/${encodeURIComponent(name)}`,
      );
      return data;
    },
    enabled: !!name,
  });
}
