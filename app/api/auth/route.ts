import { compare, hash } from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { SESSION_COOKIE, readSessionFromCookie, signSession } from "@/lib/auth";
import { generateToken } from "@/lib/crypto";
import { db, type UserRow } from "@/lib/db";
import { createCheckoutUrl } from "@/lib/lemonsqueezy";

export const runtime = "nodejs";

const registerSchema = z.object({
  action: z.literal("register"),
  email: z.string().email().max(180),
  password: z.string().min(8).max(128)
});

const loginSchema = z.object({
  action: z.literal("login"),
  email: z.string().email().max(180),
  password: z.string().min(8).max(128)
});

const actionSchema = z.object({
  action: z.enum(["logout", "startCheckout", "verifyCheckout", "refresh"]),
  checkoutToken: z.string().optional()
});

function publicUser(user: UserRow) {
  return {
    id: user.id,
    email: user.email,
    paid: Boolean(user.paid),
    createdAt: user.created_at
  };
}

function setAuthCookie(response: NextResponse, user: { id: number; email: string; paid: boolean }) {
  return signSession({ uid: user.id, email: user.email, paid: user.paid }).then((token) => {
    response.cookies.set({
      name: SESSION_COOKIE,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30
    });
    return response;
  });
}

async function readCurrentUser(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await readSessionFromCookie(token);
  if (!session) {
    return null;
  }

  const user = db.prepare("SELECT * FROM users WHERE id = ? LIMIT 1").get(session.uid) as UserRow | undefined;
  return user ?? null;
}

export async function GET(request: NextRequest) {
  const user = await readCurrentUser(request);

  if (!user) {
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({ user: publicUser(user) });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const registerInput = registerSchema.safeParse(body);
  if (registerInput.success) {
    const email = registerInput.data.email.toLowerCase();
    const existing = db.prepare("SELECT id FROM users WHERE email = ? LIMIT 1").get(email) as
      | { id: number }
      | undefined;

    if (existing?.id) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const passwordHash = await hash(registerInput.data.password, 12);
    const insert = db
      .prepare("INSERT INTO users (email, password_hash, paid) VALUES (?, ?, 0)")
      .run(email, passwordHash);

    const user = db.prepare("SELECT * FROM users WHERE id = ? LIMIT 1").get(insert.lastInsertRowid) as
      | UserRow
      | undefined;

    if (!user) {
      return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
    }

    const response = NextResponse.json({ user: publicUser(user) }, { status: 201 });
    return setAuthCookie(response, { id: user.id, email: user.email, paid: Boolean(user.paid) });
  }

  const loginInput = loginSchema.safeParse(body);
  if (loginInput.success) {
    const email = loginInput.data.email.toLowerCase();
    const user = db.prepare("SELECT * FROM users WHERE email = ? LIMIT 1").get(email) as UserRow | undefined;

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const ok = await compare(loginInput.data.password, user.password_hash);
    if (!ok) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const response = NextResponse.json({ user: publicUser(user) });
    return setAuthCookie(response, { id: user.id, email: user.email, paid: Boolean(user.paid) });
  }

  const actionInput = actionSchema.safeParse(body);
  if (!actionInput.success) {
    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  }

  if (actionInput.data.action === "logout") {
    const response = NextResponse.json({ ok: true });
    response.cookies.set({
      name: SESSION_COOKIE,
      value: "",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0
    });
    return response;
  }

  const user = await readCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (actionInput.data.action === "startCheckout") {
    const checkoutToken = generateToken("chk_");
    db.prepare("INSERT INTO checkout_sessions (token, user_id, status) VALUES (?, ?, 'pending')").run(
      checkoutToken,
      user.id
    );

    let checkoutUrl: string;
    try {
      checkoutUrl = await createCheckoutUrl({
        userId: user.id,
        email: user.email,
        checkoutToken
      });
    } catch (error) {
      db.prepare("DELETE FROM checkout_sessions WHERE token = ?").run(checkoutToken);
      const message =
        error instanceof Error ? error.message : "Could not initialize Lemon Squeezy checkout";
      return NextResponse.json({ error: message }, { status: 500 });
    }

    return NextResponse.json({
      checkoutToken,
      checkoutUrl
    });
  }

  if (actionInput.data.action === "verifyCheckout") {
    const token = actionInput.data.checkoutToken;
    if (!token) {
      return NextResponse.json({ error: "Missing checkoutToken" }, { status: 400 });
    }

    const checkout = db
      .prepare("SELECT * FROM checkout_sessions WHERE token = ? AND user_id = ? LIMIT 1")
      .get(token, user.id) as
      | {
          token: string;
          user_id: number;
          status: string;
          paid_at: string | null;
        }
      | undefined;

    if (!checkout) {
      return NextResponse.json({ paid: false, reason: "Checkout session not found" }, { status: 404 });
    }

    const isPaid = checkout.status === "paid";

    if (!isPaid) {
      return NextResponse.json({ paid: false, reason: "Payment not confirmed yet" }, { status: 202 });
    }

    db.prepare("UPDATE users SET paid = 1 WHERE id = ?").run(user.id);

    const response = NextResponse.json({ paid: true });
    return setAuthCookie(response, { id: user.id, email: user.email, paid: true });
  }

  const fresh = db.prepare("SELECT * FROM users WHERE id = ? LIMIT 1").get(user.id) as UserRow | undefined;

  if (!fresh) {
    return NextResponse.json({ error: "User no longer exists" }, { status: 404 });
  }

  const response = NextResponse.json({ user: publicUser(fresh) });
  return setAuthCookie(response, {
    id: fresh.id,
    email: fresh.email,
    paid: Boolean(fresh.paid)
  });
}
