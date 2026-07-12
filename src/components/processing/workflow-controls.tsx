"use client";

import { Archive, LoaderCircle, RotateCcw } from "lucide-react";
import { createContext, useContext, useEffect, useState } from "react";
import { mutateWorkflow, normalizeItem } from "./api";
import {
  STATUS_LABELS,
  WORKFLOW_STATUSES,
  type ProcessingItem,
  type WorkflowMutationResult,
  type WorkflowStatus,
} from "./types";

interface WorkflowControlsProps {
  item: ProcessingItem;
  onResult?: (result: WorkflowMutationResult, message: string) => void;
  onError?: (message: string, kind: "error" | "conflict" | "unknown") => void;
  compact?: boolean;
  writeEnabled?: boolean;
}

export const ProcessingWriteContext = createContext(false);

export function WorkflowControls({
  item,
  onResult,
  onError,
  compact = false,
  writeEnabled,
}: WorkflowControlsProps) {
  const configuredWrite = useContext(ProcessingWriteContext);
  const canWrite = writeEnabled ?? configuredWrite;
  const [pending, setPending] = useState(false);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  const act = async (
    action:
      | { type: "move"; status: WorkflowStatus }
      | { type: "archive" }
      | { type: "restore" }
      | { type: "reprocess" },
    success: string,
  ) => {
    if (pending || !online || !canWrite) return;
    setPending(true);
    try {
      const result = await mutateWorkflow(item, action);
      onResult?.(result, result.changed ? success : `${item.title} is already ${STATUS_LABELS[item.workflowStatus]}.`);
    } catch (error) {
      const status = Number((error as { status?: number }).status);
      const kind = status === 409 ? "conflict" : status === 503 ? "unknown" : "error";
      onError?.(
        kind === "conflict"
          ? `${item.title} changed in another session. Refresh to use the current version.`
          : kind === "unknown"
            ? `Checking whether ${item.title} was changed. Refresh before trying again.`
            : `${item.title} was not changed. Try again.`,
        kind,
      );
    } finally {
      setPending(false);
    }
  };

  const disabled = pending || !online || !canWrite;

  if (item.archivedAt) {
    return (
      <div className={compact ? "flex flex-wrap gap-2" : "flex flex-col gap-2"}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => act({ type: "restore" }, `${item.title} restored to Done.`)}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-[var(--border-strong)] px-3 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-raised)] disabled:cursor-not-allowed disabled:opacity-50 md:min-h-9"
        >
          {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
          Restore to Done
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => act({ type: "reprocess" }, `${item.title} returned to Inbox.`)}
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-[var(--action-primary-bg)] px-3 text-xs font-medium text-[var(--action-primary-fg)] hover:bg-[var(--action-primary-bg-hover)] disabled:cursor-not-allowed disabled:opacity-50 md:min-h-9"
        >
          Reprocess to Inbox
        </button>
        {!online ? <OfflineReason /> : !canWrite ? <ReadOnlyReason /> : null}
      </div>
    );
  }

  return (
    <div className={compact ? "flex flex-wrap items-center gap-2" : "flex flex-col gap-2"}>
      <label className={compact ? "contents" : "text-xs font-medium text-[var(--text-secondary)]"}>
        <span className={compact ? "sr-only" : ""}>Move {item.title} to</span>
        <select
          value={item.workflowStatus}
          disabled={disabled}
          aria-label={`Move ${item.title} to`}
          onChange={(event) => {
            const next = event.currentTarget.value as WorkflowStatus;
            void act({ type: "move", status: next }, `${item.title} moved to ${STATUS_LABELS[next]}.`);
          }}
          className={`${compact ? "ml-0" : "mt-1"} min-h-11 rounded-md border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-xs font-medium text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50 md:min-h-9`}
        >
          {WORKFLOW_STATUSES.map((value) => (
            <option key={value} value={value}>
              {STATUS_LABELS[value]}
            </option>
          ))}
        </select>
      </label>
      {item.workflowStatus === "done" && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => act({ type: "archive" }, `${item.title} archived from Processing.`)}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-[var(--border-strong)] px-3 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-raised)] disabled:cursor-not-allowed disabled:opacity-50 md:min-h-9"
        >
          {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
          Archive from Processing
        </button>
      )}
      {pending && <span className="text-xs text-[var(--text-muted)]">Saving confirmed state…</span>}
      {!online ? <OfflineReason /> : !canWrite ? <ReadOnlyReason /> : null}
    </div>
  );
}

function OfflineReason() {
  return (
    <p className="w-full text-xs text-[var(--warning)]">
      Connect to change Processing status. Loaded sources remain available.
    </p>
  );
}

function ReadOnlyReason() {
  return <p className="w-full text-xs text-[var(--text-muted)]">Processing is currently read-only. Sources and notes remain unchanged.</p>;
}

export function ItemWorkflowSection({ itemId, itemTitle, writeEnabled = false }: { itemId: string; itemTitle: string; writeEnabled?: boolean }) {
  const [item, setItem] = useState<ProcessingItem | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "unavailable">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/items/${encodeURIComponent(itemId)}/workflow`, {
      cache: "no-store",
      credentials: "same-origin",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then((body: unknown) => {
        const raw = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
        const data = raw.data && typeof raw.data === "object" ? raw.data : raw;
        const projection = (data as Record<string, unknown>).item ?? (data as Record<string, unknown>).projection ?? data;
        setItem(normalizeItem({ ...(projection as Record<string, unknown>), title: itemTitle }));
        setState("ready");
      })
      .catch((error) => {
        if ((error as { name?: string }).name !== "AbortError") setState("unavailable");
      });
    return () => controller.abort();
  }, [itemId, itemTitle]);

  if (state === "loading") {
    return <p className="text-xs text-[var(--text-muted)]">Checking Processing status…</p>;
  }
  if (!item || state === "unavailable") {
    return (
      <p className="text-xs leading-5 text-[var(--text-secondary)]">
        Processing is unavailable. This does not change the source or your notes.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="rounded-full border border-[var(--control-selected-border)] bg-[var(--control-selected-bg)] px-2.5 py-1 text-xs font-medium text-[var(--control-selected-fg)]">
          {item.archivedAt ? "Archived" : STATUS_LABELS[item.workflowStatus]}
        </span>
        <span className="text-[11px] text-[var(--text-muted)]">v{item.workflowVersion}</span>
      </div>
      <WorkflowControls
        item={{ ...item, title: item.title || itemTitle }}
        writeEnabled={writeEnabled}
        onResult={(result, nextMessage) => {
          setItem(result.item);
          setMessage(nextMessage);
        }}
        onError={(nextMessage) => setMessage(nextMessage)}
      />
      {message && <p className="mt-3 text-xs leading-5 text-[var(--text-secondary)]">{message}</p>}
      <p className="mt-3 text-[11px] leading-5 text-[var(--text-muted)]">
        Processing changes never save, clear, or submit My notes.
      </p>
    </div>
  );
}
