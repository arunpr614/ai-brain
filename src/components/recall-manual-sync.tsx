"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle, Check, Clock3, RefreshCw, RotateCw, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  formatRecallCounts,
  formatRecallIst,
  type RecallManualSyncAccepted,
  type RecallManualSyncStatus,
} from "@/lib/recall/manual-sync-contract";

type Overlay = "requesting" | "unknown" | "offline" | "session" | null;

export function RecallManualSync({ initialStatus }: { initialStatus: RecallManualSyncStatus }) {
  const [status, setStatus] = useState(initialStatus);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [checkedAt, setCheckedAt] = useState(initialStatus.observedAt);
  const [tick, setTick] = useState(() => Date.parse(initialStatus.observedAt));
  const [hasPendingKey, setHasPendingKey] = useState(false);
  const [confirmedAcceptedRequestId, setConfirmedAcceptedRequestId] = useState<string | null>(null);
  const [cooldownRefreshPending, setCooldownRefreshPending] = useState(false);
  const [confirmedUnknownRequest, setConfirmedUnknownRequest] = useState<string | null>(null);
  const keyRef = useRef<string | null>(null);
  const sequence = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const submissionInFlight = useRef(false);
  const unknownSince = useRef<number | null>(null);
  const confirmedAcceptedRequestIdRef = useRef<string | null>(null);
  const serverClock = useRef({
    observedMs: Date.parse(initialStatus.observedAt),
    monotonicMs: monotonicNow(),
  });

  const refresh = useCallback(async () => {
    const seq = ++sequence.current;
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    try {
      const pendingKey = keyRef.current;
      const confirmedRequestId = confirmedAcceptedRequestIdRef.current;
      const lookupHeaders = recallStatusLookupHeaders(pendingKey, confirmedRequestId);
      const response = await fetch("/api/settings/recall-sync", {
        cache: "no-store",
        signal: abort.signal,
        headers: Object.keys(lookupHeaders).length ? lookupHeaders : undefined,
      });
      if (seq !== sequence.current) return;
      if (response.status === 401) {
        setOverlay("session");
        return;
      }
      if (!response.ok) throw new Error("status unavailable");
      const next = (await response.json()) as RecallManualSyncStatus;
      const nextObserved = Date.parse(next.observedAt);
      setStatus(next);
      setCheckedAt(next.observedAt);
      serverClock.current = { observedMs: nextObserved, monotonicMs: monotonicNow() };
      setTick(nextObserved);
      setCooldownRefreshPending(false);
      if (pendingKey) {
        const acknowledgement = next.idempotencyAcknowledgement;
        if (acknowledgement?.state === "active") {
          unknownSince.current = null;
          setOverlay(null);
        } else if (acknowledgement?.state === "terminal") {
          keyRef.current = null;
          unknownSince.current = null;
          setHasPendingKey(false);
          setOverlay(null);
        } else if (
          acknowledgement?.state === "absent" &&
          pendingAcknowledgementResolved(unknownSince.current, monotonicNow(), acknowledgement)
        ) {
          keyRef.current = null;
          unknownSince.current = null;
          setHasPendingKey(false);
          setOverlay(null);
        } else {
          setOverlay(navigator.onLine ? "unknown" : "offline");
        }
      } else if (confirmedRequestId) {
        const correlation = correlateConfirmedAcceptedRequest(confirmedRequestId, next);
        if (correlation === "terminal") {
          confirmedAcceptedRequestIdRef.current = null;
          setConfirmedAcceptedRequestId(null);
          setOverlay(null);
        } else if (correlation === "active") {
          setOverlay(null);
        } else {
          setOverlay(navigator.onLine ? "unknown" : "offline");
        }
      } else {
        setOverlay(null);
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        if (keyRef.current && unknownSince.current === null) unknownSince.current = monotonicNow();
        setOverlay(navigator.onLine ? "unknown" : "offline");
      }
    }
  }, []);

  const active = status.activity && ["queued", "queued_behind_automatic", "running_manual", "running_automatic"].includes(status.activity.state);
  useEffect(() => {
    const resolvingAmbiguity = (hasPendingKey || Boolean(confirmedAcceptedRequestId)) && overlay === "unknown";
    if ((!active && !resolvingAmbiguity) || overlay === "session" || overlay === "offline" || !navigator.onLine) return;
    let timer: ReturnType<typeof setInterval> | null = null;
    const update = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    if (document.visibilityState === "visible") timer = setInterval(update, 2_000);
    const visibility = () => {
      if (timer) clearInterval(timer);
      timer = null;
      if (document.visibilityState === "visible") {
        timer = setInterval(update, 2_000);
      }
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [active, confirmedAcceptedRequestId, hasPendingKey, overlay, refresh]);

  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    const offline = () => setOverlay("offline");
    const online = () => void refresh();
    const visible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("offline", offline);
    window.addEventListener("online", online);
    document.addEventListener("visibilitychange", visible);
    return () => {
      window.removeEventListener("offline", offline);
      window.removeEventListener("online", online);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [refresh]);
  useEffect(() => {
    if (status.retryAfterSeconds <= 0) return;
    const update = () => {
      const clock = serverClock.current;
      setTick(monotonicServerNow(clock.observedMs, clock.monotonicMs, monotonicNow()));
    };
    const timer = setInterval(update, 1_000);
    return () => clearInterval(timer);
  }, [status.retryAfterSeconds]);

  const cooldown = Math.max(
    0,
    Math.ceil((Date.parse(status.observedAt) + status.retryAfterSeconds * 1000 - tick) / 1000),
  );
  useEffect(() => {
    if (status.retryAfterSeconds <= 0 || cooldown > 0 || cooldownRefreshPending) return;
    const timer = setTimeout(() => {
      setCooldownRefreshPending(true);
      void refresh();
    }, 0);
    return () => clearTimeout(timer);
  }, [cooldown, cooldownRefreshPending, refresh, status.retryAfterSeconds]);
  const view = useMemo(
    () => viewFor(status, overlay, cooldown, tick, hasPendingKey, Boolean(confirmedAcceptedRequestId)),
    [status, overlay, cooldown, tick, hasPendingKey, confirmedAcceptedRequestId],
  );

  async function startSync() {
    if (!canBeginRecallSubmission(
      submissionInFlight.current,
      keyRef.current,
      confirmedAcceptedRequestIdRef.current,
    )) return;
    submissionInFlight.current = true;
    const key = keyRef.current ?? crypto.randomUUID();
    keyRef.current = key;
    setHasPendingKey(true);
    setDialogOpen(false);
    setOverlay("requesting");
    try {
      const response = await fetch("/api/settings/recall-sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ idempotencyKey: key }),
      });
      if (response.status === 401) {
        setOverlay("session");
        return;
      }
      if (response.status === 429) {
        keyRef.current = null;
        setHasPendingKey(false);
        await refresh();
        return;
      }
      if (response.status === 400 || response.status === 403 || response.status === 503) {
        keyRef.current = null;
        setHasPendingKey(false);
        setOverlay(response.status === 503 ? "unknown" : null);
        await refresh();
        return;
      }
      if (!response.ok) throw new Error("ambiguous response");
      const accepted = parseRecallAcceptedResponse(await response.json());
      if (!accepted) throw new Error("invalid acceptance response");
      confirmedAcceptedRequestIdRef.current = accepted.requestId;
      setConfirmedAcceptedRequestId(accepted.requestId);
      keyRef.current = null;
      setHasPendingKey(false);
      unknownSince.current = null;
      await refresh();
    } catch {
      if (unknownSince.current === null) unknownSince.current = monotonicNow();
      setOverlay(navigator.onLine ? "unknown" : "offline");
      await refresh();
    } finally {
      submissionInFlight.current = false;
    }
  }

  const busy = view.busy;
  const cooldownMustRefresh = status.retryAfterSeconds > 0 && cooldown === 0;
  const actionDisabled = busy || hasPendingKey || Boolean(confirmedAcceptedRequestId) || cooldownRefreshPending || cooldownMustRefresh || !status.available || cooldown > 0 || overlay === "offline" || overlay === "session";
  const action = overlay === "offline" && (hasPendingKey || confirmedAcceptedRequestId || hasActiveStatus(status))
    ? "Check again"
    : cooldown > 0
    ? `Try again in ${Math.floor(cooldown / 60)}:${String(cooldown % 60).padStart(2, "0")}`
    : status.activity && ["blocked", "error", "partial_failure", "expired"].includes(status.activity.state)
      ? "Try again"
      : "Sync now";
  const needsResultCheck = status.activity?.state === "error" && !status.activity.counts && status.activity.requestId !== confirmedUnknownRequest;

  return (
    <section className="mb-10" aria-labelledby="recall-sync-heading">
      <h2 id="recall-sync-heading" className="mb-3 text-sm font-medium uppercase tracking-wide text-[var(--text-secondary)]">
        Recall sync
      </h2>
      <div className="min-w-0 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
            <RotateCw className="h-4 w-4 shrink-0 text-[var(--text-muted)]" aria-hidden="true" />
            <span>Recall</span>
            <span className="text-xs font-normal text-[var(--text-secondary)]">Automatic import</span>
          </div>
          <span className="rounded-full border border-[var(--border-strong)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-secondary)]">
            {view.badge}
          </span>
        </div>

        <div className="mt-4 flex min-w-0 gap-3" aria-busy={busy}>
          <view.Icon className={`mt-0.5 h-5 w-5 shrink-0 ${view.tone} motion-reduce:animate-none ${view.spin ? "animate-spin" : ""}`} aria-hidden="true" />
          <div className="min-w-0">
            <p className="break-words text-sm font-semibold text-[var(--text-primary)]">{view.title}</p>
            <p className="mt-1 break-words text-sm leading-6 text-[var(--text-secondary)]">{view.detail}</p>
            {view.counts && <p className="mt-2 break-words text-xs font-medium text-[var(--text-primary)]">{view.counts}</p>}
          </div>
        </div>

        <dl className="mt-4 grid min-w-0 gap-3 border-t border-[var(--border)] pt-4 text-xs sm:grid-cols-2">
          <div className="min-w-0">
            <dt className="text-[var(--text-muted)]">{overlay ? "Last known successful sync" : "Last successful sync"}</dt>
            <dd className="mt-1 break-words text-[var(--text-primary)]">
              {status.lastSuccessfulSyncAt ? <time dateTime={status.lastSuccessfulSyncAt}>{formatRecallIst(status.lastSuccessfulSyncAt, tick)}</time> : "Not yet synced"}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[var(--text-muted)]">{overlay ? "Last known next automatic sync" : "Next automatic sync"}</dt>
            <dd className="mt-1 break-words text-[var(--text-primary)]">
              {status.nextAutomaticSyncAt && Date.parse(status.nextAutomaticSyncAt) > tick
                ? <time dateTime={status.nextAutomaticSyncAt}>{formatRecallIst(status.nextAutomaticSyncAt, tick)}</time>
                : "Schedule unavailable"}
            </dd>
          </div>
        </dl>
        {overlay && <p className="mt-3 text-xs text-[var(--text-muted)]">Last checked {formatRecallIst(checkedAt, tick)}</p>}

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          {overlay === "session" ? (
            <a href="/unlock?next=/settings" className="inline-flex min-h-11 items-center justify-center rounded-md bg-[var(--action-primary-bg)] px-4 text-sm font-medium text-[var(--action-primary-fg)]">
              Unlock
            </a>
          ) : overlay === "unknown" && (hasPendingKey || confirmedAcceptedRequestId) ? (
            <button type="button" onClick={() => void refresh()} className="inline-flex min-h-11 items-center justify-center rounded-md border border-[var(--border-strong)] px-4 text-sm font-medium text-[var(--text-primary)]">
              Check again
            </button>
          ) : needsResultCheck ? (
            <button type="button" onClick={() => { setConfirmedUnknownRequest(status.activity?.requestId ?? null); void refresh(); }} className="inline-flex min-h-11 items-center justify-center rounded-md border border-[var(--border-strong)] px-4 text-sm font-medium text-[var(--text-primary)]">
              Check again
            </button>
          ) : (
            <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
              <Dialog.Trigger asChild>
                <button
                  type="button"
                  disabled={actionDisabled}
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-[var(--action-primary-bg)] px-4 text-sm font-medium text-[var(--action-primary-fg)] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  {busy ? view.action : action}
                </button>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45" />
                <Dialog.Content
                  onPointerDownOutside={(event) => event.preventDefault()}
                  onInteractOutside={(event) => event.preventDefault()}
                  className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xl"
                >
                  <Dialog.Title className="pr-10 text-lg font-semibold text-[var(--text-primary)]">Sync Recall now?</Dialog.Title>
                  <Dialog.Description className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                    AI Memory will run the complete daily-sync safety checks and import only eligible items. You can leave Settings after it starts.
                  </Dialog.Description>
                  <Dialog.Close className="absolute right-3 top-3 inline-flex h-11 w-11 items-center justify-center rounded-md text-[var(--text-secondary)]" aria-label="Close confirmation">
                    <X className="h-5 w-5" aria-hidden="true" />
                  </Dialog.Close>
                  <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
                    <button autoFocus type="button" onClick={() => void startSync()} className="min-h-11 rounded-md bg-[var(--action-primary-bg)] px-4 text-sm font-medium text-[var(--action-primary-fg)]">
                      Start sync
                    </button>
                    <Dialog.Close className="min-h-11 rounded-md border border-[var(--border-strong)] px-4 text-sm font-medium text-[var(--text-primary)]">Cancel</Dialog.Close>
                  </div>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          )}
          <p className="text-xs text-[var(--text-muted)]">Uses daily-sync safety checks</p>
        </div>
        <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">{view.announcement}</p>
      </div>
    </section>
  );
}

function viewFor(
  status: RecallManualSyncStatus,
  overlay: Overlay,
  cooldown: number,
  now: number,
  hasPendingKey: boolean,
  hasConfirmedAcceptance: boolean,
) {
  if (overlay === "session") return view("Session expired", "Unlock AI Memory to check sync status. Server work is unchanged.", "Session expired", AlertTriangle, false, false);
  if (overlay === "requesting") return view("Requesting sync…", "Saving your request safely.", "Starting", RefreshCw, true, true, "Requesting…");
  if (overlay === "unknown") return hasConfirmedAcceptance
    ? view("Status temporarily unavailable", "Your accepted sync may still be continuing. Do not start another sync.", "Status unavailable", AlertTriangle, true, false, "Checking…")
    : view("Checking whether your request was accepted", "Do not start another sync yet.", "Status unavailable", AlertTriangle, true, false, "Checking…");
  if (overlay === "offline") return hasPendingKey || hasConfirmedAcceptance || hasActiveStatus(status)
    ? view("Status temporarily unavailable", "Your accepted sync may still be continuing. Values are last known.", "Status unavailable", AlertTriangle, false, false, "Check again")
    : view("You’re offline", "Connect to request a sync. Values are last known.", "Offline", AlertTriangle, false, false, "Offline");
  if (!status.available) return view("Manual sync is temporarily unavailable", "Daily sync is unchanged.", "Unavailable", AlertTriangle, false, false, "Unavailable");
  const a = status.activity;
  if (!a) return view("Recall is ready", "New eligible Recall items are imported automatically each day.", "Ready", Check, false, false);
  if (a.state === "queued_behind_automatic") return view("Waiting for the active sync", "Your request will start after the current sync.", "Queued", Clock3, true, false, "Queued");
  if (a.state === "queued") return view("Sync requested", "Waiting for the trusted worker. You can leave this page.", "Queued", Clock3, true, false, "Queued");
  if (a.state === "running_automatic") {
    const long = a.startedAt && now - Date.parse(a.startedAt) > 10 * 60 * 1000;
    return view(long ? "This is taking longer than usual" : "Automatic sync in progress", long ? "The daily Recall sync is still continuing. You can leave this page." : "Daily Recall synchronization is running.", "Syncing", RefreshCw, true, true, "Sync in progress");
  }
  if (a.state === "running_manual") {
    const long = a.startedAt && now - Date.parse(a.startedAt) > 10 * 60 * 1000;
    return view(long ? "This is taking longer than usual" : "Sync in progress", "Checking Recall and importing eligible items. You can leave this page.", "Syncing", RefreshCw, true, true, "Syncing…");
  }
  const counts = formatRecallCounts(a.counts);
  if (a.state === "done") return view(counts ? "Sync complete" : "You’re up to date", counts ? "Recall sync finished successfully." : "No new eligible Recall items were found.", counts ? "Complete" : "Up to date", Check, false, false, cooldown ? "Cooling down" : "Sync now", counts);
  if (a.state === "partial_failure") return view("Sync stopped early", "Some changes were saved. Retrying remains safe.", "Incomplete", AlertTriangle, false, false, cooldown ? "Cooling down" : "Try again", counts);
  if (a.state === "expired") return view("Request expired", "The worker did not start this request; no sync was run.", "Expired", AlertTriangle, false, false);
  if (a.state === "blocked") return view("Sync couldn’t start safely", "Nothing was imported.", "Needs attention", AlertTriangle, false, false);
  const unknown = !a.counts;
  return view(unknown ? "Sync stopped" : "Sync failed", unknown ? "The result could not be fully confirmed. Check status before retrying." : "The run stopped before any items were imported. Your library was not changed.", "Failed", AlertTriangle, false, false);
}

function view(title: string, detail: string, badge: string, Icon: typeof Check, busy: boolean, spin: boolean, action = "Sync now", counts = "") {
  return { title, detail, badge, Icon, busy, spin, action, counts, announcement: title, tone: badge === "Complete" || badge === "Up to date" || badge === "Ready" ? "text-[var(--success)]" : badge === "Failed" || badge === "Incomplete" ? "text-[var(--danger)]" : "text-[var(--warning)]" };
}

function hasActiveStatus(status: RecallManualSyncStatus): boolean {
  return Boolean(status.activity && ["queued", "queued_behind_automatic", "running_manual", "running_automatic"].includes(status.activity.state));
}

function monotonicNow(): number {
  return typeof performance === "undefined" ? 0 : performance.now();
}

export function monotonicServerNow(observedMs: number, monotonicBaselineMs: number, monotonicCurrentMs: number): number {
  return observedMs + Math.max(0, monotonicCurrentMs - monotonicBaselineMs);
}

export function pendingAcknowledgementResolved(
  unknownSinceMs: number | null,
  currentMonotonicMs: number,
  acknowledgement: NonNullable<RecallManualSyncStatus["idempotencyAcknowledgement"]>,
): boolean {
  if (acknowledgement.state === "active" || acknowledgement.state === "terminal") return true;
  return unknownSinceMs !== null && currentMonotonicMs - unknownSinceMs >= acknowledgement.resolutionAfterMs;
}

export function canBeginRecallSubmission(
  submissionInFlight: boolean,
  pendingKey: string | null,
  confirmedAcceptedRequestId: string | null = null,
): boolean {
  return !submissionInFlight && pendingKey === null && confirmedAcceptedRequestId === null;
}

export function parseRecallAcceptedResponse(value: unknown): RecallManualSyncAccepted | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<RecallManualSyncAccepted>;
  if (
    typeof candidate.requestId !== "string" ||
    !/^[A-Za-z0-9_-]{8,96}$/.test(candidate.requestId) ||
    (candidate.state !== "queued" && candidate.state !== "running") ||
    typeof candidate.deduplicated !== "boolean" ||
    typeof candidate.observedAt !== "string" ||
    !Number.isFinite(Date.parse(candidate.observedAt))
  ) return null;
  return candidate as RecallManualSyncAccepted;
}

export function correlateConfirmedAcceptedRequest(
  requestId: string,
  status: RecallManualSyncStatus,
): "missing" | "active" | "terminal" {
  const acknowledgement = status.requestAcknowledgement;
  if (!acknowledgement || acknowledgement.requestId !== requestId) return "missing";
  return acknowledgement.state === "active" ? "active" : acknowledgement.state === "terminal" ? "terminal" : "missing";
}

export function retainConfirmedAcceptedRequest(
  requestId: string,
  status: RecallManualSyncStatus | null,
): string | null {
  if (!status) return requestId;
  return correlateConfirmedAcceptedRequest(requestId, status) === "terminal" ? null : requestId;
}

export function recallStatusLookupHeaders(
  pendingKey: string | null,
  confirmedRequestId: string | null,
): Record<string, string> {
  return {
    ...(pendingKey ? { "x-recall-idempotency-key": pendingKey } : {}),
    ...(confirmedRequestId ? { "x-recall-request-id": confirmedRequestId } : {}),
  };
}
