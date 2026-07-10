import "./provider-policy.test.setup";

import assert from "node:assert/strict";
import { after, test } from "node:test";
import { rmSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { getDb } from "@/db/client";
import { insertCaptured } from "@/db/items";
import { saveItemNote, setItemNoteAiPolicy } from "@/db/item-notes";
import {
  noteAiProviderPolicy,
  setNoteAiProviderConsent,
} from "./provider-policy";
import { TEST_DB_DIR } from "./provider-policy.test.setup";

after(() => rmSync(TEST_DB_DIR, { recursive: true, force: true }));

test("remote note providers require exact fingerprint consent and revocation queues purge", () => {
  const item = insertCaptured({ source_type: "url", title: "Consent", body: "source" });
  saveItemNote({
    itemId: item.id,
    editorInstanceId: "consent-editor",
    mutationId: randomUUID(),
    epoch: null,
    baseGeneration: null,
    contentMarkdown: "Private content stays local before acknowledgement.",
    saveKind: "manual",
  });
  setItemNoteAiPolicy({
    itemId: item.id,
    editorInstanceId: "consent-editor",
    mutationId: randomUUID(),
    epoch: 1,
    baseGeneration: 1,
    includeInAi: true,
  });

  const initial = noteAiProviderPolicy();
  assert.equal(initial.eligible, false);
  assert.deepEqual(
    initial.providers.map((provider) => [provider.label, provider.remote, provider.approved]),
    [
      ["Google Gemini", true, false],
      ["OpenRouter", true, false],
    ],
  );
  for (const provider of initial.providers) {
    setNoteAiProviderConsent({ fingerprint: provider.fingerprint, approved: true });
  }
  assert.equal(noteAiProviderPolicy().eligible, true);

  setNoteAiProviderConsent({
    fingerprint: initial.providers[0]!.fingerprint,
    approved: false,
  });
  assert.equal(noteAiProviderPolicy().eligible, false);
  assert.deepEqual(
    getDb()
      .prepare("SELECT desired_action, state FROM note_index_jobs WHERE item_id = ?")
      .get(item.id),
    { desired_action: "purge", state: "pending" },
  );

  getDb()
    .prepare("UPDATE note_index_jobs SET state = 'done' WHERE item_id = ?")
    .run(item.id);
  setNoteAiProviderConsent({
    fingerprint: initial.providers[0]!.fingerprint,
    approved: true,
  });
  assert.deepEqual(
    getDb()
      .prepare("SELECT desired_action, state FROM note_index_jobs WHERE item_id = ?")
      .get(item.id),
    { desired_action: "index", state: "pending" },
  );
});

test("non-loopback Ollama requires destination-specific consent and exact effective models", () => {
  const previous = {
    embedProvider: process.env.EMBED_PROVIDER,
    embedModel: process.env.EMBED_MODEL,
    askProvider: process.env.LLM_ASK_PROVIDER,
    askModel: process.env.LLM_ASK_MODEL,
    host: process.env.OLLAMA_HOST,
    ollamaEmbedModel: process.env.OLLAMA_EMBED_MODEL,
    ollamaAskModel: process.env.OLLAMA_DEFAULT_MODEL,
  };
  try {
    process.env.EMBED_PROVIDER = "ollama";
    delete process.env.EMBED_MODEL;
    process.env.LLM_ASK_PROVIDER = "ollama";
    delete process.env.LLM_ASK_MODEL;
    process.env.OLLAMA_HOST = "https://ollama.example.test:11434";
    process.env.OLLAMA_EMBED_MODEL = "private-embed-v2";
    process.env.OLLAMA_DEFAULT_MODEL = "private-ask-v3";

    const remote = noteAiProviderPolicy();
    assert.equal(remote.eligible, false);
    assert.deepEqual(
      remote.providers.map(({ remote, approved, model }) => ({ remote, approved, model })),
      [
        { remote: true, approved: false, model: "private-embed-v2" },
        { remote: true, approved: false, model: "private-ask-v3" },
      ],
    );

    process.env.OLLAMA_HOST = "http://127.0.0.1:11434";
    const local = noteAiProviderPolicy();
    assert.equal(local.eligible, true);
    assert.ok(local.providers.every((provider) => !provider.remote && provider.approved));
    assert.notEqual(local.providers[0]!.fingerprint, remote.providers[0]!.fingerprint);
  } finally {
    const restore = (name: string, value: string | undefined) => {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    };
    restore("EMBED_PROVIDER", previous.embedProvider);
    restore("EMBED_MODEL", previous.embedModel);
    restore("LLM_ASK_PROVIDER", previous.askProvider);
    restore("LLM_ASK_MODEL", previous.askModel);
    restore("OLLAMA_HOST", previous.host);
    restore("OLLAMA_EMBED_MODEL", previous.ollamaEmbedModel);
    restore("OLLAMA_DEFAULT_MODEL", previous.ollamaAskModel);
  }
});
