"use client";

import { useCallback, useState } from "react";
import { BRAIN_TUNNEL_URL } from "@/lib/config/tunnel";

interface ProbeResult {
  timestamp: string;
  userAgent: string;
  isCapacitor: boolean;
  storage: {
    estimate: { usage: number | null; quota: number | null; usageDetails: unknown };
    persistGranted: boolean | null;
    persistError: string | null;
  };
  serviceWorker: {
    available: boolean;
    controller: boolean;
  };
  webWorker: {
    available: boolean;
  };
  decisions: {
    quotaTier: "generous" | "moderate" | "conservative" | "unknown";
    pdfMvpScope: "in" | "out-defer-to-v0.7.x";
    workboxCandidate: "yes" | "no-no-service-worker";
    sha256Strategy: "web-worker" | "fallback-name-size";
    persistFallback: "ok" | "warn-user-on-init";
  };
}

type ProbeState =
  | { kind: "idle" }
  | { kind: "running" }
  | { kind: "done"; result: ProbeResult; reportStatus: "pending" | "ok" | "error"; reportError: string | null }
  | { kind: "error"; message: string };

async function getBearerToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  if (!window.Capacitor?.isNativePlatform?.()) return null;
  try {
    const { Preferences } = await import("@capacitor/preferences");
    const { value } = await Preferences.get({ key: "brain_token" });
    return value ?? null;
  } catch {
    return null;
  }
}

async function probeStorage(): Promise<ProbeResult["storage"]> {
  const out: ProbeResult["storage"] = {
    estimate: { usage: null, quota: null, usageDetails: null },
    persistGranted: null,
    persistError: null,
  };

  if (typeof navigator === "undefined" || !navigator.storage) {
    return out;
  }

  try {
    const est = await navigator.storage.estimate();
    out.estimate.usage = typeof est.usage === "number" ? est.usage : null;
    out.estimate.quota = typeof est.quota === "number" ? est.quota : null;
    const detailed = est as StorageEstimate & { usageDetails?: unknown };
    out.estimate.usageDetails = detailed.usageDetails ?? null;
  } catch (err) {
    out.estimate.usage = null;
    out.estimate.quota = null;
    out.estimate.usageDetails = err instanceof Error ? err.message : String(err);
  }

  if (typeof navigator.storage.persist === "function") {
    try {
      out.persistGranted = await navigator.storage.persist();
    } catch (err) {
      out.persistError = err instanceof Error ? err.message : String(err);
    }
  } else {
    out.persistError = "persist-not-available";
  }

  return out;
}

function deriveDecisions(
  storage: ProbeResult["storage"],
  serviceWorker: ProbeResult["serviceWorker"],
  webWorker: ProbeResult["webWorker"],
): ProbeResult["decisions"] {
  const quota = storage.estimate.quota;
  let quotaTier: ProbeResult["decisions"]["quotaTier"];
  let pdfMvpScope: ProbeResult["decisions"]["pdfMvpScope"];
  if (quota === null) {
    quotaTier = "unknown";
    pdfMvpScope = "out-defer-to-v0.7.x";
  } else if (quota >= 500 * 1024 * 1024) {
    quotaTier = "generous";
    pdfMvpScope = "in";
  } else if (quota >= 100 * 1024 * 1024) {
    quotaTier = "moderate";
    pdfMvpScope = "in";
  } else {
    quotaTier = "conservative";
    pdfMvpScope = "out-defer-to-v0.7.x";
  }

  return {
    quotaTier,
    pdfMvpScope,
    workboxCandidate: serviceWorker.available ? "yes" : "no-no-service-worker",
    sha256Strategy: webWorker.available ? "web-worker" : "fallback-name-size",
    persistFallback: storage.persistGranted === true ? "ok" : "warn-user-on-init",
  };
}

async function runProbe(): Promise<ProbeResult> {
  const isCapacitor = !!(typeof window !== "undefined" && window.Capacitor?.isNativePlatform?.());
  const storage = await probeStorage();
  const serviceWorker: ProbeResult["serviceWorker"] = {
    available: typeof navigator !== "undefined" && "serviceWorker" in navigator,
    controller:
      typeof navigator !== "undefined" &&
      "serviceWorker" in navigator &&
      navigator.serviceWorker.controller !== null,
  };
  const webWorker: ProbeResult["webWorker"] = {
    available: typeof Worker !== "undefined",
  };
  return {
    timestamp: new Date().toISOString(),
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "(unknown)",
    isCapacitor,
    storage,
    serviceWorker,
    webWorker,
    decisions: deriveDecisions(storage, serviceWorker, webWorker),
  };
}

async function reportToServer(result: ProbeResult): Promise<void> {
  const token = await getBearerToken();
  if (!token) {
    throw new Error("no-bearer-token");
  }
  const res = await fetch(`${BRAIN_TUNNEL_URL}/api/errors/client`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      namespace: "share.quota-probe",
      message: `quota=${result.storage.estimate.quota ?? "null"} sw=${result.serviceWorker.available} ww=${result.webWorker.available} persist=${result.storage.persistGranted ?? "null"}`,
      context: result as unknown as Record<string, unknown>,
    }),
  });
  if (!res.ok) {
    throw new Error(`http-${res.status}`);
  }
}

function formatBytes(n: number | null): string {
  if (n === null) return "null";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default function QuotaProbeClient() {
  const [state, setState] = useState<ProbeState>({ kind: "idle" });

  const start = useCallback(async () => {
    setState({ kind: "running" });
    try {
      const result = await runProbe();
      setState({ kind: "done", result, reportStatus: "pending", reportError: null });
      try {
        await reportToServer(result);
        setState((prev) => (prev.kind === "done" ? { ...prev, reportStatus: "ok" } : prev));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setState((prev) => (prev.kind === "done" ? { ...prev, reportStatus: "error", reportError: msg } : prev));
      }
    } catch (err) {
      setState({
        kind: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }, []);

  return (
    <div className="mx-auto max-w-[720px] px-6 py-10">
      <h1 className="mb-2 text-[24px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">
        WebView quota probe
      </h1>
      <p className="mb-6 text-sm text-[var(--text-secondary)]">
        OFFLINE-PRE measurement (offline-mode plan v3 §8.1). Run once on each
        target device. Result is also POSTed to /api/errors/client.
      </p>

      {state.kind === "idle" && (
        <button
          type="button"
          onClick={() => void start()}
          className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm text-[var(--text-primary)] hover:border-[var(--border-strong)]"
        >
          Run probe
        </button>
      )}

      {state.kind === "running" && (
        <p className="text-sm text-[var(--text-secondary)]">Probing…</p>
      )}

      {state.kind === "error" && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--text-primary)]">
          <p className="font-medium">Probe failed</p>
          <p className="mt-1 text-[var(--text-secondary)]">{state.message}</p>
          <button
            type="button"
            onClick={() => void start()}
            className="mt-3 rounded-md border border-[var(--border)] px-3 py-1 text-sm hover:border-[var(--border-strong)]"
          >
            Retry
          </button>
        </div>
      )}

      {state.kind === "done" && (
        <ProbeReport
          result={state.result}
          reportStatus={state.reportStatus}
          reportError={state.reportError}
          onRerun={() => void start()}
        />
      )}
    </div>
  );
}

function ProbeReport({
  result,
  reportStatus,
  reportError,
  onRerun,
}: {
  result: ProbeResult;
  reportStatus: "pending" | "ok" | "error";
  reportError: string | null;
  onRerun: () => void;
}) {
  const json = JSON.stringify(result, null, 2);
  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-[var(--text-secondary)]">
          Summary
        </h2>
        <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-1.5 text-sm">
          <dt className="text-[var(--text-secondary)]">Capacitor APK</dt>
          <dd className="text-[var(--text-primary)]">{result.isCapacitor ? "yes" : "no (browser)"}</dd>

          <dt className="text-[var(--text-secondary)]">Quota</dt>
          <dd className="text-[var(--text-primary)]">{formatBytes(result.storage.estimate.quota)}</dd>

          <dt className="text-[var(--text-secondary)]">Usage</dt>
          <dd className="text-[var(--text-primary)]">{formatBytes(result.storage.estimate.usage)}</dd>

          <dt className="text-[var(--text-secondary)]">storage.persist()</dt>
          <dd className="text-[var(--text-primary)]">
            {result.storage.persistGranted === null
              ? `unavailable${result.storage.persistError ? ` (${result.storage.persistError})` : ""}`
              : result.storage.persistGranted
                ? "granted"
                : "denied"}
          </dd>

          <dt className="text-[var(--text-secondary)]">Service Worker API</dt>
          <dd className="text-[var(--text-primary)]">
            {result.serviceWorker.available ? "available" : "absent"}
          </dd>

          <dt className="text-[var(--text-secondary)]">Web Worker API</dt>
          <dd className="text-[var(--text-primary)]">
            {result.webWorker.available ? "available" : "absent"}
          </dd>
        </dl>
      </section>

      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-[var(--text-secondary)]">
          Decisions derived
        </h2>
        <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-1.5 text-sm">
          <dt className="text-[var(--text-secondary)]">Quota tier</dt>
          <dd className="text-[var(--text-primary)]">{result.decisions.quotaTier}</dd>
          <dt className="text-[var(--text-secondary)]">PDF in MVP</dt>
          <dd className="text-[var(--text-primary)]">{result.decisions.pdfMvpScope}</dd>
          <dt className="text-[var(--text-secondary)]">Workbox candidate</dt>
          <dd className="text-[var(--text-primary)]">{result.decisions.workboxCandidate}</dd>
          <dt className="text-[var(--text-secondary)]">SHA256 strategy</dt>
          <dd className="text-[var(--text-primary)]">{result.decisions.sha256Strategy}</dd>
          <dt className="text-[var(--text-secondary)]">persist() fallback</dt>
          <dd className="text-[var(--text-primary)]">{result.decisions.persistFallback}</dd>
        </dl>
      </section>

      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-[var(--text-secondary)]">
          Server log POST
        </h2>
        <p className="text-sm text-[var(--text-primary)]">
          {reportStatus === "pending" && "POST in flight…"}
          {reportStatus === "ok" && "Logged to /api/errors/client (namespace share.quota-probe)."}
          {reportStatus === "error" && (
            <>
              Failed: <code className="text-[var(--text-secondary)]">{reportError}</code>
              {reportError === "no-bearer-token" && (
                <span className="block text-[var(--text-secondary)] mt-1">
                  This is expected outside the APK. The on-screen JSON below is the source of truth.
                </span>
              )}
            </>
          )}
        </p>
      </section>

      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-[var(--text-secondary)]">
          Raw JSON
        </h2>
        <pre className="overflow-auto rounded-md bg-[var(--surface-muted,#0a0a0a)] p-3 text-xs text-[var(--text-primary)]">
          {json}
        </pre>
      </section>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onRerun}
          className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm hover:border-[var(--border-strong)]"
        >
          Re-run probe
        </button>
      </div>
    </div>
  );
}
