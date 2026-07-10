import { type NextRequest } from "next/server";
import { z } from "zod";
import { restoreItemNoteRevision } from "@/db/item-notes";
import { verifySessionCookie } from "@/lib/auth";
import { handleNoteRouteError, noteMutationDto } from "@/lib/notes/api";
import { manualNotesWriteEnabled } from "@/lib/notes/flags";
import { isExactSameOrigin, noteJson } from "@/lib/notes/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  editorInstanceId: z.string().min(1).max(128),
  mutationId: z.string().uuid(),
  epoch: z.number().int().positive(),
  baseGeneration: z.number().int().nonnegative(),
});

export async function POST(
  req: NextRequest,
  {
    params,
  }: { params: Promise<{ id: string; revisionId: string }> },
) {
  if (!verifySessionCookie(req.cookies)) {
    return noteJson({ error: "unauthenticated" }, { status: 401 });
  }
  if (!manualNotesWriteEnabled()) {
    return noteJson({ error: "MANUAL_NOTES_WRITE_DISABLED" }, { status: 503 });
  }
  if (!isExactSameOrigin(req)) {
    return noteJson({ error: "NOTE_CROSS_ORIGIN_FORBIDDEN" }, { status: 403 });
  }
  try {
    const body = schema.parse(await req.json());
    const { id, revisionId } = await params;
    return noteJson(
      noteMutationDto(
        restoreItemNoteRevision({
          itemId: id,
          revisionId,
          ...body,
        }),
      ),
    );
  } catch (error) {
    return handleNoteRouteError(error);
  }
}
