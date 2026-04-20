"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type AuthMode = "login" | "register";

export function LandingAuthCard() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          action: mode,
          email,
          password
        })
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Authentication failed");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unexpected error");
    } finally {
      setPending(false);
    }
  }

  return (
    <aside className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-emerald-500/10">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Create account</p>
      <h3 className="mt-2 text-2xl font-semibold">Protect your Claude budget today</h3>
      <p className="mt-2 text-sm text-slate-400">Set up in under two minutes. No changes to your Anthropic account.</p>

      <div className="mt-5 grid grid-cols-2 rounded-lg border border-slate-700 p-1 text-sm">
        <button
          type="button"
          onClick={() => setMode("register")}
          className={`rounded-md px-3 py-2 transition ${
            mode === "register"
              ? "bg-emerald-500 text-slate-950"
              : "text-slate-300 hover:bg-slate-800 hover:text-slate-100"
          }`}
        >
          Register
        </button>
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`rounded-md px-3 py-2 transition ${
            mode === "login"
              ? "bg-emerald-500 text-slate-950"
              : "text-slate-300 hover:bg-slate-800 hover:text-slate-100"
          }`}
        >
          Log in
        </button>
      </div>

      <form onSubmit={onSubmit} className="mt-5 space-y-3">
        <label className="block text-sm text-slate-300">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none ring-0 transition focus:border-emerald-500"
            placeholder="you@company.com"
          />
        </label>
        <label className="block text-sm text-slate-300">
          Password
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none ring-0 transition focus:border-emerald-500"
            placeholder="At least 8 characters"
          />
        </label>

        {error ? <p className="text-sm text-red-400">{error}</p> : null}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending ? "Working..." : mode === "register" ? "Create account" : "Log in"}
        </button>
      </form>

      <p className="mt-4 text-xs text-slate-500">
        After sign-in, billing unlocks the tool via Lemon Squeezy. Project proxy access requires an active paid cookie.
      </p>
    </aside>
  );
}
