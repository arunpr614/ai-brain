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
  const row = getDb()
    .prepare(
      `SELECT items.enrichment_state AS state,
              items.enriched_at AS updated_at,
              enrichment_jobs.last_error AS last_error
       FROM items
       LEFT JOIN enrichment_jobs ON enrichment_jobs.item_id = items.id
       WHERE items.id = ?`,
    )
    .get(id) as
    | { state: string; updated_at: number | null; last_error: string | null }
    | undefined;
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json(
    {
      state: row.state,
      last_error: row.last_error,
      updated_at: row.updated_at ?? Date.now(),
    },
    { headers: { "cache-control": "no-store" } },
  );
}
