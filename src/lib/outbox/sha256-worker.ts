/**
 * Web Worker for off-thread SHA256 — v0.6.x offline mode (OFFLINE-2 / plan v3 §5.2 B-2 fix).
 *
 * The PDF dedup tier of the offline outbox needs to compute a content
 * hash of every PDF byte at enqueue time. For a 10 MB PDF the hash takes
 * 600–1200 ms on phone-class CPUs (plan §8.2). Doing it on the UI thread
 * freezes the share-target activity. Plan §5.2 v3 fix: run it in a worker.
 *
 * Division of labor:
 *   - Main thread (share-handler): calls Filesystem.readFile() to obtain
 *     bytes, converts the base64 string to an ArrayBuffer, posts the
 *     buffer to the worker via postMessage with transferList. The buffer
 *     is now zero-copy on the worker side; the main thread's reference
 *     is detached.
 *   - Worker (this file): receives the ArrayBuffer, calls
 *     crypto.subtle.digest('SHA-256', buf), formats the digest as hex,
 *     posts back.
 *
 * Tests for this file invoke `hashBytes()` directly — there is no
 * ergonomic harness for spawning a Web Worker under the node:test runner,
 * but the worker logic is a thin wrapper around the exported helper.
 *
 * The default `self.onmessage` handler is gated on `typeof self !== "undefined" && "postMessage" in self`
 * so this file can be imported in tests without crashing on a missing
 * worker global.
 */

/**
 * Compute SHA-256 of a byte buffer and return a lowercase hex string.
 * Pure function over the Web Crypto API — runs identically in
 * browser / worker / Node 20+ test contexts.
 */
export async function hashBytes(buffer: ArrayBuffer | Uint8Array): Promise<string> {
  // crypto.subtle.digest's BufferSource overload is strict about
  // SharedArrayBuffer. Copy into a plain ArrayBuffer to bypass.
  const ab = new ArrayBuffer(
    buffer instanceof Uint8Array ? buffer.byteLength : buffer.byteLength,
  );
  const dst = new Uint8Array(ab);
  if (buffer instanceof Uint8Array) {
    dst.set(buffer);
  } else {
    dst.set(new Uint8Array(buffer));
  }
  const digest = await crypto.subtle.digest("SHA-256", ab);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Wire format. Main thread posts `{ id, buffer }`; worker replies with
 * either `{ id, hex }` on success or `{ id, error }` on failure. The id
 * lets the main thread correlate concurrent requests if it ever submits
 * more than one — currently it only submits one at a time, but we don't
 * lock that in.
 */
export interface HashRequest {
  id: number;
  buffer: ArrayBuffer;
}
export type HashResponse =
  | { id: number; hex: string }
  | { id: number; error: string };

/**
 * Default message handler. Importing this file in a Worker context
 * (e.g. `new Worker(new URL("./sha256-worker.ts", import.meta.url))`)
 * causes this branch to register on first evaluation.
 *
 * `WorkerGlobalScopeLike` is a minimal structural shape — enough that we
 * can call addEventListener + postMessage without pulling in the
 * `WebWorker` lib globally. The runtime guard distinguishes a real Worker
 * context (where `self` exists but `window` does NOT) from a main browser
 * thread (where `self === window`) and from Node tests (no `self`).
 * Without that distinction, importing this file in a main-thread bundle
 * — which pdf-hash.ts does for the inline fallback — would register a
 * stray listener on the window.
 */
interface WorkerGlobalScopeLike {
  addEventListener(
    type: "message",
    listener: (ev: MessageEvent<HashRequest>) => unknown,
  ): void;
  postMessage(message: HashResponse): void;
}

const inWorkerContext =
  typeof self !== "undefined" &&
  typeof (globalThis as { window?: unknown }).window === "undefined" &&
  "postMessage" in (self as object);

const workerSelf: WorkerGlobalScopeLike | undefined = inWorkerContext
  ? (self as unknown as WorkerGlobalScopeLike)
  : undefined;

if (workerSelf) {
  workerSelf.addEventListener("message", async (ev) => {
    const { id, buffer } = ev.data;
    try {
      const hex = await hashBytes(buffer);
      workerSelf.postMessage({ id, hex });
    } catch (err) {
      workerSelf.postMessage({
        id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });
}
