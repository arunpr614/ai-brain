import { type NextRequest, NextResponse } from "next/server";
import { getItemNote } from "@/db/item-notes";
import { getItem } from "@/db/items";
import { verifySessionCookie } from "@/lib/auth";
import { handleNoteRouteError } from "@/lib/notes/api";
import { manualNotesUiEnabled } from "@/lib/notes/flags";
import { NOTE_PRIVATE_HEADERS, noteJson } from "@/lib/notes/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeFilename(value: string): string {
  const normalized = value.normalize("NFKD").replace(/[^\w.-]+/g, "-").replace(/^-+|-+$/g, "");
  return (normalized || "my-notes").slice(0, 80);
}

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
    const item = getItem(id);
    const snapshot = getItemNote(id);
    if (!item || !snapshot.note) return noteJson({ error: "NOTE_NOT_FOUND" }, { status: 404 });
    const content = [
      `# My notes — ${item.title}`,
      "",
      `> Private attached note exported from AI Brain. Source item: ${item.title}`,
      `> Note epoch ${snapshot.note.epoch}, generation ${snapshot.note.generation}.`,
      "",
      snapshot.note.content_md,
      "",
    ].join("\n");
    return new NextResponse(content, {
      headers: {
        ...NOTE_PRIVATE_HEADERS,
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeFilename(item.title)}-my-notes.md"`,
      },
    });
  } catch (error) {
    return handleNoteRouteError(error);
  }
}
