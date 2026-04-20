import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  extractBuyerEmail,
  extractCheckoutToken,
  extractOrderId,
  verifyWebhookSignature
} from "@/lib/lemonsqueezy";

export const runtime = "nodejs";

function isPaidEvent(eventName: string) {
  return [
    "order_created",
    "order_refunded_reversed",
    "subscription_created",
    "subscription_resumed",
    "subscription_payment_success"
  ].includes(eventName);
}

function isUnpaidEvent(eventName: string) {
  return ["subscription_cancelled", "subscription_expired", "subscription_paused"].includes(eventName);
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-signature");

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody) as Record<string, unknown>;
  const eventName =
    ((payload.meta as Record<string, unknown> | undefined)?.event_name as string | undefined) ?? "unknown";

  const checkoutToken = extractCheckoutToken(payload);
  const orderId = extractOrderId(payload);
  const buyerEmail = extractBuyerEmail(payload);

  if (checkoutToken && isPaidEvent(eventName)) {
    db.prepare(
      "UPDATE checkout_sessions SET status = 'paid', order_id = ?, paid_at = datetime('now') WHERE token = ?"
    ).run(orderId ?? null, checkoutToken);

    db.prepare(
      `UPDATE users
       SET paid = 1
       WHERE id = (SELECT user_id FROM checkout_sessions WHERE token = ? LIMIT 1)`
    ).run(checkoutToken);
  }

  if (checkoutToken && isUnpaidEvent(eventName)) {
    db.prepare("UPDATE checkout_sessions SET status = 'cancelled' WHERE token = ?").run(checkoutToken);

    db.prepare(
      `UPDATE users
       SET paid = 0
       WHERE id = (SELECT user_id FROM checkout_sessions WHERE token = ? LIMIT 1)`
    ).run(checkoutToken);
  }

  if (buyerEmail && isPaidEvent(eventName)) {
    db.prepare("UPDATE users SET paid = 1 WHERE email = ?").run(buyerEmail.toLowerCase());
  }

  if (buyerEmail && isUnpaidEvent(eventName)) {
    db.prepare("UPDATE users SET paid = 0 WHERE email = ?").run(buyerEmail.toLowerCase());
  }

  return NextResponse.json({ received: true });
}
