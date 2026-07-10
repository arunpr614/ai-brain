"use client";

import { FileText, Pencil } from "lucide-react";
import { useState, type ReactNode } from "react";

export function ItemCompanionTabs({
  digest,
  notes,
}: {
  digest: ReactNode;
  notes: ReactNode;
}) {
  const [tab, setTab] = useState<"notes" | "digest">("notes");
  return (
    <section aria-label="Item companion">
      <div
        role="tablist"
        aria-label="AI digest and My notes"
        className="mb-2 grid grid-cols-2 gap-1 rounded-md border border-[var(--border)] bg-[var(--surface-raised)] p-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "digest"}
          onClick={() => setTab("digest")}
          className={`inline-flex h-10 items-center justify-center gap-2 rounded-sm text-xs font-medium ${
            tab === "digest"
              ? "bg-[var(--control-selected-bg)] text-[var(--control-selected-fg)]"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          <FileText className="h-3.5 w-3.5" strokeWidth={2} /> AI digest
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "notes"}
          onClick={() => setTab("notes")}
          className={`inline-flex h-10 items-center justify-center gap-2 rounded-sm text-xs font-medium ${
            tab === "notes"
              ? "bg-[var(--control-selected-bg)] text-[var(--control-selected-fg)]"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          <Pencil className="h-3.5 w-3.5" strokeWidth={2} /> My notes
        </button>
      </div>
      <div role="tabpanel">{tab === "notes" ? notes : digest}</div>
    </section>
  );
}

