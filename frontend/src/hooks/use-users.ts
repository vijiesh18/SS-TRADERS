import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { Role } from "@/store/auth-store";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

export function useUsers() {
  return useQuery({
    queryKey: ["users", "list"],
    queryFn: async () => {
      const { data } = await api.get("/users");
      return data.items as AppUser[];
    },
  });
}

export interface CreateUserPayload {
  name: string;
  email: string;
  phone?: string;
  password: string;
  role: Role;
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateUserPayload) => {
      const { data } = await api.post("/users", payload);
      return data as AppUser;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export interface UpdateUserPayload {
  id: string;
  name?: string;
  phone?: string;
  role?: Role;
  isActive?: boolean;
  password?: string;
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdateUserPayload) => {
      const { data } = await api.put(`/users/${id}`, payload);
      return data as AppUser;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useDeactivateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/users/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
