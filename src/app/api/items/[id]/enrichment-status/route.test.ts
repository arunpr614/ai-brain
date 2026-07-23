import "./route.test.setup";

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { NextRequest } from "next/server";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { TEST_DB_DIR } from "./route.test.setup";
import { GET } from "./route";
import { getDb } from "@/db/client";
import { insertCaptured } from "@/db/items";
import type {
  TranscriptAttemptRow,
  TranscriptJobRow,
} from "@/db/transcript-jobs";
import { issueSessionToken, setPin } from "@/lib/auth";

setPin("1234");

test.after(() => {
  try {
    rmSync(TEST_DB_DIR, { recursive: true, force: true });
  } catch {
    // ignore
  }
});

function mkReq(id: string, opts: { auth?: boolean } = {}): NextRequest {
  const headers = new Headers();
  if (opts.auth !== false)
    headers.set("cookie", `brain-session=${issueSessionToken()}`);
  return new NextRequest(`http://localhost/api/items/${id}/enrichment-status`, {
    method: "GET",
    headers,
  });
}

function paramsFor(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

function assertExactPrivateHeaders(res: Response): void {
  assert.equal(
    res.headers.get("Cache-Control"),
    "private, no-store, max-age=0",
  );
  assert.equal(res.headers.get("Vary"), "Cookie, Origin");
  assert.equal(res.headers.get("X-Content-Type-Options"), "nosniff");
}

test("401 when no session cookie", async () => {
  const res = await GET(
    mkReq("anything", { auth: false }),
    paramsFor("anything"),
  );
  assert.equal(res.status, 401);
  assertExactPrivateHeaders(res);
});

test("404 when item id does not exist", async () => {
  const res = await GET(mkReq("nope_id"), paramsFor("nope_id"));
  assert.equal(res.status, 404);
  assertExactPrivateHeaders(res);
});

test("returns the polling state for a newly captured pending item", async () => {
  const item = insertCaptured({
    source_type: "note",
    title: "status pending",
    body: "x".repeat(50),
  });
  const res = await GET(mkReq(item.id), paramsFor(item.id));
  assert.equal(res.status, 200);
  assertExactPrivateHeaders(res);
  const body = await res.json();
  assert.equal(body.state, "pending");
  assert.deepEqual(Object.keys(body).sort(), [
    "attempts",
    "state",
    "updated_at",
  ]);
});

test("does not expose provider batch ids or persisted error text", async () => {
  const batchIdSentinel = "msgbatch_private_status_sentinel";
  const providerErrorSentinel = "provider raw failure private sentinel";
  const item = insertCaptured({
    source_type: "note",
    title: "status batched",
    body: "x".repeat(50),
  });
  getDb()
    .prepare(
      "UPDATE items SET enrichment_state = 'batched', batch_id = ? WHERE id = ?",
    )
    .run(batchIdSentinel, item.id);
  getDb()
    .prepare(
      "UPDATE enrichment_jobs SET attempts = 2, last_error = ? WHERE item_id = ?",
    )
    .run(providerErrorSentinel, item.id);

  const res = await GET(mkReq(item.id), paramsFor(item.id));
  assert.equal(res.status, 200);
  assertExactPrivateHeaders(res);
  const body = await res.json();
  assert.equal(body.state, "batched");
  assert.equal(body.attempts, 2);
  assert.deepEqual(Object.keys(body).sort(), [
    "attempts",
    "state",
    "updated_at",
  ]);
  const serialized = JSON.stringify(body);
  assert.doesNotMatch(serialized, new RegExp(batchIdSentinel));
  assert.doesNotMatch(serialized, new RegExp(providerErrorSentinel));
});

test("UI source has no raw-field references through dot, bracket, destructuring, or helper syntax", () => {
  const root = process.cwd();
  const forbiddenFields = new Set([
    "batch_id",
    "last_error",
    "last_error_code",
    "last_error_message",
    "error_code",
    "error_message",
  ]);
  const violations: string[] = [];

  for (const relativePath of [
    "src/components/enriching-pill.tsx",
    "src/app/items/[id]/page.tsx",
  ]) {
    const file = join(root, relativePath);
    const source = ts.createSourceFile(
      file,
      readFileSync(file, "utf8"),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    function visit(node: ts.Node): void {
      const field =
        ts.isIdentifier(node) || ts.isStringLiteral(node) ? node.text : null;
      if (field && forbiddenFields.has(field)) {
        const position = source.getLineAndCharacterOfPosition(
          node.getStart(source),
        );
        violations.push(`${relativePath}:${position.line + 1}:${field}`);
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }

  assert.deepEqual(violations, []);
});

test("rendered transcript recovery panel never projects raw job or attempt diagnostics", async () => {
  let forbiddenDiagnosticReads = 0;
  const sentinels = {
    jobProvider: "raw_job_provider_private_sentinel",
    jobErrorCode: "raw_job_error_code_private_sentinel",
    jobErrorMessage: "raw_job_error_message_private_sentinel",
    attemptProvider: "raw_attempt_provider_private_sentinel",
    attemptErrorCode: "raw_attempt_error_code_private_sentinel",
    attemptErrorMessage: "raw_attempt_error_message_private_sentinel",
  };
  const job = {
    id: 41,
    item_id: "item-safe-test",
    source_platform: "youtube",
    video_id: null,
    state: "manual_needed",
    priority: 0,
    attempts: 1,
    max_attempts: 3,
    next_run_at: null,
    claimed_at: null,
    completed_at: null,
    last_attempt_id: 71,
    get last_provider() {
      forbiddenDiagnosticReads += 1;
      return sentinels.jobProvider;
    },
    get last_error_code() {
      forbiddenDiagnosticReads += 1;
      return sentinels.jobErrorCode;
    },
    get last_error_message() {
      forbiddenDiagnosticReads += 1;
      return sentinels.jobErrorMessage;
    },
    created_at: 1_700_000_000_000,
    updated_at: 1_700_000_000_000,
  } satisfies TranscriptJobRow;
  const attempt = {
    id: 71,
    job_id: 41,
    item_id: "item-safe-test",
    attempt_number: 1,
    provider: sentinels.attemptProvider,
    state: "terminal_error",
    retryable: 0,
    get error_code() {
      forbiddenDiagnosticReads += 1;
      return sentinels.attemptErrorCode;
    },
    get error_message() {
      forbiddenDiagnosticReads += 1;
      return sentinels.attemptErrorMessage;
    },
    status_code: 500,
    started_at: 1_700_000_000_000,
    finished_at: 1_700_000_001_000,
    duration_ms: 1_000,
    transcript_language: null,
    transcript_is_generated: null,
    transcript_is_translated: null,
    transcript_chars: null,
    artifact_ids_json: null,
    created_at: 1_700_000_000_000,
  } satisfies TranscriptAttemptRow;
  const manualAttempt = {
    id: 72,
    job_id: 41,
    item_id: "item-safe-test",
    attempt_number: 2,
    provider: "manual_user_text",
    state: "success",
    retryable: 0,
    error_code: null,
    error_message: null,
    status_code: null,
    started_at: 1_700_000_002_000,
    finished_at: 1_700_000_003_000,
    duration_ms: 1_000,
    transcript_language: null,
    transcript_is_generated: null,
    transcript_is_translated: null,
    transcript_chars: null,
    artifact_ids_json: null,
    created_at: 1_700_000_002_000,
  } satisfies TranscriptAttemptRow;

  const previousNodeEnv = process.env.NODE_ENV;
  Reflect.set(process.env, "NODE_ENV", "test");
  let ItemDetailPage: unknown;
  try {
    ({ default: ItemDetailPage } = await import("@/app/items/[id]/page"));
  } finally {
    if (previousNodeEnv === undefined) {
      Reflect.deleteProperty(process.env, "NODE_ENV");
    } else {
      Reflect.set(process.env, "NODE_ENV", previousNodeEnv);
    }
  }
  const TranscriptRecoveryPanel = (
    ItemDetailPage as unknown as Record<PropertyKey, unknown>
  )[Symbol.for("ai-brain.test.TranscriptRecoveryPanel")] as
    | ((props: {
        job: TranscriptJobRow;
        attempts: TranscriptAttemptRow[];
        itemId: string;
      }) => ReactNode)
    | undefined;
  assert.equal(typeof TranscriptRecoveryPanel, "function");

  const rendered = renderToStaticMarkup(
    createElement(TranscriptRecoveryPanel!, {
      job,
      attempts: [attempt, manualAttempt],
      itemId: job.item_id,
    }),
  );

  for (const sentinel of Object.values(sentinels)) {
    assert.equal(rendered.includes(sentinel), false);
  }
  assert.equal(forbiddenDiagnosticReads, 0);
  assert.match(rendered, />transcript_provider</);
  assert.match(rendered, />manual_user_text</);
});
