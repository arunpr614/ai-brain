import { type NextRequest } from "next/server";
import { z } from "zod";
import { setItemNoteAiPolicy } from "@/db/item-notes";
import { verifySessionCookie } from "@/lib/auth";
import { handleNoteRouteError, noteMutationDto } from "@/lib/notes/api";
import { manualNotesWriteEnabled } from "@/lib/notes/flags";
import { isExactSameOrigin, noteJson } from "@/lib/notes/http";
import { noteAiProviderPolicy } from "@/lib/notes/provider-policy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  editorInstanceId: z.string().min(1).max(128),
  mutationId: z.string().uuid(),
  epoch: z.number().int().positive(),
  baseGeneration: z.number().int().nonnegative(),
  includeInAi: z.boolean(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
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
    if (body.includeInAi) {
      const policy = noteAiProviderPolicy();
      if (!policy.eligible) {
        return noteJson(
          {
            error: "NOTE_AI_CONSENT_REQUIRED",
            providers: policy.providers.map((provider) => ({
              fingerprint: provider.fingerprint,
              label: provider.label,
              purpose: provider.purpose,
            })),
          },
          { status: 409 },
        );
      }
    }
    const { id } = await params;
    return noteJson(noteMutationDto(setItemNoteAiPolicy({ itemId: id, ...body })));
  } catch (error) {
    return handleNoteRouteError(error);
  }
}

