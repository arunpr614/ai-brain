// src/lib/llm/gemini.ts — Google Gemini provider (Phase 8 / Issue #121).
// Direct REST API calls to Google AI Generative Language API without third-party dependencies.

import { LLMError } from "./errors";
import type {
  GenerateJsonResult,
  GenerateMetrics,
  GenerateOptions,
  GenerateResult,
  GenerateStreamOptions,
  LLMProvider,
} from "./types";

const DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com";
const DEFAULT_MODEL = "gemini-2.0-flash";

interface GeminiProviderOptions {
  apiKey?: string;
  model?: string;
  baseURL?: string;
}

export class GeminiProvider implements LLMProvider {
  private readonly apiKey: string | undefined;
  private readonly defaultModel: string;
  private readonly baseURL: string;

  constructor(opts: GeminiProviderOptions = {}) {
    this.apiKey = opts.apiKey ?? process.env.GEMINI_API_KEY;
    this.defaultModel = opts.model ?? process.env.GEMINI_MODEL ?? DEFAULT_MODEL;
    this.baseURL = (opts.baseURL ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
  }

  private resolveKey(): string {
    if (!this.apiKey) {
      throw new LLMError("connection", "GEMINI_API_KEY is not set in environment");
    }
    return this.apiKey;
  }

  async isAlive(): Promise<boolean> {
    if (!this.apiKey) return false;
    try {
      const res = await fetch(`${this.baseURL}/v1beta/models?key=${this.apiKey}`, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async generate(opts: GenerateOptions): Promise<GenerateResult> {
    const key = this.resolveKey();
    const model = opts.model ?? this.defaultModel;
    const start = Date.now();

    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];
    if (opts.system) {
      contents.push({ role: "user", parts: [{ text: opts.system }] });
      contents.push({ role: "model", parts: [{ text: "Understood. I will follow these instructions." }] });
    }
    contents.push({ role: "user", parts: [{ text: opts.prompt }] });

    const payload = {
      contents,
      generationConfig: {
        temperature: opts.temperature ?? 0.2,
        maxOutputTokens: opts.num_predict ?? 2048,
      },
    };

    const res = await fetch(
      `${this.baseURL}/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: opts.signal,
      },
    );

    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      if (res.status === 401 || res.status === 403) {
        throw new LLMError("http", `Gemini API auth error (${res.status}): ${errorText}`, res.status);
      }
      if (res.status === 429) {
        throw new LLMError("http", `Gemini rate limited (429): ${errorText}`, 429);
      }
      throw new LLMError("http", `Gemini API error (${res.status}): ${errorText}`, res.status);
    }

    const data = await res.json();
    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text ?? "";
    const wallMs = Date.now() - start;

    const metrics: GenerateMetrics = {
      input_tokens: data.usageMetadata?.promptTokenCount ?? 0,
      output_tokens: data.usageMetadata?.candidatesTokenCount ?? 0,
      wall_ms: wallMs,
    };

    return {
      model,
      response: text,
      metrics,
    };
  }

  async *generateStream(opts: GenerateStreamOptions): AsyncIterable<string> {
    const result = await this.generate(opts);
    if (opts.onDone) {
      opts.onDone(result.metrics);
    }
    yield result.response;
  }

  async generateJson<T = unknown>(opts: GenerateOptions): Promise<GenerateJsonResult<T>> {
    let attempts = 1;
    try {
      const res = await this.generate(opts);
      const parsed = extractAndParseJson<T>(res.response);
      return {
        parsed,
        raw: res.response,
        metrics: res.metrics,
        attempts,
      };
    } catch (err) {
      attempts++;
      // Retry once with lowered temperature
      const retryRes = await this.generate({ ...opts, temperature: 0.0 });
      const parsed = extractAndParseJson<T>(retryRes.response);
      return {
        parsed,
        raw: retryRes.response,
        metrics: retryRes.metrics,
        attempts,
      };
    }
  }
}

function extractAndParseJson<T>(raw: string): T {
  let cleaned = raw.trim();
  // Strip ```json ... ``` code fences if present
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/, "").replace(/```$/, "").trim();
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "").replace(/```$/, "").trim();
  }

  const jsonStart = cleaned.indexOf("{");
  const jsonEnd = cleaned.lastIndexOf("}");
  if (jsonStart !== -1 && jsonEnd > jsonStart) {
    cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
  }

  try {
    return JSON.parse(cleaned) as T;
  } catch (err) {
    throw new LLMError("invalid_response", `Failed to parse JSON output: ${(err as Error).message}`);
  }
}
