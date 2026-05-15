// src/lib/embed/factory.ts — env-driven embed provider (v0.6.0 B-11).
//
// Env contract:
//   EMBED_PROVIDER   ollama | gemini   (default: ollama)
//   EMBED_MODEL      override default per provider
//
// Defaults to ollama to preserve v0.5.6 behavior. v0.6.0 cutover sets
// EMBED_PROVIDER=gemini in Hetzner .env.local.
//
// Memoized per (provider, model) per process. Tests that mutate the env
// between cases must call resetEmbedProviderCache().

import { EmbedError } from "./client";
import { GeminiEmbedProvider } from "./gemini";
import { OllamaEmbedProvider } from "./ollama-provider";
import type { EmbedProvider } from "./types";

export type EmbedProviderName = "ollama" | "gemini";
const KNOWN: ReadonlySet<EmbedProviderName> = new Set(["ollama", "gemini"]);

interface CacheSlot {
  provider: EmbedProvider | null;
  key: string | null;
}

const slot: CacheSlot = { provider: null, key: null };

function readEnv(name: string): string | undefined {
  const v = process.env[name];
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

export function getEmbedProvider(): EmbedProvider {
  const raw = readEnv("EMBED_PROVIDER") ?? "ollama";
  if (!KNOWN.has(raw as EmbedProviderName)) {
    throw new EmbedError(
      "EMBED_CONNECTION",
      `EMBED_PROVIDER=${raw} is not a known provider (expected: ${Array.from(KNOWN).join(", ")})`,
    );
  }
  const name = raw as EmbedProviderName;
  const model = readEnv("EMBED_MODEL");
  const key = `${name}::${model ?? ""}`;
  if (slot.provider && slot.key === key) return slot.provider;
  slot.provider = name === "gemini" ? new GeminiEmbedProvider({ model }) : new OllamaEmbedProvider({ model });
  slot.key = key;
  return slot.provider;
}

/** Test-only: clear memoized provider so updated env takes effect. */
export function resetEmbedProviderCache(): void {
  slot.provider = null;
  slot.key = null;
}
