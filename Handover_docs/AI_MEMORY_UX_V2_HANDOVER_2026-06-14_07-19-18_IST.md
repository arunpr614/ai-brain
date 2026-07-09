# AI Memory UX v2 Handover - 2026-06-14 07:19 IST

**Audience:** next AI agent continuing the AI Memory UX v2 redesign and feature implementation goal.

**Primary project folder:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`

**Same directory via current writable workspace path:** `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`

**Confirmed path identity:** both path spellings resolve to the same inode (`3458798`) on this machine.

**Design package:** `UX_UI_DESIGN_PACKAGE/`

**UX v2 project folder:** `UX_v2/`

**Current branch:** `codex/v0.7.7-deployment-hygiene...origin/codex/v0.7.7-deployment-hygiene`

**Goal status:** active, not complete. Do not mark the goal complete. This handover is an interruption checkpoint, not a completion claim.

---

## 1. Original Active Goal

The active user goal is broad:

- Pick up the AI Memory redesign work from the previous AI agent.
- Inspect the UX/UI design package.
- Derive requirements for all missing features represented in the new UI/UX.
- Create detailed PRDs for missing features.
- Implement missing features.
- Redesign both the web and Android applications into the new AI Memory UX.
- Use the new design guides, new logo, and new app name.
- Use `UX_v2` as the project folder.

The goal persists across turns. Do not shrink success to the latest slice. Completion requires the redesigned web and Android experience, new features, documentation, verification, and acceptance evidence.

---

## 2. Additional Process Requirement From Arun

Arun later added a stricter feature workflow. Future work must follow this process for each missing feature:

1. Discover missing feature.
2. Add it to the UX v2 to-do list.
3. Create PRD v1.
4. Run adversarial review on PRD v1.
5. Create PRD v2 incorporating review findings.
6. Create technical implementation plan v1.
7. Run adversarial review on the implementation plan.
8. Create implementation plan v2.
9. Execute by phases and milestones.
10. Do code review.
11. Document code review outcome as Markdown.
12. Address code review comments.
13. Test and verify.
14. Update progress/running log.
15. Move to the next feature.

This process is now codified in:

- `UX_v2/04_FEATURE_DELIVERY_PROTOCOL.md`
- `UX_v2/05_MISSING_FEATURE_TODO.md`

These two docs were created during this handover period. Use them as the operating contract for new feature work.

Important exception: several slices were already implemented before this protocol was written. Do not redo completed implementation only for process theater. Preserve current work, verify it, document gaps, and apply the full protocol to the next not-yet-implemented feature or substantial follow-up.

---

## 3. Required Source Inputs

Use these as the source order for future work:

1. Current worktree implementation.
2. `UX_UI_DESIGN_PACKAGE` docs, checklists, assets, and frozen Magic Patterns source exports.
3. `Handover_docs/AI_BRAIN_HANDOVER_2026-06-11_22-36-37_IST.md` for shipped production capabilities and operational warnings.
4. `RUNNING_LOG.md` for historical implementation context.
5. Magic Patterns live links only when the local design package is insufficient or stale:
   - `https://www.magicpatterns.com/c/d5w3fb6rzxdeht7urnye5r`
   - `https://www.magicpatterns.com/c/fhbeo46qahq5fkjfseckxx`

Local design-package files that matter most:

- `UX_UI_DESIGN_PACKAGE/docs/AI_MEMORY_AGENT_HANDOFF_BRIEF.md`
- `UX_UI_DESIGN_PACKAGE/docs/AI_MEMORY_DESIGN_SYSTEM_IMPLEMENTATION_SPEC.md`
- `UX_UI_DESIGN_PACKAGE/docs/AI_MEMORY_WEB_APP_SCREEN_AND_INTERACTION_SPEC.md`
- `UX_UI_DESIGN_PACKAGE/docs/AI_MEMORY_ANDROID_APP_SCREEN_AND_INTERACTION_SPEC.md`
- `UX_UI_DESIGN_PACKAGE/docs/AI_MEMORY_INTERACTION_AND_STATE_SPEC.md`
- `UX_UI_DESIGN_PACKAGE/docs/AI_MEMORY_DATA_CONTENT_AND_STATE_MODEL.md`
- `UX_UI_DESIGN_PACKAGE/docs/AI_MEMORY_FEATURE_PARITY_AND_SCOPE_MATRIX.md`
- `UX_UI_DESIGN_PACKAGE/docs/BRAND_COPY_MIGRATION.md`
- `UX_UI_DESIGN_PACKAGE/checklists/AI_MEMORY_IMPLEMENTATION_ACCEPTANCE_CHECKLIST.md`
- `UX_UI_DESIGN_PACKAGE/source-exports/web/magic-patterns-exact`
- `UX_UI_DESIGN_PACKAGE/source-exports/android/magic-patterns-exact`
- `UX_UI_DESIGN_PACKAGE/source-exports/android/magic-patterns-exact/components/MobileBottomNav.tsx`
- `UX_UI_DESIGN_PACKAGE/source-exports/android/magic-patterns-exact/pages/MobileMore.tsx`

---

## 4. Production Handover Context

Arun explicitly pointed to:

- `Handover_docs/AI_BRAIN_HANDOVER_2026-06-11_22-36-37_IST.md`

Read it before production-facing work.

That document is about the older production line at v0.8.5, centered on YouTube transcript recovery/backfill operations. It says:

- Production was healthy at handover.
- Production URL was `https://brain.arunp.in`.
- Deployed version was v0.8.5.
- Deployed commit was `2b4db95 Merge PR #5: production YouTube backfill runner`.
- YouTube timed-text transcript extraction was blocked by YouTube anti-bot behavior.
- Real YouTube backfill must not be run unless Arun explicitly asks after a fresh dry-run.
- The best follow-up on that line was observe cooldown/retry, scheduled dry-run, operator page, or transcript fallback strategy.

Do not confuse that production handover state with the current dirty UX v2 redesign worktree. The UX v2 work is broader and currently uncommitted.

Production-operation warnings from that handover still apply:

- Do not run real `--run` YouTube backfill without explicit approval.
- Do not bypass cooldown without explicit approval.
- Do not reset transcript jobs blindly.
- Do not delete production smoke item unless Arun asks.
- Do not add `yt-dlp`, browser scraping, or ASR in a small operational slice; those require separate research/PRD/review.

---

## 5. Current Worktree State

Command run:

```bash
git status --short --branch
```

Current branch:

```text
## codex/v0.7.7-deployment-hygiene...origin/codex/v0.7.7-deployment-hygiene
```

Worktree is heavily dirty. This is expected for the long-running UX v2 redesign effort. Do not reset, clean, or revert unrelated changes.

Representative modified tracked files include:

- `ROADMAP_TRACKER.md`
- `RUNNING_LOG.md`
- Android app branding/assets under `android/app/src/main/res/...`
- `capacitor.config.ts`
- `public/offline.html`
- `public/sw.js`
- `src/app/actions.ts`
- `src/app/api/ask/route.ts`
- `src/app/ask/ask-client.tsx`
- `src/app/ask/page.tsx`
- `src/app/capture-*`
- `src/app/items/[id]/page.tsx`
- `src/app/items/[id]/ask/page.tsx`
- `src/app/layout.tsx`
- `src/components/library-list.tsx`
- `src/components/sidebar.tsx`
- `src/db/items.ts`
- `src/lib/retrieve/index.ts`
- `src/styles/tokens.css`

Representative untracked files/folders include:

- `UX_UI_DESIGN_PACKAGE/`
- `UX_v2/`
- `Handover_docs/AI_BRAIN_HANDOVER_2026-06-11_22-36-37_IST.md`
- `public/ai-memory-logo.png`
- `public/manifest.webmanifest`
- `src/app/library/`
- `src/app/more/`
- `src/app/needs-upgrade/`
- `src/app/topics/`
- `src/components/mobile-library-filters.tsx`
- `src/db/topics.ts`
- `src/lib/ask/history.ts`
- `src/lib/ask/scope.ts`

`git diff --stat` showed 81 tracked files changed with thousands of insertions/deletions. Some large diff churn is from prior agents and from the running-log rollover. Do not interpret dirty state alone as evidence that a feature is complete.

---

## 6. UX v2 Docs Current State

Files currently in `UX_v2/`:

```text
UX_v2/README.md
UX_v2/01_MASTER_PLAN.md
UX_v2/02_REQUIREMENTS_PRD_BACKLOG.md
UX_v2/03_IMPLEMENTATION_PROGRESS.md
UX_v2/04_FEATURE_DELIVERY_PROTOCOL.md
UX_v2/05_MISSING_FEATURE_TODO.md
```

### `UX_v2/README.md`

Updated to include:

- `04_FEATURE_DELIVERY_PROTOCOL.md`
- `05_MISSING_FEATURE_TODO.md`

### `UX_v2/01_MASTER_PLAN.md`

Existing master plan. It lays out:

- Phase 0: UX v2 Control Room
- Phase 1: Brand, assets, design system
- Phase 2: product model and route foundation
- Phase 3: web workbench redesign
- Phase 4: Android companion redesign
- Phase 5: repair/capture quality/trust behavior
- Phase 6: accessibility/QA/visual parity
- Phase 7: release and handoff

### `UX_v2/02_REQUIREMENTS_PRD_BACKLOG.md`

Existing PRD backlog with PRD-01 through PRD-16.

Important open PRDs/follow-ups:

- PRD-06 follow-up: duplicate, updated-existing, error-with-save capture result states.
- PRD-09 follow-up: attached context override, high-quality-only scope, Android history sheet, durable scope storage for tag/topic/collection threads.
- PRD-10: web repair workflow for weak captures.
- PRD-11 follow-up: long-press/select-mode polish.
- PRD-12: Android unified Ask composer and add-context sheets.
- PRD-13: Android share capture.
- PRD-14: Settings/privacy/offline trust states.
- PRD-15: Login/unlock/pairing/session/offline states.
- PRD-16: QA evidence and release gates.

### `UX_v2/03_IMPLEMENTATION_PROGRESS.md`

Tracks completed slices and verification. It currently lists as completed:

- PRD-01 / PRD-02: Brand and design foundation.
- PRD-04: Library filters and Ask selected.
- PRD-03: Web shell and navigation.
- PRD-05: Needs Upgrade queue.
- PRD-07: Item detail focus mode.
- PRD-06: basic capture result states.
- PRD-08: Included Topics.
- PRD-09: Ask scope clarity.
- PRD-11: Android/mobile Library filters.
- App shell reliability service-worker work.

It does not yet record PRD-11 mobile shell completion because verification was interrupted.

### `UX_v2/04_FEATURE_DELIVERY_PROTOCOL.md`

New doc created in this handover period. It formalizes Arun's requested workflow:

- discovered -> PRD v1 -> adversarial review -> PRD v2 -> implementation plan v1 -> adversarial review -> implementation plan v2 -> execution -> code review -> verified.

It also defines required future folders:

- `UX_v2/prds/`
- `UX_v2/implementation-plans/`
- `UX_v2/reviews/`
- `UX_v2/screenshots/`

### `UX_v2/05_MISSING_FEATURE_TODO.md`

New doc created in this handover period. It is the live missing-feature to-do list.

Currently listed active missing/partial features:

- `PRD-06-FU`: capture duplicate, updated-existing, error-with-save result states.
- `PRD-09-FU`: attached context override and high-quality-only Ask scope.
- `PRD-10`: web repair workflow for weak captures.
- `PRD-11-FU`: Android long-press/select-mode polish.
- `PRD-12`: Android unified Ask composer and add-context sheets.
- `PRD-13`: Android share capture landing and result states.
- `PRD-14`: Settings/privacy/offline trust states.
- `PRD-15`: login/unlock/pairing/session/offline entry states.
- `PRD-16`: QA evidence and release gates.
- `OPS-01`: transcript operator visibility page.
- `OPS-02`: transcript provider fallback strategy.

It also has:

- `PRD-11-SHELL`: implemented pending verification.

---

## 7. Major Implemented UX v2 Slices Before This Handover

The following were already implemented by the time this handover was requested. Treat these as current worktree reality, but still verify before relying on them for release.

### Brand and design foundation

Implemented across app metadata, public assets, Android labels/icons, setup/unlock/capture/settings/export copy, service worker cache naming, and AI-facing prompts.

Key files involved include:

- `public/ai-memory-logo.png`
- `public/manifest.webmanifest`
- `public/web-app-icon-192.png`
- `public/web-app-icon-512.png`
- `public/favicon-*`
- `android/app/src/main/res/...`
- `android/app/src/main/res/values/strings.xml`
- `capacitor.config.ts`
- `src/app/layout.tsx`
- `src/styles/tokens.css`

### Web shell and navigation

Implemented before the PRD-11 mobile shell follow-up:

- Collapsible desktop sidebar.
- AI Memory logo.
- Needs Upgrade badge/count.
- Capture entry.
- Pair Device lower link.
- disabled privacy coming-soon control.
- active route handling.

Key file:

- `src/components/sidebar.tsx`

### Library filters and Ask selected

Implemented:

- canonical `/library`
- source filters
- quality filters
- tag-filtered Library
- Ask selected
- bulk tag/add-to-collection/delete/clear
- source platform/captured-via/quality badges
- Ask selected scope through `/ask?scope=selected&ids=...`

Key files:

- `src/app/library/page.tsx`
- `src/components/library-list.tsx`
- `src/lib/retrieve/index.ts`
- `src/app/api/ask/route.ts`

### Needs Upgrade queue

Implemented:

- `/needs-upgrade`
- weak-capture query helpers/counts
- queue entries for metadata-only, preview-only, failed, transcript-warning captures

Key files:

- `src/app/needs-upgrade/page.tsx`
- `src/db/items.ts`
- `src/lib/capture/quality.ts`

### Item detail focus mode

Implemented:

- source trust strip
- `/items/[id]?mode=focus`
- focus read mode with Exit focus, Ask, Source, trust strip
- weak-source repair cue

Key file:

- `src/app/items/[id]/page.tsx`

### Capture result banners

Implemented:

- URL/PDF/note save routes to item detail with capture-result marker
- item detail renders capture result banner
- weak captures show warning copy and Upgrade action

Still missing:

- duplicate state
- updated-existing state
- error-with-save state

### Included Topics, tags, collections

Implemented:

- `topics` and `item_topics` tables
- topic repository
- enrichment writes AI-detected topics
- item detail separates Tags, Included Topics, Collections
- topic detail pages
- collection detail pages
- Ask topic and Ask collection

Key files:

- `src/db/topics.ts`
- `src/db/migrations/017_topics.sql`
- `src/app/topics/[slug]/page.tsx`
- `src/app/collections/[id]/page.tsx`
- `src/app/items/[id]/page.tsx`

### Ask scope clarity and history

Implemented:

- persistent scope banner for library, item, selected, tag, topic, collection
- weak-source warnings
- source/platform/quality citation metadata
- durable Library Ask and per-item Ask threads
- `/ask?thread=...`
- `/items/[id]/ask?thread=...`
- desktop history side panel
- mobile compact History disclosure

Key files:

- `src/app/ask/ask-client.tsx`
- `src/app/ask/page.tsx`
- `src/app/items/[id]/ask/page.tsx`
- `src/lib/ask/history.ts`
- `src/lib/ask/scope.ts`
- `src/components/chat-message.tsx`
- `src/components/citation-chip.tsx`

### Mobile Library filters

Implemented:

- mobile-only compact Library filter control
- safe-area-aware bottom sheet
- source/quality/tag filters
- Clear tag, Clear filters, Ask tag
- desktop filters preserved

Key files:

- `src/components/mobile-library-filters.tsx`
- `src/app/library/page.tsx`

Verified previously with Browser smoke:

- `/library?source=note&quality=full_text&nosw=1`
- tag-filtered Library with temporary tagged note, then cleanup

---

## 8. In-Flight Work At This Handover: PRD-11 Mobile Shell

The most recent implementation slice was PRD-11 mobile shell/navigation.

### Intended PRD-11 requirements

From `UX_v2/02_REQUIREMENTS_PRD_BACKLOG.md` and design package:

- Bottom nav: Library, Capture, Ask, More.
- Raised center Capture FAB on Library/content routes.
- No raised Capture FAB on Ask or Capture.
- Library has compact active filter status and bottom-sheet filters.
- Needs Upgrade reachable from Library and More.
- Bottom sheets safe-area aware.
- Capture must not overlap Ask composer.

### Files changed for this slice

Primary changed file:

- `src/components/sidebar.tsx`

New file:

- `src/app/more/page.tsx`

Existing already-created related file:

- `src/components/mobile-library-filters.tsx`

### `src/components/sidebar.tsx` current behavior

Desktop:

- Keeps the desktop sidebar.
- Uses AI Memory logo.
- Has collapsible state persisted in localStorage.
- Primary desktop items: Library, Needs Upgrade, Ask, Capture, Settings.
- Lower utility links: Pair Device and disabled Privacy Controls.

Mobile:

- Now renders Android-style four-item bottom nav:
  - Library
  - Capture
  - Ask
  - More
- On Library/content routes, Capture is rendered as a raised center circular action.
- On `/ask`, item ask routes, `/capture`, and capture subroutes, Capture is rendered as a normal bottom tab.
- More gets the Needs Upgrade badge.

Design reference used:

- `UX_UI_DESIGN_PACKAGE/source-exports/android/magic-patterns-exact/components/MobileBottomNav.tsx`

### `src/app/more/page.tsx` current behavior

New `/more` route with:

- user/workspace card
- Needs Upgrade CTA if weak captures exist
- Preferences:
  - Appearance
  - Tags
  - Collections
- Sync & Devices:
  - Device pairing
  - Android setup
- Data & Privacy:
  - Backup & export
  - disabled Privacy controls with sober copy
- Provider Health:
  - Claude generation
  - Gemini indexing
- App version

Design reference used:

- `UX_UI_DESIGN_PACKAGE/source-exports/android/magic-patterns-exact/pages/MobileMore.tsx`

### Verification status for PRD-11 shell

Automated checks after adding `sidebar.tsx` and `/more`:

```bash
npm run typecheck
```

Passed.

```bash
npm run lint
```

Passed with the known pre-existing warning:

```text
src/lib/queue/enrichment-batch-cron.ts
49:3 warning Unused eslint-disable directive (no problems were reported from 'no-var')
```

Focused tests:

```bash
node --import tsx --test src/db/items.test.ts src/app/api/ask/route.test.ts
```

Passed: 15 tests.

Browser verification:

- `/more?nosw=1` was inspected with the in-app browser.
- A first check incorrectly read the global first `h1`, which was the desktop sidebar title `AI Memory`, not the page heading.
- A later scoped check under `main` verified `/more` renders:
  - main heading `More`
  - `Preferences`
  - `Sync & Devices`
  - `Data & Privacy`
  - `Provider Health`
  - desktop nav visible at desktop width
  - mobile nav hidden at desktop width

The full mobile shell smoke for Library/Ask/Capture/More was interrupted by the user before completion. Before the interruption, Browser state was reset:

- temporary viewport reset
- leftover smoke tabs closed

Current `lsof -iTCP:3311 -sTCP:LISTEN -n -P` returned no listener during handover creation, so there is no known dev server running.

### Immediate next action for next agent

Finish PRD-11 shell verification:

1. Start dev server:

   ```bash
   npm run dev -- --hostname 127.0.0.1 --port 3311
   ```

2. Use in-app Browser plugin and phone viewport `390 x 844`.

3. Verify:

   - `/library?nosw=1`
     - mobile nav visible
     - nav text includes Library, Capture, Ask, More
     - Library active
     - Capture raised
   - `/ask?nosw=1`
     - Ask active
     - Capture normal, not raised
   - `/capture?nosw=1`
     - Capture active
     - Capture normal, not raised
   - `/more?nosw=1`
     - More active
     - More page content visible under `main`
     - Capture raised or decide whether More should count as a content route. Current implementation raises Capture on More because only Ask/Capture use normal Capture.
   - desktop `/more?nosw=1` at 1200 x 900
     - mobile nav hidden
     - desktop sidebar visible
     - main content contains More/Preferences/Provider Health

4. If verification passes:

   - update `UX_v2/03_IMPLEMENTATION_PROGRESS.md`
   - move `PRD-11-SHELL` in `UX_v2/05_MISSING_FEATURE_TODO.md` from implemented pending verification to completed/verified
   - consider creating `UX_v2/reviews/PRD-11-SHELL_CODE_REVIEW_2026-06-14.md`
   - append to `RUNNING_LOG.md` after following the running-log skill confirmation rule, unless Arun explicitly authorizes direct append

5. If verification fails:

   - fix `src/components/sidebar.tsx` or `src/app/more/page.tsx`
   - rerun typecheck/lint/focused tests
   - rerun Browser smoke

---

## 9. Browser Plugin Notes

The Browser plugin should be used for local responsive verification.

Use Node REPL browser setup:

```js
const { setupBrowserRuntime } = await import("/Users/arun.prakash/.codex/plugins/cache/openai-bundled/browser/26.609.41114/scripts/browser-client.mjs");
await setupBrowserRuntime({ globals: globalThis });
globalThis.browser = await agent.browsers.get("iab");
nodeRepl.write(await browser.documentation());
```

For responsive checks:

```js
const viewport = await browser.capabilities.get("viewport");
await viewport.set({ width: 390, height: 844 });
// ...checks...
await viewport.reset();
```

Important gotchas:

- Do not use raw `tab.playwright.setViewportSize`; this wrapper does not expose it.
- The wrapper can time out waiting for full page load even when the app has rendered. For UI smoke, a short wait plus scoped DOM inspection worked better.
- Use `main.querySelector("h1")`, not global `document.querySelector("h1")`, because the desktop sidebar has an AI Memory heading.
- Use `?nosw=1` for local smoke to avoid stale service worker chunks.
- Always reset temporary viewport before handing off.
- Always close temporary smoke tabs.

---

## 10. Last Known Verification Commands And Results

These were run before handover creation. They are evidence for the code at that moment, but the next agent should rerun after any edits.

### Typecheck

```bash
npm run typecheck
```

Result:

```text
ai-brain@0.6.2 typecheck
tsc --noEmit
```

Exit code 0.

### Lint

```bash
npm run lint
```

Result:

```text
0 errors, 1 warning
src/lib/queue/enrichment-batch-cron.ts 49:3 unused eslint-disable no-var
```

The warning pre-existed this slice.

### Focused tests

```bash
node --import tsx --test src/db/items.test.ts src/app/api/ask/route.test.ts
```

Result:

```text
15 tests passed
0 failed
```

### Browser smoke

Passed before the PRD-11 shell work:

- mobile Library compact filters and dismissible sheet
- tag-filtered Library sheet with Clear tag, Clear filters, Ask tag
- desktop Library filters unchanged
- `/ask?thread=...` and `/items/[id]/ask?thread=...` history restore

Partially verified after PRD-11 shell:

- desktop `/more` content under `main`

Still needs completion:

- mobile shell Library/Ask/Capture/More route-aware Capture smoke

---

## 11. Runtime State At Handover

During handover creation:

```bash
lsof -iTCP:3311 -sTCP:LISTEN -n -P || true
```

Output was empty.

Interpretation:

- No known dev server listening on port 3311.
- Previous interrupted dev server session was already gone.

One earlier dev-server run created a local backup snapshot:

- `data/backups/2026-06-14_0709.sqlite`

It may still exist. It is generated by the app backup scheduler during local dev. Treat it as local generated data; do not commit it. If cleaning, be careful because destructive commands require explicit user approval in some modes. In this current handover, no cleanup was performed.

---

## 12. Running Log State And Caution

The phase2 root has:

- `RUNNING_LOG.md`
- `Phase_2_RUNNING_LOG_ARCHIVE_2026-06-11.md`

The handover from 2026-06-11 says the active log on disk is:

- `RUNNING_LOG.md`

The running-log skill says:

- read existing log before appending;
- never rewrite old content;
- append only;
- normally present the draft and ask before writing;
- direct append is allowed only when the user explicitly authorizes writing without review.

Important current issue:

- `RUNNING_LOG.md` is already modified in the worktree and has a large diff (`7100` lines removed in `git diff --stat`).
- Do not rewrite or format it.
- Do not attempt to "fix" historical log churn without Arun explicitly asking.

This handover document was created instead of appending the running log because Arun specifically requested a handover document. A future agent should append a concise running-log entry after user approval or direct authorization.

Suggested running-log entry topic:

- "2026-06-14 - UX v2 process protocol, missing-feature backlog, and PRD-11 mobile shell handover"

Suggested key points:

- `UX_v2/04_FEATURE_DELIVERY_PROTOCOL.md` created.
- `UX_v2/05_MISSING_FEATURE_TODO.md` created.
- `src/app/more/page.tsx` added.
- `src/components/sidebar.tsx` updated for four-tab mobile nav and route-aware Capture.
- `/more` scoped desktop content verified.
- mobile shell route smoke interrupted and remains next action.
- no dev server left running.

---

## 13. Files Created Or Updated During The Most Recent Work

### Created

- `UX_v2/04_FEATURE_DELIVERY_PROTOCOL.md`
  - formal feature lifecycle and artifact workflow.
- `UX_v2/05_MISSING_FEATURE_TODO.md`
  - live missing-feature backlog.
- `src/app/more/page.tsx`
  - mobile More/settings surface and desktop-accessible More route.
- `Handover_docs/AI_MEMORY_UX_V2_HANDOVER_2026-06-14_07-19-18_IST.md`
  - this handover.

### Updated

- `UX_v2/README.md`
  - added links to protocol and missing-feature to-do docs.
- `UX_v2/03_IMPLEMENTATION_PROGRESS.md`
  - earlier in the session, added PRD-11 Library filter progress and mobile filter browser-smoke notes.
- `src/app/library/page.tsx`
  - uses `MobileLibraryFilters`.
  - desktop filter rows hidden on mobile.
- `src/components/mobile-library-filters.tsx`
  - mobile filter summary and bottom sheet.
- `src/components/library-list.tsx`
  - mobile selection controls visible.
  - Ask selected limit aligned to 50.
  - mobile bulk bar sits above bottom nav.
- `src/components/sidebar.tsx`
  - four-item mobile nav and route-aware Capture.
  - desktop sidebar still present.

---

## 14. Current Missing Feature Backlog

From `UX_v2/05_MISSING_FEATURE_TODO.md`:

### Highest continuity item

`PRD-11-SHELL` - implemented pending verification.

Do this first. It is already in code and only needs completion of smoke, possible small fixes, progress updates, and code-review documentation.

### Likely next feature after PRD-11 shell

`PRD-12` - Android unified Ask composer and add-context sheets.

Why it is a good next feature:

- It depends on PRD-09 and PRD-11, both now partially/mostly implemented.
- The design package has a clear Android requirement for add context, attached chips, send/empty nudges, history sheet, and keyboard-safe composer.
- Current mobile Ask only has compact History disclosure; add-context flows are still missing.

Required process before implementation:

1. Create `UX_v2/prds/PRD-12-android-unified-ask-composer-v1.md`.
2. Run adversarial review and write report beside it.
3. Create PRD v2.
4. Create implementation plan v1.
5. Run adversarial review on implementation plan.
6. Create implementation plan v2.
7. Execute milestones.
8. Code review and document outcome.
9. Verify and update progress/running log.

### Other important backlog items

- `PRD-10`: web repair workflow for weak captures.
- `PRD-13`: Android share capture landing/result states.
- `PRD-14`: settings/privacy/offline trust states.
- `PRD-15`: entry/offline/session states.
- `PRD-16`: full QA evidence and release gates.
- `OPS-01`: transcript operator visibility page.
- `OPS-02`: transcript fallback strategy.

---

## 15. Suggested Immediate Resume Checklist

Use this exact order:

1. Read this handover.
2. Read:

   ```bash
   sed -n '1,260p' UX_v2/04_FEATURE_DELIVERY_PROTOCOL.md
   sed -n '1,260p' UX_v2/05_MISSING_FEATURE_TODO.md
   sed -n '1,220p' UX_v2/03_IMPLEMENTATION_PROGRESS.md
   ```

3. Confirm no dev server is running:

   ```bash
   lsof -iTCP:3311 -sTCP:LISTEN -n -P || true
   ```

4. Rerun static checks:

   ```bash
   npm run typecheck
   npm run lint
   node --import tsx --test src/db/items.test.ts src/app/api/ask/route.test.ts
   ```

5. Finish Browser smoke for PRD-11 shell:

   - `/library?nosw=1` at 390 x 844
   - `/ask?nosw=1` at 390 x 844
   - `/capture?nosw=1` at 390 x 844
   - `/more?nosw=1` at 390 x 844
   - `/more?nosw=1` at 1200 x 900

6. If smoke passes:

   - update `UX_v2/03_IMPLEMENTATION_PROGRESS.md`
   - update `UX_v2/05_MISSING_FEATURE_TODO.md`
   - add code-review document in `UX_v2/reviews/`
   - optionally append `RUNNING_LOG.md` after confirmation

7. Begin next feature through protocol:

   - likely `PRD-12` Android unified Ask composer
   - do not jump straight into code

---

## 16. Known Browser Smoke Script Shape

Use scoped `main` reads to avoid sidebar confusion:

```js
const viewport = await browser.capabilities.get("viewport");
await viewport.set({ width: 390, height: 844 });
const tab = await browser.tabs.new();

async function gotoSoft(path) {
  try {
    await tab.goto(`http://127.0.0.1:3311${path}${path.includes("?") ? "&" : "?"}nosw=1`);
  } catch {}
  await tab.playwright.waitForTimeout(700);
}

async function inspectShell(path) {
  await gotoSoft(path);
  return await tab.playwright.evaluate(() => {
    const main = document.querySelector("main");
    const nav = document.querySelector('nav[aria-label="Primary mobile"]');
    const navRect = nav?.getBoundingClientRect();
    const captureLink = nav?.querySelector('a[href="/capture"]');
    return {
      url: location.pathname,
      mainHeading: main?.querySelector("h1")?.textContent?.trim() ?? null,
      mobileNavVisible: Boolean(nav && nav.getClientRects().length > 0),
      navText: (nav?.textContent || "").replace(/\s+/g, " ").trim(),
      linkCount: nav?.querySelectorAll("a").length ?? 0,
      captureRaised: Boolean(captureLink && String(captureLink.className).includes("absolute")),
      captureText: (captureLink?.textContent || "").replace(/\s+/g, " ").trim(),
      captureTopOffset: captureLink && navRect ? Math.round(captureLink.getBoundingClientRect().top - navRect.top) : null,
      libraryActive: Boolean(nav?.querySelector('a[href="/library"][aria-current="page"]')),
      askActive: Boolean(nav?.querySelector('a[href="/ask"][aria-current="page"]')),
      captureActive: Boolean(nav?.querySelector('a[href="/capture"][aria-current="page"]')),
      moreActive: Boolean(nav?.querySelector('a[href="/more"][aria-current="page"]')),
    };
  });
}

const shellCheck = {
  library: await inspectShell("/library"),
  ask: await inspectShell("/ask"),
  capture: await inspectShell("/capture"),
  more: await inspectShell("/more"),
};

await viewport.set({ width: 1200, height: 900 });
await gotoSoft("/more");
shellCheck.desktopMore = await tab.playwright.evaluate(() => {
  const main = document.querySelector("main");
  const mobileNav = document.querySelector('nav[aria-label="Primary mobile"]');
  const desktopNav = document.querySelector('nav[aria-label="Primary"]');
  return {
    url: location.pathname,
    mainHeading: main?.querySelector("h1")?.textContent?.trim() ?? null,
    mobileNavVisible: Boolean(mobileNav && mobileNav.getClientRects().length > 0),
    desktopNavVisible: Boolean(desktopNav && desktopNav.getClientRects().length > 0),
    hasPreferences: Boolean(main && (main.innerText || "").includes("Preferences")),
    hasProviderHealth: Boolean(main && (main.innerText || "").includes("Provider Health")),
  };
});

await tab.close();
await viewport.reset();
nodeRepl.write(JSON.stringify(shellCheck, null, 2));
```

Expected high-level output:

- Library route:
  - `libraryActive: true`
  - `captureRaised: true`
  - mobile nav visible
- Ask route:
  - `askActive: true`
  - `captureRaised: false`
- Capture route:
  - `captureActive: true`
  - `captureRaised: false`
- More route:
  - `moreActive: true`
  - mobile nav visible
  - current implementation: `captureRaised: true`
- Desktop More:
  - `mainHeading: "More"`
  - `mobileNavVisible: false`
  - `desktopNavVisible: true`
  - `hasPreferences: true`
  - `hasProviderHealth: true`

---

## 17. Risks And Things Not Yet Done

### PRD-11 shell not fully verified

The code exists and basic `/more` desktop scoped verification passed, but full mobile route smoke was interrupted. Finish that first.

### No PRD/review artifacts yet for future missing features

The new protocol exists, but no new PRD v1/v2 or implementation-plan v1/v2 has been created under it yet. Start with PRD-12 or whichever feature Arun prioritizes.

### Code review doc not yet created for PRD-11 shell

After verification, create a code-review outcome doc in `UX_v2/reviews/`.

### `RUNNING_LOG.md` not appended during this handover

This handover is created as a separate document. Running-log append should happen after confirmation or explicit direct-write authorization, following the running-log skill.

### Generated backup snapshot

A dev-server run earlier created `data/backups/2026-06-14_0709.sqlite`. It is generated local data and should not be committed.

### App provider health in local dev

Local provider status in `/more` showed Ollama providers unreachable:

- Claude generation displayed `ollama · qwen2.5:7b-instruct-q4_K_M` and `Unreachable`.
- Gemini indexing displayed `ollama · nomic-embed-text` and `Unreachable`.

This is local-dev provider status, not proof production is broken.

### Magic Patterns live links not inspected in this handover

The local design package was used. If design ambiguity remains, inspect the Magic Patterns links Arun supplied.

---

## 18. Do Not Do

- Do not mark the overall UX v2 goal complete.
- Do not reset or clean the dirty worktree.
- Do not delete untracked docs/artifacts without Arun asking.
- Do not run production YouTube backfill real mode.
- Do not bypass YouTube transcript cooldown.
- Do not overwrite `RUNNING_LOG.md`.
- Do not append to the archived running log.
- Do not rely on global page heading in Browser checks; scope to `main`.
- Do not implement a new feature before creating the PRD/review/plan artifacts required by the new protocol, unless it is a small fix to complete/verify the already in-flight PRD-11 shell slice.

---

## 19. Recommended Next Feature Flow After PRD-11 Shell

Recommended next feature: `PRD-12 Android Unified Ask Composer`.

Reason:

- Android shell/navigation is the current workstream.
- Ask scope/history foundation is already partially implemented.
- The design package has clear missing Android Ask composer requirements.
- It is a central mobile experience and likely blocks smooth Android UX.

Artifacts to create:

1. `UX_v2/prds/PRD-12-android-unified-ask-composer-v1.md`
2. `UX_v2/prds/PRD-12-android-unified-ask-composer-adversarial-review-<timestamp>.md`
3. `UX_v2/prds/PRD-12-android-unified-ask-composer-v2.md`
4. `UX_v2/implementation-plans/PRD-12-android-unified-ask-composer-plan-v1.md`
5. `UX_v2/implementation-plans/PRD-12-android-unified-ask-composer-plan-adversarial-review-<timestamp>.md`
6. `UX_v2/implementation-plans/PRD-12-android-unified-ask-composer-plan-v2.md`
7. `UX_v2/reviews/PRD-12-android-unified-ask-composer-code-review-<timestamp>.md`

PRD-12 must cover:

- mobile header
- history button/sheet
- scope banner
- attached source chips
- composer label `Ask AI Memory`
- plus/add context
- attach saved item sheet
- paste link sheet
- write note sheet
- empty send nudges
- keyboard-safe behavior
- route-scope override visibility
- durable history restore with scope/attachments/citations/warnings

---

## 20. Final State Snapshot

- **Current phase:** UX v2 redesign implementation in progress.
- **Current project folder:** `phase2/UX_v2`.
- **Branch:** `codex/v0.7.7-deployment-hygiene`.
- **Worktree:** heavily dirty with prior UX v2 implementation and untracked design/docs/assets.
- **Runtime:** no known dev server listening on port 3311 at handover creation.
- **Newest created handover:** this file.
- **Newest UX v2 docs:** `04_FEATURE_DELIVERY_PROTOCOL.md`, `05_MISSING_FEATURE_TODO.md`.
- **Most recent code slice:** PRD-11 mobile shell and `/more`.
- **Most urgent next action:** finish PRD-11 mobile shell browser smoke and update docs.
- **Overall goal:** active, incomplete.
