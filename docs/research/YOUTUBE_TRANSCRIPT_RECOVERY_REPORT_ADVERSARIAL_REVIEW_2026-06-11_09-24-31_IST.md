# YouTube Transcript Recovery Report - Adversarial Review

**Created:** 2026-06-11 09:24:31 IST
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/docs/research/youtube-transcript-recovery-and-review-experience-2026-06-11.md`
**Report path:** `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/docs/research/YOUTUBE_TRANSCRIPT_RECOVERY_REPORT_ADVERSARIAL_REVIEW_2026-06-11_09-24-31_IST.md`

## Executive Verdict

Conditional go for using the report as a research direction. No-go for handing it directly to an implementation agent as the execution plan.

The report identifies the correct product shape: save immediately, recover asynchronously, centralize weak captures in Review, and keep ASR opt-in. But it is not yet operationally safe. It under-specifies the migration/backfill path for existing metadata-only YouTube items, blurs two different worktrees, lacks a subprocess security model for `yt-dlp`, and does not define enough observability or acceptance gates to know whether the recovery system is working after release.

The highest-risk failure is that the exact user item that triggered the report can remain unrecovered if the implementation only enqueues future metadata-only inserts. The second-highest risk is that a future agent implements this in the stale phase2 root instead of the v0.8.2 Review worktree, duplicating or losing already-completed Review/upgrade behavior.

## Evidence Inspected

- Target report with line numbers:
  - `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/docs/research/youtube-transcript-recovery-and-review-experience-2026-06-11.md`
- Current phase2 code:
  - `src/lib/capture/youtube.ts`
  - `src/lib/telegram/dispatch.ts`
  - `src/db/items.ts`
  - `src/db/migrations/003_enrichment_queue.sql`
  - `src/lib/capture/artifacts.ts`
  - `src/db/migrations/014_capture_artifacts.sql`
  - `src/db/migrations/016_capture_artifacts_hardening.sql`
  - `src/components/sidebar.tsx`
  - `src/instrumentation.ts`
- v0.8.2 temp worktree code:
  - `/private/tmp/ai-brain-v0.8.0-safe-capture-upgrades/src/app/review/page.tsx`
  - `/private/tmp/ai-brain-v0.8.0-safe-capture-upgrades/src/lib/review/attention.ts`
  - `/private/tmp/ai-brain-v0.8.0-safe-capture-upgrades/src/app/items/[id]/upgrade-actions.ts`
  - `/private/tmp/ai-brain-v0.8.0-safe-capture-upgrades/src/db/item-upgrades.ts`
  - `/private/tmp/ai-brain-v0.8.0-safe-capture-upgrades/src/components/sidebar.tsx`
- Command output:
  - `npm run smoke:youtube:quality` still fails on `jNQXAC9IVRw` with `capture_quality = metadata_only` and `extraction_warning = youtube_transcript_fetch_metadata_only`.
  - `git status --short` showed the target report is untracked.
  - `yt-dlp` was previously confirmed absent locally.
- External primary sources spot-checked:
  - YouTube Data API `captions.download`: https://developers.google.com/youtube/v3/docs/captions/download
  - OpenAI Speech to Text: https://developers.openai.com/api/docs/guides/speech-to-text

## Findings

### P0 - Must Fix Before Execution Or Release

No P0 findings found.

### P1 - High Risk

#### 1. The plan can miss the existing broken YouTube items, including the one that triggered the request

**Evidence:** The final recommendation says the best next step is to add `transcript_jobs`, enqueue YouTube metadata-only captures, retry timed-text failures, show status on `/review`, and change Telegram copy (`youtube-transcript-recovery-and-review-experience-2026-06-11.md:622-628`). The worker design says "On YouTube capture insert, if `capture_quality = "metadata_only"`, enqueue `transcript_jobs`" (`youtube-transcript-recovery-and-review-experience-2026-06-11.md:397`). It does not require a migration backfill for existing metadata-only YouTube rows, nor does it specify that duplicate-link Telegram saves should enqueue or refresh a recovery job. Current Telegram dispatch returns early for duplicate URLs when no user text is present (`src/lib/telegram/dispatch.ts:186-192`), before extraction or any new recovery behavior could run.

**Why it matters:** The user complained about an already-created item (`92c2820748d88db388279085`). A future-only enqueue strategy improves new saves but does not fix the actual item or the existing metadata-only backlog.

**Failure mode:** User resends the same YouTube link, Telegram replies "Already captured", no transcript job is created, `/review` shows the item but background recovery never starts. The report looks implemented, but the user-visible problem remains.

**Recommendation:** Add a required migration/backfill step: enqueue all existing YouTube and YouTube Shorts items where `capture_quality = 'metadata_only'` or `extraction_warning IN ('no_transcript', 'youtube_transcript_fetch_metadata_only', 'youtube_antibot_metadata_only')`. Also change duplicate handling so a duplicate metadata-only YouTube item either creates/resets a `transcript_jobs` row or returns a Review link with current recovery status.

#### 2. The report straddles two code states and can send implementation into the wrong tree

**Evidence:** The target report says the phase2 root sidebar has a disabled `/review` item (`youtube-transcript-recovery-and-review-experience-2026-06-11.md:54`), which is true in the phase2 root (`src/components/sidebar.tsx:24-29`). But Entry #64 says the active v0.8.2 source worktree is `/private/tmp/ai-brain-v0.8.0-safe-capture-upgrades`; that worktree already has Review enabled (`/private/tmp/ai-brain-v0.8.0-safe-capture-upgrades/src/components/sidebar.tsx:24-29`) and a Review page (`/private/tmp/ai-brain-v0.8.0-safe-capture-upgrades/src/app/review/page.tsx:63-107`). The target report lists `src/app/review/page.tsx` and `src/lib/review/attention.ts` as likely implementation files (`youtube-transcript-recovery-and-review-experience-2026-06-11.md:576-577`), but those files do not exist in the phase2 root and do exist in the v0.8.2 worktree.

**Why it matters:** A future agent could start from the phase2 root, recreate Review from scratch, and ignore the already-smoked v0.8.2 implementation. Or they could patch the temp worktree without updating the report's path assumptions. Either path increases merge risk and rework.

**Failure mode:** Two divergent Review implementations exist. Transcript recovery UI lands in one tree while the release branch uses another. Manual paste upgrade behavior from v0.8.2 is lost or duplicated.

**Recommendation:** Add an "Implementation baseline" section to the report. It must say whether transcript recovery should start from the v0.8.2 worktree (`/private/tmp/ai-brain-v0.8.0-safe-capture-upgrades`) or from the phase2 root after merging v0.8.2. The report should explicitly name the current Review implementation and say not to recreate it if v0.8.2 is the base.

#### 3. The `yt-dlp` fallback recommendation lacks a production subprocess safety model

**Evidence:** The report recommends `yt-dlp` as the "first serious fallback" after InnerTube (`youtube-transcript-recovery-and-review-experience-2026-06-11.md:161-194`) and provides a shell-shaped command (`youtube-transcript-recovery-and-review-experience-2026-06-11.md:167-180`). It mentions timeout and temp working directory (`youtube-transcript-recovery-and-review-experience-2026-06-11.md:184-187`), but does not require host allowlisting, `spawn` with an argument array, no shell invocation, temp-directory cleanup, output filename containment checks, concurrency limits, process memory/time limits, stderr redaction, or disk quotas.

**Why it matters:** `yt-dlp` is not just a library call. It is a subprocess that follows remote extraction logic and writes files. In a personal app this still matters: malformed URLs, playlists, extractor changes, or path mistakes can produce unexpected network access, disk writes, noisy logs, or stuck jobs.

**Failure mode:** A Telegram URL causes the worker to spawn a long-running or high-output subprocess, fills artifact storage, logs sensitive request information, or writes outside the intended temp directory. The server remains "working" but becomes slower or unstable.

**Recommendation:** Add a required `yt-dlp` security contract before Phase C: only run for canonical YouTube video URLs, use `child_process.spawn(file, args, { shell: false })`, enforce a per-job timeout, enforce max stdout/stderr bytes, create and delete an isolated temp directory per job, validate all output paths remain under that directory, set concurrency to 1 by default, store only capped/redacted artifacts, and fail closed on playlists, live streams, and non-YouTube hosts.

#### 4. The queue design does not define a durable attempt history, so Review cannot explain what happened

**Evidence:** The proposed `transcript_jobs` table stores only one `provider`, `last_error`, and `last_status_code` (`youtube-transcript-recovery-and-review-experience-2026-06-11.md:355-379`). The Review page recommendation expects rows to show last attempt time, next retry time, provider attempted, and failure reason (`youtube-transcript-recovery-and-review-experience-2026-06-11.md:319-327`). The report also says provider attempts should be stored as artifacts (`youtube-transcript-recovery-and-review-experience-2026-06-11.md:527-529`). Existing capture artifacts are capped and kind-based (`src/lib/capture/artifacts.ts:15-25`), write files under `data/artifacts/captures` (`src/lib/capture/artifacts.ts:13`, `src/lib/capture/artifacts.ts:86-92`), and list rows only by item and created time (`src/db/capture-artifacts.ts:53-57`). There is no attempt table, no per-job attempt linkage, and no retention policy.

**Why it matters:** A retry worker needs auditability. "Manual needed" is not actionable unless the user or operator can see what was tried, whether failure was "no captions", "429", "anti-bot", "yt-dlp missing", "timeout", or "provider crash".

**Failure mode:** Review says "manual help needed" but cannot explain whether this is a permanent no-caption case or a transient rate limit. Future debugging requires scraping logs or artifacts. Repeated retries accumulate artifacts without a clear cap or cleanup rule.

**Recommendation:** Add a `transcript_attempts` table or structured attempt JSON with `job_id`, `attempt_number`, `provider`, `started_at`, `finished_at`, `status`, `status_code`, `error_code`, `error_message`, `artifact_ids`, `duration_ms`, and `retryable`. Add retention rules: max attempts per job, max bytes per item, and redaction/capping for stdout/stderr and provider JSON.

### P2 - Medium Risk

#### 1. Acceptance criteria are too weak to prove the provider ladder works

**Evidence:** Phase C acceptance says "Known public videos with captions succeed above current baseline" and that `jNQXAC9IVRw` no longer stays terminal on a single timed-text 429 (`youtube-transcript-recovery-and-review-experience-2026-06-11.md:525-530`). The current smoke still fails on one fixture. The report recommends benchmarking against 50 to 100 videos only in the `youtube-transcript-api` section (`youtube-transcript-recovery-and-review-experience-2026-06-11.md:156-159`), not as a release gate for the selected provider ladder.

**Why it matters:** One public fixture proves a regression exists, not that a fallback strategy is robust. YouTube extraction behavior varies by language, captions type, Shorts, age-restricted content, live streams, region, and rate limits.

**Failure mode:** The implementation passes `jNQXAC9IVRw` but still fails the user's real watchlist. The team ships false confidence.

**Recommendation:** Promote the fixture-set benchmark to a required release gate for Phase C. Include manual captions, generated captions, non-English captions, Shorts, live/post-live, no-caption videos, region-blocked/private/unavailable cases, and known 429-prone videos. Track success rate and classify failures by expected/permanent vs transient/retryable.

#### 2. The plan does not specify how transcript upgrades interact with existing enrichment timing

**Evidence:** Existing inserts auto-enqueue every item for enrichment through a trigger (`src/db/migrations/003_enrichment_queue.sql:30-34`). The report correctly says successful transcript recovery must requeue enrichment and embeddings (`youtube-transcript-recovery-and-review-experience-2026-06-11.md:401-406`, `youtube-transcript-recovery-and-review-experience-2026-06-11.md:499-505`), but it does not specify whether initial enrichment should be delayed for metadata-only YouTube items while transcript recovery is pending. The v0.8.2 upgrade helper resets derived state after an upgrade (`/private/tmp/ai-brain-v0.8.0-safe-capture-upgrades/src/db/item-upgrades.ts:49-114`), but this helper is not present in the phase2 root.

**Why it matters:** Enriching metadata-only YouTube bodies first and then re-enriching after transcript recovery may be acceptable, but it has cost, queue churn, and confusing UI implications. Delaying enrichment may be better for short retry windows.

**Failure mode:** The system produces a low-value AI summary for metadata-only content, then later replaces it. Users see a "done" item that is not actually useful, then it changes again after recovery.

**Recommendation:** Add an explicit policy: either delay enrichment for YouTube metadata-only items while `transcript_jobs.state IN ('pending','running')` for a short window, or accept double-enrichment and show the item as "saved, transcript pending" rather than "fully processed". Reuse or port `upgradeItemCaptureContent` from v0.8.2 as the only path that updates content and resets derived state.

#### 3. The plan calls for artifacts but not secret/privacy redaction for provider logs

**Evidence:** The report recommends capturing stdout, stderr, exit code, output filenames, selected language, and provider attempts as artifacts (`youtube-transcript-recovery-and-review-experience-2026-06-11.md:184-188`, `youtube-transcript-recovery-and-review-experience-2026-06-11.md:527-529`). Existing artifact sanitization only strips script/style and a few token-like patterns from HTML content (`src/lib/capture/artifacts.ts:144-150`). Non-HTML stdout/stderr is not redacted by that sanitizer.

**Why it matters:** Provider logs can contain full URLs, request parameters, environment hints, file paths, or future cookies/proxy identifiers if the fallback grows. Artifacts are persistent.

**Failure mode:** A debugging artifact stores sensitive command output or signed/private URL material. Later export/backup includes it.

**Recommendation:** Add a transcript-artifact redaction layer that applies to all text artifacts, not only HTML. Cap stderr/stdout aggressively. Store normalized error codes separately from raw logs.

#### 4. ASR is correctly opt-in, but the no-go gates are not concrete enough

**Evidence:** The report says ASR should be opt-in because of cost, privacy, audio acquisition, and policy/terms implications (`youtube-transcript-recovery-and-review-experience-2026-06-11.md:258-270`, `youtube-transcript-recovery-and-review-experience-2026-06-11.md:606-611`). Phase E says to add cost/size guardrails and clear consent (`youtube-transcript-recovery-and-review-experience-2026-06-11.md:551-562`). It does not define hard no-go gates such as max duration, max cost, allowed content types, retention, deletion, or whether YouTube audio download is permitted at all.

**Why it matters:** "Opt-in" is not a sufficient safety boundary if the action can download/transcribe long copyrighted videos or create unexpectedly large bills.

**Failure mode:** User enables ASR once, then a long playlist or long video triggers expensive processing. Or a future implementation downloads YouTube audio without a clear policy decision.

**Recommendation:** Add concrete ASR gates: disabled by default, per-item confirmation with estimated cost, max duration, max file size, no playlists, no automatic ASR from Telegram, explicit retention/deletion behavior, and a policy decision before any YouTube audio download path is implemented.

### P3 - Low Risk Or Polish

#### 1. The language strategy is plausible but too implicit for implementation

**Evidence:** The report lists a preference order (`youtube-transcript-recovery-and-review-experience-2026-06-11.md:454-472`) but does not define where user language preferences live, what defaults apply when none are set, or how language/provenance appears in Review and exports.

**Why it matters:** Transcript language affects search quality and user trust. "Any manually created caption track" can be less useful than an English generated track depending on the user's preference.

**Failure mode:** A non-English manual transcript is selected when the user expected English, or a machine-translated transcript is stored without a visible label.

**Recommendation:** Add explicit default preferences and UI labels. Store `transcript_language`, `transcript_is_generated`, `transcript_is_translated`, and `transcript_source_provider`.

#### 2. The report does not separate "research recommendation" from "release plan"

**Evidence:** The document starts as a research report (`youtube-transcript-recovery-and-review-experience-2026-06-11.md:5`) but ends with "The best next engineering step is Phase B" (`youtube-transcript-recovery-and-review-experience-2026-06-11.md:622-628`) and a file list (`youtube-transcript-recovery-and-review-experience-2026-06-11.md:564-591`). It does not include owner, branch, rollout, rollback, or release sequencing.

**Why it matters:** A future agent may treat it as an implementation plan and skip planning details that matter for a queue/worker feature.

**Failure mode:** The implementation starts without a migration rollback path, host dependency decision, or production smoke plan.

**Recommendation:** Add a short "Not yet an implementation plan" notice, or convert it into a full implementation plan with branch, rollout, rollback, telemetry, tests, and deployment gates.

## What The Original Plan Or Work Gets Wrong

- It correctly rejects the official YouTube Captions API as a general solution, but it overestimates how implementation-ready the rest of the plan is.
- It treats "enqueue metadata-only captures" as if only future captures matter. Existing weak captures and duplicate save paths are the actual user problem.
- It calls `yt-dlp` practical without making the subprocess boundary production-safe.
- It says Review should be the single page, but ignores that the relevant Review page already exists in the v0.8.2 temp worktree and not in the phase2 root.
- It proposes a `transcript_jobs` table that is too shallow to support the Review diagnostics it recommends.
- It recommends storing attempts as artifacts without a retention/redaction model for repeated background attempts.

## Missing Validation

- Backfill test for existing YouTube metadata-only items.
- Duplicate-link Telegram test proving a duplicate metadata-only YouTube save creates or links to a transcript job.
- Worker stale-claim/retry tests for `transcript_jobs`, mirroring enrichment-worker behavior.
- Provider ladder benchmark across a diverse fixture set, not just `jNQXAC9IVRw`.
- `yt-dlp` sandbox test: no shell, no playlist, timeout, cleanup, output containment, max log bytes.
- Disk usage and artifact retention tests for repeated failed attempts.
- Review page test showing queued/running/manual-needed states with useful last-attempt details.
- Enrichment interaction test proving transcript upgrade resets stale summaries/chunks/embeddings exactly once.
- Production smoke plan for a real Telegram-shaped YouTube save followed by recovery status.

## Revised Recommendations

1. Revise the report before implementation. Do not hand it off as the execution plan yet.
2. Add an implementation baseline section that picks the v0.8.2 worktree or explicitly says to merge v0.8.2 first.
3. Make Phase B include both future enqueue and existing-item backfill.
4. Add duplicate-save recovery behavior to Telegram and API capture paths.
5. Replace the single `provider/last_error` model with a durable attempt history.
6. Add a subprocess security contract before allowing `yt-dlp`.
7. Make the provider benchmark and worker observability mandatory release gates.
8. Define ASR no-go gates before any audio download/transcription implementation.

## Go / No-Go Recommendation

No-go for direct implementation from the report as written.

Conditional go after the report is revised to include:

- Existing metadata-only item backfill.
- Duplicate-link recovery behavior.
- Clear source worktree/branch baseline.
- `yt-dlp` subprocess sandbox requirements.
- Attempt history and artifact retention/redaction.
- Provider benchmark acceptance gates.
- Enrichment/reset policy.

## Plan Revision Inputs

### Required Deletions

- Delete or soften any implication that Phase B can be implemented by only enqueueing new metadata-only captures.
- Delete any command-shaped `yt-dlp` guidance that could be read as safe to run through a shell.

### Required Additions

- Add `transcript_jobs` backfill for existing metadata-only YouTube items.
- Add `transcript_attempts` or equivalent structured attempt history.
- Add duplicate-link behavior for Telegram/API paths.
- Add worktree baseline: phase2 root vs `/private/tmp/ai-brain-v0.8.0-safe-capture-upgrades`.
- Add `yt-dlp` sandbox, resource-limit, concurrency, and cleanup rules.
- Add artifact retention/redaction rules.
- Add a worker observability section with counters and failure taxonomy.

### Required Acceptance Criteria Changes

- "Existing item `92c2820748d88db388279085` or an equivalent metadata-only fixture gets a transcript job after migration/backfill."
- "Resending an already-captured metadata-only YouTube link does not dead-end at 'Already captured'."
- "Review shows queued, running, retryable error, manual-needed, and recovered states."
- "Provider attempt history survives process restart and can be inspected from Review or logs."
- "`yt-dlp` cannot run for non-YouTube URLs, playlists, or through a shell."
- "Artifact/log storage remains below a defined per-item and global cap."

### Required Validation Changes

- Add migration/backfill test.
- Add duplicate-capture transcript-job test.
- Add worker stale-claim and retry/backoff tests.
- Add provider benchmark fixture set and minimum pass threshold.
- Add `yt-dlp` subprocess safety tests.
- Add enrichment reset tests using the v0.8.2 upgrade helper or a ported equivalent.

### Required No-Go Gates

- Do not ship if existing metadata-only YouTube items are not backfilled.
- Do not ship if duplicate YouTube saves cannot trigger or surface recovery.
- Do not ship `yt-dlp` fallback without subprocess sandbox tests.
- Do not ship ASR without explicit cost, retention, and policy gates.
- Do not ship from the wrong worktree or without reconciling v0.8.2 Review changes.

## Residual Risks

- YouTube internal surfaces can still change after all safeguards.
- `yt-dlp` can still break and may require ongoing update management.
- Some videos will remain unrecoverable without user-assisted browser capture or ASR.
- ASR remains legally and operationally sensitive even with opt-in.
- Background recovery adds operational complexity to a personal tool; without visible monitoring, failures can quietly accumulate.
