import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/db/client";
import { getItem } from "@/db/items";
import { verifySessionCookie } from "@/lib/auth";
import { enrichItem } from "@/lib/enrich/pipeline";
import {
  assertItemBodyProcessingAllowed,
  ItemBodyProcessingBlockedError,
  resolveItemBodyProcessingGate,
  type BodyProcessingBlockedGate,
} from "@/lib/processing/hold-gate";
import { itemBodyProcessingBlockedResponse } from "@/lib/processing/hold-http";
import { privateNoStoreHeaders } from "@/lib/http/configured-origin";
import { isUnresolvedBatchReservation } from "@/lib/queue/enrichment-batch-binding";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/items/:id/enrich — manual re-enrichment trigger (v0.6.0 Phase C-5).
 *
 * Two paths:
 *
 *   default (queue path)
 *     Marks the item as 'pending' (clears any prior batch_id, prior summary
 *     stays until overwritten on completion). The next 01:00 IST cron tick
 *     picks it up. The caller polls /api/items/:id/enrichment-status to
 *     watch state transitions.
 *
 *   ?force=realtime
 *     Bypasses the batch queue and runs enrichItem() inline. Always uses
 *     the configured LLM_ENRICH_PROVIDER (Ollama by default, Anthropic
 *     /v1/messages — not /v1/messages/batches — when on cloud). Returns
 *     when enrichment completes; expect ~15-60s on Ollama, ~5-15s on
 *     Anthropic realtime.
 *
 * Why a default-queue / opt-in-realtime split:
 *   The cloud cutover replaces "every capture triggers an immediate LLM
 *   call" with "captures batch nightly at 50% off." Realtime is the
 *   escape hatch when the user can't wait until 01:00 IST.
 *
 * Idempotency (Phase C-6):
 *   - Realtime path acquires the row via an atomic 'running' transition
 *     guarded by `enrichment_state IN ('pending','batched','done','error')`.
 *     If the item is already 'running' (another caller in flight), this
 *     returns 409 Conflict — closes Race B (concurrent realtime + cron-
 *     submit) and any double-click on the UI button.
 *   - Queue/realtime paths may supersede a provider-bound or legacy batch.
 *     They must not clear an unresolved pre-dispatch reservation: provider
 *     acceptance is ambiguous, so resending the same body would be unsafe.
 *     Such requests return the existing generic 409 conflict shape.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!verifySessionCookie(req.cookies)) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { id } = await params;
  const item = getItem(id);
  if (!item) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const initialGate = resolveItemBodyProcessingGate(id);
  if (!initialGate.allowed) {
    return itemBodyProcessingBlockedResponse(initialGate);
  }

  const force = req.nextUrl.searchParams.get("force");

  if (force === "realtime") {
    // Atomic claim: transition any non-'running' state to 'running' so a
    // concurrent caller (or a poll tick mid-write) sees the row as
    // already in flight and short-circuits. WHERE-predicate gate is the
    // load-bearing part; UPDATE on better-sqlite3 is single-statement
    // atomic.
    const db = getDb();
    let claim: { changes: number; unresolvedReservation: boolean };
    try {
      claim = db
        .transaction(() => {
          assertItemBodyProcessingAllowed(id, db);
          const current = db
            .prepare(
              "SELECT enrichment_state, batch_id FROM items WHERE id = ?",
            )
            .get(id) as
            { enrichment_state: string; batch_id: string | null } | undefined;
          if (isUnresolvedBatchReservation(current?.batch_id)) {
            return { changes: 0, unresolvedReservation: true };
          }
          const update = db
            .prepare(
              `UPDATE items
             SET enrichment_state = 'running', batch_id = NULL
             WHERE id = ? AND enrichment_state IN ('pending', 'batched', 'done', 'error')`,
            )
            .run(id);
          return {
            changes: update.changes,
            unresolvedReservation: false,
          };
        })
        .immediate();
    } catch (error) {
      const blocked = blockedGateFromError(error);
      if (blocked) return itemBodyProcessingBlockedResponse(blocked);
      throw error;
    }
    if (claim.unresolvedReservation) {
      return unresolvedBatchReservationConflictResponse();
    }
    if (claim.changes === 0) {
      const current = (
        db
          .prepare("SELECT enrichment_state FROM items WHERE id = ?")
          .get(id) as { enrichment_state: string } | undefined
      )?.enrichment_state;
      return NextResponse.json(
        { error: "conflict", state: current ?? "unknown" },
        { status: 409 },
      );
    }

    const realtimeAuthorityAllowed = (): boolean => {
      const current = db
        .prepare("SELECT batch_id FROM items WHERE id = ?")
        .get(id) as { batch_id: string | null } | undefined;
      return !isUnresolvedBatchReservation(current?.batch_id);
    };
    const result = await enrichItem(id, {
      revalidateAuthority: realtimeAuthorityAllowed,
    });
    if (!result.ok) {
      if (
        result.blocked === true &&
        result.code === "processing_authority_changed"
      ) {
        return unresolvedBatchReservationConflictResponse();
      }
      const blocked = blockedGateFromResult(result);
      if (blocked) return itemBodyProcessingBlockedResponse(blocked);

      // enrichItem leaves state at 'running' on failure; reset to 'error'
      // so the polling UI shows the right pill and the queue worker's
      // stale-claim sweep doesn't re-resurrect it.
      let resetAllowed: boolean;
      try {
        resetAllowed = db
          .transaction(() => {
            assertItemBodyProcessingAllowed(id, db);
            const current = db
              .prepare("SELECT batch_id FROM items WHERE id = ?")
              .get(id) as { batch_id: string | null } | undefined;
            if (isUnresolvedBatchReservation(current?.batch_id)) return false;
            db.prepare(
              "UPDATE items SET enrichment_state = 'error' WHERE id = ? AND enrichment_state = 'running'",
            ).run(id);
            return true;
          })
          .immediate();
      } catch (error) {
        const failureGate = blockedGateFromError(error);
        if (failureGate) return itemBodyProcessingBlockedResponse(failureGate);
        throw error;
      }
      if (!resetAllowed) return unresolvedBatchReservationConflictResponse();
      return NextResponse.json(
        { ok: false, error: "enrichment_failed" },
        { status: 500 },
      );
    }
    return NextResponse.json({
      ok: true,
      mode: "realtime",
      item_id: id,
      wall_ms: result.wall_ms,
      attempts: result.attempts,
    });
  }

  // Queue path. Reset state so the cron picks the row up.
  const db = getDb();
  const tx = db.transaction((): boolean => {
    assertItemBodyProcessingAllowed(id, db);
    const current = db
      .prepare("SELECT enrichment_state, batch_id FROM items WHERE id = ?")
      .get(id) as
      { enrichment_state: string; batch_id: string | null } | undefined;
    if (isUnresolvedBatchReservation(current?.batch_id)) {
      return false;
    }
    db.prepare(
      `UPDATE items
       SET enrichment_state = 'pending', batch_id = NULL
       WHERE id = ?`,
    ).run(id);
    // Re-arm the enrichment_jobs row. UNIQUE(item_id) means we update an
    // existing row; if somehow none exists (data drift), insert a fresh one.
    const jobRow = db
      .prepare("SELECT id FROM enrichment_jobs WHERE item_id = ?")
      .get(id) as { id: number } | undefined;
    if (jobRow) {
      db.prepare(
        `UPDATE enrichment_jobs
         SET state = 'pending', claimed_at = NULL, last_error = NULL,
             attempts = 0, completed_at = NULL
         WHERE item_id = ?`,
      ).run(id);
    } else {
      db.prepare("INSERT INTO enrichment_jobs (item_id) VALUES (?)").run(id);
    }
    return true;
  });
  let queued: boolean;
  try {
    queued = tx.immediate();
  } catch (error) {
    const blocked = blockedGateFromError(error);
    if (blocked) return itemBodyProcessingBlockedResponse(blocked);
    throw error;
  }
  if (!queued) return unresolvedBatchReservationConflictResponse();

  return NextResponse.json({
    ok: true,
    mode: "queued",
    item_id: id,
    next_run: "01:00 IST (or next 5-min poll if a batch is in flight)",
  });
}

function unresolvedBatchReservationConflictResponse(): NextResponse {
  return NextResponse.json(
    { error: "conflict", state: "batched" },
    {
      status: 409,
      headers: privateNoStoreHeaders(),
    },
  );
}

function blockedGateFromError(
  error: unknown,
): BodyProcessingBlockedGate | null {
  if (!(error instanceof ItemBodyProcessingBlockedError)) return null;
  return {
    allowed: false,
    basis: error.basis,
    code: error.code,
  };
}

function blockedGateFromResult(result: {
  readonly ok: false;
  readonly [key: string]: unknown;
}): BodyProcessingBlockedGate | null {
  if (result.blocked !== true) return null;
  if (result.code === "processing_hold_active") {
    return {
      allowed: false,
      basis: "held",
      code: "processing_hold_active",
    };
  }
  if (result.code === "processing_schema_incompatible") {
    return {
      allowed: false,
      basis: "schema_incompatible",
      code: "processing_schema_incompatible",
    };
  }
  return null;
}
