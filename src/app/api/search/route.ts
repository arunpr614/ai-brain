/**
 * /api/search — unified search endpoint (v0.4.0 T-14 / ORG-3).
 *
 * GET ?q=<query>&mode=fts|semantic|hybrid[&limit=N]
 *
 * Session cookie required. Semantic + hybrid modes embed the query via
 * Ollama, so a 503 is returned when the daemon is unreachable.
 */
import { type NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";
import { isOllamaAlive } from "@/lib/llm/ollama";
import { searchUnified, type SearchMode } from "@/lib/search";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_MODES = new Set<SearchMode>(["fts", "semantic", "hybrid"]);

export async function GET(req: NextRequest) {
  if (!req.cookies.get(SESSION_COOKIE)?.value) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (!q) return NextResponse.json({ items: [] });

  const rawMode = searchParams.get("mode") ?? "fts";
  if (!VALID_MODES.has(rawMode as SearchMode)) {
    return NextResponse.json(
      { error: `invalid mode: ${rawMode}` },
      { status: 400 },
    );
  }
  const mode = rawMode as SearchMode;
  const limit = Math.min(Math.max(1, Number(searchParams.get("limit") ?? 50)), 200);

  if ((mode === "semantic" || mode === "hybrid") && !(await isOllamaAlive())) {
    return NextResponse.json(
      {
        error: "OLLAMA_OFFLINE",
        message:
          "Ollama isn't reachable at http://localhost:11434. Start it with `ollama serve` and retry.",
      },
      { status: 503 },
    );
  }

  try {
    const items = await searchUnified(q, { mode, limit });
    return NextResponse.json({ items, mode, count: items.length });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "search failed" },
      { status: 500 },
    );
  }
}
