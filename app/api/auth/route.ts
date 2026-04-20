import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  clearSessionCookie,
  getSessionFromRequest,
  setSessionCookie
} from "@/lib/auth";
import {
  buildLemonCheckoutUrl,
  getSubscriptionByEmail,
  isSubscriptionActiveStatus
} from "@/lib/lemonsqueezy";

const AuthRequestSchema = z.object({
  email: z.string().email()
});

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);

  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const subscription = await getSubscriptionByEmail(session.email);

  return NextResponse.json({
    authenticated: true,
    email: session.email,
    subscriptionActive: isSubscriptionActiveStatus(subscription?.status),
    subscriptionStatus: subscription?.status ?? "none"
  });
}

export async function POST(request: NextRequest) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      {
        status: 400
      }
    );
  }

  const parsed = AuthRequestSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "A valid billing email is required" },
      { status: 400 }
    );
  }

  const email = parsed.data.email.toLowerCase();
  const subscription = await getSubscriptionByEmail(email);
  const active = isSubscriptionActiveStatus(subscription?.status);

  if (!active) {
    return NextResponse.json(
      {
        error:
          "No active subscription found for this email. Complete checkout first, then unlock access.",
        checkoutUrl: buildLemonCheckoutUrl(email)
      },
      { status: 402 }
    );
  }

  const response = NextResponse.json({
    authenticated: true,
    email,
    subscriptionStatus: subscription?.status ?? "active"
  });

  setSessionCookie(response, email);

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ authenticated: false });
  clearSessionCookie(response);
  return response;
}
