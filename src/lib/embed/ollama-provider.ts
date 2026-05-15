// src/lib/embed/ollama-provider.ts — wrap the existing Ollama embed client
// (v0.6.0 B-11). Pure adapter — all logic lives in client.ts; this file
// only conforms it to EmbedProvider so the factory can swap it.

import { EMBED_DIM, embed as ollamaEmbed, EMBED_MODEL } from "./client";
import type { EmbedProvider, EmbedRequestOptions } from "./types";

const DEFAULT_MODEL = process.env.OLLAMA_EMBED_MODEL ?? EMBED_MODEL;
const DEFAULT_HOST = process.env.OLLAMA_HOST ?? "http://localhost:11434";

interface OllamaEmbedProviderOptions {
  host?: string;
  model?: string;
}

export class OllamaEmbedProvider implements EmbedProvider {
  private host: string;
  private model: string;

  constructor(opts: OllamaEmbedProviderOptions = {}) {
    this.host = opts.host ?? DEFAULT_HOST;
    this.model = opts.model ?? DEFAULT_MODEL;
  }

  getInfo(): { provider: "ollama"; model: string; dim: 768 } {
    return { provider: "ollama", model: this.model, dim: EMBED_DIM as 768 };
  }

  async embed(inputs: string[], opts: EmbedRequestOptions = {}): Promise<Float32Array[]> {
    return ollamaEmbed(inputs, {
      host: this.host,
      model: this.model,
      signal: opts.signal,
    });
  }

  async isAlive(): Promise<boolean> {
    // Mirrors src/lib/llm/ollama.ts isAlive — /api/tags is the cheap probe
    // both endpoints share. Same 2s timeout for parity.
    try {
      const res = await fetch(`${this.host}/api/tags`, {
        signal:
          typeof AbortSignal !== "undefined" && "timeout" in AbortSignal
            ? (AbortSignal as unknown as { timeout: (ms: number) => AbortSignal }).timeout(2000)
            : undefined,
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}
