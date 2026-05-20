"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { User } from "@/types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (builderId: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  feishuLogin: () => Promise<void>;
  feishuBind: (builderId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/api/user/me");
      if (res.ok) {
        const json = await res.json();
        if (json.ok) {
          setUser(json.data);
          return;
        }
      }
      setUser(null);
    } catch {
      setUser(null);
    }
  }, []);

  // 首次加载时检查登录态
  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  const login = useCallback(async (builderId: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ builderId }),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => null);
      throw new Error(json?.error ?? "登录失败");
    }

    const userData: User = await res.json();
    setUser(userData);
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/login", { method: "DELETE" });
    setUser(null);
  }, []);

  const feishuLogin = useCallback(async () => {
    const res = await fetch("/api/auth/feishu/url");
    if (!res.ok) throw new Error("获取飞书授权地址失败");
    const json = await res.json();
    if (!json.ok) throw new Error(json.error ?? "获取飞书授权地址失败");
    window.location.href = json.data.url;
  }, []);

  const feishuBind = useCallback(async (builderId: string) => {
    const res = await fetch("/api/auth/feishu/bind", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ builderId }),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => null);
      throw new Error(json?.error ?? "绑定失败");
    }

    const userData: User = await res.json();
    setUser(userData);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, login, logout, refreshUser, feishuLogin, feishuBind }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
