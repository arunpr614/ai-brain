import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { NotebookLmExportRequestRow } from "@/db/notebooklm-export";
import { notebookLmRequestDto } from "./presentation";

function leasedRequest(
  phase: NotebookLmExportRequestRow["phase"],
  overrides: Partial<NotebookLmExportRequestRow> = {},
): NotebookLmExportRequestRow {
  return {
    id: "request-1",
    owner_id: "primary",
    idempotency_key: "idempotency-1",
    item_id: "item-1",
    connector_id: "connector-1",
    target_id: "target-1",
    binding_version: 1,
    mapper_version: 1,
    content_hash: "a".repeat(64),
    opaque_marker: "marker-1",
    payload_title: "Synthetic memory",
    payload_text: "Synthetic body",
    payload_bytes: 14,
    payload_words: 2,
    limited_capture: 0,
    state: "leased",
    phase,
    safe_reason: null,
    lease_epoch: 1,
    lease_token_hash: "b".repeat(64),
    lease_until: 1_700_000_120_000,
    next_attempt_at: 1_700_000_000_000,
    attempt_count: 1,
    source_alias: null,
    provider_status: null,
    created_at: 1_700_000_000_000,
    updated_at: 1_700_000_060_000,
    claimed_at: 1_700_000_060_000,
    create_dispatched_at: null,
    processing_at: null,
    completed_at: null,
    expires_at: 1_700_086_400_000,
    snapshot_purge_at: 1_700_086_400_000,
    snapshot_purged_at: null,
    cancelled_at: null,
    ...overrides,
  };
}

describe("NotebookLM request presentation", () => {
  test("maps leased operation phases to truthful user states", () => {
    const cases: Array<{
      phase: NotebookLmExportRequestRow["phase"];
      state: ReturnType<typeof notebookLmRequestDto>["state"];
    }> = [
      { phase: "pre_create", state: "queued" },
      { phase: "create", state: "sending" },
      { phase: "reconcile", state: "reconciling" },
      { phase: "poll", state: "processing" },
      { phase: "terminal", state: "connector_update_required" },
    ];

    for (const { phase, state } of cases) {
      assert.equal(notebookLmRequestDto(leasedRequest(phase)).state, state, phase);
    }
  });

  test("fails closed when a leased row has an unknown phase", () => {
    const row = leasedRequest(
      "unknown_phase" as NotebookLmExportRequestRow["phase"],
    );

    assert.equal(notebookLmRequestDto(row).state, "connector_update_required");
  });

  test("presents leased read-only recovery truthfully when create writes are unavailable", () => {
    const reconcile = notebookLmRequestDto(
      leasedRequest("reconcile", { create_dispatched_at: 1_700_000_030_000 }),
    );
    const poll = notebookLmRequestDto(
      leasedRequest("poll", {
        create_dispatched_at: 1_700_000_030_000,
        source_alias: "source-1",
      }),
    );

    assert.equal(reconcile.state, "reconciling");
    assert.equal(reconcile.possiblyDelivered, true);
    assert.equal(poll.state, "processing");
    assert.equal(poll.possiblyDelivered, true);
  });
});
