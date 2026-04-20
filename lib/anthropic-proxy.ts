import { randomUUID } from "node:crypto";

import { decryptSecret } from "@/lib/security";
import { calculateCostUsd } from "@/lib/usage-tracker";
import type { Project } from "@/lib/types";

type AnthropicUsage = {
  input_tokens?: number;
  output_tokens?: number;
};

type AnthropicResponseBody = {
  id?: string;
  model?: string;
  usage?: AnthropicUsage;
  error?: {
    message?: string;
  };
};

export async function proxyAnthropicRequest(params: {
  project: Project;
  requestBody: unknown;
  requestHeaders: Headers;
}): Promise<{
  status: number;
  body: AnthropicResponseBody | string;
  usage: {
    requestId: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
  } | null;
}> {
  const apiKey = decryptSecret(params.project.anthropicApiKeyEncrypted);
  const body = params.requestBody;

  if (!body || typeof body !== "object") {
    return {
      status: 400,
      body: {
        error: {
          message: "Request JSON body is required"
        }
      },
      usage: null
    };
  }

  const typed = body as { stream?: boolean };

  if (typed.stream === true) {
    return {
      status: 400,
      body: {
        error: {
          message: "Streaming is not supported by this proxy. Set stream=false."
        }
      },
      usage: null
    };
  }

  const version = params.requestHeaders.get("anthropic-version") || "2023-06-01";
  const betaHeader = params.requestHeaders.get("anthropic-beta");

  const headers: HeadersInit = {
    "content-type": "application/json",
    "x-api-key": apiKey,
    "anthropic-version": version
  };

  if (betaHeader) {
    headers["anthropic-beta"] = betaHeader;
  }

  const upstreamResponse = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });

  const responseText = await upstreamResponse.text();
  let parsed: AnthropicResponseBody | string = responseText;

  try {
    parsed = JSON.parse(responseText) as AnthropicResponseBody;
  } catch {
    parsed = responseText;
  }

  if (!upstreamResponse.ok || typeof parsed === "string") {
    return {
      status: upstreamResponse.status,
      body: parsed,
      usage: null
    };
  }

  const model = parsed.model || "unknown-model";
  const usage = parsed.usage || {};
  const inputTokens = Math.max(0, usage.input_tokens ?? 0);
  const outputTokens = Math.max(0, usage.output_tokens ?? 0);
  const requestId = parsed.id || randomUUID();
  const costUsd = calculateCostUsd(model, inputTokens, outputTokens);

  return {
    status: upstreamResponse.status,
    body: parsed,
    usage: {
      requestId,
      model,
      inputTokens,
      outputTokens,
      costUsd
    }
  };
}
