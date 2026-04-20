import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { attachSession, clearSession, getOrCreateUser, getUserFromRequest, isUserPaid } from "@/lib/auth";
import { buildCheckoutUrl } from "@/lib/lemonsqueezy";

const signInSchema = z.object({
  action: z.literal("sign-in"),
  email: z.string().trim().email()
});

const signOutSchema = z.object({
  action: z.literal("sign-out")
});

const actionSchema = z.union([signInSchema, signOutSchema]);

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({
      authenticated: false,
      user: null,
      checkoutUrl: null
    });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: user.id,
      email: user.email,
      paidUntil: user.paidUntil,
      subscriptionStatus: user.subscriptionStatus,
      isPaid: isUserPaid(user)
    },
    checkoutUrl: buildCheckoutUrl({
      userId: user.id,
      email: user.email
    })
  });
}

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = actionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid auth payload." }, { status: 400 });
  }

  if (parsed.data.action === "sign-out") {
    const response = NextResponse.json({ ok: true });
    clearSession(response);
    return response;
  }

  const user = await getOrCreateUser(parsed.data.email);

  const response = NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      paidUntil: user.paidUntil,
      subscriptionStatus: user.subscriptionStatus,
      isPaid: isUserPaid(user)
    },
    checkoutUrl: buildCheckoutUrl({
      userId: user.id,
      email: user.email
    })
  });

  await attachSession(response, user);
  return response;
}
