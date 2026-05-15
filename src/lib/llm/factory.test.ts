// Tests for factory (v0.6.0 B-7).

import { test } from "node:test";
import assert from "node:assert/strict";
import { AnthropicProvider } from "./anthropic";
import { OllamaProvider } from "./ollama";
import { OpenRouterProvider } from "./openrouter";
import { LLMError } from "./errors";
import { getAskProvider, getEnrichProvider, resetProviderCache } from "./factory";

function withEnv(vars: Record<string, string | undefined>, fn: () => void): void {
  const prev: Record<string, string | undefined> = {};
  for (const k of Object.keys(vars)) prev[k] = process.env[k];
  try {
    for (const [k, v] of Object.entries(vars)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    resetProviderCache();
    fn();
  } finally {
    for (const [k, v] of Object.entries(prev)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    resetProviderCache();
  }
}

test("factory: defaults to OllamaProvider when env unset", () => {
  withEnv(
    { LLM_ENRICH_PROVIDER: undefined, LLM_ASK_PROVIDER: undefined },
    () => {
      assert.ok(getEnrichProvider() instanceof OllamaProvider);
      assert.ok(getAskProvider() instanceof OllamaProvider);
    },
  );
});

test("factory: honors LLM_ENRICH_PROVIDER=anthropic", () => {
  withEnv({ LLM_ENRICH_PROVIDER: "anthropic", ANTHROPIC_API_KEY: "sk-test" }, () => {
    assert.ok(getEnrichProvider() instanceof AnthropicProvider);
  });
});

test("factory: honors LLM_ASK_PROVIDER=openrouter", () => {
  withEnv({ LLM_ASK_PROVIDER: "openrouter", OPENROUTER_API_KEY: "or-test" }, () => {
    assert.ok(getAskProvider() instanceof OpenRouterProvider);
  });
});

test("factory: enrich and ask are independent providers", () => {
  withEnv(
    {
      LLM_ENRICH_PROVIDER: "anthropic",
      LLM_ASK_PROVIDER: "openrouter",
      ANTHROPIC_API_KEY: "sk-test",
      OPENROUTER_API_KEY: "or-test",
    },
    () => {
      assert.ok(getEnrichProvider() instanceof AnthropicProvider);
      assert.ok(getAskProvider() instanceof OpenRouterProvider);
    },
  );
});

test("factory: unknown provider name throws LLMError on resolution", () => {
  withEnv({ LLM_ENRICH_PROVIDER: "claude" }, () => {
    assert.throws(
      () => getEnrichProvider(),
      (err) => {
        assert.ok(err instanceof LLMError);
        assert.equal((err as LLMError).code, "connection");
        assert.match((err as Error).message, /not a known provider/);
        return true;
      },
    );
  });
});

test("factory: memoizes per (provider, model) — same instance on repeat call", () => {
  withEnv({ LLM_ENRICH_PROVIDER: "ollama", LLM_ENRICH_MODEL: "qwen2.5:7b" }, () => {
    const a = getEnrichProvider();
    const b = getEnrichProvider();
    assert.strictEqual(a, b);
  });
});

test("factory: resetProviderCache lets a new env take effect", () => {
  withEnv({ LLM_ENRICH_PROVIDER: "ollama" }, () => {
    const ollama = getEnrichProvider();
    assert.ok(ollama instanceof OllamaProvider);
  });
  withEnv({ LLM_ENRICH_PROVIDER: "anthropic", ANTHROPIC_API_KEY: "sk-test" }, () => {
    const anth = getEnrichProvider();
    assert.ok(anth instanceof AnthropicProvider);
  });
});
