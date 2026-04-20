import { createHmac, timingSafeEqual } from "node:crypto";
import * as Lemon from "@lemonsqueezy/lemonsqueezy.js";

function appBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export async function createCheckoutUrl({
  userId,
  email,
  checkoutToken
}: {
  userId: number;
  email: string;
  checkoutToken: string;
}) {
  const storeId = process.env.NEXT_PUBLIC_LEMON_SQUEEZY_STORE_ID;
  const productId = process.env.NEXT_PUBLIC_LEMON_SQUEEZY_PRODUCT_ID;
  const apiKey = process.env.LEMON_SQUEEZY_API_KEY;
  const successUrl = `${appBaseUrl()}/purchase/success?checkout=${encodeURIComponent(checkoutToken)}`;

  if (storeId && productId && apiKey) {
    try {
      const sdk = Lemon as unknown as {
        lemonSqueezySetup?: (params: { apiKey: string }) => void;
        createCheckout?: (...args: unknown[]) => Promise<unknown>;
      };

      sdk.lemonSqueezySetup?.({ apiKey });

      const response = await sdk.createCheckout?.(Number(storeId), Number(productId), {
        checkoutData: {
          email,
          custom: {
            checkoutToken,
            userId
          }
        },
        checkoutOptions: {
          embed: true,
          media: false,
          logo: true
        },
        productOptions: {
          redirectUrl: successUrl
        }
      });

      const checkoutUrl =
        (response as { data?: { data?: { attributes?: { url?: string } } } })?.data?.data?.attributes?.url;

      if (checkoutUrl) {
        return checkoutUrl;
      }
    } catch (error) {
      console.error("Failed to create Lemon Squeezy checkout via API", error);
    }
  }

  if (!productId) {
    throw new Error("Missing NEXT_PUBLIC_LEMON_SQUEEZY_PRODUCT_ID");
  }

  const params = new URLSearchParams({
    embed: "1",
    "checkout[email]": email,
    "checkout[custom][checkoutToken]": checkoutToken,
    "checkout[custom][userId]": String(userId),
    "checkout[success_url]": successUrl
  });

  return `https://app.lemonsqueezy.com/checkout/buy/${productId}?${params.toString()}`;
}

export function verifyWebhookSignature(rawBody: string, signatureHeader?: string | null) {
  const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
  if (!secret) {
    return false;
  }

  if (!signatureHeader) {
    return false;
  }

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const received = signatureHeader.trim();

  try {
    return timingSafeEqual(Buffer.from(expected, "utf8"), Buffer.from(received, "utf8"));
  } catch {
    return false;
  }
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export function extractCheckoutToken(payload: Record<string, unknown>) {
  const meta = payload.meta as Record<string, unknown> | undefined;
  const attributes = (payload.data as { attributes?: Record<string, unknown> } | undefined)?.attributes;

  const fromMetaCustom =
    (meta?.custom_data as Record<string, unknown> | undefined)?.checkoutToken ??
    (meta?.custom_data as Record<string, unknown> | undefined)?.checkout_token;

  const fromAttrCustom =
    (attributes?.custom_data as Record<string, unknown> | undefined)?.checkoutToken ??
    (attributes?.custom_data as Record<string, unknown> | undefined)?.checkout_token;

  return readString(fromMetaCustom) ?? readString(fromAttrCustom);
}

export function extractOrderId(payload: Record<string, unknown>) {
  const attributes = (payload.data as { id?: string; attributes?: Record<string, unknown> } | undefined)
    ?.attributes;

  return (
    readString((payload.data as { id?: string } | undefined)?.id) ??
    readString(attributes?.order_number) ??
    readString(attributes?.identifier)
  );
}

export function extractBuyerEmail(payload: Record<string, unknown>) {
  const attributes = (payload.data as { attributes?: Record<string, unknown> } | undefined)?.attributes;
  return (
    readString(attributes?.user_email) ??
    readString(attributes?.email) ??
    readString((payload.meta as Record<string, unknown> | undefined)?.user_email)
  );
}
