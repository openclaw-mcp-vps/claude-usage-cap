import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";

import Database from "better-sqlite3";

import { encryptSecret, generateProxyKey, hashProxyKey } from "@/lib/security";

export type ProjectRecord = {
  id: string;
  name: string;
  proxyKeyHash: string;
  proxyKeyHint: string;
  anthropicApiKey: string;
  dailyCap: number;
  weeklyCap: number;
  monthlyCap: number;
  slackBotToken: string | null;
  slackChannel: string | null;
  isActive: number;
  createdAt: string;
  updatedAt: string;
};

export type UsageEventInsert = {
  projectId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  costUsd: number;
};

let dbInstance: Database.Database | null = null;

function getDbPath() {
  return resolve(process.cwd(), process.env.DATABASE_PATH || ".data/claude-usage-cap.db");
}

function initDb() {
  const dbPath = getDbPath();
  mkdirSync(dirname(dbPath), { recursive: true });

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      proxy_key_hash TEXT NOT NULL UNIQUE,
      proxy_key_hint TEXT NOT NULL,
      anthropic_api_key TEXT NOT NULL,
      daily_cap REAL NOT NULL,
      weekly_cap REAL NOT NULL,
      monthly_cap REAL NOT NULL,
      slack_bot_token TEXT,
      slack_channel TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS usage_events (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      model TEXT NOT NULL,
      input_tokens INTEGER NOT NULL,
      output_tokens INTEGER NOT NULL,
      cache_creation_tokens INTEGER NOT NULL,
      cache_read_tokens INTEGER NOT NULL,
      cost_usd REAL NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(project_id) REFERENCES projects(id)
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      period TEXT NOT NULL,
      period_start TEXT NOT NULL,
      sent_at TEXT NOT NULL,
      UNIQUE(project_id, period, period_start),
      FOREIGN KEY(project_id) REFERENCES projects(id)
    );

    CREATE TABLE IF NOT EXISTS purchases (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      source TEXT NOT NULL,
      created_at TEXT NOT NULL,
      last_paid_at TEXT NOT NULL
    );
  `);

  return db;
}

function db() {
  if (!dbInstance) {
    dbInstance = initDb();
  }

  return dbInstance;
}

const projectSelectColumns = `
  id,
  name,
  proxy_key_hash as proxyKeyHash,
  proxy_key_hint as proxyKeyHint,
  anthropic_api_key as anthropicApiKey,
  daily_cap as dailyCap,
  weekly_cap as weeklyCap,
  monthly_cap as monthlyCap,
  slack_bot_token as slackBotToken,
  slack_channel as slackChannel,
  is_active as isActive,
  created_at as createdAt,
  updated_at as updatedAt
`;

export function listProjects() {
  return db()
    .prepare(`SELECT ${projectSelectColumns} FROM projects WHERE is_active = 1 ORDER BY created_at DESC`)
    .all() as ProjectRecord[];
}

export function getProjectById(projectId: string) {
  return db()
    .prepare(`SELECT ${projectSelectColumns} FROM projects WHERE id = ? AND is_active = 1`)
    .get(projectId) as ProjectRecord | undefined;
}

export function getProjectByProxyKey(proxyKey: string) {
  const proxyKeyHash = hashProxyKey(proxyKey);
  return db()
    .prepare(`SELECT ${projectSelectColumns} FROM projects WHERE proxy_key_hash = ? AND is_active = 1`)
    .get(proxyKeyHash) as ProjectRecord | undefined;
}

export function createProject(input: {
  name: string;
  anthropicApiKey: string;
  dailyCap: number;
  weeklyCap: number;
  monthlyCap: number;
  slackBotToken?: string;
  slackChannel?: string;
}) {
  const now = new Date().toISOString();
  const id = randomUUID();
  const proxyKey = generateProxyKey();
  const proxyKeyHash = hashProxyKey(proxyKey);
  const proxyKeyHint = proxyKey.slice(-6);

  db()
    .prepare(
      `INSERT INTO projects (
        id,
        name,
        proxy_key_hash,
        proxy_key_hint,
        anthropic_api_key,
        daily_cap,
        weekly_cap,
        monthly_cap,
        slack_bot_token,
        slack_channel,
        is_active,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
    )
    .run(
      id,
      input.name,
      proxyKeyHash,
      proxyKeyHint,
      encryptSecret(input.anthropicApiKey),
      input.dailyCap,
      input.weeklyCap,
      input.monthlyCap,
      input.slackBotToken || null,
      input.slackChannel || null,
      now,
      now
    );

  const project = getProjectById(id);

  if (!project) {
    throw new Error("Failed to create project");
  }

  return {
    project,
    proxyKey
  };
}

export function recordUsageEvent(event: UsageEventInsert) {
  const now = new Date().toISOString();

  db()
    .prepare(
      `INSERT INTO usage_events (
        id,
        project_id,
        model,
        input_tokens,
        output_tokens,
        cache_creation_tokens,
        cache_read_tokens,
        cost_usd,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      randomUUID(),
      event.projectId,
      event.model,
      event.inputTokens,
      event.outputTokens,
      event.cacheCreationTokens,
      event.cacheReadTokens,
      event.costUsd,
      now
    );
}

export function getSpendSince(projectId: string, sinceIso: string) {
  const row = db()
    .prepare(
      `SELECT COALESCE(SUM(cost_usd), 0) as spend
       FROM usage_events
       WHERE project_id = ? AND created_at >= ?`
    )
    .get(projectId, sinceIso) as { spend: number };

  return row.spend || 0;
}

export function getUsageSeries(projectId: string, sinceIso: string) {
  return db()
    .prepare(
      `SELECT substr(created_at, 1, 10) as date, COALESCE(SUM(cost_usd), 0) as spend
       FROM usage_events
       WHERE project_id = ? AND created_at >= ?
       GROUP BY substr(created_at, 1, 10)
       ORDER BY date ASC`
    )
    .all(projectId, sinceIso) as Array<{ date: string; spend: number }>;
}

export function markAlertSent(projectId: string, period: string, periodStart: string) {
  const now = new Date().toISOString();

  const result = db()
    .prepare(
      `INSERT OR IGNORE INTO alerts (id, project_id, period, period_start, sent_at)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(randomUUID(), projectId, period, periodStart, now);

  return result.changes > 0;
}

export function upsertPurchase(email: string, source: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const now = new Date().toISOString();

  db()
    .prepare(
      `INSERT INTO purchases (id, email, source, created_at, last_paid_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(email)
       DO UPDATE SET source = excluded.source, last_paid_at = excluded.last_paid_at`
    )
    .run(randomUUID(), normalizedEmail, source, now, now);
}

export function hasPurchaseForEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();

  const row = db()
    .prepare(`SELECT email FROM purchases WHERE email = ?`)
    .get(normalizedEmail) as { email: string } | undefined;

  return Boolean(row);
}
