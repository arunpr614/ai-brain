// src/lib/llm/fallback.ts — Cascading Multi-Provider Fallback (Phase 8 / Issue #121).

import { LLMError } from "./errors";
import type {
  GenerateJsonResult,
  GenerateOptions,
  GenerateResult,
  GenerateStreamOptions,
  LLMProvider,
} from "./types";

export interface FallbackChainConfig {
  providers: Array<{ name: string; provider: LLMProvider }>;
}

export class FallbackLLMProvider implements LLMProvider {
  private readonly providers: Array<{ name: string; provider: LLMProvider }>;

  constructor(config: FallbackChainConfig) {
    if (!config.providers || config.providers.length === 0) {
      throw new Error("FallbackLLMProvider requires at least one provider");
    }
    this.providers = config.providers;
  }

  async isAlive(): Promise<boolean> {
    for (const { provider } of this.providers) {
      if (await provider.isAlive()) return true;
    }
    return false;
  }

  async generate(opts: GenerateOptions): Promise<GenerateResult> {
    let lastError: Error | null = null;

    for (const { name, provider } of this.providers) {
      try {
        return await provider.generate(opts);
      } catch (err) {
        lastError = err as Error;
        console.warn(`[llm:fallback] Provider "${name}" failed generate: ${(err as Error).message}. Cascading to next provider...`);
      }
    }

    throw lastError ?? new LLMError("connection", "All fallback LLM providers failed");
  }

  async *generateStream(opts: GenerateStreamOptions): AsyncIterable<string> {
    for (const { name, provider } of this.providers) {
      try {
        yield* provider.generateStream(opts);
        return;
      } catch (err) {
        console.warn(`[llm:fallback] Provider "${name}" failed generateStream: ${(err as Error).message}. Cascading to next provider...`);
      }
    }
    throw new LLMError("connection", "All fallback LLM providers failed in streaming");
  }

  async generateJson<T = unknown>(opts: GenerateOptions): Promise<GenerateJsonResult<T>> {
    let lastError: Error | null = null;

    for (const { name, provider } of this.providers) {
      try {
        return await provider.generateJson<T>(opts);
      } catch (err) {
        lastError = err as Error;
        console.warn(`[llm:fallback] Provider "${name}" failed generateJson: ${(err as Error).message}. Cascading to next provider...`);
      }
    }

    throw lastError ?? new LLMError("invalid_response", "All fallback LLM providers failed to generate valid JSON");
  }
}
