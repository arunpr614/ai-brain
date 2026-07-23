import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/db/client";
import { verifySessionCookie } from "@/lib/auth";
import { privateNoStoreHeaders } from "@/lib/http/configured-origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Lightweight polling endpoint for the enrichment pill (F-205).
 * Returns only the state needed to render progress. Provider identifiers and
 * persisted error text are deliberately kept on the server.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!verifySessionCookie(req.cookies)) {
    return NextResponse.json(
      { error: "unauthenticated" },
      { status: 401, headers: privateNoStoreHeaders() },
    );
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
              j.attempts AS attempts
       FROM items
       LEFT JOIN (
         SELECT item_id, attempts,
                ROW_NUMBER() OVER (PARTITION BY item_id ORDER BY id DESC) AS rn
         FROM enrichment_jobs
       ) AS j ON j.item_id = items.id AND j.rn = 1
       WHERE items.id = ?`,
    )
    .get(id) as
    | {
        state: string;
        updated_at: number | null;
        attempts: number | null;
      }
    | undefined;
  if (!row) {
    return NextResponse.json(
      { error: "not_found" },
      { status: 404, headers: privateNoStoreHeaders() },
    );
  }

  return NextResponse.json(
    {
      state: row.state,
      updated_at: row.updated_at ?? Date.now(),
      attempts: row.attempts ?? 0,
    },
    { headers: privateNoStoreHeaders() },
  );
}
