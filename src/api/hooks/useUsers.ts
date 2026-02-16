import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "../client";
import type {
  ListUsersResponse,
  CreateUserRequest,
  CreateUserResponse,
} from "../types";

export function useUsers() {
  return useQuery<ListUsersResponse>({
    queryKey: ["users"],
    queryFn: async () => {
      const { data } = await apiClient.get<ListUsersResponse>("/api/v1/users");
      return data;
    },
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation<CreateUserResponse, Error, CreateUserRequest>({
    mutationFn: async (body) => {
      const { data } = await apiClient.post<CreateUserResponse>(
        "/api/v1/users",
        body,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
