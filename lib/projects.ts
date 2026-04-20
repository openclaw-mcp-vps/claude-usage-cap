import crypto from "crypto";
import { sql, sqlOne } from "@/lib/db";

export type ProjectCaps = {
  dailyCapUsd: number;
  weeklyCapUsd: number;
  monthlyCapUsd: number;
};

export type ProjectSummary = {
  id: string;
  ownerEmail: string;
  name: string;
  slackWebhookUrl: string | null;
  dailyCapUsd: number;
  weeklyCapUsd: number;
  monthlyCapUsd: number;
  proxyKeyLast4: string;
  createdAt: string;
  updatedAt: string;
};

export type ProjectWithSecrets = ProjectSummary & {
  anthropicApiKey: string;
  proxyKeyHash: string;
};

function getEncryptionKey(): Buffer {
  const secret =
    process.env.APP_ENCRYPTION_SECRET ??
    process.env.APP_COOKIE_SECRET ??
    "local-dev-encryption-secret-change-me";

  return crypto.createHash("sha256").update(secret).digest();
}

function encryptSecret(value: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}.${tag.toString("hex")}.${encrypted.toString("hex")}`;
}

function decryptSecret(payload: string): string {
  const [ivHex, tagHex, encryptedHex] = payload.split(".");

  if (!ivHex || !tagHex || !encryptedHex) {
    throw new Error("Invalid encrypted secret format");
  }

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(ivHex, "hex")
  );
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, "hex")),
    decipher.final()
  ]);

  return decrypted.toString("utf8");
}

function getProxyPepper(): string {
  return process.env.PROXY_KEY_PEPPER ?? process.env.APP_COOKIE_SECRET ?? "proxy-pepper";
}

export function hashProxyKey(proxyKey: string): string {
  return crypto
    .createHash("sha256")
    .update(`${getProxyPepper()}:${proxyKey}`)
    .digest("hex");
}

export function createProxyKey(): string {
  const random = crypto.randomBytes(24).toString("base64url");
  return `clawc_${random}`;
}

function mapProjectRow(row: {
  id: string;
  owner_email: string;
  name: string;
  slack_webhook_url: string | null;
  daily_cap_usd: string | number;
  weekly_cap_usd: string | number;
  monthly_cap_usd: string | number;
  proxy_key_last4: string;
  created_at: string;
  updated_at: string;
}): ProjectSummary {
  return {
    id: row.id,
    ownerEmail: row.owner_email,
    name: row.name,
    slackWebhookUrl: row.slack_webhook_url,
    dailyCapUsd: Number(row.daily_cap_usd),
    weeklyCapUsd: Number(row.weekly_cap_usd),
    monthlyCapUsd: Number(row.monthly_cap_usd),
    proxyKeyLast4: row.proxy_key_last4,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function createProjectForOwner(input: {
  ownerEmail: string;
  name: string;
  anthropicApiKey: string;
  slackWebhookUrl?: string | null;
  caps: ProjectCaps;
}): Promise<{ project: ProjectSummary; proxyKey: string }> {
  const proxyKey = createProxyKey();
  const proxyKeyHash = hashProxyKey(proxyKey);
  const encryptedAnthropic = encryptSecret(input.anthropicApiKey);
  const id = crypto.randomUUID();

  const row = await sqlOne<{
    id: string;
    owner_email: string;
    name: string;
    slack_webhook_url: string | null;
    daily_cap_usd: string;
    weekly_cap_usd: string;
    monthly_cap_usd: string;
    proxy_key_last4: string;
    created_at: string;
    updated_at: string;
  }>(
    `
    INSERT INTO projects (
      id,
      owner_email,
      name,
      anthropic_key_encrypted,
      proxy_key_hash,
      proxy_key_last4,
      slack_webhook_url,
      daily_cap_usd,
      weekly_cap_usd,
      monthly_cap_usd
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    RETURNING
      id,
      owner_email,
      name,
      slack_webhook_url,
      daily_cap_usd,
      weekly_cap_usd,
      monthly_cap_usd,
      proxy_key_last4,
      created_at,
      updated_at
    `,
    [
      id,
      input.ownerEmail,
      input.name,
      encryptedAnthropic,
      proxyKeyHash,
      proxyKey.slice(-4),
      input.slackWebhookUrl ?? null,
      input.caps.dailyCapUsd,
      input.caps.weeklyCapUsd,
      input.caps.monthlyCapUsd
    ]
  );

  if (!row) {
    throw new Error("Failed to create project");
  }

  return {
    project: mapProjectRow(row),
    proxyKey
  };
}

export async function listProjectsForOwner(ownerEmail: string): Promise<ProjectSummary[]> {
  const rows = await sql<{
    id: string;
    owner_email: string;
    name: string;
    slack_webhook_url: string | null;
    daily_cap_usd: string;
    weekly_cap_usd: string;
    monthly_cap_usd: string;
    proxy_key_last4: string;
    created_at: string;
    updated_at: string;
  }>(
    `
    SELECT
      id,
      owner_email,
      name,
      slack_webhook_url,
      daily_cap_usd,
      weekly_cap_usd,
      monthly_cap_usd,
      proxy_key_last4,
      created_at,
      updated_at
    FROM projects
    WHERE owner_email = $1
    ORDER BY created_at DESC
    `,
    [ownerEmail]
  );

  return rows.map(mapProjectRow);
}

export async function getProjectForOwner(
  ownerEmail: string,
  projectId: string
): Promise<ProjectSummary | null> {
  const row = await sqlOne<{
    id: string;
    owner_email: string;
    name: string;
    slack_webhook_url: string | null;
    daily_cap_usd: string;
    weekly_cap_usd: string;
    monthly_cap_usd: string;
    proxy_key_last4: string;
    created_at: string;
    updated_at: string;
  }>(
    `
    SELECT
      id,
      owner_email,
      name,
      slack_webhook_url,
      daily_cap_usd,
      weekly_cap_usd,
      monthly_cap_usd,
      proxy_key_last4,
      created_at,
      updated_at
    FROM projects
    WHERE id = $1 AND owner_email = $2
    LIMIT 1
    `,
    [projectId, ownerEmail]
  );

  if (!row) {
    return null;
  }

  return mapProjectRow(row);
}

export async function getProjectForProxyKey(
  proxyKey: string
): Promise<ProjectWithSecrets | null> {
  const proxyKeyHash = hashProxyKey(proxyKey);

  const row = await sqlOne<{
    id: string;
    owner_email: string;
    name: string;
    anthropic_key_encrypted: string;
    proxy_key_hash: string;
    slack_webhook_url: string | null;
    daily_cap_usd: string;
    weekly_cap_usd: string;
    monthly_cap_usd: string;
    proxy_key_last4: string;
    created_at: string;
    updated_at: string;
  }>(
    `
    SELECT
      id,
      owner_email,
      name,
      anthropic_key_encrypted,
      proxy_key_hash,
      slack_webhook_url,
      daily_cap_usd,
      weekly_cap_usd,
      monthly_cap_usd,
      proxy_key_last4,
      created_at,
      updated_at
    FROM projects
    WHERE proxy_key_hash = $1
    LIMIT 1
    `,
    [proxyKeyHash]
  );

  if (!row) {
    return null;
  }

  return {
    ...mapProjectRow(row),
    anthropicApiKey: decryptSecret(row.anthropic_key_encrypted),
    proxyKeyHash: row.proxy_key_hash
  };
}

export async function updateProjectForOwner(input: {
  ownerEmail: string;
  projectId: string;
  name?: string;
  anthropicApiKey?: string;
  slackWebhookUrl?: string | null;
  caps?: Partial<ProjectCaps>;
}): Promise<ProjectSummary | null> {
  const existing = await getProjectForOwner(input.ownerEmail, input.projectId);

  if (!existing) {
    return null;
  }

  const updates: string[] = [];
  const values: unknown[] = [];

  if (input.name !== undefined) {
    values.push(input.name);
    updates.push(`name = $${values.length}`);
  }

  if (input.anthropicApiKey !== undefined) {
    values.push(encryptSecret(input.anthropicApiKey));
    updates.push(`anthropic_key_encrypted = $${values.length}`);
  }

  if (input.slackWebhookUrl !== undefined) {
    values.push(input.slackWebhookUrl);
    updates.push(`slack_webhook_url = $${values.length}`);
  }

  if (input.caps?.dailyCapUsd !== undefined) {
    values.push(input.caps.dailyCapUsd);
    updates.push(`daily_cap_usd = $${values.length}`);
  }

  if (input.caps?.weeklyCapUsd !== undefined) {
    values.push(input.caps.weeklyCapUsd);
    updates.push(`weekly_cap_usd = $${values.length}`);
  }

  if (input.caps?.monthlyCapUsd !== undefined) {
    values.push(input.caps.monthlyCapUsd);
    updates.push(`monthly_cap_usd = $${values.length}`);
  }

  if (updates.length === 0) {
    return existing;
  }

  values.push(input.projectId);
  values.push(input.ownerEmail);

  const row = await sqlOne<{
    id: string;
    owner_email: string;
    name: string;
    slack_webhook_url: string | null;
    daily_cap_usd: string;
    weekly_cap_usd: string;
    monthly_cap_usd: string;
    proxy_key_last4: string;
    created_at: string;
    updated_at: string;
  }>(
    `
    UPDATE projects
    SET ${updates.join(", ")}, updated_at = NOW()
    WHERE id = $${values.length - 1} AND owner_email = $${values.length}
    RETURNING
      id,
      owner_email,
      name,
      slack_webhook_url,
      daily_cap_usd,
      weekly_cap_usd,
      monthly_cap_usd,
      proxy_key_last4,
      created_at,
      updated_at
    `,
    values
  );

  if (!row) {
    return null;
  }

  return mapProjectRow(row);
}

export async function rotateProjectProxyKey(input: {
  ownerEmail: string;
  projectId: string;
}): Promise<{ project: ProjectSummary; proxyKey: string } | null> {
  const existing = await getProjectForOwner(input.ownerEmail, input.projectId);

  if (!existing) {
    return null;
  }

  const newProxyKey = createProxyKey();

  const row = await sqlOne<{
    id: string;
    owner_email: string;
    name: string;
    slack_webhook_url: string | null;
    daily_cap_usd: string;
    weekly_cap_usd: string;
    monthly_cap_usd: string;
    proxy_key_last4: string;
    created_at: string;
    updated_at: string;
  }>(
    `
    UPDATE projects
    SET
      proxy_key_hash = $1,
      proxy_key_last4 = $2,
      updated_at = NOW()
    WHERE id = $3 AND owner_email = $4
    RETURNING
      id,
      owner_email,
      name,
      slack_webhook_url,
      daily_cap_usd,
      weekly_cap_usd,
      monthly_cap_usd,
      proxy_key_last4,
      created_at,
      updated_at
    `,
    [hashProxyKey(newProxyKey), newProxyKey.slice(-4), input.projectId, input.ownerEmail]
  );

  if (!row) {
    return null;
  }

  return {
    project: mapProjectRow(row),
    proxyKey: newProxyKey
  };
}
