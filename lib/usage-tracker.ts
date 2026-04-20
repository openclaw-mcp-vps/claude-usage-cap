import { db } from "@/lib/db";

export type SpendCaps = {
  dailyCapUsd: number;
  weeklyCapUsd: number;
  monthlyCapUsd: number;
};

export type SpendSnapshot = {
  daily: number;
  weekly: number;
  monthly: number;
};

export type PeriodKeys = {
  day: string;
  week: string;
  month: string;
};

export type CapPeriodType = keyof PeriodKeys;

type UsageWriteInput = {
  projectId: string;
  requestId: string | null;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  costUsd: number;
  keys: PeriodKeys;
};

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getIsoWeekKey(date: Date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function getPeriodKeys(now = new Date()): PeriodKeys {
  return {
    day: toIsoDate(now),
    week: getIsoWeekKey(now),
    month: now.toISOString().slice(0, 7)
  };
}

export function readCurrentSpend(projectId: string, keys = getPeriodKeys()): SpendSnapshot {
  const dailyRow = db
    .prepare("SELECT COALESCE(SUM(cost_usd), 0) AS value FROM usage_events WHERE project_id = ? AND period_day = ?")
    .get(projectId, keys.day) as { value: number };

  const weeklyRow = db
    .prepare("SELECT COALESCE(SUM(cost_usd), 0) AS value FROM usage_events WHERE project_id = ? AND period_week = ?")
    .get(projectId, keys.week) as { value: number };

  const monthlyRow = db
    .prepare("SELECT COALESCE(SUM(cost_usd), 0) AS value FROM usage_events WHERE project_id = ? AND period_month = ?")
    .get(projectId, keys.month) as { value: number };

  return {
    daily: Number(dailyRow.value ?? 0),
    weekly: Number(weeklyRow.value ?? 0),
    monthly: Number(monthlyRow.value ?? 0)
  };
}

export function isOverAnyCap(spend: SpendSnapshot, caps: SpendCaps) {
  return (
    spend.daily >= caps.dailyCapUsd ||
    spend.weekly >= caps.weeklyCapUsd ||
    spend.monthly >= caps.monthlyCapUsd
  );
}

export function firstExceededCap(
  spend: SpendSnapshot,
  caps: SpendCaps
): { periodType: CapPeriodType; value: number; cap: number } | null {
  if (spend.daily >= caps.dailyCapUsd) {
    return { periodType: "day", value: spend.daily, cap: caps.dailyCapUsd };
  }
  if (spend.weekly >= caps.weeklyCapUsd) {
    return { periodType: "week", value: spend.weekly, cap: caps.weeklyCapUsd };
  }
  if (spend.monthly >= caps.monthlyCapUsd) {
    return { periodType: "month", value: spend.monthly, cap: caps.monthlyCapUsd };
  }
  return null;
}

export function writeUsageEvent(input: UsageWriteInput) {
  db.prepare(
    `INSERT INTO usage_events (
      project_id,
      request_id,
      model,
      input_tokens,
      output_tokens,
      cache_creation_tokens,
      cache_read_tokens,
      cost_usd,
      period_day,
      period_week,
      period_month
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    input.projectId,
    input.requestId,
    input.model,
    input.inputTokens,
    input.outputTokens,
    input.cacheCreationTokens,
    input.cacheReadTokens,
    input.costUsd,
    input.keys.day,
    input.keys.week,
    input.keys.month
  );
}

export function readUsageSeries(projectId: string, days = 30) {
  const rows = db
    .prepare(
      `SELECT period_day AS day, ROUND(SUM(cost_usd), 6) AS spend
       FROM usage_events
       WHERE project_id = ?
         AND created_at >= datetime('now', ?)
       GROUP BY period_day
       ORDER BY period_day ASC`
    )
    .all(projectId, `-${Math.max(days, 1)} days`) as { day: string; spend: number }[];

  return rows.map((row) => ({
    day: row.day,
    spend: Number(row.spend ?? 0)
  }));
}

export function wasAlertSent(projectId: string, periodType: string, periodKey: string) {
  const row = db
    .prepare(
      "SELECT id FROM sent_alerts WHERE project_id = ? AND period_type = ? AND period_key = ? LIMIT 1"
    )
    .get(projectId, periodType, periodKey) as { id?: number } | undefined;

  return Boolean(row?.id);
}

export function markAlertSent(projectId: string, periodType: string, periodKey: string) {
  db.prepare(
    `INSERT OR IGNORE INTO sent_alerts (
      project_id,
      period_type,
      period_key
    ) VALUES (?, ?, ?)`
  ).run(projectId, periodType, periodKey);
}
