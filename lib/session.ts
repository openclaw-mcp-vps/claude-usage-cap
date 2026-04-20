import { jwtVerify, SignJWT } from "jose";

export const SESSION_COOKIE = "claude_usage_cap_session";

function getSessionSecret() {
  return process.env.APP_SECRET || process.env.STRIPE_WEBHOOK_SECRET || "development-secret-change-me";
}

function secretKey() {
  return new TextEncoder().encode(getSessionSecret());
}

export async function createSessionToken(email: string) {
  return new SignJWT({ email, role: "paid" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secretKey());
}

export async function verifySessionToken(token: string) {
  try {
    const verified = await jwtVerify(token, secretKey());
    return verified.payload as { email?: string; role?: string };
  } catch {
    return null;
  }
}
