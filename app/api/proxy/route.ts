import { compare } from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAnthropicClient, estimateAnthropicCostUsd } from "@/lib/anthropic";
import { decryptSecret } from "@/lib/crypto";
import { db, type ProjectRow } from "@/lib/db";
import { sendCapAlertIfNeeded } from "@/lib/slack-alerts";
import {
  firstExceededCap,
  getPeriodKeys,
  isOverAnyCap,
  readCurrentSpend,
  writeUsageEvent
} from "@/lib/usage-tracker";

export const runtime = "nodejs";

const requestSchema = z
  .object({
    model: z.string().min(1),
    max_tokens: z.number().int().positive(),
    stream: z.boolean().optional()
  })
  .passthrough();

type ProjectWithUser = ProjectRow & {
  user_paid: number;
};

function parseProxyKey(request: NextRequest) {
  const authHeader = request.headers.get("authorization") ?? "";
  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }
  return token.trim();
}

async function resolveProjectByProxyKey(proxyKey: string): Promise<ProjectWithUser | null> {
  const candidates = db
    .prepare(
      `SELECT p.*, u.paid AS user_paid
       FROM projects p
       INNER JOIN users u ON u.id = p.user_id
       WHERE p.proxy_key_prefix = ?`
    )
    .all(proxyKey.slice(0, 16)) as ProjectWithUser[];

  if (!candidates.length) {
    return null;
  }

  for (const candidate of candidates) {
    const matches = await compare(proxyKey, candidate.proxy_key_hash);
    if (matches) {
      return candidate;
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  const proxyKey = parseProxyKey(request);
  if (!proxyKey) {
    return NextResponse.json({ error: "Missing Bearer proxy key" }, { status: 401 });
  }

  const project = await resolveProjectByProxyKey(proxyKey);
  if (!project) {
    return NextResponse.json({ error: "Invalid proxy key" }, { status: 401 });
  }

  if (!project.user_paid) {
    return NextResponse.json(
      { error: "Project owner subscription inactive. Tool access is paywalled." },
      { status: 402 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid Claude request payload" }, { status: 400 });
  }

  if (parsed.data.stream) {
    return NextResponse.json(
      { error: "Streaming mode is not supported yet through this proxy" },
      { status: 400 }
    );
  }

  const keys = getPeriodKeys();
  const spendBefore = readCurrentSpend(project.id, keys);
  const caps = {
    dailyCapUsd: project.daily_cap_usd,
    weeklyCapUsd: project.weekly_cap_usd,
    monthlyCapUsd: project.monthly_cap_usd
  };

  if (isOverAnyCap(spendBefore, caps)) {
    const exceeded = firstExceededCap(spendBefore, caps);
    if (exceeded) {
      await sendCapAlertIfNeeded({
        projectId: project.id,
        projectName: project.name,
        periodType: exceeded.periodType,
        periodKey: keys[exceeded.periodType],
        currentSpendUsd: exceeded.value,
        capUsd: exceeded.cap,
        slackWebhookUrl: project.slack_webhook_url
      });
    }

    return NextResponse.json(
      {
        error: "Usage cap reached. Proxy traffic blocked until cap window resets.",
        spend: spendBefore,
        caps: {
          daily: project.daily_cap_usd,
          weekly: project.weekly_cap_usd,
          monthly: project.monthly_cap_usd
        }
      },
      { status: 429 }
    );
  }

  try {
    const anthropic = createAnthropicClient(decryptSecret(project.anthropic_key_encrypted));
    const completion = await anthropic.messages.create(parsed.data as never);

    const usage = completion.usage ?? {};
    const inputTokens = usage.input_tokens ?? 0;
    const outputTokens = usage.output_tokens ?? 0;
    const cacheCreationTokens = usage.cache_creation_input_tokens ?? 0;
    const cacheReadTokens = usage.cache_read_input_tokens ?? 0;
    const costUsd = estimateAnthropicCostUsd(parsed.data.model, usage);

    writeUsageEvent({
      projectId: project.id,
      requestId: completion.id,
      model: parsed.data.model,
      inputTokens,
      outputTokens,
      cacheCreationTokens,
      cacheReadTokens,
      costUsd,
      keys
    });

    const spendAfter = readCurrentSpend(project.id, keys);
    const exceededAfter = firstExceededCap(spendAfter, caps);

    if (exceededAfter) {
      await sendCapAlertIfNeeded({
        projectId: project.id,
        projectName: project.name,
        periodType: exceededAfter.periodType,
        periodKey: keys[exceededAfter.periodType],
        currentSpendUsd: exceededAfter.value,
        capUsd: exceededAfter.cap,
        slackWebhookUrl: project.slack_webhook_url
      });
    }

    return NextResponse.json(completion);
  } catch (error: unknown) {
    const status =
      typeof error === "object" && error && "status" in error && typeof error.status === "number"
        ? error.status
        : 502;

    const message =
      typeof error === "object" && error && "message" in error && typeof error.message === "string"
        ? error.message
        : "Failed to forward request to Anthropic";

    return NextResponse.json({ error: message }, { status });
  }
}
