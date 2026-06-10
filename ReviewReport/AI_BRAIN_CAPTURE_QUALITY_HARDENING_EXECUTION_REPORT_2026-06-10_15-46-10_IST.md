# AI Brain Capture Quality Hardening Execution Report

**Created:** 2026-06-10 15:46:10 IST  
**Author:** Codex  
**Plan executed:** `docs/plans/v0.7.6-capture-quality-critical-hardening-implementation-plan-2026-06-10_15-22-19_IST.md`  
**Production deployed:** No  

---

## 1. Outcome

The critical hardening plan has been implemented locally.

The implementation addresses the P0/P1 self-critique findings:

- Split YouTube save reliability from transcript-quality validation.
- Added a strict YouTube transcript-quality smoke gate.
- Added timeout and DB-backed cache for optional YouTube Data API enrichment.
- Hardened capture artifact storage with relative paths, unique filenames, truncation metadata, write status, and item-delete cleanup.
- Removed default LinkedIn raw HTML artifact retention.
- Preserved pasted LinkedIn text formatting and secondary links.
- Added metadata-only-to-full-text upgrade behavior for LinkedIn captures in both web API and Telegram paths.
- Tightened Substack paywall classification so long previews are not mislabeled as full text.
- Added a safe build wrapper using a disposable build DB.
- Added a build artifact guard and Next trace exclusion so `.next/standalone/data` is not packaged.

---

## 2. New Files Added

- `scripts/build-next-safe.mjs`
- `scripts/check-build-artifacts.mjs`
- `scripts/smoke-youtube-quality.mjs`
- `src/db/metadata-cache.ts`
- `src/db/migrations/015_capture_metadata_cache.sql`
- `src/db/migrations/016_capture_artifacts_hardening.sql`
- `src/lib/capture/artifacts.test.ts`
- `src/lib/capture/youtube-metadata.test.ts`

---

## 3. Key Behavior Changes

### YouTube

- `npm run smoke:youtube` now validates save reliability.
- `npm run smoke:youtube:quality` validates transcript quality.
- Metadata-only fallback still saves the item, but transcript collapse is now visible through the quality gate.
- Optional YouTube Data API calls now use a timeout and cache successful responses by video ID.

### Artifacts

- New artifact writes use relative paths under the configured artifact root.
- Artifact filenames include generated IDs to avoid collisions.
- Oversized artifacts are capped and marked `truncated`.
- Artifact write failure records a failed artifact row instead of crashing the item save.
- Deleting an item removes associated artifact files and rows.

### LinkedIn

- Link-only LinkedIn capture saves normalized metadata only.
- Raw fetched LinkedIn HTML is not stored by default.
- Pasted text preserves paragraphs, bullets, and secondary URLs.
- Existing `metadata_only` LinkedIn captures are upgraded when user-provided full text arrives.

### Substack

- Strong paywall signals now force `paywall_preview` unless the content source is explicitly user/full-content based.
- Long teaser previews no longer get mislabeled as `full_text`.
- Substack metadata artifacts include `body_source` and `paywall_signal`.

### Build Safety

- `npm run build` now uses `scripts/build-next-safe.mjs`, which points build-time DB access to a disposable temp DB.
- `next.config.ts` excludes `data/**` from standalone output tracing.
- `npm run check:build-artifacts` fails if `.next/standalone/data` exists.
- `scripts/deploy.sh` runs the build artifact guard before syncing to production.

---

## 4. Verification Results

Passed:

- `npm run typecheck`
- Focused hardening tests:
  - `src/lib/capture/youtube-metadata.test.ts`
  - `src/lib/capture/artifacts.test.ts`
  - `src/lib/capture/linkedin.test.ts`
  - `src/lib/capture/substack.test.ts`
  - `src/lib/telegram/dispatch.test.ts`
  - `src/app/api/capture/url/route.test.ts`
  - `src/db/items.test.ts`
- `npm run test`
  - 438 tests passing
- `npm run lint`
  - 0 errors
  - 2 pre-existing warnings about unused eslint-disable directives
- `npm run build`
  - Passed
  - Existing `unpdf` import.meta warning remains
- `npm run check:build-artifacts`
  - Passed
  - Confirmed no `.next/standalone/data`
- `npm run smoke:youtube`
  - Passed
- `npm run smoke:youtube:quality`
  - Passed with `Me at the zoo` captured as `metadata_plus_transcript`
- `npm run smoke:capture-quality`
  - Passed
  - Summary: `quality_gate_status = pass`
  - Summary: `quality_regression = false`

Latest capture-quality smoke output:

- JSONL: `data/spikes/capture-quality/results/capture-eval-2026-06-10_15-44-54.jsonl`
- Summary: `data/spikes/capture-quality/results/capture-eval-2026-06-10_15-44-54.summary.json`

---

## 5. Deploy Readiness

**Technical gate status:** ready.

The implementation is ready for production deployment after the release branch/commit is prepared and the normal production preflight runs.

**Do not deploy directly from the current loose workspace without first reviewing/staging the intended change set.** The worktree contains many pre-existing uncommitted changes from prior work, reports, spike files, Telegram hardening, and capture-quality foundation work. Deploying from this state without an intentional release commit risks shipping unrelated changes.

Recommended deployment timing:

1. Create or review the release commit containing the v0.7.5 foundation plus this v0.7.6 hardening.
2. Confirm production DB backup exists immediately before deployment.
3. Run the deploy script preflight, including:
   - typecheck
   - lint
   - tests
   - env check
   - AI provider check
   - build
   - build artifact guard
4. Deploy during a low-traffic window.
5. Immediately after deploy, run production smoke checks:
   - health check
   - production YouTube smoke
   - Telegram webhook reachability
   - one real Telegram YouTube link capture
   - one real Telegram LinkedIn URL-only capture
   - one real Telegram LinkedIn URL plus pasted text capture

If those steps are acceptable, the right time to deploy is **after the release commit is cleanly prepared and a fresh production backup is confirmed**. The local code and verification results no longer block deployment.

---

## 6. Residual Risks

- Live YouTube transcript availability can still change externally. The new quality gate will make that visible.
- LinkedIn remains metadata-only unless the user provides/pastes text, which is intentional.
- Substack custom-domain detection is still not fully implemented; custom-domain Substacks may route through generic article capture.
- The current workspace is very dirty. Release discipline matters more than usual here.

---

## 7. Recommendation

Proceed to production only after creating an intentional release commit and confirming a production backup.

Once that is done, this is a good candidate to deploy. It specifically reduces the risks that caused the earlier production data and capture-quality concerns.

