"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, LineChart, Lock, ShieldAlert, Slack, Zap } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SessionResponse = {
  authenticated: boolean;
  checkoutUrl: string | null;
  user: {
    id: string;
    email: string;
    isPaid: boolean;
  } | null;
};

const faq = [
  {
    question: "How is spend calculated?",
    answer:
      "Every proxied Claude response reports token usage. We apply model-level per-million token pricing and store a per-request USD event so your daily, weekly, and monthly totals are exact and auditable."
  },
  {
    question: "What happens when a cap is hit?",
    answer:
      "The proxy immediately returns HTTP 429 with a cap error payload. It also sends one Slack alert per period so your team knows requests are blocked before costs grow further."
  },
  {
    question: "Can I use different caps per project?",
    answer:
      "Yes. Each project gets its own Anthropic key, proxy key, daily/weekly/monthly caps, and optional Slack webhook."
  },
  {
    question: "Do you store my Anthropic API key in plain text?",
    answer:
      "No. Keys are encrypted at rest before persistence. Runtime decryption only happens inside proxy execution when forwarding a request."
  }
];

export default function LandingPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<SessionResponse | null>(null);

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/auth", { cache: "no-store" });
      const json = (await response.json()) as SessionResponse;
      setSession(json);
    })();
  }, []);

  const checkoutUrl = useMemo(() => session?.checkoutUrl || null, [session]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const response = await fetch("/api/auth", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        action: "sign-in",
        email
      })
    });

    const json = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(json.error || "Unable to sign in.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <main className="relative overflow-hidden">
      <div className="absolute -left-40 top-0 h-96 w-96 rounded-full bg-[#2f81f7]/20 blur-3xl" />
      <div className="absolute -right-40 top-24 h-[420px] w-[420px] rounded-full bg-[#3fb950]/10 blur-3xl" />

      <section className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 pb-20 pt-10 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between">
          <Link href="/" className="text-sm font-semibold tracking-wide text-[#9da7b3]">
            Claude Usage Cap
          </Link>
          <Link href="/dashboard" className="text-sm font-medium text-[#9da7b3] hover:text-[#e6edf3]">
            Dashboard
          </Link>
        </header>

        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div className="space-y-6">
            <p className="inline-flex items-center gap-2 rounded-full border border-[#30363d] bg-[#111821] px-4 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#9da7b3]">
              <ShieldAlert size={14} />
              Hard cost guardrails for Anthropic workloads
            </p>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Claude Usage Cap
              <span className="mt-2 block text-2xl text-[#9da7b3] sm:text-3xl">
                Per-project spend limits on the Claude API with auto-cutoff
              </span>
            </h1>
            <p className="max-w-2xl text-lg text-[#c3ccd5]">
              Stop runaway AI bills before they happen. Add your Anthropic key, generate a project proxy key,
              set daily, weekly, and monthly USD caps, and instantly block requests once limits are reached.
            </p>
            <div className="grid gap-3 text-sm text-[#9da7b3] sm:grid-cols-2">
              <p className="rounded-lg border border-[#30363d] bg-[#111821]/60 p-3">
                Dev bug protection: a looping queue cannot drain your card overnight.
              </p>
              <p className="rounded-lg border border-[#30363d] bg-[#111821]/60 p-3">
                SaaS safety: isolate spend limits by project, environment, or customer workload.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-[#30363d] bg-[#111821]/80 p-6">
            <h2 className="text-xl font-semibold">Start protecting your first project</h2>
            <p className="mt-2 text-sm text-[#9da7b3]">
              Sign in with your work email. After checkout, your dashboard unlocks project-level caps and proxy keys.
            </p>

            <form className="mt-6 space-y-4" onSubmit={signIn}>
              <div className="space-y-2">
                <Label htmlFor="email">Work email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@company.com"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Open dashboard"}
              </Button>
              {error ? <p className="text-sm text-[#f85149]">{error}</p> : null}
            </form>

            {session?.authenticated && checkoutUrl ? (
              <a
                href={checkoutUrl}
                className="lemonsqueezy-button mt-3 inline-flex h-10 w-full items-center justify-center rounded-md border border-[#3fb950] bg-[#238636] px-4 text-sm font-semibold text-[#f0f6fc] hover:bg-[#2ea043]"
              >
                Activate paid access ($15/mo)
              </a>
            ) : null}
          </div>
        </div>
      </section>

      <section className="border-y border-[#30363d] bg-[#0f1520]/70">
        <div className="mx-auto grid w-full max-w-6xl gap-6 px-6 py-12 sm:px-8 lg:grid-cols-3 lg:px-10">
          <article className="rounded-xl border border-[#30363d] bg-[#111821]/70 p-5">
            <AlertTriangle className="mb-4 text-[#f0883e]" />
            <h3 className="text-lg font-semibold">Problem: silent runaway spend</h3>
            <p className="mt-2 text-sm text-[#9da7b3]">
              Anthropic keys don&apos;t support hard budget caps. One retry loop or background worker bug can create
              thousands of expensive completions before anyone notices.
            </p>
          </article>

          <article className="rounded-xl border border-[#30363d] bg-[#111821]/70 p-5">
            <Lock className="mb-4 text-[#2f81f7]" />
            <h3 className="text-lg font-semibold">Solution: enforceable proxy caps</h3>
            <p className="mt-2 text-sm text-[#9da7b3]">
              Every request goes through your proxy key. Usage is tracked per project and immediately blocked with HTTP
              429 when daily, weekly, or monthly limits are reached.
            </p>
          </article>

          <article className="rounded-xl border border-[#30363d] bg-[#111821]/70 p-5">
            <Slack className="mb-4 text-[#3fb950]" />
            <h3 className="text-lg font-semibold">Outcome: rapid team response</h3>
            <p className="mt-2 text-sm text-[#9da7b3]">
              Receive Slack alerts as soon as a cap is hit. Engineering knows exactly which project was blocked and can
              fix the issue without discovering the problem from an invoice.
            </p>
          </article>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 py-14 sm:px-8 lg:px-10">
        <div className="grid gap-6 lg:grid-cols-3">
          <article className="rounded-xl border border-[#30363d] bg-[#111821]/60 p-5">
            <Zap className="mb-4 text-[#f0883e]" />
            <h3 className="text-lg font-semibold">Deploy in minutes</h3>
            <p className="mt-2 text-sm text-[#9da7b3]">
              Swap your Claude endpoint to a single proxy URL and attach `x-proxy-key`. No SDK rewrite required.
            </p>
          </article>
          <article className="rounded-xl border border-[#30363d] bg-[#111821]/60 p-5">
            <LineChart className="mb-4 text-[#2f81f7]" />
            <h3 className="text-lg font-semibold">See spend trends</h3>
            <p className="mt-2 text-sm text-[#9da7b3]">
              Review rolling 30-day usage charts, current period totals, and exact cap utilization per project.
            </p>
          </article>
          <article className="rounded-xl border border-[#30363d] bg-[#111821]/60 p-5">
            <ShieldAlert className="mb-4 text-[#3fb950]" />
            <h3 className="text-lg font-semibold">Insurance at startup scale</h3>
            <p className="mt-2 text-sm text-[#9da7b3]">
              Pay $15/month per project instead of gambling against a $500 overnight billing mistake.
            </p>
          </article>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-14 sm:px-8 lg:px-10">
        <div className="rounded-2xl border border-[#3fb950] bg-[#111f16]/50 p-8">
          <p className="text-sm uppercase tracking-[0.12em] text-[#7ee787]">Simple pricing</p>
          <h2 className="mt-2 text-3xl font-semibold">$15 / month / project</h2>
          <p className="mt-3 max-w-2xl text-[#c3ccd5]">
            Includes unlimited proxy requests, per-project cap enforcement, 30-day usage charting, and Slack limit
            alerts. Add projects as you scale. Cancel anytime.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={() => router.push("/dashboard")}>Open dashboard</Button>
            {checkoutUrl ? (
              <a
                href={checkoutUrl}
                className="lemonsqueezy-button inline-flex h-10 items-center justify-center rounded-md border border-[#3fb950] bg-[#238636] px-4 text-sm font-semibold text-[#f0f6fc] hover:bg-[#2ea043]"
              >
                Start paid access
              </a>
            ) : null}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-20 sm:px-8 lg:px-10">
        <h2 className="text-2xl font-semibold">FAQ</h2>
        <div className="mt-6 grid gap-4">
          {faq.map((item) => (
            <article key={item.question} className="rounded-xl border border-[#30363d] bg-[#111821]/70 p-5">
              <h3 className="text-base font-semibold">{item.question}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#9da7b3]">{item.answer}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
