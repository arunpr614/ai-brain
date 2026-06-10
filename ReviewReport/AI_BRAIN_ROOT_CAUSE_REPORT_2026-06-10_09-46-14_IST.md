# AI Brain Root Cause Report - Telegram YouTube Capture + Dummy Library Records

**Created:** 2026-06-10 09:46:14 IST  
**Author:** Codex  
**Environment investigated:** production Hetzner host `brain`, local project worktree `codex/v0.7.3-telegram-capture-hardening`  
**User symptoms:**

1. Telegram bot returned: `Couldn't capture: Video is private, deleted, or unavailable.`
2. YouTube links were not visible in the web Library.
3. Web Library showed dummy note records titled `Ready`, `Failed`, `Pending`, and `Saved`.

## Executive Summary

There are two separate root causes.

### 1. Telegram YouTube capture failed because YouTube blocks Hetzner's server-side InnerTube requests

The YouTube videos the user sent are public and extract correctly from the Mac/local network. The same InnerTube request from the production Hetzner server returns:

```text
playabilityStatus: LOGIN_REQUIRED
reason: Sign in to confirm you're not a bot
hasVideoDetails: false
```

The app currently treats any missing `videoDetails` as:

```text
Video is private, deleted, or unavailable.
```

That message is misleading here. The videos were not private/deleted; YouTube was challenging the server IP as bot-like. Because the extractor throws before `insertCaptured()`, no Library item is created.

### 2. Dummy Library records came from unit-test fixtures copied into production by the deploy artifact

The records are exact matches for `src/lib/items/status.test.ts` fixtures:

```text
Saved   / Waiting
Pending / Ready for indexing
Failed  / Ready for indexing
Ready   / Ready for indexing
```

The status test imported DB-using modules before its temp DB setup import, so it wrote into the default local `data/brain.sqlite`. Then `next build` copied `data/brain.sqlite` into `.next/standalone/data/brain.sqlite`. Finally, `scripts/deploy.sh` rsynced `.next/standalone/` to `/opt/brain/` without excluding `data/`, overwriting production data with the polluted local artifact.

## Evidence

### Telegram / YouTube Evidence

Production errors in `/opt/brain/data/errors.jsonl`:

```json
{"type":"telegram.capture.url-failed","url":"https://www.youtube.com/watch?v=1PXH0mRhbwk","message":"Video is private, deleted, or unavailable.","ts":1781060206541}
{"type":"telegram.capture.url-failed","url":"https://www.youtube.com/watch?v=Owv503rTqYY","message":"Video is private, deleted, or unavailable.","ts":1781060299287}
{"type":"telegram.capture.url-failed","url":"https://www.youtube.com/watch?v=ib74sLgjIBM","message":"Video is private, deleted, or unavailable.","ts":1781060340754}
```

Converted to IST:

- `1PXH0mRhbwk`: 2026-06-10 08:26:46 IST
- `Owv503rTqYY`: 2026-06-10 08:28:19 IST
- `ib74sLgjIBM`: 2026-06-10 08:29:00 IST

Local Mac InnerTube result for the same IDs:

- `1PXH0mRhbwk`: OK, title `Stop Mass Applying. Use This AI Job Hunter Instead | #TheAIGuy`, captions present.
- `Owv503rTqYY`: OK, title `Claude Code + Graphify = Insane Agentic OS`, captions present.
- `ib74sLgjIBM`: OK, title `Build A Claude Knowledge Base That Self-Improves!`, captions present.

Hetzner InnerTube result for all three IDs and even the known public fixture `jNQXAC9IVRw`:

```text
http: 200
playabilityStatus: LOGIN_REQUIRED
reason: Sign in to confirm you're not a bot
hasVideoDetails: false
captions: 0
```

Hetzner oEmbed fallback check for the three user video IDs:

- HTTP 200 from `https://www.youtube.com/oembed`.
- Correct title and author returned for all three videos.

### Dummy Records Evidence

Production DB before cleanup:

```text
items: 8

Failed   Ready for indexing  2
Pending  Ready for indexing  2
Ready    Ready for indexing  2
Saved    Waiting             2
```

Production row creation timestamps:

```text
2026-06-09 22:31:07 IST - one batch of Saved/Pending/Failed/Ready
2026-06-09 22:34:25 IST - one batch of Saved/Pending/Failed/Ready
```

The exact test fixture source:

```text
src/lib/items/status.test.ts
```

Before fix, that file imported:

```ts
import { getDb } from "@/db/client";
import { insertCaptured } from "@/db/items";
import { TEST_DB_DIR } from "@/lib/embed/pipeline.test.setup";
```

Because `src/db/client.ts` computes `DB_PATH` at module import time, setting `BRAIN_DB_PATH` after importing DB modules is too late.

The deploy artifact also contained runtime data:

```text
.next/standalone/data/brain.sqlite
.next/standalone/data/errors.jsonl
.next/standalone/data/backups/...
```

The deploy script previously copied all of `.next/standalone/`:

```bash
rsync -az --delete .next/standalone/ "${SSH_HOST}:${REMOTE_DIR}/"
```

That command allowed the local build artifact to overwrite `/opt/brain/data/brain.sqlite`.

## Cleanup Performed

### Production Cleanup

Backup created before deletion:

```text
/opt/brain/data/backups/2026-06-10_094427_pre_dummy_cleanup.sqlite
```

Cleanup deleted only rows matching the exact fixture signatures:

```text
title='Saved' AND body='Waiting'
title IN ('Ready','Failed','Pending') AND body='Ready for indexing'
```

Cleanup result:

```json
{
  "deletedItems": 8,
  "deletedVectorRows": 6,
  "remainingItems": 0,
  "remainingChunks": 0,
  "remainingChunkRowids": 0,
  "remainingVectorRows": 0,
  "remainingEmbeddingJobs": 0,
  "remainingFtsRows": 0
}
```

Production service was restarted and verified active after cleanup.

### Local Cleanup

The local default DB had 40 copies of the same fixture records. Backup created:

```text
data/backups/2026-06-10_094533_pre_local_dummy_cleanup.sqlite
```

Local cleanup result:

```json
{"deletedItems":40,"deletedVectorRows":0}
{"remainingItems":0,"remainingChunks":0,"remainingJobs":0,"remainingFts":0}
```

## Code Changes Made Locally

### 1. Prevent status test from writing into default DB

Changed `src/lib/items/status.test.ts` so the test DB setup import runs before DB imports:

```ts
import { TEST_DB_DIR } from "@/lib/embed/pipeline.test.setup";
import { getDb } from "@/db/client";
import { insertCaptured } from "@/db/items";
```

Verification:

```text
node --import tsx --test src/lib/items/status.test.ts
4 tests passed
local data/brain.sqlite remained at 0 items
```

### 2. Prevent deploy from overwriting production runtime data

Changed `scripts/deploy.sh`:

```diff
- rsync -az --delete .next/standalone/ "${SSH_HOST}:${REMOTE_DIR}/"
+ rsync -az --delete --exclude '/data/' .next/standalone/ "${SSH_HOST}:${REMOTE_DIR}/"
```

This protects `/opt/brain/data/` from future deploy artifact syncs.

## Current State After Cleanup

Production:

```text
brain.service: active
items: 0
chunks: 0
embedding_jobs: 0
items_fts: 0
provider status: Claude ok, Gemini ok
```

Local default DB:

```text
items: 0
chunks: 0
embedding_jobs: 0
items_fts: 0
```

## Remaining Product Bug: Telegram YouTube Capture

The bot still needs a product fix before YouTube links can reliably save from production.

Recommended fix:

1. Detect `playabilityStatus.status === "LOGIN_REQUIRED"` with reason containing `not a bot`.
2. Do not call it private/deleted.
3. Use YouTube oEmbed as a metadata fallback because it works from Hetzner for the affected videos.
4. Save a metadata-only YouTube item with:
   - title from oEmbed,
   - author from oEmbed,
   - canonical YouTube URL,
   - body such as `[Transcript unavailable: YouTube blocked Brain's server transcript request with an anti-bot sign-in check.]`,
   - `extraction_warning='youtube_antibot_metadata_only'`.
5. Tell the user in Telegram that the link was saved but transcript extraction was blocked by YouTube.

This is better than failing the capture entirely.

Longer-term options:

- Add a periodic `smoke:youtube` check from the production host, not only from the Mac.
- Consider a transcript extraction provider or browser/cookie-backed path if full transcripts are important.
- Improve `YoutubeCaptureError` messages so all `playabilityStatus` reasons are surfaced accurately.

## Residual Risks

- Older B2 encrypted backups could not be decrypted in this session, so no historical restore was performed.
- The production Library is now empty because the only production rows present at investigation time were dummy rows.
- The recurrence fixes are local code changes at the time of this report; they still need normal review/commit/deploy before they protect future production deploys.
- The Telegram YouTube fallback is not yet implemented/deployed.

## Follow-Up Checklist

- [ ] Implement the YouTube anti-bot/oEmbed fallback.
- [ ] Add a production-host YouTube smoke check.
- [ ] Commit the test-isolation and deploy-data-exclusion fixes.
- [ ] Before the next deploy, confirm `.next/standalone/data/` is not synced to `/opt/brain/data/`.
- [ ] After the next deploy, verify production `items` count does not change unexpectedly.
