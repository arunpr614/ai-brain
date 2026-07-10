"use client";

import {
  AlertTriangle,
  Bold,
  Check,
  Code2,
  Copy,
  Download,
  Eye,
  Heading2,
  History,
  Italic,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  LockKeyhole,
  Minus,
  Pencil,
  Quote,
  RotateCcw,
  Save,
  Strikethrough,
  Trash2,
  WifiOff,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { applyNoteFormat, type NoteFormat } from "@/lib/notes/formatting";
import {
  deleteJournal,
  listRecoverableJournals,
  putLatestJournal,
  type LocalEditorJournal,
} from "@/lib/notes/local-journal";
import {
  mergeQueuedNoteSave,
  type QueuedNoteOperation,
  type QueuedNoteSave,
} from "@/lib/notes/save-queue";

const NOTE_MAX_BYTES = 102_400;
const NOTE_WARNING_BYTES = 92_160;

type SaveStatus =
  | "loading"
  | "saved"
  | "saving-locally"
  | "unsaved"
  | "saving"
  | "offline"
  | "failed"
  | "conflict"
  | "session-expired"
  | "oversize";

interface NoteApiSnapshot {
  state: {
    epoch: number;
    generation: number;
    deleted: boolean;
    updatedAt: number;
  } | null;
  note: {
    contentMarkdown: string;
    contentHash: string;
    bytes: number;
    includeInAi: boolean;
    indexedGeneration: number;
    lastSavedKind: string;
    createdAt: number;
    updatedAt: number;
  } | null;
}

interface NoteApiMutation extends NoteApiSnapshot {
  replayed: boolean;
}

interface ConflictState {
  current: NoteApiSnapshot;
  draft: string;
}

interface ProviderConsent {
  fingerprint: string;
  label: string;
  purpose: string;
}

function newMutationId(): string {
  return crypto.randomUUID();
}

async function hashMarkdown(value: string): Promise<string> {
  const canonical = value
    .replace(/\r\n?/g, "\n")
    .normalize("NFC")
    .replace(/\u0000/g, "")
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
  const bytes = new TextEncoder().encode(canonical);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function safePreviewUrl(value: string): string {
  try {
    const parsed = new URL(value);
    return ["http:", "https:", "mailto:"].includes(parsed.protocol) ? value : "";
  } catch {
    return "";
  }
}

function statusCopy(status: SaveStatus): string {
  switch (status) {
    case "loading":
      return "Loading note";
    case "saved":
      return "Saved";
    case "saving-locally":
      return "Saving on this device";
    case "unsaved":
      return "Saved locally · server save pending";
    case "saving":
      return "Saving";
    case "offline":
      return "Offline · saved on this device";
    case "failed":
      return "Save failed · retry available";
    case "conflict":
      return "Conflict · both versions kept";
    case "session-expired":
      return "Session expired · draft kept on this device";
    case "oversize":
      return "Over 100 KiB · copy or shorten to save";
  }
}

const TOOLBAR: Array<{
  format: NoteFormat;
  label: string;
  icon: typeof Bold;
}> = [
  { format: "bold", label: "Bold", icon: Bold },
  { format: "italic", label: "Italic", icon: Italic },
  { format: "strike", label: "Strikethrough", icon: Strikethrough },
  { format: "h2", label: "Heading", icon: Heading2 },
  { format: "bullet", label: "Bulleted list", icon: List },
  { format: "ordered", label: "Numbered list", icon: ListOrdered },
  { format: "task", label: "Task list", icon: ListChecks },
  { format: "quote", label: "Quote", icon: Quote },
  { format: "inline-code", label: "Inline code", icon: Code2 },
  { format: "link", label: "Link", icon: Link2 },
  { format: "rule", label: "Horizontal rule", icon: Minus },
];

export function ManualNoteEditor({
  itemId,
  compact = false,
}: {
  itemId: string;
  compact?: boolean;
}) {
  const generatedEditorId = useId();
  const [editorInstanceId] = useState(generatedEditorId);
  const editorIdRef = useRef(generatedEditorId);
  const [snapshot, setSnapshot] = useState<NoteApiSnapshot>({ state: null, note: null });
  const snapshotRef = useRef(snapshot);
  const [content, setContent] = useState("");
  const contentRef = useRef("");
  const [mode, setMode] = useState<"write" | "preview">("write");
  const [status, setStatus] = useState<SaveStatus>("loading");
  const [localRecoveryAvailable, setLocalRecoveryAvailable] = useState(true);
  const [recoveries, setRecoveries] = useState<LocalEditorJournal[]>([]);
  const [conflict, setConflict] = useState<ConflictState | null>(null);
  const [consentRequired, setConsentRequired] = useState<ProviderConsent[]>([]);
  const [recreating, setRecreating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [versions, setVersions] = useState<
    Array<{ id: string; sourceGeneration: number; saveKind: string; createdAt: number }>
  >([]);
  const [notice, setNotice] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const composingRef = useRef(false);
  const journalRef = useRef<LocalEditorJournal | null>(null);
  const localSequenceRef = useRef(0);
  const journalQueueRef = useRef<Promise<unknown>>(Promise.resolve());
  const inFlightRef = useRef(false);
  const queuedSaveRef = useRef<QueuedNoteSave | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRef = useRef<(manual?: boolean, operation?: QueuedNoteOperation) => Promise<void>>(
    async () => {},
  );
  const channelRef = useRef<BroadcastChannel | null>(null);

  const bytes = useMemo(() => byteLength(content), [content]);

  const applySnapshot = useCallback((next: NoteApiSnapshot) => {
    snapshotRef.current = next;
    setSnapshot(next);
  }, []);

  useEffect(() => {
    editorIdRef.current = crypto.randomUUID();
  }, []);

  useEffect(() => {
    if (!editorInstanceId) return;
    let cancelled = false;
    Promise.all([
      fetch(`/api/items/${itemId}/note`, { cache: "no-store" }).then(async (response) => {
        if (response.status === 401) throw new Error("SESSION_EXPIRED");
        if (!response.ok) throw new Error("NOTE_LOAD_FAILED");
        return (await response.json()) as NoteApiSnapshot;
      }),
      listRecoverableJournals(itemId).catch(() => {
        setLocalRecoveryAvailable(false);
        return [] as LocalEditorJournal[];
      }),
    ])
      .then(([server, drafts]) => {
        if (cancelled) return;
        applySnapshot(server);
        const initial = server.note?.contentMarkdown ?? "";
        contentRef.current = initial;
        setContent(initial);
        setRecoveries(drafts.filter((draft) => draft.editorInstanceId !== editorInstanceId));
        setStatus("saved");
      })
      .catch((error) => {
        if (cancelled) return;
        if (error instanceof Error && error.message === "SESSION_EXPIRED") {
          setStatus("session-expired");
        } else {
          setStatus("failed");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [applySnapshot, editorInstanceId, itemId]);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel("brain-manual-notes-v2");
    channelRef.current = channel;
    channel.onmessage = (event: MessageEvent<{ itemId?: string; generation?: number; deleted?: boolean }>) => {
      if (event.data.itemId !== itemId) return;
      const known = snapshotRef.current.state?.generation ?? -1;
      if ((event.data.generation ?? -1) > known) {
        setNotice(
          event.data.deleted
            ? "This note was deleted in another tab. Your local draft is still available to copy."
            : "A newer saved version exists in another tab. Saving will open conflict review.",
        );
      }
    };
    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, [itemId]);

  const persistDraft = useCallback(
    (nextContent: string, state: LocalEditorJournal["state"] = "dirty") => {
      const editorId = editorIdRef.current;
      if (!editorId) return Promise.resolve(null);
      const sequence = ++localSequenceRef.current;
      const task = async () => {
        const contentHash = await hashMarkdown(nextContent);
        const currentState = snapshotRef.current.state;
        const record: LocalEditorJournal = {
          itemId,
          editorInstanceId: editorId,
          localSequence: sequence,
          epoch: currentState?.epoch ?? null,
          baseGeneration: currentState?.generation ?? null,
          contentMarkdown: nextContent,
          contentHash,
          mutationId: newMutationId(),
          state,
          updatedAt: Date.now(),
        };
        const accepted = await putLatestJournal(record);
        if (accepted.localSequence === sequence) journalRef.current = accepted;
        return accepted;
      };
      const queued = journalQueueRef.current.then(task, task);
      journalQueueRef.current = queued.catch(() => undefined);
      return queued.catch(() => {
        setLocalRecoveryAvailable(false);
        return null;
      });
    },
    [itemId],
  );

  const scheduleAutosave = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => void saveRef.current(false), 750);
    if (!maxTimerRef.current) {
      maxTimerRef.current = setTimeout(() => {
        maxTimerRef.current = null;
        void saveRef.current(false);
      }, 5_000);
    }
  }, []);

  const updateContent = useCallback(
    (nextContent: string) => {
      contentRef.current = nextContent;
      setContent(nextContent);
      setConflict(null);
      setNotice(null);
      const nextBytes = byteLength(nextContent);
      setStatus(nextBytes > NOTE_MAX_BYTES ? "oversize" : "saving-locally");
      void persistDraft(nextContent).then((stored) => {
        if (!stored || contentRef.current !== nextContent) return;
        if (nextBytes <= NOTE_MAX_BYTES) {
          setStatus(navigator.onLine ? "unsaved" : "offline");
          scheduleAutosave();
        }
      });
    },
    [persistDraft, scheduleAutosave],
  );

  const performSave = useCallback(
    async (manual = false, operation: QueuedNoteOperation = "save") => {
      if (byteLength(contentRef.current) > NOTE_MAX_BYTES) {
        setStatus("oversize");
        return;
      }
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
      if (maxTimerRef.current) clearTimeout(maxTimerRef.current);
      maxTimerRef.current = null;
      await journalQueueRef.current;
      let journal = journalRef.current;
      if (!journal || journal.contentMarkdown !== contentRef.current) {
        journal = await persistDraft(contentRef.current);
      }
      if (!journal) {
        if (!navigator.onLine) setStatus("offline");
        else setStatus("failed");
        return;
      }
      if (inFlightRef.current) {
        queuedSaveRef.current = mergeQueuedNoteSave(queuedSaveRef.current, {
          manual,
          operation,
        });
        return;
      }
      if (!navigator.onLine) {
        setStatus("offline");
        return;
      }

      inFlightRef.current = true;
      setStatus("saving");
      const sent = { ...journal, state: "in_flight" as const, updatedAt: Date.now() };
      journalRef.current = sent;
      await putLatestJournal(sent).catch(() => setLocalRecoveryAvailable(false));
      const base = snapshotRef.current.state;
      try {
        const response = await fetch(`/api/items/${itemId}/note`, {
          method: "PUT",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            editorInstanceId: sent.editorInstanceId,
            mutationId: sent.mutationId,
            epoch: base?.epoch ?? null,
            baseGeneration: base?.generation ?? null,
            contentMarkdown: sent.contentMarkdown,
            contentHash: sent.contentHash,
            saveKind: manual ? "manual" : "auto",
            operation,
          }),
        });
        if (response.status === 401) {
          setStatus("session-expired");
          return;
        }
        const payload = (await response.json()) as
          | NoteApiMutation
          | { error: string; current?: NoteApiSnapshot; providers?: ProviderConsent[] };
        if (response.status === 409 && "current" in payload && payload.current) {
          const conflicted = { ...sent, state: "conflict" as const, updatedAt: Date.now() };
          journalRef.current = conflicted;
          await putLatestJournal(conflicted).catch(() => setLocalRecoveryAvailable(false));
          setConflict({ current: payload.current, draft: sent.contentMarkdown });
          setStatus("conflict");
          return;
        }
        if (!response.ok || !("state" in payload)) {
          setStatus(response.status === 413 ? "oversize" : "failed");
          return;
        }
        applySnapshot(payload);
        channelRef.current?.postMessage({
          itemId,
          generation: payload.state?.generation,
          deleted: payload.state?.deleted,
        });
        const latest = journalRef.current;
        if (latest?.mutationId === sent.mutationId) {
          const acknowledged: LocalEditorJournal = {
            ...sent,
            state: "acknowledged",
            acknowledgedHash: sent.contentHash,
            epoch: payload.state?.epoch ?? null,
            baseGeneration: payload.state?.generation ?? null,
            updatedAt: Date.now(),
          };
          journalRef.current = acknowledged;
          await putLatestJournal(acknowledged).catch(() => setLocalRecoveryAvailable(false));
          setStatus("saved");
        } else if (latest) {
          const rebased: LocalEditorJournal = {
            ...latest,
            epoch: payload.state?.epoch ?? null,
            baseGeneration: payload.state?.generation ?? null,
            mutationId: newMutationId(),
            state: "dirty",
            updatedAt: Date.now(),
          };
          journalRef.current = rebased;
          await putLatestJournal(rebased).catch(() => setLocalRecoveryAvailable(false));
          queuedSaveRef.current ??= { manual: false, operation: "save" };
          setStatus("unsaved");
        }
      } catch {
        setStatus(navigator.onLine ? "failed" : "offline");
      } finally {
        inFlightRef.current = false;
        const queued = queuedSaveRef.current;
        if (queued) {
          queuedSaveRef.current = null;
          queueMicrotask(() => void saveRef.current(queued.manual, queued.operation));
        }
      }
    },
    [applySnapshot, itemId, persistDraft],
  );

  useEffect(() => {
    saveRef.current = performSave;
  }, [performSave]);

  useEffect(() => {
    const online = () => {
      if (journalRef.current && journalRef.current.state !== "acknowledged") {
        void saveRef.current(false);
      }
    };
    window.addEventListener("online", online);
    return () => window.removeEventListener("online", online);
  }, []);

  useEffect(
    () => () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (maxTimerRef.current) clearTimeout(maxTimerRef.current);
    },
    [],
  );

  const formatSelection = (format: NoteFormat) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const edit = applyNoteFormat(
      contentRef.current,
      textarea.selectionStart,
      textarea.selectionEnd,
      format,
    );
    updateContent(edit.value);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(edit.selectionStart, edit.selectionEnd);
    });
  };

  const onEditorKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      void performSave(true);
    }
  };

  const chooseSavedVersion = async () => {
    if (!conflict) return;
    const saved = conflict.current.note?.contentMarkdown ?? "";
    contentRef.current = saved;
    setContent(saved);
    applySnapshot(conflict.current);
    const currentId = editorIdRef.current;
    if (currentId) await deleteJournal(itemId, currentId).catch(() => undefined);
    journalRef.current = null;
    setConflict(null);
    setStatus("saved");
  };

  const keepDraft = async () => {
    if (!conflict) return;
    applySnapshot(conflict.current);
    contentRef.current = conflict.draft;
    setContent(conflict.draft);
    setConflict(null);
    setStatus("saving-locally");
    await persistDraft(conflict.draft);
    await performSave(true);
  };

  const resumeRecovery = (draft: LocalEditorJournal) => {
    editorIdRef.current = draft.editorInstanceId;
    localSequenceRef.current = draft.localSequence;
    journalRef.current = draft;
    contentRef.current = draft.contentMarkdown;
    setContent(draft.contentMarkdown);
    setRecoveries((rows) => rows.filter((row) => row.editorInstanceId !== draft.editorInstanceId));
    setStatus(draft.state === "conflict" ? "conflict" : "unsaved");
  };

  const copyText = async (value: string, message: string) => {
    await navigator.clipboard.writeText(value);
    setNotice(message);
  };

  const setAiPolicy = async (includeInAi: boolean, afterConsent = false) => {
    const base = snapshotRef.current.state;
    if (!base || !snapshotRef.current.note) return;
    try {
      const response = await fetch(`/api/items/${itemId}/note/ai-policy`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          editorInstanceId: editorIdRef.current,
          mutationId: newMutationId(),
          epoch: base.epoch,
          baseGeneration: base.generation,
          includeInAi,
        }),
      });
      const payload = await response.json();
      if (response.status === 409 && payload.error === "NOTE_AI_CONSENT_REQUIRED") {
        setConsentRequired(payload.providers ?? []);
        return;
      }
      if (!response.ok) throw new Error(payload.error ?? "AI policy failed");
      applySnapshot(payload as NoteApiMutation);
      setConsentRequired([]);
      setNotice(
        includeInAi
          ? afterConsent
            ? "Provider permission saved. Your note can now improve Ask and connections."
            : "Your note can now improve Ask and connections."
          : "Your note is excluded from AI immediately. Exact search still works.",
      );
    } catch {
      setNotice("AI preference could not be saved. Your note text is unchanged.");
    }
  };

  const approveProvidersAndEnable = async () => {
    try {
      for (const provider of consentRequired) {
        const response = await fetch("/api/settings/note-ai-consent", {
          method: "POST",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ fingerprint: provider.fingerprint, approved: true }),
        });
        if (!response.ok) throw new Error("Consent failed");
      }
      await setAiPolicy(true, true);
    } catch {
      setNotice("Provider permission was not saved. No note text was sent.");
    }
  };

  const deleteNote = async () => {
    const base = snapshotRef.current.state;
    if (!base || !snapshotRef.current.note) return;
    try {
      const response = await fetch(`/api/items/${itemId}/note`, {
        method: "DELETE",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          editorInstanceId: editorIdRef.current,
          mutationId: newMutationId(),
          epoch: base.epoch,
          baseGeneration: base.generation,
        }),
      });
      if (!response.ok) throw new Error("Delete failed");
      const deleted: NoteApiSnapshot = {
        state: {
          ...base,
          generation: Number(response.headers.get("x-note-generation") ?? base.generation + 1),
          deleted: true,
          updatedAt: Date.now(),
        },
        note: null,
      };
      applySnapshot(deleted);
      channelRef.current?.postMessage({
        itemId,
        generation: deleted.state?.generation,
        deleted: true,
      });
      if (editorIdRef.current) {
        await deleteJournal(itemId, editorIdRef.current).catch(() => undefined);
      }
      journalRef.current = null;
      contentRef.current = "";
      setContent("");
      setDeleteConfirm(false);
      setRecreating(false);
      setStatus("saved");
      setNotice("Note deleted. A tombstone blocks delayed drafts from restoring it.");
    } catch {
      setNotice("The note was not deleted. Reload and try again.");
    }
  };

  const loadVersions = async () => {
    setShowVersions((open) => !open);
    if (versions.length > 0) return;
    const response = await fetch(`/api/items/${itemId}/note/revisions`, { cache: "no-store" });
    if (response.ok) setVersions((await response.json()).revisions ?? []);
  };

  const restoreVersion = async (revisionId: string) => {
    const base = snapshotRef.current.state;
    if (!base) return;
    try {
      const response = await fetch(
        `/api/items/${itemId}/note/revisions/${encodeURIComponent(revisionId)}/restore`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            editorInstanceId: editorIdRef.current,
            mutationId: newMutationId(),
            epoch: base.epoch,
            baseGeneration: base.generation,
          }),
        },
      );
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Restore failed");
      applySnapshot(payload as NoteApiMutation);
      const restored = (payload as NoteApiMutation).note?.contentMarkdown ?? "";
      contentRef.current = restored;
      setContent(restored);
      if (editorIdRef.current) {
        await deleteJournal(itemId, editorIdRef.current).catch(() => undefined);
      }
      journalRef.current = null;
      setStatus("saved");
      setNotice("Recent version restored as a new saved generation.");
    } catch {
      setNotice("That version could not be restored. Reload the recent-version list and try again.");
    }
  };

  const disabled = status === "loading" || status === "session-expired";
  const deleted = snapshot.state?.deleted === true;

  return (
    <section
      aria-label="My notes"
      className={`rounded-lg border border-[var(--border)] bg-[var(--surface)] font-sans ${compact ? "p-4 pb-28" : "p-5"}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Pencil className="h-4 w-4 text-[var(--accent-11)]" strokeWidth={2} />
            <h2 className="text-base font-semibold text-[var(--text-primary)]">My notes</h2>
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
            <LockKeyhole className="h-3 w-3" strokeWidth={2} />
            Your writing · browser and private server storage · not end-to-end encrypted
          </p>
        </div>
        <div className="flex rounded-md border border-[var(--border)] bg-[var(--surface-raised)] p-0.5">
          <button
            type="button"
            onClick={() => setMode("write")}
            aria-pressed={mode === "write"}
            className={`inline-flex items-center gap-1.5 rounded-sm px-3 text-xs font-medium ${compact ? "h-11" : "h-9"} ${
              mode === "write"
                ? "bg-[var(--control-selected-bg)] text-[var(--control-selected-fg)]"
                : "text-[var(--text-secondary)]"
            }`}
          >
            <Pencil className="h-3.5 w-3.5" strokeWidth={2} /> Write
          </button>
          <button
            type="button"
            onClick={() => setMode("preview")}
            aria-pressed={mode === "preview"}
            className={`inline-flex items-center gap-1.5 rounded-sm px-3 text-xs font-medium ${compact ? "h-11" : "h-9"} ${
              mode === "preview"
                ? "bg-[var(--control-selected-bg)] text-[var(--control-selected-fg)]"
                : "text-[var(--text-secondary)]"
            }`}
          >
            <Eye className="h-3.5 w-3.5" strokeWidth={2} /> Preview
          </button>
        </div>
      </div>

      {!localRecoveryAvailable && (
        <div className="mt-4 flex gap-2 rounded-md border border-[var(--warning)] bg-[var(--surface-raised)] p-3 text-xs text-[var(--warning)]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
          <p>Device recovery is unavailable. Online Save and Copy still work; do not close this page with unsaved work.</p>
        </div>
      )}

      {recoveries.length > 0 && (
        <div className="mt-4 rounded-md border border-[var(--warning)] bg-[var(--surface-raised)] p-3">
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {recoveries.length} recoverable {recoveries.length === 1 ? "draft" : "drafts"} from another editor
          </p>
          <ul className="mt-2 space-y-2">
            {recoveries.map((draft) => (
              <li key={draft.editorInstanceId} className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-3">
                <p className="line-clamp-2 whitespace-pre-wrap text-xs text-[var(--text-secondary)]">
                  {draft.contentMarkdown || "Empty draft"}
                </p>
                <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                  {new Date(draft.updatedAt).toLocaleString()} · {byteLength(draft.contentMarkdown).toLocaleString()} bytes
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" onClick={() => resumeRecovery(draft)} className="h-9 rounded-md bg-[var(--action-primary-bg)] px-3 text-xs font-medium text-[var(--action-primary-fg)]">
                    Resume
                  </button>
                  <button type="button" onClick={() => void copyText(draft.contentMarkdown, "Recovered draft copied.")} className="h-9 rounded-md border border-[var(--border)] px-3 text-xs text-[var(--text-secondary)]">
                    Copy
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      void deleteJournal(itemId, draft.editorInstanceId).then(() =>
                        setRecoveries((rows) => rows.filter((row) => row.editorInstanceId !== draft.editorInstanceId)),
                      )
                    }
                    className="h-9 rounded-md border border-[var(--border)] px-3 text-xs text-[var(--danger)]"
                  >
                    Discard
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {notice && (
        <div role="status" className="mt-4 rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-xs leading-relaxed text-[var(--text-secondary)]">
          {notice}
        </div>
      )}

      {conflict && (
        <div role="alert" className="mt-4 rounded-md border border-[var(--danger)] bg-[var(--surface-raised)] p-4">
          <p className="text-sm font-semibold text-[var(--text-primary)]">A newer saved version exists</p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
            Both versions are preserved. Choose deliberately; nothing is overwritten automatically.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-3">
              <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">Saved version</p>
              <p className="mt-2 max-h-28 overflow-auto whitespace-pre-wrap text-xs text-[var(--text-secondary)]">
                {conflict.current.note?.contentMarkdown || "Empty"}
              </p>
            </div>
            <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-3">
              <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">This draft</p>
              <p className="mt-2 max-h-28 overflow-auto whitespace-pre-wrap text-xs text-[var(--text-secondary)]">
                {conflict.draft || "Empty"}
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => void keepDraft()} className="h-10 rounded-md bg-[var(--action-primary-bg)] px-3 text-xs font-medium text-[var(--action-primary-fg)]">
              Keep this draft
            </button>
            <button type="button" onClick={() => void chooseSavedVersion()} className="h-10 rounded-md border border-[var(--border)] px-3 text-xs text-[var(--text-secondary)]">
              Use saved version
            </button>
            <button
              type="button"
              onClick={() =>
                void copyText(
                  `SAVED VERSION\n\n${conflict.current.note?.contentMarkdown ?? ""}\n\nTHIS DRAFT\n\n${conflict.draft}`,
                  "Both versions copied; the draft remains recoverable.",
                )
              }
              className="inline-flex h-10 items-center gap-1.5 rounded-md border border-[var(--border)] px-3 text-xs text-[var(--text-secondary)]"
            >
              <Copy className="h-3.5 w-3.5" strokeWidth={2} /> Copy both
            </button>
          </div>
        </div>
      )}

      {consentRequired.length > 0 && (
        <div role="dialog" aria-label="Allow note AI providers" className="mt-4 rounded-md border border-[var(--warning)] bg-[var(--surface-raised)] p-4">
          <p className="text-sm font-semibold text-[var(--text-primary)]">Allow private note text to leave your server?</p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
            Exact note search works without this. Enabling AI use may send note text to the named providers:
          </p>
          <ul className="mt-2 list-disc pl-5 text-xs text-[var(--text-secondary)]">
            {consentRequired.map((provider) => (
              <li key={provider.fingerprint}>{provider.label} · {provider.purpose.replace(/_/g, " ")}</li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => void approveProvidersAndEnable()} className="h-10 rounded-md bg-[var(--action-primary-bg)] px-3 text-xs font-medium text-[var(--action-primary-fg)]">
              Allow and enable
            </button>
            <button type="button" onClick={() => setConsentRequired([])} className="h-10 rounded-md border border-[var(--border)] px-3 text-xs text-[var(--text-secondary)]">
              Keep AI use off
            </button>
          </div>
        </div>
      )}

      {deleted && !recreating ? (
        <div className="mt-4 rounded-md border border-dashed border-[var(--border)] bg-[var(--surface-raised)] p-5 text-center">
          <p className="text-sm font-medium text-[var(--text-primary)]">This note was deleted.</p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
            Old offline drafts cannot recreate it. Start a deliberate new note in a new epoch.
          </p>
          <button
            type="button"
            onClick={() => {
              setRecreating(true);
              contentRef.current = "";
              setContent("");
              setNotice("Write the new note, then choose Recreate note.");
              setStatus("unsaved");
            }}
            className="mt-3 h-10 rounded-md bg-[var(--action-primary-bg)] px-4 text-sm font-medium text-[var(--action-primary-fg)]"
          >
            Start a new note
          </button>
        </div>
      ) : (
        <>
          {mode === "write" && (
            <>
              <div role="toolbar" aria-label="Markdown formatting" className="mt-4 flex flex-wrap gap-1 rounded-md border border-[var(--border)] bg-[var(--surface-raised)] p-1.5">
                {TOOLBAR.map(({ format, label, icon: Icon }) => (
                  <button
                    key={format}
                    type="button"
                    title={label}
                    aria-label={label}
                    disabled={disabled}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => formatSelection(format)}
                    className={`inline-flex items-center justify-center rounded-sm text-[var(--text-secondary)] hover:bg-[var(--control-selected-bg)] hover:text-[var(--text-primary)] disabled:opacity-50 ${compact ? "h-11 w-11" : "h-10 w-10"}`}
                  >
                    <Icon className="h-4 w-4" strokeWidth={2} />
                  </button>
                ))}
              </div>
              <label className="sr-only" htmlFor={`manual-note-${itemId}`}>My notes Markdown</label>
              <textarea
                ref={textareaRef}
                id={`manual-note-${itemId}`}
                value={content}
                disabled={disabled}
                onChange={(event) => {
                  if (composingRef.current) {
                    contentRef.current = event.target.value;
                    setContent(event.target.value);
                    setStatus("saving-locally");
                  } else {
                    updateContent(event.target.value);
                  }
                }}
                onKeyDown={onEditorKeyDown}
                onCompositionStart={() => {
                  composingRef.current = true;
                }}
                onCompositionEnd={(event) => {
                  composingRef.current = false;
                  updateContent(event.currentTarget.value);
                }}
                spellCheck
                placeholder="What do you think, want to remember, or want to try?"
                className={`mt-3 w-full resize-y rounded-md border border-[var(--border)] bg-[var(--background)] px-4 py-3 font-mono text-sm leading-6 text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--action-primary-focus)] focus:ring-2 focus:ring-[var(--action-primary-focus)]/25 disabled:opacity-60 ${compact ? "min-h-72" : "min-h-80"}`}
              />
            </>
          )}
          {mode === "preview" && (
            <div className="article mt-4 min-h-72 rounded-md border border-[var(--border)] bg-[var(--background)] p-4 text-sm">
              {content.trim() ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  urlTransform={safePreviewUrl}
                  components={{
                    a: ({ href, children }) => (
                      <a href={href} target="_blank" rel="noopener noreferrer nofollow">{children}</a>
                    ),
                    img: ({ alt }) => <span>{alt ?? "Image syntax is not supported in My notes."}</span>,
                    table: ({ children }) => (
                      <div className="overflow-x-auto">
                        <table>{children}</table>
                      </div>
                    ),
                  }}
                >
                  {content}
                </ReactMarkdown>
              ) : (
                <p className="font-sans text-sm text-[var(--text-muted)]">Nothing to preview yet.</p>
              )}
            </div>
          )}
        </>
      )}

      <div
        className={`mt-3 flex items-center justify-between ${compact ? "flex-nowrap gap-2" : "flex-wrap gap-3"} ${
          compact
            ? "fixed inset-x-5 bottom-[72px] z-20 rounded-md border border-[var(--border)] bg-[var(--surface)] p-2 shadow-lg"
            : ""
        }`}
      >
        <div className="min-w-0">
          <p
            role="status"
            aria-live="polite"
            className={`inline-flex items-center gap-1.5 text-xs ${
              status === "failed" || status === "conflict" || status === "oversize"
                ? "text-[var(--danger)]"
                : status === "offline" || status === "session-expired"
                  ? "text-[var(--warning)]"
                  : "text-[var(--text-muted)]"
            }`}
          >
            {status === "saved" && <Check className="h-3.5 w-3.5" strokeWidth={2} />}
            {status === "offline" && <WifiOff className="h-3.5 w-3.5" strokeWidth={2} />}
            {statusCopy(status)}
          </p>
          <p className={`mt-0.5 text-[11px] ${bytes > NOTE_WARNING_BYTES ? "text-[var(--warning)]" : "text-[var(--text-muted)]"}`}>
            {bytes.toLocaleString()} / {NOTE_MAX_BYTES.toLocaleString()} bytes
          </p>
        </div>
        <div className={`flex flex-wrap ${compact ? "gap-1" : "gap-2"}`}>
          <button
            type="button"
            onClick={() => void copyText(content, "Note copied.")}
            className={`inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] text-xs font-medium text-[var(--text-secondary)] hover:border-[var(--border-strong)] ${compact ? "h-11 px-2" : "h-10 px-3"}`}
          >
            <Copy className="h-3.5 w-3.5" strokeWidth={2} /> Copy
          </button>
          {deleted ? (
            <button
              type="button"
              disabled={!content.trim() || status === "saving"}
              onClick={() =>
                void performSave(true, "recreate").then(() => {
                  if (!snapshotRef.current.state?.deleted) setRecreating(false);
                })
              }
              className={`inline-flex items-center gap-1.5 rounded-md bg-[var(--action-primary-bg)] text-xs font-medium text-[var(--action-primary-fg)] disabled:opacity-50 ${compact ? "h-11 px-2" : "h-10 px-3"}`}
            >
              <RotateCcw className="h-3.5 w-3.5" strokeWidth={2} /> Recreate note
            </button>
          ) : (
            <button
              type="button"
              disabled={disabled || status === "saving" || status === "oversize"}
              onClick={() => void performSave(true)}
              className={`inline-flex items-center gap-1.5 rounded-md bg-[var(--action-primary-bg)] text-xs font-medium text-[var(--action-primary-fg)] disabled:opacity-50 ${compact ? "h-11 px-2" : "h-10 px-3"}`}
            >
              <Save className="h-3.5 w-3.5" strokeWidth={2} /> Save
            </button>
          )}
        </div>
      </div>

      {snapshot.note && !deleted && (
        <div className="mt-4 border-t border-[var(--border)] pt-4">
          <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 text-xs text-[var(--text-secondary)]">
            <span>
              <span className="block font-medium text-[var(--text-primary)]">Include in AI & connections</span>
              <span className="mt-0.5 block text-[11px] text-[var(--text-muted)]">Exact search works even when this is off.</span>
            </span>
            <input
              type="checkbox"
              checked={snapshot.note.includeInAi}
              onChange={(event) => void setAiPolicy(event.target.checked)}
              className="h-5 w-5 accent-[var(--action-primary-bg)]"
            />
          </label>

          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => void loadVersions()} className="inline-flex h-10 items-center gap-1.5 rounded-md border border-[var(--border)] px-3 text-xs text-[var(--text-secondary)]">
              <History className="h-3.5 w-3.5" strokeWidth={2} /> Recent versions
            </button>
            <a href={`/api/items/${itemId}/note/export.md`} className="inline-flex h-10 items-center gap-1.5 rounded-md border border-[var(--border)] px-3 text-xs text-[var(--text-secondary)]">
              <Download className="h-3.5 w-3.5" strokeWidth={2} /> Export note
            </a>
            <button
              type="button"
              onClick={() => {
                updateContent("");
                queueMicrotask(() => void performSave(true, "clear"));
              }}
              className="h-10 rounded-md border border-[var(--border)] px-3 text-xs text-[var(--text-secondary)]"
            >
              Clear
            </button>
            <button type="button" onClick={() => setDeleteConfirm(true)} className="inline-flex h-10 items-center gap-1.5 rounded-md border border-[var(--border)] px-3 text-xs text-[var(--danger)]">
              <Trash2 className="h-3.5 w-3.5" strokeWidth={2} /> Delete note
            </button>
          </div>
        </div>
      )}

      {showVersions && (
        <div className="mt-3 rounded-md border border-[var(--border)] bg-[var(--surface-raised)] p-3">
          <p className="text-xs font-medium text-[var(--text-primary)]">Recent acknowledged versions</p>
          {versions.length ? (
            <ol className="mt-2 space-y-1 text-xs text-[var(--text-secondary)]">
              {versions.map((version) => (
                <li key={version.id} className="flex flex-wrap items-center justify-between gap-2 rounded-sm border-b border-[var(--border)] py-2 last:border-0">
                  <span>
                    {version.saveKind.replace(/_/g, " ")} · generation {version.sourceGeneration}
                    <time className="ml-2 text-[var(--text-muted)]">{new Date(version.createdAt).toLocaleString()}</time>
                  </span>
                  <button
                    type="button"
                    onClick={() => void restoreVersion(version.id)}
                    className="h-9 rounded-md border border-[var(--border)] px-3 text-[11px] font-medium text-[var(--text-secondary)]"
                  >
                    Restore
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-1 text-xs text-[var(--text-muted)]">No earlier checkpoints yet.</p>
          )}
          <p className="mt-2 text-[11px] text-[var(--text-muted)]">Up to 25 versions are kept for 30 days. Delete purges them; backups follow their own retention policy.</p>
        </div>
      )}

      {deleteConfirm && (
        <div role="dialog" aria-label="Delete My notes" className="mt-4 rounded-md border border-[var(--danger)] bg-[var(--surface-raised)] p-4">
          <p className="text-sm font-semibold text-[var(--text-primary)]">Delete this attached note?</p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
            This removes current text, recent versions, exact-search content, and queued AI artifacts. A tombstone blocks delayed offline drafts. Retained backups age out under the server backup policy.
          </p>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={() => void deleteNote()} className="h-10 rounded-md bg-[var(--danger)] px-3 text-xs font-medium text-white">Delete note</button>
            <button type="button" onClick={() => setDeleteConfirm(false)} className="h-10 rounded-md border border-[var(--border)] px-3 text-xs text-[var(--text-secondary)]">Cancel</button>
          </div>
        </div>
      )}
    </section>
  );
}
