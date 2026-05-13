/**
 * PDF filesystem-blob layer — v0.6.x offline mode (OFFLINE-9 / plan v3 §5.1).
 *
 * The outbox stores PDF metadata in IDB; the bytes themselves live on
 * app-private filesystem (Capacitor Directory.Data). This avoids hitting
 * the per-origin WebView IDB quota with multi-MB blobs and keeps the
 * outbox row tiny (just the path + sha256 + size).
 *
 * Lifecycle:
 *   - savePdf(blob, fileName) → returns { filePath, fileSize, sha256 }
 *     written to a stable path under outbox/. Caller stores those on
 *     the OutboxPdfEntry.
 *   - readPdfBytes(filePath) → ArrayBuffer for the sync-worker's POST
 *     (transport.ts builds the multipart). Callers should not assume
 *     the file persists after the row's status flips to synced.
 *   - deletePdf(filePath) → unlinks. Called on row sync (plan §4.4 — PDF
 *     bytes deleted on sync; only metadata remains) and on user discard.
 *
 * All ops are gated on the Capacitor plugin being available. Outside an
 * APK these throw — but they're never called outside the APK because
 * share-handler routes PDFs through the outbox path only when
 * window.Capacitor.isNativePlatform() is true.
 *
 * Test seam: each function accepts an optional `fs` argument that the
 * tests provide as a stub. Production callers omit it.
 */

import { hashPdfBlob } from "./pdf-hash";

/** Subfolder under Directory.Data where outbox PDFs live. */
export const OUTBOX_PDF_DIR = "outbox-pdfs";

/** Minimal Filesystem plugin shape we need. */
export interface FilesystemApi {
  writeFile(opts: {
    path: string;
    data: string;
    directory?: string;
    recursive?: boolean;
  }): Promise<{ uri: string }>;
  readFile(opts: { path: string; directory?: string }): Promise<{ data: string | Blob }>;
  deleteFile(opts: { path: string; directory?: string }): Promise<void>;
  mkdir(opts: { path: string; directory?: string; recursive?: boolean }): Promise<void>;
}

async function loadFilesystem(): Promise<FilesystemApi | null> {
  if (typeof window === "undefined") return null;
  try {
    const mod = await import("@capacitor/filesystem");
    return mod.Filesystem as unknown as FilesystemApi;
  } catch {
    return null;
  }
}

/**
 * Convert a Blob/ArrayBuffer to base64 — Capacitor Filesystem.writeFile
 * accepts base64 and signals it via the plugin's data-encoding contract.
 * Browser API: btoa accepts only ISO-8859-1, so we walk the bytes.
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

/**
 * Convert a base64 string back to bytes for the multipart POST. Mirror of
 * arrayBufferToBase64 above; both are intentionally inline + dependency-
 * free so the worker / non-worker paths stay symmetric.
 */
function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export interface SavedPdf {
  /** Path inside Directory.Data, suitable for storing on the outbox row. */
  filePath: string;
  /** Bytes. Used for >25 MB early-reject + the (name, size) dedup tier. */
  fileSize: number;
  /** Worker-computed digest of the bytes. Used as the outbox content_hash. */
  sha256: string;
}

/**
 * Write a PDF blob to app-private storage and return the metadata for
 * the outbox row. The filename suffixes the row's UUID to avoid
 * collisions when the user shares the same name twice.
 */
export async function savePdf(
  blob: Blob,
  fileName: string,
  rowId: string,
  opts?: { fs?: FilesystemApi },
): Promise<SavedPdf> {
  const fs = opts?.fs ?? (await loadFilesystem());
  if (!fs) {
    throw new Error("filesystem-unavailable");
  }
  const buffer = await blob.arrayBuffer();
  const sha256 = await hashPdfBlob(blob);

  // Ensure the directory exists. Some Capacitor versions silently create
  // it on first writeFile with recursive=true, but mkdir is idempotent
  // and cheap so we don't depend on that behavior.
  try {
    await fs.mkdir({
      path: OUTBOX_PDF_DIR,
      directory: "DATA",
      recursive: true,
    });
  } catch {
    // Already exists — fine.
  }

  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = `${OUTBOX_PDF_DIR}/${rowId}__${safeName}`;
  await fs.writeFile({
    path: filePath,
    data: arrayBufferToBase64(buffer),
    directory: "DATA",
    recursive: true,
  });

  return {
    filePath,
    fileSize: buffer.byteLength,
    sha256,
  };
}

/**
 * Read PDF bytes back from app-private storage. Returns the ArrayBuffer
 * the transport will send as multipart/form-data.
 */
export async function readPdfBytes(
  filePath: string,
  opts?: { fs?: FilesystemApi },
): Promise<ArrayBuffer> {
  const fs = opts?.fs ?? (await loadFilesystem());
  if (!fs) throw new Error("filesystem-unavailable");
  const result = await fs.readFile({ path: filePath, directory: "DATA" });
  if (typeof result.data === "string") {
    return base64ToArrayBuffer(result.data);
  }
  return result.data.arrayBuffer();
}

/**
 * Best-effort delete. Used after a successful sync (plan §4.4) and after
 * a user discard. Swallows errors — a missing file is the desired end
 * state regardless.
 */
export async function deletePdf(
  filePath: string,
  opts?: { fs?: FilesystemApi },
): Promise<void> {
  const fs = opts?.fs ?? (await loadFilesystem());
  if (!fs) return;
  try {
    await fs.deleteFile({ path: filePath, directory: "DATA" });
  } catch {
    // File already gone — fine.
  }
}

/** Exported for tests. */
export const __internals = {
  arrayBufferToBase64,
  base64ToArrayBuffer,
};
