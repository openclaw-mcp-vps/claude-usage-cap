import Link from "next/link";
import { AlertTriangle, BarChart3, Bolt, CheckCircle2, ShieldAlert, Slack } from "lucide-react";
import type { ComponentType } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const faqs = [
  {
    q: "How does cutoff work?",
    a: "Every request to Claude goes through your project proxy key. Before forwarding, we check period spend totals in real time. If a cap is reached, the proxy immediately returns 429 and your workload stops." 
  },
  {
    q: "Does this replace Anthropic billing?",
    a: "No. Anthropic remains the billing provider. Claude Usage Cap is a guardrail layer that blocks requests once your configured project cap is exhausted." 
  },
  {
    q: "What if I run multiple apps on one Anthropic account?",
    a: "Create one project per app, service, or environment. Each gets its own proxy key and independent daily, weekly, and monthly caps." 
  },
  {
    q: "How quickly do Slack alerts fire?",
    a: "The alert is sent when the first blocked request occurs for an exceeded period. We deduplicate alerts per period window to avoid spam." 
  }
];

const paymentLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK as string;

export default function HomePage() {
  return (
    <main className="grid-glow min-h-screen">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 pb-14 pt-10 md:pt-16">
        <header className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
            <ShieldAlert className="h-4 w-4 text-sky-400" />
            Claude Usage Cap
          </div>
          <nav className="flex items-center gap-3">
            <Link href="/unlock" className="text-sm text-slate-300 hover:text-white">
              Unlock Access
            </Link>
            <Button asChild variant="outline" size="sm">
              <a href={paymentLink} target="_blank" rel="noreferrer">
                Buy $15/mo
              </a>
            </Button>
          </nav>
        </header>

        <div className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
          <div className="space-y-6">
            <p className="inline-flex rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1 text-xs font-semibold tracking-wide text-sky-300">
              AI Cost Guardrails for Builders
            </p>
            <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-white md:text-6xl">
              Hard spend limits for Claude API projects, with automatic cutoff the second you cross budget.
            </h1>
            <p className="max-w-2xl text-lg text-slate-300">
              Anthropic does not offer per-key budget caps. One failed loop can burn hundreds overnight. Claude Usage Cap gives each project a dedicated proxy key with daily, weekly, and monthly limits plus Slack alerts when blocking starts.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <a href={paymentLink} target="_blank" rel="noreferrer">
                  Start Protection for $15/mo
                </a>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/unlock">Already Paid? Unlock Dashboard</Link>
              </Button>
            </div>
          </div>
          <Card className="border-sky-500/20 bg-slate-900/85">
            <CardHeader>
              <CardTitle className="text-xl text-white">What you get</CardTitle>
              <CardDescription>Purpose-built for dev workloads and SaaS products using Claude.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Feature icon={BarChart3} title="Real-time usage ledger" text="Track spend per request using model-aware token pricing." />
              <Feature icon={Bolt} title="Instant 429 cutoff" text="Proxy blocks new calls the moment a cap window is exhausted." />
              <Feature icon={Slack} title="Slack incident alert" text="Notify your team when a project is being blocked by budget rules." />
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-5 px-6 pb-14 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <AlertTriangle className="h-5 w-5 text-amber-300" />
              Problem
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-300">
            Teams ship experiments quickly, and a single infinite retry loop can consume large API spend before anyone notices.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <ShieldAlert className="h-5 w-5 text-sky-400" />
              Solution
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-300">
            Route traffic through a project proxy key that enforces budget caps before forwarding to Claude.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <CheckCircle2 className="h-5 w-5 text-emerald-300" />
              Outcome
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-300">
            Experimental workloads stay inside predefined spend boundaries without manual monitoring.
          </CardContent>
        </Card>
      </section>

      <section id="pricing" className="mx-auto w-full max-w-4xl px-6 pb-14">
        <Card className="border-sky-500/25 bg-slate-900/90">
          <CardHeader>
            <CardTitle className="text-3xl text-white">Simple pricing</CardTitle>
            <CardDescription>One flat subscription per protected project.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-5xl font-bold text-sky-300">$15<span className="text-xl text-slate-400">/project/month</span></p>
            <ul className="grid gap-3 text-sm text-slate-200">
              <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-300" />Daily, weekly, and monthly cap enforcement</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-300" />Per-project proxy key issuance and rotation support</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-300" />Slack alert on blocked requests</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-300" />Usage dashboard and 30-day spend chart</li>
            </ul>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <a href={paymentLink} target="_blank" rel="noreferrer">
                  Buy Protection
                </a>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/unlock">Use Existing Subscription</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mx-auto w-full max-w-5xl px-6 pb-20">
        <h2 className="mb-6 text-2xl font-semibold text-white">FAQ</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {faqs.map((faq) => (
            <Card key={faq.q}>
              <CardHeader>
                <CardTitle className="text-base text-white">{faq.q}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-300">{faq.a}</CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}

function Feature({
  icon: Icon,
  title,
  text
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-100">
        <Icon className="h-4 w-4 text-sky-300" />
        {title}
      </div>
      <p className="text-sm text-slate-400">{text}</p>
    </div>
  );
}
