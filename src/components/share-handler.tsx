"use client";

/**
 * Android share-intent handler (v0.5.0 T-12 / CAP-6 + F-041).
 *
 * Mounts in app/layout.tsx. Registers a `shareReceived` listener on the
 * @capgo/capacitor-share-target plugin when running inside a Capacitor
 * WebView; no-op on plain browsers.
 *
 * Flow per plan §6.5 (D-v0.5.0-5 fixed to read token from @capacitor/
 * preferences, not BuildConfig):
 *   1. Receive {title, texts[], files[]} from the plugin
 *   2. Dedup via isDuplicateShare() with a 2s window (F-041)
 *   3. Read bearer token from Preferences; if missing, show toast +
 *      route to /setup-apk (P0-2 fix — WebView JS cannot read native
 *      BuildConfig constants)
 *   4. Route by content:
 *        - texts[0] parses as URL → POST /api/capture/url
 *        - files[0].type === application/pdf → POST /api/capture/pdf
 *        - otherwise → POST /api/capture/note {title, body: texts.join}
 *   5. On success: router.push(`/items/${id}`) for URL/note; stay put
 *      after PDF upload since multipart is exercised at T-13.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isDuplicateShare, shareDedupKey } from "@/lib/capture/dedup";
import { probeReachability, describeVerdict } from "@/lib/client/reachability";
import { BRAIN_TUNNEL_URL } from "@/lib/config/tunnel";

interface SharePayload {
  title?: string;
  texts?: string[];
  files?: Array<{ uri?: string; mimeType?: string; name?: string }>;
}

// Plugin handle surfaced on window inside a Capacitor WebView. The type is
// loose because we guard every access with a capability check.
interface CapacitorGlobal {
  isNativePlatform: () => boolean;
}

declare global {
  interface Window {
    Capacitor?: CapacitorGlobal;
  }
}

async function getBearerToken(): Promise<string | null> {
  try {
    const { Preferences } = await import("@capacitor/preferences");
    const { value } = await Preferences.get({ key: "brain_token" });
    return value ?? null;
  } catch {
    return null;
  }
}

function looksLikeUrl(s: string): boolean {
  try {
    const u = new URL(s.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function hashPayload(p: SharePayload): string {
  const text = (p.texts ?? []).join("\n");
  const files = (p.files ?? []).map((f) => `${f.name}:${f.uri}`).join("|");
  return `${p.title ?? ""}::${text}::${files}`;
}

async function postJson(
  url: string,
  token: string,
  body: unknown,
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // Non-JSON response (e.g., HTML 500 page) — leave data null.
  }
  return { ok: res.ok, status: res.status, data };
}

export function ShareHandler() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.Capacitor?.isNativePlatform?.()) return;

    let unmounted = false;
    let removeListener: (() => void) | null = null;

    (async () => {
      let plugin;
      try {
        const mod = await import("@capgo/capacitor-share-target");
        plugin = mod.CapacitorShareTarget;
      } catch {
        return;
      }

      const handle = await plugin.addListener(
        "shareReceived",
        async (payload: SharePayload) => {
          if (unmounted) return;

          // 1. Client-side dedup (F-041 2s window).
          if (isDuplicateShare(shareDedupKey("url", hashPayload(payload)))) {
            await reportClientError("share.intent.duplicate", "cold-start double-fire suppressed");
            return;
          }

          // 2. Token gate (D-v0.5.0-5 / REVIEW P0-2).
          const token = await getBearerToken();
          if (!token) {
            alert(
              "Brain is not paired yet. Open Settings → LAN Info on your Mac and scan the QR.",
            );
            router.push("/setup-apk");
            return;
          }

          const base = BRAIN_TUNNEL_URL;

          // 2b. Reachability probe (T-14 / F-020 / SC-11). A Mac-asleep
          // case would otherwise surface as a generic fetch error deep
          // inside captureUrl/capturePdf; probing first lets us route to
          // /offline.html where the user gets a retry + re-scan-QR UX.
          const verdict = await probeReachability({
            baseUrl: base,
            bearerToken: token,
            timeoutMs: 2000,
          });
          if (!verdict.ok) {
            await reportClientError(
              "share.reachability.fail",
              `${verdict.reason}: ${describeVerdict(verdict)}`,
            ).catch(() => undefined);
            // router.push keeps the WebView inside Next.js; offline.html
            // is served directly by Next.js's static handler from /public.
            router.push("/offline.html");
            return;
          }

          // 3. Route by content type.
          const firstText = payload.texts?.[0]?.trim() ?? "";
          const firstFile = payload.files?.[0];

          if (firstText && looksLikeUrl(firstText)) {
            await captureUrl(base, token, firstText, payload.title, router);
            return;
          }

          if (firstFile && firstFile.mimeType === "application/pdf") {
            await capturePdf(base, token, firstFile, router);
            return;
          }

          // 4. Fallback: capture as note.
          const body = (payload.texts ?? []).join("\n").trim();
          if (!body) {
            alert("Share ignored — no text or supported file found.");
            return;
          }
          await captureNote(base, token, payload.title ?? "Shared note", body, router);
        },
      );

      if (!unmounted) {
        removeListener = () => {
          handle.remove().catch(() => undefined);
        };
      } else {
        handle.remove().catch(() => undefined);
      }
    })().catch(() => {
      // Plugin unavailable / API shape mismatch; fall back to no-op.
    });

    return () => {
      unmounted = true;
      removeListener?.();
    };
  }, [router]);

  return null;
}

async function captureUrl(
  base: string,
  token: string,
  url: string,
  title: string | undefined,
  router: ReturnType<typeof useRouter>,
): Promise<void> {
  const res = await postJson(`${base}/api/capture/url`, token, {
    url,
    title,
  });
  if (res.ok) {
    const data = res.data as { id?: string; duplicate?: boolean; itemId?: string | null };
    const id = data.duplicate && data.itemId ? data.itemId : data.id;
    if (id) router.push(`/items/${id}`);
    return;
  }
  await reportClientError(
    "share.http.capture-failed",
    `POST /api/capture/url ${res.status}`,
  );
  alert(`Capture failed (HTTP ${res.status}). Check the Brain error log.`);
}

async function capturePdf(
  base: string,
  token: string,
  shared: { uri?: string; name?: string; mimeType?: string },
  router: ReturnType<typeof useRouter>,
): Promise<void> {
  const { uri, name } = shared;
  if (!uri) {
    alert("PDF share missing file URI — cannot upload.");
    return;
  }

  // On Android, `uri` is a `content://` path. With
  // capacitor.config.ts → plugins.CapacitorHttp.enabled=true (T-9), the
  // patched `window.fetch` resolves content-URIs via ContentResolver
  // internally and surfaces the bytes as a Blob. This avoids loading
  // the full PDF into the WebView JS heap as a base64 string, which
  // was the v0.5.0 F-039 goal.
  let blob: Blob;
  try {
    const fetched = await fetch(uri);
    if (!fetched.ok) throw new Error(`HTTP ${fetched.status}`);
    blob = await fetched.blob();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    await reportClientError("share.pdf.read-failed", `fetch(${uri}) ${msg}`);
    alert(`Could not read PDF (${msg}).`);
    return;
  }

  // SHA256 round-trip (F-039 gap G-2 acceptance). Compute client-side
  // and hand the digest to the server via header so a mismatch on the
  // wire surfaces as 422 instead of a silently-truncated upload.
  const expected = await sha256Hex(blob);

  const form = new FormData();
  form.append("pdf", blob, name ?? "shared.pdf");

  let res: Response;
  try {
    res = await fetch(`${base}/api/capture/pdf`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "x-expected-sha256": expected,
      },
      body: form,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "network error";
    await reportClientError("share.pdf.upload-failed", `POST /api/capture/pdf ${msg}`);
    alert(`PDF upload failed: ${msg}`);
    return;
  }

  if (res.ok) {
    const data = (await res.json().catch(() => ({}))) as { id?: string };
    if (data.id) router.push(`/items/${data.id}`);
    return;
  }

  if (res.status === 422) {
    const data = (await res.json().catch(() => ({}))) as {
      expected?: string;
      actual?: string;
    };
    await reportClientError(
      "share.pdf.sha256-mismatch",
      `expected=${data.expected ?? "?"} actual=${data.actual ?? "?"}`,
    );
    alert("PDF upload corrupted in transit (SHA256 mismatch). Please retry.");
    return;
  }

  await reportClientError(
    "share.http.capture-failed",
    `POST /api/capture/pdf ${res.status}`,
  );
  alert(`PDF upload failed (HTTP ${res.status}).`);
}

async function sha256Hex(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function captureNote(
  base: string,
  token: string,
  title: string,
  body: string,
  router: ReturnType<typeof useRouter>,
): Promise<void> {
  const res = await postJson(`${base}/api/capture/note`, token, { title, body });
  if (res.ok) {
    const data = res.data as { id?: string };
    if (data.id) router.push(`/items/${data.id}`);
    return;
  }
  await reportClientError(
    "share.http.capture-failed",
    `POST /api/capture/note ${res.status}`,
  );
  alert(`Note capture failed (HTTP ${res.status}).`);
}

async function reportClientError(namespace: string, message: string): Promise<void> {
  try {
    const token = await getBearerToken();
    if (!token) return;
    await fetch(`${BRAIN_TUNNEL_URL}/api/errors/client`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ namespace, message }),
    });
  } catch {
    // Swallow — logging must never mask the underlying user-facing error.
  }
}
