/**
 * CascadeTranscriptRouter — 3-Tier Multi-Method YouTube Intake & Resilience Subsystem
 *
 * Tier 0: Cache Check (<10ms, $0.00)
 * Tier 1: Direct Caption Scrape with Token-Bucket Pacing & 429 Circuit Breaker (<0.4s, $0.00)
 * Tier 2: Mac M5 Pro Metal GPU Pull-Worker Queue ($0.00 Local Offline-Resilient)
 * Tier 3: Manual Cloud Fallback (User-Triggered Only, Strict $0.00 Automated Policy)
 */

import { getDb } from "@/db/client";
import { enqueueTranscriptJobForItem, getTranscriptJobForItem } from "@/db/transcript-jobs";
import { extractVideoId } from "./youtube-url";
import type { ItemRow } from "@/db/client";

export interface CascadeRouteResult {
  tier: 0 | 1 | 2;
  source: "cache" | "direct_scrape" | "mac_queue";
  fullText?: string;
  queuedForMac: boolean;
  priority: number;
  circuitOpen: boolean;
  cachedItemId?: string;
}

/**
 * Token-Bucket Rate Limiter & Circuit Breaker for YouTube Network Extraction.
 */
export class YouTubeRateLimiterAndCircuitBreaker {
  private minIntervalMs: number;
  private lastRequestTime = 0;
  private consecutive429s = 0;
  private circuitOpenedAt = 0;
  private circuitCooldownMs: number;
  private maxConsecutive429s: number;

  constructor(options: {
    minIntervalMs?: number; // 1 req per 1.5s default
    circuitCooldownMs?: number; // 15 mins default
    maxConsecutive429s?: number; // 3 consecutive 429s trips circuit
  } = {}) {
    this.minIntervalMs = options.minIntervalMs ?? 1500;
    this.circuitCooldownMs = options.circuitCooldownMs ?? 15 * 60 * 1000;
    this.maxConsecutive429s = options.maxConsecutive429s ?? 3;
  }

  public isCircuitOpen(now = Date.now()): boolean {
    if (this.circuitOpenedAt === 0) return false;
    if (now - this.circuitOpenedAt > this.circuitCooldownMs) {
      // Cooldown expired, half-open circuit
      this.circuitOpenedAt = 0;
      this.consecutive429s = 0;
      return false;
    }
    return true;
  }

  public async acquireToken(now = Date.now()): Promise<boolean> {
    if (this.isCircuitOpen(now)) {
      return false; // Circuit open: skip network attempt
    }

    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.minIntervalMs) {
      const waitMs = this.minIntervalMs - elapsed;
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }

    this.lastRequestTime = Date.now();
    return true;
  }

  public recordSuccess(): void {
    this.consecutive429s = 0;
    this.circuitOpenedAt = 0;
  }

  public record429(now = Date.now()): void {
    this.consecutive429s += 1;
    if (this.consecutive429s >= this.maxConsecutive429s) {
      this.circuitOpenedAt = now;
    }
  }

  public reset(): void {
    this.consecutive429s = 0;
    this.circuitOpenedAt = 0;
    this.lastRequestTime = 0;
  }

  public getStats(now = Date.now()) {
    return {
      circuitOpen: this.isCircuitOpen(now),
      consecutive429s: this.consecutive429s,
      circuitOpenedAt: this.circuitOpenedAt,
    };
  }
}

// Global Singleton Rate Limiter & Circuit Breaker
export const globalYouTubeLimiter = new YouTubeRateLimiterAndCircuitBreaker();

/**
 * Calculates intake priority based on capture source.
 * Interactive live saves (Android, Web, Chrome Extension, Telegram) = 100
 * Batch bulk sync (Recall sync) = 10
 */
export function calculateTranscriptPriority(captureSource?: string | null): number {
  if (captureSource === "recall") {
    return 10;
  }
  return 100; // Interactive live save
}

/**
 * Checks Tier 0: Has this video ID already been transcribed in Brain?
 */
export function checkTier0Cache(videoId: string): { itemId: string; fullText: string } | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT id, body FROM items
       WHERE (source_platform IN ('youtube', 'youtube_short') OR source_type = 'youtube')
         AND (source_url LIKE ? OR source_url LIKE ? OR source_url LIKE ?)
         AND capture_quality IN ('transcript', 'metadata_plus_transcript', 'full_text')
         AND body IS NOT NULL
         AND length(body) > 50
       ORDER BY captured_at DESC
       LIMIT 1`,
    )
    .get(`%v=${videoId}%`, `%youtu.be/${videoId}%`, `%shorts/${videoId}%`) as { id: string; body: string } | undefined;

  if (row && row.body) {
    return { itemId: row.id, fullText: row.body };
  }
  return null;
}

/**
 * Routes YouTube Item through the Multi-Tier Cascade:
 * Tier 0 (Cache) -> Tier 1 (Direct Scrape) -> Tier 2 (Mac Worker Queue)
 */
export async function routeYoutubeTranscriptIntake(
  item: ItemRow,
  options: {
    directScraper?: (videoId: string) => Promise<{ text: string } | null>;
    now?: number;
  } = {},
): Promise<CascadeRouteResult> {
  const now = options.now ?? Date.now();
  const videoId = item.source_url ? extractVideoId(item.source_url) : null;
  const priority = calculateTranscriptPriority(item.capture_source);

  if (!videoId) {
    return {
      tier: 2,
      source: "mac_queue",
      queuedForMac: false,
      priority,
      circuitOpen: false,
    };
  }

  // 1. Tier 0: Cache Check
  const cached = checkTier0Cache(videoId);
  if (cached && cached.itemId !== item.id) {
    return {
      tier: 0,
      source: "cache",
      fullText: cached.fullText,
      queuedForMac: false,
      priority,
      circuitOpen: false,
      cachedItemId: cached.itemId,
    };
  }

  // 2. Tier 1: Direct Caption Scrape (with Circuit Breaker & Rate Limiter)
  const circuitOpen = globalYouTubeLimiter.isCircuitOpen(now);
  if (!circuitOpen && options.directScraper) {
    const tokenAcquired = await globalYouTubeLimiter.acquireToken(now);
    if (tokenAcquired) {
      try {
        const scraped = await options.directScraper(videoId);
        if (scraped && scraped.text && scraped.text.length > 50) {
          globalYouTubeLimiter.recordSuccess();
          return {
            tier: 1,
            source: "direct_scrape",
            fullText: scraped.text,
            queuedForMac: false,
            priority,
            circuitOpen: false,
          };
        }
      } catch (err: any) {
        if (err?.message?.includes("429") || err?.status === 429) {
          globalYouTubeLimiter.record429(now);
        }
      }
    }
  }

  // 3. Tier 2: Auto-Enqueue for Mac M5 Pro Worker
  enqueueTranscriptJobForItem(item, {
    priority,
    preferredModel: "whisper-large-v3-turbo",
    reset: true,
  });

  return {
    tier: 2,
    source: "mac_queue",
    queuedForMac: true,
    priority,
    circuitOpen: globalYouTubeLimiter.isCircuitOpen(now),
  };
}
