import { cookies } from "next/headers";
import { z } from "zod";

import { hasPurchaseForEmail } from "@/lib/db";
import { createSessionToken, SESSION_COOKIE, verifySessionToken } from "@/lib/session";

const loginSchema = z.object({
  email: z.string().email()
});

export const runtime = "nodejs";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return Response.json({ authenticated: false });
  }

  const payload = await verifySessionToken(token);

  return Response.json({
    authenticated: Boolean(payload?.email),
    email: payload?.email ?? null
  });
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(payload);

  if (!parsed.success) {
    return Response.json({ error: "Please provide a valid email." }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const purchased = hasPurchaseForEmail(email);

  if (!purchased) {
    return Response.json(
      {
        error:
          "No paid subscription was found for this email. Complete checkout first, then retry unlock with the same email."
      },
      { status: 403 }
    );
  }

  const token = await createSessionToken(email);
  const cookieStore = await cookies();

  cookieStore.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });

  return Response.json({ ok: true });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);

  return Response.json({ ok: true });
}
