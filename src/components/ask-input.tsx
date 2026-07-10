"use client";

import { useRef, useState, KeyboardEvent, FormEvent } from "react";
import { Send, Square } from "lucide-react";

interface AskInputProps {
  onSubmit: (question: string) => void;
  onStop: () => void;
  busy: boolean;
  autoFocus?: boolean;
}

export function AskInput({ onSubmit, onStop, busy, autoFocus }: AskInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState("");

  // Android WebView + IME keyboards (GBoard predictive / gesture typing) can
  // swallow React's synthetic onChange events. Read the live DOM value on
  // submit as a fallback so we don't drop user text silently.
  const readLiveValue = () => (textareaRef.current?.value ?? value).trim();

  const submit = () => {
    // Force any pending IME composition to commit by blurring the textarea
    // (Android WebView + GBoard hold predicted text in a composition buffer
    // that never reaches textarea.value until blur).
    if (textareaRef.current && document.activeElement === textareaRef.current) {
      textareaRef.current.blur();
    }
    const q = readLiveValue();
    if (!q) return;
    onSubmit(q);
    setValue("");
    if (textareaRef.current) textareaRef.current.value = "";
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const onInput = (e: FormEvent<HTMLTextAreaElement>) => {
    // onInput fires on every DOM value change including IME commits that
    // React's synthetic onChange may miss. Keep state in sync here.
    setValue(e.currentTarget.value);
  };

  const hasText = value.trim().length > 0;

  return (
    <div className="flex items-end gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-2 focus-within:border-[var(--border-strong)]">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onInput={onInput}
        onCompositionEnd={onInput}
        onKeyDown={onKeyDown}
        placeholder="Ask anything about your library..."
        rows={1}
        autoFocus={autoFocus}
        className="min-h-11 flex-1 resize-none bg-transparent px-2 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none md:min-h-8 md:py-1.5"
      />
      {busy ? (
        <button
          type="button"
          onClick={onStop}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] md:h-9 md:w-9"
          aria-label="Stop"
        >
          <Square className="h-4 w-4" strokeWidth={2} />
        </button>
      ) : (
        <button
          type="button"
          onClick={submit}
          disabled={!hasText}
          aria-disabled={!hasText}
          className={
            "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-[var(--action-primary-bg)] text-[var(--action-primary-fg)] hover:bg-[var(--action-primary-bg-hover)] md:h-9 md:w-9 " +
            (hasText ? "" : "cursor-not-allowed opacity-40")
          }
          aria-label="Send"
        >
          <Send className="h-4 w-4" strokeWidth={2} />
        </button>
      )}
    </div>
  );
}
