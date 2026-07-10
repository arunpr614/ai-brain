import type {
  OwnedMediaSttProvider,
  OwnedMediaSttProviderInput,
  OwnedMediaSttTranscript,
} from "./owned-media-stt";

export interface CreateMockOwnedMediaSttProviderInput {
  transcript?: OwnedMediaSttTranscript;
  error?: Error;
  maxBytes?: number;
}

export function createMockOwnedMediaSttProvider(
  input: CreateMockOwnedMediaSttProviderInput = {},
): OwnedMediaSttProvider & { calls: OwnedMediaSttProviderInput[] } {
  const calls: OwnedMediaSttProviderInput[] = [];
  return {
    providerName: "mock-owned-media-stt",
    providerVersion: "mock-owned-media-stt-test-v1",
    maxBytes: input.maxBytes,
    calls,
    async transcribe(providerInput) {
      calls.push(providerInput);
      if (input.error) throw input.error;
      return input.transcript ?? defaultMockTranscript(providerInput);
    },
  };
}

function defaultMockTranscript(
  input: OwnedMediaSttProviderInput,
): OwnedMediaSttTranscript {
  const text = [
    "MOCK OWNED MEDIA STT TRANSCRIPT.",
    "This deterministic test transcript proves the owned-media handoff, policy preflight, persistence, search repair, transcript source, and segment storage path without claiming real transcription.",
    "No uploaded filename, raw media bytes, or user-provided labels are echoed by this mock provider.",
  ].join(" ");

  return {
    text,
    languageCode: input.languageCode,
    timestampMode: "paragraph_only",
    segments: [{ text }],
    model: "mock-owned-media-stt",
    requestId: "mock-owned-media-stt-request",
    usage: {
      seconds: input.media.durationMs ? input.media.durationMs / 1000 : undefined,
    },
  };
}
