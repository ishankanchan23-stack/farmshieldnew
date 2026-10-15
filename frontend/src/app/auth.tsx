import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { apiClient } from "../lib/api";
import type { User } from "../types";
import { AuthContext } from "./auth-context";
import type { AuthValue } from "./auth-context";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(() => Boolean(sessionStorage.getItem("farmshield_token")));

  useEffect(() => {
    if (!sessionStorage.getItem("farmshield_token")) return;
    let active = true;
    apiClient.me().then((currentUser) => { if (active) setUser(currentUser); })
      .catch(() => { sessionStorage.removeItem("farmshield_token"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const value = useMemo<AuthValue>(() => ({
    user,
    loading,
    async login(email, password) {
      const result = await apiClient.login(email, password);
      sessionStorage.setItem("farmshield_token", result.access_token);
      setUser(result.user);
    },
    async register(name, email, password) {
      const result = await apiClient.register(name, email, password);
      sessionStorage.setItem("farmshield_token", result.access_token);
      setUser(result.user);
    },
    async logout() {
      try {
        if (user) await apiClient.logout();
      } finally {
        sessionStorage.removeItem("farmshield_token");
        setUser(null);
      }
    },
  }), [loading, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
