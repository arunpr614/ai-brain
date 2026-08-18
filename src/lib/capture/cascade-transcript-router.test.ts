import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { insertCaptured } from "@/db/items";
import { getTranscriptJobForItem } from "@/db/transcript-jobs";
import {
  calculateTranscriptPriority,
  globalYouTubeLimiter,
  routeYoutubeTranscriptIntake,
  YouTubeRateLimiterAndCircuitBreaker,
} from "./cascade-transcript-router";

describe("CascadeTranscriptRouter & Circuit Breaker", () => {
  beforeEach(() => {
    globalYouTubeLimiter.reset();
  });

  it("calculates priority: 100 for live saves and 10 for recall batch sync", () => {
    assert.equal(calculateTranscriptPriority("android"), 100);
    assert.equal(calculateTranscriptPriority("web"), 100);
    assert.equal(calculateTranscriptPriority("extension"), 100);
    assert.equal(calculateTranscriptPriority("telegram"), 100);
    assert.equal(calculateTranscriptPriority("recall"), 10);
    assert.equal(calculateTranscriptPriority(null), 100);
  });

  it("rate limiter and circuit breaker trips open after 3 consecutive 429s", async () => {
    const limiter = new YouTubeRateLimiterAndCircuitBreaker({
      minIntervalMs: 50,
      maxConsecutive429s: 3,
      circuitCooldownMs: 1000,
    });

    const now = 10000;
    assert.equal(limiter.isCircuitOpen(now), false);

    limiter.record429(now);
    assert.equal(limiter.isCircuitOpen(now), false);

    limiter.record429(now);
    assert.equal(limiter.isCircuitOpen(now), false);

    // 3rd consecutive 429 trips the circuit
    limiter.record429(now);
    assert.equal(limiter.isCircuitOpen(now), true);

    // Token acquire fails when circuit is open
    const acquired = await limiter.acquireToken(now);
    assert.equal(acquired, false);

    // Cooldown expires 1000ms later -> half-open / resets
    assert.equal(limiter.isCircuitOpen(now + 1500), false);
  });

  it("Tier 0: returns cached transcript when identical video exists", async () => {
    // 1. Insert existing high-quality item with full transcript
    const existing = insertCaptured({
      source_type: "youtube",
      capture_source: "web",
      source_url: "https://www.youtube.com/watch?v=cachevid001",
      title: "Already Transcribed Video",
      body: "This is a full existing transcript that was already transcribed in the library.",
      source_platform: "youtube",
      capture_quality: "transcript",
    });

    // 2. Intaking new item with same video_id
    const newItem = insertCaptured({
      source_type: "youtube",
      capture_source: "android",
      source_url: "https://www.youtube.com/watch?v=cachevid001",
      title: "Duplicate Intake",
      body: "metadata only",
      source_platform: "youtube",
      capture_quality: "metadata_only",
    });

    const result = await routeYoutubeTranscriptIntake(newItem);
    assert.equal(result.tier, 0);
    assert.equal(result.source, "cache");
    assert.equal(result.fullText, existing.body);
    assert.equal(result.queuedForMac, false);
    assert.equal(result.cachedItemId, existing.id);
  });

  it("Tier 1: uses direct scrape when available", async () => {
    const item = insertCaptured({
      source_type: "youtube",
      capture_source: "web",
      source_url: "https://www.youtube.com/watch?v=directscrap",
      title: "Direct Scrape Video",
      body: "metadata only",
      source_platform: "youtube",
      capture_quality: "metadata_only",
    });

    const mockScraper = async (_videoId: string) => ({
      text: "This is the direct scraped subtitle text from YouTube timedtext.",
    });

    const result = await routeYoutubeTranscriptIntake(item, { directScraper: mockScraper });
    assert.equal(result.tier, 1);
    assert.equal(result.source, "direct_scrape");
    assert.ok(result.fullText?.includes("direct scraped subtitle text"));
    assert.equal(result.queuedForMac, false);
  });

  it("Tier 2: enqueues for Mac worker when direct scrape fails or is missing", async () => {
    const item = insertCaptured({
      source_type: "youtube",
      capture_source: "android",
      source_url: "https://www.youtube.com/watch?v=macqueue001",
      title: "Mac Queue Video",
      body: "metadata only",
      source_platform: "youtube",
      capture_quality: "metadata_only",
      extraction_warning: "no_transcript",
    });

    const mockFailingScraper = async (_videoId: string) => null;

    const result = await routeYoutubeTranscriptIntake(item, { directScraper: mockFailingScraper });
    assert.equal(result.tier, 2);
    assert.equal(result.source, "mac_queue");
    assert.equal(result.queuedForMac, true);
    assert.equal(result.priority, 100);

    const job = getTranscriptJobForItem(item.id);
    assert.ok(job);
    assert.equal(job?.state, "pending");
    assert.equal(job?.priority, 100);
  });

  it("skips Tier 1 directly when circuit breaker is tripped open", async () => {
    const now = Date.now();
    globalYouTubeLimiter.record429(now);
    globalYouTubeLimiter.record429(now);
    globalYouTubeLimiter.record429(now);
    assert.equal(globalYouTubeLimiter.isCircuitOpen(now), true);

    const item = insertCaptured({
      source_type: "youtube",
      capture_source: "recall",
      source_url: "https://www.youtube.com/watch?v=circuitopen",
      title: "Circuit Breaker Video",
      body: "metadata only",
      source_platform: "youtube",
      capture_quality: "metadata_only",
    });

    let scraperCalled = false;
    const mockScraper = async () => {
      scraperCalled = true;
      return { text: "Should not be called" };
    };

    const result = await routeYoutubeTranscriptIntake(item, { directScraper: mockScraper, now });
    assert.equal(result.tier, 2);
    assert.equal(result.source, "mac_queue");
    assert.equal(result.queuedForMac, true);
    assert.equal(result.priority, 10); // Recall sync = priority 10
    assert.equal(scraperCalled, false); // Direct scraper was not invoked!
  });
});
