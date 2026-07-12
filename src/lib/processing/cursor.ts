import { canonicalJson, signCursor } from "./crypto";

export interface ProcessingCursor {
  v: 1;
  scope: string;
  filterHash: string;
  workflowEpoch: number;
  taxonomyEpoch: number;
  primary: string | number;
  id: string;
}

export class CursorError extends Error {
  constructor(public readonly code: "cursor_invalid" | "cursor_stale") { super(code); }
}

export function encodeCursor(cursor: ProcessingCursor): string {
  const payload = Buffer.from(canonicalJson(cursor)).toString("base64url");
  return `${payload}.${signCursor(payload)}`;
}

export function decodeCursor(value: string, expected: Omit<ProcessingCursor, "v" | "primary" | "id">): ProcessingCursor {
  const [payload, signature, extra] = value.split(".");
  if (!payload || !signature || extra || signCursor(payload) !== signature) throw new CursorError("cursor_invalid");
  let parsed: ProcessingCursor;
  try { parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as ProcessingCursor; }
  catch { throw new CursorError("cursor_invalid"); }
  if (parsed.v !== 1 || parsed.scope !== expected.scope || parsed.filterHash !== expected.filterHash) throw new CursorError("cursor_invalid");
  if (parsed.workflowEpoch !== expected.workflowEpoch || parsed.taxonomyEpoch !== expected.taxonomyEpoch) throw new CursorError("cursor_stale");
  if ((typeof parsed.primary !== "string" && typeof parsed.primary !== "number") || typeof parsed.id !== "string") throw new CursorError("cursor_invalid");
  return parsed;
}
