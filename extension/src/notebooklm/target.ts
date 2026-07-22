const NOTEBOOK_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const MARKER_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;

export class TargetValidationError extends Error {
  override readonly name = "TargetValidationError";
}

export type ParsedTarget = {
  notebookId: string;
  authUser: number | null;
  canonicalUrl: string;
};

export function parseNotebookTarget(raw: string): ParsedTarget {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new TargetValidationError("Enter a complete NotebookLM notebook URL.");
  }
  if (
    url.protocol !== "https:" ||
    url.hostname !== "notebooklm.google.com" ||
    url.port ||
    url.username ||
    url.password
  ) {
    throw new TargetValidationError("The target must be a notebooklm.google.com HTTPS notebook URL.");
  }
  if (url.hash) {
    throw new TargetValidationError("Remove the fragment from the notebook URL.");
  }
  const queryKeys = [...url.searchParams.keys()];
  const authUserValues = url.searchParams.getAll("authuser");
  if (
    queryKeys.some((key) => key !== "authuser") ||
    authUserValues.length > 1 ||
    (authUserValues.length === 1 && !/^(?:[0-9]|10)$/.test(authUserValues[0]!))
  ) {
    throw new TargetValidationError(
      "Remove unsupported query parameters; only a numeric authuser from 0 to 10 is allowed.",
    );
  }
  const match = /^\/notebook\/([^/]+)\/?$/.exec(url.pathname);
  const notebookId = match?.[1];
  if (!notebookId || !NOTEBOOK_ID_PATTERN.test(notebookId)) {
    throw new TargetValidationError("The URL does not contain a valid NotebookLM notebook ID.");
  }
  const normalizedId = notebookId.toLowerCase();
  const authUser = authUserValues.length === 1 ? Number(authUserValues[0]) : null;
  const route = authUser === null ? "" : `?authuser=${authUser}`;
  return {
    notebookId: normalizedId,
    authUser,
    canonicalUrl: `https://notebooklm.google.com/notebook/${normalizedId}${route}`,
  };
}

export function safeNotebookLabel(raw: unknown): string {
  if (typeof raw !== "string") return "NotebookLM notebook";
  const normalized = raw
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return (normalized || "NotebookLM notebook").slice(0, 48);
}

export async function targetFingerprint(notebookId: string, authUser: number | null = null): Promise<string> {
  if (!NOTEBOOK_ID_PATTERN.test(notebookId)) throw new TargetValidationError("Invalid notebook ID.");
  if (authUser !== null && (!Number.isInteger(authUser) || authUser < 0 || authUser > 10)) {
    throw new TargetValidationError("Invalid Google account route.");
  }
  const route = authUser === null ? "" : `\u0000authuser=${authUser}`;
  return sha256(`notebooklm-target-v1\u0000${notebookId.toLowerCase()}${route}`);
}

export async function subjectFingerprint(ownerIdentity: string, notebookId: string): Promise<string> {
  const normalized = ownerIdentity.trim().toLowerCase();
  if (
    !normalized ||
    normalized.length > 320 ||
    /[\u0000-\u001f\u007f]/.test(normalized) ||
    !NOTEBOOK_ID_PATTERN.test(notebookId)
  ) {
    throw new TargetValidationError("Notebook ownership could not be verified.");
  }
  // Bind the account proof to an undisclosed high-entropy notebook ID so the
  // hosted service cannot dictionary-test likely email addresses against it.
  return sha256(`notebooklm-subject-v1\u0000${notebookId.toLowerCase()}\u0000${normalized}`);
}

export async function sourceAlias(sourceId: string): Promise<string> {
  if (!validOpaqueIdentifier(sourceId)) throw new TargetValidationError("Invalid provider source ID.");
  return sha256(`notebooklm-source-v1\u0000${sourceId.toLowerCase()}`);
}

export function assertFingerprint(value: string): void {
  if (!SHA256_PATTERN.test(value)) throw new TargetValidationError("Invalid binding fingerprint.");
}

export function assertMarker(value: string): void {
  if (!MARKER_PATTERN.test(value)) throw new TargetValidationError("Invalid request marker.");
}

export function providerTitle(title: string | null, marker: string): string {
  assertMarker(marker);
  const clean = (title ?? "AI Brain item")
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim() || "AI Brain item";
  const suffix = ` · ${marker}`;
  const base = clean.endsWith(suffix) ? clean.slice(0, -suffix.length) : clean;
  const available = Math.max(1, 180 - suffix.length);
  return `${base.slice(0, available).trimEnd()}${suffix}`;
}

export function titleHasMarker(title: string | null, marker: string): boolean {
  assertMarker(marker);
  return typeof title === "string" && title.endsWith(` · ${marker}`);
}

export function validOpaqueIdentifier(value: unknown): value is string {
  return typeof value === "string" && NOTEBOOK_ID_PATTERN.test(value);
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
