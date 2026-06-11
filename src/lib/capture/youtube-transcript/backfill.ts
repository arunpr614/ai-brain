import { getDb, type ItemRow } from "@/db/client";
import {
  enqueueTranscriptJobForItem,
  isYoutubeTranscriptRecoveryCandidate,
  type TranscriptJobState,
} from "@/db/transcript-jobs";
import {
  getYoutubeTimedTextCooldown,
  logTranscriptProviderEvent,
  YOUTUBE_TIMEDTEXT_PROVIDER_KEY,
} from "./provider-health";

export interface YoutubeTranscriptBackfillOptions {
  dryRun?: boolean;
  limit?: number;
  now?: number;
  ignoreCooldown?: boolean;
}

export interface YoutubeTranscriptBackfillResult {
  dryRun: boolean;
  limit: number;
  scanned: number;
  eligible: number;
  enqueued: number;
  skippedExisting: number;
  skippedTerminal: number;
  skippedCooldown: number;
  cooldownActive: boolean;
  cooldownUntil: number | null;
}

type BackfillRow = ItemRow & {
  transcript_job_state: TranscriptJobState | null;
};

const TERMINAL_JOB_STATES = new Set<TranscriptJobState>([
  "manual_needed",
  "ignored",
  "done",
]);

const ACTIVE_JOB_STATES = new Set<TranscriptJobState>([
  "pending",
  "running",
  "retryable_error",
]);

export function backfillYoutubeTranscriptRecoveryJobs(
  options: YoutubeTranscriptBackfillOptions = {},
): YoutubeTranscriptBackfillResult {
  const now = options.now ?? Date.now();
  const dryRun = options.dryRun ?? true;
  const limit = clampLimit(options.limit ?? 25);
  const cooldown = getYoutubeTimedTextCooldown(now);
  const cooldownActive = cooldown.active && options.ignoreCooldown !== true;
  const rows = listWeakYoutubeItemsForBackfill(limit);
  const result: YoutubeTranscriptBackfillResult = {
    dryRun,
    limit,
    scanned: 0,
    eligible: 0,
    enqueued: 0,
    skippedExisting: 0,
    skippedTerminal: 0,
    skippedCooldown: 0,
    cooldownActive,
    cooldownUntil: cooldown.cooldownUntil,
  };

  for (const row of rows) {
    result.scanned += 1;
    if (!isYoutubeTranscriptRecoveryCandidate(row)) continue;

    if (row.transcript_job_state && TERMINAL_JOB_STATES.has(row.transcript_job_state)) {
      result.skippedTerminal += 1;
      continue;
    }

    if (row.transcript_job_state && ACTIVE_JOB_STATES.has(row.transcript_job_state)) {
      result.skippedExisting += 1;
      continue;
    }

    result.eligible += 1;
    if (cooldownActive) {
      result.skippedCooldown += 1;
      continue;
    }
    if (!dryRun && enqueueTranscriptJobForItem(row)) {
      result.enqueued += 1;
    }
  }

  logTranscriptProviderEvent({
    event: "transcript.backfill.summary",
    provider_key: YOUTUBE_TIMEDTEXT_PROVIDER_KEY,
    dry_run: result.dryRun,
    limit: result.limit,
    scanned: result.scanned,
    eligible: result.eligible,
    enqueued: result.enqueued,
    skipped_existing: result.skippedExisting,
    skipped_terminal: result.skippedTerminal,
    skipped_cooldown: result.skippedCooldown,
    cooldown_active: result.cooldownActive,
    cooldown_until: result.cooldownUntil,
  });

  return result;
}

function listWeakYoutubeItemsForBackfill(limit: number): BackfillRow[] {
  return getDb()
    .prepare(
      `SELECT i.*,
              tj.state AS transcript_job_state
         FROM items i
         LEFT JOIN transcript_jobs tj ON tj.item_id = i.id
        WHERE (
          i.source_platform IN ('youtube', 'youtube_short')
          OR i.source_type = 'youtube'
        )
        AND (
          i.capture_quality = 'metadata_only'
          OR i.extraction_warning IN (
            'no_transcript',
            'youtube_transcript_fetch_metadata_only',
            'youtube_antibot_metadata_only'
          )
        )
        ORDER BY i.captured_at ASC
        LIMIT ?`,
    )
    .all(limit) as BackfillRow[];
}

function clampLimit(limit: number): number {
  if (!Number.isFinite(limit)) return 25;
  return Math.max(1, Math.min(500, Math.floor(limit)));
}
