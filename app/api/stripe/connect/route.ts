import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

import { SESSION_COOKIE, createSessionToken } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.redirect(new URL("/unlock?err=missing_session", request.url));
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.redirect(new URL("/unlock?err=server_not_configured", request.url));
  }

  try {
    const stripe = new Stripe(secretKey);
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid" && session.status !== "complete") {
      return NextResponse.redirect(new URL("/unlock?err=not_paid", request.url));
    }

    const email = session.customer_details?.email || session.customer_email || "unknown@buyer.claude-usage-cap";
    const token = await createSessionToken(email);

    const res = NextResponse.redirect(new URL("/dashboard?unlocked=1", request.url));
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  } catch (err) {
    console.error("stripe/connect verification failed", err);
    return NextResponse.redirect(new URL("/unlock?err=verification_failed", request.url));
  }
}
