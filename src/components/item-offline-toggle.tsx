"use client";

import { useEffect, useState } from "react";
import { Check, Cloud, Download, Loader2 } from "lucide-react";
import {
  isItemAvailableOffline,
  cacheItemForOffline,
  removeItemFromOffline,
} from "@/lib/offline/offline-storage-manager";

export function ItemOfflineToggle({
  itemId,
  variant = "badge",
}: {
  itemId: string;
  variant?: "badge" | "button" | "header";
}) {
  const [isOffline, setIsOffline] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    void isItemAvailableOffline(itemId).then((available) => {
      if (active) setIsOffline(available);
    });

    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<{ itemId: string; cached: boolean }>;
      if (customEvent.detail && customEvent.detail.itemId === itemId) {
        setIsOffline(customEvent.detail.cached);
      }
    };

    window.addEventListener("brain:offline-cache-updated", handler);
    return () => {
      active = false;
      window.removeEventListener("brain:offline-cache-updated", handler);
    };
  }, [itemId]);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;

    setLoading(true);
    try {
      if (isOffline) {
        await removeItemFromOffline(itemId);
        setIsOffline(false);
      } else {
        const res = await cacheItemForOffline(itemId);
        if (res.success) {
          setIsOffline(true);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  if (variant === "header") {
    return (
      <button
        type="button"
        onClick={handleToggle}
        disabled={loading}
        title={isOffline ? "Remove from offline storage" : "Make available offline"}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
          isOffline
            ? "bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
            : "bg-[var(--surface-raised)] text-[var(--text-secondary)] border border-[var(--border)] hover:text-[var(--text-primary)]"
        }`}
      >
        {loading ? (
          <Loader2 className="h-3 w-3 animate-spin text-[var(--text-muted)]" />
        ) : isOffline ? (
          <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <Download className="h-3 w-3 text-[var(--text-muted)]" />
        )}
        <span>{loading ? "Caching..." : isOffline ? "Available Offline" : "Save Offline"}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading}
      className={`inline-flex items-center gap-1 text-[11px] font-medium transition-colors ${
        isOffline
          ? "text-emerald-600 dark:text-emerald-400 hover:text-emerald-700"
          : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
      }`}
      title={isOffline ? "Item is saved offline (Tap to remove)" : "Save item for offline reading"}
    >
      {loading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : isOffline ? (
        <>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
          <span>Offline Ready</span>
        </>
      ) : (
        <>
          <Cloud className="h-3 w-3" />
          <span>Make Offline</span>
        </>
      )}
    </button>
  );
}
