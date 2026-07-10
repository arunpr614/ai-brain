import { type NextRequest } from "next/server";
import { listItemNoteRevisions } from "@/db/item-notes";
import { verifySessionCookie } from "@/lib/auth";
import { handleNoteRouteError } from "@/lib/notes/api";
import { manualNotesUiEnabled } from "@/lib/notes/flags";
import { noteJson } from "@/lib/notes/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!verifySessionCookie(req.cookies)) {
    return noteJson({ error: "unauthenticated" }, { status: 401 });
  }
  if (!manualNotesUiEnabled()) return noteJson({ error: "not_found" }, { status: 404 });
  try {
    const { id } = await params;
    const include = req.nextUrl.searchParams.get("include");
    const requestedId = req.nextUrl.searchParams.get("revision_id");
    const revisions = listItemNoteRevisions(id).map((revision) => ({
      id: revision.id,
      epoch: revision.epoch,
      sourceGeneration: revision.source_generation,
      saveKind: revision.save_kind,
      createdAt: revision.created_at,
      ...(include === "body" && requestedId === revision.id
        ? { contentMarkdown: revision.content_md }
        : {}),
    }));
    return noteJson({ revisions });
  } catch (error) {
    return handleNoteRouteError(error);
  }
}

