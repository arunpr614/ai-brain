import { type NextRequest } from "next/server";
import { z } from "zod";
import {
  deleteItemNote,
  getItemNote,
  saveItemNote,
} from "@/db/item-notes";
import { verifySessionCookie } from "@/lib/auth";
import { handleNoteRouteError, noteMutationDto, noteSnapshotDto } from "@/lib/notes/api";
import { manualNotesUiEnabled, manualNotesWriteEnabled } from "@/lib/notes/flags";
import { isExactSameOrigin, noteEmpty, noteJson } from "@/lib/notes/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const saveSchema = z.object({
  editorInstanceId: z.string().min(1).max(128),
  mutationId: z.string().uuid(),
  epoch: z.number().int().positive().nullable(),
  baseGeneration: z.number().int().nonnegative().nullable(),
  contentMarkdown: z.string(),
  contentHash: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  saveKind: z.enum(["auto", "manual"]),
  operation: z.enum(["save", "clear", "recreate"]).optional(),
});

const deleteSchema = z.object({
  editorInstanceId: z.string().min(1).max(128),
  mutationId: z.string().uuid(),
  epoch: z.number().int().positive(),
  baseGeneration: z.number().int().nonnegative(),
});

type RouteContext = { params: Promise<{ id: string }> };

function unauthenticated(req: NextRequest) {
  return !verifySessionCookie(req.cookies);
}

function writeGate(req: NextRequest) {
  if (unauthenticated(req)) return noteJson({ error: "unauthenticated" }, { status: 401 });
  if (!manualNotesWriteEnabled()) {
    return noteJson({ error: "MANUAL_NOTES_WRITE_DISABLED" }, { status: 503 });
  }
  if (!isExactSameOrigin(req)) {
    return noteJson({ error: "NOTE_CROSS_ORIGIN_FORBIDDEN" }, { status: 403 });
  }
  return null;
}

export async function GET(req: NextRequest, context: RouteContext) {
  if (unauthenticated(req)) return noteJson({ error: "unauthenticated" }, { status: 401 });
  if (!manualNotesUiEnabled()) return noteJson({ error: "not_found" }, { status: 404 });
  const { id } = await context.params;
  try {
    return noteJson(noteSnapshotDto(getItemNote(id)));
  } catch (error) {
    return handleNoteRouteError(error);
  }
}

export async function PUT(req: NextRequest, context: RouteContext) {
  const gate = writeGate(req);
  if (gate) return gate;
  const { id } = await context.params;
  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > 120_000) {
    return noteJson({ error: "NOTE_TOO_LARGE" }, { status: 413 });
  }
  try {
    const body = saveSchema.parse(await req.json());
    const result = saveItemNote({ itemId: id, ...body });
    const status = !result.replayed && result.state?.generation === 1 ? 201 : 200;
    return noteJson(noteMutationDto(result), { status });
  } catch (error) {
    return handleNoteRouteError(error);
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const gate = writeGate(req);
  if (gate) return gate;
  const { id } = await context.params;
  try {
    const body = deleteSchema.parse(await req.json());
    const result = deleteItemNote({ itemId: id, ...body });
    const response = noteEmpty(204);
    response.headers.set("X-Note-Epoch", String(result.state?.epoch ?? ""));
    response.headers.set("X-Note-Generation", String(result.state?.generation ?? ""));
    response.headers.set("X-Idempotent-Replay", result.replayed ? "1" : "0");
    return response;
  } catch (error) {
    return handleNoteRouteError(error);
  }
}

