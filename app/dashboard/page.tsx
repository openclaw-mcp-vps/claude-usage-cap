"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { CreditCard, LogOut, Plus } from "lucide-react";

import { ProjectCard } from "@/components/ProjectCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SessionResponse = {
  authenticated: boolean;
  checkoutUrl: string | null;
  user: {
    id: string;
    email: string;
    isPaid: boolean;
    paidUntil: string | null;
  } | null;
};

type ProjectSummary = {
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
};

export default function DashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [anthropicApiKey, setAnthropicApiKey] = useState("");
  const [slackWebhookUrl, setSlackWebhookUrl] = useState("");
  const [dailyUsd, setDailyUsd] = useState("20");
  const [weeklyUsd, setWeeklyUsd] = useState("120");
  const [monthlyUsd, setMonthlyUsd] = useState("400");
  const [error, setError] = useState<string | null>(null);
  const [proxyOutput, setProxyOutput] = useState<string | null>(null);

  async function loadSession() {
    const response = await fetch("/api/auth", { cache: "no-store" });
    const json = (await response.json()) as SessionResponse;
    setSession(json);
    return json;
  }

  async function loadProjects() {
    const response = await fetch("/api/projects", { cache: "no-store" });

    if (!response.ok) {
      setProjects([]);
      return;
    }

    const json = (await response.json()) as { projects: ProjectSummary[] };
    setProjects(json.projects);
  }

  useEffect(() => {
    void (async () => {
      const nextSession = await loadSession();

      if (nextSession.authenticated && nextSession.user?.isPaid) {
        await loadProjects();
      }

      setLoading(false);
    })();
  }, []);

  const isPaid = useMemo(() => Boolean(session?.user?.isPaid), [session]);

  async function signOut() {
    await fetch("/api/auth", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "sign-out" })
    });

    router.push("/");
  }

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setError(null);
    setProxyOutput(null);

    const response = await fetch("/api/projects", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        name,
        anthropicApiKey,
        slackWebhookUrl: slackWebhookUrl || null,
        caps: {
          dailyUsd: Number(dailyUsd),
          weeklyUsd: Number(weeklyUsd),
          monthlyUsd: Number(monthlyUsd)
        }
      })
    });

    const json = (await response.json()) as {
      error?: string;
      proxyKey?: string;
      proxyEndpoint?: string;
    };

    if (!response.ok) {
      setError(json.error || "Unable to create project.");
      setCreating(false);
      return;
    }

    if (json.proxyKey && json.proxyEndpoint) {
      setProxyOutput(`Proxy endpoint: ${json.proxyEndpoint}\nProxy key: ${json.proxyKey}`);
    }

    setName("");
    setAnthropicApiKey("");
    setSlackWebhookUrl("");

    await loadProjects();
    setCreating(false);
  }

  if (loading) {
    return <main className="mx-auto max-w-6xl px-6 py-16 text-sm text-[#9da7b3]">Loading dashboard...</main>;
  }

  if (!session?.authenticated) {
    return (
      <main className="mx-auto max-w-xl px-6 py-16">
        <Card>
          <CardHeader>
            <CardTitle>Sign in required</CardTitle>
            <CardDescription>
              Open the landing page to sign in, then return here to manage projects and usage limits.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/")}>Go to landing page</Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!isPaid) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-12">
        <Card>
          <CardHeader>
            <CardTitle>Activate paid access</CardTitle>
            <CardDescription>
              The proxy tool is behind a paywall. Subscribe at $15/project/month to unlock project caps, proxy keys,
              usage charts, and Slack alerts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-[#9da7b3]">
              Signed in as <strong className="text-[#e6edf3]">{session.user?.email}</strong>
            </p>
            {session.checkoutUrl ? (
              <a
                href={session.checkoutUrl}
                className="lemonsqueezy-button inline-flex h-10 items-center justify-center rounded-md border border-[#3fb950] bg-[#238636] px-4 text-sm font-semibold text-[#f0f6fc] hover:bg-[#2ea043]"
              >
                <CreditCard className="mr-2" size={16} />
                Start subscription
              </a>
            ) : (
              <p className="text-sm text-[#f85149]">Checkout is not configured. Set Lemon Squeezy env variables.</p>
            )}
            <div>
              <Button variant="outline" onClick={() => router.push("/")}>Back to landing</Button>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl space-y-8 px-6 py-10">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Project Spend Dashboard</h1>
          <p className="text-sm text-[#9da7b3]">Create per-project Claude proxy keys with hard spending limits.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="inline-flex h-10 items-center rounded-md border border-[#30363d] px-3 text-sm hover:border-[#2f81f7]"
          >
            Landing
          </Link>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="mr-2" size={16} />
            Sign out
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Create project</CardTitle>
          <CardDescription>
            Add a project, store its Anthropic key securely, and define daily/weekly/monthly spending caps.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={createProject}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Project name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Customer onboarding worker"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="anthropicApiKey">Anthropic API key</Label>
                <Input
                  id="anthropicApiKey"
                  type="password"
                  value={anthropicApiKey}
                  onChange={(event) => setAnthropicApiKey(event.target.value)}
                  placeholder="sk-ant-..."
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="slackWebhookUrl">Slack webhook URL (optional)</Label>
              <Input
                id="slackWebhookUrl"
                value={slackWebhookUrl}
                onChange={(event) => setSlackWebhookUrl(event.target.value)}
                placeholder="https://hooks.slack.com/services/..."
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="dailyUsd">Daily cap (USD)</Label>
                <Input
                  id="dailyUsd"
                  inputMode="decimal"
                  value={dailyUsd}
                  onChange={(event) => setDailyUsd(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weeklyUsd">Weekly cap (USD)</Label>
                <Input
                  id="weeklyUsd"
                  inputMode="decimal"
                  value={weeklyUsd}
                  onChange={(event) => setWeeklyUsd(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="monthlyUsd">Monthly cap (USD)</Label>
                <Input
                  id="monthlyUsd"
                  inputMode="decimal"
                  value={monthlyUsd}
                  onChange={(event) => setMonthlyUsd(event.target.value)}
                  required
                />
              </div>
            </div>

            <Button type="submit" disabled={creating}>
              <Plus className="mr-2" size={16} />
              {creating ? "Creating..." : "Create project"}
            </Button>

            {error ? <p className="text-sm text-[#f85149]">{error}</p> : null}
            {proxyOutput ? (
              <pre className="overflow-x-auto rounded-md border border-[#30363d] bg-[#0d1117] p-3 text-xs text-[#9da7b3]">
                {proxyOutput}
              </pre>
            ) : null}
          </form>
        </CardContent>
      </Card>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.length === 0 ? (
          <Card className="sm:col-span-2 lg:col-span-3">
            <CardContent className="pt-6 text-sm text-[#9da7b3]">
              No projects yet. Create your first project to issue a proxy key and enforce hard spend limits.
            </CardContent>
          </Card>
        ) : (
          projects.map((project) => <ProjectCard key={project.id} project={project} />)
        )}
      </section>
    </main>
  );
}
