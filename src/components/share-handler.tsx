"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isDuplicateShare, shareDedupKey } from "@/lib/capture/dedup";
import {
  isCaptureResultPayload,
  type CaptureResultPayload,
} from "@/lib/capture/result";
import { BRAIN_TUNNEL_URL } from "@/lib/config/tunnel";

interface SharePayload {
  title?: string;
  texts?: string[];
  files?: Array<{ uri?: string; mimeType?: string; name?: string }>;
}

interface CapacitorGlobal {
  isNativePlatform: () => boolean;
}

interface LegacyCaptureResponse {
  id?: string;
  duplicate?: boolean;
  itemId?: string | null;
  capture_result?: unknown;
}

interface ParsedCaptureResponse {
  itemId: string | null;
  result: CaptureResultPayload | null;
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

function parseCaptureResponse(data: unknown): ParsedCaptureResponse {
  if (!data || typeof data !== "object") return { itemId: null, result: null };
  const legacy = data as LegacyCaptureResponse;
  const result = isCaptureResultPayload(legacy.capture_result)
    ? legacy.capture_result
    : null;
  const itemId =
    result?.itemId ??
    result?.existingItemId ??
    (legacy.duplicate && legacy.itemId ? legacy.itemId : legacy.id) ??
    null;
  return { itemId, result };
}

function pushCaptureResult(
  router: ReturnType<typeof useRouter>,
  parsed: ParsedCaptureResponse,
): void {
  if (!parsed.itemId) return;
  const state = parsed.result?.state;
  router.push(state ? `/items/${parsed.itemId}?capture_state=${state}` : `/items/${parsed.itemId}`);
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

          if (isDuplicateShare(shareDedupKey("url", hashPayload(payload)))) {
            await reportClientError("share.intent.duplicate", "cold-start double-fire suppressed");
            return;
          }

          const liveToken = await getBearerToken();
          if (!liveToken) {
            alert(
              "AI Memory is not paired yet. Open Device pairing in the web app and enter the Android code.",
            );
            router.push("/setup-apk");
            return;
          }

          const firstText = payload.texts?.[0]?.trim() ?? "";
          const firstFile = payload.files?.[0];

          if (firstFile && firstFile.mimeType === "application/pdf") {
            await capturePdf(BRAIN_TUNNEL_URL, liveToken, firstFile, router);
            return;
          }

          if (firstText && looksLikeUrl(firstText)) {
            await captureUrl(BRAIN_TUNNEL_URL, liveToken, firstText, payload.title, router);
            return;
          }

          const body = (payload.texts ?? []).join("\n").trim();
          if (!body) {
            alert("Share ignored. No text or supported file was found.");
            return;
          }
          await captureNote(
            BRAIN_TUNNEL_URL,
            liveToken,
            payload.title ?? "Shared note",
            body,
            router,
          );
        },
      );

      if (!unmounted) {
        removeListener = () => {
          handle.remove().catch(() => undefined);
        };
      } else {
        handle.remove().catch(() => undefined);
      }
    })().catch(() => undefined);

    return () => {
      unmounted = true;
      removeListener?.();
    };
  }, [router]);

  return null;
}

async function readSharedPdfAsBlob(uri: string): Promise<Blob> {
  if (/^https?:\/\//i.test(uri)) {
    const fetched = await fetch(uri);
    if (!fetched.ok) throw new Error(`HTTP ${fetched.status}`);
    return fetched.blob();
  }
  const { Filesystem } = await import("@capacitor/filesystem");
  const result = await Filesystem.readFile({ path: uri });
  const data = typeof result.data === "string" ? result.data : "";
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: "application/pdf" });
}

async function postJson(
  url: string,
  token: string,
  body: unknown,
): Promise<{ ok: boolean; status: number; data: unknown }> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "network error";
    return { ok: false, status: 0, data: { message: msg } };
  }

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { ok: res.ok, status: res.status, data };
}

async function captureUrl(
  base: string,
  token: string,
  url: string,
  title: string | undefined,
  router: ReturnType<typeof useRouter>,
): Promise<void> {
  const res = await postJson(`${base}/api/capture/url`, token, { url, title });
  if (res.ok) {
    pushCaptureResult(router, parseCaptureResponse(res.data));
    return;
  }
  await reportClientError("share.http.capture-failed", `POST /api/capture/url ${res.status}`);
  alert("Could not save to cloud. Try again when online.");
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
    pushCaptureResult(router, parseCaptureResponse(res.data));
    return;
  }
  await reportClientError("share.http.capture-failed", `POST /api/capture/note ${res.status}`);
  alert("Could not save to cloud. Try again when online.");
}

async function capturePdf(
  base: string,
  token: string,
  shared: { uri?: string; name?: string; mimeType?: string },
  router: ReturnType<typeof useRouter>,
): Promise<void> {
  const { uri, name } = shared;
  if (!uri) {
    alert("PDF share missing file URI. Cannot upload.");
    return;
  }

  let blob: Blob;
  try {
    blob = await readSharedPdfAsBlob(uri);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    await reportClientError("share.pdf.read-failed", `read(${uri}) ${msg}`);
    alert("Could not save to cloud. Try again when online.");
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
    alert("Could not save to cloud. Try again when online.");
    return;
  }

  if (res.ok) {
    const data = await res.json().catch(() => ({}));
    pushCaptureResult(router, parseCaptureResponse(data));
    return;
  }

  if (res.status === 422) {
    const data = (await res.json().catch(() => ({}))) as { expected?: string; actual?: string };
    await reportClientError(
      "share.pdf.sha256-mismatch",
      `expected=${data.expected ?? "?"} actual=${data.actual ?? "?"}`,
    );
    alert("PDF upload corrupted in transit. Please retry.");
    return;
  }

  await reportClientError("share.http.capture-failed", `POST /api/capture/pdf ${res.status}`);
  alert("Could not save to cloud. Try again when online.");
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
    // Logging must never mask the user-facing share result.
  }
}
