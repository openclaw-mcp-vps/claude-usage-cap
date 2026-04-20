"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Copy, Trash2 } from "lucide-react";

import { LimitSettings } from "@/components/LimitSettings";
import { UsageChart } from "@/components/UsageChart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatUsd } from "@/lib/utils";

type ProjectDetail = {
  id: string;
  name: string;
  proxyKeyPrefix: string;
  caps: {
    dailyUsd: number;
    weeklyUsd: number;
    monthlyUsd: number;
  };
  totals: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  exceeded: "daily" | "weekly" | "monthly" | null;
  slackWebhookUrl: string | null;
  usageSeries: Array<{ date: string; costUsd: number }>;
  proxyEndpoint: string;
};

export default function ProjectPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadProject() {
    if (!params.id) {
      return;
    }

    const response = await fetch(`/api/projects?id=${params.id}`, { cache: "no-store" });
    const json = (await response.json()) as { project?: ProjectDetail; error?: string };

    if (!response.ok || !json.project) {
      setError(json.error || "Project not found.");
      setLoading(false);
      return;
    }

    setProject(json.project);
    setLoading(false);
  }

  useEffect(() => {
    void loadProject();
  }, [params.id]);

  const usageSnippet = useMemo(() => {
    if (!project) {
      return "";
    }

    return `curl ${project.proxyEndpoint} \\
  -H "x-proxy-key: <your-project-proxy-key>" \\
  -H "content-type: application/json" \\
  -d '{"model":"claude-3-5-sonnet-latest","max_tokens":400,"messages":[{"role":"user","content":"Hello"}]}'`;
  }, [project]);

  async function deleteProject() {
    if (!project) {
      return;
    }

    const confirmed = window.confirm(`Delete project \"${project.name}\"? This removes usage history and cannot be undone.`);

    if (!confirmed) {
      return;
    }

    const response = await fetch("/api/projects", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: project.id })
    });

    if (!response.ok) {
      const json = (await response.json()) as { error?: string };
      window.alert(json.error || "Failed to delete project.");
      return;
    }

    router.push("/dashboard");
  }

  async function copySnippet() {
    await navigator.clipboard.writeText(usageSnippet);
  }

  if (loading) {
    return <main className="mx-auto max-w-6xl px-6 py-12 text-sm text-[#9da7b3]">Loading project...</main>;
  }

  if (error || !project) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-12">
        <Card>
          <CardHeader>
            <CardTitle>Project unavailable</CardTitle>
            <CardDescription>{error || "Unable to load this project."}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard" className="text-sm text-[#2f81f7] hover:underline">
              Back to dashboard
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-6 py-10">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <Link href="/dashboard" className="inline-flex items-center text-sm text-[#9da7b3] hover:text-[#e6edf3]">
            <ArrowLeft size={14} className="mr-1" />
            Dashboard
          </Link>
          <h1 className="text-3xl font-semibold">{project.name}</h1>
          <p className="text-sm text-[#9da7b3]">Proxy key prefix: {project.proxyKeyPrefix}</p>
        </div>
        <Button variant="danger" onClick={deleteProject}>
          <Trash2 className="mr-2" size={16} />
          Delete project
        </Button>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Daily spend</CardDescription>
            <CardTitle>
              {formatUsd(project.totals.daily)} / {formatUsd(project.caps.dailyUsd)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Weekly spend</CardDescription>
            <CardTitle>
              {formatUsd(project.totals.weekly)} / {formatUsd(project.caps.weeklyUsd)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Monthly spend</CardDescription>
            <CardTitle>
              {formatUsd(project.totals.monthly)} / {formatUsd(project.caps.monthlyUsd)}
            </CardTitle>
          </CardHeader>
        </Card>
      </section>

      {project.exceeded ? (
        <Card className="border-[#f85149]">
          <CardContent className="pt-6 text-sm text-[#f85149]">
            Requests are currently blocked because the <strong>{project.exceeded}</strong> cap has been reached.
          </CardContent>
        </Card>
      ) : null}

      <UsageChart data={project.usageSeries} />

      <LimitSettings
        projectId={project.id}
        initial={{
          dailyUsd: project.caps.dailyUsd,
          weeklyUsd: project.caps.weeklyUsd,
          monthlyUsd: project.caps.monthlyUsd,
          slackWebhookUrl: project.slackWebhookUrl
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle>Proxy usage snippet</CardTitle>
          <CardDescription>
            Replace your direct Claude API call with this proxy endpoint and the project proxy key.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <pre className="overflow-x-auto rounded-md border border-[#30363d] bg-[#0d1117] p-3 text-xs text-[#9da7b3]">
            {usageSnippet}
          </pre>
          <Button variant="outline" onClick={copySnippet}>
            <Copy className="mr-2" size={16} />
            Copy snippet
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
