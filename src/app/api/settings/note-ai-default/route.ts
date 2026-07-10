import { type NextRequest } from "next/server";
import { z } from "zod";
import { verifySessionCookie } from "@/lib/auth";
import {
  getNoteAiDefaultPreference,
  setNoteAiDefaultPreference,
} from "@/lib/notes/default-ai-policy";
import { manualNotesUiEnabled, manualNotesWriteEnabled } from "@/lib/notes/flags";
import { isExactSameOrigin, noteJson } from "@/lib/notes/http";
import { noteAiProviderPolicy } from "@/lib/notes/provider-policy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ includeInAiByDefault: z.boolean() }).strict();

function snapshot() {
  const policy = noteAiProviderPolicy();
  const includeInAiByDefault = getNoteAiDefaultPreference();
  return {
    includeInAiByDefault,
    effective: includeInAiByDefault && policy.eligible,
    eligible: policy.eligible,
    providers: policy.providers.map(
      ({ fingerprint, label, purpose, remote, approved }) => ({
        fingerprint,
        label,
        purpose,
        remote,
        approved,
      }),
    ),
  };
}

export async function GET(req: NextRequest) {
  if (!verifySessionCookie(req.cookies)) {
    return noteJson({ error: "unauthenticated" }, { status: 401 });
  }
  if (!manualNotesUiEnabled()) return noteJson({ error: "not_found" }, { status: 404 });
  return noteJson(snapshot());
}

export async function PATCH(req: NextRequest) {
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
    const { includeInAiByDefault } = schema.parse(await req.json());
    const policy = noteAiProviderPolicy();
    if (includeInAiByDefault && !policy.eligible) {
      return noteJson(
        {
          error: "NOTE_AI_CONSENT_REQUIRED",
          providers: policy.providers
            .filter((provider) => !provider.approved)
            .map(({ fingerprint, label, purpose, remote, approved }) => ({
              fingerprint,
              label,
              purpose,
              remote,
              approved,
            })),
        },
        { status: 409 },
      );
    }
    setNoteAiDefaultPreference(includeInAiByDefault);
    return noteJson(snapshot());
  } catch (error) {
    if (error instanceof z.ZodError) {
      return noteJson({ error: "NOTE_VALIDATION_FAILED" }, { status: 400 });
    }
    return noteJson({ error: "NOTE_INTERNAL_ERROR" }, { status: 500 });
  }
}
