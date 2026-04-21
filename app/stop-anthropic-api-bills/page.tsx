import Link from "next/link";
import type { Metadata } from "next";

const BUY_URL = "https://buy.stripe.com/6oU7sKgxP1GQ59P5GceUU03";

export const metadata: Metadata = {
  title: "Stop Runaway Anthropic API Bills — Hard Cap at $X per Project | Claude Usage Cap",
  description: "If you have auto-reload enabled on Anthropic and left a bad loop running overnight, you know the feeling. This is the guardrail you wish you had.",
  alternates: { canonical: "https://claude-usage-cap.microtool.dev/stop-anthropic-api-bills" },
  openGraph: { title: "Stop Runaway Anthropic API Bills", description: "Hard per-project spend caps on Claude API. 402 cutoff at your ceiling, Slack alerts at 50/80/100%.", url: "https://claude-usage-cap.microtool.dev/stop-anthropic-api-bills" },
};

export default function Page() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 text-slate-200">
      <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">Stop runaway Anthropic API bills before they happen.</h1>
      <p className="text-xl text-slate-300 mb-8">If you have Auto-Buy enabled on your Anthropic account and left a bad loop running overnight, you already know the feeling. This is the guardrail you wished you had.</p>

      <h2 className="text-2xl font-semibold text-white mb-3 mt-10">The scenario that costs $300 overnight</h2>
      <p className="mb-4">You ship a feature that calls Claude in a retry loop. Something unexpected happens — a malformed response, a dependency that times out. Your code keeps retrying. It&apos;s 11pm. You&apos;re asleep.</p>
      <p className="mb-4">By 7am you have 40,000 API calls at an average of $0.01 each. Anthropic&apos;s dashboard now shows yesterday&apos;s number. Your card just got billed $400 of overage because Auto-Buy topped up silently three times.</p>
      <p className="mb-4">Anthropic&apos;s spend controls tell you what already happened. They don&apos;t stop it in real time. That gap is where runaway bills live.</p>

      <h2 className="text-2xl font-semibold text-white mb-3 mt-10">What Claude Usage Cap actually does</h2>
      <p className="mb-4">Claude Usage Cap is a proxy layer in front of your Claude API calls. You configure per-project daily, weekly, and monthly spend ceilings. When a request would cross your ceiling, it gets rejected with a 402 <code className="text-amber-300">Payment Required</code>. The runaway loop stops. Your bill stops.</p>
      <p className="mb-4">At 50%, 80%, and 100% of your cap, a Slack webhook fires so you know before the cutoff is surprising.</p>

      <h2 className="text-2xl font-semibold text-white mb-3 mt-10">Why not just use Anthropic&apos;s limits?</h2>
      <p className="mb-4">Anthropic offers account-wide quotas, but not per-project ceilings. If you run multiple apps on one Anthropic org — staging, prod, experiments, a side project — they all share one pool. Claude Usage Cap gives each its own ceiling, so a misbehaving experiment can&apos;t drain your production budget.</p>

      <h2 className="text-2xl font-semibold text-white mb-3 mt-10">Setup, honestly</h2>
      <ul className="list-disc pl-6 space-y-2 mb-8">
        <li>Create an account, paste your Anthropic key.</li>
        <li>Set caps per project: $X / day, $Y / week, $Z / month.</li>
        <li>Change your code&apos;s base URL from <code>api.anthropic.com</code> to your proxy endpoint.</li>
        <li>Add a Slack webhook URL if you want alerts (optional).</li>
      </ul>

      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6 mb-10">
        <p className="text-lg text-white mb-4">$15/month. Flat. Not per-token. Not per-request. Not a middleman on your Anthropic spend — it&apos;s just the ceiling you wish Anthropic had native.</p>
        <a href={BUY_URL} className="inline-flex items-center justify-center rounded-md bg-emerald-500 px-8 py-3 text-black font-semibold hover:bg-emerald-400 transition">Buy — $15/mo</a>
      </div>

      <p className="text-slate-400 text-sm"><Link href="/" className="text-emerald-400 underline">← Back to Claude Usage Cap overview</Link> · <Link href="/claude-api-spending-limits" className="text-emerald-400 underline ml-3">Compare to native Anthropic limits →</Link></p>
    </main>
  );
}
