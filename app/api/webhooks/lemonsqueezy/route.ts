import { NextRequest, NextResponse } from "next/server";

import { applyLemonWebhook, verifyLemonSignature } from "@/lib/lemonsqueezy";

export async function POST(request: NextRequest) {
  if (!process.env.LEMON_SQUEEZY_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Webhook secret not configured." }, { status: 500 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-signature");

  if (!verifyLemonSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid Lemon Squeezy signature." }, { status: 401 });
  }

  let payload: unknown;

  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid webhook JSON payload." }, { status: 400 });
  }

  const result = await applyLemonWebhook(payload);

  if (!result.ok) {
    return NextResponse.json({ error: result.reason || "Webhook processing failed." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
