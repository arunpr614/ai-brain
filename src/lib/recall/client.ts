import type { RecallSyncClient } from "./sync-runner";
import type { RecallCardDetail } from "./types";

export const DEFAULT_RECALL_API_BASE_URL = "https://backend.getrecall.ai/api/v1";

export interface RecallApiClientOptions {
  apiKey: string;
  baseUrl?: string;
  fetchFn?: typeof fetch;
  timeoutMs?: number;
}

interface RecallListResponse {
  results?: unknown;
  total_count?: unknown;
}

interface RecallCardPreviewResponse {
  id?: unknown;
  card_id?: unknown;
}

export class RecallApiError extends Error {
  readonly status: number;
  readonly requestId: string | null;

  constructor(input: { status: number; message: string; requestId?: string | null }) {
    super(`Recall API ${input.status}: ${input.message}`);
    this.name = "RecallApiError";
    this.status = input.status;
    this.requestId = input.requestId ?? null;
  }
}

export class RecallApiClient implements RecallSyncClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;
  private readonly timeoutMs: number;

  constructor(options: RecallApiClientOptions) {
    const apiKey = options.apiKey.trim();
    if (!apiKey) throw new Error("Recall API key is required");
    this.apiKey = apiKey;
    this.baseUrl = (options.baseUrl?.trim() || DEFAULT_RECALL_API_BASE_URL).replace(/\/+$/, "");
    this.fetchFn = options.fetchFn ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 30_000;
  }

  async listCards(window: { dateFrom: string; dateTo: string }) {
    const body = (await this.requestJson("/cards", {
      date_from: window.dateFrom,
      date_to: window.dateTo,
    })) as RecallListResponse;
    const results = Array.isArray(body.results) ? body.results : [];
    const cards = results
      .map((entry) => getCardId(entry as RecallCardPreviewResponse))
      .filter((id): id is string => Boolean(id))
      .map((id) => ({ id }));
    return {
      cards,
      totalCount: nonNegativeIntOrNull(body.total_count),
    };
  }

  async getCardDetail(cardId: string, options: { maxChunks: number }): Promise<RecallCardDetail> {
    const id = cardId.trim();
    if (!id) throw new Error("Recall card id is required");
    const maxChunks = clampMaxChunks(options.maxChunks);
    const body = (await this.requestJson(`/cards/${encodeURIComponent(id)}`, {
      max_chunks: String(maxChunks),
    })) as Record<string, unknown>;
    const responseId = getCardId(body) ?? id;
    return {
      id: responseId,
      title: stringOrNull(body.title),
      created_at: stringOrNull(body.created_at),
      source_url: stringOrNull(body.source_url),
      image: stringOrNull(body.image),
      chunks: Array.isArray(body.chunks) ? (body.chunks as RecallCardDetail["chunks"]) : [],
    };
  }

  private async requestJson(path: string, params: Record<string, string>): Promise<unknown> {
    const url = new URL(`${this.baseUrl}${path}`);
    for (const [key, value] of Object.entries(params)) {
      if (value) url.searchParams.set(key, value);
    }

    const res = await this.fetchFn(url, {
      headers: {
        accept: "application/json",
        authorization: `Bearer ${this.apiKey}`,
      },
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    const text = await res.text();
    if (!res.ok) {
      const parsed = parseJsonObject(text);
      const detail = parseJsonObject(parsed?.detail);
      const message =
        stringOrNull(detail?.message) ??
        stringOrNull(parsed?.message) ??
        (text ? text.slice(0, 500) : res.statusText);
      throw new RecallApiError({
        status: res.status,
        message,
        requestId: stringOrNull(detail?.request_id) ?? stringOrNull(parsed?.request_id),
      });
    }
    return text ? JSON.parse(text) : {};
  }
}

function clampMaxChunks(value: number): number {
  if (!Number.isFinite(value)) return 20;
  return Math.min(50, Math.max(1, Math.trunc(value)));
}

function getCardId(value: RecallCardPreviewResponse | Record<string, unknown>): string | null {
  return stringOrNull(value.id) ?? stringOrNull(value.card_id);
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function nonNegativeIntOrNull(value: unknown): number | null {
  return Number.isInteger(value) && (value as number) >= 0 ? (value as number) : null;
}

function parseJsonObject(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value !== "string") return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}
