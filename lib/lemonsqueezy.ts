import { verifyStripeSignature } from "@/lib/security";

export type StripeWebhookEvent = {
  id: string;
  type: string;
  data?: {
    object?: {
      customer_email?: string;
      customer_details?: {
        email?: string;
      };
    };
  };
};

export function verifyHostedCheckoutWebhook(payload: string, signature: string | null) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret) {
    return false;
  }

  return verifyStripeSignature(payload, signature, secret);
}

export function extractPaidEmail(event: StripeWebhookEvent) {
  return event.data?.object?.customer_details?.email || event.data?.object?.customer_email || null;
}
