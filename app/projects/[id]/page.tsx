import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ProjectSettings } from "@/components/ProjectSettings";
import { UsageChart } from "@/components/UsageChart";
import { getSessionFromServerCookies } from "@/lib/auth";
import { hasActiveSubscription } from "@/lib/lemonsqueezy";
import { getProjectForOwner } from "@/lib/projects";
import {
  evaluateCapStatus,
  getDailyUsageSeries,
  getUsageTotals
} from "@/lib/usage-tracker";

export const dynamic = "force-dynamic";

export default async function ProjectPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSessionFromServerCookies();

  if (!session) {
    redirect("/");
  }

  const activeSubscription = await hasActiveSubscription(session.email);

  if (!activeSubscription) {
    redirect(`/?email=${encodeURIComponent(session.email)}`);
  }

  const resolvedParams = await params;
  const project = await getProjectForOwner(session.email, resolvedParams.id);

  if (!project) {
    notFound();
  }

  const [totals, series] = await Promise.all([
    getUsageTotals(project.id),
    getDailyUsageSeries(project.id, 30)
  ]);

  const capStatus = evaluateCapStatus(project, totals);

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 pb-16 pt-10 md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/dashboard" className="text-sm text-[#9ca3af] transition hover:text-[#22c55e]">
            ← Back to dashboard
          </Link>
          <h1 className="mt-2 text-3xl font-bold">{project.name}</h1>
        </div>
      </div>

      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[#1f2937] bg-[#111827]/80 p-4">
          <div className="text-xs uppercase tracking-wide text-[#9ca3af]">Today</div>
          <div className="mt-2 text-2xl font-bold">${totals.day.toFixed(3)}</div>
          <div className="mt-1 text-xs text-[#9ca3af]">Cap ${project.dailyCapUsd.toFixed(2)}</div>
        </div>

        <div className="rounded-xl border border-[#1f2937] bg-[#111827]/80 p-4">
          <div className="text-xs uppercase tracking-wide text-[#9ca3af]">This Week</div>
          <div className="mt-2 text-2xl font-bold">${totals.week.toFixed(3)}</div>
          <div className="mt-1 text-xs text-[#9ca3af]">Cap ${project.weeklyCapUsd.toFixed(2)}</div>
        </div>

        <div className="rounded-xl border border-[#1f2937] bg-[#111827]/80 p-4">
          <div className="text-xs uppercase tracking-wide text-[#9ca3af]">This Month</div>
          <div className="mt-2 text-2xl font-bold">${totals.month.toFixed(3)}</div>
          <div className="mt-1 text-xs text-[#9ca3af]">Cap ${project.monthlyCapUsd.toFixed(2)}</div>
        </div>
      </section>

      {capStatus.exceeded.length > 0 ? (
        <div className="mt-4 rounded-xl border border-[#7f1d1d] bg-[#450a0a]/50 p-4 text-sm text-[#fca5a5]">
          Proxy is currently blocking requests. Exceeded windows:{" "}
          {capStatus.exceeded.map((entry) => entry.window).join(", ")}.
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-[#14532d] bg-[#052e16]/40 p-4 text-sm text-[#bbf7d0]">
          Proxy is active. Remaining budget: Day ${capStatus.remaining.day.toFixed(2)}, Week $
          {capStatus.remaining.week.toFixed(2)}, Month ${capStatus.remaining.month.toFixed(2)}.
        </div>
      )}

      <section className="mt-6 grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        <UsageChart data={series} />
        <ProjectSettings project={project} />
      </section>
    </main>
  );
}
