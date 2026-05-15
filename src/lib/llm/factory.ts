// src/lib/llm/factory.ts — env-driven provider selection (v0.6.0 B-7).
//
// Two call paths through the codebase: enrichment (one-shot JSON, optional
// batch) and Ask (streaming SSE). Each picks its provider independently so
// you can run, e.g., Anthropic-batch enrichment + OpenRouter Ask without
// code change.
//
// Env contract (locked v0.6.0):
//   LLM_ENRICH_PROVIDER   ollama | anthropic | openrouter   (default: ollama)
//   LLM_ENRICH_MODEL      override default per provider
//   LLM_ASK_PROVIDER      ollama | anthropic | openrouter   (default: ollama)
//   LLM_ASK_MODEL         override default per provider
//
// Defaults are `ollama` to preserve current behavior; v0.6.0 cutover flips
// to `anthropic` via .env.local on Hetzner. Unknown provider names throw on
// first resolution so a typo in production fails loudly at boot, not on
// the first request.
//
// Memoization: providers are cached per-process. Tests that mutate
// LLM_*_PROVIDER between cases must call resetProviderCache() — never
// mutate the env mid-conversation in production code.

import { AnthropicProvider } from "./anthropic";
import { LLMError } from "./errors";
import { OllamaProvider } from "./ollama";
import { OpenRouterProvider } from "./openrouter";
import type { LLMProvider } from "./types";

export type ProviderName = "ollama" | "anthropic" | "openrouter";

const KNOWN_PROVIDERS = new Set<ProviderName>(["ollama", "anthropic", "openrouter"]);

interface CacheSlot {
  provider: LLMProvider | null;
  /** The (provider, model) pair the cached instance was built with. */
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
    case "openrouter":
      return new OpenRouterProvider({ model });
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

/**
 * Returns the provider used by the enrichment path. Honors
 * LLM_ENRICH_PROVIDER + LLM_ENRICH_MODEL. Memoized per (provider, model)
 * tuple so repeated calls in the same process don't re-instantiate.
 */
export function getEnrichProvider(): LLMProvider {
  return resolveSlot(enrichSlot, "LLM_ENRICH_PROVIDER", "LLM_ENRICH_MODEL");
}

/**
 * Returns the provider used by the Ask path. Honors LLM_ASK_PROVIDER +
 * LLM_ASK_MODEL.
 */
export function getAskProvider(): LLMProvider {
  return resolveSlot(askSlot, "LLM_ASK_PROVIDER", "LLM_ASK_MODEL");
}

/**
 * Test-only: clear the memoized providers so a subsequent get*() call
 * picks up updated env vars. Production code never calls this — provider
 * choice is process-lifetime and only changes via restart.
 */
export function resetProviderCache(): void {
  enrichSlot.provider = null;
  enrichSlot.key = null;
  askSlot.provider = null;
  askSlot.key = null;
}
