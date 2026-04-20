import { randomUUID } from "node:crypto";

import { addAlertLog, addUsageEvent, listAlertLogs, listUsageEvents } from "@/lib/storage";
import type { BillingCaps, Project, UsageEvent } from "@/lib/types";

const MODEL_PRICING_PER_MILLION: Record<
  string,
  {
    input: number;
    output: number;
  }
> = {
  "claude-3-5-haiku-latest": { input: 0.8, output: 4 },
  "claude-3-5-sonnet-latest": { input: 3, output: 15 },
  "claude-3-7-sonnet-latest": { input: 3, output: 15 },
  "claude-sonnet-4-0": { input: 3, output: 15 },
  "claude-opus-4-0": { input: 15, output: 75 }
};

const DEFAULT_PRICING = { input: 3, output: 15 };

export function normalizeModelName(model: string): string {
  return model.trim().toLowerCase();
}

export function calculateCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = MODEL_PRICING_PER_MILLION[normalizeModelName(model)] ?? DEFAULT_PRICING;
  const inputCost = (Math.max(0, inputTokens) / 1_000_000) * pricing.input;
  const outputCost = (Math.max(0, outputTokens) / 1_000_000) * pricing.output;

  return Number((inputCost + outputCost).toFixed(6));
}

export function periodStart(period: "daily" | "weekly" | "monthly", date = new Date()): Date {
  const value = new Date(date);

  if (period === "daily") {
    value.setUTCHours(0, 0, 0, 0);
    return value;
  }

  if (period === "weekly") {
    const day = value.getUTCDay();
    const diff = (day + 6) % 7;
    value.setUTCDate(value.getUTCDate() - diff);
    value.setUTCHours(0, 0, 0, 0);
    return value;
  }

  value.setUTCDate(1);
  value.setUTCHours(0, 0, 0, 0);
  return value;
}

export async function recordUsage(params: {
  projectId: string;
  requestId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}): Promise<UsageEvent> {
  const event: UsageEvent = {
    id: randomUUID(),
    projectId: params.projectId,
    requestId: params.requestId,
    model: params.model,
    inputTokens: params.inputTokens,
    outputTokens: params.outputTokens,
    costUsd: params.costUsd,
    createdAt: new Date().toISOString()
  };

  await addUsageEvent(event);
  return event;
}

export async function usageTotals(projectId: string): Promise<{
  daily: number;
  weekly: number;
  monthly: number;
}> {
  const events = await listUsageEvents(projectId);
  const dailyStart = periodStart("daily").getTime();
  const weeklyStart = periodStart("weekly").getTime();
  const monthlyStart = periodStart("monthly").getTime();

  return events.reduce(
    (totals, event) => {
      const ts = new Date(event.createdAt).getTime();

      if (ts >= dailyStart) {
        totals.daily += event.costUsd;
      }

      if (ts >= weeklyStart) {
        totals.weekly += event.costUsd;
      }

      if (ts >= monthlyStart) {
        totals.monthly += event.costUsd;
      }

      return totals;
    },
    {
      daily: 0,
      weekly: 0,
      monthly: 0
    }
  );
}

export async function usageSeries(projectId: string, days = 30): Promise<Array<{ date: string; costUsd: number }>> {
  const events = await listUsageEvents(projectId);
  const now = new Date();
  const buckets = new Map<string, number>();

  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(now);
    date.setUTCDate(now.getUTCDate() - i);
    const key = date.toISOString().slice(0, 10);
    buckets.set(key, 0);
  }

  events.forEach((event) => {
    const key = event.createdAt.slice(0, 10);

    if (buckets.has(key)) {
      buckets.set(key, Number(((buckets.get(key) ?? 0) + event.costUsd).toFixed(6)));
    }
  });

  return [...buckets.entries()].map(([date, costUsd]) => ({ date, costUsd }));
}

export async function limitStatus(project: Project): Promise<{
  exceeded: null | "daily" | "weekly" | "monthly";
  totals: { daily: number; weekly: number; monthly: number };
  caps: BillingCaps;
}> {
  const totals = await usageTotals(project.id);

  if (totals.daily >= project.caps.dailyUsd) {
    return {
      exceeded: "daily",
      totals,
      caps: project.caps
    };
  }

  if (totals.weekly >= project.caps.weeklyUsd) {
    return {
      exceeded: "weekly",
      totals,
      caps: project.caps
    };
  }

  if (totals.monthly >= project.caps.monthlyUsd) {
    return {
      exceeded: "monthly",
      totals,
      caps: project.caps
    };
  }

  return {
    exceeded: null,
    totals,
    caps: project.caps
  };
}

export async function shouldSendLimitAlert(projectId: string, period: "daily" | "weekly" | "monthly"): Promise<boolean> {
  const logs = await listAlertLogs(projectId);
  const start = periodStart(period).toISOString();

  const hasLog = logs.some((item) => item.period === period && item.periodStart === start);
  return !hasLog;
}

export async function markLimitAlertSent(params: {
  projectId: string;
  period: "daily" | "weekly" | "monthly";
  message: string;
}): Promise<void> {
  await addAlertLog({
    id: randomUUID(),
    projectId: params.projectId,
    period: params.period,
    periodStart: periodStart(params.period).toISOString(),
    createdAt: new Date().toISOString(),
    message: params.message
  });
}
