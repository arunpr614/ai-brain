/**
 * /api/search — unified search endpoint (v0.4.0 T-14 / ORG-3).
 *
 * GET ?q=<query>&mode=fts|semantic|hybrid[&limit=N]
 *
 * Session cookie required. Semantic + hybrid modes embed the query via
 * the configured embedding provider, so a 503 is returned when that
 * provider is unreachable.
 */
import { type NextRequest } from "next/server";
import { verifySessionCookie } from "@/lib/auth";
import { getEmbedProvider } from "@/lib/embed/factory";
import { searchUnifiedDetailed, type SearchMode } from "@/lib/search";
import { noteJson } from "@/lib/notes/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_MODES = new Set<SearchMode>(["fts", "semantic", "hybrid"]);

export async function GET(req: NextRequest) {
  if (!verifySessionCookie(req.cookies)) {
    return noteJson({ error: "unauthenticated" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (!q) return noteJson({ items: [] });

  const rawMode = searchParams.get("mode") ?? "fts";
  if (!VALID_MODES.has(rawMode as SearchMode)) {
    return noteJson(
      { error: `invalid mode: ${rawMode}` },
      { status: 400 },
    );
  }
  const mode = rawMode as SearchMode;
  const limit = Math.min(Math.max(1, Number(searchParams.get("limit") ?? 50)), 200);

  if ((mode === "semantic" || mode === "hybrid") && !(await getEmbedProvider().isAlive())) {
    return noteJson(
      {
        error: "EMBED_PROVIDER_OFFLINE",
        legacy_error: "OLLAMA_OFFLINE",
        message:
          "Semantic indexing is not reachable right now. Check AI services in Settings.",
      },
      { status: 503 },
    );
  }

  try {
    const items = await searchUnifiedDetailed(q, { mode, limit });
    return noteJson({ items, mode, count: items.length });
  } catch (err) {
    return noteJson(
      { error: err instanceof Error ? err.message : "search failed" },
      { status: 500 },
    );
  }
}
