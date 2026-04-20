import { upsertPurchase } from "@/lib/db";
import { extractPaidEmail, verifyHostedCheckoutWebhook, type StripeWebhookEvent } from "@/lib/lemonsqueezy";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");

  const verified = verifyHostedCheckoutWebhook(payload, signature);

  if (!verified) {
    return Response.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  let event: StripeWebhookEvent;
  try {
    event = JSON.parse(payload) as StripeWebhookEvent;
  } catch {
    return Response.json({ error: "Invalid webhook payload." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "invoice.paid") {
    const email = extractPaidEmail(event);

    if (email) {
      upsertPurchase(email, "stripe");
    }
  }

  return Response.json({ received: true });
}
