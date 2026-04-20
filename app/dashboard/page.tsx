import Link from "next/link";
import { redirect } from "next/navigation";
import { CreateProjectForm } from "@/components/CreateProjectForm";
import { LogoutButton } from "@/components/LogoutButton";
import { getSessionFromServerCookies } from "@/lib/auth";
import { hasActiveSubscription } from "@/lib/lemonsqueezy";
import { listProjectsForOwner } from "@/lib/projects";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSessionFromServerCookies();

  if (!session) {
    redirect("/");
  }

  const activeSubscription = await hasActiveSubscription(session.email);

  if (!activeSubscription) {
    redirect(`/?email=${encodeURIComponent(session.email)}`);
  }

  const projects = await listProjectsForOwner(session.email);

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 pb-16 pt-10 md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Usage Guardrail Dashboard</h1>
          <p className="mt-2 text-sm text-[#9ca3af]">
            Billing identity: <span className="font-mono">{session.email}</span>
          </p>
        </div>
        <LogoutButton />
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        <CreateProjectForm />

        <div className="rounded-2xl border border-[#1f2937] bg-[#111827]/80 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[#9ca3af]">
            Integrate Proxy Quickly
          </h2>
          <pre className="mt-4 overflow-x-auto rounded-lg border border-[#334155] bg-[#0f172a] p-4 text-xs text-[#cbd5e1]">
{`curl https://your-domain.com/api/proxy \\
  -H "Authorization: Bearer clawc_your_proxy_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "claude-sonnet-4-20250514",
    "max_tokens": 256,
    "messages": [{"role":"user","content":"Summarize this diff"}]
  }'`}
          </pre>
          <p className="mt-3 text-sm text-[#9ca3af]">
            The proxy enforces spend caps before forwarding to Anthropic and records usage per
            request.
          </p>
        </div>
      </div>

      <section className="mt-8 rounded-2xl border border-[#1f2937] bg-[#111827]/80 p-5">
        <h2 className="text-xl font-semibold">Projects</h2>
        {projects.length === 0 ? (
          <p className="mt-3 text-sm text-[#9ca3af]">
            No projects yet. Create one above to generate your first capped proxy key.
          </p>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="rounded-xl border border-[#334155] bg-[#0f172a] p-4 transition hover:border-[#22c55e]"
              >
                <h3 className="text-lg font-semibold">{project.name}</h3>
                <div className="mt-2 text-sm text-[#9ca3af]">Proxy key ends with {project.proxyKeyLast4}</div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-[#cbd5e1]">
                  <div className="rounded-lg border border-[#1f2937] px-2 py-1">
                    Day: ${project.dailyCapUsd.toFixed(2)}
                  </div>
                  <div className="rounded-lg border border-[#1f2937] px-2 py-1">
                    Week: ${project.weeklyCapUsd.toFixed(2)}
                  </div>
                  <div className="rounded-lg border border-[#1f2937] px-2 py-1">
                    Month: ${project.monthlyCapUsd.toFixed(2)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
