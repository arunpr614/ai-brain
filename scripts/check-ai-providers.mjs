#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

loadEnvFile(".env");
loadEnvFile(".env.local");

const args = parseArgs(process.argv.slice(2));
const checks = [];

checks.push(await checkLlm("enrichment", "LLM_ENRICH_PROVIDER", "LLM_ENRICH_MODEL"));
checks.push(await checkLlm("ask", "LLM_ASK_PROVIDER", "LLM_ASK_MODEL"));
checks.push(await checkEmbed());

const seen = new Set();
const unique = checks.filter((check) => {
  const key = `${check.kind}:${check.provider}:${check.model}`;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});

let failed = false;
for (const check of unique) {
  const prefix = check.ok ? "ok" : "fail";
  console.log(`[ai-providers] ${prefix} ${check.kind}: ${check.provider} ${check.model} - ${check.message}`);
  if (!check.ok) failed = true;
}

if (failed && !args.warnOnly) process.exit(2);
if (failed) console.warn("[ai-providers] Provider check failed, continuing because --warn-only was set.");

async function checkLlm(kind, providerEnv, modelEnv) {
  const provider = process.env[providerEnv] || "ollama";
  const model = process.env[modelEnv] || defaultLlmModel(provider);
  try {
    if (provider === "anthropic") {
      const key = process.env.ANTHROPIC_API_KEY;
      if (!key) return fail(kind, provider, model, "Anthropic API key is not configured.");
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model,
          max_tokens: 1,
          messages: [{ role: "user", content: "ping" }],
        }),
        signal: timeout(8000),
      });
      return responseStatus(kind, provider, model, res, "Claude generation is reachable.");
    }
    if (provider === "openrouter") {
      const key = process.env.OPENROUTER_API_KEY;
      if (!key) return fail(kind, provider, model, "OpenRouter API key is not configured.");
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          authorization: `Bearer ${key}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 1,
          provider: {
            order: ["Anthropic"],
            allow_fallbacks: false,
            data_collection: "deny",
          },
        }),
        signal: timeout(8000),
      });
      return responseStatus(kind, provider, model, res, "OpenRouter generation is reachable.");
    }
    if (provider === "ollama") {
      const host = (process.env.OLLAMA_HOST || "http://localhost:11434").replace(/\/+$/, "");
      const res = await fetch(`${host}/api/tags`, { signal: timeout(3000) });
      return responseStatus(kind, provider, model, res, "Ollama generation is reachable.");
    }
    return fail(kind, provider, model, `Unknown LLM provider "${provider}".`);
  } catch (err) {
    return fail(kind, provider, model, classifyMessage(err));
  }
}

async function checkEmbed() {
  const kind = "embedding";
  const provider = process.env.EMBED_PROVIDER || "ollama";
  const model = process.env.EMBED_MODEL || defaultEmbedModel(provider);
  try {
    if (provider === "gemini") {
      const key = process.env.GEMINI_API_KEY;
      if (!key) return fail(kind, provider, model, "Gemini API key is not configured.");
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model,
      )}:embedContent?key=${encodeURIComponent(key)}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          content: { parts: [{ text: "probe" }] },
          outputDimensionality: 768,
        }),
        signal: timeout(8000),
      });
      if (!res.ok) return responseStatus(kind, provider, model, res, "Gemini semantic indexing is reachable.");
      const body = await res.json();
      const dim = body?.embedding?.values?.length ?? 0;
      if (dim !== 768) return fail(kind, provider, model, `Gemini returned ${dim} dimensions, expected 768.`);
      return ok(kind, provider, model, "Gemini semantic indexing is reachable.");
    }
    if (provider === "ollama") {
      const host = (process.env.OLLAMA_HOST || "http://localhost:11434").replace(/\/+$/, "");
      const res = await fetch(`${host}/api/embed`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ model, input: ["probe"] }),
        signal: timeout(8000),
      });
      if (!res.ok) return responseStatus(kind, provider, model, res, "Ollama semantic indexing is reachable.");
      const body = await res.json();
      const dim = body?.embeddings?.[0]?.length ?? 0;
      if (dim !== 768) return fail(kind, provider, model, `Ollama returned ${dim} dimensions, expected 768.`);
      return ok(kind, provider, model, "Ollama semantic indexing is reachable.");
    }
    return fail(kind, provider, model, `Unknown embedding provider "${provider}".`);
  } catch (err) {
    return fail(kind, provider, model, classifyMessage(err));
  }
}

async function responseStatus(kind, provider, model, res, successMessage) {
  if (res.ok) return ok(kind, provider, model, successMessage);
  const text = await res.text().catch(() => "");
  const message = classifyHttp(res.status, text);
  return fail(kind, provider, model, message);
}

function classifyHttp(status, text) {
  const joined = `${status} ${text}`;
  if (/quota|billing|credit|prepayment|resource[_ ]?exhausted|rate.?limit|429/i.test(joined)) {
    return "Billing or quota is blocking this provider.";
  }
  if (/api[_ -]?key|unauthorized|permission|forbidden|401|403/i.test(joined)) {
    return "Provider credentials are missing or invalid.";
  }
  if (/invalid|dimension|response/i.test(joined)) {
    return "Provider returned an unexpected response.";
  }
  return `Provider returned HTTP ${status}.`;
}

function classifyMessage(err) {
  const message = err instanceof Error ? err.message : String(err);
  if (/timed out|abort/i.test(message)) return "Provider check timed out.";
  return "Provider is not reachable right now.";
}

function ok(kind, provider, model, message) {
  return { ok: true, kind, provider, model, message };
}

function fail(kind, provider, model, message) {
  return { ok: false, kind, provider, model, message };
}

function defaultLlmModel(provider) {
  if (provider === "anthropic") return "claude-haiku-4-5-20251001";
  if (provider === "openrouter") return "anthropic/claude-sonnet-4-6";
  return "qwen2.5:7b-instruct-q4_K_M";
}

function defaultEmbedModel(provider) {
  return provider === "gemini" ? "gemini-embedding-001" : "nomic-embed-text";
}

function timeout(ms) {
  return typeof AbortSignal !== "undefined" && "timeout" in AbortSignal
    ? AbortSignal.timeout(ms)
    : undefined;
}

function parseArgs(argv) {
  return { warnOnly: argv.includes("--warn-only") };
}

function loadEnvFile(file) {
  const path = resolve(process.cwd(), file);
  if (!existsSync(path)) return;
  for (const rawLine of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}
