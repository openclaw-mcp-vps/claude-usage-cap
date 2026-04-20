"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ProjectSettings } from "@/components/ProjectSettings";
import { UsageChart } from "@/components/UsageChart";

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

type UsagePayload = {
  project: {
    id: string;
    name: string;
    caps: {
      daily: number;
      weekly: number;
      monthly: number;
    };
  };
  spend: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  series: Array<{ day: string; spend: number }>;
};

export default function ProjectPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const projectId = params.id;

  const [project, setProject] = useState<Project | null>(null);
  const [usage, setUsage] = useState<UsagePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!projectId) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [projectRes, usageRes] = await Promise.all([
        fetch(`/api/projects?id=${encodeURIComponent(projectId)}`, { cache: "no-store" }),
        fetch(`/api/usage?projectId=${encodeURIComponent(projectId)}&days=45`, { cache: "no-store" })
      ]);

      if (!projectRes.ok) {
        if (projectRes.status === 402) {
          router.push("/dashboard?billing=required");
          return;
        }
        setError("Project not found.");
        return;
      }

      if (!usageRes.ok) {
        setError("Could not load usage data.");
        return;
      }

      const projectPayload = (await projectRes.json()) as { project: Project };
      const usagePayload = (await usageRes.json()) as UsagePayload;

      setProject(projectPayload.project);
      setUsage(usagePayload);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Unexpected load error");
    } finally {
      setLoading(false);
    }
  }, [projectId, router]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-10 md:px-10">
        <p className="text-sm text-slate-400">Loading project...</p>
      </main>
    );
  }

  if (error || !project || !usage) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-10 md:px-10">
        <Link href="/dashboard" className="text-sm text-emerald-300 hover:text-emerald-200">
          ← Back to dashboard
        </Link>
        <p className="mt-6 text-sm text-red-400">{error ?? "Project could not be loaded."}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-6 py-10 md:px-10">
      <header>
        <Link href="/dashboard" className="text-sm text-emerald-300 hover:text-emerald-200">
          ← Back to dashboard
        </Link>
        <h1 className="mt-3 text-3xl font-semibold">{project.name}</h1>
        <p className="mt-1 text-sm text-slate-400">Proxy key prefix: {project.proxyKeyPrefix}…</p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Daily spend</p>
          <p className="mt-2 text-2xl font-semibold">${usage.spend.daily.toFixed(4)}</p>
          <p className="text-xs text-slate-500">Cap ${usage.project.caps.daily.toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Weekly spend</p>
          <p className="mt-2 text-2xl font-semibold">${usage.spend.weekly.toFixed(4)}</p>
          <p className="text-xs text-slate-500">Cap ${usage.project.caps.weekly.toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Monthly spend</p>
          <p className="mt-2 text-2xl font-semibold">${usage.spend.monthly.toFixed(4)}</p>
          <p className="text-xs text-slate-500">Cap ${usage.project.caps.monthly.toFixed(2)}</p>
        </div>
      </section>

      <UsageChart data={usage.series} dailyCapUsd={usage.project.caps.daily} />

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
        <h2 className="text-lg font-semibold">Proxy endpoint</h2>
        <p className="mt-2 text-sm text-slate-400">
          Route requests to <code>/api/proxy</code> using your proxy key as Bearer auth. When caps are exceeded,
          responses switch to <code>429</code> automatically.
        </p>
        <pre className="mt-3 overflow-x-auto rounded-md border border-slate-800 bg-slate-950 p-3 text-xs text-slate-300">
{`curl https://your-domain.com/api/proxy \\
  -H "Authorization: Bearer YOUR_PROXY_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "claude-3-5-sonnet-latest",
    "max_tokens": 512,
    "messages": [{"role":"user","content":"Summarize this log file"}]
  }'`}
        </pre>
      </section>

      <ProjectSettings
        mode="edit"
        project={project}
        onSaved={(result) => {
          setProject(result.project);
          void fetchAll();
        }}
      />
    </main>
  );
}
