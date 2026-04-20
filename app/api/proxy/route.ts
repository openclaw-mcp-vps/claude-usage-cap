import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  estimateClaudeCostUsd,
  sendClaudeRequest
} from "@/lib/anthropic-proxy";
import { hasActiveSubscription } from "@/lib/lemonsqueezy";
import { getProjectForProxyKey } from "@/lib/projects";
import { sendCapExceededAlert } from "@/lib/slack-alerts";
import {
  evaluateCapStatus,
  getUsageTotals,
  recordUsageEvent,
  type WindowType
} from "@/lib/usage-tracker";

export const runtime = "nodejs";

const ProxyPayloadSchema = z
  .object({
    model: z.string().min(1),
    max_tokens: z.number().int().positive(),
    messages: z.array(z.any()).min(1)
  })
  .passthrough();

function extractBearerToken(request: NextRequest): string | null {
  const header = request.headers.get("authorization");

  if (!header || !header.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  const token = header.slice("bearer ".length).trim();
  return token.length > 0 ? token : null;
}

async function notifyExceededCaps(input: {
  project: {
    id: string;
    name: string;
    slackWebhookUrl: string | null;
    dailyCapUsd: number;
    weeklyCapUsd: number;
    monthlyCapUsd: number;
  };
  exceeded: Array<{ window: WindowType; total: number; cap: number }>;
}): Promise<void> {
  await Promise.all(
    input.exceeded.map((item) =>
      sendCapExceededAlert({
        project: input.project,
        windowType: item.window,
        totalUsd: item.total,
        capUsd: item.cap
      }).catch(() => ({ sent: false }))
    )
  );
}

export async function POST(request: NextRequest) {
  const proxyKey = extractBearerToken(request);

  if (!proxyKey) {
    return NextResponse.json(
      { error: "Missing or invalid Bearer proxy key" },
      { status: 401 }
    );
  }

  const project = await getProjectForProxyKey(proxyKey);

  if (!project) {
    return NextResponse.json({ error: "Invalid proxy key" }, { status: 401 });
  }

  const paid = await hasActiveSubscription(project.ownerEmail);

  if (!paid) {
    return NextResponse.json(
      {
        error:
          "Subscription inactive. Proxy requests are disabled until billing is active."
      },
      { status: 402 }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = ProxyPayloadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Body must match Anthropic message format" },
      { status: 400 }
    );
  }

  const totalsBefore = await getUsageTotals(project.id);
  const statusBefore = evaluateCapStatus(project, totalsBefore);

  if (statusBefore.exceeded.length > 0) {
    await notifyExceededCaps({
      project,
      exceeded: statusBefore.exceeded
    });

    return NextResponse.json(
      {
        error: "Spend cap exceeded for this project. Proxy access is temporarily blocked.",
        caps: {
          daily: project.dailyCapUsd,
          weekly: project.weeklyCapUsd,
          monthly: project.monthlyCapUsd
        },
        totals: totalsBefore,
        exceeded: statusBefore.exceeded
      },
      { status: 429 }
    );
  }

  try {
    const anthropicResponse = await sendClaudeRequest({
      anthropicApiKey: project.anthropicApiKey,
      payload: parsed.data
    });

    const usage = (anthropicResponse.usage ?? {}) as Record<string, unknown>;
    const model =
      (typeof anthropicResponse.model === "string" && anthropicResponse.model) ||
      parsed.data.model;

    const inputTokens = Number(usage.input_tokens ?? 0);
    const outputTokens = Number(usage.output_tokens ?? 0);
    const cacheCreationTokens = Number(
      usage.cache_creation_input_tokens ?? usage.cache_creation_tokens ?? 0
    );
    const cacheReadTokens = Number(
      usage.cache_read_input_tokens ?? usage.cache_read_tokens ?? 0
    );

    const estimatedCostUsd = estimateClaudeCostUsd(model, {
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cache_creation_input_tokens: cacheCreationTokens,
      cache_read_input_tokens: cacheReadTokens
    });

    await recordUsageEvent({
      projectId: project.id,
      model,
      inputTokens,
      outputTokens,
      cacheCreationTokens,
      cacheReadTokens,
      costUsd: estimatedCostUsd
    });

    const totalsAfter = await getUsageTotals(project.id);
    const statusAfter = evaluateCapStatus(project, totalsAfter);

    if (statusAfter.exceeded.length > 0) {
      await notifyExceededCaps({ project, exceeded: statusAfter.exceeded });
    }

    const response = NextResponse.json(anthropicResponse);
    response.headers.set("x-claw-request-cost-usd", estimatedCostUsd.toFixed(6));
    response.headers.set("x-claw-day-spend-usd", totalsAfter.day.toFixed(6));
    response.headers.set("x-claw-week-spend-usd", totalsAfter.week.toFixed(6));
    response.headers.set("x-claw-month-spend-usd", totalsAfter.month.toFixed(6));

    return response;
  } catch (error: unknown) {
    const status =
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      typeof (error as { status?: unknown }).status === "number"
        ? ((error as { status: number }).status ?? 500)
        : 500;

    const message =
      typeof error === "object" &&
      error !== null &&
      "message" in error &&
      typeof (error as { message?: unknown }).message === "string"
        ? (error as { message: string }).message
        : "Anthropic proxy request failed";

    return NextResponse.json(
      {
        error: message
      },
      { status }
    );
  }
}
