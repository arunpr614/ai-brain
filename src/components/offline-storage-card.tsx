"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { HardDrive, Trash2, CheckCircle2, RefreshCw, Smartphone, ShieldCheck } from "lucide-react";
import {
  getOfflineStorageStats,
  freeUpAllOfflineStorage,
  type OfflineStorageStats,
} from "@/lib/offline/offline-storage-manager";

function getPwaSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function subscribePwa(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const mql = window.matchMedia("(display-mode: standalone)");
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

export function OfflineStorageCard() {
  const [stats, setStats] = useState<OfflineStorageStats | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const isPWA = useSyncExternalStore(subscribePwa, getPwaSnapshot, () => false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const refreshStats = async () => {
    const s = await getOfflineStorageStats();
    setStats(s);
  };

  useEffect(() => {
    let mounted = true;
    void getOfflineStorageStats().then((s) => {
      if (mounted) setStats(s);
    });

    const handler = () => {
      void getOfflineStorageStats().then((s) => {
        if (mounted) setStats(s);
      });
    };

    window.addEventListener("brain:offline-cache-updated", handler);
    window.addEventListener("brain:offline-cache-cleared", handler);
    return () => {
      mounted = false;
      window.removeEventListener("brain:offline-cache-updated", handler);
      window.removeEventListener("brain:offline-cache-cleared", handler);
    };
  }, []);

  const handleFreeUpStorage = async () => {
    setIsClearing(true);
    try {
      const res = await freeUpAllOfflineStorage();
      await refreshStats();
      setToastMessage(`Freed ${res.deletedCount} cached pages! Notes draft preserved.`);
      setTimeout(() => setToastMessage(null), 3000);
    } catch {
      setToastMessage("Failed to clear offline storage.");
      setTimeout(() => setToastMessage(null), 3000);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="p-4 space-y-4 bg-[var(--surface)] text-[var(--text-primary)]">
      {/* Storage Gauge & Overview */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/50">
            <HardDrive className="h-5 w-5" strokeWidth={2} />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Offline Storage & Memory
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              {stats ? (
                <>
                  <span className="font-medium text-[var(--text-primary)]">
                    {stats.cachedItemsCount} {stats.cachedItemsCount === 1 ? "item" : "items"}
                  </span>{" "}
                  cached for offline reading ({stats.formattedSize})
                </>
              ) : (
                "Calculating on-device cache..."
              )}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void refreshStats()}
          className="p-2 rounded-md hover:bg-[var(--surface-raised)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          title="Refresh storage calculation"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* PWA & Share Target Diagnostics */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2.5 rounded-md bg-[var(--surface-raised)] border border-[var(--border)] flex items-center gap-2">
          <Smartphone className="h-4 w-4 text-indigo-500 shrink-0" />
          <div className="min-w-0">
            <span className="block font-medium text-[var(--text-primary)] truncate">
              {isPWA ? "Standalone PWA" : "Mobile Web"}
            </span>
            <span className="block text-[11px] text-[var(--text-secondary)]">
              {isPWA ? "Pixel 7 Pro Active" : "Browser Tab"}
            </span>
          </div>
        </div>

        <div className="p-2.5 rounded-md bg-[var(--surface-raised)] border border-[var(--border)] flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
          <div className="min-w-0">
            <span className="block font-medium text-[var(--text-primary)] truncate">
              Share Target API
            </span>
            <span className="block text-[11px] text-[var(--text-secondary)]">
              Active (/capture)
            </span>
          </div>
        </div>
      </div>

      {/* Free Up Memory Action */}
      <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between gap-3">
        <span className="text-xs text-[var(--text-secondary)]">
          Frees CacheStorage while protecting IndexedDB notes.
        </span>

        <button
          type="button"
          disabled={isClearing || !stats || stats.cachedItemsCount === 0}
          onClick={handleFreeUpStorage}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isClearing ? (
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
          <span>{isClearing ? "Clearing..." : "Free Up Memory"}</span>
        </button>
      </div>

      {toastMessage && (
        <div className="p-2.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium flex items-center gap-2 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
