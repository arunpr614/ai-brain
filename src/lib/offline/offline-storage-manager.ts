/**
 * Offline Storage & Memory Manager for AI Brain PWA.
 *
 * Coordinates CacheStorage (PAGES_CACHE) and StorageManager estimation
 * to allow per-item offline availability and storage hygiene.
 */

export const PAGES_CACHE_NAME = "ai-memory-pages-v6";
export const SHELL_CACHE_NAME = "ai-memory-shell-v6";

export interface OfflineStorageStats {
  cachedItemsCount: number;
  estimatedBytes: number;
  quotaBytes?: number;
  formattedSize: string;
}

/**
 * Format bytes into human-readable MB / KB string
 */
export function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Check if a specific item is available in offline CacheStorage
 */
export async function isItemAvailableOffline(itemId: string): Promise<boolean> {
  if (typeof window === "undefined" || !("caches" in window)) return false;
  try {
    const cache = await caches.open(PAGES_CACHE_NAME);
    const itemUrl = `/items/${itemId}`;
    const readUrl = `/library/${itemId}/read`;
    
    const [itemMatch, readMatch] = await Promise.all([
      cache.match(itemUrl, { ignoreSearch: true }),
      cache.match(readUrl, { ignoreSearch: true }),
    ]);

    return Boolean(itemMatch || readMatch);
  } catch (err) {
    console.warn("[offline-storage] Failed to check item offline status:", err);
    return false;
  }
}

/**
 * Explicitly cache an item's detail and reading studio pages for offline use
 */
export async function cacheItemForOffline(itemId: string): Promise<{ success: boolean; error?: string }> {
  if (typeof window === "undefined" || !("caches" in window)) {
    return { success: false, error: "Cache API not supported in this browser" };
  }
  try {
    const cache = await caches.open(PAGES_CACHE_NAME);
    const urlsToCache = [`/items/${itemId}`, `/library/${itemId}/read`];

    await Promise.all(
      urlsToCache.map(async (url) => {
        const response = await fetch(url, { credentials: "same-origin" });
        if (response.ok) {
          await cache.put(url, response.clone());
        }
      }),
    );

    // Dispatch event so UI badges update reactively
    window.dispatchEvent(
      new CustomEvent("brain:offline-cache-updated", { detail: { itemId, cached: true } }),
    );

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[offline-storage] Failed to cache item for offline:", message);
    return { success: false, error: message };
  }
}

/**
 * Remove an item from offline cache to free memory
 */
export async function removeItemFromOffline(itemId: string): Promise<boolean> {
  if (typeof window === "undefined" || !("caches" in window)) return false;
  try {
    const cache = await caches.open(PAGES_CACHE_NAME);
    const itemUrl = `/items/${itemId}`;
    const readUrl = `/library/${itemId}/read`;

    const [del1, del2] = await Promise.all([
      cache.delete(itemUrl, { ignoreSearch: true }),
      cache.delete(readUrl, { ignoreSearch: true }),
    ]);

    // Dispatch event so UI badges update reactively
    window.dispatchEvent(
      new CustomEvent("brain:offline-cache-updated", { detail: { itemId, cached: false } }),
    );

    return del1 || del2;
  } catch (err) {
    console.warn("[offline-storage] Failed to remove item from offline cache:", err);
    return false;
  }
}

/**
 * Get aggregated offline storage metrics
 */
export async function getOfflineStorageStats(): Promise<OfflineStorageStats> {
  if (typeof window === "undefined" || !("caches" in window)) {
    return { cachedItemsCount: 0, estimatedBytes: 0, formattedSize: "0 MB" };
  }
  try {
    const cache = await caches.open(PAGES_CACHE_NAME);
    const requests = await cache.keys();
    
    // Count unique item IDs from cached URLs
    const itemIds = new Set<string>();
    for (const req of requests) {
      const url = new URL(req.url);
      const match = url.pathname.match(/^\/(?:items|library)\/([^/]+)/);
      if (match && match[1]) {
        itemIds.add(match[1]);
      }
    }

    let estimatedBytes = requests.length * 45 * 1024; // baseline approx ~45KB per cached page HTML + state
    let quotaBytes: number | undefined;

    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      if (estimate.usage) {
        estimatedBytes = estimate.usage;
      }
      if (estimate.quota) {
        quotaBytes = estimate.quota;
      }
    }

    return {
      cachedItemsCount: itemIds.size,
      estimatedBytes,
      quotaBytes,
      formattedSize: formatBytes(estimatedBytes),
    };
  } catch (err) {
    console.warn("[offline-storage] Failed to calculate storage stats:", err);
    return { cachedItemsCount: 0, estimatedBytes: 0, formattedSize: "0 MB" };
  }
}

/**
 * Free up all offline pages while preserving user journal drafts in IndexedDB
 */
export async function freeUpAllOfflineStorage(): Promise<{ deletedCount: number; freedBytes: number }> {
  if (typeof window === "undefined" || !("caches" in window)) {
    return { deletedCount: 0, freedBytes: 0 };
  }
  try {
    const statsBefore = await getOfflineStorageStats();
    await caches.delete(PAGES_CACHE_NAME);
    // Re-create empty cache
    await caches.open(PAGES_CACHE_NAME);

    window.dispatchEvent(
      new CustomEvent("brain:offline-cache-cleared", { detail: { clearedAt: Date.now() } }),
    );

    return {
      deletedCount: statsBefore.cachedItemsCount,
      freedBytes: statsBefore.estimatedBytes,
    };
  } catch (err) {
    console.error("[offline-storage] Failed to free up storage:", err);
    return { deletedCount: 0, freedBytes: 0 };
  }
}
