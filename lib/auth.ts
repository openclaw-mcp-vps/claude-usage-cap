import crypto from "crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "claw_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

function getCookieSecret(): string {
  return process.env.APP_COOKIE_SECRET ?? "local-dev-cookie-secret-change-me";
}

function base64url(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url");
}

function sign(payloadB64: string): string {
  return crypto
    .createHmac("sha256", getCookieSecret())
    .update(payloadB64)
    .digest("base64url");
}

function createToken(email: string): string {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    email,
    exp: now + SESSION_TTL_SECONDS
  };

  const payloadB64 = base64url(JSON.stringify(payload));
  const signature = sign(payloadB64);
  return `${payloadB64}.${signature}`;
}

function verifyToken(token: string): { email: string; exp: number } | null {
  const [payloadB64, signature] = token.split(".");

  if (!payloadB64 || !signature) {
    return null;
  }

  const expected = sign(payloadB64);
  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (providedBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (!crypto.timingSafeEqual(providedBuffer, expectedBuffer)) {
    return null;
  }

  const payloadText = Buffer.from(payloadB64, "base64url").toString("utf8");

  try {
    const payload = JSON.parse(payloadText) as { email: string; exp: number };
    const now = Math.floor(Date.now() / 1000);

    if (!payload.email || payload.exp < now) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function setSessionCookie(response: NextResponse, email: string): void {
  const token = createToken(email);

  response.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });
}

export function getSessionFromRequest(
  request: NextRequest
): { email: string } | null {
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const payload = verifyToken(token);

  if (!payload) {
    return null;
  }

  return { email: payload.email };
}

export async function getSessionFromServerCookies(): Promise<{ email: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const payload = verifyToken(token);

  if (!payload) {
    return null;
  }

  return { email: payload.email };
}
