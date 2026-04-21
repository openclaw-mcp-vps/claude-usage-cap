import Link from "next/link";
import type { Metadata } from "next";

const BUY_URL = "https://buy.stripe.com/6oU7sKgxP1GQ59P5GceUU03";

export const metadata: Metadata = {
  title: "Per-Project Budgets for Anthropic API (Multi-App Accounts) | Claude Usage Cap",
  description: "If you run multiple apps on one Anthropic org, each should have its own spend ceiling. Here is how to do that without waiting for Anthropic to ship native support.",
  alternates: { canonical: "https://claude-usage-cap.microtool.dev/anthropic-per-project-budgets" },
  openGraph: { title: "Per-Project Budgets for Anthropic API", description: "Give each app its own Claude API budget. No more one bad loop draining the org pool.", url: "https://claude-usage-cap.microtool.dev/anthropic-per-project-budgets" },
};

export default function Page() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 text-slate-200">
      <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">Per-project budgets for Anthropic API.</h1>
      <p className="text-xl text-slate-300 mb-8">Anthropic gives you one credit pool per organization. If you run multiple apps, a spike in one drains the budget for all. Here is how to fix that without waiting for Anthropic to ship native project quotas.</p>

      <h2 className="text-2xl font-semibold text-white mb-3 mt-10">The multi-app problem</h2>
      <p className="mb-4">You have one Anthropic org. In it:</p>
      <ul className="list-disc pl-6 space-y-2 mb-6">
        <li>Prod API backend: usually $200/mo, spikes to $400 on busy days</li>
        <li>Staging: usually $20/mo, would be $200+ if a bad deploy loops on errors</li>
        <li>Internal tooling: $50/mo steady</li>
        <li>Side project / experiment: $10/mo, but hit $500 once when a recursive prompt escaped</li>
      </ul>
      <p className="mb-4">Total budget the org has allocated: $500/month. Total exposure: unbounded. Anthropic&apos;s account-level cap is a single number; it doesn&apos;t know which app spent what.</p>

      <h2 className="text-2xl font-semibold text-white mb-3 mt-10">What per-project budgets give you</h2>
      <ul className="list-disc pl-6 space-y-2 mb-6">
        <li><strong>Isolation.</strong> Staging can&apos;t eat prod&apos;s budget. A runaway experiment can&apos;t touch internal tooling&apos;s allocation.</li>
        <li><strong>Different policies per project.</strong> Prod gets $400/mo with a $30/day soft alert. Experiment gets $25/mo with hard cutoff at 100%. Different ceilings, one dashboard.</li>
        <li><strong>Cleaner attribution.</strong> When the bill comes in, you know exactly which app drove it.</li>
      </ul>

      <h2 className="text-2xl font-semibold text-white mb-3 mt-10">How to implement it with Claude Usage Cap</h2>
      <ol className="list-decimal pl-6 space-y-2 mb-6">
        <li>Create a project in Claude Usage Cap for each app.</li>
        <li>Each project gets its own proxy endpoint URL and API key.</li>
        <li>Set daily / weekly / monthly caps per project.</li>
        <li>Update each app&apos;s base URL from <code>api.anthropic.com</code> to the project&apos;s proxy endpoint.</li>
        <li>Done. The proxy forwards requests to Anthropic, tracks spend, cuts off at your ceiling.</li>
      </ol>
      <p className="mb-4">The proxy adds about 20ms to each request. Not noticeable for chat UIs; if you&apos;re doing low-latency streaming, run it co-located with your backend or ask us about direct integration.</p>

      <h2 className="text-2xl font-semibold text-white mb-3 mt-10">Slack alerts across projects</h2>
      <p className="mb-4">Configure one Slack webhook per project, or one for all of them. Alerts fire at 50%, 80%, and 100% of cap. You can also wire email or SMS via Twilio in settings.</p>

      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6 mb-10">
        <p className="text-lg text-white mb-4">$15/mo gets you unlimited projects on one Claude Usage Cap account. Per-project caps, Slack alerts, hard cutoffs. Cheaper than losing $400 to one runaway loop.</p>
        <a href={BUY_URL} className="inline-flex items-center justify-center rounded-md bg-emerald-500 px-8 py-3 text-black font-semibold hover:bg-emerald-400 transition">Buy — $15/mo</a>
      </div>

      <p className="text-slate-400 text-sm"><Link href="/" className="text-emerald-400 underline">← Back to overview</Link> · <Link href="/stop-anthropic-api-bills" className="text-emerald-400 underline ml-3">Stop runaway bills →</Link> · <Link href="/claude-api-spending-limits" className="text-emerald-400 underline ml-3">Compare to native Anthropic limits →</Link></p>
    </main>
  );
}
