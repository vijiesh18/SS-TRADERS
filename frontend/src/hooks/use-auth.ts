import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useAuthStore, type AuthUser } from "@/store/auth-store";

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const { data } = await api.post<LoginResponse>("/auth/login", credentials);
      return data;
    },
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken, data.refreshToken);
    },
  });
}

export function useLogout() {
  const logout = useAuthStore((s) => s.logout);
  const refreshToken = useAuthStore((s) => s.refreshToken);

  return useMutation({
    mutationFn: async () => {
      await api.post("/auth/logout", { refreshToken });
    },
    onSettled: () => {
      logout();
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: async (email: string) => {
      const { data } = await api.post("/auth/forgot-password", { email });
      return data;
    },
  });
}
