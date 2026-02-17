import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "../client";
import type {
  ListUsersResponse,
  CreateUserRequest,
  CreateUserResponse,
} from "../types";
import { useDeploymentApiPrefix, useDeploymentId } from "../useDeploymentApi";

export function useUsers() {
  const prefix = useDeploymentApiPrefix();
  const deploymentId = useDeploymentId();

  return useQuery<ListUsersResponse>({
    queryKey: ["deployments", deploymentId, "users"],
    queryFn: async () => {
      const { data } = await apiClient.get<ListUsersResponse>(
        `${prefix}/api/v1/users`,
      );
      return data;
    },
  });
}

export function useCreateUser() {
  const prefix = useDeploymentApiPrefix();
  const deploymentId = useDeploymentId();
  const queryClient = useQueryClient();

  return useMutation<CreateUserResponse, Error, CreateUserRequest>({
    mutationFn: async (body) => {
      const { data } = await apiClient.post<CreateUserResponse>(
        `${prefix}/api/v1/users`,
        body,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["deployments", deploymentId, "users"],
      });
    },
  });
}
