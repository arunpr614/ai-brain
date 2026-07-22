"use client";

import * as Dialog from "@radix-ui/react-dialog";
import {
  AlertTriangle,
  BookOpen,
  Check,
  Clipboard,
  ExternalLink,
  Monitor,
  RefreshCw,
  ShieldCheck,
  Unplug,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export interface NotebookLmSettingsStatus {
  feature: {
    queueAccepting: boolean;
    providerWritesEnabled: boolean;
    experimental: boolean;
    runtimeWriteBlocked: boolean;
    runtimeBlockReason: string | null;
    protocolFailureStreak: number;
    retentionHealthy: boolean;
    retentionLastSuccessAt: string | null;
    retentionLastFailureAt: string | null;
    retentionFailureStreak: number;
    retentionErrorCode: string | null;
    physicalPurgePending: boolean;
    overdueSnapshots: number;
    unresolvedOver24h: number;
  };
  connection: {
    configured: boolean;
    targetLabel: string | null;
    sharingPosture: "unknown" | "private" | "shared" | "public" | null;
    healthStatus: "unknown" | "healthy" | "attention" | null;
    healthReason: string | null;
    safeSlots: number | null;
    connectorOnline: boolean;
    lastCheckedAt: string | null;
  };
}

export function NotebookLmConnectorSetup({ initialStatus }: { initialStatus: NotebookLmSettingsStatus }) {
  const [status, setStatus] = useState(initialStatus);
  const [pairing, setPairing] = useState<{ code: string; expiresAt: string } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const pairingCodeRegion = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/settings/notebooklm-export", { cache: "no-store" });
      if (!response.ok) throw new Error("status_unavailable");
      const next = (await response.json()) as NotebookLmSettingsStatus;
      setStatus(next);
      if (next.connection.configured) setPairing(null);
      setError(null);
    } catch {
      setError("Connector status is temporarily unavailable.");
    }
  }, []);

  useEffect(() => {
    if (!pairing || status.connection.configured) return;
    const poll = window.setInterval(() => void refresh(), 5_000);
    return () => window.clearInterval(poll);
  }, [pairing, refresh, status.connection.configured]);

  useEffect(() => {
    if (!pairing) return;
    const tick = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(tick);
  }, [pairing]);

  useEffect(() => {
    if (!pairing) return;
    const focusFrame = window.requestAnimationFrame(() => pairingCodeRegion.current?.focus());
    return () => window.cancelAnimationFrame(focusFrame);
  }, [pairing]);

  async function createPairingCode() {
    if (busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    setCopied(false);
    try {
      const response = await fetch("/api/settings/notebooklm-export", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ label: "Chrome connector" }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        code?: string;
        expiresAt?: string;
        error?: string;
      };
      if (!response.ok || !body.code || !body.expiresAt) {
        throw new Error(body.error ?? "pairing_unavailable");
      }
      setPairing({ code: body.code, expiresAt: body.expiresAt });
      setNow(Date.now());
    } catch {
      setError("A pairing code could not be created. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function copyCode() {
    if (!pairing) return;
    try {
      await navigator.clipboard.writeText(pairing.code);
      setCopied(true);
    } catch {
      setError("Copy was unavailable. Enter the code manually.");
    }
  }

  async function disconnect(mode: "safe_disconnect" | "emergency_revoke") {
    setBusy(true);
    if (mode === "safe_disconnect") setDisconnectOpen(false);
    else setEmergencyOpen(false);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/settings/notebooklm-export", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(notebookLmDisconnectPayload(mode)),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        if (mode === "safe_disconnect" && body.error === "target_has_active_work") {
          setError("Finish or explicitly stop every unresolved export before disconnecting.");
        } else {
          setError(
            mode === "safe_disconnect"
              ? "The connector could not be disconnected safely."
              : "Emergency revocation could not be confirmed. Treat the connector as potentially active and try again.",
          );
        }
        return;
      }
      setPairing(null);
      await refresh();
      setNotice(
        mode === "safe_disconnect"
          ? "NotebookLM connector disconnected. Existing NotebookLM sources were not changed."
          : "Connector access was revoked. Queued copies were purged; a source may still exist for work that had already been sent.",
      );
    } catch {
      setError(
        mode === "safe_disconnect"
          ? "The connector could not be disconnected safely."
          : "Emergency revocation could not be confirmed. Treat the connector as potentially active and try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function clearProtocolBlock() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/settings/notebooklm-export", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "clear_protocol_block",
          acknowledgeConnectorUpdatedAndTargetRevalidated: true,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(
          body.error === "target_not_recently_verified"
            ? "Update the connector and revalidate this private target first. Its health check must be less than five minutes old."
            : "The write safety stop could not be cleared.",
        );
        return;
      }
      await refresh();
    } catch {
      setError("The write safety stop could not be cleared.");
    } finally {
      setBusy(false);
    }
  }

  const secondsRemaining = pairing
    ? Math.max(0, Math.ceil((Date.parse(pairing.expiresAt) - now) / 1_000))
    : 0;
  const expired = Boolean(pairing && secondsRemaining === 0);
  const dedicatedResolutionRequired = runtimeBlockRequiresDedicatedResolution(
    status.feature.runtimeBlockReason,
  );

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[var(--control-selected-bg)] text-[var(--control-selected-fg)]">
              <BookOpen className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">Consumer NotebookLM</p>
              <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                Experimental one-item copied-text export through your local Chrome session.
              </p>
            </div>
          </div>
          <span className="rounded-full border border-[var(--border-strong)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
            Experimental
          </span>
        </div>

        <div
          className="mt-5 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-4"
          aria-label="NotebookLM rollout and retention status"
        >
          <dl className="grid gap-3 text-xs sm:grid-cols-3">
            <RolloutState
              label="Export queue"
              value={status.feature.queueAccepting ? "Accepting requests" : "Paused"}
              healthy={status.feature.queueAccepting}
            />
            <RolloutState
              label="Provider writes"
              value={status.feature.providerWritesEnabled ? "Enabled" : "Off"}
              healthy={status.feature.providerWritesEnabled}
            />
            <RolloutState
              label="Snapshot safeguards"
              value={status.feature.retentionHealthy ? "Healthy" : "Needs attention"}
              healthy={status.feature.retentionHealthy}
            />
          </dl>
          <p className="mt-3 text-xs leading-5 text-[var(--text-secondary)]">
            Read-only status checks remain available when queue intake or provider writes are off.
          </p>
        </div>

        {!status.feature.retentionHealthy && (
          <div
            role="alert"
            className="mt-4 rounded-md border border-[var(--danger)] p-3 text-sm text-[var(--danger)]"
          >
            <p className="font-semibold">Snapshot cleanup needs attention</p>
            <p className="mt-1 text-xs leading-5">
              New requests and provider writes stay fail-closed until the retention sweep is healthy again.
              {status.feature.overdueSnapshots > 0
                ? ` ${status.feature.overdueSnapshots} snapshot${status.feature.overdueSnapshots === 1 ? " is" : "s are"} overdue for purge.`
                : " No overdue copied-text snapshot is currently recorded."}
            </p>
            <p className="mt-1 text-xs leading-5">
              Last successful sweep: {status.feature.retentionLastSuccessAt
                ? new Date(status.feature.retentionLastSuccessAt).toLocaleString()
                : "not yet recorded"}.
              {status.feature.unresolvedOver24h > 0
                ? ` ${status.feature.unresolvedOver24h} dispatched export${status.feature.unresolvedOver24h === 1 ? " remains" : "s remain"} unresolved after 24 hours.`
                : ""}
            </p>
            {status.feature.physicalPurgePending && (
              <p className="mt-1 text-xs leading-5">
                Physical snapshot cleanup is still pending. The retention worker will retry it.
                Exports remain paused until completion is verified.
              </p>
            )}
          </div>
        )}

        {status.connection.configured ? (
          <div className="mt-5 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-4">
            {status.feature.runtimeWriteBlocked && (
              <div role="alert" className="mb-4 rounded-md border border-[var(--danger)] p-3 text-sm text-[var(--danger)]">
                <p className="font-semibold">
                  {dedicatedResolutionRequired
                    ? "Provider writes require dedicated reconciliation"
                    : "Provider writes stopped automatically"}
                </p>
                <p className="mt-1 text-xs leading-5">
                  {dedicatedResolutionRequired
                    ? "The ordinary reset is intentionally unavailable. Review the private target and the operational evidence before any future release explicitly resolves this stop. "
                    : "A provider safety signal triggered the stop. Update the extension, revalidate this private target, then clear the stop deliberately. "}
                  {runtimeBlockDetail(status.feature.runtimeBlockReason)}
                </p>
                {!dedicatedResolutionRequired && (
                  <button
                    type="button"
                    onClick={() => void clearProtocolBlock()}
                    disabled={busy}
                    className="mt-3 min-h-11 rounded-md border border-current px-3 text-xs font-semibold disabled:opacity-50"
                  >
                    Clear after update and revalidation
                  </button>
                )}
              </div>
            )}
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">Fixed destination</p>
                <p className="mt-1 text-base font-semibold text-[var(--text-primary)]">
                  {status.connection.targetLabel}{" "}
                  <span className="font-normal text-[var(--text-secondary)]">
                    · {sharingPostureLabel(status.connection.sharingPosture)}
                  </span>
                </p>
                <p className="mt-2 inline-flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                  <span className={`h-2 w-2 rounded-full ${status.connection.connectorOnline ? "bg-[var(--success)]" : "bg-[var(--warning)]"}`} aria-hidden="true" />
                  {status.connection.connectorOnline ? "Desktop connector online" : "Desktop connector offline"}
                </p>
              </div>
              <dl className="grid grid-cols-[auto_auto] gap-x-4 gap-y-1 text-xs">
                <dt className="text-[var(--text-muted)]">Safe slots</dt>
                <dd className="text-right text-[var(--text-primary)]">{status.connection.safeSlots ?? "Needs review"}</dd>
                <dt className="text-[var(--text-muted)]">Sharing</dt>
                <dd className="text-right text-[var(--text-primary)]">{sharingPostureLabel(status.connection.sharingPosture)}</dd>
                <dt className="text-[var(--text-muted)]">Health</dt>
                <dd className="text-right text-[var(--text-primary)]">{healthStatusLabel(status.connection.healthStatus)}</dd>
                <dt className="text-[var(--text-muted)]">Last checked</dt>
                <dd className="text-right text-[var(--text-primary)]">
                  {status.connection.lastCheckedAt ? new Date(status.connection.lastCheckedAt).toLocaleString() : "Not available"}
                </dd>
              </dl>
            </div>
            {status.connection.healthStatus !== "healthy" && (
              <div role="alert" className="mt-4 rounded-md border border-[var(--danger)] p-3 text-sm text-[var(--danger)]">
                <p className="font-semibold">Destination needs review</p>
                <p className="mt-1 text-xs leading-5">
                  {targetHealthDetail(status.connection.healthReason, status.connection.sharingPosture)} No new source will be created until the connector verifies a healthy private destination.
                </p>
              </div>
            )}
            <div className="mt-4 flex flex-col gap-2 border-t border-[var(--border)] pt-4 sm:flex-row">
              <a
                href="https://notebooklm.google/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-[var(--border-strong)] px-4 text-sm font-medium text-[var(--text-primary)]"
              >
                Open NotebookLM <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
              <button
                type="button"
                onClick={() => void refresh()}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-[var(--border-strong)] px-4 text-sm font-medium text-[var(--text-primary)]"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" /> Refresh status
              </button>
              <button
                type="button"
                onClick={() => setDisconnectOpen(true)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium text-[var(--danger)] sm:ml-auto"
              >
                <Unplug className="h-4 w-4" aria-hidden="true" /> Disconnect
              </button>
              <button
                type="button"
                onClick={() => setEmergencyOpen(true)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-[var(--danger)] px-4 text-sm font-medium text-[var(--danger)]"
              >
                <AlertTriangle className="h-4 w-4" aria-hidden="true" /> Emergency revoke
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <ol className="grid gap-3 text-sm text-[var(--text-secondary)] sm:grid-cols-3">
              <SetupStep number="1" title="Pair Chrome" detail="Create a short code here, then enter it in the AI Memory extension." />
              <SetupStep number="2" title="Sign in locally" detail="Open NotebookLM in Chrome. Google session data stays in that browser profile." />
              <SetupStep number="3" title="Paste one private notebook URL" detail="Paste the exact notebook URL in the extension. Its bounded local label stays in Chrome while owner, privacy, target, and source headroom are verified." />
            </ol>

            {pairing && !expired ? (
              <div
                ref={pairingCodeRegion}
                role="status"
                aria-live="polite"
                aria-atomic="true"
                tabIndex={-1}
                className="rounded-lg border border-[var(--border-strong)] bg-[var(--surface-raised)] p-4 text-center outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-9)]"
              >
                <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">Enter this code in the extension</p>
                <p className="mt-2 font-mono text-3xl font-semibold tracking-[0.18em] text-[var(--text-primary)]">{pairing.code}</p>
                <p className="mt-2 text-xs text-[var(--text-secondary)]">
                  Expires in {Math.floor(secondsRemaining / 60)}:{String(secondsRemaining % 60).padStart(2, "0")}
                </p>
                <button
                  type="button"
                  onClick={() => void copyCode()}
                  className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-[var(--border-strong)] px-4 text-sm font-medium text-[var(--text-primary)]"
                >
                  {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Clipboard className="h-4 w-4" aria-hidden="true" />}
                  {copied ? "Copied" : "Copy code"}
                </button>
                <p className="mt-3 inline-flex items-center gap-2 text-xs text-[var(--text-muted)]">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> Waiting for a private target…
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => void createPairingCode()}
                disabled={busy}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-[var(--action-primary-bg)] px-4 text-sm font-medium text-[var(--action-primary-fg)] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                <Monitor className="h-4 w-4" aria-hidden="true" />
                {busy ? "Creating code…" : expired ? "Create a new pairing code" : "Pair Chrome connector"}
              </button>
            )}
          </div>
        )}

        {error && (
          <p role="alert" className="mt-4 flex items-start gap-2 rounded-md border border-[var(--danger)] p-3 text-sm text-[var(--danger)]">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {error}
          </p>
        )}
        {notice && (
          <p role="status" aria-live="polite" className="mt-4 rounded-md border border-[var(--success)] p-3 text-sm text-[var(--success)]">
            {notice}
          </p>
        )}
      </section>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="flex gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[var(--text-muted)]" aria-hidden="true" />
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Local session boundary</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
              AI Memory receives only a generic safe target label, private-health facts, capacity, fingerprints, and hashed source aliases. Google cookies, account tokens, notebook IDs, URLs, and the bounded locally observed notebook label remain local to Chrome.
            </p>
          </div>
        </div>
      </section>

      <Dialog.Root open={disconnectOpen} onOpenChange={setDisconnectOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xl">
            <Dialog.Title className="pr-10 text-lg font-semibold text-[var(--text-primary)]">Disconnect NotebookLM connector?</Dialog.Title>
            <Dialog.Description className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              New claims will stop and the scoped connector token will be revoked. Existing NotebookLM sources are not changed or deleted. Disconnect is blocked while any export is unresolved.
            </Dialog.Description>
            <Dialog.Close className="absolute right-3 top-3 inline-flex h-11 w-11 items-center justify-center rounded-md text-[var(--text-secondary)]" aria-label="Close">
              <X className="h-5 w-5" aria-hidden="true" />
            </Dialog.Close>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
              <button
                type="button"
                onClick={() => void disconnect("safe_disconnect")}
                disabled={busy}
                className="min-h-11 rounded-md bg-[var(--danger)] px-4 text-sm font-medium text-white disabled:opacity-50"
              >
                Disconnect
              </button>
              <Dialog.Close className="min-h-11 rounded-md border border-[var(--border-strong)] px-4 text-sm font-medium text-[var(--text-primary)]">Cancel</Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={emergencyOpen} onOpenChange={setEmergencyOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[var(--danger)] bg-[var(--surface)] p-5 shadow-xl">
            <Dialog.Title className="pr-10 text-lg font-semibold text-[var(--text-primary)]">
              Emergency-revoke this connector?
            </Dialog.Title>
            <Dialog.Description className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              Use this only if the connector or Chrome profile may be compromised. Access is revoked immediately, queued copied-text snapshots are purged, and post-send checks stop. A source may still exist in NotebookLM for work already sent; nothing is remotely deleted.
            </Dialog.Description>
            <Dialog.Close
              className="absolute right-3 top-3 inline-flex h-11 w-11 items-center justify-center rounded-md text-[var(--text-secondary)]"
              aria-label="Close"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </Dialog.Close>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
              <button
                type="button"
                onClick={() => void disconnect("emergency_revoke")}
                disabled={busy}
                className="min-h-11 rounded-md bg-[var(--danger)] px-4 text-sm font-medium text-white disabled:opacity-50"
              >
                Revoke access and purge queued copies
              </button>
              <Dialog.Close className="min-h-11 rounded-md border border-[var(--border-strong)] px-4 text-sm font-medium text-[var(--text-primary)]">
                Cancel
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

export function notebookLmDisconnectPayload(mode: "safe_disconnect" | "emergency_revoke") {
  return mode === "safe_disconnect"
    ? { mode } as const
    : {
        mode,
        acknowledgePayloadsPurgedAndSourcesMayExist: true as const,
      };
}

function RolloutState({ label, value, healthy }: { label: string; value: string; healthy: boolean }) {
  return (
    <div>
      <dt className="text-[var(--text-muted)]">{label}</dt>
      <dd className={`mt-1 inline-flex items-center gap-2 font-semibold ${healthy ? "text-[var(--success)]" : "text-[var(--warning)]"}`}>
        <span className="h-2 w-2 rounded-full bg-current" aria-hidden="true" /> {value}
      </dd>
    </div>
  );
}

export function sharingPostureLabel(posture: NotebookLmSettingsStatus["connection"]["sharingPosture"]): string {
  if (posture === "private") return "Private";
  if (posture === "shared") return "Shared";
  if (posture === "public") return "Public";
  return "Not verified";
}

function healthStatusLabel(status: NotebookLmSettingsStatus["connection"]["healthStatus"]): string {
  if (status === "healthy") return "Healthy";
  if (status === "attention") return "Needs attention";
  return "Not verified";
}

export function targetHealthDetail(
  reason: string | null,
  posture: NotebookLmSettingsStatus["connection"]["sharingPosture"],
): string {
  if (posture === "shared") return "The destination is shared.";
  if (posture === "public") return "The destination is public.";
  if (reason === "wrong_target") return "The local connector is on a different account or notebook.";
  if (reason === "capacity_unknown") return "Safe source capacity could not be verified.";
  if (reason === "capacity_exhausted") return "The five-source safety reserve has been reached.";
  if (reason === "unavailable") return "The destination could not be verified.";
  if (reason === "shared") return "The destination is shared.";
  if (reason === "public") return "The destination is public.";
  if (reason === "multiple_marker_matches") return "Multiple exact recovery marker matches were found.";
  if (reason === "provider_source_identity_reused") return "A provider source identity was reused unexpectedly.";
  return "The destination has not been positively verified.";
}

function runtimeBlockDetail(reason: string | null): string {
  if (reason === "restore_reconciliation_required") {
    return "The database was restored from an older point in time, so later NotebookLM sources may exist outside the restored ledger.";
  }
  if (reason === "multiple_marker_matches") return "The connector found more than one exact recovery marker match.";
  if (reason === "provider_source_identity_reused") return "A provider source identity was reused unexpectedly.";
  if (reason === "protocol_drift") return "The connector reported an incompatible provider response.";
  return "The exact safe reason is available in the operational audit.";
}

function runtimeBlockRequiresDedicatedResolution(reason: string | null): boolean {
  return reason === "restore_reconciliation_required" ||
    reason === "multiple_marker_matches" ||
    reason === "provider_source_identity_reused";
}

function SetupStep({ number, title, detail }: { number: string; title: string; detail: string }) {
  return (
    <li className="rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-4">
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--control-selected-bg)] text-xs font-semibold text-[var(--control-selected-fg)]">{number}</span>
      <p className="mt-3 font-semibold text-[var(--text-primary)]">{title}</p>
      <p className="mt-1 text-xs leading-5">{detail}</p>
    </li>
  );
}
