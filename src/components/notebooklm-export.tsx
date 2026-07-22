"use client";

import * as Dialog from "@radix-ui/react-dialog";
import {
  AlertTriangle,
  BookOpen,
  Check,
  CheckCircle2,
  Clock3,
  RefreshCw,
  Send,
  ShieldCheck,
  WifiOff,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NOTEBOOKLM_CAPACITY_WARNING_SLOTS } from "@/lib/notebooklm/contracts";

type RequestState =
  | "queued"
  | "sending"
  | "processing"
  | "ready"
  | "authentication_attention"
  | "reconciling"
  | "reconciliation_required"
  | "conflict"
  | "target_attention"
  | "capacity_blocked"
  | "retryable_failure"
  | "processing_failed"
  | "connector_update_required"
  | "cancelled"
  | "expired";

interface RequestDto {
  requestId: string;
  state: RequestState;
  phase: "pre_create" | "create" | "reconcile" | "poll" | "terminal";
  reason: string | null;
  canCancel: boolean;
  canStopChecking: boolean;
  possiblyDelivered: boolean;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface ExportStatusDto {
  feature: {
    queueAccepting: boolean;
    providerWritesEnabled: boolean;
    experimental: boolean;
    runtimeWriteBlocked: boolean;
    runtimeBlockReason: string | null;
  };
  destination: {
    configured: boolean;
    label: string | null;
    sharingPosture: "unknown" | "private" | "shared" | "public" | null;
    healthStatus: "unknown" | "healthy" | "attention" | null;
    healthReason: string | null;
    safeSlots: number | null;
    connectorOnline: boolean;
    lastCheckedAt: string | null;
  };
  item: {
    eligible: boolean;
    ineligibleReason: string | null;
    requiresLimitedConfirmation: boolean;
    changedContent: boolean;
    alreadyExported: boolean;
    requestMatchesCurrentVersion: boolean;
    hasUnresolvedDifferentVersion: boolean;
  };
  request: RequestDto | null;
  idempotencyAcknowledgement: "accepted" | "absent" | null;
  setupPath: string;
  notebookLmUrl: string;
  disclosure: string;
}

type DialogKind = "payload" | "limited" | "changed" | "stop_checking" | null;
export type NotebookLmExportOverlay = "loading" | "requesting" | "unknown" | "offline" | "session" | null;

export function NotebookLmExport({
  itemId,
  payloadPreview,
  mobile = false,
}: {
  itemId: string;
  payloadPreview: string;
  mobile?: boolean;
}) {
  const [status, setStatus] = useState<ExportStatusDto | null>(null);
  const [overlay, setOverlay] = useState<NotebookLmExportOverlay>("loading");
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [limitedConfirmed, setLimitedConfirmed] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [hasPendingKey, setHasPendingKey] = useState(false);
  const pendingKey = useRef<string | null>(null);
  const sequence = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const submitting = useRef(false);
  const viewRecorded = useRef(false);
  const dialogTrigger = useRef<HTMLButtonElement | null>(null);

  const refresh = useCallback(async () => {
    const seq = ++sequence.current;
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    try {
      const response = await fetch(`/api/items/${itemId}/notebooklm-export`, {
        cache: "no-store",
        signal: abort.signal,
        headers: pendingKey.current
          ? { "x-notebooklm-idempotency-key": pendingKey.current }
          : undefined,
      });
      if (seq !== sequence.current) return;
      if (response.status === 401) {
        setOverlay("session");
        return;
      }
      if (!response.ok) throw new Error("status_unavailable");
      const next = (await response.json()) as ExportStatusDto;
      setStatus(next);
      if (pendingKey.current && next.idempotencyAcknowledgement === "accepted") {
        pendingKey.current = null;
        setHasPendingKey(false);
        setOverlay(null);
        setErrorCode(null);
      } else if (pendingKey.current && next.idempotencyAcknowledgement === "absent") {
        setOverlay(navigator.onLine ? "unknown" : "offline");
      } else {
        setOverlay(null);
        setErrorCode(null);
      }
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
      setOverlay(navigator.onLine ? "unknown" : "offline");
    }
  }, [itemId]);

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => void refresh(), 0);
    return () => {
      window.clearTimeout(initialRefresh);
      controller.current?.abort();
    };
  }, [refresh]);

  useEffect(() => {
    if (viewRecorded.current) return;
    viewRecorded.current = true;
    void fetch(`/api/items/${itemId}/notebooklm-export`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ event: "export_viewed" }),
    }).catch(() => undefined);
  }, [itemId]);

  const active = Boolean(status?.request && status.request.phase !== "terminal");
  useEffect(() => {
    if (!active || overlay === "session" || overlay === "offline") return;
    const poll = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const timer = window.setInterval(poll, 5_000);
    return () => window.clearInterval(timer);
  }, [active, overlay, refresh]);

  useEffect(() => {
    const online = () => void refresh();
    const offline = () => setOverlay("offline");
    const visible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    document.addEventListener("visibilitychange", visible);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [refresh]);

  const view = useMemo(
    () => buildNotebookLmExportView(status, overlay, errorCode, hasPendingKey),
    [status, overlay, errorCode, hasPendingKey],
  );
  const statusCheckOnly = shouldOnlyCheckNotebookLmStatus(status, overlay, hasPendingKey);

  async function submitExport(options: {
    confirmLimitedCapture?: boolean;
    confirmUpdatedVersion?: boolean;
  } = {}) {
    if (submitting.current) return;
    submitting.current = true;
    const key = pendingKey.current ?? `notebooklm_${crypto.randomUUID()}`;
    pendingKey.current = key;
    setHasPendingKey(true);
    setOverlay("requesting");
    setErrorCode(null);
    setDialog(null);
    try {
      const response = await fetch(`/api/items/${itemId}/notebooklm-export`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ idempotencyKey: key, ...options }),
      });
      if (response.status === 401) {
        setOverlay("session");
        return;
      }
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        request?: RequestDto;
      };
      if (!response.ok) {
        if (response.status < 500) {
          pendingKey.current = null;
          setHasPendingKey(false);
        }
        setErrorCode(body.error ?? "export_unavailable");
        setOverlay(response.status >= 500 ? "unknown" : null);
        await refresh();
        return;
      }
      pendingKey.current = null;
      setHasPendingKey(false);
      if (status && body.request) setStatus({ ...status, request: body.request });
      setOverlay(null);
      await refresh();
    } catch {
      setOverlay(navigator.onLine ? "unknown" : "offline");
      await refresh();
    } finally {
      submitting.current = false;
    }
  }

  async function endRequest(mode: "cancel" | "stop_checking") {
    const request = status?.request;
    if (!request) return;
    setDialog(null);
    setOverlay("requesting");
    try {
      const response = await fetch(`/api/items/${itemId}/notebooklm-export`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          mode === "cancel"
            ? { mode, requestId: request.requestId }
            : { mode, requestId: request.requestId, acknowledgeSourceMayExist: true },
        ),
      });
      if (response.status === 401) {
        setOverlay("session");
        return;
      }
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        setErrorCode(body.error ?? "export_unavailable");
      }
      setOverlay(null);
      await refresh();
    } catch {
      setOverlay(navigator.onLine ? "unknown" : "offline");
    }
  }

  function choosePrimaryAction() {
    if (overlay === "unknown" || overlay === "offline") {
      if (pendingKey.current && status && !status.request?.possiblyDelivered) {
        void submitExport({
          confirmLimitedCapture: status.item.requiresLimitedConfirmation,
          confirmUpdatedVersion: status.item.changedContent,
        });
      } else {
        void refresh();
      }
      return;
    }
    if (!status) return;
    if (status.item.requiresLimitedConfirmation) {
      setLimitedConfirmed(false);
      setDialog("limited");
      return;
    }
    if (status.item.changedContent && !status.item.alreadyExported) {
      setDialog("changed");
      return;
    }
    void submitExport();
  }

  const setupPath = status?.setupPath ?? "/settings/notebooklm-export";
  const actionDisabled = view.actionDisabled || overlay === "requesting" || overlay === "loading";
  const assertive = shouldUseAssertiveNotebookLmStatus(status, overlay, errorCode);

  return (
    <div className="contents">
      <section
        className={`${mobile ? "w-full" : "basis-full"} rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 font-sans`}
        aria-label="NotebookLM destination"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 gap-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[var(--control-selected-bg)] text-[var(--control-selected-fg)]">
              <BookOpen className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                NotebookLM destination
              </p>
              {status?.destination.configured ? (
                <p className="mt-0.5 break-words text-sm font-semibold text-[var(--text-primary)]">
                  {status.destination.label}{" "}
                  <span className="font-normal text-[var(--text-secondary)]">
                    · {status.destination.sharingPosture === "private" && status.destination.healthStatus === "healthy"
                      ? "Private"
                      : "Needs review"}
                  </span>
                </p>
              ) : (
                <p className="mt-0.5 text-sm font-semibold text-[var(--text-primary)]">Not connected</p>
              )}
              <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                {status?.disclosure ?? "Sends a static copy of the saved text. Changes do not sync automatically."}
              </p>
              <button
                type="button"
                onClick={(event) => {
                  dialogTrigger.current = event.currentTarget;
                  setDialog("payload");
                }}
                className="mt-1 min-h-11 text-xs font-medium text-[var(--accent-11)] hover:underline md:min-h-0"
              >
                What will be sent?
              </button>
            </div>
          </div>
          <div className="text-left text-xs text-[var(--text-secondary)] sm:text-right">
            {status?.destination.configured ? (
              <>
                <p className="inline-flex items-center gap-1.5">
                  <span
                    className={`h-2 w-2 rounded-full ${status.destination.connectorOnline ? "bg-[var(--success)]" : "bg-[var(--warning)]"}`}
                    aria-hidden="true"
                  />
                  {status.destination.connectorOnline ? "Desktop connector online" : "Waiting for desktop connector"}
                </p>
                <p
                  className={`mt-1 ${
                    status.destination.safeSlots !== null &&
                    status.destination.safeSlots <= NOTEBOOKLM_CAPACITY_WARNING_SLOTS
                      ? "font-medium text-[var(--warning)]"
                      : ""
                  }`}
                >
                  {status.destination.safeSlots === null
                    ? "Capacity needs review"
                    : status.destination.safeSlots <= NOTEBOOKLM_CAPACITY_WARNING_SLOTS
                      ? `Low capacity · ${status.destination.safeSlots} safe source slot${status.destination.safeSlots === 1 ? "" : "s"}`
                      : `${status.destination.safeSlots} safe source slots`}
                </p>
                {status.destination.lastCheckedAt && (
                  <p className="mt-1 text-[var(--text-muted)]">
                    Checked {formatFreshness(status.destination.lastCheckedAt)}
                  </p>
                )}
              </>
            ) : (
              <Link href={setupPath} className="inline-flex min-h-11 items-center text-[var(--accent-11)] hover:underline md:min-h-0">
                Set up connector
              </Link>
            )}
          </div>
        </div>

        {(view.showStatus || errorCode) && (
          <div
            className={`mt-4 flex gap-3 rounded-md border p-3 ${toneClass(view.tone)}`}
            role={assertive ? "alert" : "status"}
            aria-live={assertive ? "assertive" : "polite"}
            aria-atomic="true"
            aria-busy={view.busy}
          >
            <view.Icon
              className={`mt-0.5 h-4 w-4 shrink-0 motion-reduce:animate-none ${view.spin ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{view.title}</p>
              <p className="mt-1 text-xs leading-5">{view.detail}</p>
              {status?.request && view.showProgress && (
                <Progress state={status.request.state} />
              )}
              <div className="mt-2 flex flex-wrap items-center gap-3">
                {status?.request?.canCancel && (
                  <button
                    type="button"
                    onClick={() => void endRequest("cancel")}
                    className="min-h-11 text-xs font-medium underline underline-offset-2 md:min-h-0"
                  >
                    Cancel export
                  </button>
                )}
                {status?.request?.canStopChecking && (
                  <button
                    type="button"
                    onClick={(event) => {
                      dialogTrigger.current = event.currentTarget;
                      setDialog("stop_checking");
                    }}
                    className="min-h-11 text-xs font-medium underline underline-offset-2 md:min-h-0"
                  >
                    Stop checking and purge
                  </button>
                )}
                {view.needsSetup && (
                  <Link href={setupPath} className="inline-flex min-h-11 items-center text-xs font-medium underline underline-offset-2 md:min-h-0">
                    Review connector
                  </Link>
                )}
                {(overlay === "unknown" || overlay === "offline") &&
                  !(statusCheckOnly && status?.destination.configured) && (
                  <button
                    type="button"
                    onClick={() => void refresh()}
                    className="min-h-11 text-xs font-medium underline underline-offset-2 md:min-h-0"
                  >
                    Check again
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      {overlay === "session" ? (
        <Link
          href={`/unlock?next=${encodeURIComponent(`/items/${itemId}`)}`}
          className={`${mobile ? "h-11 w-full justify-center" : "h-8"} inline-flex items-center gap-2 rounded-md border border-[var(--border)] px-3 text-sm font-medium text-[var(--text-primary)]`}
        >
          Unlock to check export
        </Link>
      ) : status?.destination.configured ? (
        <button
          type="button"
          onClick={(event) => {
            dialogTrigger.current = event.currentTarget;
            choosePrimaryAction();
          }}
          disabled={actionDisabled}
          aria-busy={overlay === "requesting" || view.busy}
          className={`${mobile ? "h-11 w-full justify-center" : "h-8"} inline-flex items-center gap-2 rounded-md border border-[var(--border)] bg-transparent px-3 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-55`}
        >
          <view.ActionIcon
            className={`h-3.5 w-3.5 motion-reduce:animate-none ${view.spin ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          {view.action}
        </button>
      ) : (
        <Link
          href={setupPath}
          className={`${mobile ? "h-11 w-full justify-center" : "h-8"} inline-flex items-center gap-2 rounded-md border border-[var(--border)] bg-transparent px-3 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]`}
        >
          <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
          Set up NotebookLM
        </Link>
      )}

      <ExportDialog
        kind={dialog}
        payloadPreview={payloadPreview}
        limitedConfirmed={limitedConfirmed}
        onLimitedConfirmed={setLimitedConfirmed}
        onClose={() => setDialog(null)}
        returnFocusTarget={dialogTrigger}
        onConfirm={() => {
          if (dialog === "limited") {
            if (status?.item.changedContent) {
              setDialog("changed");
            } else {
              void submitExport({ confirmLimitedCapture: true });
            }
          } else if (dialog === "changed") {
            void submitExport({
              confirmLimitedCapture: status?.item.requiresLimitedConfirmation || undefined,
              confirmUpdatedVersion: true,
            });
          } else if (dialog === "stop_checking") {
            void endRequest("stop_checking");
          } else {
            setDialog(null);
          }
        }}
      />
    </div>
  );
}

function ExportDialog({
  kind,
  payloadPreview,
  limitedConfirmed,
  onLimitedConfirmed,
  onClose,
  returnFocusTarget,
  onConfirm,
}: {
  kind: DialogKind;
  payloadPreview: string;
  limitedConfirmed: boolean;
  onLimitedConfirmed: (value: boolean) => void;
  onClose: () => void;
  returnFocusTarget: { current: HTMLButtonElement | null };
  onConfirm: () => void;
}) {
  const payload = kind === "payload";
  const limited = kind === "limited";
  const changed = kind === "changed";
  const stop = kind === "stop_checking";
  return (
    <Dialog.Root open={kind !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45" />
        <Dialog.Content
          onPointerDownOutside={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => restoreNotebookLmDialogFocus(event, returnFocusTarget.current)}
          className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xl"
        >
          <Dialog.Title className="pr-10 text-lg font-semibold text-[var(--text-primary)]">
            {payload ? "What will be sent?" :
              limited ? "Export this limited capture?" :
              changed ? "Export an updated version?" :
              stop ? "Stop checking this export?" : "NotebookLM export"}
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            {payload
              ? "Below is the complete minimized copied-text content for this saved version. The NotebookLM source title also receives a short opaque recovery marker."
              : limited
                ? "AI Memory saved only limited text. Review the complete minimized text below before sending it as a source."
                : changed
                  ? "The saved item changed after its last successful export. This creates a new source; the previous source remains in NotebookLM."
                  : "Recovery will stop and the frozen copy will be purged. A source may still exist in NotebookLM; this does not delete it."}
          </Dialog.Description>
          <Dialog.Close
            className="absolute right-3 top-3 inline-flex h-11 w-11 items-center justify-center rounded-md text-[var(--text-secondary)]"
            aria-label="Close"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </Dialog.Close>

          {(payload || limited) && (
            <div className="mt-4 rounded-md border border-[var(--border)] bg-[var(--surface-raised)] p-3">
              <p className="max-h-64 overflow-y-auto whitespace-pre-wrap text-xs leading-5 text-[var(--text-secondary)]">
                {payloadPreview || "No eligible minimized text is available."}
              </p>
            </div>
          )}
          {payload && (
            <p className="mt-3 text-xs leading-5 text-[var(--text-muted)]">
              Not sent: AI summary, quotes, chats, private notes, tags, collections, thumbnails, internal IDs, or credentials.
            </p>
          )}
          {limited && (
            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-md border border-[var(--border)] p-3 text-sm text-[var(--text-primary)]">
              <input
                type="checkbox"
                checked={limitedConfirmed}
                onChange={(event) => onLimitedConfirmed(event.target.checked)}
                className="mt-1 h-4 w-4"
              />
              <span>I understand. Export only the limited text shown in AI Memory.</span>
            </label>
          )}
          <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
            {!payload && (
              <button
                type="button"
                onClick={onConfirm}
                disabled={limited && !limitedConfirmed}
                className={`min-h-11 rounded-md px-4 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 ${stop ? "bg-[var(--danger)] text-white" : "bg-[var(--action-primary-bg)] text-[var(--action-primary-fg)]"}`}
              >
                {limited ? "Export limited text" : changed ? "Create new source" : "Stop checking and purge"}
              </button>
            )}
            <Dialog.Close className="min-h-11 rounded-md border border-[var(--border-strong)] px-4 text-sm font-medium text-[var(--text-primary)]">
              {payload ? "Done" : "Cancel"}
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function restoreNotebookLmDialogFocus(
  event: { preventDefault: () => void },
  target: HTMLButtonElement | null,
): void {
  event.preventDefault();
  if (target?.isConnected && !target.disabled) target.focus();
}

function Progress({ state }: { state: RequestState }) {
  const labels = ["Queued", "Sending", "Processing", "Ready"];
  const current = state === "ready" ? 3 : state === "processing" ? 2 : state === "sending" ? 1 : 0;
  return (
    <ol className="mt-3 grid grid-cols-4 gap-1" aria-label="Export progress">
      {labels.map((label, index) => (
        <li key={label} className="min-w-0 text-[10px]">
          <span className={`mb-1 block h-1 rounded-full ${index <= current ? "bg-current" : "bg-[var(--border-strong)]"}`} />
          <span className={index === current ? "font-semibold" : "opacity-70"}>{label}</span>
        </li>
      ))}
    </ol>
  );
}

export function buildNotebookLmExportView(
  status: ExportStatusDto | null,
  overlay: NotebookLmExportOverlay,
  error: string | null,
  hasPendingKey = false,
) {
  const statusCheckOnly = shouldOnlyCheckNotebookLmStatus(status, overlay, hasPendingKey);
  if (overlay === "loading") return view("Loading NotebookLM export…", "Checking the configured destination.", "neutral", RefreshCw, true, true, "Loading…", true);
  if (overlay === "session") return view("Session expired", "Unlock AI Memory to check this export. Existing work is unchanged.", "warning", ShieldCheck, false, false, "Unlock to continue", true, true);
  if (overlay === "requesting") return view("Saving your export request…", "The request is being made durable before the desktop connector can send anything.", "neutral", RefreshCw, true, true, "Saving…", true);
  if (overlay === "offline") return view("You’re offline", statusCheckOnly ? checkOnlyDetail(status) : pendingDetail(), "warning", WifiOff, false, false, statusCheckOnly ? "Check again" : "Retry safely", true);
  if (overlay === "unknown") return view("We couldn’t confirm the request", statusCheckOnly ? checkOnlyDetail(status) : pendingDetail(), "warning", AlertTriangle, false, false, statusCheckOnly ? "Check again" : "Retry safely", true);
  if (!status) return view("NotebookLM export unavailable", "Status could not be loaded.", "danger", AlertTriangle, false, false, "Unavailable", true, true);
  if (error) return view(errorTitle(error), errorDetail(error), "danger", AlertTriangle, false, false, "Try again", true, error !== "retryable_failure");
  if (!status.destination.configured) return view("Set up a private NotebookLM destination", "Setup happens in the local Chrome connector; Google session data never enters AI Memory.", "neutral", BookOpen, false, false, "Set up NotebookLM", false, true);

  const request = status.request;
  if (request && request.phase !== "terminal") {
    const earlier = status.item.hasUnresolvedDifferentVersion
      ? " This is an earlier frozen version; finish or stop it before exporting the newly saved version."
      : "";
    switch (request.state) {
      case "queued":
        return status.destination.connectorOnline
          ? view("Queued for NotebookLM", `The minimized saved version is durable. It is safe to close this page.${earlier}`, "neutral", Clock3, true, false, "Queued", true, true, false, true)
          : view("Queued — waiting for desktop connector", `The request will continue when the connected computer is online.${earlier}`, "warning", WifiOff, true, false, "Queued", true, true, false, true);
      case "sending": return view("Sending the saved copy to NotebookLM…", "The one allowed create is in progress. A second create is intentionally unavailable.", "neutral", Send, true, true, "Sending…", true, true, false, true);
      case "processing": return view("Added to NotebookLM. Processing…", "The exact source is known, but it is not called ready until NotebookLM reports it ready.", "neutral", RefreshCw, true, true, "Processing…", true, true, false, true);
      case "authentication_attention": {
        const detail = request.phase === "pre_create"
          ? "Nothing was sent. Reconnect NotebookLM on the configured Chrome profile."
          : request.phase === "reconcile"
            ? "It may already have been received. Reconnect only to resume read-only reconciliation."
            : "The source exists. Reconnect only to resume processing-status checks.";
        return view(request.phase === "pre_create" ? "Reconnect NotebookLM" : request.phase === "reconcile" ? "Reconnect to check the result" : "Reconnect to finish checking", detail, "warning", ShieldCheck, false, false, "Reconnect in Settings", true, true, true);
      }
      case "reconciling": return view("Checking whether NotebookLM received it…", "The create response was interrupted. Recovery is read-only and will not create another source.", "warning", RefreshCw, true, true, "Checking…", true, true);
      case "reconciliation_required": return view("The result is still unresolved", "No matching source is visible yet. AI Memory will not create another source.", "warning", AlertTriangle, false, false, "Checking paused", true, true);
      case "conflict": return view("Export paused to prevent another copy", "Multiple exact marker matches were found. Nothing else will be sent or deleted.", "danger", AlertTriangle, false, false, "Conflict", true, true);
      case "target_attention": return view("Export paused — destination needs review", "The account, notebook, sharing, or capacity check changed. No new create is allowed.", "danger", ShieldCheck, false, false, "Review connector", true, true, true);
      case "capacity_blocked": return view("Destination safety reserve reached", "Restore headroom before trying again. Nothing was sent.", "danger", AlertTriangle, false, false, "Reserve reached", true, true, true);
      case "retryable_failure": return view("Nothing was sent", "A pre-send network failure was conclusive. Retrying this same durable request is safe.", "warning", AlertTriangle, false, false, "Try again", true, false);
      case "connector_update_required": return view("Connector update required", "NotebookLM’s interface changed. Sending is paused until the connector is updated and revalidated.", "danger", ShieldCheck, false, false, "Update connector", true, true, true);
      default: break;
    }
  }

  if (request?.state === "ready" && status.item.requestMatchesCurrentVersion) {
    return view(`Ready in ${status.destination.label}`, "NotebookLM finished processing this exact saved version.", "success", CheckCircle2, false, false, "Exported", true, true, false, true);
  }
  if (status.item.alreadyExported) return view("Already exported", `This exact saved version is already ready in ${status.destination.label}. No new source was created.`, "success", CheckCircle2, false, false, "Already exported", true, true);
  if (request?.phase === "terminal") {
    switch (request.state) {
      case "processing_failed": return view("NotebookLM could not process this source", "The recorded source failed after creation. AI Memory will not create a replacement automatically.", "danger", AlertTriangle, false, false, "Processing failed", true, true);
      case "conflict": return view("Export paused to prevent another copy", "Multiple exact marker matches were found. No automatic create or delete is allowed.", "danger", AlertTriangle, false, false, "Conflict", true, true);
      case "reconciliation_required": return request.reason === "checking_stopped_source_may_exist"
        ? view("Stopped checking", "The frozen copy was purged. A source may still exist in NotebookLM; no remote deletion was claimed.", "warning", ShieldCheck, false, false, "Checking stopped", true, true)
        : view("The result is unresolved", "AI Memory will not create another source unless non-delivery can be proven.", "warning", AlertTriangle, false, false, "Unresolved", true, true);
      case "target_attention": return view("Export paused — destination needs review", "Review the configured account and private notebook before trying again.", "danger", ShieldCheck, false, false, "Review connector", true, true, true);
      case "capacity_blocked": return view("Destination safety reserve reached", "Restore headroom before trying again. Nothing was sent.", "danger", AlertTriangle, false, false, "Reserve reached", true, true, true);
      case "connector_update_required": return view("Connector update required", "NotebookLM’s interface changed. Sending is paused until the connector is updated and revalidated.", "danger", ShieldCheck, false, false, "Update connector", true, true, true);
      default: break;
    }
  }
  if (status.destination.sharingPosture !== "private" || status.destination.healthStatus !== "healthy") return view("Destination needs review", "Export is blocked until the connector positively verifies a healthy private notebook. No new source will be created.", "danger", ShieldCheck, false, false, "Review connector", true, true, true);
  if (status.destination.safeSlots === null) return view("Capacity needs review", "The connector could not confirm enough safe source capacity. No new source will be created.", "warning", AlertTriangle, false, false, "Capacity unavailable", true, true, true);
  if (status.destination.safeSlots <= 0) return view("Destination safety reserve reached", "Remove sources in NotebookLM or deliberately configure another private destination. No new source will be created.", "danger", AlertTriangle, false, false, "Reserve reached", true, true, true);
  if (!status.item.eligible) return view(ineligibleTitle(status.item.ineligibleReason), ineligibleDetail(status.item.ineligibleReason), "warning", AlertTriangle, false, false, "Cannot export", true, true);
  if (status.feature.runtimeWriteBlocked) return view("NotebookLM sending stopped automatically", "A provider safety signal tripped the write stop. Update and revalidate the connector in Settings before clearing it.", "danger", ShieldCheck, false, false, "Safety stop active", true, true, true);
  if (!status.feature.queueAccepting) return view("NotebookLM export is paused", "New export requests are disabled. Existing status and safe recovery remain available.", "warning", ShieldCheck, false, false, "Export paused", true, true);
  if (!status.feature.providerWritesEnabled) return view("Provider writes are off", "New NotebookLM sources cannot be created during this rollout stage. Existing read-only checks and reconciliation remain available.", "warning", ShieldCheck, false, false, "Provider writes off", true, true);
  if (status.item.changedContent) return view("This item changed since its last export", "A new export creates another source. The previous NotebookLM source remains unchanged.", "warning", AlertTriangle, false, false, "Export updated version", true, false);
  if (request) {
    switch (request.state) {
      case "ready": return view("An earlier version is ready", "NotebookLM finished processing an earlier saved version. Review the current saved text before creating another source.", "success", CheckCircle2, false, false, "Review current version", true, true);
      case "cancelled": return view("Export cancelled", "The request was cancelled before sending. Nothing left AI Memory.", "neutral", X, false, false, "Export to NotebookLM", true, false);
      case "expired": return view("Export expired", "The seven-day pre-send window ended. Nothing was sent.", "warning", Clock3, false, false, "Export again", true, false);
      case "retryable_failure": return view("Nothing was sent", "Retrying this same durable request is safe.", "warning", AlertTriangle, false, false, "Try again", true, false);
      default: break;
    }
  }
  if (status.destination.safeSlots <= NOTEBOOKLM_CAPACITY_WARNING_SLOTS) {
    return view(
      "NotebookLM capacity is running low",
      `Only ${status.destination.safeSlots} safe source slot${status.destination.safeSlots === 1 ? " remains" : "s remain"} before the five-source reserve.`,
      "warning",
      AlertTriangle,
      false,
      false,
      status.item.requiresLimitedConfirmation ? "Review and export" : "Export to NotebookLM",
      true,
      false,
    );
  }
  return view("Ready to export", "One deliberate click creates one static copied-text source in the configured private notebook.", "neutral", BookOpen, false, false, status.item.requiresLimitedConfirmation ? "Review and export" : "Export to NotebookLM", false, false);
}

export function shouldUseAssertiveNotebookLmStatus(
  status: ExportStatusDto | null,
  overlay: NotebookLmExportOverlay,
  error: string | null,
): boolean {
  if (error || overlay === "session" || (!status && overlay === null)) return true;
  if (!status) return false;
  if (status.feature.runtimeWriteBlocked) return true;
  if (
    status.destination.configured &&
    (status.destination.sharingPosture === "shared" ||
      status.destination.sharingPosture === "public" ||
      status.destination.healthStatus === "attention" ||
      status.destination.safeSlots === 0)
  ) {
    return true;
  }
  return Boolean(
    status.request &&
      [
        "authentication_attention",
        "reconciliation_required",
        "conflict",
        "target_attention",
        "capacity_blocked",
        "retryable_failure",
        "processing_failed",
        "connector_update_required",
      ].includes(status.request.state),
  );
}

function view(
  title: string,
  detail: string,
  tone: "neutral" | "success" | "warning" | "danger",
  Icon: typeof BookOpen,
  busy: boolean,
  spin: boolean,
  action: string,
  showStatus: boolean,
  actionDisabled = false,
  needsSetup = false,
  showProgress = false,
) {
  return {
    title,
    detail,
    tone,
    Icon,
    ActionIcon: spin ? RefreshCw : tone === "success" ? Check : BookOpen,
    busy,
    spin,
    action,
    showStatus,
    actionDisabled,
    needsSetup,
    showProgress,
  };
}

function pendingDetail() {
  return "The server may already have accepted the same idempotent request. Check status or retry safely; do not create a different request.";
}

function checkOnlyDetail(status: ExportStatusDto | null) {
  if (status?.request?.possiblyDelivered) {
    return "This request may already have reached NotebookLM. Check status again; AI Memory will not submit another export.";
  }
  if (status?.request) {
    return "The server already has this request. Check status again; AI Memory will not submit another export.";
  }
  return "The current status could not be loaded. Check again; no export will be submitted.";
}

function shouldOnlyCheckNotebookLmStatus(
  status: ExportStatusDto | null,
  overlay: NotebookLmExportOverlay,
  hasPendingKey: boolean,
): boolean {
  return Boolean(
    (overlay === "unknown" || overlay === "offline") &&
      (!hasPendingKey || status?.request?.possiblyDelivered),
  );
}

function toneClass(tone: "neutral" | "success" | "warning" | "danger") {
  if (tone === "success") return "border-[var(--success)] text-[var(--success)]";
  if (tone === "warning") return "border-[var(--warning)] text-[var(--warning)]";
  if (tone === "danger") return "border-[var(--danger)] text-[var(--danger)]";
  return "border-[var(--border-strong)] text-[var(--text-secondary)]";
}

function formatFreshness(value: string) {
  const milliseconds = Date.now() - Date.parse(value);
  if (!Number.isFinite(milliseconds) || milliseconds < 0) return "recently";
  if (milliseconds < 60_000) return "just now";
  const minutes = Math.floor(milliseconds / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

function errorTitle(code: string) {
  if (code === "updated_confirmation_required") return "Updated-version confirmation required";
  if (code === "item_has_active_export") return "An earlier saved version is still exporting";
  if (code === "prior_provider_outcome_blocks_recreate") return "A prior provider result needs review";
  if (code === "target_capacity_exhausted") return "Destination safety reserve reached";
  if (code === "limited_confirmation_required") return "Review the limited capture";
  if (code === "payload_too_large") return "This item is too large for a safe one-source export";
  return "NotebookLM export unavailable";
}

function errorDetail(code: string) {
  if (code === "updated_confirmation_required") return "Confirm that you want another source; the previous source remains unchanged.";
  if (code === "item_has_active_export") return "Finish or stop the existing request before exporting the newly saved version.";
  if (code === "prior_provider_outcome_blocks_recreate") return "AI Memory will not create a replacement after a possibly delivered or failed source. Rebind deliberately if you need a new destination.";
  if (code === "target_capacity_exhausted") return "Remove sources or deliberately configure another private destination. Nothing was sent.";
  if (code === "limited_confirmation_required") return "Review the exact saved preview before sending it.";
  if (code === "payload_too_large") return "AI Memory will not truncate or split the saved text.";
  return "Nothing new was sent. Check the connector and try again when the status is clear.";
}

function ineligibleTitle(reason: string | null) {
  if (reason === "payload_too_large") return "This item is too large for a safe one-source export";
  if (reason === "empty_body") return "No saved text is available to export";
  if (reason === "unsupported_capture") return "This capture is not eligible for copied-text export";
  return "Review this saved text before export";
}

function ineligibleDetail(reason: string | null) {
  if (reason === "payload_too_large") return "AI Memory will not truncate or split the saved text.";
  if (reason === "empty_body") return "Add or repair the saved text first.";
  if (reason === "unsupported_capture") return "Repair the capture with full saved text before exporting.";
  return "The saved capture needs explicit review.";
}
