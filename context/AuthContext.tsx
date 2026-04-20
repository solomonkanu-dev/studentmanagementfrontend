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

  // On mount: restore user from localStorage, then verify the session cookie
  // via /api/auth/me which also returns the token to populate the in-memory store.
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem("user");
      }
    }

    fetch("/api/auth/me")
      .then(async (res) => {
        if (!res.ok) {
          // Cookie expired or invalid — clear everything
          tokenStore.clear();
          localStorage.removeItem("user");
          setUser(null);
          return;
        }
        const { token } = await res.json();
        tokenStore.set(token);

        // Refresh user from backend so fields like institute.logo are always current
        const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1";
        return fetch(`${BASE_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then(async (r) => {
          if (!r.ok) return;
          const fresh = await r.json();
          const freshUser: AuthUser = { ...fresh, _id: fresh._id ?? fresh.id };
          localStorage.setItem("user", JSON.stringify(freshUser));
          setUser(freshUser);
        }).catch(() => { /* keep existing state */ });
      })
      .catch(() => {
        // Network error — keep whatever state we have and let API calls fail naturally
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const login = useCallback(
    async (email: string, password: string, asSuperAdmin = false) => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, asSuperAdmin }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Login failed");
      }

      const { user: rawUser, token } = await res.json();
      // Super admin login returns { id } while regular users have { _id }.
      // Normalise so all code can rely on _id.
      const newUser: AuthUser = { ...rawUser, _id: rawUser._id ?? rawUser.id };
      tokenStore.set(token);
      localStorage.setItem("user", JSON.stringify(newUser));
      setUser(newUser);
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Swallow — clear local state regardless
    } finally {
      tokenStore.clear();
      localStorage.removeItem("user");
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
      localStorage.setItem("user", JSON.stringify(updated));
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
