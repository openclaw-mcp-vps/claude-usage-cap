"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type LandingAccessProps = {
  checkoutUrl: string;
  prefilledEmail?: string;
};

export function LandingAccess({ checkoutUrl, prefilledEmail = "" }: LandingAccessProps) {
  const router = useRouter();
  const [email, setEmail] = useState(prefilledEmail);
  const [unlocking, setUnlocking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const checkoutHref = useMemo(() => {
    if (!email) {
      return checkoutUrl;
    }

    const url = new URL(checkoutUrl);
    url.searchParams.set("checkout[email]", email);
    return url.toString();
  }, [checkoutUrl, email]);

  async function unlockAccess() {
    setUnlocking(true);
    setMessage(null);

    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });

      const data = (await response.json()) as {
        error?: string;
        checkoutUrl?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Access unlock failed");
      }

      setMessage("Access unlocked. Redirecting to dashboard...");
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Access unlock failed");
    } finally {
      setUnlocking(false);
    }
  }

  return (
    <div className="w-full max-w-3xl rounded-2xl border border-[#1f2937] bg-[#111827]/90 p-5 shadow-2xl shadow-black/40 md:p-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-[#e6edf3]">
            Step 1: Start protected billing
          </h3>
          <p className="text-sm text-[#9ca3af]">
            Checkout launches in Lemon Squeezy overlay. Your subscription unlocks unlimited API
            requests through your capped proxy.
          </p>
          <a
            href={checkoutHref}
            className="lemonsqueezy-button inline-flex rounded-lg bg-[#22c55e] px-4 py-2 text-sm font-semibold text-[#04120a] transition hover:bg-[#16a34a]"
          >
            Start $15/mo Project Protection
          </a>
        </div>

        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-[#e6edf3]">Step 2: Unlock dashboard</h3>
          <p className="text-sm text-[#9ca3af]">
            Enter the billing email used in checkout to issue an access cookie and open your project
            controls.
          </p>
          <input
            type="email"
            placeholder="billing@yourcompany.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-lg border border-[#334155] bg-[#0f172a] px-3 py-2 text-[#e6edf3] outline-none transition focus:border-[#22c55e]"
          />
          <button
            onClick={unlockAccess}
            disabled={unlocking || !email.includes("@")}
            className="inline-flex rounded-lg border border-[#334155] bg-[#0f172a] px-4 py-2 text-sm font-semibold text-[#e6edf3] transition hover:border-[#22c55e] hover:text-[#22c55e] disabled:opacity-50"
          >
            {unlocking ? "Checking subscription..." : "Unlock Access"}
          </button>
        </div>
      </div>

      {message ? (
        <div className="mt-4 rounded-lg border border-[#334155] bg-[#0f172a] px-3 py-2 text-sm text-[#cbd5e1]">
          {message}
        </div>
      ) : null}
    </div>
  );
}
