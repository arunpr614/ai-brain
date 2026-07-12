"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { CheckCircle2, Database, LoaderCircle, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { ProcessingEnrollmentJobDto, ProcessingEnrollmentMode } from "@/lib/processing/types";
import { fetchEnrollmentJob, mutateEnrollmentJob, startEnrollment } from "./api";

export function EnrollmentDialog({ writeEnabled, onComplete }: { writeEnabled: boolean; onComplete: () => void }) {
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ProcessingEnrollmentMode>("recent");
  const [job, setJob] = useState<ProcessingEnrollmentJobDto | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const selectedRequested = searchParams.get("enroll") === "selected";

  useEffect(() => {
    if (!selectedRequested) return;
    queueMicrotask(() => {
      try {
        const raw = window.sessionStorage.getItem("processing-enrollment-selected");
        const values = raw ? JSON.parse(raw) : [];
        const ids = Array.isArray(values) ? values.filter((value): value is string => typeof value === "string").slice(0, 100) : [];
        setSelectedIds(ids);
        setMode(ids.length > 0 ? "selected" : "recent");
        setOpen(true);
      } catch {
        setOpen(true);
      }
    });
  }, [selectedRequested]);

  useEffect(() => {
    if (!open || !job || !["previewing", "confirmed", "running", "cancel_requested"].includes(job.state)) return;
    const timer = window.setInterval(() => {
      void fetchEnrollmentJob(job.id)
        .then((next) => {
          setJob(next);
          if (next.state === "completed") {
            window.sessionStorage.removeItem("processing-enrollment-selected");
            onComplete();
          }
        })
        .catch(() => setError("Enrollment status could not be refreshed. You can safely retry status."));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [job, onComplete, open]);

  const progress = useMemo(() => {
    if (!job?.frozenCount) return 0;
    return Math.min(100, Math.round((job.processedCount / job.frozenCount) * 100));
  }, [job]);

  const preview = async () => {
    setBusy(true);
    setError("");
    try {
      setJob(await startEnrollment(mode, selectedIds));
    } catch (cause) {
      setError((cause as Error).message || "Preview could not be created. No sources were changed.");
    } finally {
      setBusy(false);
    }
  };

  const act = async (action: "confirm" | "cancel" | "retry") => {
    if (!job) return;
    setBusy(true);
    setError("");
    try {
      const result = await mutateEnrollmentJob(job, action);
      setJob(result.job);
      if (result.job.state === "completed") onComplete();
    } catch (cause) {
      setError((cause as Error).message || "The enrollment job was not changed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(next) => { setOpen(next); if (!next && job?.state !== "completed") setError(""); }}>
      <Dialog.Trigger asChild>
        <button type="button" disabled={!writeEnabled} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-[var(--border-strong)] bg-[var(--surface)] px-4 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-raised)] disabled:cursor-not-allowed disabled:opacity-50">
          <Database className="h-4 w-4" /> Add existing sources
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[calc(100%-1.5rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-lg)]">
          <Dialog.Title className="pr-12 text-lg font-semibold text-[var(--text-primary)]">Add existing sources</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">Preview an exact frozen set before anything enters Processing. Capture dates do not become fake Processing dates.</Dialog.Description>
          <Dialog.Close aria-label="Close enrollment" className="absolute right-3 top-3 inline-flex h-11 w-11 items-center justify-center rounded-md text-[var(--text-secondary)]"><X className="h-5 w-5" /></Dialog.Close>

          {!job ? (
            <fieldset className="mt-5 space-y-2">
              <legend className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Choose sources</legend>
              <EnrollmentChoice value="recent" current={mode} onChange={setMode} title="Recent captures" detail="Newest 25 sources captured in the last 30 owner-local days." />
              <EnrollmentChoice value="all" current={mode} onChange={setMode} title="All existing sources" detail="Every dormant Library source. Large sets run in resumable batches." />
              <EnrollmentChoice value="selected" current={mode} onChange={setMode} disabled={selectedIds.length === 0} title={selectedIds.length > 0 ? `${selectedIds.length} selected sources` : "Selected Library sources"} detail={selectedIds.length > 0 ? "The exact selection carried from Library." : "Select sources in Library first, then choose Add to Processing."} />
              <button type="button" disabled={busy || (mode === "selected" && selectedIds.length === 0)} onClick={() => void preview()} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-[var(--action-primary-bg)] px-4 text-sm font-semibold text-[var(--action-primary-fg)] disabled:opacity-50">{busy && <LoaderCircle className="h-4 w-4 animate-spin" />} Preview exact set</button>
            </fieldset>
          ) : (
            <EnrollmentJob job={job} progress={progress} busy={busy} onAction={(action) => void act(action)} onNew={() => setJob(null)} />
          )}

          {error && <p role="alert" className="mt-4 rounded-md border border-[var(--danger)] p-3 text-sm text-[var(--text-secondary)]">{error}</p>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function EnrollmentChoice({ value, current, onChange, title, detail, disabled = false }: { value: ProcessingEnrollmentMode; current: ProcessingEnrollmentMode; onChange: (value: ProcessingEnrollmentMode) => void; title: string; detail: string; disabled?: boolean }) {
  return <label className={`flex min-h-[60px] items-start gap-3 rounded-md border border-[var(--border)] p-3 ${disabled ? "cursor-not-allowed opacity-55" : "cursor-pointer hover:border-[var(--border-strong)]"}`}><input type="radio" name="enrollment-mode" value={value} checked={current === value} disabled={disabled} onChange={() => onChange(value)} className="mt-1 h-4 w-4 accent-[var(--accent-9)]" /><span><span className="block text-sm font-semibold text-[var(--text-primary)]">{title}</span><span className="mt-0.5 block text-xs leading-5 text-[var(--text-secondary)]">{detail}</span></span></label>;
}

function EnrollmentJob({ job, progress, busy, onAction, onNew }: { job: ProcessingEnrollmentJobDto; progress: number; busy: boolean; onAction: (action: "confirm" | "cancel" | "retry") => void; onNew: () => void }) {
  if (job.state === "preview_ready" && job.frozenCount === 0) return <div className="mt-5 text-center"><CheckCircle2 className="mx-auto h-7 w-7 text-[var(--success)]" /><p className="mt-3 text-lg font-semibold text-[var(--text-primary)]">No existing sources to add</p><p className="mt-1 text-sm text-[var(--text-secondary)]">Every source in this preview is already enrolled or no longer eligible. Nothing changed.</p><button type="button" onClick={onNew} className="mt-4 min-h-11 w-full rounded-md border border-[var(--border-strong)] text-sm font-medium text-[var(--text-primary)]">Choose another preview</button></div>;
  if (job.state === "preview_ready") return <div className="mt-5"><p className="text-sm font-semibold text-[var(--text-primary)]">{job.frozenCount ?? 0} sources ready to add</p><p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">Frozen at {new Date(job.previewAsOfUtc).toLocaleString()} · {job.ownerTimezone}. Nothing has changed yet.</p><div className="mt-4 flex gap-2"><button type="button" disabled={busy} onClick={() => onAction("cancel")} className="min-h-11 flex-1 rounded-md border border-[var(--border-strong)] text-sm font-medium text-[var(--text-primary)]">Cancel</button><button type="button" disabled={busy} onClick={() => onAction("confirm")} className="min-h-11 flex-1 rounded-md bg-[var(--action-primary-bg)] text-sm font-semibold text-[var(--action-primary-fg)]">Confirm</button></div></div>;
  if (job.state === "completed") return <div className="mt-5 text-center"><CheckCircle2 className="mx-auto h-7 w-7 text-[var(--success)]" /><p className="mt-3 text-lg font-semibold text-[var(--text-primary)]">Existing sources added</p><p className="mt-1 text-sm text-[var(--text-secondary)]">{job.enrolledCount} enrolled · {job.alreadyEnrolledCount} already present · {job.deletedCount} no longer available.</p><Dialog.Close className="mt-4 min-h-11 w-full rounded-md bg-[var(--action-primary-bg)] text-sm font-semibold text-[var(--action-primary-fg)]">Open Inbox</Dialog.Close></div>;
  if (job.state === "failed") return <div className="mt-5"><p className="text-sm font-semibold text-[var(--danger)]">Enrollment paused safely</p><p className="mt-1 text-xs text-[var(--text-secondary)]">{job.processedCount} of {job.frozenCount ?? 0} checked. Resume continues the frozen set; it does not duplicate completed work.</p><div className="mt-4 flex gap-2"><button type="button" onClick={onNew} className="min-h-11 flex-1 rounded-md border border-[var(--border-strong)] text-sm">New preview</button><button type="button" disabled={busy || job.attempts >= 5} onClick={() => onAction("retry")} className="min-h-11 flex-1 rounded-md bg-[var(--action-primary-bg)] text-sm font-semibold text-[var(--action-primary-fg)]">Resume</button></div></div>;
  if (job.state === "cancelled" || job.state === "expired") return <div className="mt-5"><p className="text-sm font-semibold text-[var(--text-primary)]">{job.state === "expired" ? "Preview expired" : "Enrollment cancelled"}</p><p className="mt-1 text-xs text-[var(--text-secondary)]">Create a new frozen preview when you are ready.</p><button type="button" onClick={onNew} className="mt-4 min-h-11 w-full rounded-md border border-[var(--border-strong)] text-sm font-medium">Create new preview</button></div>;
  return <div className="mt-5"><div className="flex items-center justify-between text-sm"><span className="font-semibold text-[var(--text-primary)]">{job.state === "previewing" ? "Preparing exact preview…" : job.state === "cancel_requested" ? "Stopping after this batch…" : "Adding sources…"}</span><span className="text-[var(--text-muted)]">{job.processedCount}/{job.frozenCount ?? "—"}</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--surface-raised)]"><div className="h-full bg-[var(--accent-9)]" style={{ width: `${progress}%` }} /></div><p className="mt-2 text-xs text-[var(--text-secondary)]">You can close this dialog safely. Progress is durable and resumable.</p>{job.state !== "previewing" && <button type="button" disabled={busy || job.state === "cancel_requested"} onClick={() => onAction("cancel")} className="mt-4 min-h-11 w-full rounded-md border border-[var(--border-strong)] text-sm font-medium disabled:opacity-50">Cancel at batch boundary</button>}</div>;
}
