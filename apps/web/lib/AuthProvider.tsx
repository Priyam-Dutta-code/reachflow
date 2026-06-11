"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import * as authClient from "@/lib/auth-client";
import type { ApiUser } from "@/lib/auth-client";

type AuthContextType = {
  user: ApiUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<ApiUser>;
  register: (payload: { name: string; email: string; password: string; vertical?: string }) => Promise<ApiUser>;
  logout: () => Promise<void>;
  /** Re-fetch /me (after profile changes). */
  reload: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {
    throw new Error("AuthProvider missing");
  },
  register: async () => {
    throw new Error("AuthProvider missing");
  },
  logout: async () => {},
  reload: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // restore the session from the refresh cookie on first load
    authClient
      .refresh()
      .then((restored) => setUser(restored))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const loggedIn = await authClient.login(email, password);
    setUser(loggedIn);
    return loggedIn;
  }, []);

  const register = useCallback(
    async (payload: { name: string; email: string; password: string; vertical?: string }) => {
      const registered = await authClient.register(payload);
      setUser(registered);
      return registered;
    },
    []
  );

  const logout = useCallback(async () => {
    await authClient.logout();
    setUser(null);
  }, []);

  const reload = useCallback(async () => {
    try {
      const me = await authClient.apiFetch<ApiUser>("/api/auth/me");
      setUser(me);
    } catch {
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, reload }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
