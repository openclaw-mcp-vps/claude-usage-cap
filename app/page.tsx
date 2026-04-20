import Link from "next/link";
import { AlertTriangle, BadgeDollarSign, Lock, ShieldAlert } from "lucide-react";
import { LandingAuthCard } from "@/components/LandingAuthCard";

const faqs = [
  {
    q: "Does this replace my Anthropic account?",
    a: "No. Claude Usage Cap is a thin proxy that sits in front of Anthropic. Your existing API key remains yours and can be rotated at any time."
  },
  {
    q: "What happens when a cap is hit?",
    a: "The proxy starts returning HTTP 429 for that project until the next cap window resets. A Slack alert is sent immediately so your team can investigate."
  },
  {
    q: "Can I set different caps per environment?",
    a: "Yes. Create separate projects for prod, staging, and experiments. Each project gets its own proxy key and budget profile."
  },
  {
    q: "Is this useful for teams?",
    a: "Yes. Founders and engineering teams use it to keep side projects, cron jobs, and eval runs from draining the core budget."
  }
];

export default function HomePage() {
  return (
    <main className="mx-auto max-w-6xl px-6 pb-24 pt-10 md:px-10">
      <header className="mb-14 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-emerald-400">AI Cost Tools</p>
          <h1 className="text-2xl font-semibold">Claude Usage Cap</h1>
        </div>
        <Link
          href="/dashboard"
          className="rounded-md border border-emerald-500/50 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20"
        >
          Open Dashboard
        </Link>
      </header>

      <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/50 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">
            <ShieldAlert className="h-3.5 w-3.5" />
            Spend guardrails for Claude API
          </p>
          <h2 className="max-w-xl text-4xl font-semibold leading-tight md:text-5xl">
            Per-project budget caps with automatic cutoff before bugs burn your wallet.
          </h2>
          <p className="mt-5 max-w-xl text-base text-slate-300 md:text-lg">
            Register your Anthropic key once, route requests through a proxy key, and enforce strict daily,
            weekly, and monthly USD caps. If usage crosses the line, requests stop instantly and Slack gets the
            alert.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <a
              href="#pricing"
              className="rounded-md bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
            >
              Start for $15/mo
            </a>
            <a
              href="#problem"
              className="rounded-md border border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-slate-500"
            >
              See how it works
            </a>
          </div>
          <div className="mt-9 grid gap-3 text-sm text-slate-400 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
              <p className="text-xl font-semibold text-slate-100">429</p>
              <p>Auto-block when cap is exceeded</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
              <p className="text-xl font-semibold text-slate-100">Slack</p>
              <p>Immediate spend-limit alerts</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
              <p className="text-xl font-semibold text-slate-100">3 windows</p>
              <p>Daily, weekly, monthly caps</p>
            </div>
          </div>
        </div>
        <LandingAuthCard />
      </section>

      <section id="problem" className="mt-24">
        <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">The Problem</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <article className="rounded-xl border border-red-500/30 bg-red-500/10 p-5">
            <h4 className="flex items-center gap-2 text-lg font-semibold text-red-300">
              <AlertTriangle className="h-5 w-5" />
              Runaway workloads
            </h4>
            <p className="mt-2 text-sm text-red-100/80">
              One retry loop, one runaway worker, or one broken eval can quietly burn hundreds of dollars overnight
              before anyone notices.
            </p>
          </article>
          <article className="rounded-xl border border-red-500/30 bg-red-500/10 p-5">
            <h4 className="flex items-center gap-2 text-lg font-semibold text-red-300">
              <BadgeDollarSign className="h-5 w-5" />
              No built-in hard caps
            </h4>
            <p className="mt-2 text-sm text-red-100/80">
              Anthropic usage dashboards are useful, but they do not stop traffic instantly at a strict project-level
              dollar limit.
            </p>
          </article>
        </div>
      </section>

      <section className="mt-20">
        <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">The Solution</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <article className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
            <p className="text-lg font-semibold">1. Register project + key</p>
            <p className="mt-2 text-sm text-slate-400">Store your Anthropic key once and issue a dedicated proxy key.</p>
          </article>
          <article className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
            <p className="text-lg font-semibold">2. Set hard spend limits</p>
            <p className="mt-2 text-sm text-slate-400">Define max USD spend per day, week, and month for each project.</p>
          </article>
          <article className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
            <p className="text-lg font-semibold">3. Cut off + alert</p>
            <p className="mt-2 text-sm text-slate-400">Proxy returns 429 immediately at limit and sends Slack alert context.</p>
          </article>
        </div>
      </section>

      <section id="pricing" className="mt-20 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8">
        <p className="text-sm uppercase tracking-[0.16em] text-emerald-300">Pricing</p>
        <h3 className="mt-2 text-3xl font-semibold">$15 per project / month</h3>
        <p className="mt-3 max-w-2xl text-sm text-emerald-100/90">
          Cheap insurance against expensive accidents. One prevented runaway job pays for the year. Includes proxy,
          per-project caps, usage visibility, and alerting.
        </p>
        <div className="mt-5 flex items-center gap-3 text-sm text-emerald-100">
          <Lock className="h-4 w-4" />
          Tool access unlocks only after checkout. Authentication + paid cookie required.
        </div>
      </section>

      <section className="mt-20">
        <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">FAQ</h3>
        <div className="mt-4 grid gap-3">
          {faqs.map((item) => (
            <article key={item.q} className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
              <h4 className="text-base font-semibold">{item.q}</h4>
              <p className="mt-1 text-sm text-slate-400">{item.a}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
