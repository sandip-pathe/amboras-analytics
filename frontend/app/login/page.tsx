"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { postToken } from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [storeId, setStoreId] = useState("store_alpha");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await postToken(storeId.trim());
      login(response.access_token);
      router.push("/dashboard");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Login failed";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-4 py-10 text-zinc-100">
      <section className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950/70 p-8 shadow-[0_20px_50px_rgba(0,0,0,0.45)]">
        <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">
          Amboras
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-white">Store Access</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Dev login uses only store ID. No password is required in this demo.
        </p>

        <form className="mt-8 space-y-4" onSubmit={onSubmit}>
          <label className="block text-sm text-zinc-400" htmlFor="storeId">
            Store ID
          </label>
          <input
            id="storeId"
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
            className="w-full rounded-lg border border-zinc-800 bg-black px-3 py-2 text-zinc-100 outline-none transition focus:border-zinc-600"
            placeholder="store_alpha"
            required
          />
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-100 px-3 py-2 text-sm font-medium text-black transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoading ? "Signing in..." : "Generate Access Token"}
          </button>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
        </form>
      </section>
    </main>
  );
}
