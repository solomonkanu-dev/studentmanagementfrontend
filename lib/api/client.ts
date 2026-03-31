import axios from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1";

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Attach JWT on every request
apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Auth endpoints are allowed to return 401 as normal business logic
// (bad credentials, expired token during logout). Triggering the global
// redirect handler for those would cause hard-reload loops and prevent
// error messages from ever reaching the login form.
const AUTH_PATHS = ["/auth/login", "/auth/logout", "/super-admin/super-admin/login"];

// Global response error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl: string = error.config?.url ?? "";
    const isAuthEndpoint = AUTH_PATHS.some((path) => requestUrl.includes(path));

    if (error.response?.status === 403 && error.response?.data?.message === "Account has been suspended") {
      if (typeof window !== "undefined") {
        window.location.href = "/suspended";
      }
    }

    if (error.response?.status === 401 && !isAuthEndpoint) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);
