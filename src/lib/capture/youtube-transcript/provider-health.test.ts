import "../../../db/transcript-jobs.test.setup";

import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  clearYoutubeTimedTextProviderHealthForTests,
  getYoutubeTimedTextCooldown,
  getYoutubeTimedTextProviderHealth,
  isYoutubeTimedTextProviderThrottled,
  recordYoutubeTimedTextProviderOutcome,
  setYoutubeTimedTextProviderHealthForTests,
  YOUTUBE_TIMEDTEXT_COOLDOWN_JITTER_MS,
  YOUTUBE_TIMEDTEXT_COOLDOWN_MIN_MS,
  youtubeTimedTextCooldownDelayMs,
} from "./provider-health";

describe("YouTube timed-text provider health", () => {
  afterEach(() => {
    clearYoutubeTimedTextProviderHealthForTests();
  });

  it("creates a cooldown for timed-text HTTP 429 outcomes", () => {
    const now = 1_780_000_000_000;
    const health = recordYoutubeTimedTextProviderOutcome({
      state: "retryable_error",
      retryable: true,
      errorCode: "timedtext_http_429",
      statusCode: 429,
      now,
    });

    assert.equal(health.failureCount, 1);
    assert.equal(health.lastFailureCode, "timedtext_http_429");
    assert.equal(health.lastStatusCode, 429);
    assert.ok((health.cooldownUntil ?? 0) >= now + YOUTUBE_TIMEDTEXT_COOLDOWN_MIN_MS);
    assert.ok(
      (health.cooldownUntil ?? 0) <=
        now + YOUTUBE_TIMEDTEXT_COOLDOWN_MIN_MS + YOUTUBE_TIMEDTEXT_COOLDOWN_JITTER_MS,
    );

    const cooldown = getYoutubeTimedTextCooldown(now + 1);
    assert.equal(cooldown.active, true);
    assert.equal(cooldown.lastStatusCode, 429);
  });

  it("treats anti-bot metadata-only outcomes as provider throttling", () => {
    assert.equal(
      isYoutubeTimedTextProviderThrottled({
        errorCode: "youtube_antibot_metadata_only",
        statusCode: null,
      }),
      true,
    );
  });

  it("clears cooldown state after a successful provider outcome", () => {
    setYoutubeTimedTextProviderHealthForTests({
      cooldownUntil: Date.now() + 60_000,
      failureCount: 3,
      lastFailureCode: "timedtext_http_429",
      lastStatusCode: 429,
    });

    const health = recordYoutubeTimedTextProviderOutcome({
      state: "success",
      retryable: false,
      now: Date.now(),
    });

    assert.equal(health.cooldownUntil, null);
    assert.equal(health.failureCount, 0);
    assert.equal(health.lastFailureCode, null);
    assert.ok((health.lastSuccessAt ?? 0) > 0);
    assert.equal(getYoutubeTimedTextProviderHealth().cooldownUntil, null);
  });

  it("keeps cooldown delay inside the configured jitter window", () => {
    assert.equal(
      youtubeTimedTextCooldownDelayMs(() => 0),
      YOUTUBE_TIMEDTEXT_COOLDOWN_MIN_MS,
    );
    assert.equal(
      youtubeTimedTextCooldownDelayMs(() => 0.999),
      YOUTUBE_TIMEDTEXT_COOLDOWN_MIN_MS +
        Math.floor(0.999 * YOUTUBE_TIMEDTEXT_COOLDOWN_JITTER_MS),
    );
  });
});
