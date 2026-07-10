import "./route.test.setup";

import assert from "node:assert/strict";
import { after, test } from "node:test";
import { rmSync } from "node:fs";
import { NextRequest } from "next/server";
import { issueSessionToken, setPin } from "@/lib/auth";
import { getNoteAiDefaultPreference } from "@/lib/notes/default-ai-policy";
import {
  noteAiProviderPolicy,
  setNoteAiProviderConsent,
} from "@/lib/notes/provider-policy";
import { GET, PATCH } from "./route";
import { TEST_DB_DIR } from "./route.test.setup";

setPin("1234");

after(() => rmSync(TEST_DB_DIR, { recursive: true, force: true }));

function request(
  method: "GET" | "PATCH",
  body?: unknown,
  options: { auth?: boolean; origin?: string | null } = {},
) {
  const headers = new Headers();
  if (options.auth !== false) headers.set("cookie", `brain-session=${issueSessionToken()}`);
  if (method === "PATCH") headers.set("content-type", "application/json");
  if (method === "PATCH" && options.origin !== null) {
    headers.set("origin", options.origin ?? "http://localhost");
  }
  return new NextRequest("http://localhost/api/settings/note-ai-default", {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

test("the note AI default setting is private and authenticated", async () => {
  const denied = await GET(request("GET", undefined, { auth: false }));
  assert.equal(denied.status, 401);
  assert.equal(denied.headers.get("cache-control"), "private, no-store, max-age=0");

  const allowed = await GET(request("GET"));
  assert.equal(allowed.status, 200);
  const body = await allowed.json();
  assert.equal(body.includeInAiByDefault, false);
  assert.equal(body.eligible, false);
  assert.equal(body.providers.length, 2);
});

test("setting mutations reject missing and foreign origins", async () => {
  const missing = await PATCH(
    request("PATCH", { includeInAiByDefault: false }, { origin: null }),
  );
  assert.equal(missing.status, 403);
  const foreign = await PATCH(
    request(
      "PATCH",
      { includeInAiByDefault: false },
      { origin: "https://evil.example" },
    ),
  );
  assert.equal(foreign.status, 403);
});

test("setting mutations require auth, valid input, and the write rollout flag", async () => {
  const denied = await PATCH(
    request("PATCH", { includeInAiByDefault: false }, { auth: false }),
  );
  assert.equal(denied.status, 401);

  const malformed = await PATCH(
    request("PATCH", { includeInAiByDefault: "yes" }),
  );
  assert.equal(malformed.status, 400);
  assert.equal((await malformed.json()).error, "NOTE_VALIDATION_FAILED");

  const previous = process.env.MANUAL_NOTES_WRITE_ENABLED;
  process.env.MANUAL_NOTES_WRITE_ENABLED = "0";
  try {
    const disabled = await PATCH(
      request("PATCH", { includeInAiByDefault: false }),
    );
    assert.equal(disabled.status, 503);
    assert.equal((await disabled.json()).error, "MANUAL_NOTES_WRITE_DISABLED");
  } finally {
    if (previous === undefined) delete process.env.MANUAL_NOTES_WRITE_ENABLED;
    else process.env.MANUAL_NOTES_WRITE_ENABLED = previous;
  }
});

test("enabling the default requires consent for every active remote provider", async () => {
  const blocked = await PATCH(
    request("PATCH", { includeInAiByDefault: true }),
  );
  assert.equal(blocked.status, 409);
  const blockedBody = await blocked.json();
  assert.equal(blockedBody.error, "NOTE_AI_CONSENT_REQUIRED");
  assert.equal(blockedBody.providers.length, 2);
  assert.equal(getNoteAiDefaultPreference(), false);

  for (const provider of noteAiProviderPolicy().providers) {
    setNoteAiProviderConsent({ fingerprint: provider.fingerprint, approved: true });
  }
  const enabled = await PATCH(
    request("PATCH", { includeInAiByDefault: true }),
  );
  assert.equal(enabled.status, 200);
  assert.equal((await enabled.json()).includeInAiByDefault, true);
  assert.equal(getNoteAiDefaultPreference(), true);
});

test("disabling the default does not require provider consent", async () => {
  const disabled = await PATCH(
    request("PATCH", { includeInAiByDefault: false }),
  );
  assert.equal(disabled.status, 200);
  assert.equal((await disabled.json()).includeInAiByDefault, false);
  assert.equal(getNoteAiDefaultPreference(), false);
});
