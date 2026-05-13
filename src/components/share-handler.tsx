"use client";

/**
 * Android share-intent handler — v0.5.0 + v0.6.x offline mode (OFFLINE-4).
 *
 * Mounts in app/layout.tsx. Registers a `shareReceived` listener on the
 * @capgo/capacitor-share-target plugin when running inside a Capacitor
 * WebView; no-op on plain browsers.
 *
 * v0.6.x change (plan v3 §4.2 / OFFLINE-4): URL and note shares no longer
 * post directly to the server. Instead they:
 *   1. Build an OutboxEntry (status='queued')
 *   2. Run the outbox-tier dedup (10-min content_hash window)
 *   3. putEntry() into the IDB outbox
 *   4. Trigger an immediate sync — the foreground attempt either flips
 *      the row to 'synced' (online + server up) or leaves it 'queued'
 *      (network error / 5xx); subsequent retries fire from triggers.ts
 *      on app foreground / network-change / 30s tick.
 *
 * The user sees a synchronous "Saved offline" or "Saved" toast in either
 * case — the share never fails visibly. This is the user-facing outcome
 * of the entire v0.6.x offline-mode plan.
 *
 * PDF shares still use the direct multipart POST path with the existing
 * SHA256 round-trip + reachability probe; outbox PDF support lands in
 * OFFLINE-9 (filesystem-blob path + cleanup).
 *
 * Outbox-init / share-event ordering (plan §5.10 / v3 B-5 fix): the
 * shareReceived listener is attached only after initOutbox() resolves,
 * so a cold-start share lands at a ready outbox. Triggers are also
 * installed inside this gate.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isDuplicateShare, shareDedupKey } from "@/lib/capture/dedup";
import { probeReachability, describeVerdict } from "@/lib/client/reachability";
import { BRAIN_TUNNEL_URL } from "@/lib/config/tunnel";
import { computeContentHash } from "@/lib/outbox/dedup";
import { findByContentHash, initOutbox, putEntry, QuotaWarning, type OutboxDb } from "@/lib/outbox/storage";
import { installTriggers, type TriggerInstall } from "@/lib/outbox/triggers";
import { ensurePermissionRequested } from "@/lib/outbox/notifications";
import { buildTransport } from "@/lib/outbox/transport";
import { syncOnce } from "@/lib/outbox/sync-worker";
import type { OutboxEntry } from "@/lib/outbox/types";

interface SharePayload {
  title?: string;
  texts?: string[];
  files?: Array<{ uri?: string; mimeType?: string; name?: string }>;
}

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

function uuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID.
  return `id-${Date.now()}-${Math.floor(Math.random() * 1e9).toString(36)}`;
}

export function ShareHandler() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.Capacitor?.isNativePlatform?.()) return;

    let unmounted = false;
    let removeListener: (() => void) | null = null;
    let removeNotificationListener: (() => void) | null = null;
    let triggerHandle: TriggerInstall | null = null;
    let outboxDb: OutboxDb | null = null;

    (async () => {
      // 0. Outbox init — runs BEFORE the shareReceived listener registers
      //    so any cold-start share event lands at a ready outbox (plan §5.10).
      try {
        const init = await initOutbox();
        outboxDb = init.db;
        if (init.persistGranted === false) {
          await reportClientError(
            "share.outbox.persist-denied",
            "navigator.storage.persist() returned false",
          );
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await reportClientError("share.outbox.init-failed", msg);
        // Without an outbox we can't queue — fall through to direct-POST.
      }

      // 1. Install retry triggers (network-change / foreground / 30s tick).
      //    Bearer token may not be set yet — installTriggers tolerates this
      //    by no-op'ing the transport call if token is missing at run time.
      const token = await getBearerToken();
      if (outboxDb && token) {
        const transport = buildTransport(BRAIN_TUNNEL_URL, token);
        triggerHandle = await installTriggers(outboxDb, transport);
      }

      // 1b. Notification-tap routing (OFFLINE-8 / plan §5.6). When the user
      //     taps a stuck-state notification we route them to /inbox.
      try {
        const notif = await import("@capacitor/local-notifications");
        const tapHandle = await notif.LocalNotifications.addListener(
          "localNotificationActionPerformed",
          (action) => {
            const route =
              (action.notification?.extra as { route?: string } | undefined)?.route;
            if (typeof route === "string" && route.startsWith("/")) {
              router.push(route);
            }
          },
        );
        removeNotificationListener = () => {
          tapHandle.remove().catch(() => undefined);
        };
      } catch {
        // Plugin unavailable — notifications won't fire either.
      }

      // 2. Listener registration (gated on init completion above).
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

          // 2-second in-memory dedup (existing F-041 behavior; unchanged).
          if (isDuplicateShare(shareDedupKey("url", hashPayload(payload)))) {
            await reportClientError("share.intent.duplicate", "cold-start double-fire suppressed");
            return;
          }

          // Token gate — re-check at intent time in case the user is mid-pair.
          const liveToken = await getBearerToken();
          if (!liveToken) {
            alert(
              "Brain is not paired yet. Open Settings → LAN Info on your Mac and scan the QR.",
            );
            router.push("/setup-apk");
            return;
          }

          // Route by content type.
          const firstText = payload.texts?.[0]?.trim() ?? "";
          const firstFile = payload.files?.[0];

          // PDF: still uses the direct-POST path until OFFLINE-9.
          if (firstFile && firstFile.mimeType === "application/pdf") {
            const verdict = await probeReachability({
              baseUrl: BRAIN_TUNNEL_URL,
              bearerToken: liveToken,
              timeoutMs: 2000,
            });
            if (!verdict.ok) {
              await reportClientError(
                "share.reachability.fail",
                `${verdict.reason}: ${describeVerdict(verdict)}`,
              ).catch(() => undefined);
              router.push("/offline.html");
              return;
            }
            await capturePdf(BRAIN_TUNNEL_URL, liveToken, firstFile, router);
            return;
          }

          // URL or note → outbox path.
          if (!outboxDb) {
            // Outbox init failed earlier — fallback to direct POST so the
            // share isn't lost. This is the degraded path; logs flagged it.
            if (firstText && looksLikeUrl(firstText)) {
              await captureUrlDirect(BRAIN_TUNNEL_URL, liveToken, firstText, payload.title, router);
              return;
            }
            const body = (payload.texts ?? []).join("\n").trim();
            if (!body) {
              alert("Share ignored — no text or supported file found.");
              return;
            }
            await captureNoteDirect(
              BRAIN_TUNNEL_URL,
              liveToken,
              payload.title ?? "Shared note",
              body,
              router,
            );
            return;
          }

          if (firstText && looksLikeUrl(firstText)) {
            await enqueueUrl(outboxDb, firstText, payload.title, liveToken, router);
            return;
          }

          const body = (payload.texts ?? []).join("\n").trim();
          if (!body) {
            alert("Share ignored — no text or supported file found.");
            return;
          }
          await enqueueNote(outboxDb, payload.title ?? "Shared note", body, liveToken, router);
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
      removeNotificationListener?.();
      triggerHandle?.uninstall();
      if (outboxDb) {
        outboxDb.close();
        outboxDb = null;
      }
    };
  }, [router]);

  return null;
}

/* ---------------------------------------------------------------------- */
/*  Outbox enqueue paths (URL + note). PDF is below in capturePdf().      */
/* ---------------------------------------------------------------------- */

async function enqueueUrl(
  db: OutboxDb,
  url: string,
  title: string | undefined,
  token: string,
  router: ReturnType<typeof useRouter>,
): Promise<void> {
  const contentHash = await computeContentHash({ kind: "url", url });
  // 10-min outbox dedup tier (plan §5.2 step 2).
  const existing = await findByContentHash(db, contentHash);
  if (existing) {
    if (existing.status === "synced" && existing.server_id) {
      router.push(`/items/${existing.server_id}`);
    } else {
      // Already queued. No-op + lightweight feedback.
      // (No alert — silent dedup matches plan §5.2 "silently no-op".)
    }
    return;
  }

  const entry: OutboxEntry = {
    id: uuid(),
    kind: "url",
    payload: { url, title },
    status: "queued",
    attempts: 0,
    created_at: Date.now(),
    content_hash: contentHash,
  };

  try {
    await putEntry(db, entry);
  } catch (err) {
    if (err instanceof QuotaWarning) {
      alert("Storage almost full — sync existing items before saving more.");
      return;
    }
    await reportClientError(
      "share.outbox.put-failed",
      err instanceof Error ? err.message : String(err),
    );
    alert("Couldn't save offline. Try again.");
    return;
  }

  // First-successful-enqueue is when we ask for the notification
  // permission (plan §5.6 / OFFLINE-8 / Q2). Idempotent.
  void ensurePermissionRequested();

  // Try the immediate POST. On success → row flips to synced; on failure
  // it stays queued for triggers.ts to retry.
  const transport = buildTransport(BRAIN_TUNNEL_URL, token);
  await syncOnce(db, transport).catch(() => undefined);

  const after = await db.get("outbox", entry.id);
  if (after?.status === "synced" && after.server_id) {
    router.push(`/items/${after.server_id}`);
  }
  // Otherwise the share is queued; user remains in Brain (plan §3.1 — no
  // toast yet, copy lands in OFFLINE-10).
}

async function enqueueNote(
  db: OutboxDb,
  title: string,
  body: string,
  token: string,
  router: ReturnType<typeof useRouter>,
): Promise<void> {
  const contentHash = await computeContentHash({ kind: "note", title, body });
  const existing = await findByContentHash(db, contentHash);
  if (existing) {
    if (existing.status === "synced" && existing.server_id) {
      router.push(`/items/${existing.server_id}`);
    }
    return;
  }

  const entry: OutboxEntry = {
    id: uuid(),
    kind: "note",
    payload: { title, body },
    status: "queued",
    attempts: 0,
    created_at: Date.now(),
    content_hash: contentHash,
  };

  try {
    await putEntry(db, entry);
  } catch (err) {
    if (err instanceof QuotaWarning) {
      alert("Storage almost full — sync existing items before saving more.");
      return;
    }
    await reportClientError(
      "share.outbox.put-failed",
      err instanceof Error ? err.message : String(err),
    );
    alert("Couldn't save offline. Try again.");
    return;
  }

  void ensurePermissionRequested();

  const transport = buildTransport(BRAIN_TUNNEL_URL, token);
  await syncOnce(db, transport).catch(() => undefined);

  const after = await db.get("outbox", entry.id);
  if (after?.status === "synced" && after.server_id) {
    router.push(`/items/${after.server_id}`);
  }
}

/* ---------------------------------------------------------------------- */
/*  Direct-POST fallbacks (used when outbox init failed) + PDF path.      */
/* ---------------------------------------------------------------------- */

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
    // Non-JSON response — leave data null.
  }
  return { ok: res.ok, status: res.status, data };
}

async function captureUrlDirect(
  base: string,
  token: string,
  url: string,
  title: string | undefined,
  router: ReturnType<typeof useRouter>,
): Promise<void> {
  const res = await postJson(`${base}/api/capture/url`, token, { url, title });
  if (res.ok) {
    const data = res.data as { id?: string; duplicate?: boolean; itemId?: string | null };
    const id = data.duplicate && data.itemId ? data.itemId : data.id;
    if (id) router.push(`/items/${id}`);
    return;
  }
  await reportClientError("share.http.capture-failed", `POST /api/capture/url ${res.status}`);
  alert(`Capture failed (HTTP ${res.status}). Check the Brain error log.`);
}

async function captureNoteDirect(
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
  await reportClientError("share.http.capture-failed", `POST /api/capture/note ${res.status}`);
  alert(`Note capture failed (HTTP ${res.status}).`);
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

  // Read the shared PDF. The plugin hands us either a `content://` URI or
  // a bare filesystem path under the app cache (e.g.
  // `/data/user/0/com.arunprakash.brain/cache/shared_files/foo.pdf`).
  // History: see commit e7695e6 — the @capacitor/filesystem read replaces
  // the v0.5.3 fetch(uri) path that 404'd after CapacitorHttp was disabled.
  let blob: Blob;
  try {
    if (/^https?:\/\//i.test(uri)) {
      const fetched = await fetch(uri);
      if (!fetched.ok) throw new Error(`HTTP ${fetched.status}`);
      blob = await fetched.blob();
    } else {
      const { Filesystem } = await import("@capacitor/filesystem");
      const result = await Filesystem.readFile({ path: uri });
      const data = typeof result.data === "string" ? result.data : "";
      const binary = atob(data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      blob = new Blob([bytes], { type: "application/pdf" });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    await reportClientError("share.pdf.read-failed", `read(${uri}) ${msg}`);
    alert(`Could not read PDF (${msg}).`);
    return;
  }

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
    const data = (await res.json().catch(() => ({}))) as { expected?: string; actual?: string };
    await reportClientError(
      "share.pdf.sha256-mismatch",
      `expected=${data.expected ?? "?"} actual=${data.actual ?? "?"}`,
    );
    alert("PDF upload corrupted in transit (SHA256 mismatch). Please retry.");
    return;
  }

  await reportClientError("share.http.capture-failed", `POST /api/capture/pdf ${res.status}`);
  alert(`PDF upload failed (HTTP ${res.status}).`);
}

async function sha256Hex(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
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
