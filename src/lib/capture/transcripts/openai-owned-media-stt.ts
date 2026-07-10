import crypto from "node:crypto";
import {
  DEFAULT_OWNED_MEDIA_STT_MAX_BYTES,
  type OwnedMediaSttProvider,
  type OwnedMediaSttProviderInput,
  type OwnedMediaSttTranscript,
} from "./owned-media-stt";

export const OPENAI_OWNED_MEDIA_STT_PROVIDER_NAME = "openai-audio-transcriptions";
export const OPENAI_OWNED_MEDIA_STT_PROVIDER_VERSION = "openai-audio-transcriptions-v1";
export const OPENAI_AUDIO_TRANSCRIPTIONS_URL =
  "https://api.openai.com/v1/audio/transcriptions";
export const DEFAULT_OPENAI_OWNED_MEDIA_STT_TIMEOUT_MS = 120_000;

export const OPENAI_OWNED_MEDIA_STT_MODELS = [
  "gpt-4o-transcribe",
  "gpt-4o-mini-transcribe",
  "gpt-4o-mini-transcribe-2025-12-15",
] as const;

export type OpenAiOwnedMediaSttModel = (typeof OPENAI_OWNED_MEDIA_STT_MODELS)[number];

export type OpenAiOwnedMediaSttProviderErrorCode =
  | "invalid_configuration"
  | "media_mismatch"
  | "api_error"
  | "timeout"
  | "invalid_response";

export class OpenAiOwnedMediaSttProviderError extends Error {
  constructor(
    readonly code: OpenAiOwnedMediaSttProviderErrorCode,
    message: string,
    readonly details: { status?: number; requestId?: string | null } = {},
  ) {
    super(message);
    this.name = "OpenAiOwnedMediaSttProviderError";
  }
}

type FetchImpl = (url: string, init: RequestInit) => Promise<Response>;

export interface CreateOpenAiOwnedMediaSttProviderInput {
  apiKey: string;
  mediaBytes: Uint8Array | ArrayBuffer;
  filename: string;
  contentType?: string | null;
  fetchImpl?: FetchImpl;
  model?: OpenAiOwnedMediaSttModel;
  timeoutMs?: number;
}

interface NormalizedProviderConfig {
  apiKey: string;
  bytes: Uint8Array;
  filename: string;
  contentType: string | null;
  sha256: string;
  model: OpenAiOwnedMediaSttModel;
  timeoutMs: number;
  fetchImpl: FetchImpl;
}

export function createOpenAiOwnedMediaSttProvider(
  input: CreateOpenAiOwnedMediaSttProviderInput,
): OwnedMediaSttProvider {
  const config = normalizeProviderConfig(input);

  return {
    providerName: OPENAI_OWNED_MEDIA_STT_PROVIDER_NAME,
    providerVersion: OPENAI_OWNED_MEDIA_STT_PROVIDER_VERSION,
    maxBytes: DEFAULT_OWNED_MEDIA_STT_MAX_BYTES,
    async transcribe(providerInput: OwnedMediaSttProviderInput) {
      validateProviderInput(config, providerInput);
      const form = formDataFor(config, providerInput);
      const response = await fetchWithTimeout(config, form);
      return transcriptFromResponse(response, config.model, twoLetterLanguage(providerInput.languageCode));
    },
  };
}

function normalizeProviderConfig(
  input: CreateOpenAiOwnedMediaSttProviderInput,
): NormalizedProviderConfig {
  const apiKey = input.apiKey.trim();
  if (!apiKey) {
    throw new OpenAiOwnedMediaSttProviderError(
      "invalid_configuration",
      "OpenAI transcription API key is required.",
    );
  }

  const model = normalizeModel(input.model ?? "gpt-4o-transcribe");
  const timeoutMs = normalizeTimeout(input.timeoutMs);
  const bytes = normalizeBytes(input.mediaBytes);
  if (bytes.byteLength <= 0) {
    throw new OpenAiOwnedMediaSttProviderError(
      "invalid_configuration",
      "Owned media bytes are required for OpenAI transcription.",
    );
  }
  if (bytes.byteLength > DEFAULT_OWNED_MEDIA_STT_MAX_BYTES) {
    throw new OpenAiOwnedMediaSttProviderError(
      "invalid_configuration",
      "Owned media bytes exceed the configured OpenAI transcription limit.",
    );
  }

  const filename = sanitizeBasename(input.filename);
  if (!filename) {
    throw new OpenAiOwnedMediaSttProviderError(
      "invalid_configuration",
      "Owned media filename is required for OpenAI transcription.",
    );
  }

  return {
    apiKey,
    bytes,
    filename,
    contentType: normalizeContentType(input.contentType),
    sha256: sha256Bytes(bytes),
    model,
    timeoutMs,
    fetchImpl: input.fetchImpl ?? fetch,
  };
}

function validateProviderInput(
  config: NormalizedProviderConfig,
  input: OwnedMediaSttProviderInput,
): void {
  if (input.media.sha256 !== config.sha256) {
    throw new OpenAiOwnedMediaSttProviderError(
      "media_mismatch",
      "Owned media SHA-256 does not match the transcription bytes.",
    );
  }
  if (input.media.byteLength !== config.bytes.byteLength) {
    throw new OpenAiOwnedMediaSttProviderError(
      "media_mismatch",
      "Owned media byte length does not match the transcription bytes.",
    );
  }
  if (sanitizeBasename(input.media.filename) !== config.filename) {
    throw new OpenAiOwnedMediaSttProviderError(
      "media_mismatch",
      "Owned media filename does not match the transcription bytes.",
    );
  }

  const inputContentType = normalizeContentType(input.media.contentType);
  if (inputContentType !== config.contentType) {
    throw new OpenAiOwnedMediaSttProviderError(
      "media_mismatch",
      "Owned media content type does not match the transcription bytes.",
    );
  }
}

function formDataFor(
  config: NormalizedProviderConfig,
  input: OwnedMediaSttProviderInput,
): FormData {
  const form = new FormData();
  const fileBytes = new ArrayBuffer(config.bytes.byteLength);
  new Uint8Array(fileBytes).set(config.bytes);
  const blob = new Blob([fileBytes], {
    type: config.contentType ?? undefined,
  });
  form.append("file", blob, config.filename);
  form.append("model", config.model);
  form.append("response_format", "json");

  const language = twoLetterLanguage(input.languageCode);
  if (language) {
    form.append("language", language);
  }

  return form;
}

async function fetchWithTimeout(
  config: NormalizedProviderConfig,
  form: FormData,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    return await config.fetchImpl(OPENAI_AUDIO_TRANSCRIPTIONS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: form,
      signal: controller.signal,
    });
  } catch (err) {
    if (controller.signal.aborted || abortLike(err)) {
      throw new OpenAiOwnedMediaSttProviderError(
        "timeout",
        "OpenAI transcription request timed out.",
      );
    }
    throw new OpenAiOwnedMediaSttProviderError(
      "api_error",
      "OpenAI transcription request failed.",
    );
  } finally {
    clearTimeout(timeout);
  }
}

async function transcriptFromResponse(
  response: Response,
  model: OpenAiOwnedMediaSttModel,
  languageCode: string | null,
): Promise<OwnedMediaSttTranscript> {
  const requestId = requestIdFromHeaders(response.headers);
  if (!response.ok) {
    throw new OpenAiOwnedMediaSttProviderError(
      "api_error",
      "OpenAI transcription request failed.",
      { status: response.status, requestId },
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new OpenAiOwnedMediaSttProviderError(
      "invalid_response",
      "OpenAI transcription response was not valid JSON.",
      { requestId },
    );
  }

  if (!isRecord(payload) || typeof payload.text !== "string" || !payload.text.trim()) {
    throw new OpenAiOwnedMediaSttProviderError(
      "invalid_response",
      "OpenAI transcription response did not include transcript text.",
      { requestId },
    );
  }

  const text = normalizeTranscriptText(payload.text);
  return {
    text,
    timestampMode: "paragraph_only",
    segments: [{ text }],
    languageCode,
    model,
    requestId,
    usage: usageFromPayload(payload.usage),
  };
}

function normalizeModel(model: string): OpenAiOwnedMediaSttModel {
  if ((OPENAI_OWNED_MEDIA_STT_MODELS as readonly string[]).includes(model)) {
    return model as OpenAiOwnedMediaSttModel;
  }
  throw new OpenAiOwnedMediaSttProviderError(
    "invalid_configuration",
    "Unsupported OpenAI transcription model for owned-media STT.",
  );
}

function normalizeTimeout(timeoutMs: number | null | undefined): number {
  const value = timeoutMs ?? DEFAULT_OPENAI_OWNED_MEDIA_STT_TIMEOUT_MS;
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new OpenAiOwnedMediaSttProviderError(
      "invalid_configuration",
      "OpenAI transcription timeout must be a positive integer.",
    );
  }
  return value;
}

function normalizeBytes(input: Uint8Array | ArrayBuffer): Uint8Array {
  return input instanceof Uint8Array ? new Uint8Array(input) : new Uint8Array(input);
}

function normalizeContentType(contentType: string | null | undefined): string | null {
  const cleaned = contentType?.split(";")[0]?.trim().toLowerCase() ?? "";
  return cleaned || null;
}

function sanitizeBasename(filename: string): string {
  return filename.trim().split(/[\\/]/).filter(Boolean).pop() ?? "";
}

function twoLetterLanguage(languageCode: string | null | undefined): string | null {
  const cleaned = languageCode?.trim().toLowerCase() ?? "";
  return /^[a-z]{2}$/.test(cleaned) ? cleaned : null;
}

function requestIdFromHeaders(headers: Headers): string | null {
  return sanitizeIdentifier(headers.get("x-request-id") ?? headers.get("openai-request-id"));
}

function sanitizeIdentifier(value: string | null | undefined): string | null {
  const cleaned = value?.trim() ?? "";
  if (!cleaned) return null;
  if (/Bearer\s+\S+/i.test(cleaned) || /(?:api[_-]?key|token|secret|password)=\S+/i.test(cleaned)) {
    return "<redacted>";
  }
  return cleaned
    .split(/[\\/]/)
    .filter(Boolean)
    .pop()!
    .replace(/Bearer\s+\S+/gi, "Bearer <redacted>")
    .replace(/(?:api[_-]?key|token|secret|password)=\S+/gi, "<redacted>")
    .slice(0, 160);
}

function normalizeTranscriptText(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function usageFromPayload(usage: unknown): OwnedMediaSttTranscript["usage"] | null {
  if (!isRecord(usage)) return null;
  const mapped: NonNullable<OwnedMediaSttTranscript["usage"]> = {};
  const seconds = nonNegativeFinite(usage.seconds);
  if (seconds !== null) mapped.seconds = seconds;
  const inputTokens = nonNegativeFinite(usage.input_tokens);
  if (inputTokens !== null) mapped.inputTokens = inputTokens;
  const outputTokens = nonNegativeFinite(usage.output_tokens);
  if (outputTokens !== null) mapped.outputTokens = outputTokens;
  return Object.keys(mapped).length > 0 ? mapped : null;
}

function nonNegativeFinite(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function abortLike(err: unknown): boolean {
  return !!err && typeof err === "object" && "name" in err && err.name === "AbortError";
}

function sha256Bytes(bytes: Uint8Array): string {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}
