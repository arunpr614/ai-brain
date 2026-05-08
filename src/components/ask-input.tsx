"use client";

import { useState, KeyboardEvent } from "react";
import { Send, Square } from "lucide-react";

interface AskInputProps {
  onSubmit: (question: string) => void;
  onStop: () => void;
  busy: boolean;
  autoFocus?: boolean;
}

export function AskInput({ onSubmit, onStop, busy, autoFocus }: AskInputProps) {
  const [value, setValue] = useState("");

  const submit = () => {
    const q = value.trim();
    if (!q) return;
    onSubmit(q);
    setValue("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="flex items-end gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-2 focus-within:border-[var(--border-strong)]">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Ask anything about your library..."
        rows={1}
        autoFocus={autoFocus}
        className="flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
      />
      {busy ? (
        <button
          type="button"
          onClick={onStop}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          aria-label="Stop"
        >
          <Square className="h-4 w-4" strokeWidth={2} />
        </button>
      ) : (
        <button
          type="button"
          onClick={submit}
          disabled={!value.trim()}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[var(--accent-9)] text-[var(--on-accent)] hover:bg-[var(--accent-10)] disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Send"
        >
          <Send className="h-4 w-4" strokeWidth={2} />
        </button>
      )}
    </div>
  );
}
