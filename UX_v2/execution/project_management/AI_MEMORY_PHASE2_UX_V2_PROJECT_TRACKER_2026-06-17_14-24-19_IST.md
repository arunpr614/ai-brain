# AI Memory Phase 2 UX v2 Project Tracker

Created: 2026-06-17 14:24:19 IST
Owner: Project Manager sub-agent
Scope: Project tracking and execution planning only. No application source changed. `RUNNING_LOG.md` was not edited.
Project root: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`
Observed branch: `codex/ai-brain-ux-v2-execution` tracking `origin/codex/ai-brain-ux-v2-execution`
Latest pushed commit noted in source docs: `da598fd` (`Build private sideload debug APK`)

## Main-Agent Update - 2026-06-17 14:59:33 IST

Status: Compact-card/source-logo and Light-first theme lanes have completed the requested PRD -> adversarial review -> PRD V2 -> implementation plan -> adversarial review -> implementation plan V2 -> execution -> local QA cycle.

| Lane | Current status | Evidence |
| --- | --- | --- |
| Android Library compact card + source logos | Local implementation and QA passed | `UX_v2/features/FEATURE_ANDROID_LIBRARY_COMPACT_CARD_SOURCE_LOGOS_PRD_V2_2026-06-17_14-26-30_IST.md`; `UX_v2/features/FEATURE_ANDROID_LIBRARY_COMPACT_CARD_SOURCE_LOGOS_IMPLEMENTATION_PLAN_V2_2026-06-17_14-29-30_IST.md`; `UX_v2/execution/ANDROID_LIBRARY_COMPACT_CARD_SOURCE_LOGOS_QA_2026-06-17_14-59-33_IST.md` |
| Web/Android Light-first theme | Local implementation and QA passed | `UX_v2/features/FEATURE_LIGHT_FIRST_THEME_EXPLICIT_TOGGLE_PRD_V2_2026-06-17_14-26-00_IST.md`; `UX_v2/features/FEATURE_LIGHT_FIRST_THEME_EXPLICIT_TOGGLE_IMPLEMENTATION_PLAN_V2_2026-06-17_14-29-00_IST.md`; `UX_v2/execution/LIGHT_FIRST_THEME_QA_REPORT_2026-06-17_14-59-33_IST.md` |
| Product Manager sub-agent | Completed feature PRD decomposition drafts | `UX_v2/execution/feature_prds/` |
| Technical Architect sub-agent | Completed architecture/readiness assessment | `UX_v2/execution/architecture/ANDROID_LIBRARY_COMPACT_CARD_TECH_ARCH_ASSESSMENT_2026-06-17_14-24-58_IST.md` |
| Project Manager sub-agent | Completed initial tracker/project plan | This tracker |
| QA sub-agent | Completed QA strategy/test matrix | `UX_v2/execution/qa/ANDROID_LIBRARY_COMPACT_CARD_QA_STRATEGY_AND_TEST_MATRIX_2026-06-17_14-24-48_IST.md` |

Validation passed:

- `npm run lint`
- `npm run typecheck`
- `npm test` (571 tests passing)
- `npm run build` (passed with existing `unpdf` warning)
- `git diff --check`
- strict conflict-marker scan
- source-logo remote asset scan
- SSR theme cookie matrix
- headless 390px mobile browser QA with screenshots and `mobile-browser-qa-report.json` issue count `0`

Current remaining release gates:

- Production web backup and deploy to `https://brain.arunp.in`.
- Post-deploy live smoke for `/unlock`, `/settings`, `/library`, selected Ask, and item detail.
- Android WebView/runtime validation against the deployed web build.
- Optional fresh private APK build only if the installable native shell artifact is to be refreshed; public/store distribution remains out of scope without a separate owner-approved release slice.

## Main-Agent Closeout Update - 2026-06-17 17:35 IST

Status: requested private production web + private debug APK scope is complete. This closeout supersedes the older pending rows below, which were the PM sub-agent's initial plan before the main-agent execution pass finished.

| Lane | Final status | Evidence |
| --- | --- | --- |
| Android Library compact card + source logos | Done, deployed to production web, validated in Android WebView | `UX_v2/execution/ANDROID_LIBRARY_COMPACT_CARD_SOURCE_LOGOS_QA_2026-06-17_14-59-33_IST.md`; `UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/android-webview-compact-light-first-2026-06-17_17-28-22_IST/android-webview-runtime-report.redacted.json` |
| Web/Android Light-first theme | Done, deployed to production web, validated in Android WebView under OS dark | `UX_v2/execution/LIGHT_FIRST_THEME_QA_REPORT_2026-06-17_14-59-33_IST.md`; Android WebView report above |
| Production deploy | Done | Remote backup `/opt/brain/data/backups/ux-v2-compact-light-first-predeploy-2026-06-17_14-59-33_IST.sqlite` verified SHA-256 `9c0afa8958178767e4918ac5f1628b1f5e39aae0ecdbe9295b65057295e62c78`; `brain` service active; authenticated health check `200`; public root redirects to unlock as expected |
| Production protected smoke | Done | `UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/production-postdeploy-2026-06-17_15-25-03_IST/production-mobile-smoke-report.redacted.json` with `issueCount: 0` |
| Fresh private APK | Done | `data/artifacts/brain-debug-v1.0.7-code8.apk`; SHA-256 `d56ce784240277896f344e83cecec2e5cf921279a14c87beed66a5846b33ff46`; size `7.5M`; installed successfully on `Brain_API_36` emulator; package confirmed `versionName=1.0.7`, `versionCode=8` |
| Final release/QA report | Done | `UX_v2/execution/COMPACT_LIGHT_FIRST_PRODUCTION_DEPLOY_AND_APK_QA_2026-06-17_17-35-00_IST.md` |
| Public/store Android distribution | Not in scope | Still requires separate owner-approved PRD/review/plan/release-signing cycle |

Final gates passed:

- `npm run lint`
- `npm run typecheck`
- `npm test` (571 tests, 79 suites, 0 failures)
- `npm run build` (passed with existing `unpdf` warning)
- `git diff --check`
- conflict-marker scan
- theme static scan
- source-logo remote-asset scan
- local mobile browser QA issue count `0`
- production protected smoke issue count `0`
- Android WebView runtime issue count `0`

Data/privacy cleanup:

- Removed exact local QA fixture items and fixture taxonomy rows from `data/brain.sqlite`; verified matching counts `0`.
- Stopped local dev server on port `3048`.
- Cleared temporary emulator app data/session with `adb shell pm clear com.arunprakash.brain`.
- Removed WebView debug port forward and shut down the emulator.

## Source Documents Read

| Source | PM interpretation |
| --- | --- |
| `Handover_docs/AI_MEMORY_ANDROID_LIBRARY_COMPACT_CARD_HANDOVER_2026-06-17_14-05-19_IST.md` | Current handover for the Android Library compact-card lane. It confirms the V2 compact-card plan is source of truth, production code has not changed, and the next implementation agent must protect filters/search/header/bottom nav/desktop behavior. |
| `RUNNING_LOG.md` entries #128-#136 | Current chronological state: A34 private sideload APK `1.0.6/code7` was built, source/docs were committed and pushed, then the Android Library compact-card lane advanced through RCA, prototype, plan V1, source-logo addendum, adversarial review, plan V2, and handover with no production code/APK/deploy after A34. |
| `UX_v2/execution/ANDROID_LIBRARY_COMPACT_CARD_OPTION_A_IMPLEMENTATION_PLAN_V2_2026-06-17_11-02-23_IST.md` | Current executable plan for the compact Library card and source-logo work. It requires mobile/desktop branches, local logos, visible mobile checkbox, compact metadata, desktop evidence, and Android WebView/APK evidence. |
| `UX_v2/execution/WEB_ANDROID_LIGHT_FIRST_THEME_IMPLEMENTATION_PLAN_2026-06-17_08-31-22_IST.md` | Current plan for Light-first Web and Android theme behavior. It changes fresh/no-cookie/system-cookie behavior to Light, keeps Dark only as explicit user choice, and requires Web plus Android evidence. |
| `UX_v2/project_management/UX_V2_DELIVERY_GATE_TRACKER_2026-06-16_15-45-27_IST.md` | Historical PM tracker through A34. It remains useful context but lives outside the requested `execution/project_management` path. |

## Current Executive Snapshot

| Area | Status | Notes |
| --- | --- | --- |
| Web UX v2 | Production deployed and smoke-tested from earlier A11/A24/A25/A29 work | No new web deploy occurred for the compact-card lane or light-first theme plan. |
| Android private APK | `1.0.6/code7` local private sideload debug APK ready from A34 | This APK predates the compact-card fix and the light-first theme plan. |
| Android Library compact card | Planning complete through implementation plan V2; execution not started | Current next active implementation lane. Needs either strict PRD-cycle completion or Arun/main-agent acceptance that V2 is sufficient for this micro-feature. |
| Web/Android light-first theme | Implementation plan exists; execution not started | Plan is an amendment to prior Web/Android PRDs. Dedicated feature PRD/review/plan V2 chain is not complete yet. |
| Public/store distribution | Not authorized | Any release signing, public upload, Google Play, or true spoken TalkBack audit is a separate owner-approved slice. |
| Working tree hygiene | Dirty/untracked state exists | Do not revert or stage unrelated Telegram docs, root `RUNNING_LOG.md`, APK binaries, databases, secrets, or broad historical untracked folders. |

## Status Legend

| Status | Meaning |
| --- | --- |
| Done | Artifact or activity exists and is accepted by current evidence. |
| In progress | Work has started and is not yet at its exit gate. |
| Pending | Required but not started or not evidenced. |
| Missing | Required by the strict governance model, but no dedicated artifact was found. |
| Blocked | Cannot proceed or cannot claim completion until a named decision/evidence gate is satisfied. |
| Inherited | Covered by a broader PRD/plan, but not a dedicated feature-specific artifact. |
| N/A | Not applicable to this lane. |

## Feature Governance Matrix

This table uses the requested phase sequence for each active or release-relevant feature.

| Feature / lane | PRD v1 | PRD adversarial review | PRD v2 | Implementation plan v1 | Plan adversarial review | Implementation plan v2 | Execution | QA | Deployment / release |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A34 private sideload debug APK build | Done | Done | Done | Done | Done | Done | Done | Done | Done for private local sideload only; no upload/public distribution |
| Android Library compact card + source logos | Missing dedicated PRD | Missing dedicated PRD review | Missing dedicated PRD v2 | Done: `ANDROID_LIBRARY_COMPACT_CARD_OPTION_A_IMPLEMENTATION_PLAN_2026-06-17_10-29-08_IST.md` plus source-logo addendum | Done: `ANDROID_LIBRARY_COMPACT_CARD_OPTION_A_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-17_10-39-34_IST.md` | Done: `ANDROID_LIBRARY_COMPACT_CARD_OPTION_A_IMPLEMENTATION_PLAN_V2_2026-06-17_11-02-23_IST.md` | Pending | Pending | Pending; no APK/deploy until QA passes and version is bumped if shared |
| Web/Android light-first theme | Inherited from Web/Android revised PRDs; no dedicated feature PRD | Inherited from gap-report adversarial review; no dedicated PRD review | Inherited/product decision captured in plan; no dedicated PRD v2 | Done: `WEB_ANDROID_LIGHT_FIRST_THEME_IMPLEMENTATION_PLAN_2026-06-17_08-31-22_IST.md` | Missing dedicated implementation-plan adversarial review | Missing dedicated implementation-plan V2 | Pending | Pending | Pending; web deploy/APK rebuild only after Web and Android evidence |
| Public/store Android distribution | Pending future owner-approved PRD | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Blocked by Arun owner decision, release signing/distribution target, and accessibility posture |

## Active Milestones

| ID | Milestone | Owner / agents | Status | Dependencies | Exit gate |
| --- | --- | --- | --- | --- | --- |
| M0 | Preserve source and PM baseline | PM sub-agent, main agent | Done for this tracker | Read handover, running log, compact-card V2 plan, light-first plan | This tracker exists under `UX_v2/execution/project_management/`; no source or running-log edits made. |
| M1 | A34 private APK baseline retained | Main agent, Android QA agent, Arun | Done | A34 PRD/review/plan chain and QA evidence | `data/artifacts/brain-debug-v1.0.6-code7.apk` remains the current private local APK; everyone understands it does not include compact-card or light-first changes. |
| M2 | Compact-card governance decision | Arun, main agent, PM sub-agent | Blocked / decision needed if strict governance is enforced | V2 plan and handover | Either create lightweight PRD v1/review/PRD v2 for this micro-feature, or explicitly record that Arun/main agent accepts the V2 implementation plan as sufficient governance for execution. |
| M3 | Compact-card implementation | Main implementation agent | Pending | M2 decision, V2 plan, clean ownership of allowed files | Only `src/components/library-list.tsx`, `src/components/item-enrichment-watch.tsx`, optional `src/components/source-logo.tsx` change; protected files remain untouched. |
| M4 | Compact-card browser and Android QA | QA/evidence agent, Android runtime agent | Pending | M3 implementation, fixture coverage | QA/evidence note exists with desktop before/after, mobile browser evidence, Android WebView/APK screenshots, source-logo coverage, selection/BulkBar proof, and command results. |
| M5 | Compact-card private APK decision | Arun, main agent, Android build agent | Pending | M4 QA green | If a new installable artifact is requested, bump from current `1.0.6/code7` to the next available version/code, expected `1.0.7/code8` unless repo advanced, then document path/checksum/install notes. |
| M6 | Light-first governance hardening | Main agent, adversarial reviewer, PM sub-agent | Pending | Light-first implementation plan, prior Web/Android PRDs | Dedicated PRD/review/PRD v2 and plan review/plan V2 are created, or the main agent records that this plan is an accepted amendment to existing PRDs and proceeds with that risk accepted. |
| M7 | Light-first implementation | Main implementation agent | Pending | M6 governance hardening | Theme resolver/bootstrap/settings/offline/native-shell changes implemented without weakening explicit Dark support. |
| M8 | Light-first Web and Android QA | QA/evidence agent, Android runtime agent | Pending | M7 implementation | Web and Android matrices pass: fresh/no-cookie Light, OS dark still Light, legacy `brain-theme=system` Light, explicit Dark persists, Light restores, offline fallback Light-first, Android relaunch persistence proven. |
| M9 | Light-first deployment / APK release decision | Arun, release/deploy agent, main agent | Pending | M8 green, release approval | Web deploy or APK rebuild only happens after evidence, backup/rollback if production deploy, version bump if APK changed/shared, and release notes/QA report are complete. |

## Owners And Responsibilities

| Owner / agent | Responsibility |
| --- | --- |
| Arun | Product owner for option acceptance, residual risk acceptance, private sideload feedback, and any public/store distribution decision. |
| Main implementation agent | Executes code changes, keeps scope bounded, updates running log with the running-log skill, and coordinates deploy/APK decisions. |
| PM sub-agent | Maintains tracker/project plan, surfaces blockers, and avoids application source or running-log edits. |
| Adversarial reviewer | Reviews PRDs/plans with evidence-first P0/P1/P2/P3 findings. P0/P1 block execution/release until resolved or explicitly accepted. |
| QA/evidence agent | Creates timestamped QA reports with commands, screenshots/observations, fixture coverage, and pass/fail notes. |
| Android runtime agent | Builds/installs APKs only when authorized, captures emulator/device evidence, records version/path/checksum, and validates Android-specific behavior. |
| Release/deploy agent | Handles production backup, deploy, live smoke, rollback proof, artifact notes, and final release status only after gates pass. |

## Dependencies

| Dependency | Applies to | Status | Note |
| --- | --- | --- | --- |
| V2 compact-card implementation plan | Android Library compact card | Done | Must use V2, not superseded V1. |
| Strict PRD governance | Android Library compact card, light-first theme | Open | Compact-card has no dedicated PRD; light-first is an amendment plan without dedicated plan review/V2. |
| Current APK version baseline | Compact-card APK, light-first APK | Done | Current known private artifact is `1.0.6/code7`; next shareable build should version bump. |
| Android tooling/emulator/device | Compact-card QA, light-first QA | Required | Android evidence is mandatory for both lanes because browser mobile screenshots alone are insufficient. |
| Magic Patterns references | Compact-card visual parity, light-first parity | Available but should be rechecked | Compact card uses the mobile Magic Patterns source; light-first plan requires rechecking Magic Patterns status before final QA. |
| Dirty worktree discipline | All lanes | Required | Existing `RUNNING_LOG.md`, Telegram docs, and broad untracked files are not to be reverted or swept into commits. |
| Production deploy approval and backup | Light-first web deploy | Pending | No production deploy should happen without backup/rollback/live-smoke discipline. |
| Public/store distribution decision | Public Android release | Blocked | A34 allowed private sideload only. |

## Risks

| Risk | Severity | Owner | Mitigation / gate |
| --- | --- | --- | --- |
| Compact-card work regresses shared desktop Library layout | High | Main implementation agent | Use separate `md:hidden` mobile body and `hidden md:flex` desktop body; require desktop before/after evidence. |
| Compact-card work changes filters/search/header/bottom nav outside scope | High | Main implementation agent | Protected files must remain unchanged, especially `src/app/library/page.tsx` and `src/components/mobile-library-filters.tsx`. |
| Mobile source identity is duplicated or inaccessible | High | Main implementation agent | No mobile title-row `SourceIcon`; source logo appears only beside readable text in metadata; logos decorative only. |
| Source logos use remote/CDN assets | High | Main implementation agent | Use local/bundled SVG/components only; no runtime logo network fetch. |
| Mobile selection becomes undiscoverable | High | Main implementation agent, QA agent | Keep compact visible checkbox; prove zero-selected to selected to BulkBar flow. |
| Compact-card fix is claimed from browser-only evidence | High | QA/evidence agent | Android WebView/APK evidence is mandatory before done. |
| Light-first theme accidentally removes or breaks Dark mode | High | Main implementation agent, QA agent | Explicit Dark remains supported and must pass contrast/visual QA. |
| Light-first default still follows OS/system dark mode | High | Main implementation agent | Remove automatic system-theme behavior; verify no-cookie and legacy `brain-theme=system` resolve to Light in browser and Android. |
| Android native shell/offline fallback flashes or opens Dark | Medium / High | Android runtime agent | Audit native styles/WebView force-dark/offline fallback and capture fresh install evidence. |
| Mixed-lane implementation causes review confusion | Medium | Main agent, PM sub-agent | Keep compact-card and light-first commits/evidence separate unless Arun explicitly asks for a combined release. |
| Dirty worktree causes accidental staging of unrelated files | High | Main agent, release agent | Stage by exact paths only; never stage root `RUNNING_LOG.md`, Telegram docs, APK binaries, secrets, DBs, or broad folders unless explicitly approved. |

## Acceptance Gates

### Compact Card

Implementation may be accepted only when:

- V2 plan is followed and V1 decisions are not revived.
- Production code changes stay in allowed files.
- `src/app/library/page.tsx` and `src/components/mobile-library-filters.tsx` remain unchanged.
- Mobile title is `line-clamp-2`, `text-[15px]`, `font-semibold`, and `leading-snug` or an equivalent V2-aligned treatment.
- Mobile title row has no source icon and no enrichment/status pill.
- Mobile metadata shows source logo plus readable text, quality badge, non-done enrichment status, and relative time.
- YouTube, LinkedIn, Substack, PDF, Note, and generic fallback cases are covered.
- No source logo is loaded remotely.
- Mobile selection works from zero selected items and BulkBar still works.
- Card tap navigation still opens item detail.
- Mobile metadata does not exceed two visual lines for long-title fixtures.
- Desktop Library before/after shows no unapproved visual regression.
- Android WebView/APK screenshots prove the fix.
- QA/evidence markdown exists under `UX_v2/execution/`.

### Light-First Theme

Implementation may be accepted only when:

- Fresh Web with no `brain-theme` cookie opens Light.
- Fresh Web with OS/browser dark still opens Light.
- `brain-theme=system` and invalid values resolve to Light.
- `brain-theme=dark` opens Dark and persists after reload.
- Settings shows Light and Dark only; no user-facing System option remains.
- Dark support remains functional and contrast-safe.
- Fresh Android install or cleared data opens Light, including when Android OS is Dark.
- Android Settings Light/Dark persists across app relaunch.
- Android offline fallback is Light-first and not OS-driven dark.
- Launch/splash/status/navigation bars do not surprise-flash dark in normal Light-first flow.
- Static checks and scans in the plan are reviewed and documented.
- `LIGHT_FIRST_THEME_QA_REPORT_<timestamp>.md` exists with Web and Android evidence.

### Deployment / APK

No deploy or APK sharing should happen unless:

- QA report is green or explicit residual risk is accepted by Arun.
- Production deploy has backup, rollback, live smoke, and observability notes.
- APK build has version/code bump if it is a fresh shareable artifact.
- APK path, SHA-256, size, install result, and rollback note are documented.
- Public/store distribution has a separate owner-approved PRD/review/plan cycle.

## Next Actions

| Priority | Action | Owner | Output |
| --- | --- | --- | --- |
| P0 | Decide compact-card governance path | Arun / main agent | Either lightweight PRD v1/review/PRD v2 or explicit note that V2 plan is accepted as sufficient for this micro-feature. |
| P0 | Implement compact-card V2 only after governance path is clear | Main implementation agent | Scoped source changes in allowed files only. |
| P0 | Create compact-card QA/evidence report | QA/evidence agent | Desktop/mobile browser evidence plus Android WebView/APK evidence. |
| P1 | Decide whether to build a fresh private APK after compact-card QA | Arun / main agent | If yes, version-bumped APK, checksum, install notes; likely next `1.0.7/code8` unless repo advanced. |
| P1 | Harden light-first governance before coding | Main agent / reviewer | Dedicated PRD/review/plan review/V2 chain or documented acceptance of amendment-plan risk. |
| P1 | Implement and validate light-first theme as a separate lane | Main implementation agent / QA agent | Theme source changes plus `LIGHT_FIRST_THEME_QA_REPORT_<timestamp>.md`. |
| P2 | Reconcile PM trackers after each milestone | PM sub-agent or main agent | This tracker plus any still-used `UX_v2/project_management` trackers updated with links/status. |
| P2 | Keep running log append-only via main agent | Main agent | Running-log entry appended with the running-log skill after milestone completion; this PM task did not edit it. |

## Main-Agent Update Contract

As work completes, the main agent must update:

1. This tracker: update `Current Executive Snapshot`, `Feature Governance Matrix`, `Active Milestones`, `Risks`, and `Next Actions`.
2. Evidence links: add the exact PRD/review/plan/QA/deploy/APK paths created for each lane.
3. Running log: append a milestone entry with the running-log skill. Do not rewrite earlier entries.
4. QA reports: create timestamped reports under `UX_v2/execution/` with commands, screenshots/observations, and pass/fail notes.
5. Release artifact metadata: if APK changes, record versionName/versionCode, artifact path, SHA-256, size, install result, and rollback note.
6. Deployment state: if web deploy happens, record backup path, deploy command/result, live smoke, service status, and rollback source.
7. Git hygiene: stage exact owned paths only; keep root `RUNNING_LOG.md`, unrelated Telegram docs, APK binaries, secrets, DBs, and broad untracked folders out of staging unless explicitly approved.

## Standing Blockers

| Blocker | Blocks | Resolution |
| --- | --- | --- |
| Compact-card dedicated PRD cycle missing under strict governance | Compact-card execution if strict process is enforced literally | Create lightweight PRD v1/review/PRD v2 or record explicit acceptance that V2 implementation plan is sufficient. |
| Compact-card code not implemented | Compact-card QA/deployment | Implement V2 in allowed files. |
| Android compact-card evidence missing | Compact-card completion and APK sharing | Build/install/capture Android evidence after browser QA. |
| Light-first plan has no dedicated implementation-plan adversarial review/V2 | Light-first execution under strict process | Review the plan and revise to V2, or document accepted amendment-plan risk. |
| Light-first code/QA not started | Light-first deployment | Implement, run static checks, browser QA, Android QA, and create QA report. |
| Public/store Android distribution unauthorized | Public APK/AAB/Play release | New owner-approved release-signing/distribution/accessibility slice. |
| Dirty worktree includes unrelated files | Any commit/release action | Stage exact owned paths only and do not revert others' edits. |

## Recommended Sequencing

1. Finish the Android Library compact-card/source-logo lane first because Arun reported it as an immediate Android usability bug and the V2 plan is already ready.
2. Keep the light-first theme lane separate because it touches global theme behavior, Settings, offline fallback, Android native shell, and deployment evidence.
3. Build a fresh private APK only after the relevant lane has Android evidence and Arun asks for an installable artifact.
4. Treat public/store distribution as a future project, not part of the current private-sideload path.
