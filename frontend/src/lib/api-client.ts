import axios from "axios";
import { useAuthStore } from "@/store/auth-store";
import { useDemoStore } from "@/store/demo-store";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api",
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh access token on 401, retry once
let isRefreshing = false;
let refreshQueue: ((token: string) => void)[] = [];

api.interceptors.response.use(
  (response) => {
    // Demo mode: backend flags blocked writes — show the friendly dialog
    if (response.headers?.["x-demo-mode"] === "blocked") {
      try { useDemoStore.getState().showBlocked(); } catch { /* noop */ }
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      const { refreshToken, setAccessToken, logout } = useAuthStore.getState();

      if (!refreshToken) {
        logout();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve) => {
          refreshQueue.push((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"}/auth/refresh`,
          { refreshToken }
        );
        setAccessToken(data.accessToken);
        refreshQueue.forEach((cb) => cb(data.accessToken));
        refreshQueue = [];
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        logout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
