import { createHmac, randomUUID } from "node:crypto";

import { addCheckoutSession, findUserById, upsertUser } from "@/lib/storage";
import type { User } from "@/lib/types";

function webhookSecret(): string {
  return process.env.LEMON_SQUEEZY_WEBHOOK_SECRET || "";
}

export function buildCheckoutUrl(options: { userId: string; email: string }): string | null {
  const storeId = process.env.NEXT_PUBLIC_LEMON_SQUEEZY_STORE_ID;
  const productId = process.env.NEXT_PUBLIC_LEMON_SQUEEZY_PRODUCT_ID;

  if (!storeId || !productId) {
    return null;
  }

  const url = new URL(`https://app.lemonsqueezy.com/checkout/buy/${productId}`);
  url.searchParams.set("checkout[email]", options.email);
  url.searchParams.set("checkout[custom][user_id]", options.userId);
  url.searchParams.set("checkout[custom][store_id]", storeId);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (baseUrl) {
    url.searchParams.set("checkout[success_url]", `${baseUrl}/dashboard?checkout=success`);
  }

  return url.toString();
}

export function verifyLemonSignature(rawBody: string, signature: string | null): boolean {
  const secret = webhookSecret();

  if (!secret || !signature) {
    return false;
  }

  const digest = createHmac("sha256", secret).update(rawBody).digest("hex");
  return digest === signature;
}

function plusDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

async function markUserPaid(user: User, attributes: Record<string, unknown>): Promise<User> {
  const now = new Date().toISOString();

  const next: User = {
    ...user,
    updatedAt: now,
    paidUntil: plusDays(31),
    subscriptionStatus: "active",
    lemonCustomerId:
      typeof attributes.customer_id === "number" || typeof attributes.customer_id === "string"
        ? String(attributes.customer_id)
        : user.lemonCustomerId,
    lemonSubscriptionId:
      typeof attributes.subscription_id === "number" || typeof attributes.subscription_id === "string"
        ? String(attributes.subscription_id)
        : user.lemonSubscriptionId
  };

  await upsertUser(next);

  await addCheckoutSession({
    id: randomUUID(),
    userId: user.id,
    createdAt: now,
    source: "lemonsqueezy",
    paid: true
  });

  return next;
}

async function markUserInactive(user: User): Promise<User> {
  const next: User = {
    ...user,
    updatedAt: new Date().toISOString(),
    paidUntil: user.paidUntil,
    subscriptionStatus: "inactive"
  };

  await upsertUser(next);
  return next;
}

export async function applyLemonWebhook(payload: unknown): Promise<{ ok: boolean; reason?: string }> {
  if (!payload || typeof payload !== "object") {
    return { ok: false, reason: "invalid payload" };
  }

  const typed = payload as {
    meta?: { event_name?: string; custom_data?: Record<string, unknown> };
    data?: { attributes?: Record<string, unknown> };
  };

  const eventName = typed.meta?.event_name;
  const attributes = typed.data?.attributes ?? {};
  const customData = typed.meta?.custom_data ?? {};

  const userIdRaw = customData.user_id;
  const userId = typeof userIdRaw === "string" ? userIdRaw : null;

  if (!userId) {
    return { ok: false, reason: "missing custom user_id" };
  }

  const user = await findUserById(userId);

  if (!user) {
    return { ok: false, reason: "user not found" };
  }

  if (
    eventName === "order_created" ||
    eventName === "order_refunded" ||
    eventName === "subscription_created" ||
    eventName === "subscription_resumed" ||
    eventName === "subscription_updated"
  ) {
    const status = attributes.status;

    if (typeof status === "string" && ["paid", "active", "on_trial"].includes(status)) {
      await markUserPaid(user, attributes);
      return { ok: true };
    }

    if (typeof status === "string" && ["cancelled", "expired", "past_due", "unpaid"].includes(status)) {
      await markUserInactive(user);
      return { ok: true };
    }

    await markUserPaid(user, attributes);
    return { ok: true };
  }

  if (eventName === "subscription_cancelled" || eventName === "subscription_expired") {
    await markUserInactive(user);
    return { ok: true };
  }

  return { ok: true };
}
