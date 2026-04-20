import { createCipheriv, createDecipheriv, createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

function appSecret() {
  return process.env.APP_SECRET || process.env.STRIPE_WEBHOOK_SECRET || "development-secret-change-me";
}

export function generateProxyKey() {
  return randomBytes(24).toString("base64url");
}

export function hashProxyKey(proxyKey: string) {
  return createHmac("sha256", appSecret()).update(proxyKey).digest("hex");
}

function encryptionKey() {
  return scryptSync(appSecret(), "claude-usage-cap", 32);
}

export function encryptSecret(plaintext: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `enc:v1:${iv.toString("base64url")}:${tag.toString("base64url")}:${ciphertext.toString("base64url")}`;
}

export function decryptSecret(value: string) {
  if (!value.startsWith("enc:v1:")) {
    return value;
  }

  const parts = value.split(":");
  if (parts.length !== 5) {
    throw new Error("Invalid encrypted secret format");
  }

  const iv = Buffer.from(parts[2], "base64url");
  const tag = Buffer.from(parts[3], "base64url");
  const ciphertext = Buffer.from(parts[4], "base64url");

  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

  return decrypted.toString("utf8");
}

export function verifyStripeSignature(payload: string, signatureHeader: string | null, secret: string) {
  if (!signatureHeader) {
    return false;
  }

  const parts = signatureHeader.split(",").map((part) => part.trim());
  const timestampPart = parts.find((part) => part.startsWith("t="));
  const signatures = parts
    .filter((part) => part.startsWith("v1="))
    .map((part) => part.slice(3));

  if (!timestampPart || signatures.length === 0) {
    return false;
  }

  const timestamp = timestampPart.slice(2);
  const signedPayload = `${timestamp}.${payload}`;
  const expected = createHmac("sha256", secret).update(signedPayload).digest("hex");

  for (const signature of signatures) {
    if (signature.length !== expected.length) {
      continue;
    }

    if (timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      return true;
    }
  }

  return false;
}
