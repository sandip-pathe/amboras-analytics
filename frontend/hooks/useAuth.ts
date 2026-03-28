"use client";

import { useMemo, useState } from "react";

type AuthState = {
  token: string | null;
  storeId: string | null;
  login: (newToken: string) => void;
  logout: () => void;
};

type JwtPayload = {
  sub?: string;
  storeId?: string;
};

function decodeStoreId(token: string): string | null {
  try {
    const payload = token.split(".")[1];
    const parsed = JSON.parse(
      atob(payload.replace(/-/g, "+").replace(/_/g, "/")),
    ) as JwtPayload;
    return parsed.storeId ?? parsed.sub ?? null;
  } catch {
    return null;
  }
}

export function useAuth(): AuthState {
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }

    return localStorage.getItem("amboras_token");
  });

  const storeId = useMemo(() => (token ? decodeStoreId(token) : null), [token]);

  const login = (newToken: string) => {
    localStorage.setItem("amboras_token", newToken);
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem("amboras_token");
    setToken(null);
  };

  return { token, storeId, login, logout };
}
