import fs from "node:fs";
import path from "node:path";
import BetterSqlite3 from "better-sqlite3";

declare global {
  // eslint-disable-next-line no-var
  var __cucDb: BetterSqlite3.Database | undefined;
}

const dbPath = path.join(process.cwd(), "data", "app.db");
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

function initialize(db: BetterSqlite3.Database) {
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      paid INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS checkout_sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      order_id TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      paid_at TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      anthropic_key_encrypted TEXT NOT NULL,
      proxy_key_hash TEXT NOT NULL,
      proxy_key_prefix TEXT NOT NULL,
      daily_cap_usd REAL NOT NULL,
      weekly_cap_usd REAL NOT NULL,
      monthly_cap_usd REAL NOT NULL,
      slack_webhook_url TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
    CREATE INDEX IF NOT EXISTS idx_projects_proxy_prefix ON projects(proxy_key_prefix);

    CREATE TABLE IF NOT EXISTS usage_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id TEXT NOT NULL,
      request_id TEXT,
      model TEXT NOT NULL,
      input_tokens INTEGER NOT NULL,
      output_tokens INTEGER NOT NULL,
      cache_creation_tokens INTEGER NOT NULL DEFAULT 0,
      cache_read_tokens INTEGER NOT NULL DEFAULT 0,
      cost_usd REAL NOT NULL,
      period_day TEXT NOT NULL,
      period_week TEXT NOT NULL,
      period_month TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_usage_project_id ON usage_events(project_id);
    CREATE INDEX IF NOT EXISTS idx_usage_project_day ON usage_events(project_id, period_day);
    CREATE INDEX IF NOT EXISTS idx_usage_project_week ON usage_events(project_id, period_week);
    CREATE INDEX IF NOT EXISTS idx_usage_project_month ON usage_events(project_id, period_month);

    CREATE TABLE IF NOT EXISTS sent_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id TEXT NOT NULL,
      period_type TEXT NOT NULL,
      period_key TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(project_id, period_type, period_key),
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
  `);
}

const database = global.__cucDb ?? new BetterSqlite3(dbPath);

if (!global.__cucDb) {
  initialize(database);
  global.__cucDb = database;
}

export const db = database;

export type UserRow = {
  id: number;
  email: string;
  password_hash: string;
  paid: number;
  created_at: string;
};

export type ProjectRow = {
  id: string;
  user_id: number;
  name: string;
  anthropic_key_encrypted: string;
  proxy_key_hash: string;
  proxy_key_prefix: string;
  daily_cap_usd: number;
  weekly_cap_usd: number;
  monthly_cap_usd: number;
  slack_webhook_url: string | null;
  created_at: string;
  updated_at: string;
};
