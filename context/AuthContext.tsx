"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { AuthUser, Role } from "@/lib/types";
import { authApi } from "@/lib/api/auth";
import { tokenStore } from "@/lib/api/tokenStore";

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string, asSuperAdmin?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  isRole: (...roles: Role[]) => boolean;
  updateUser: (patch: Partial<AuthUser>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from HttpOnly cookie on mount
  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then(({ token, user: storedUser }: { token: string | null; user: AuthUser | null }) => {
        if (token && storedUser) {
          tokenStore.set(token);
          setUser(storedUser);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(
    async (email: string, password: string, asSuperAdmin = false) => {
      const fn = asSuperAdmin ? authApi.superAdminLogin : authApi.login;
      const { token: newToken, user: newUser } = await fn({ email, password });

      // Persist token + user in HttpOnly cookies via the session route
      await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: newToken, user: newUser }),
      });

      tokenStore.set(newToken);
      setUser(newUser);
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Swallow — still clear local state
    } finally {
      await fetch("/api/auth/session", { method: "DELETE" }).catch(() => {});
      tokenStore.clear();
      setUser(null);
    }
  }, []);

  const isRole = useCallback(
    (...roles: Role[]) => !!user && roles.includes(user.role),
    [user]
  );

  const updateUser = useCallback((patch: Partial<AuthUser>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...patch };
      // Refresh the user cookie with updated data (fire-and-forget)
      fetch("/api/auth/session", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      }).catch(() => {});
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, isRole, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
