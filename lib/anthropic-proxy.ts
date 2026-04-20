import Anthropic from "@anthropic-ai/sdk";

type Pricing = {
  inputPerMillion: number;
  outputPerMillion: number;
  cacheWritePerMillion?: number;
  cacheReadPerMillion?: number;
};

const MODEL_PRICING: Record<string, Pricing> = {
  "claude-sonnet-4-20250514": {
    inputPerMillion: 3,
    outputPerMillion: 15,
    cacheWritePerMillion: 3.75,
    cacheReadPerMillion: 0.3
  },
  "claude-opus-4-20250514": {
    inputPerMillion: 15,
    outputPerMillion: 75,
    cacheWritePerMillion: 18.75,
    cacheReadPerMillion: 1.5
  },
  "claude-3-5-sonnet-20241022": {
    inputPerMillion: 3,
    outputPerMillion: 15,
    cacheWritePerMillion: 3.75,
    cacheReadPerMillion: 0.3
  },
  "claude-3-5-haiku-20241022": {
    inputPerMillion: 0.8,
    outputPerMillion: 4,
    cacheWritePerMillion: 1,
    cacheReadPerMillion: 0.08
  },
  "claude-3-opus-20240229": {
    inputPerMillion: 15,
    outputPerMillion: 75,
    cacheWritePerMillion: 18.75,
    cacheReadPerMillion: 1.5
  }
};

const FALLBACK_PRICING: Pricing = {
  inputPerMillion: 3,
  outputPerMillion: 15,
  cacheWritePerMillion: 3.75,
  cacheReadPerMillion: 0.3
};

type UsageShape = {
  input_tokens?: number;
  output_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
  cache_creation_tokens?: number;
  cache_read_tokens?: number;
};

function pickPricing(model: string): Pricing {
  const exact = MODEL_PRICING[model];

  if (exact) {
    return exact;
  }

  const normalized = model.toLowerCase();

  if (normalized.includes("opus")) {
    return {
      inputPerMillion: 15,
      outputPerMillion: 75,
      cacheWritePerMillion: 18.75,
      cacheReadPerMillion: 1.5
    };
  }

  if (normalized.includes("haiku")) {
    return {
      inputPerMillion: 0.8,
      outputPerMillion: 4,
      cacheWritePerMillion: 1,
      cacheReadPerMillion: 0.08
    };
  }

  return FALLBACK_PRICING;
}

export function estimateClaudeCostUsd(model: string, usage: UsageShape): number {
  const pricing = pickPricing(model);

  const input = usage.input_tokens ?? 0;
  const output = usage.output_tokens ?? 0;
  const cacheWrite =
    usage.cache_creation_input_tokens ?? usage.cache_creation_tokens ?? 0;
  const cacheRead = usage.cache_read_input_tokens ?? usage.cache_read_tokens ?? 0;

  const total =
    (input / 1_000_000) * pricing.inputPerMillion +
    (output / 1_000_000) * pricing.outputPerMillion +
    (cacheWrite / 1_000_000) * (pricing.cacheWritePerMillion ?? 0) +
    (cacheRead / 1_000_000) * (pricing.cacheReadPerMillion ?? 0);

  return Number(total.toFixed(6));
}

export async function sendClaudeRequest(input: {
  anthropicApiKey: string;
  payload: Record<string, unknown>;
}): Promise<Record<string, unknown>> {
  const client = new Anthropic({
    apiKey: input.anthropicApiKey
  });

  const response = await client.messages.create(input.payload as never);
  return response as unknown as Record<string, unknown>;
}
