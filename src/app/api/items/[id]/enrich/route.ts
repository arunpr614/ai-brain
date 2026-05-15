import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/db/client";
import { getItem } from "@/db/items";
import { SESSION_COOKIE } from "@/lib/auth";
import { enrichItem } from "@/lib/enrich/pipeline";

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
 *   - Queue path clears batch_id when resetting to 'pending'. The
 *     orphaned batch entry (if any), when its result lands later, sees
 *     the item is no longer 'batched' and short-circuits in
 *     pollAllInFlightBatches.writeBatchResult — closes Race A.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!req.cookies.get(SESSION_COOKIE)?.value) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { id } = await params;
  const item = getItem(id);
  if (!item) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const force = req.nextUrl.searchParams.get("force");

  if (force === "realtime") {
    // Atomic claim: transition any non-'running' state to 'running' so a
    // concurrent caller (or a poll tick mid-write) sees the row as
    // already in flight and short-circuits. WHERE-predicate gate is the
    // load-bearing part; UPDATE on better-sqlite3 is single-statement
    // atomic.
    const claim = getDb()
      .prepare(
        `UPDATE items
         SET enrichment_state = 'running', batch_id = NULL
         WHERE id = ? AND enrichment_state IN ('pending', 'batched', 'done', 'error')`,
      )
      .run(id);
    if (claim.changes === 0) {
      const current = (
        getDb()
          .prepare("SELECT enrichment_state FROM items WHERE id = ?")
          .get(id) as { enrichment_state: string } | undefined
      )?.enrichment_state;
      return NextResponse.json(
        { error: "conflict", state: current ?? "unknown" },
        { status: 409 },
      );
    }

    const result = await enrichItem(id);
    if (!result.ok) {
      // enrichItem leaves state at 'running' on failure; reset to 'error'
      // so the polling UI shows the right pill and the queue worker's
      // stale-claim sweep doesn't re-resurrect it.
      getDb()
        .prepare(
          "UPDATE items SET enrichment_state = 'error' WHERE id = ? AND enrichment_state = 'running'",
        )
        .run(id);
      return NextResponse.json(
        { ok: false, error: result.error, raw: result.raw },
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
  const tx = db.transaction(() => {
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
  });
  tx();

  return NextResponse.json({
    ok: true,
    mode: "queued",
    item_id: id,
    next_run: "01:00 IST (or next 5-min poll if a batch is in flight)",
  });
}
