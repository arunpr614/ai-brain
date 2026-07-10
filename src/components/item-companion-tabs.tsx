"use client";

import { FileText, Pencil } from "lucide-react";
import { useId, useState, type KeyboardEvent, type ReactNode } from "react";

export function ItemCompanionTabs({
  digest,
  notes,
  mobileNotesOnly = false,
}: {
  digest: ReactNode;
  notes: ReactNode;
  mobileNotesOnly?: boolean;
}) {
  const [tab, setTab] = useState<"notes" | "digest">("notes");
  const id = useId();
  const digestTabId = `${id}-digest-tab`;
  const notesTabId = `${id}-notes-tab`;
  const digestPanelId = `${id}-digest-panel`;
  const notesPanelId = `${id}-notes-panel`;

  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    let next: "notes" | "digest" | null = null;
    if (event.key === "Home") next = "digest";
    else if (event.key === "End") next = "notes";
    else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      next = tab === "notes" ? "digest" : "notes";
    }
    if (!next) return;
    event.preventDefault();
    setTab(next);
    const ownerDocument = event.currentTarget.ownerDocument;
    const targetId = next === "notes" ? notesTabId : digestTabId;
    queueMicrotask(() => ownerDocument.getElementById(targetId)?.focus());
  };

  return (
    <section aria-label="Item companion">
      <div
        role="tablist"
        aria-label="AI digest and My notes"
        className={`mb-2 grid grid-cols-2 gap-1 rounded-md border border-[var(--border)] bg-[var(--surface-raised)] p-1 ${
          mobileNotesOnly ? "hidden md:grid" : ""
        }`}
      >
        <button
          id={digestTabId}
          type="button"
          role="tab"
          aria-selected={tab === "digest"}
          aria-controls={digestPanelId}
          tabIndex={tab === "digest" ? 0 : -1}
          onClick={() => setTab("digest")}
          onKeyDown={onTabKeyDown}
          className={`inline-flex h-10 items-center justify-center gap-2 rounded-sm text-xs font-medium ${
            tab === "digest"
              ? "bg-[var(--control-selected-bg)] text-[var(--control-selected-fg)]"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          <FileText className="h-3.5 w-3.5" strokeWidth={2} /> AI digest
        </button>
        <button
          id={notesTabId}
          type="button"
          role="tab"
          aria-selected={tab === "notes"}
          aria-controls={notesPanelId}
          tabIndex={tab === "notes" ? 0 : -1}
          onClick={() => setTab("notes")}
          onKeyDown={onTabKeyDown}
          className={`inline-flex h-10 items-center justify-center gap-2 rounded-sm text-xs font-medium ${
            tab === "notes"
              ? "bg-[var(--control-selected-bg)] text-[var(--control-selected-fg)]"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          <Pencil className="h-3.5 w-3.5" strokeWidth={2} /> My notes
        </button>
      </div>
      <div
        id={notesPanelId}
        role="tabpanel"
        aria-labelledby={notesTabId}
        className={
          mobileNotesOnly
            ? tab === "notes"
              ? ""
              : "md:hidden"
            : tab === "notes"
              ? ""
              : "hidden"
        }
      >
        {notes}
      </div>
      <div
        id={digestPanelId}
        role="tabpanel"
        aria-labelledby={digestTabId}
        className={
          mobileNotesOnly
            ? tab === "digest"
              ? "hidden md:block"
              : "hidden"
            : tab === "digest"
              ? ""
              : "hidden"
        }
      >
        {digest}
      </div>
    </section>
  );
}
