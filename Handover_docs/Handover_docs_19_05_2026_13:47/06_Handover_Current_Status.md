---
Title: AI Brain Handover — Current Status (M7)
Version: 1.0
Date: 2026-05-19
Previous version: n/a
Baseline: n/a
Mode: full
Author: AI agent (Claude)
---

> **For the next agent:** This is the load-bearing file. The cutover is half-done. Two decisions are explicitly punted to you (the user said "let the next agent decide rollback"). Read §3 carefully before doing anything destructive.

# 1. State at handover time (2026-05-19 13:47 IST)

## 1.1 Repo

| Property | Value |
|---|---|
| Branch | `main` |
| HEAD | `95259f1` |
| HEAD message | `fix(S-13): correct factory export name in backfill-embeddings.mjs` |
| Pushed to origin | ✅ |
| Working tree | **dirty** |
| Modified files | `src/lib/embed/gemini.ts` (serial loop + 1.1s inter-call delay) |
| Stash | empty |
| Recent commits this session | `5e39d32`, `e68314c`, `388ad7e`, `656c4a4`, `da2ddb4`, `95259f1` |
| Tags pushed | `phase-d-blocked-on-embeddings/v0.6.0` (revert anchor at `5e39d32`) |

## 1.2 Mac (live serving stack)

| Component | Status | Notes |
|---|---|---|
| `cloudflared` (root, pid 73069) | ✅ active | Running since 11 May, pointing at Mac tunnel UUID |
| `next-server (v16.2.5)` (user, pid 32761) | ✅ active | port 3000, brain dev server |
| `data/brain.sqlite` | 8 items, 768-dim **nomic-embed** vectors | source of truth UNTIL D-13 |
| `brain.arunp.in` | Routes to Mac | Via Mac tunnel UUID `58339d22-...` |

## 1.3 Hetzner (hot but not behind live URL)

| Component | Status | Notes |
|---|---|---|
| `brain.service` (systemd) | ✅ active | Listening 127.0.0.1:3000 |
| `cloudflared.service` (systemd) | ✅ active | Tunnel UUID `64fb278e-...` connected |
| `/opt/brain/data/brain.sqlite` | 8 items from Mac via D-12 | mode 0600 brain:brain |
| `/opt/brain/data/brain.sqlite.pre-cutover` | Empty (4 KB init schema) | Original Hetzner DB before D-12 |
| `chunks` table | 0 rows (Mac DB had 0) | Expected |
| `chunks_vec` table | **6 of 8 items have entries** | gemini-embedding-001 @ 768 |
| `brain-staging.arunp.in` | Routes to Hetzner | Via Hetzner tunnel UUID |

## 1.4 Items not embedded on Hetzner

| Item ID | Title preview | Body length | Cause |
|---|---|---|---|
| `c3fa6db5684309eff5080ab5` | "AI Integration Challenges and Opportunit..." | 111,596 chars (Hindi YouTube transcript, 44 chunks) | Free-tier Gemini TPM throttle |
| `1035317b0244e4d994e4fefd` | "The Skip Podcast - Reinvention: The Prod..." | 50,974 chars (English YouTube transcript, ~30 chunks) | Same |

These items remain searchable via FTS5 (full-text) but invisible to vector search until re-embedded.

## 1.5 Test counts

| Test | Status |
|---|---|
| `npm run typecheck` | ✅ clean (last verified before working-tree change) |
| Unit tests | ❌ Mac-side blocked by pre-existing better-sqlite3 Node v22→v26 mismatch (NOT a regression from this session) |
| `npm run smoke:batch` | ✅ green at session start (pre-S-13) |
| `npm run smoke:0.5.1` | ❌ broken since node-cron added in B-11 (carry-over) |
| Hetzner-side wire smoke (Anthropic) | ✅ green (HTTP 200, 733ms) |
| Hetzner-side wire smoke (Gemini) | ⚠️ green for small inputs, 429 on 2 large transcripts |
| Hetzner-side `brain.service` boot smoke | ✅ green |
| Hetzner-side `/api/health` (bearer) | ✅ HTTP 200 |
| End-to-end `brain-staging.arunp.in/api/health` (bearer) | ✅ HTTP 200 |

# 2. What worked end-to-end during D-11

| Probe | Result |
|---|---|
| Hetzner → api.anthropic.com (TLS + key auth + claude-haiku-4-5) | ✅ 200 in 733ms; 13 in / 5 out tokens (~$0.00004) |
| Hetzner → generativelanguage.googleapis.com (gemini-embedding-001 @ 768, small input) | ✅ 200 |
| Hetzner → generativelanguage.googleapis.com (large transcript) | ❌ 429 RESOURCE_EXHAUSTED |
| Mac → CF edge → Hetzner tunnel → /api/health (with bearer) | ✅ 200 |

# 3. **OPEN DECISIONS (punted to next agent)**

The user explicitly said: **"let the next agent decide rollback."** Both decisions below need your judgment.

## 3.1 Decision A — Roll back D-12 or leave Hetzner DB as-is?

| Option | Pros | Cons |
|---|---|---|
| **A1: Roll back** — restore Hetzner's pre-cutover state, copy `/opt/brain/data/brain.sqlite.pre-cutover` back over `brain.sqlite`, delete `chunks_vec` rows | Cleanest state for fresh resume. No drift if Mac sees new captures in the meantime. | Loses the 6 successful embeds (~$0 cost, but ~10 min of work). Re-do D-12 + migration when resuming. |
| **A2: Leave as-is** | Keeps the 6 successful embeds. Faster resume (just re-embed 2 + run D-13/D-14). | If user captures on Mac in the meantime, Mac DB drifts ahead. Resume requires reconciling. |
| **A3: Roll back the DB but keep the Hetzner brain.service running on its empty pre-cutover DB** | Hetzner stays "alive but drained" so D-15/D-16 health probes still work. | Requires care: `chunks_vec` would have stale gemini vectors mismatched against missing items. Probably not what you want. |

**Author's lean (not a recommendation, just framing):** A1 is more conservative; A2 is more efficient if user agrees not to capture on Mac during the gap.

**Procedure for A1 (rollback):**
```bash
ssh -i ~/.ssh/ai_brain_hetzner brain@204.168.155.44 << 'SH'
sudo -n systemctl stop brain
mv /opt/brain/data/brain.sqlite /opt/brain/data/brain.sqlite.post-d12-attempt
mv /opt/brain/data/brain.sqlite.pre-cutover /opt/brain/data/brain.sqlite
chmod 600 /opt/brain/data/brain.sqlite
rm -f /opt/brain/data/brain.sqlite-wal /opt/brain/data/brain.sqlite-shm
sudo -n systemctl start brain
SH
# Verify (need Node-side because chunks_vec needs vec0):
ssh -i ~/.ssh/ai_brain_hetzner brain@204.168.155.44 \
  'cd /opt/brain && set -a; source /etc/brain/.env; set +a; node -e "console.log(require(\"better-sqlite3\")(\"/opt/brain/data/brain.sqlite\").prepare(\"SELECT COUNT(*) AS n FROM items\").get())"'
# Expect: { n: 0 } or whatever the pre-cutover state was (Mac DB has 8; Hetzner pre-cutover should be empty)
```

## 3.2 Decision B — Commit `gemini.ts` working-tree changes or discard?

| Option | Pros | Cons |
|---|---|---|
| **B1: Commit** | Strict improvement — handles free-tier rate limits more gracefully than `batchEmbedContents`. Limitation (TPM on large transcripts) is honestly documented in the code comment. | Doesn't fully fix the 2 stuck transcripts. The "right" delay tuning is unsettled. |
| **B2: Discard** | Wait until next session decides on the right architecture (longer delay vs paid tier vs smaller chunks). | Loses real diagnostic work. Future captures of moderate items would still 429 on `batchEmbedContents`. |
| **B3: Keep as a branch, not on main** | Preserves the work without committing on main. | Adds branch overhead; you'd need to remember to revisit. |

**Author's lean:** B1 — strict improvement. The limitation is bounded and documented.

**Procedure for B1:**
```bash
git diff src/lib/embed/gemini.ts  # review one more time
git add src/lib/embed/gemini.ts
git commit -m "fix(embed,S-13): switch to serial embedContent + 1.1s delay for Gemini free tier

batchEmbedContents on Gemini free tier throttles aggressively (~1 batch/min
when each part is ~2k tokens). Serial embedContent has a higher per-minute
cap. 1.1s inter-call delay = ~55 RPM ceiling, well under documented 100 RPM
free-tier limit. Diagnosed empirically during D-12 cutover.

Known limitation: large YouTube transcripts (44+ chunks at ~2k tokens each)
exceed free-tier TPM mid-item. Mitigation requires longer delays or paid
tier — see Handover_docs_19_05_2026_13:47/M9 for options."
git push origin main
```

## 3.3 Decision C — How to handle the 2 stuck transcripts

| Option | Effort | Trade-off |
|---|---|---|
| **C1: 5–10s per call** | Bump delay in `gemini.ts` from 1100 → 5000 or 10000ms. ~4–8 min wall clock per item. | Slow but free. May still 429 if TPM is small. |
| **C2: Smaller chunks at chunker** | Modify `src/lib/chunk/index.ts` to produce smaller chunks (e.g., target 500 tokens vs 2000). ~30 min code work + re-chunk all 8 items. | Bigger architectural change. Smaller chunks may produce worse retrieval. |
| **C3: Upgrade Gemini to paid tier** | Add billing in AI Studio. Cost ~$0.0018/mo at projected volume. | Removes "free tier" lock from §1 #6 of plan. User's call. |
| **C4: Accept partial coverage** | Cut over now with 6 of 8 items vector-searchable. Re-embed the 2 large items later when daily quota refreshes (or after C1/C2/C3). | Real degradation: those 2 items invisible to vector search until embedded. FTS5 still works. |

**Author's lean:** C1 first (easy + free), fall back to C3 if it still 429s.

# 4. What the user explicitly authorized this session

| Action | Authorization |
|---|---|
| Bypassing 03:00 IST cutover heuristic | Explicit ("I am good with all of this") |
| Bypassing 48-hour buffer after D-11 | Explicit (same) |
| Pasting API tokens in chat | Explicit ("Cloudflare API token", "give me detailed steps") with rotation in Phase E |
| Generating gpg passphrase via chat | Explicit ("(a) generate the passphrase and show it once") |
| Selecting gemini-embedding-001 over alternatives in S-13 | Explicit ("Skip α/β/γ. Run the 30-second API test on outputDimensionality=768. Decide based on that.") |
| Pushing to D-13 partial-state | NOT given — user said "let the next agent decide rollback" |
| Committing gemini.ts changes | NOT given — punted to this handover |

# 5. What the user did NOT authorize

- Resuming the cutover without re-reading this handover
- Force-pushing
- Skipping pre-flight checks
- Mac DB modification (Mac is rollback target until D-18)
- Creating new tags
- Adding new dependencies (zero-new-dep norm still applies; tsx was added on Hetzner during this session, flagged in M5 as a violation)

# 6. Sanity checks before any cutover work

Run these in order. If any fails, stop and diagnose.

```bash
# 1. CNAME state
TOKEN=<from Bitwarden>
curl -s "https://api.cloudflare.com/client/v4/zones/af88f945669d3e95174e20386a9d2feb/dns_records/ac9ca4ca42f6c03a3e9970d4a89988d6" \
  -H "Authorization: Bearer $TOKEN" | jq '.result.content'
# Expect: "58339d22-d0be-4fab-94d6-32fd24b04a72.cfargotunnel.com"
# If different: STOP. D-13 may have run.

# 2. Mac brain still serving
curl -s -o /dev/null -w "%{http_code}\n" \
  -H "Authorization: Bearer <BRAIN_LAN_TOKEN from .env>" \
  https://brain.arunp.in/api/health
# Expect: 200

# 3. Hetzner brain still serving
curl -s -o /dev/null -w "%{http_code}\n" \
  -H "Authorization: Bearer <BRAIN_LAN_TOKEN from .env>" \
  https://brain-staging.arunp.in/api/health
# Expect: 200

# 4. Hetzner DB row count
ssh -i ~/.ssh/ai_brain_hetzner brain@204.168.155.44 \
  'sqlite3 /opt/brain/data/brain.sqlite "SELECT COUNT(*) FROM items;"'
# Expect: 8 (Mac DB landed in D-12)
# If 0 or 1: rollback already happened or Hetzner DB was reset.

# 5. Embedding count
ssh -i ~/.ssh/ai_brain_hetzner brain@204.168.155.44 \
  'cd /opt/brain && set -a; source /etc/brain/.env; set +a; node -e "console.log(require(\"better-sqlite3\")(\"/opt/brain/data/brain.sqlite\").prepare(\"SELECT COUNT(*) AS n FROM chunks_vec\").get())"'
# Expect: { n: 16 } (6 items × ~2-4 chunks = ~16 vec rows)
# If 81: stale nomic vectors — wipe needed.
# If 0: re-embed wasn't done.

# 6. Mac DB row count (compare with Hetzner)
sqlite3 data/brain.sqlite "SELECT COUNT(*) FROM items;"
# Expect: 8 (no new captures since session start)
# If 9+: user captured on Mac during the gap; reconcile before resuming.
```

# 7. Files modified but not committed (working tree state)

```
M src/lib/embed/gemini.ts
```

Diff content (preview):
- `embed()` method now uses serial loop with `embedContent` instead of `batchEmbedContents`
- 1.1s inter-call delay
- Comment block explaining diagnosis
- Error path strings updated

The diff is ~30 lines. Decision B in §3 governs whether to commit.

# 8. What "ready to ship v0.6.0" looks like

Per the cutover-pacing memory + plan:
- D-12..D-14 complete (DB on Hetzner, DNS flipped, Mac brain stopped)
- D-15..D-18 complete (capture validated, Ask validated, batch run validated, B2 backup validated)
- Phase E rotation complete (all 6 chat-exposed secrets rotated)
- v0.6.0 tag pushed to origin

Estimated remaining wall-clock: half-day focused work + overnight wait.
