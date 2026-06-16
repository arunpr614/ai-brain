"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isDuplicateShare, shareDedupKey } from "@/lib/capture/dedup";
import {
  classifyNativeSharePayload,
  mapCaptureFailureToShareResult,
  mapNonOkCaptureResponseToShareResult,
  mapCaptureResponseToShareResult,
  resultForPreflight,
  sanitizeShareLogMessage,
  storeShareResult,
  type NativeSharePayload,
} from "@/lib/android-share/result";
import { BRAIN_TUNNEL_URL } from "@/lib/config/tunnel";

type SharePayload = NativeSharePayload;

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

function hashPayload(p: SharePayload): string {
  const text = (p.texts ?? []).join("\n");
  const files = (p.files ?? []).map((f) => `${f.name}:${f.uri}`).join("|");
  return `${p.title ?? ""}::${text}::${files}`;
}

function pushShareResult(
  router: ReturnType<typeof useRouter>,
  payload: Parameters<typeof storeShareResult>[1],
): void {
  const key = storeShareResult(window.sessionStorage, payload);
  router.push(`/capture/share-result?key=${encodeURIComponent(key)}`);
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

          const classification = classifyNativeSharePayload(payload);
          const liveToken = await getBearerToken();
          const preflight = resultForPreflight(classification, Boolean(liveToken));
          if (preflight) {
            pushShareResult(router, preflight);
            return;
          }
          if (!liveToken) return;

          switch (classification.kind) {
            case "pdf":
              await capturePdf(BRAIN_TUNNEL_URL, liveToken, classification.file, router);
              return;
            case "url":
              await captureUrl(
                BRAIN_TUNNEL_URL,
                liveToken,
                classification.url,
                classification.title,
                router,
              );
              return;
            case "note":
              await captureNote(
                BRAIN_TUNNEL_URL,
                liveToken,
                classification.title,
                classification.body,
                router,
              );
              return;
            case "multi_pdf":
            case "unsupported":
              return;
          }
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
    pushShareResult(router, mapCaptureResponseToShareResult(res.data, "url"));
    return;
  }
  const typedFailure = mapNonOkCaptureResponseToShareResult(res.data, "url");
  if (typedFailure) {
    await reportClientError(
      "share.http.capture-failed",
      sanitizeShareLogMessage(typedFailure.errorCode ?? "url_capture_failed", res.status),
    );
    pushShareResult(router, typedFailure);
    return;
  }
  await reportClientError(
    "share.http.capture-failed",
    sanitizeShareLogMessage("url_capture_failed", res.status),
  );
  pushShareResult(router, mapCaptureFailureToShareResult("url"));
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
    pushShareResult(router, mapCaptureResponseToShareResult(res.data, "note"));
    return;
  }
  const typedFailure = mapNonOkCaptureResponseToShareResult(res.data, "note");
  if (typedFailure) {
    await reportClientError(
      "share.http.capture-failed",
      sanitizeShareLogMessage(typedFailure.errorCode ?? "note_capture_failed", res.status),
    );
    pushShareResult(router, typedFailure);
    return;
  }
  await reportClientError(
    "share.http.capture-failed",
    sanitizeShareLogMessage("note_capture_failed", res.status),
  );
  pushShareResult(router, mapCaptureFailureToShareResult("note"));
}

async function capturePdf(
  base: string,
  token: string,
  shared: { uri?: string; name?: string; mimeType?: string },
  router: ReturnType<typeof useRouter>,
): Promise<void> {
  const { uri, name } = shared;
  if (!uri) {
    pushShareResult(router, mapCaptureFailureToShareResult("pdf_missing_uri"));
    return;
  }

  let blob: Blob;
  try {
    blob = await readSharedPdfAsBlob(uri);
  } catch {
    await reportClientError(
      "share.pdf.read-failed",
      sanitizeShareLogMessage("pdf_read_failed"),
    );
    pushShareResult(router, mapCaptureFailureToShareResult("pdf_read"));
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
  } catch {
    await reportClientError(
      "share.pdf.upload-failed",
      sanitizeShareLogMessage("pdf_upload_failed"),
    );
    pushShareResult(router, mapCaptureFailureToShareResult("pdf_upload"));
    return;
  }

  if (res.ok) {
    const data = await res.json().catch(() => ({}));
    pushShareResult(router, mapCaptureResponseToShareResult(data, "pdf"));
    return;
  }

  if (res.status === 422) {
    await reportClientError(
      "share.pdf.sha256-mismatch",
      sanitizeShareLogMessage("pdf_checksum_failed"),
    );
    pushShareResult(router, mapCaptureFailureToShareResult("pdf_checksum"));
    return;
  }

  await reportClientError(
    "share.http.capture-failed",
    sanitizeShareLogMessage("pdf_upload_failed", res.status),
  );
  pushShareResult(router, mapCaptureFailureToShareResult("pdf_upload"));
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
