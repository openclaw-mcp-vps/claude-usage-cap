import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "cuc_session";

export type SessionPayload = {
  uid: number;
  email: string;
  paid: boolean;
};

type VerifiedSession = SessionPayload & {
  iat?: number;
  exp?: number;
};

function getJwtSecret() {
  const secret = process.env.JWT_SECRET ?? "dev-secret-change-me";
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getJwtSecret());
}

export async function verifySession(token: string): Promise<VerifiedSession | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    if (
      typeof payload.uid !== "number" ||
      typeof payload.email !== "string" ||
      typeof payload.paid !== "boolean"
    ) {
      return null;
    }

    return payload as VerifiedSession;
  } catch {
    return null;
  }
}

export async function readSessionFromCookie(cookieValue?: string | null) {
  if (!cookieValue) {
    return null;
  }

  return verifySession(cookieValue);
}
