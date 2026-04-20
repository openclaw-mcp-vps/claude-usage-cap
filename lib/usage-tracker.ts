import { sql, sqlOne } from "@/lib/db";
import type { ProjectSummary } from "@/lib/projects";

export type UsageEventInput = {
  projectId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  costUsd: number;
};

export type UsageTotals = {
  day: number;
  week: number;
  month: number;
};

export type UsagePoint = {
  day: string;
  costUsd: number;
};

export type WindowType = "day" | "week" | "month";

function toUtcDayStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function toUtcMonthStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function toUtcWeekStart(date: Date): Date {
  const dayStart = toUtcDayStart(date);
  const day = dayStart.getUTCDay();
  const daysFromMonday = (day + 6) % 7;
  dayStart.setUTCDate(dayStart.getUTCDate() - daysFromMonday);
  return dayStart;
}

export function getUsageWindows(now = new Date()): {
  dayStart: Date;
  weekStart: Date;
  monthStart: Date;
} {
  return {
    dayStart: toUtcDayStart(now),
    weekStart: toUtcWeekStart(now),
    monthStart: toUtcMonthStart(now)
  };
}

export async function recordUsageEvent(input: UsageEventInput): Promise<void> {
  await sql(
    `
    INSERT INTO usage_events (
      project_id,
      model,
      input_tokens,
      output_tokens,
      cache_creation_tokens,
      cache_read_tokens,
      cost_usd
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7)
    `,
    [
      input.projectId,
      input.model,
      input.inputTokens,
      input.outputTokens,
      input.cacheCreationTokens,
      input.cacheReadTokens,
      input.costUsd
    ]
  );
}

export async function getUsageTotals(projectId: string, now = new Date()): Promise<UsageTotals> {
  const { dayStart, weekStart, monthStart } = getUsageWindows(now);

  const [dayRow, weekRow, monthRow] = await Promise.all([
    sqlOne<{ total: string }>(
      `SELECT COALESCE(SUM(cost_usd), 0) AS total FROM usage_events WHERE project_id = $1 AND created_at >= $2`,
      [projectId, dayStart.toISOString()]
    ),
    sqlOne<{ total: string }>(
      `SELECT COALESCE(SUM(cost_usd), 0) AS total FROM usage_events WHERE project_id = $1 AND created_at >= $2`,
      [projectId, weekStart.toISOString()]
    ),
    sqlOne<{ total: string }>(
      `SELECT COALESCE(SUM(cost_usd), 0) AS total FROM usage_events WHERE project_id = $1 AND created_at >= $2`,
      [projectId, monthStart.toISOString()]
    )
  ]);

  return {
    day: Number(dayRow?.total ?? 0),
    week: Number(weekRow?.total ?? 0),
    month: Number(monthRow?.total ?? 0)
  };
}

export async function getDailyUsageSeries(
  projectId: string,
  days = 30,
  now = new Date()
): Promise<UsagePoint[]> {
  const cappedDays = Math.max(1, Math.min(days, 120));
  const dayStart = toUtcDayStart(now);
  const rangeStart = new Date(dayStart);
  rangeStart.setUTCDate(rangeStart.getUTCDate() - (cappedDays - 1));

  const rows = await sql<{ day: string; total: string }>(
    `
    SELECT
      DATE_TRUNC('day', created_at)::date::text AS day,
      COALESCE(SUM(cost_usd), 0) AS total
    FROM usage_events
    WHERE project_id = $1 AND created_at >= $2
    GROUP BY DATE_TRUNC('day', created_at)
    ORDER BY DATE_TRUNC('day', created_at)
    `,
    [projectId, rangeStart.toISOString()]
  );

  const lookup = new Map<string, number>();
  rows.forEach((row) => {
    lookup.set(row.day, Number(row.total));
  });

  const points: UsagePoint[] = [];

  for (let i = 0; i < cappedDays; i += 1) {
    const pointDate = new Date(rangeStart);
    pointDate.setUTCDate(rangeStart.getUTCDate() + i);
    const key = pointDate.toISOString().slice(0, 10);

    points.push({
      day: key,
      costUsd: lookup.get(key) ?? 0
    });
  }

  return points;
}

export function evaluateCapStatus(project: ProjectSummary, totals: UsageTotals): {
  exceeded: Array<{ window: WindowType; total: number; cap: number }>;
  remaining: { day: number; week: number; month: number };
} {
  const exceeded: Array<{ window: WindowType; total: number; cap: number }> = [];

  if (totals.day >= project.dailyCapUsd) {
    exceeded.push({ window: "day", total: totals.day, cap: project.dailyCapUsd });
  }

  if (totals.week >= project.weeklyCapUsd) {
    exceeded.push({ window: "week", total: totals.week, cap: project.weeklyCapUsd });
  }

  if (totals.month >= project.monthlyCapUsd) {
    exceeded.push({ window: "month", total: totals.month, cap: project.monthlyCapUsd });
  }

  return {
    exceeded,
    remaining: {
      day: Math.max(0, project.dailyCapUsd - totals.day),
      week: Math.max(0, project.weeklyCapUsd - totals.week),
      month: Math.max(0, project.monthlyCapUsd - totals.month)
    }
  };
}
