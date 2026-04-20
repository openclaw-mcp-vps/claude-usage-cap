"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type State = "pending" | "paid" | "error";

export default function PurchaseSuccessPage() {
  const [token, setToken] = useState<string | null>(null);
  const [tokenReady, setTokenReady] = useState(false);
  const [state, setState] = useState<State>("pending");
  const [message, setMessage] = useState("Verifying payment...");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get("checkout");
    setToken(tokenFromUrl);
    setTokenReady(true);
  }, []);

  useEffect(() => {
    if (!tokenReady) {
      return;
    }

    if (!token) {
      setState("error");
      setMessage("Missing checkout token. Return to dashboard and retry verification.");
      return;
    }

    let cancelled = false;

    async function verify() {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "verifyCheckout", checkoutToken: token })
      });

      const payload = (await response.json()) as { paid?: boolean; reason?: string };

      if (cancelled) {
        return;
      }

      if (response.ok && payload.paid) {
        setState("paid");
        setMessage("Payment confirmed. Your dashboard is now unlocked.");
      } else {
        setState("error");
        setMessage(payload.reason ?? "Payment confirmation is still pending. Try again shortly.");
      }
    }

    void verify();

    return () => {
      cancelled = true;
    };
  }, [token, tokenReady]);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-6 text-center">
      <h1 className="text-3xl font-semibold">Checkout Result</h1>
      <p className="mt-3 text-slate-300">{message}</p>
      <div className="mt-6 flex gap-3">
        <Link href="/dashboard" className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950">
          Go to dashboard
        </Link>
        <Link href="/" className="rounded-md border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200">
          Back to landing page
        </Link>
      </div>
      <p className="mt-4 text-xs text-slate-500">Status: {state}</p>
    </main>
  );
}
