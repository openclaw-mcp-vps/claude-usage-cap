"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LogOut, Sparkles } from "lucide-react";
import { ProjectSettings } from "@/components/ProjectSettings";

type User = {
  id: number;
  email: string;
  paid: boolean;
};

type Project = {
  id: string;
  name: string;
  proxyKeyPrefix: string;
  dailyCapUsd: number;
  weeklyCapUsd: number;
  monthlyCapUsd: number;
  slackWebhookUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

declare global {
  interface Window {
    LemonSqueezy?: {
      Url?: {
        Open: (url: string) => void;
      };
    };
  }
}

export default function DashboardPage() {
  const router = useRouter();
  const [checkoutToken, setCheckoutToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingPending, setBillingPending] = useState(false);
  const [billingMessage, setBillingMessage] = useState<string | null>(null);
  const [billingError, setBillingError] = useState<string | null>(null);

  const paid = Boolean(user?.paid);

  const fetchSession = useCallback(async () => {
    const response = await fetch("/api/auth", { cache: "no-store" });
    const payload = (await response.json()) as { user: User | null };
    setUser(payload.user);

    if (!payload.user) {
      router.push("/");
      return null;
    }

    return payload.user;
  }, [router]);

  const fetchProjects = useCallback(async () => {
    const response = await fetch("/api/projects", { cache: "no-store" });
    const payload = (await response.json()) as { projects?: Project[] };

    if (response.ok && payload.projects) {
      setProjects(payload.projects);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("checkout");
    if (token) {
      setCheckoutToken(token);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      const currentUser = await fetchSession();
      if (!mounted || !currentUser) {
        setLoading(false);
        return;
      }

      if (currentUser.paid) {
        await fetchProjects();
      }

      setLoading(false);
    }

    void load();

    return () => {
      mounted = false;
    };
  }, [fetchProjects, fetchSession]);

  useEffect(() => {
    if (!checkoutToken || !user || user.paid) {
      return;
    }

    let cancelled = false;

    async function verify() {
      setBillingPending(true);
      setBillingMessage("Verifying payment...");
      setBillingError(null);

      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "verifyCheckout", checkoutToken })
      });

      const payload = (await response.json()) as { paid?: boolean; reason?: string };

      if (cancelled) {
        return;
      }

      if (response.ok && payload.paid) {
        setBillingMessage("Payment verified. Tool access unlocked.");
        const updatedUser = await fetchSession();
        if (updatedUser?.paid) {
          await fetchProjects();
        }
      } else {
        setBillingMessage(null);
        setBillingError(payload.reason ?? "Payment still pending. Wait for webhook confirmation.");
      }

      setBillingPending(false);
    }

    void verify();

    return () => {
      cancelled = true;
    };
  }, [checkoutToken, fetchProjects, fetchSession, user]);

  const projectCards = useMemo(() => {
    if (!projects.length) {
      return (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-400">
          No projects yet. Create one to issue a proxy key and start enforcing spend caps.
        </div>
      );
    }

    return (
      <div className="grid gap-4 md:grid-cols-2">
        {projects.map((project) => (
          <Link
            href={`/projects/${project.id}`}
            key={project.id}
            className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-emerald-500/50"
          >
            <h3 className="text-lg font-semibold">{project.name}</h3>
            <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-500">{project.proxyKeyPrefix}…</p>
            <p className="mt-3 text-sm text-slate-300">Daily: ${project.dailyCapUsd.toFixed(2)}</p>
            <p className="text-sm text-slate-300">Weekly: ${project.weeklyCapUsd.toFixed(2)}</p>
            <p className="text-sm text-slate-300">Monthly: ${project.monthlyCapUsd.toFixed(2)}</p>
          </Link>
        ))}
      </div>
    );
  }, [projects]);

  async function startCheckout() {
    setBillingPending(true);
    setBillingError(null);
    setBillingMessage(null);

    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "startCheckout" })
      });

      const payload = (await response.json()) as {
        checkoutUrl?: string;
        error?: string;
      };

      if (!response.ok || !payload.checkoutUrl) {
        setBillingError(payload.error ?? "Could not initialize checkout");
        return;
      }

      const overlay = window.LemonSqueezy?.Url?.Open;
      if (overlay) {
        overlay(payload.checkoutUrl);
      } else {
        window.open(payload.checkoutUrl, "_blank", "noopener,noreferrer");
      }

      setBillingMessage("Checkout opened. Finish payment and return to this page.");
    } catch (error) {
      setBillingError(error instanceof Error ? error.message : "Checkout error");
    } finally {
      setBillingPending(false);
    }
  }

  async function logout() {
    await fetch("/api/auth", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "logout" })
    });

    router.push("/");
    router.refresh();
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-12 md:px-10">
        <p className="text-sm text-slate-400">Loading dashboard...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 md:px-10">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.16em] text-emerald-300">Claude Usage Cap</p>
          <h1 className="text-3xl font-semibold">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-400">Signed in as {user?.email}</p>
        </div>
        <button
          onClick={logout}
          className="inline-flex items-center gap-2 rounded-md border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500"
        >
          <LogOut className="h-4 w-4" />
          Log out
        </button>
      </header>

      {!paid ? (
        <section className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6">
          <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-emerald-300">
            <Sparkles className="h-4 w-4" />
            Upgrade required
          </p>
          <h2 className="mt-2 text-2xl font-semibold">Unlock project controls for $15/project/month</h2>
          <p className="mt-2 max-w-2xl text-sm text-emerald-100/90">
            Checkout activates your paid cookie, enabling project creation, proxy key issuance, and enforced spend caps.
          </p>
          <button
            onClick={startCheckout}
            disabled={billingPending}
            className="mt-4 rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {billingPending ? "Opening checkout..." : "Open Lemon Squeezy Checkout"}
          </button>
          {billingMessage ? <p className="mt-3 text-sm text-emerald-300">{billingMessage}</p> : null}
          {billingError ? <p className="mt-3 text-sm text-red-300">{billingError}</p> : null}
        </section>
      ) : (
        <section className="space-y-8">
          <ProjectSettings
            mode="create"
            onSaved={(result) => {
              setProjects((prev) => [result.project, ...prev.filter((item) => item.id !== result.project.id)]);
            }}
          />

          <section>
            <h2 className="mb-4 text-xl font-semibold">Your Projects</h2>
            {projectCards}
          </section>
        </section>
      )}
    </main>
  );
}
