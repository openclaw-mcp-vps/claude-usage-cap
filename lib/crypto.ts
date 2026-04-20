import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function getEncryptionKey() {
  const seed = process.env.DATA_ENCRYPTION_SECRET ?? process.env.JWT_SECRET ?? "dev-encryption-secret";
  return createHash("sha256").update(seed).digest();
}

export function encryptSecret(plainText: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString("base64")}.${authTag.toString("base64")}.${encrypted.toString("base64")}`;
}

export function decryptSecret(encryptedBlob: string) {
  const [ivB64, tagB64, payloadB64] = encryptedBlob.split(".");
  if (!ivB64 || !tagB64 || !payloadB64) {
    throw new Error("Malformed encrypted secret");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(ivB64, "base64")
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payloadB64, "base64")),
    decipher.final()
  ]);

  return decrypted.toString("utf8");
}

export function generateToken(prefix = "") {
  return `${prefix}${randomBytes(24).toString("hex")}`;
}
