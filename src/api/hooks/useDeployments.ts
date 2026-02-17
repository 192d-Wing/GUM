// Copyright 2026 U.S. Federal Government (in countries where recognized)
// SPDX-License-Identifier: Apache-2.0

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "../client";
import type {
  Deployment,
  CreateDeploymentRequest,
  UpdateDeploymentRequest,
} from "../types";

export function useDeployments() {
  return useQuery<Deployment[]>({
    queryKey: ["deployments"],
    queryFn: async () => {
      const { data } = await apiClient.get<Deployment[]>("/api/v1/deployments");
      return data;
    },
  });
}

export function useDeployment(id: string) {
  return useQuery<Deployment>({
    queryKey: ["deployments", id],
    queryFn: async () => {
      const { data } = await apiClient.get<Deployment>(
        `/api/v1/deployments/${encodeURIComponent(id)}`,
      );
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateDeployment() {
  const queryClient = useQueryClient();
  return useMutation<Deployment, Error, CreateDeploymentRequest>({
    mutationFn: async (body) => {
      const { data } = await apiClient.post<Deployment>(
        "/api/v1/deployments",
        body,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deployments"] });
      queryClient.invalidateQueries({ queryKey: ["fleet", "health"] });
    },
  });
}

export function useUpdateDeployment() {
  const queryClient = useQueryClient();
  return useMutation<
    Deployment,
    Error,
    { id: string; body: UpdateDeploymentRequest }
  >({
    mutationFn: async ({ id, body }) => {
      const { data } = await apiClient.put<Deployment>(
        `/api/v1/deployments/${encodeURIComponent(id)}`,
        body,
      );
      return data;
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["deployments"] });
      queryClient.invalidateQueries({ queryKey: ["deployments", id] });
    },
  });
}

export function useDeleteDeployment() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await apiClient.delete(`/api/v1/deployments/${encodeURIComponent(id)}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deployments"] });
      queryClient.invalidateQueries({ queryKey: ["fleet", "health"] });
    },
  });
}
