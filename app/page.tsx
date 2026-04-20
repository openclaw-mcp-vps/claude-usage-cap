import Link from "next/link";
import Script from "next/script";
import { Activity, AlertOctagon, BarChart3, ShieldAlert } from "lucide-react";
import { LandingAccess } from "@/components/LandingAccess";
import { getSessionFromServerCookies } from "@/lib/auth";
import { buildLemonCheckoutUrl } from "@/lib/lemonsqueezy";

export default async function HomePage() {
  const session = await getSessionFromServerCookies();
  const checkoutUrl = buildLemonCheckoutUrl(session?.email);

  return (
    <main className="min-h-screen">
      <Script src="https://app.lemonsqueezy.com/js/lemon.js" strategy="afterInteractive" />

      <section className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 pb-16 pt-14 md:px-6 md:pt-20">
        <div className="inline-flex w-fit rounded-full border border-[#1f2937] bg-[#0f172a]/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-[#22c55e]">
          ai-cost-tools
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div className="space-y-6">
            <h1 className="text-4xl font-bold leading-tight md:text-6xl">
              Claude Usage Cap
              <span className="block text-[#22c55e]">
                Per-project spend limits with automatic API cutoff
              </span>
            </h1>
            <p className="max-w-2xl text-lg leading-relaxed text-[#9ca3af]">
              Register your Anthropic key once, then route workloads through a protected proxy key
              with daily, weekly, and monthly budget caps. If a bug starts burning spend, requests
              stop with HTTP 429 and your Slack channel gets alerted instantly.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-lg border border-[#1f2937] bg-[#111827] px-3 py-2 text-sm text-[#cbd5e1]">
                $15 / project / month
              </div>
              <div className="rounded-lg border border-[#1f2937] bg-[#111827] px-3 py-2 text-sm text-[#cbd5e1]">
                Built for dev teams + SaaS founders
              </div>
            </div>
            {session ? (
              <Link
                href="/dashboard"
                className="inline-flex rounded-lg bg-[#22c55e] px-5 py-3 text-sm font-semibold text-[#04120a] transition hover:bg-[#16a34a]"
              >
                Open Dashboard
              </Link>
            ) : null}
          </div>

          <div className="rounded-2xl border border-[#1f2937] bg-[#111827]/80 p-6">
            <h2 className="text-xl font-semibold">A single runaway job can wipe margin overnight.</h2>
            <p className="mt-3 text-sm leading-relaxed text-[#9ca3af]">
              Anthropic does not provide hard per-key budget caps. Experimental batch jobs,
              incorrect retries, or malformed prompts can quietly consume hundreds of dollars while
              you sleep.
            </p>
            <ul className="mt-5 space-y-3 text-sm text-[#cbd5e1]">
              <li className="flex items-start gap-2">
                <AlertOctagon size={16} className="mt-0.5 text-[#ef4444]" />
                One failed worker loop can burn $500 before you notice.
              </li>
              <li className="flex items-start gap-2">
                <ShieldAlert size={16} className="mt-0.5 text-[#ef4444]" />
                Native provider keys have no per-project hard stop.
              </li>
              <li className="flex items-start gap-2">
                <BarChart3 size={16} className="mt-0.5 text-[#22c55e]" />
                Caps force deterministic cost ceilings for every environment.
              </li>
            </ul>
          </div>
        </div>

        {!session ? <LandingAccess checkoutUrl={checkoutUrl} /> : null}
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-4 px-4 pb-16 md:grid-cols-3 md:px-6">
        <div className="rounded-2xl border border-[#1f2937] bg-[#111827]/70 p-5">
          <Activity className="text-[#22c55e]" size={20} />
          <h3 className="mt-3 text-lg font-semibold">Proxy all Claude traffic</h3>
          <p className="mt-2 text-sm text-[#9ca3af]">
            Swap your Anthropic key in app code for a proxy key. No SDK rewrite required.
          </p>
        </div>

        <div className="rounded-2xl border border-[#1f2937] bg-[#111827]/70 p-5">
          <ShieldAlert className="text-[#22c55e]" size={20} />
          <h3 className="mt-3 text-lg font-semibold">Hard limit enforcement</h3>
          <p className="mt-2 text-sm text-[#9ca3af]">
            Daily, weekly, and monthly caps are enforced before each request. Exceeded projects are
            instantly blocked.
          </p>
        </div>

        <div className="rounded-2xl border border-[#1f2937] bg-[#111827]/70 p-5">
          <BarChart3 className="text-[#22c55e]" size={20} />
          <h3 className="mt-3 text-lg font-semibold">Spend telemetry you can act on</h3>
          <p className="mt-2 text-sm text-[#9ca3af]">
            Track usage by day and model. Slack alerts fire once per breached window to avoid noisy
            channels.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-16 md:px-6">
        <div className="rounded-2xl border border-[#1f2937] bg-[#111827]/70 p-6 md:p-8">
          <h2 className="text-2xl font-bold md:text-3xl">Pricing</h2>
          <p className="mt-3 max-w-3xl text-sm text-[#9ca3af]">
            Flat pricing that is trivial compared to a single runaway incident.
          </p>
          <div className="mt-6 max-w-md rounded-xl border border-[#14532d] bg-[#052e16]/40 p-5">
            <div className="text-sm uppercase tracking-widest text-[#86efac]">Starter Guardrail</div>
            <div className="mt-2 text-4xl font-bold text-[#e6edf3]">
              $15<span className="text-base text-[#9ca3af]">/project/mo</span>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-[#cbd5e1]">
              <li>Per-project daily/weekly/monthly spend caps</li>
              <li>Auto-cutoff with 429 responses at limit</li>
              <li>Slack cap-breach alerts</li>
              <li>Usage dashboard and trend charts</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-20 md:px-6">
        <div className="rounded-2xl border border-[#1f2937] bg-[#111827]/70 p-6 md:p-8">
          <h2 className="text-2xl font-bold md:text-3xl">FAQ</h2>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div>
              <h3 className="text-base font-semibold">Does this replace Anthropic billing?</h3>
              <p className="mt-2 text-sm text-[#9ca3af]">
                No. Anthropic still bills normally. Claude Usage Cap adds enforced project budgets
                before requests reach Anthropic.
              </p>
            </div>
            <div>
              <h3 className="text-base font-semibold">What happens when a cap is hit?</h3>
              <p className="mt-2 text-sm text-[#9ca3af]">
                The proxy returns HTTP 429, blocks further calls in that period, and sends one Slack
                alert for the breached window.
              </p>
            </div>
            <div>
              <h3 className="text-base font-semibold">Can I use separate caps per environment?</h3>
              <p className="mt-2 text-sm text-[#9ca3af]">
                Yes. Create separate projects for prod, staging, and experiments so each has its own
                proxy key and budget envelope.
              </p>
            </div>
            <div>
              <h3 className="text-base font-semibold">Do I need to modify existing app code?</h3>
              <p className="mt-2 text-sm text-[#9ca3af]">
                Minimal changes. Point your Claude client to `/api/proxy` and use your proxy key in
                the Authorization header.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
