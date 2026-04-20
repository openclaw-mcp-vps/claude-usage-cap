import Link from "next/link";
import { notFound } from "next/navigation";

import { UsageChart } from "@/components/UsageChart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getProjectById } from "@/lib/db";
import { toPublicProject } from "@/lib/projects";
import { buildDailyUsageSeries, evaluateCapState, getCurrentSpend } from "@/lib/usage-tracker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = getProjectById(id);

  if (!project) {
    notFound();
  }

  const publicProject = toPublicProject(project);
  const spend = getCurrentSpend(project.id);
  const status = evaluateCapState({
    caps: {
      dailyCap: publicProject.dailyCap,
      weeklyCap: publicProject.weeklyCap,
      monthlyCap: publicProject.monthlyCap
    },
    spend
  }).states;
  const chart = buildDailyUsageSeries(project.id, 30);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-6 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">{publicProject.name}</h1>
          <p className="text-sm text-slate-400">Project-level Claude API guardrails and usage details.</p>
        </div>
        <Link href="/dashboard" className="text-sm text-sky-300 hover:text-sky-200">
          Back to dashboard
        </Link>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <SpendCard label="Daily" cap={status.daily.cap} spent={status.daily.spent} exceeded={status.daily.exceeded} />
        <SpendCard label="Weekly" cap={status.weekly.cap} spent={status.weekly.spent} exceeded={status.weekly.exceeded} />
        <SpendCard label="Monthly" cap={status.monthly.cap} spent={status.monthly.spent} exceeded={status.monthly.exceeded} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-white">30-day usage</CardTitle>
          <CardDescription>Spend is calculated from Claude usage tokens and model rate cards.</CardDescription>
        </CardHeader>
        <CardContent>
          <UsageChart data={chart} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-white">Proxy integration</CardTitle>
          <CardDescription>Use your project proxy key from creation time as the request credential.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-300">
          <p>
            Endpoint: <code>/api/proxy</code>
          </p>
          <p>
            Header: <code>x-proxy-key: YOUR_PROXY_KEY</code>
          </p>
          <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/80 p-3 text-xs text-slate-200">
{`curl -X POST /api/proxy \\
  -H "content-type: application/json" \\
  -H "x-proxy-key: YOUR_PROXY_KEY" \\
  -d '{
    "model": "claude-3-7-sonnet-latest",
    "max_tokens": 512,
    "messages": [{ "role": "user", "content": "Summarize my logs" }]
  }'`}
          </pre>
          <p>
            Slack alerts are {publicProject.slackConfigured ? "configured" : "not configured"} for this project.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}

function SpendCard({
  label,
  cap,
  spent,
  exceeded
}: {
  label: string;
  cap: number;
  spent: number;
  exceeded: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label} window</CardDescription>
        <CardTitle className="text-white">
          ${spent.toFixed(2)} / ${cap.toFixed(2)}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className={exceeded ? "text-sm text-red-400" : "text-sm text-emerald-300"}>
          {exceeded ? "Cap reached, requests blocked." : "Within configured budget."}
        </p>
      </CardContent>
    </Card>
  );
}
