"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const paymentLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK as string;

export default function UnlockPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({ email })
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setError(body.error ?? "Unable to verify purchase for this email.");
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Network error while verifying your access.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl items-center px-6 py-14">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl text-white">Unlock your dashboard</CardTitle>
          <CardDescription>
            Use the same email you used at Stripe checkout. Once validated, we issue a secure access cookie.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Purchase email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="founder@yourcompany.com"
                required
              />
            </div>
            {error ? <p className="text-sm text-red-400">{error}</p> : null}
            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={loading}>
                {loading ? "Verifying..." : "Unlock Access"}
              </Button>
              <Button asChild variant="outline" type="button">
                <a href={paymentLink} target="_blank" rel="noreferrer">
                  Buy Subscription
                </a>
              </Button>
              <Button asChild variant="ghost" type="button">
                <Link href="/">Back Home</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
