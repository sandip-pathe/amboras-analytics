"use client";

import { useEffect, useMemo, useState } from "react";

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

  useEffect(() => {
    const syncToken = (event: StorageEvent) => {
      if (event.key === "amboras_token") {
        setToken(event.newValue);
      }
    };

    window.addEventListener("storage", syncToken);
    return () => {
      window.removeEventListener("storage", syncToken);
    };
  }, []);

  const login = (newToken: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("amboras_token", newToken);
    }
    setToken(newToken);
  };

  const logout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("amboras_token");
    }
    setToken(null);
  };

  return { token, storeId, login, logout };
}
