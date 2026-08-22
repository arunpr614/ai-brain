"use client";

import { useState, useEffect, useRef } from "react";
import { Clipboard, Globe, Loader2, StickyNote, X, Check } from "lucide-react";
import { useRouter } from "next/navigation";

export interface QuickCaptureSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QuickCaptureSheet({ isOpen, onClose }: QuickCaptureSheetProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"url" | "note">("url");
  const [url, setUrl] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);
  const noteTitleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      if (activeTab === "url") {
        urlInputRef.current?.focus();
      } else {
        noteTitleRef.current?.focus();
      }
    }, 100);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, activeTab, onClose]);

  const handlePasteClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          const match = text.match(/https?:\/\/[^\s]+/i);
          if (match) {
            setUrl(match[0]);
          } else {
            setUrl(text.trim());
          }
        }
      }
    } catch {
      // Clipboard access denied or unsupported; ignore silently
    }
  };

  const handleCaptureUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/capture/url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to capture URL");
      }

      setToastMessage("Saved URL! Extracting transcript in background...");
      setUrl("");
      setTimeout(() => {
        setToastMessage(null);
        onClose();
        if (data.itemId || data.id) {
          router.push(`/items/${data.itemId || data.id}/read`);
        } else {
          router.push("/library");
        }
      }, 900);
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  };

  const handleCaptureNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteBody.trim() && !noteTitle.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/capture/note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: noteTitle.trim() || undefined,
          body: noteBody.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save note");
      }

      setToastMessage("Saved Note to Library!");
      setNoteTitle("");
      setNoteBody("");
      setTimeout(() => {
        setToastMessage(null);
        onClose();
        if (data.id || data.itemId) {
          router.push(`/items/${data.id || data.itemId}/read`);
        } else {
          router.push("/library");
        }
      }, 800);
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end md:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-Up Bottom Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="1-Tap Quick Capture"
        className="relative z-10 w-full rounded-t-3xl border-t border-[var(--border)] bg-[var(--surface)] p-5 shadow-2xl pb-[max(env(safe-area-inset-bottom),1.25rem)] animate-in slide-in-from-bottom duration-250"
      >
        {/* Drag / Touch Handle */}
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-[var(--line-strong)] opacity-60" />

        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-[var(--text-primary)]">
            1-Tap Quick Capture
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close capture modal"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-1">
          <button
            type="button"
            onClick={() => setActiveTab("url")}
            className={`inline-flex h-10 items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === "url"
                ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-xs border border-[var(--border)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Globe className="h-4 w-4 text-cyan-500" />
            <span>URL Link</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("note")}
            className={`inline-flex h-10 items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === "note"
                ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-xs border border-[var(--border)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <StickyNote className="h-4 w-4 text-emerald-500" />
            <span>Quick Thought</span>
          </button>
        </div>

        {/* Toast feedback */}
        {toastMessage && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs font-medium text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/50 dark:text-emerald-300">
            <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Error feedback */}
        {error && (
          <div className="mb-4 rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs font-medium text-rose-800 dark:border-rose-800/60 dark:bg-rose-950/50 dark:text-rose-300">
            {error}
          </div>
        )}

        {/* URL Form */}
        {activeTab === "url" && (
          <form onSubmit={handleCaptureUrl} className="space-y-3">
            <div className="relative">
              <input
                ref={urlInputRef}
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=... or article URL"
                className="h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] pl-3.5 pr-11 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--action-primary-focus)] focus:outline-hidden"
              />
              <button
                type="button"
                onClick={handlePasteClipboard}
                title="Paste from clipboard"
                aria-label="Paste from clipboard"
                className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)]"
              >
                <Clipboard className="h-4 w-4" />
              </button>
            </div>
            <button
              type="submit"
              disabled={loading || !url.trim()}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--action-primary-bg)] font-semibold text-sm text-[var(--action-primary-fg)] transition-colors hover:bg-[var(--action-primary-bg-hover)] disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving & Ingesting...</span>
                </>
              ) : (
                <span>Save to AI Memory</span>
              )}
            </button>
          </form>
        )}

        {/* Note Form */}
        {activeTab === "note" && (
          <form onSubmit={handleCaptureNote} className="space-y-3">
            <input
              ref={noteTitleRef}
              type="text"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              placeholder="Note Title (optional)"
              className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-3.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--action-primary-focus)] focus:outline-hidden"
            />
            <textarea
              required
              rows={4}
              value={noteBody}
              onChange={(e) => setNoteBody(e.target.value)}
              placeholder="Write your markdown note or paste snippet..."
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-3 text-sm font-mono text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--action-primary-focus)] focus:outline-hidden resize-none"
            />
            <button
              type="submit"
              disabled={loading || (!noteTitle.trim() && !noteBody.trim())}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--action-primary-bg)] font-semibold text-sm text-[var(--action-primary-fg)] transition-colors hover:bg-[var(--action-primary-bg-hover)] disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving Note...</span>
                </>
              ) : (
                <span>Save Note</span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
