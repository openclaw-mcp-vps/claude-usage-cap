import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "node:crypto";

const KEY_BYTES = 32;

function deriveKey(): Buffer {
  const source = process.env.SECRET_ENCRYPTION_KEY || "dev-insecure-encryption-key-change-me";
  return createHash("sha256").update(source).digest().subarray(0, KEY_BYTES);
}

export function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

export function secureEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);

  if (aBuf.length !== bBuf.length) {
    return false;
  }

  return timingSafeEqual(aBuf, bBuf);
}

export function generateOpaqueKey(prefix: string): string {
  const token = randomBytes(24).toString("base64url");
  return `${prefix}${token}`;
}

export function encryptSecret(raw: string): string {
  const iv = randomBytes(12);
  const key = deriveKey();
  const cipher = createCipheriv("aes-256-gcm", key, iv);

  const encrypted = Buffer.concat([cipher.update(raw, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptSecret(encrypted: string): string {
  const buffer = Buffer.from(encrypted, "base64");

  const iv = buffer.subarray(0, 12);
  const tag = buffer.subarray(12, 28);
  const payload = buffer.subarray(28);
  const key = deriveKey();

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(payload), decipher.final()]);
  return decrypted.toString("utf8");
}
