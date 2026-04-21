import Link from "next/link";
import type { Metadata } from "next";

const BUY_URL = "https://buy.stripe.com/6oU7sKgxP1GQ59P5GceUU03";

export const metadata: Metadata = {
  title: "Claude API Spending Limits — How to Enforce a Hard Cap | Claude Usage Cap",
  description: "Compare native Anthropic spend controls vs per-project hard-cap proxies. If you run multiple apps on one Anthropic account, you need project-level ceilings.",
  alternates: { canonical: "https://claude-usage-cap.microtool.dev/claude-api-spending-limits" },
  openGraph: { title: "Claude API Spending Limits", description: "Per-project hard caps on Claude API calls. 402 cutoff at ceiling.", url: "https://claude-usage-cap.microtool.dev/claude-api-spending-limits" },
};

export default function Page() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 text-slate-200">
      <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">Claude API spending limits: what Anthropic provides vs. what you probably need.</h1>
      <p className="text-xl text-slate-300 mb-8">Short answer: Anthropic gives you account-level spend controls. If you run more than one app, project, or environment against one Anthropic account, you need per-project ceilings on top.</p>

      <h2 className="text-2xl font-semibold text-white mb-3 mt-10">Anthropic&apos;s native controls, summarized</h2>
      <ul className="list-disc pl-6 space-y-2 mb-6">
        <li><strong>Monthly credit limit.</strong> Set via Console → Billing. Once credits are exhausted, API calls fail with 402.</li>
        <li><strong>Auto-Buy toggle.</strong> Off by default on free tier; on by default once you load credits. When on, Anthropic auto-tops-up your balance. This is the setting that silently bills you in background.</li>
        <li><strong>Usage dashboard.</strong> Read-only, lags by ~15 min. Good for reviewing yesterday. Bad for stopping today.</li>
      </ul>

      <h2 className="text-2xl font-semibold text-white mb-3 mt-10">What&apos;s missing</h2>
      <p className="mb-4">Per-project or per-key ceilings. If your prod API, staging environment, internal chatbot, and a weekend side-project all use one Anthropic org, they share one credit pool. A bug in any of them can drain budget earmarked for something else.</p>
      <p className="mb-4">Real-time soft alerts. The dashboard updates slowly. By the time you see the spike, the bill has already accrued.</p>
      <p className="mb-4">A hard cutoff that&apos;s smaller than your Anthropic org balance. Sometimes you want to enforce a $50/week ceiling on one project even though your org has $500 available for the month.</p>

      <h2 className="text-2xl font-semibold text-white mb-3 mt-10">How Claude Usage Cap fills the gap</h2>
      <table className="w-full border-collapse text-left text-sm mb-6">
        <thead>
          <tr className="border-b border-slate-700"><th className="py-2 pr-4">Capability</th><th className="py-2 pr-4">Anthropic native</th><th className="py-2">Claude Usage Cap</th></tr>
        </thead>
        <tbody className="text-slate-300">
          <tr className="border-b border-slate-800"><td className="py-2 pr-4">Account-wide credit cap</td><td className="py-2 pr-4">Yes</td><td className="py-2">N/A — works on top of it</td></tr>
          <tr className="border-b border-slate-800"><td className="py-2 pr-4">Per-project ceiling</td><td className="py-2 pr-4">No</td><td className="py-2">Yes</td></tr>
          <tr className="border-b border-slate-800"><td className="py-2 pr-4">Daily / weekly / monthly tiers</td><td className="py-2 pr-4">Monthly only</td><td className="py-2">All three</td></tr>
          <tr className="border-b border-slate-800"><td className="py-2 pr-4">Slack alert at 50/80/100%</td><td className="py-2 pr-4">Email summaries</td><td className="py-2">Slack webhook, real-time</td></tr>
          <tr className="border-b border-slate-800"><td className="py-2 pr-4">Hard 402 cutoff at ceiling</td><td className="py-2 pr-4">Only at account limit</td><td className="py-2">Per project, configurable</td></tr>
        </tbody>
      </table>

      <h2 className="text-2xl font-semibold text-white mb-3 mt-10">Who this is for</h2>
      <p className="mb-4">Solo devs with 2-3 projects on one Anthropic account. Small teams running prod + staging + experiments. Anyone who&apos;s had a retry loop run overnight and wants a guardrail for next time.</p>

      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6 mb-10">
        <p className="text-lg text-white mb-4">$15/month flat. Per-project caps, Slack alerts, hard cutoff. Not a middleman on your Anthropic spend — a ceiling on top of it.</p>
        <a href={BUY_URL} className="inline-flex items-center justify-center rounded-md bg-emerald-500 px-8 py-3 text-black font-semibold hover:bg-emerald-400 transition">Buy — $15/mo</a>
      </div>

      <p className="text-slate-400 text-sm"><Link href="/" className="text-emerald-400 underline">← Back to overview</Link> · <Link href="/stop-anthropic-api-bills" className="text-emerald-400 underline ml-3">Read: Stop runaway bills →</Link> · <Link href="/anthropic-per-project-budgets" className="text-emerald-400 underline ml-3">Per-project budgets →</Link></p>
    </main>
  );
}
