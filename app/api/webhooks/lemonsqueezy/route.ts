import { NextRequest, NextResponse } from "next/server";
import {
  applyLemonWebhook,
  verifyLemonSqueezySignature
} from "@/lib/lemonsqueezy";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const rawPayload = await request.text();
  const signature = request.headers.get("x-signature");

  const valid = verifyLemonSqueezySignature({
    payload: rawPayload,
    signature
  });

  if (!valid) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  let payload: unknown;

  try {
    payload = JSON.parse(rawPayload);
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const result = await applyLemonWebhook(
    payload as {
      meta?: { event_name?: string; custom_data?: Record<string, unknown> };
      data?: {
        id?: string;
        type?: string;
        attributes?: Record<string, unknown>;
      };
    }
  );

  return NextResponse.json({ ok: true, ...result });
}
