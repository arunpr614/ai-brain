import { type NextRequest } from "next/server";
import { z } from "zod";
import { verifySessionCookie } from "@/lib/auth";
import { manualNotesUiEnabled, manualNotesWriteEnabled } from "@/lib/notes/flags";
import { isExactSameOrigin, noteJson } from "@/lib/notes/http";
import {
  noteAiProviderPolicy,
  setNoteAiProviderConsent,
} from "@/lib/notes/provider-policy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  approved: z.boolean(),
});

export async function GET(req: NextRequest) {
  if (!verifySessionCookie(req.cookies)) {
    return noteJson({ error: "unauthenticated" }, { status: 401 });
  }
  if (!manualNotesUiEnabled()) return noteJson({ error: "not_found" }, { status: 404 });
  const policy = noteAiProviderPolicy();
  return noteJson({
    eligible: policy.eligible,
    providers: policy.providers.map(({ fingerprint, label, purpose, remote, approved }) => ({
      fingerprint,
      label,
      purpose,
      remote,
      approved,
    })),
  });
}

export async function POST(req: NextRequest) {
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
    const provider = setNoteAiProviderConsent(body);
    return noteJson({
      provider: {
        fingerprint: provider.fingerprint,
        label: provider.label,
        purpose: provider.purpose,
        approved: provider.approved,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return noteJson({ error: "NOTE_VALIDATION_FAILED" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "NOTE_AI_PROVIDER_UNKNOWN") {
      return noteJson({ error: error.message }, { status: 404 });
    }
    return noteJson({ error: "NOTE_INTERNAL_ERROR" }, { status: 500 });
  }
}
