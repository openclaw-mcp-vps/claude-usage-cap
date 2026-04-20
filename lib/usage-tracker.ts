import { getSpendSince, getUsageSeries, recordUsageEvent } from "@/lib/db";

export type CapPeriod = "daily" | "weekly" | "monthly";

const MODEL_PRICING_PER_MILLION: Record<
  string,
  { input: number; output: number; cacheCreation: number; cacheRead: number }
> = {
  "claude-3-opus-latest": { input: 15, output: 75, cacheCreation: 18.75, cacheRead: 1.5 },
  "claude-3-5-sonnet-latest": { input: 3, output: 15, cacheCreation: 3.75, cacheRead: 0.3 },
  "claude-3-7-sonnet-latest": { input: 3, output: 15, cacheCreation: 3.75, cacheRead: 0.3 },
  "claude-3-5-haiku-latest": { input: 0.8, output: 4, cacheCreation: 1, cacheRead: 0.08 },
  "claude-sonnet-4-0": { input: 3, output: 15, cacheCreation: 3.75, cacheRead: 0.3 },
  "claude-haiku-4-0": { input: 0.8, output: 4, cacheCreation: 1, cacheRead: 0.08 }
};

function pricingForModel(model: string) {
  return MODEL_PRICING_PER_MILLION[model] || MODEL_PRICING_PER_MILLION["claude-3-7-sonnet-latest"];
}

export function estimateCostUsd(input: {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
}) {
  const pricing = pricingForModel(input.model);

  const cost =
    (input.inputTokens / 1_000_000) * pricing.input +
    (input.outputTokens / 1_000_000) * pricing.output +
    (input.cacheCreationTokens / 1_000_000) * pricing.cacheCreation +
    (input.cacheReadTokens / 1_000_000) * pricing.cacheRead;

  return Number(cost.toFixed(6));
}

export function getPeriodStart(period: CapPeriod, now = new Date()) {
  const date = new Date(now);

  if (period === "daily") {
    date.setUTCHours(0, 0, 0, 0);
    return date.toISOString();
  }

  if (period === "weekly") {
    const day = date.getUTCDay();
    const deltaToMonday = (day + 6) % 7;
    date.setUTCDate(date.getUTCDate() - deltaToMonday);
    date.setUTCHours(0, 0, 0, 0);
    return date.toISOString();
  }

  date.setUTCDate(1);
  date.setUTCHours(0, 0, 0, 0);
  return date.toISOString();
}

export function getCurrentSpend(projectId: string) {
  const dailyStart = getPeriodStart("daily");
  const weeklyStart = getPeriodStart("weekly");
  const monthlyStart = getPeriodStart("monthly");

  return {
    daily: getSpendSince(projectId, dailyStart),
    weekly: getSpendSince(projectId, weeklyStart),
    monthly: getSpendSince(projectId, monthlyStart),
    starts: {
      daily: dailyStart,
      weekly: weeklyStart,
      monthly: monthlyStart
    }
  };
}

export function evaluateCapState(input: {
  caps: { dailyCap: number; weeklyCap: number; monthlyCap: number };
  spend: { daily: number; weekly: number; monthly: number };
}) {
  const states = {
    daily: {
      cap: input.caps.dailyCap,
      spent: input.spend.daily,
      remaining: Number((input.caps.dailyCap - input.spend.daily).toFixed(4)),
      exceeded: input.spend.daily >= input.caps.dailyCap
    },
    weekly: {
      cap: input.caps.weeklyCap,
      spent: input.spend.weekly,
      remaining: Number((input.caps.weeklyCap - input.spend.weekly).toFixed(4)),
      exceeded: input.spend.weekly >= input.caps.weeklyCap
    },
    monthly: {
      cap: input.caps.monthlyCap,
      spent: input.spend.monthly,
      remaining: Number((input.caps.monthlyCap - input.spend.monthly).toFixed(4)),
      exceeded: input.spend.monthly >= input.caps.monthlyCap
    }
  };

  const exceededPeriods = (Object.keys(states) as CapPeriod[]).filter((period) => states[period].exceeded);

  return {
    states,
    exceededPeriods
  };
}

export function recordUsageFromAnthropicResponse(input: {
  projectId: string;
  model: string;
  usage: {
    input_tokens?: number;
    output_tokens?: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };
}) {
  const inputTokens = input.usage.input_tokens ?? 0;
  const outputTokens = input.usage.output_tokens ?? 0;
  const cacheCreationTokens = input.usage.cache_creation_input_tokens ?? 0;
  const cacheReadTokens = input.usage.cache_read_input_tokens ?? 0;

  const costUsd = estimateCostUsd({
    model: input.model,
    inputTokens,
    outputTokens,
    cacheCreationTokens,
    cacheReadTokens
  });

  recordUsageEvent({
    projectId: input.projectId,
    model: input.model,
    inputTokens,
    outputTokens,
    cacheCreationTokens,
    cacheReadTokens,
    costUsd
  });

  return costUsd;
}

export function buildDailyUsageSeries(projectId: string, days: number) {
  const now = new Date();
  const start = new Date(now);
  start.setUTCDate(now.getUTCDate() - (days - 1));
  start.setUTCHours(0, 0, 0, 0);

  const rows = getUsageSeries(projectId, start.toISOString());
  const rowMap = new Map(rows.map((row) => [row.date, row.spend]));

  const series: Array<{ date: string; spend: number }> = [];
  const cursor = new Date(start);

  while (cursor <= now) {
    const day = cursor.toISOString().slice(0, 10);
    series.push({
      date: day,
      spend: Number((rowMap.get(day) || 0).toFixed(6))
    });

    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return series;
}
