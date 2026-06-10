import { EmbedError, EMBED_DIM } from "@/lib/embed/client";
import { getEmbedProvider } from "@/lib/embed/factory";
import type { EmbedProvider } from "@/lib/embed/types";
import { LLMError } from "@/lib/llm/errors";
import { getEnrichProvider } from "@/lib/llm/factory";
import type { LLMProvider } from "@/lib/llm/types";

export type ProviderStatusValue =
  | "ok"
  | "unconfigured"
  | "unreachable"
  | "quota_or_billing"
  | "invalid_response"
  | "unknown";

export interface ProviderStatus {
  provider: string;
  model: string;
  status: ProviderStatusValue;
  lastCheckedAt: number;
  lastSuccessAt: number | null;
  message: string | null;
}

export interface ProviderStatusReport {
  llm: ProviderStatus;
  embed: ProviderStatus;
}

interface ProbeDeps {
  now?: () => number;
  ttlMs?: number;
  llmProbe?: () => Promise<Pick<ProviderStatus, "provider" | "model" | "status" | "message">>;
  embedProbe?: () => Promise<Pick<ProviderStatus, "provider" | "model" | "status" | "message">>;
}

const DEFAULT_TTL_MS = 60_000;
let cached: ProviderStatusReport | null = null;
let cachedAt = 0;
let llmLastSuccessAt: number | null = null;
let embedLastSuccessAt: number | null = null;

export async function getProviderStatusReport(
  deps: ProbeDeps = {},
): Promise<ProviderStatusReport> {
  const now = deps.now?.() ?? Date.now();
  const ttlMs = deps.ttlMs ?? DEFAULT_TTL_MS;
  if (cached && now - cachedAt < ttlMs) return cached;

  const [llmProbe, embedProbe] = await Promise.all([
    (deps.llmProbe ?? probeLlmProvider)(),
    (deps.embedProbe ?? probeEmbedProvider)(),
  ]);

  if (llmProbe.status === "ok") llmLastSuccessAt = now;
  if (embedProbe.status === "ok") embedLastSuccessAt = now;

  cached = {
    llm: { ...llmProbe, lastCheckedAt: now, lastSuccessAt: llmLastSuccessAt },
    embed: { ...embedProbe, lastCheckedAt: now, lastSuccessAt: embedLastSuccessAt },
  };
  cachedAt = now;
  return cached;
}

export function resetProviderStatusCache(): void {
  cached = null;
  cachedAt = 0;
  llmLastSuccessAt = null;
  embedLastSuccessAt = null;
}

async function probeLlmProvider(): Promise<Pick<ProviderStatus, "provider" | "model" | "status" | "message">> {
  const providerName = readEnv("LLM_ENRICH_PROVIDER") ?? "ollama";
  const model = readEnv("LLM_ENRICH_MODEL") ?? defaultLlmModel(providerName);
  let provider: LLMProvider;
  try {
    provider = getEnrichProvider();
  } catch (err) {
    return {
      provider: providerName,
      model,
      status: classifyLlmError(err),
      message: safeProviderMessage(err),
    };
  }

  try {
    if (providerName === "anthropic" || providerName === "openrouter") {
      await provider.generate({
        prompt: "ping",
        num_predict: 1,
        temperature: 0,
        signal:
          typeof AbortSignal !== "undefined" && "timeout" in AbortSignal
            ? (AbortSignal as unknown as { timeout: (ms: number) => AbortSignal }).timeout(4000)
            : undefined,
      });
      return {
        provider: providerName,
        model,
        status: "ok",
        message: null,
      };
    }
    return {
      provider: providerName,
      model,
      status: (await provider.isAlive()) ? "ok" : "unreachable",
      message: null,
    };
  } catch (err) {
    return {
      provider: providerName,
      model,
      status: classifyLlmError(err),
      message: safeProviderMessage(err),
    };
  }
}

async function probeEmbedProvider(): Promise<Pick<ProviderStatus, "provider" | "model" | "status" | "message">> {
  let provider: EmbedProvider;
  const providerName = readEnv("EMBED_PROVIDER") ?? "ollama";
  const fallbackModel = readEnv("EMBED_MODEL") ?? defaultEmbedModel(providerName);
  try {
    provider = getEmbedProvider();
  } catch (err) {
    return {
      provider: providerName,
      model: fallbackModel,
      status: classifyEmbedError(err),
      message: safeProviderMessage(err),
    };
  }

  const info = provider.getInfo();
  try {
    const probe = await provider.embed(["probe"]);
    if (probe.length !== 1 || probe[0]?.length !== EMBED_DIM) {
      return {
        provider: info.provider,
        model: info.model,
        status: "invalid_response",
        message: `Expected one ${EMBED_DIM}-dimension embedding.`,
      };
    }
    return {
      provider: info.provider,
      model: info.model,
      status: "ok",
      message: null,
    };
  } catch (err) {
    return {
      provider: info.provider,
      model: info.model,
      status: classifyEmbedError(err),
      message: safeProviderMessage(err),
    };
  }
}

export function classifyLlmError(err: unknown): ProviderStatusValue {
  const msg = errorText(err);
  if (/requires .*api[_ -]?key|missing .*api[_ -]?key|not configured|unconfigured/i.test(msg)) {
    return "unconfigured";
  }
  if (/quota|billing|credit|prepayment|resource[_ ]?exhausted|rate.?limit/i.test(msg)) {
    return "quota_or_billing";
  }
  if (err instanceof LLMError) {
    if (err.code === "invalid_response") return "invalid_response";
    if (err.code === "connection" || err.code === "timeout" || err.code === "http") {
      return "unreachable";
    }
  }
  return "unknown";
}

export function classifyEmbedError(err: unknown): ProviderStatusValue {
  const msg = errorText(err);
  if (/requires .*api[_ -]?key|missing .*api[_ -]?key|not configured|unconfigured/i.test(msg)) {
    return "unconfigured";
  }
  if (/quota|billing|credit|prepayment|resource[_ ]?exhausted|rate.?limit|429/i.test(msg)) {
    return "quota_or_billing";
  }
  if (err instanceof EmbedError) {
    if (err.code === "EMBED_INVALID_RESPONSE") return "invalid_response";
    if (err.code === "EMBED_CONNECTION" || err.code === "EMBED_HTTP") return "unreachable";
    if (err.code === "EMBED_MODEL_NOT_INSTALLED") return "unconfigured";
  }
  return "unknown";
}

function safeProviderMessage(err: unknown): string {
  const msg = errorText(err).replace(/[A-Za-z0-9_-]{24,}/g, "[redacted]");
  if (/quota|billing|credit|prepayment|resource[_ ]?exhausted|rate.?limit|429/i.test(msg)) {
    return "Billing or quota is blocking this provider.";
  }
  if (/api[_ -]?key/i.test(msg)) return "Provider credentials are not configured.";
  if (/invalid|dimension|response/i.test(msg)) return "Provider returned an unexpected response.";
  if (/timed out|cannot reach|connection|unreachable/i.test(msg)) return "Provider is not reachable right now.";
  return "Provider status could not be confirmed.";
}

function errorText(err: unknown): string {
  return err instanceof Error ? err.message : String(err ?? "");
}

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function defaultLlmModel(provider: string): string {
  if (provider === "anthropic") return "claude-haiku-4-5-20251001";
  if (provider === "openrouter") return "anthropic/claude-sonnet-4-6";
  return "qwen2.5:7b-instruct-q4_K_M";
}

function defaultEmbedModel(provider: string): string {
  return provider === "gemini" ? "gemini-embedding-001" : "nomic-embed-text";
}
