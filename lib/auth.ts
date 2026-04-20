import { randomUUID } from "node:crypto";

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { findUserByEmail, findUserById, upsertUser } from "@/lib/storage";
import type { SessionClaims, User } from "@/lib/types";

export const SESSION_COOKIE = "clv_session";

const THIRTY_DAYS = 60 * 60 * 24 * 30;

function authSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET || "dev-auth-secret-change-me";
  return new TextEncoder().encode(secret);
}

export function isUserPaid(user: User): boolean {
  if (!user.paidUntil) {
    return false;
  }

  return new Date(user.paidUntil).getTime() > Date.now() && user.subscriptionStatus === "active";
}

export async function signSession(claims: SessionClaims): Promise<string> {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(`${THIRTY_DAYS}s`)
    .sign(authSecret());
}

export async function verifySession(token: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, authSecret());

    if (typeof payload.sub !== "string" || typeof payload.email !== "string") {
      return null;
    }

    return {
      sub: payload.sub,
      email: payload.email
    };
  } catch {
    return null;
  }
}

export async function getOrCreateUser(email: string): Promise<User> {
  const normalized = email.trim().toLowerCase();
  const now = new Date().toISOString();
  const existing = await findUserByEmail(normalized);

  if (existing) {
    return existing;
  }

  const user: User = {
    id: randomUUID(),
    email: normalized,
    createdAt: now,
    updatedAt: now,
    paidUntil: null,
    subscriptionStatus: "inactive",
    lemonCustomerId: null,
    lemonSubscriptionId: null
  };

  await upsertUser(user);
  return user;
}

export async function getUserFromRequest(request: NextRequest): Promise<User | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const claims = await verifySession(token);

  if (!claims?.sub) {
    return null;
  }

  return findUserById(claims.sub);
}

export async function getUserFromServerCookies(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const claims = await verifySession(token);

  if (!claims?.sub) {
    return null;
  }

  return findUserById(claims.sub);
}

export async function attachSession(response: NextResponse, user: User): Promise<void> {
  const token = await signSession({
    sub: user.id,
    email: user.email
  });

  response.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: THIRTY_DAYS,
    path: "/"
  });
}

export function clearSession(response: NextResponse): void {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/"
  });
}
