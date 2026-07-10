import { test } from "node:test";
import assert from "node:assert/strict";
import { EmbedError } from "@/lib/embed/client";
import { LLMError } from "@/lib/llm/errors";
import {
  classifyEmbedError,
  classifyLlmError,
  getProviderStatusReport,
  resetProviderStatusCache,
} from "./status";

test.afterEach(() => {
  resetProviderStatusCache();
});

test("classifies Gemini depleted credits as quota_or_billing", () => {
  const err = new EmbedError(
    "EMBED_HTTP",
    "Gemini embedContent 429: RESOURCE_EXHAUSTED prepayment credits are depleted",
    { status: 429 },
  );
  assert.equal(classifyEmbedError(err), "quota_or_billing");
});

test("classifies missing provider credentials as unconfigured", () => {
  assert.equal(
    classifyLlmError(new LLMError("connection", "Anthropic provider requires ANTHROPIC_API_KEY")),
    "unconfigured",
  );
});

test("classifies invalid provider responses", () => {
  assert.equal(
    classifyEmbedError(new EmbedError("EMBED_INVALID_RESPONSE", "Embedding has dim 1, expected 768")),
    "invalid_response",
  );
});

test("classifies generic provider failures as unknown", () => {
  assert.equal(classifyLlmError(new Error("unexpected provider payload")), "unknown");
  assert.equal(classifyEmbedError(new Error("unexpected embed payload")), "unknown");
});

test("provider status report exposes deterministic unknown states", async () => {
  const report = await getProviderStatusReport({
    now: () => 3000,
    llmProbe: async () => ({
      provider: "anthropic",
      model: "claude",
      status: "unknown",
      message: "Provider status could not be confirmed.",
    }),
    embedProbe: async () => ({
      provider: "gemini",
      model: "gemini",
      status: "unconfigured",
      message: "Provider credentials are not configured.",
    }),
  });

  assert.equal(report.llm.status, "unknown");
  assert.equal(report.llm.lastCheckedAt, 3000);
  assert.equal(report.llm.lastSuccessAt, null);
  assert.equal(report.embed.status, "unconfigured");
  assert.equal(report.embed.lastSuccessAt, null);
});

test("provider status report caches probe results", async () => {
  let llmCalls = 0;
  let embedCalls = 0;
  const first = await getProviderStatusReport({
    now: () => 1000,
    llmProbe: async () => {
      llmCalls++;
      return { provider: "anthropic", model: "claude", status: "ok", message: null };
    },
    embedProbe: async () => {
      embedCalls++;
      return { provider: "gemini", model: "gemini", status: "ok", message: null };
    },
  });
  const second = await getProviderStatusReport({
    now: () => 2000,
    llmProbe: async () => {
      llmCalls++;
      return { provider: "anthropic", model: "claude", status: "unreachable", message: null };
    },
    embedProbe: async () => {
      embedCalls++;
      return { provider: "gemini", model: "gemini", status: "unreachable", message: null };
    },
  });

  assert.deepEqual(second, first);
  assert.equal(llmCalls, 1);
  assert.equal(embedCalls, 1);
});
