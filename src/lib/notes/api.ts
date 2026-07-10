import { ZodError } from "zod";
import { ItemNoteError, type NoteSnapshot } from "@/db/item-notes";
import { NoteMarkdownError } from "./markdown";
import { noteJson } from "./http";

export function noteSnapshotDto(snapshot: NoteSnapshot) {
  return {
    state: snapshot.state
      ? {
          epoch: snapshot.state.epoch,
          generation: snapshot.state.generation,
          deleted: snapshot.state.is_deleted === 1,
          updatedAt: snapshot.state.updated_at,
        }
      : null,
    note: snapshot.note
      ? {
          contentMarkdown: snapshot.note.content_md,
          contentHash: snapshot.note.content_hash,
          bytes: Buffer.byteLength(snapshot.note.content_md, "utf8"),
          includeInAi: snapshot.note.include_in_ai === 1,
          indexedGeneration: snapshot.note.indexed_generation,
          lastSavedKind: snapshot.note.last_saved_kind,
          createdAt: snapshot.note.created_at,
          updatedAt: snapshot.note.updated_at,
        }
      : null,
  };
}

export function noteMutationDto(snapshot: NoteSnapshot & { replayed: boolean }) {
  return { ...noteSnapshotDto(snapshot), replayed: snapshot.replayed };
}

export function handleNoteRouteError(error: unknown) {
  if (error instanceof ZodError) {
    return noteJson(
      { error: "NOTE_VALIDATION_FAILED", issues: error.issues.map((issue) => issue.message) },
      { status: 400 },
    );
  }
  if (error instanceof NoteMarkdownError) {
    return noteJson({ error: error.code, message: error.message }, { status: 413 });
  }
  if (error instanceof ItemNoteError) {
    const status =
      error.code === "ITEM_NOT_FOUND"
        ? 404
        : error.code === "NOTE_NOT_FOUND"
          ? 404
          : error.code === "NOTE_MUTATION_MISMATCH"
            ? 422
            : 409;
    return noteJson(
      {
        error: error.code,
        message: error.message,
        current: error.snapshot ? noteSnapshotDto(error.snapshot) : undefined,
      },
      { status },
    );
  }
  return noteJson({ error: "NOTE_INTERNAL_ERROR" }, { status: 500 });
}

