/**
 * PDF SHA-256 driver — main-thread side of the Web Worker (OFFLINE-9 / plan v3 §5.2 B-2).
 *
 * The share-handler hands this module a Blob (or ArrayBuffer) and gets a
 * hex digest back. Implementation strategy:
 *
 *   1. If `Worker` is available AND `import.meta.url` resolves (it does
 *      under modern bundlers including Next.js webpack/turbopack), spawn
 *      a Dedicated Worker built from `./sha256-worker.ts`. The bytes are
 *      transferred (zero-copy on the worker side) so a 10 MB PDF doesn't
 *      double-allocate.
 *   2. If the Worker constructor throws (some Capacitor WebView versions,
 *      old Android, sandbox restrictions), fall back to `hashBytes()`
 *      inline on the main thread. This blocks the UI ~600–1200 ms for a
 *      10 MB PDF — slower, but the share never fails.
 *
 * The fallback is intentional per OFFLINE-PRE Q5/G5 — we don't yet know
 * whether every Capacitor WebView config supports Workers; the device
 * probe at /debug/quota tells us. This module degrades without ceremony.
 *
 * Tests exercise the inline path — node:test has no Worker harness. The
 * worker-spawning path is exercised manually via APK build per plan §9.4.
 */

import { hashBytes } from "./sha256-worker";

let workerSingleton: Worker | null | undefined; // undefined = uninitialized; null = unsupported
let nextRequestId = 1;
const pending = new Map<number, { resolve: (hex: string) => void; reject: (err: Error) => void }>();

function ensureWorker(): Worker | null {
  if (workerSingleton !== undefined) return workerSingleton;
  if (typeof Worker === "undefined") {
    workerSingleton = null;
    return null;
  }
  try {
    const worker = new Worker(new URL("./sha256-worker.ts", import.meta.url), {
      type: "module",
    });
    worker.addEventListener("message", (ev: MessageEvent) => {
      const data = ev.data as { id: number; hex?: string; error?: string };
      const entry = pending.get(data.id);
      if (!entry) return;
      pending.delete(data.id);
      if (data.error) {
        entry.reject(new Error(data.error));
      } else if (typeof data.hex === "string") {
        entry.resolve(data.hex);
      } else {
        entry.reject(new Error("invalid-worker-response"));
      }
    });
    worker.addEventListener("error", (ev: ErrorEvent) => {
      const msg = ev.message || "worker-error";
      for (const [id, entry] of pending) {
        entry.reject(new Error(msg));
        pending.delete(id);
      }
    });
    workerSingleton = worker;
    return worker;
  } catch {
    workerSingleton = null;
    return null;
  }
}

/**
 * Hash a PDF blob and return the lowercase hex digest. Routes through the
 * Web Worker when available; falls back to inline hashing otherwise.
 *
 * The blob is consumed once (arrayBuffer()) — callers should not assume
 * the blob is reusable after this returns, though in practice Blob is
 * stable across multiple arrayBuffer() reads.
 */
export async function hashPdfBlob(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  return hashPdfBuffer(buffer);
}

/**
 * Hash an already-decoded ArrayBuffer. Useful when the caller has already
 * paid the base64-decode cost (e.g. read via Capacitor Filesystem).
 */
export async function hashPdfBuffer(buffer: ArrayBuffer): Promise<string> {
  const worker = ensureWorker();
  if (!worker) {
    return hashBytes(buffer);
  }
  const id = nextRequestId++;
  return new Promise<string>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    try {
      worker.postMessage({ id, buffer }, [buffer]);
    } catch (err) {
      pending.delete(id);
      // Worker post failed — fall back inline so the share still completes.
      hashBytes(buffer).then(resolve, reject);
      // Drop reference; next call retries Worker creation.
      workerSingleton = null;
      try {
        worker.terminate();
      } catch {
        // Best-effort.
      }
    }
  });
}

/** Test-only: reset module state. */
export function __resetForTests(): void {
  workerSingleton = undefined;
  pending.clear();
  nextRequestId = 1;
}
