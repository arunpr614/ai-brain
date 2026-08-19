// src/lib/llm/factory.ts — env-driven provider selection (v0.6.0 B-7, Phase 8 / Issue #121).

import { AnthropicProvider } from "./anthropic";
import { LLMError } from "./errors";
import { FallbackLLMProvider } from "./fallback";
import { GeminiProvider } from "./gemini";
import { OllamaProvider } from "./ollama";
import { OpenRouterProvider } from "./openrouter";
import type { LLMProvider } from "./types";

export type ProviderName = "ollama" | "anthropic" | "openrouter" | "gemini" | "auto" | "fallback";

const KNOWN_PROVIDERS = new Set<ProviderName>([
  "ollama",
  "anthropic",
  "openrouter",
  "gemini",
  "auto",
  "fallback",
]);

interface CacheSlot {
  provider: LLMProvider | null;
  key: string | null;
}

const enrichSlot: CacheSlot = { provider: null, key: null };
const askSlot: CacheSlot = { provider: null, key: null };

function readEnv(name: string): string | undefined {
  const v = process.env[name];
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

function resolveProviderName(envVar: string): ProviderName {
  const raw = readEnv(envVar) ?? "ollama";
  if (!KNOWN_PROVIDERS.has(raw as ProviderName)) {
    throw new LLMError(
      "connection",
      `${envVar}=${raw} is not a known provider (expected: ${Array.from(KNOWN_PROVIDERS).join(", ")})`,
    );
  }
  return raw as ProviderName;
}

function buildProvider(name: ProviderName, model: string | undefined): LLMProvider {
  switch (name) {
    case "ollama":
      return new OllamaProvider({ model });
    case "anthropic":
      return new AnthropicProvider({ model });
    case "gemini":
      return new GeminiProvider({ model });
    case "openrouter":
      return new OpenRouterProvider({ model });
    case "auto":
    case "fallback": {
      const providers: Array<{ name: string; provider: LLMProvider }> = [];
      if (process.env.ANTHROPIC_API_KEY) {
        providers.push({ name: "anthropic", provider: new AnthropicProvider({ model }) });
      }
      if (process.env.GEMINI_API_KEY) {
        providers.push({ name: "gemini", provider: new GeminiProvider({ model }) });
      }
      if (process.env.OPENROUTER_API_KEY) {
        providers.push({ name: "openrouter", provider: new OpenRouterProvider({ model }) });
      }
      // Always include local Ollama as final fallback
      providers.push({ name: "ollama", provider: new OllamaProvider({ model }) });

      return new FallbackLLMProvider({ providers });
    }
  }
}

function resolveSlot(slot: CacheSlot, providerEnv: string, modelEnv: string): LLMProvider {
  const name = resolveProviderName(providerEnv);
  const model = readEnv(modelEnv);
  const key = `${name}::${model ?? ""}`;
  if (slot.provider && slot.key === key) return slot.provider;
  slot.provider = buildProvider(name, model);
  slot.key = key;
  return slot.provider;
}

export function getEnrichProvider(): LLMProvider {
  return resolveSlot(enrichSlot, "LLM_ENRICH_PROVIDER", "LLM_ENRICH_MODEL");
}

export function getAskProvider(): LLMProvider {
  return resolveSlot(askSlot, "LLM_ASK_PROVIDER", "LLM_ASK_MODEL");
}

export function resetProviderCache(): void {
  enrichSlot.provider = null;
  enrichSlot.key = null;
  askSlot.provider = null;
  askSlot.key = null;
}
