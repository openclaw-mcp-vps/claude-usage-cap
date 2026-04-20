import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __clawPool: Pool | undefined;
  // eslint-disable-next-line no-var
  var __clawSchemaInit: Promise<void> | undefined;
}

function getPool(): Pool {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is required. Provision Postgres and set DATABASE_URL to enable Claude Usage Cap."
    );
  }

  if (!global.__clawPool) {
    const useSsl =
      !connectionString.includes("localhost") &&
      !connectionString.includes("127.0.0.1") &&
      !connectionString.includes("sslmode=disable");

    global.__clawPool = new Pool({
      connectionString,
      max: 10,
      ssl: useSsl ? { rejectUnauthorized: false } : undefined
    });
  }

  return global.__clawPool;
}

async function initSchema(): Promise<void> {
  const pool = getPool();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      email TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      customer_id TEXT,
      subscription_id TEXT,
      order_id TEXT,
      current_period_end TIMESTAMPTZ,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      owner_email TEXT NOT NULL,
      name TEXT NOT NULL,
      anthropic_key_encrypted TEXT NOT NULL,
      proxy_key_hash TEXT UNIQUE NOT NULL,
      proxy_key_last4 TEXT NOT NULL,
      slack_webhook_url TEXT,
      daily_cap_usd NUMERIC(12, 2) NOT NULL,
      weekly_cap_usd NUMERIC(12, 2) NOT NULL,
      monthly_cap_usd NUMERIC(12, 2) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_projects_owner_email ON projects(owner_email);

    CREATE TABLE IF NOT EXISTS usage_events (
      id BIGSERIAL PRIMARY KEY,
      project_id TEXT NOT NULL,
      model TEXT NOT NULL,
      input_tokens INTEGER NOT NULL DEFAULT 0,
      output_tokens INTEGER NOT NULL DEFAULT 0,
      cache_creation_tokens INTEGER NOT NULL DEFAULT 0,
      cache_read_tokens INTEGER NOT NULL DEFAULT 0,
      cost_usd NUMERIC(14, 6) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT fk_usage_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_usage_events_project_created_at ON usage_events(project_id, created_at);

    CREATE TABLE IF NOT EXISTS alert_events (
      id BIGSERIAL PRIMARY KEY,
      project_id TEXT NOT NULL,
      window_type TEXT NOT NULL,
      window_start TIMESTAMPTZ NOT NULL,
      sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT fk_alert_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      CONSTRAINT uniq_alert_window UNIQUE(project_id, window_type, window_start)
    );

    CREATE TABLE IF NOT EXISTS processed_webhooks (
      event_key TEXT PRIMARY KEY,
      processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

export async function ensureSchema(): Promise<void> {
  if (!global.__clawSchemaInit) {
    global.__clawSchemaInit = initSchema();
  }

  await global.__clawSchemaInit;
}

export async function sql<T = Record<string, unknown>>(
  query: string,
  values: unknown[] = []
): Promise<T[]> {
  await ensureSchema();
  const pool = getPool();
  const result = await pool.query(query, values);
  return result.rows as T[];
}

export async function sqlOne<T = Record<string, unknown>>(
  query: string,
  values: unknown[] = []
): Promise<T | null> {
  const rows = await sql<T>(query, values);
  return rows[0] ?? null;
}
