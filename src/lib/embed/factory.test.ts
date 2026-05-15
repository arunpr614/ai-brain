// Tests for embed factory (v0.6.0 B-11).

import { test } from "node:test";
import assert from "node:assert/strict";
import { GeminiEmbedProvider } from "./gemini";
import { OllamaEmbedProvider } from "./ollama-provider";
import { EmbedError } from "./client";
import { getEmbedProvider, resetEmbedProviderCache } from "./factory";

function withEnv(vars: Record<string, string | undefined>, fn: () => void): void {
  const prev: Record<string, string | undefined> = {};
  for (const k of Object.keys(vars)) prev[k] = process.env[k];
  try {
    for (const [k, v] of Object.entries(vars)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    resetEmbedProviderCache();
    fn();
  } finally {
    for (const [k, v] of Object.entries(prev)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    resetEmbedProviderCache();
  }
}

test("embed factory: defaults to OllamaEmbedProvider when env unset", () => {
  withEnv({ EMBED_PROVIDER: undefined }, () => {
    assert.ok(getEmbedProvider() instanceof OllamaEmbedProvider);
  });
});

test("embed factory: honors EMBED_PROVIDER=gemini", () => {
  withEnv({ EMBED_PROVIDER: "gemini", GEMINI_API_KEY: "k-test" }, () => {
    assert.ok(getEmbedProvider() instanceof GeminiEmbedProvider);
  });
});

test("embed factory: unknown provider throws EmbedError", () => {
  withEnv({ EMBED_PROVIDER: "openai" }, () => {
    assert.throws(
      () => getEmbedProvider(),
      (err) => {
        assert.ok(err instanceof EmbedError);
        assert.equal((err as EmbedError).code, "EMBED_CONNECTION");
        return true;
      },
    );
  });
});

test("embed factory: memoizes per (provider, model) — same instance on repeat", () => {
  withEnv({ EMBED_PROVIDER: "ollama", EMBED_MODEL: "nomic-embed-text" }, () => {
    const a = getEmbedProvider();
    const b = getEmbedProvider();
    assert.strictEqual(a, b);
  });
});

test("embed factory: resetEmbedProviderCache lets new env take effect", () => {
  withEnv({ EMBED_PROVIDER: "ollama" }, () => {
    assert.ok(getEmbedProvider() instanceof OllamaEmbedProvider);
  });
  withEnv({ EMBED_PROVIDER: "gemini", GEMINI_API_KEY: "k-test" }, () => {
    assert.ok(getEmbedProvider() instanceof GeminiEmbedProvider);
  });
});
