"use client";

/**
 * APK first-run setup page (v0.5.0 T-16 / F-037).
 *
 * Flow:
 *   1. Render QrScanner (camera + live decode via jsqr).
 *   2. On decode, validate via parseSetupUri — a non-brain:// or malformed
 *      QR surfaces an inline error and the scanner re-enables.
 *   3. On valid QR:
 *        a. Write {brain_token, brain_url} to @capacitor/preferences.
 *        b. Run D-v0.5.0-3 reachability decision tree: try brain.local
 *           first, fall back to the scanned IP, then show error.
 *        c. On green: navigate to `/`.
 *
 * This page is not exposed to the proxy's PUBLIC_PATHS — the user must
 * be unlocked (cookie) before pairing. The WebView's first-launch PIN
 * unlock happens via the standard /unlock route; /setup-apk is the next
 * step, not the first one.
 */

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { QrScanner, type QrScannerError } from "@/components/qr-scanner";
import { parseSetupUri } from "@/lib/lan/setup-uri";
import { probeReachability, describeVerdict } from "@/lib/client/reachability";

type Stage =
  | { kind: "scanning" }
  | { kind: "scan-error"; message: string }
  | { kind: "verifying"; message: string }
  | { kind: "verify-error"; message: string }
  | { kind: "paired"; base: string };

async function writePreferences(token: string, baseUrl: string): Promise<void> {
  const mod = await import("@capacitor/preferences");
  await mod.Preferences.set({ key: "brain_token", value: token });
  await mod.Preferences.set({ key: "brain_url", value: baseUrl });
}

/**
 * D-v0.5.0-3 reachability decision tree.
 *   1. Try http://brain.local:3000/api/health (mDNS path).
 *   2. Try http://<scanned-ip>:3000/api/health (DHCP fallback).
 *   3. Neither: return error with the more-specific verdict.
 * Returns the base URL that succeeded so the caller can persist it as
 * brain_url in Preferences.
 */
async function resolveBaseUrl(
  ip: string,
  token: string,
): Promise<{ ok: true; base: string } | { ok: false; reason: string }> {
  const mdnsBase = "http://brain.local:3000";
  const mdnsVerdict = await probeReachability({
    baseUrl: mdnsBase,
    bearerToken: token,
    timeoutMs: 2000,
  });
  if (mdnsVerdict.ok) return { ok: true, base: mdnsBase };

  const ipBase = `http://${ip}:3000`;
  const ipVerdict = await probeReachability({
    baseUrl: ipBase,
    bearerToken: token,
    timeoutMs: 2000,
  });
  if (ipVerdict.ok) return { ok: true, base: ipBase };

  // Prefer the IP-fallback diagnostic since it's the more-reliable path
  // in the common "Mac off Wi-Fi" scenario.
  return {
    ok: false,
    reason: `Tried ${mdnsBase} and ${ipBase}. ${describeVerdict(ipVerdict)}`,
  };
}

export default function SetupApkPage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>({ kind: "scanning" });

  const handleDecode = useCallback(
    async (text: string) => {
      const parsed = parseSetupUri(text);
      if (!parsed.ok) {
        setStage({ kind: "scan-error", message: parsed.reason });
        return;
      }

      setStage({ kind: "verifying", message: "Testing connection to Brain…" });
      try {
        const resolution = await resolveBaseUrl(parsed.ip, parsed.token);
        if (!resolution.ok) {
          setStage({ kind: "verify-error", message: resolution.reason });
          return;
        }
        await writePreferences(parsed.token, resolution.base);
        setStage({ kind: "paired", base: resolution.base });
        // Brief success flash, then route home.
        setTimeout(() => router.push("/"), 500);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setStage({ kind: "verify-error", message: `Storage failed: ${msg}` });
      }
    },
    [router],
  );

  const handleScannerError = useCallback((reason: QrScannerError, detail?: string) => {
    const map: Record<QrScannerError, string> = {
      "permission-denied": "Camera permission was denied. Enable it in Android settings, then retry.",
      "no-camera": "No camera available on this device.",
      "getusermedia-unavailable": "Camera API is not available in this context.",
      unknown: detail ?? "Camera failed to start.",
    };
    setStage({ kind: "scan-error", message: map[reason] });
  }, []);

  const retry = useCallback(() => {
    setStage({ kind: "scanning" });
  }, []);

  const isScanning = stage.kind === "scanning";

  return (
    <div className="space-y-4">
      <QrScanner
        onDecode={handleDecode}
        onError={handleScannerError}
        paused={!isScanning}
      />

      {stage.kind === "scan-error" && (
        <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-4 text-sm">
          <p className="font-medium text-[var(--text-primary)]">
            Scan failed
          </p>
          <p className="mt-1 text-[var(--text-muted)]">{stage.message}</p>
          <button
            type="button"
            onClick={retry}
            className="mt-3 rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-1.5 text-sm font-medium text-[var(--text-primary)] hover:border-[var(--border-strong)]"
          >
            Retry scan
          </button>
        </div>
      )}

      {stage.kind === "verifying" && (
        <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--text-secondary)]">
          {stage.message}
        </div>
      )}

      {stage.kind === "verify-error" && (
        <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-4 text-sm">
          <p className="font-medium text-[var(--text-primary)]">
            Could not reach Brain
          </p>
          <p className="mt-1 text-[var(--text-muted)]">{stage.message}</p>
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            Check that the Mac is awake, Brain is running, and both devices are on the same Wi-Fi.
          </p>
          <button
            type="button"
            onClick={retry}
            className="mt-3 rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-1.5 text-sm font-medium text-[var(--text-primary)] hover:border-[var(--border-strong)]"
          >
            Retry scan
          </button>
        </div>
      )}

      {stage.kind === "paired" && (
        <div className="rounded-md border border-[var(--accent-7)] bg-[var(--accent-3)] p-4 text-sm">
          <p className="font-medium text-[var(--accent-11)]">
            Paired — redirecting…
          </p>
          <p className="mt-1 text-xs text-[var(--accent-11)] opacity-80">
            Using {stage.base}
          </p>
        </div>
      )}
    </div>
  );
}
