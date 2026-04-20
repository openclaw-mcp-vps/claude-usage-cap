import Anthropic from "@anthropic-ai/sdk";

type Pricing = {
  inputPerM: number;
  outputPerM: number;
  cacheWritePerM: number;
  cacheReadPerM: number;
};

const DEFAULT_PRICING: Pricing = {
  inputPerM: 3,
  outputPerM: 15,
  cacheWritePerM: 3.75,
  cacheReadPerM: 0.3
};

const MODEL_PRICING: Record<string, Pricing> = {
  "claude-3-5-haiku-latest": {
    inputPerM: 0.8,
    outputPerM: 4,
    cacheWritePerM: 1,
    cacheReadPerM: 0.08
  },
  "claude-3-5-sonnet-latest": {
    inputPerM: 3,
    outputPerM: 15,
    cacheWritePerM: 3.75,
    cacheReadPerM: 0.3
  },
  "claude-3-opus-latest": {
    inputPerM: 15,
    outputPerM: 75,
    cacheWritePerM: 18.75,
    cacheReadPerM: 1.5
  },
  "claude-sonnet-4-0": {
    inputPerM: 3,
    outputPerM: 15,
    cacheWritePerM: 3.75,
    cacheReadPerM: 0.3
  },
  "claude-opus-4-0": {
    inputPerM: 15,
    outputPerM: 75,
    cacheWritePerM: 18.75,
    cacheReadPerM: 1.5
  }
};

export type AnthropicUsage = {
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
};

function resolveModelPricing(model: string): Pricing {
  if (MODEL_PRICING[model]) {
    return MODEL_PRICING[model];
  }

  const lowered = model.toLowerCase();
  if (lowered.includes("haiku")) {
    return MODEL_PRICING["claude-3-5-haiku-latest"];
  }
  if (lowered.includes("opus")) {
    return MODEL_PRICING["claude-opus-4-0"];
  }

  return DEFAULT_PRICING;
}

export function estimateAnthropicCostUsd(model: string, usage: AnthropicUsage) {
  const pricing = resolveModelPricing(model);
  const input = usage.input_tokens ?? 0;
  const output = usage.output_tokens ?? 0;
  const cacheWrite = usage.cache_creation_input_tokens ?? 0;
  const cacheRead = usage.cache_read_input_tokens ?? 0;

  const total =
    (input / 1_000_000) * pricing.inputPerM +
    (output / 1_000_000) * pricing.outputPerM +
    (cacheWrite / 1_000_000) * pricing.cacheWritePerM +
    (cacheRead / 1_000_000) * pricing.cacheReadPerM;

  return Number(total.toFixed(8));
}

export function createAnthropicClient(apiKey: string) {
  return new Anthropic({ apiKey });
}
