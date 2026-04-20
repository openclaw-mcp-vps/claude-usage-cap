import Link from "next/link";

import { LogoutButton } from "@/components/LogoutButton";
import { ProjectSettings } from "@/components/ProjectSettings";
import { UsageChart } from "@/components/UsageChart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listProjects } from "@/lib/db";
import { toPublicProject } from "@/lib/projects";
import { buildDailyUsageSeries, evaluateCapState, getCurrentSpend } from "@/lib/usage-tracker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const projects = listProjects().map(toPublicProject);

  const primaryProject = projects[0];
  const series = primaryProject ? buildDailyUsageSeries(primaryProject.id, 30) : [];
  const capStatus = primaryProject
    ? evaluateCapState({
        caps: {
          dailyCap: primaryProject.dailyCap,
          weeklyCap: primaryProject.weeklyCap,
          monthlyCap: primaryProject.monthlyCap
        },
        spend: getCurrentSpend(primaryProject.id)
      }).states
    : null;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-slate-400">Manage Claude proxy keys and keep every project within budget.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/" className="text-sm text-slate-300 hover:text-white">
            Public site
          </Link>
          <LogoutButton />
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <ProjectSettings />

        <Card>
          <CardHeader>
            <CardTitle className="text-white">30-day spend trend</CardTitle>
            <CardDescription>
              {primaryProject ? `Tracking ${primaryProject.name}` : "Create your first project to start recording usage."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {primaryProject ? <UsageChart data={series} /> : <p className="text-sm text-slate-400">No usage data yet.</p>}
            {capStatus ? (
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <CapSummary label="Daily" cap={capStatus.daily.cap} spent={capStatus.daily.spent} />
                <CapSummary label="Weekly" cap={capStatus.weekly.cap} spent={capStatus.weekly.spent} />
                <CapSummary label="Monthly" cap={capStatus.monthly.cap} spent={capStatus.monthly.spent} />
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {projects.map((project) => {
          const spend = getCurrentSpend(project.id);
          const status = evaluateCapState({
            caps: {
              dailyCap: project.dailyCap,
              weeklyCap: project.weeklyCap,
              monthlyCap: project.monthlyCap
            },
            spend
          }).states;

          return (
            <Card key={project.id}>
              <CardHeader>
                <CardTitle className="text-white">{project.name}</CardTitle>
                <CardDescription>
                  Proxy key suffix: <code>{project.proxyKeyHint}</code>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-slate-300">
                <p>
                  Caps: ${project.dailyCap.toFixed(2)} daily, ${project.weeklyCap.toFixed(2)} weekly, ${project.monthlyCap.toFixed(2)} monthly
                </p>
                <p>
                  Spend now: ${spend.daily.toFixed(2)} daily, ${spend.weekly.toFixed(2)} weekly, ${spend.monthly.toFixed(2)} monthly
                </p>
                <p>
                  Status: {status.daily.exceeded || status.weekly.exceeded || status.monthly.exceeded ? "Blocked" : "Active"}
                </p>
                <Link href={`/projects/${project.id}`} className="text-sky-300 hover:text-sky-200">
                  Open project details
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </section>
    </main>
  );
}

function CapSummary({ label, cap, spent }: { label: string; cap: number; spent: number }) {
  const remaining = Math.max(0, cap - spent);
  const percent = Math.min(100, (spent / cap) * 100);

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm text-slate-100">
        ${spent.toFixed(2)} / ${cap.toFixed(2)}
      </p>
      <div className="mt-2 h-1.5 rounded-full bg-slate-800">
        <div className="h-full rounded-full bg-sky-400" style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-1 text-xs text-slate-400">${remaining.toFixed(2)} remaining</p>
    </div>
  );
}
