"use client";

import { useMemo, useSyncExternalStore } from "react";

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

const TOKEN_KEY = "amboras_token";
const AUTH_CHANGED_EVENT = "amboras-auth-changed";

function getTokenSnapshot(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return localStorage.getItem(TOKEN_KEY);
}

function subscribeToToken(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handler = () => onStoreChange();
  window.addEventListener("storage", handler);
  window.addEventListener(AUTH_CHANGED_EVENT, handler);

  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(AUTH_CHANGED_EVENT, handler);
  };
}

export function useAuth(): AuthState {
  const token = useSyncExternalStore(
    subscribeToToken,
    getTokenSnapshot,
    () => null,
  );

  const storeId = useMemo(() => (token ? decodeStoreId(token) : null), [token]);

  const login = (newToken: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(TOKEN_KEY, newToken);
      window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
    }
  };

  const logout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
    }
  };

  return { token, storeId, login, logout };
}
