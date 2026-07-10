# AI Brain Handover - 2026-06-11 22:36 IST

**Audience:** next AI agent picking up AI Brain Phase 2 work.
**Primary source repo/worktree:** `/private/tmp/ai-brain-v0.8.0-safe-capture-upgrades`
**Production URL:** `https://brain.arunp.in`
**Current deployed version:** v0.8.5
**Current deployed commit:** `2b4db95 Merge PR #5: production YouTube backfill runner`
**Current production service state:** `brain` active on Hetzner.
**Handover status:** safe to stop for the day. Do not run any real YouTube backfill unless Arun explicitly asks after a fresh dry-run.

---

## 1. Quick Start For The Next Agent

Start here:

```bash
cd /private/tmp/ai-brain-v0.8.0-safe-capture-upgrades
git fetch origin
git status --short --branch
git log --oneline --decorate -n 8
```

Expected state at handover:

```text
HEAD detached at origin/main
origin/main = 2b4db95 Merge PR #5: production YouTube backfill runner
one old untracked review artifact remains:
ReviewReport/V0_8_3_YOUTUBE_TRANSCRIPT_RECOVERY_RECENT_WORK_ADVERSARIAL_REVIEW_2026-06-11_12-26-34_IST.md
```

The untracked review artifact is old and unrelated to v0.8.5. Do not delete it unless Arun asks.

Production sanity check:

```bash
ssh brain 'systemctl is-active brain'
ssh brain 'sqlite3 /opt/brain/data/brain.sqlite -json "SELECT COUNT(*) AS items FROM items;"'
ssh brain 'sqlite3 /opt/brain/data/brain.sqlite -json "SELECT state, COUNT(*) AS count FROM transcript_jobs GROUP BY state ORDER BY state;"'
ssh brain 'sqlite3 /opt/brain/data/brain.sqlite "SELECT key, value FROM settings WHERE key LIKE '\''provider_health.%'\'';"'
ssh brain 'cd /opt/brain && node scripts/backfill-youtube-transcripts-prod.mjs --list-runs'
```

Expected current production state as of this handover:

- `brain` service: active.
- Items: 5.
- Transcript jobs: 5 `retryable_error`.
- Provider cooldown: active.
- Backfill run summaries: 1 dry-run summary.
- Real backfill enqueue mode has not been run.

---

## 2. High-Level Story

The original user problem was:

> When a YouTube link is saved through the Telegram bot, Brain saves the link but says it could not read the transcript. Arun wants a better experience: save the item, recover transcripts later if needed, and give one Review page where weak captures can be resolved.

The work evolved into three shipped slices:

1. **v0.8.3 / PR #3 - recovery and Review experience**
   - YouTube captures save even when transcript extraction fails.
   - Weak YouTube captures queue transcript recovery.
   - Duplicate YouTube resends requeue recovery instead of dead-ending.
   - Telegram links point to `/review?focus=<itemId>`.
   - Manual pasted transcript/notes resolution is auditable.
   - Worker crash safety was added.

2. **v0.8.4 / PR #4 - provider resilience**
   - Provider cooldown is recorded in `settings`.
   - Transcript worker respects cooldown.
   - Attempts emit structured `transcript.provider` events.
   - Backfill helper exists in app code.
   - YouTube anti-bot / throttling no longer creates a retry storm.

3. **v0.8.5 / PR #5 - production-safe backfill operations**
   - Production-safe runner added under `/opt/brain/scripts`.
   - Dry-run is default.
   - Real enqueue mode is guarded by explicit `--run --limit=N`.
   - Runs are summarized and auditable.
   - Deploy now copies the runner.
   - A production dry-run was executed successfully.

The current state is healthier operationally: Brain still cannot automatically obtain transcripts from YouTube because YouTube is returning an anti-bot sign-in challenge from the server environment, but Brain now saves links, queues/retries honestly, cools down safely, and has an operator-safe dry-run backfill tool.

---

## 3. Important Files And Documents

### Running Log

Active running log on disk:

```text
/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/RUNNING_LOG.md
```

Archived large historical log:

```text
/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/Phase_2_RUNNING_LOG_ARCHIVE_2026-06-11.md
```

Note: the active log header still mentions `Phase_2_RUNNING_LOG.md`, but the actual active file present on disk in this session is `RUNNING_LOG.md`. Continue appending to `RUNNING_LOG.md` unless Arun explicitly corrects this.

### Plans

Key plan executed today:

```text
/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/docs/plans/v0.8.5-youtube-backfill-production-ops-implementation-plan-2026-06-11_21-26-01_IST.md
```

Prior related plans:

```text
/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/docs/plans/v0.8.4-youtube-transcript-provider-resilience-implementation-plan-2026-06-11_15-09-51_IST.md
/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/docs/plans/v0.8.3-youtube-transcript-recovery-hardening-implementation-plan-2026-06-11.md
```

### Main Code Files

Production backfill runner:

```text
/private/tmp/ai-brain-v0.8.0-safe-capture-upgrades/scripts/backfill-youtube-transcripts-prod.mjs
```

Command-level tests:

```text
/private/tmp/ai-brain-v0.8.0-safe-capture-upgrades/src/lib/capture/youtube-transcript/backfill-prod-script.test.ts
```

Deploy wiring:

```text
/private/tmp/ai-brain-v0.8.0-safe-capture-upgrades/scripts/deploy.sh
```

App-level backfill helper from v0.8.4:

```text
/private/tmp/ai-brain-v0.8.0-safe-capture-upgrades/src/lib/capture/youtube-transcript/backfill.ts
```

Provider cooldown:

```text
/private/tmp/ai-brain-v0.8.0-safe-capture-upgrades/src/lib/capture/youtube-transcript/provider-health.ts
```

Transcript worker:

```text
/private/tmp/ai-brain-v0.8.0-safe-capture-upgrades/src/lib/queue/transcript-worker.ts
```

Transcript job DB helpers:

```text
/private/tmp/ai-brain-v0.8.0-safe-capture-upgrades/src/db/transcript-jobs.ts
```

Telegram duplicate YouTube resend behavior:

```text
/private/tmp/ai-brain-v0.8.0-safe-capture-upgrades/src/lib/telegram/dispatch.ts
```

Review focus page:

```text
/private/tmp/ai-brain-v0.8.0-safe-capture-upgrades/src/app/review/page.tsx
```

---

## 4. PRs And Commits Shipped

### PR #3 - v0.8.3

```text
URL: https://github.com/arunpr614/ai-brain/pull/3
Merge commit: 89219dc Merge PR #3: capture review and YouTube recovery
```

Purpose:

- Save weak YouTube captures instead of failing.
- Add transcript recovery queue.
- Add Review focus links.
- Fix duplicate resend flow.

### PR #4 - v0.8.4

```text
URL: https://github.com/arunpr614/ai-brain/pull/4
Commit: 9a1ba35 feat(capture): add YouTube transcript provider cooldown
Merge commit: c3bf2d6 Merge PR #4: YouTube transcript provider resilience
```

Purpose:

- Add provider cooldown.
- Add structured provider events.
- Add app-level backfill helper.
- Harden worker retry behavior.

### PR #5 - v0.8.5

```text
URL: https://github.com/arunpr614/ai-brain/pull/5
Commit: a8b6f9e feat(capture): add production YouTube backfill runner
Merge commit: 2b4db95 Merge PR #5: production YouTube backfill runner
```

Purpose:

- Add production-safe dry-run-first YouTube transcript backfill runner.
- Copy runner to `/opt/brain/scripts`.
- Add command-level tests.
- Verify production dry-run.

---

## 5. Production Backup And Deployment Evidence

### v0.8.5 Pre-Deploy Backup

```text
/opt/brain/data/backups/pre-v0.8.5-youtube-backfill-runner-2026-06-11_163702.sqlite
```

Verified:

```text
integrity=ok
items=5
transcript_jobs=5
size=3.5M
```

### Deploy

Deployed from:

```text
origin/main = 2b4db95 Merge PR #5: production YouTube backfill runner
```

Command used:

```bash
BRAIN_AI_PROVIDER_WARN_ONLY=1 bash scripts/deploy.sh
```

Deploy result:

- Local typecheck passed.
- Local lint passed with 2 known warnings.
- Local full tests passed.
- Env check passed.
- Local AI provider check ran in warn-only mode because local Ollama was unreachable.
- Production build passed with known `unpdf` warning.
- Build artifact check passed.
- Artifact synced to Hetzner.
- Remote native dependencies rebuilt.
- `brain` service restarted.
- Authenticated health check passed.
- Remote AI provider checks passed:
  - Anthropic generation reachable.
  - Gemini embeddings reachable.
- Telegram webhook reachability check passed.
- Telegram smoke in deploy script was skipped because `TELEGRAM_RELEASE=1` was not set.

---

## 6. Production State At Handover

Checked at `2026-06-11 22:36 IST`.

### Service

```text
brain service: active
```

### Database Counts

```json
[{"items":5}]
```

Transcript jobs:

```json
[{"state":"retryable_error","count":5}]
```

This changed from the immediate post-smoke state. The Telegram resend smoke briefly made item `5f6eb5f8239c851f47c8476c` pending, then the worker retried after cooldown and moved it back to `retryable_error`.

### Provider Health

Current provider health row:

```text
provider_health.youtube_timedtext|{"providerKey":"youtube_timedtext","providerName":"youtube_innertube_timedtext","cooldownUntil":1781200817668,"failureCount":6,"lastFailureAt":1781197547969,"lastFailureCode":"youtube_antibot_metadata_only","lastStatusCode":null,"lastSuccessAt":null,"updatedAt":1781197547969}
```

Interpretation:

- Provider cooldown is active.
- Latest failure is still YouTube anti-bot sign-in challenge.
- This is not a duplicate/backfill issue.
- The server-side timed-text provider is being blocked by YouTube.

### Backfill Summary

Production runner exists and is installed:

```text
/opt/brain/scripts/backfill-youtube-transcripts-prod.mjs
```

Dry-run summary:

```json
{
  "file": "2026-06-11T16-40-52-974Z-dry-run.json",
  "path": "/opt/brain/data/operator-runs/youtube-transcript-backfill/2026-06-11T16-40-52-974Z-dry-run.json",
  "dryRun": true,
  "limit": 5,
  "scanned": 5,
  "eligible": 0,
  "enqueued": 0,
  "skippedExisting": 5,
  "skippedTerminal": 0,
  "skippedCooldown": 0,
  "cooldownActive": true
}
```

Real enqueue-mode backfill has not been run.

---

## 7. Current Transcript Jobs

Latest job detail at handover:

```json
[
  {
    "id": 9,
    "item_id": "5f6eb5f8239c851f47c8476c",
    "video_id": "jNQXAC9IVRw",
    "state": "retryable_error",
    "attempts": 4,
    "max_attempts": 7,
    "next_run_at": 1781211947969,
    "last_error_code": "youtube_antibot_metadata_only",
    "title": "Me at the zoo"
  },
  {
    "id": 4,
    "item_id": "06049556036d0fdc4277f981",
    "video_id": "PDxKrp-dTDA",
    "state": "retryable_error",
    "attempts": 1,
    "max_attempts": 5,
    "last_error_code": "youtube_antibot_metadata_only",
    "title": "Gemma 4 12B on a 16GB Mac Mini Is Surprisingly Capable"
  },
  {
    "id": 1,
    "item_id": "ab593dd1c09a348255903745",
    "video_id": "R2-Y1Hjwx2U",
    "state": "retryable_error",
    "attempts": 2,
    "max_attempts": 5,
    "last_error_code": "youtube_antibot_metadata_only",
    "title": "Stop Picking Between Claude Code and Codex: A Strategic Approach"
  },
  {
    "id": 2,
    "item_id": "92c2820748d88db388279085",
    "video_id": "1wfY7GCVvh0",
    "state": "retryable_error",
    "attempts": 2,
    "max_attempts": 5,
    "last_error_code": "youtube_antibot_metadata_only",
    "title": "Google's Agents CLI: Building and Shipping AI Agents with CLI and Skills Architecture"
  },
  {
    "id": 3,
    "item_id": "955c1b8c9e18885b6b2cb1e4",
    "video_id": "mWLDn49_8HA",
    "state": "retryable_error",
    "attempts": 2,
    "max_attempts": 5,
    "last_error_code": "youtube_antibot_metadata_only",
    "title": "Graphify + Obsidian + Claude Code = CHEAT CODE"
  }
]
```

All 5 are the same class of failure:

```text
youtube_antibot_metadata_only
YouTube returned an anti-bot sign-in challenge.
```

---

## 8. Important Operational Commands

### Check service

```bash
ssh brain 'systemctl is-active brain'
```

### Check transcript job counts

```bash
ssh brain 'sqlite3 /opt/brain/data/brain.sqlite -json "SELECT state, COUNT(*) AS count FROM transcript_jobs GROUP BY state ORDER BY state;"'
```

### Check provider cooldown

```bash
ssh brain 'sqlite3 /opt/brain/data/brain.sqlite "SELECT key, value FROM settings WHERE key LIKE '\''provider_health.%'\'';"'
```

### Inspect latest transcript jobs

```bash
ssh brain 'sqlite3 /opt/brain/data/brain.sqlite -json "SELECT tj.id, tj.item_id, tj.video_id, tj.state, tj.attempts, tj.max_attempts, tj.next_run_at, tj.last_provider, tj.last_error_code, tj.last_error_message, i.title, i.source_url, i.capture_quality, i.extraction_warning FROM transcript_jobs tj JOIN items i ON i.id = tj.item_id ORDER BY tj.updated_at DESC;"'
```

### Inspect latest transcript attempts

```bash
ssh brain 'sqlite3 /opt/brain/data/brain.sqlite -json "SELECT id, item_id, attempt_number, provider, state, retryable, error_code, status_code, started_at, finished_at FROM transcript_attempts ORDER BY id DESC LIMIT 20;"'
```

### Inspect provider events

```bash
ssh brain 'grep -F "transcript.provider" /opt/brain/data/errors.jsonl | tail -50'
```

### Run safe YouTube backfill dry-run

```bash
ssh brain 'cd /opt/brain && node scripts/backfill-youtube-transcripts-prod.mjs --limit=5'
```

This is safe because it omits `--run`.

### List backfill run summaries

```bash
ssh brain 'cd /opt/brain && node scripts/backfill-youtube-transcripts-prod.mjs --list-runs'
```

### Clear old run summaries only

```bash
ssh brain 'cd /opt/brain && node scripts/backfill-youtube-transcripts-prod.mjs --clear-runs --older-than-days=30'
```

This deletes only run summary JSON files under:

```text
/opt/brain/data/operator-runs/youtube-transcript-backfill/
```

It does not delete transcript jobs, transcript attempts, items, capture artifacts, or `errors.jsonl`.

---

## 9. Do Not Do These Without Explicit User Approval

Do not run real backfill:

```bash
node scripts/backfill-youtube-transcripts-prod.mjs --run ...
```

Do not bypass cooldown:

```bash
node scripts/backfill-youtube-transcripts-prod.mjs --ignore-cooldown ...
```

Do not reset transcript jobs blindly.

Do not delete production smoke item `5f6eb5f8239c851f47c8476c` unless Arun asks.

Do not delete the old untracked review artifact unless Arun asks.

Do not implement `yt-dlp`, browser scraping, or ASR in the same small operational slice as scheduling. Those need separate design/review because they change privacy, dependency, and cost profiles.

---

## 10. Validation Evidence

Most recent validation before PR #5 merge and deploy:

```text
node --check scripts/backfill-youtube-transcripts-prod.mjs
node --import tsx --test src/lib/capture/youtube-transcript/backfill-prod-script.test.ts
npm run typecheck
npm test
npm run lint
npm run build
npm run check:build-artifacts
git diff --check
```

Results:

- Focused production-runner tests: 7 passed.
- Full tests: 496 passed, 0 failed.
- Typecheck: passed.
- Lint: passed with 2 known existing warnings:
  - `src/lib/client/register-sw.ts` unused `no-console` eslint-disable.
  - `src/lib/queue/enrichment-batch-cron.ts` unused `no-var` eslint-disable.
- Build: passed with known `unpdf` warning.
- Build-artifact check: passed.
- Deploy-time remote checks: passed.

Known warning that is not related to this work:

```text
./node_modules/unpdf/dist/index.mjs
Critical dependency: Accessing import.meta directly is unsupported
```

---

## 11. Recommended Next Work

### P0

No active P0 production blocker at handover.

Production is healthy, v0.8.5 is deployed, and real backfill was not run.

### P1

1. **Observe the next transcript cooldown/retry window**
   - Confirm the worker continues to respect cooldown.
   - Confirm jobs remain retryable rather than turning into noisy manual-needed failures.

2. **Decide whether to add scheduled daily dry-run**
   - The manual runner is proven.
   - A scheduled dry-run should be a tiny follow-up PR.
   - Do not schedule real `--run` yet.

3. **Review the 5 retryable YouTube items**
   - They are all anti-bot failures.
   - Decide whether Arun wants manual transcript/notes pasted for any important item.

4. **Plan transcript-provider fallback**
   - Current timed-text provider is blocked by YouTube anti-bot.
   - The right next feature is not more backfill; it is a fallback strategy.

### P2

1. Build `/ops/transcripts` or `/admin/transcripts` page.
2. Decide whether to keep/delete smoke item `5f6eb5f8239c851f47c8476c`.
3. Clean local untracked review artifact.
4. Consider scheduled dry-run summary surfacing in UI.

---

## 12. Suggested Next Implementation Slices

### Slice A - Scheduled Dry-Run Only

Goal:

- Add a daily dry-run schedule that writes a summary and never enqueues jobs.

Recommended implementation:

- Add a cron file under `scripts/deploy/`, or a small documented systemd timer.
- Keep it dry-run only:

```bash
cd /opt/brain && node scripts/backfill-youtube-transcripts-prod.mjs --limit=25
```

Acceptance:

- The schedule is installed only through an explicit deploy/ops step.
- Logs are visible.
- Rollback is simple.
- No real mutation.

### Slice B - Operator Page

Goal:

- Make transcript state visible without SSH.

Show:

- provider cooldown;
- job counts;
- latest attempts;
- recent backfill summaries;
- links to Review focused items.

Initial actions:

- dry-run preview only;
- per-job retry/ignore only if already established actions exist.

Do not add broad reset/delete controls.

### Slice C - Transcript Fallback Strategy

Goal:

- Improve actual transcript success now that operations are safe.

Consider in this order:

1. Alternate YouTube client/provider contexts.
2. Optional operator-only `yt-dlp` fallback.
3. Browser-authorized transcript capture.
4. ASR/audio transcription fallback.

Do this as a separate research/implementation plan first.

---

## 13. Product Notes For Arun

The user-facing experience is now meaningfully better:

- YouTube links are saved even when transcript extraction fails.
- The bot no longer dead-ends on duplicate YouTube resends.
- Review focus links point to the specific item.
- Recovery jobs are durable and auditable.
- The system now avoids hammering YouTube during anti-bot/cooldown windows.
- Operators can run a safe dry-run backfill from production.

But automatic transcript extraction is still not solved:

- YouTube is returning anti-bot sign-in challenges from the production server.
- More backfill will not fix that by itself.
- The next product improvement needs a fallback provider/capture strategy.

---

## 14. Final State Snapshot

- **Version:** v0.8.5.
- **Production commit:** `2b4db95`.
- **Production service:** active.
- **Production database:** 5 items.
- **Transcript jobs:** 5 retryable errors.
- **Backfill runner:** installed and dry-run verified.
- **Real backfill:** not run.
- **Provider cooldown:** active.
- **Primary remaining issue:** YouTube anti-bot blocks timed-text transcript extraction.
- **Best next move:** observe cooldown/retry once more, then either add scheduled dry-run or plan transcript fallback.
