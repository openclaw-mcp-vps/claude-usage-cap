import { getProjectByProxyKey, markAlertSent } from "@/lib/db";
import { decryptSecret } from "@/lib/security";
import { sendSpendLimitAlert } from "@/lib/slack-alerts";
import {
  evaluateCapState,
  getCurrentSpend,
  getPeriodStart,
  recordUsageFromAnthropicResponse,
  type CapPeriod
} from "@/lib/usage-tracker";

type UsageSnapshot = {
  input_tokens?: number;
  output_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
};

function headersWithCors(init?: HeadersInit) {
  const headers = new Headers(init);
  headers.set("access-control-allow-origin", "*");
  headers.set("access-control-allow-methods", "POST, OPTIONS");
  headers.set("access-control-allow-headers", "content-type, authorization, x-proxy-key, anthropic-version, anthropic-beta");
  return headers;
}

function trackPeriodAlerts(input: {
  projectId: string;
  projectName: string;
  slackBotToken: string | null;
  slackChannel: string | null;
  exceeded: Array<{
    period: CapPeriod;
    cap: number;
    spent: number;
  }>;
}) {
  for (const periodState of input.exceeded) {
    const periodStart = getPeriodStart(periodState.period);
    const didInsert = markAlertSent(input.projectId, periodState.period, periodStart);

    if (!didInsert) {
      continue;
    }

    void sendSpendLimitAlert({
      projectName: input.projectName,
      slackBotToken: input.slackBotToken,
      slackChannel: input.slackChannel,
      period: periodState.period,
      cap: periodState.cap,
      spent: periodState.spent
    }).catch(() => {
      // Best-effort alerting; proxy behavior should not fail when Slack is unavailable.
    });
  }
}

function parseSseUsageChunk(accumulator: {
  buffer: string;
  usage: UsageSnapshot;
}): void {
  const segments = accumulator.buffer.split("\n\n");
  accumulator.buffer = segments.pop() || "";

  for (const segment of segments) {
    const lines = segment.split("\n");

    for (const line of lines) {
      if (!line.startsWith("data:")) {
        continue;
      }

      const raw = line.slice(5).trim();

      if (!raw || raw === "[DONE]") {
        continue;
      }

      try {
        const parsed = JSON.parse(raw) as {
          type?: string;
          usage?: UsageSnapshot;
          message?: { usage?: UsageSnapshot };
        };

        const usage = parsed.usage || parsed.message?.usage;

        if (!usage) {
          continue;
        }

        if (typeof usage.input_tokens === "number") {
          accumulator.usage.input_tokens = usage.input_tokens;
        }

        if (typeof usage.output_tokens === "number") {
          accumulator.usage.output_tokens = usage.output_tokens;
        }

        if (typeof usage.cache_creation_input_tokens === "number") {
          accumulator.usage.cache_creation_input_tokens = usage.cache_creation_input_tokens;
        }

        if (typeof usage.cache_read_input_tokens === "number") {
          accumulator.usage.cache_read_input_tokens = usage.cache_read_input_tokens;
        }
      } catch {
        // Ignore malformed non-JSON chunks.
      }
    }
  }
}

function createTrackedStream(
  upstreamBody: ReadableStream<Uint8Array>,
  onComplete: (usage: UsageSnapshot) => void
): ReadableStream<Uint8Array> {
  const usageAccumulator = {
    buffer: "",
    usage: {} as UsageSnapshot
  };

  const decoder = new TextDecoder();

  const transform = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      usageAccumulator.buffer += decoder.decode(chunk, { stream: true });
      parseSseUsageChunk(usageAccumulator);
      controller.enqueue(chunk);
    },
    flush() {
      usageAccumulator.buffer += decoder.decode();
      parseSseUsageChunk(usageAccumulator);
      onComplete(usageAccumulator.usage);
    }
  });

  void upstreamBody.pipeTo(transform.writable).catch(() => {
    onComplete(usageAccumulator.usage);
  });

  return transform.readable;
}

export async function proxyAnthropicRequest(input: { request: Request; proxyKey: string }) {
  const project = getProjectByProxyKey(input.proxyKey);

  if (!project) {
    return new Response(JSON.stringify({ error: "Invalid proxy key" }), {
      status: 401,
      headers: headersWithCors({ "content-type": "application/json" })
    });
  }

  let payload: Record<string, unknown>;

  try {
    payload = (await input.request.json()) as Record<string, unknown>;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON payload" }), {
      status: 400,
      headers: headersWithCors({ "content-type": "application/json" })
    });
  }

  const model = typeof payload.model === "string" ? payload.model : "claude-3-7-sonnet-latest";

  const spendSnapshot = getCurrentSpend(project.id);
  const evaluated = evaluateCapState({
    caps: {
      dailyCap: project.dailyCap,
      weeklyCap: project.weeklyCap,
      monthlyCap: project.monthlyCap
    },
    spend: {
      daily: spendSnapshot.daily,
      weekly: spendSnapshot.weekly,
      monthly: spendSnapshot.monthly
    }
  });

  if (evaluated.exceededPeriods.length > 0) {
    trackPeriodAlerts({
      projectId: project.id,
      projectName: project.name,
      slackBotToken: project.slackBotToken,
      slackChannel: project.slackChannel,
      exceeded: evaluated.exceededPeriods.map((period) => ({
        period,
        cap: evaluated.states[period].cap,
        spent: evaluated.states[period].spent
      }))
    });

    return new Response(
      JSON.stringify({
        error: "usage_cap_exceeded",
        message: "This project has reached its configured spending cap.",
        capStatus: evaluated.states
      }),
      {
        status: 429,
        headers: headersWithCors({ "content-type": "application/json" })
      }
    );
  }

  const anthropicVersion = input.request.headers.get("anthropic-version") || "2023-06-01";
  const anthropicBeta = input.request.headers.get("anthropic-beta");
  const isStream = payload.stream === true;
  const anthropicApiKey = decryptSecret(project.anthropicApiKey);

  const upstreamHeaders = new Headers();
  upstreamHeaders.set("content-type", "application/json");
  upstreamHeaders.set("x-api-key", anthropicApiKey);
  upstreamHeaders.set("anthropic-version", anthropicVersion);
  if (anthropicBeta) {
    upstreamHeaders.set("anthropic-beta", anthropicBeta);
  }

  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: upstreamHeaders,
    body: JSON.stringify(payload)
  });

  const responseHeaders = headersWithCors(upstream.headers);

  if (isStream) {
    if (!upstream.body) {
      return new Response(JSON.stringify({ error: "Missing stream body from upstream" }), {
        status: 502,
        headers: headersWithCors({ "content-type": "application/json" })
      });
    }

    const trackedStream = createTrackedStream(upstream.body, (usage) => {
      if (!usage || Object.keys(usage).length === 0) {
        return;
      }

      try {
        recordUsageFromAnthropicResponse({
          projectId: project.id,
          model,
          usage
        });
      } catch {
        // Ignore usage recording errors to avoid interrupting stream delivery.
      }
    });

    return new Response(trackedStream, {
      status: upstream.status,
      headers: responseHeaders
    });
  }

  const raw = await upstream.text();

  if (!upstream.ok) {
    return new Response(raw, {
      status: upstream.status,
      headers: responseHeaders
    });
  }

  let parsed: Record<string, unknown>;

  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return new Response(raw, {
      status: upstream.status,
      headers: responseHeaders
    });
  }

  const usage = parsed.usage as UsageSnapshot | undefined;
  if (usage) {
    recordUsageFromAnthropicResponse({
      projectId: project.id,
      model,
      usage
    });
  }

  return new Response(JSON.stringify(parsed), {
    status: upstream.status,
    headers: responseHeaders
  });
}
