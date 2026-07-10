import { createHash } from "node:crypto";
import { getDb } from "@/db/client";

export interface NoteAiProvider {
  fingerprint: string;
  label: string;
  purpose: "semantic_index" | "ask";
  provider: string;
  model: string;
  remote: boolean;
  approved: boolean;
}

function fingerprint(parts: string[]): string {
  return createHash("sha256").update(parts.join("\u0000"), "utf8").digest("hex");
}

function defaultAskModel(provider: string): string {
  if (provider === "anthropic") {
    return process.env.LLM_ENRICH_MODEL?.trim() || "claude-haiku-4-5-20251001";
  }
  if (provider === "openrouter") return "anthropic/claude-sonnet-4-6";
  return process.env.OLLAMA_DEFAULT_MODEL?.trim() || "qwen2.5:7b-instruct-q4_K_M";
}

function ollamaEndpoint(): { identity: string; remote: boolean; label: string } {
  const raw = process.env.OLLAMA_HOST?.trim() || "http://localhost:11434";
  try {
    const parsed = new URL(raw);
    const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    const loopback =
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      hostname === "::1" ||
      /^127(?:\.\d{1,3}){3}$/.test(hostname);
    return {
      identity: parsed.toString().replace(/\/+$/, ""),
      remote: !loopback,
      label: loopback ? "Local Ollama" : `Ollama (${hostname})`,
    };
  } catch {
    // Invalid/opaque endpoints fail closed as remote. The raw value is hashed
    // into consent identity but is never returned to the client or logs.
    return { identity: `invalid:${raw}`, remote: true, label: "Ollama (configured endpoint)" };
  }
}

interface ConfiguredProvider extends Omit<NoteAiProvider, "fingerprint" | "approved"> {
  consentIdentity: string;
}

function configuredProviders(): ConfiguredProvider[] {
  const embedProvider = process.env.EMBED_PROVIDER?.trim() || "ollama";
  const embedModel =
    process.env.EMBED_MODEL?.trim() ||
    (embedProvider === "gemini"
      ? "gemini-embedding-001"
      : process.env.OLLAMA_EMBED_MODEL?.trim() || "nomic-embed-text");
  const askProvider = process.env.LLM_ASK_PROVIDER?.trim() || "ollama";
  const askModel = process.env.LLM_ASK_MODEL?.trim() || defaultAskModel(askProvider);
  const ollama = ollamaEndpoint();

  return [
    {
      provider: embedProvider,
      model: embedModel,
      label: embedProvider === "gemini" ? "Google Gemini" : ollama.label,
      purpose: "semantic_index" as const,
      remote: embedProvider !== "ollama" || ollama.remote,
      consentIdentity: embedProvider === "ollama" ? ollama.identity : "google-gemini-api-v1",
    },
    {
      provider: askProvider,
      model: askModel,
      label:
        askProvider === "anthropic"
          ? "Anthropic Claude"
          : askProvider === "openrouter"
            ? "OpenRouter"
            : ollama.label,
      purpose: "ask" as const,
      remote: askProvider !== "ollama" || ollama.remote,
      consentIdentity:
        askProvider === "ollama" ? ollama.identity : `${askProvider}-managed-api-v1`,
    },
  ];
}

export function noteAiProviderPolicy(): {
  eligible: boolean;
  providers: NoteAiProvider[];
} {
  const db = getDb();
  const providers = configuredProviders().map((provider) => {
    const { consentIdentity, ...publicProvider } = provider;
    const id = fingerprint([
      provider.provider,
      provider.model,
      provider.purpose,
      provider.remote ? "remote-v1" : "local-v1",
      consentIdentity,
    ]);
    const consent = db
      .prepare(
        `SELECT approved_at, revoked_at FROM note_ai_provider_consents
         WHERE provider_fingerprint = ?`,
      )
      .get(id) as { approved_at: number | null; revoked_at: number | null } | undefined;
    return {
      ...publicProvider,
      fingerprint: id,
      approved: !provider.remote || Boolean(consent?.approved_at && !consent.revoked_at),
    };
  });
  return {
    eligible: providers.every((provider) => provider.approved),
    providers,
  };
}

export function setNoteAiProviderConsent(input: {
  fingerprint: string;
  approved: boolean;
}): NoteAiProvider {
  const policy = noteAiProviderPolicy();
  const provider = policy.providers.find((candidate) => candidate.fingerprint === input.fingerprint);
  if (!provider || !provider.remote) {
    throw new Error("NOTE_AI_PROVIDER_UNKNOWN");
  }
  const now = Date.now();
  const db = getDb();
  db.transaction(() => {
    db.prepare(
      `INSERT INTO note_ai_provider_consents (
         provider_fingerprint, provider_label, provider_scope, approved_at, revoked_at
       ) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(provider_fingerprint) DO UPDATE SET
         provider_label = excluded.provider_label,
         provider_scope = excluded.provider_scope,
         approved_at = excluded.approved_at,
         revoked_at = excluded.revoked_at`,
    ).run(
      provider.fingerprint,
      provider.label,
      provider.purpose,
      input.approved ? now : null,
      input.approved ? null : now,
    );

    if (!input.approved) {
      db.prepare(
        `INSERT INTO note_index_jobs (
           item_id, target_epoch, target_generation, desired_action, state,
           attempts, created_at, updated_at
         )
         SELECT n.item_id, n.epoch, n.generation, 'purge', 'pending', 0, ?, ?
         FROM item_notes n WHERE n.include_in_ai = 1
         ON CONFLICT(item_id) DO UPDATE SET
           target_epoch = excluded.target_epoch,
           target_generation = excluded.target_generation,
           desired_action = 'purge', state = 'pending', attempts = 0,
           claimed_by = NULL, lease_expires_at = NULL, last_error_code = NULL,
           updated_at = excluded.updated_at, completed_at = NULL`,
      ).run(now, now);
    } else if (noteAiProviderPolicy().eligible) {
      db.prepare(
        `INSERT INTO note_index_jobs (
           item_id, target_epoch, target_generation, desired_action, state,
           attempts, created_at, updated_at
         )
         SELECT n.item_id, n.epoch, n.generation, 'index', 'pending', 0, ?, ?
         FROM item_notes n
         JOIN item_note_state s ON s.item_id = n.item_id
         WHERE n.include_in_ai = 1 AND s.is_deleted = 0
           AND length(trim(n.content_text)) > 0
         ON CONFLICT(item_id) DO UPDATE SET
           target_epoch = excluded.target_epoch,
           target_generation = excluded.target_generation,
           desired_action = 'index', state = 'pending', attempts = 0,
           claimed_by = NULL, lease_expires_at = NULL, last_error_code = NULL,
           updated_at = excluded.updated_at, completed_at = NULL`,
      ).run(now, now);
    }
  })();
  return { ...provider, approved: input.approved };
}
