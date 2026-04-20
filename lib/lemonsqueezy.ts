import crypto from "crypto";
import { sql, sqlOne } from "@/lib/db";

export type SubscriptionRecord = {
  email: string;
  status: string;
  customerId: string | null;
  subscriptionId: string | null;
  orderId: string | null;
  currentPeriodEnd: string | null;
  updatedAt: string;
};

type LemonWebhookPayload = {
  meta?: {
    event_name?: string;
    custom_data?: Record<string, unknown>;
  };
  data?: {
    id?: string;
    type?: string;
    attributes?: {
      status?: string;
      user_email?: string;
      customer_email?: string;
      customer_id?: number | string;
      order_id?: number | string;
      subscription_id?: number | string;
      renews_at?: string;
      ends_at?: string;
      cancelled?: boolean;
    };
  };
};

function mapSubscriptionRow(row: {
  email: string;
  status: string;
  customer_id: string | null;
  subscription_id: string | null;
  order_id: string | null;
  current_period_end: string | null;
  updated_at: string;
}): SubscriptionRecord {
  return {
    email: row.email,
    status: row.status,
    customerId: row.customer_id,
    subscriptionId: row.subscription_id,
    orderId: row.order_id,
    currentPeriodEnd: row.current_period_end,
    updatedAt: row.updated_at
  };
}

export function verifyLemonSqueezySignature(input: {
  payload: string;
  signature: string | null;
}): boolean {
  const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;

  if (!secret || !input.signature) {
    return false;
  }

  const digest = crypto.createHmac("sha256", secret).update(input.payload).digest("hex");

  const digestBuffer = Buffer.from(digest, "utf8");
  const signatureBuffer = Buffer.from(input.signature, "utf8");

  if (digestBuffer.length !== signatureBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(digestBuffer, signatureBuffer);
}

export function isSubscriptionActiveStatus(status: string | null | undefined): boolean {
  if (!status) {
    return false;
  }

  const normalized = status.toLowerCase();

  return ["active", "on_trial", "trialing", "paid", "past_due"].includes(normalized);
}

export function buildLemonCheckoutUrl(email?: string): string {
  const storeId = process.env.NEXT_PUBLIC_LEMON_SQUEEZY_STORE_ID ?? "";
  const productId = process.env.NEXT_PUBLIC_LEMON_SQUEEZY_PRODUCT_ID ?? "";

  if (!productId) {
    return "https://www.lemonsqueezy.com";
  }

  const url = new URL(`https://app.lemonsqueezy.com/checkout/buy/${productId}`);
  url.searchParams.set("embed", "1");
  url.searchParams.set("media", "0");
  url.searchParams.set("logo", "0");
  if (storeId) {
    url.searchParams.set("store", storeId);
  }

  if (email) {
    url.searchParams.set("checkout[email]", email);
  }

  return url.toString();
}

export async function getSubscriptionByEmail(
  email: string
): Promise<SubscriptionRecord | null> {
  const row = await sqlOne<{
    email: string;
    status: string;
    customer_id: string | null;
    subscription_id: string | null;
    order_id: string | null;
    current_period_end: string | null;
    updated_at: string;
  }>(
    `
    SELECT
      email,
      status,
      customer_id,
      subscription_id,
      order_id,
      current_period_end,
      updated_at
    FROM subscriptions
    WHERE email = $1
    LIMIT 1
    `,
    [email.toLowerCase()]
  );

  if (!row) {
    return null;
  }

  return mapSubscriptionRow(row);
}

export async function hasActiveSubscription(email: string): Promise<boolean> {
  const record = await getSubscriptionByEmail(email);

  if (!record) {
    return false;
  }

  return isSubscriptionActiveStatus(record.status);
}

async function wasWebhookProcessed(eventKey: string): Promise<boolean> {
  const row = await sqlOne<{ event_key: string }>(
    `SELECT event_key FROM processed_webhooks WHERE event_key = $1 LIMIT 1`,
    [eventKey]
  );

  return Boolean(row);
}

async function markWebhookProcessed(eventKey: string): Promise<void> {
  await sql(
    `
    INSERT INTO processed_webhooks (event_key)
    VALUES ($1)
    ON CONFLICT (event_key) DO NOTHING
    `,
    [eventKey]
  );
}

export async function applyLemonWebhook(
  payload: LemonWebhookPayload
): Promise<{ ignored: boolean; reason?: string }> {
  const eventName = payload.meta?.event_name ?? "unknown";
  const dataId = payload.data?.id ?? "no-id";
  const eventKey = `${eventName}:${dataId}`;

  if (await wasWebhookProcessed(eventKey)) {
    return { ignored: true, reason: "Webhook already processed" };
  }

  const attrs = payload.data?.attributes ?? {};
  const emailCandidate =
    (attrs.user_email as string | undefined) ??
    (attrs.customer_email as string | undefined) ??
    (payload.meta?.custom_data?.email as string | undefined);

  if (!emailCandidate) {
    await markWebhookProcessed(eventKey);
    return { ignored: true, reason: "No customer email found in webhook" };
  }

  const email = emailCandidate.toLowerCase();
  const incomingStatus = (attrs.status as string | undefined) ?? "inactive";

  let status = incomingStatus;

  if (eventName.includes("cancel") || attrs.cancelled) {
    status = "cancelled";
  }

  if (eventName === "order_created" && !attrs.status) {
    status = "active";
  }

  const currentPeriodEnd =
    (attrs.renews_at as string | undefined) ?? (attrs.ends_at as string | undefined) ?? null;

  await sql(
    `
    INSERT INTO subscriptions (
      email,
      status,
      customer_id,
      subscription_id,
      order_id,
      current_period_end,
      updated_at
    )
    VALUES ($1,$2,$3,$4,$5,$6,NOW())
    ON CONFLICT (email)
    DO UPDATE SET
      status = EXCLUDED.status,
      customer_id = COALESCE(EXCLUDED.customer_id, subscriptions.customer_id),
      subscription_id = COALESCE(EXCLUDED.subscription_id, subscriptions.subscription_id),
      order_id = COALESCE(EXCLUDED.order_id, subscriptions.order_id),
      current_period_end = COALESCE(EXCLUDED.current_period_end, subscriptions.current_period_end),
      updated_at = NOW()
    `,
    [
      email,
      status,
      attrs.customer_id ? String(attrs.customer_id) : null,
      attrs.subscription_id ? String(attrs.subscription_id) : payload.data?.id ?? null,
      attrs.order_id ? String(attrs.order_id) : null,
      currentPeriodEnd
    ]
  );

  await markWebhookProcessed(eventKey);
  return { ignored: false };
}
