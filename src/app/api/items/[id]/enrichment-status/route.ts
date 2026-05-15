import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/db/client";
import { SESSION_COOKIE } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Lightweight polling endpoint for the enrichment pill (F-205).
 * Returns the item's enrichment_state + optional last_error.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!req.cookies.get(SESSION_COOKIE)?.value) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const { id } = await params;
  // F-046 (self-critique A-4): surface attempts so the EnrichingPill can
  // distinguish "queued" from "retrying 2/3". The LEFT JOIN may duplicate
  // the items row if multiple enrichment_jobs exist for the same item
  // (shouldn't happen today but defensive): pick the most recent job.
  const row = getDb()
    .prepare(
      `SELECT items.enrichment_state AS state,
              items.enriched_at AS updated_at,
              items.batch_id AS batch_id,
              j.last_error AS last_error,
              j.attempts AS attempts
       FROM items
       LEFT JOIN (
         SELECT item_id, last_error, attempts,
                ROW_NUMBER() OVER (PARTITION BY item_id ORDER BY id DESC) AS rn
         FROM enrichment_jobs
       ) AS j ON j.item_id = items.id AND j.rn = 1
       WHERE items.id = ?`,
    )
    .get(id) as
    | {
        state: string;
        updated_at: number | null;
        batch_id: string | null;
        last_error: string | null;
        attempts: number | null;
      }
    | undefined;
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json(
    {
      state: row.state,
      // v0.6.0 Phase C-8: surface batch_id so the pill can show
      // "Queued for tonight's batch" with optional debug context.
      batch_id: row.batch_id,
      last_error: row.last_error,
      updated_at: row.updated_at ?? Date.now(),
      attempts: row.attempts ?? 0,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
