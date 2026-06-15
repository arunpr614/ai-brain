# UX v2 Magic Patterns Implementation Matrix

Created: 2026-06-15 16:35 IST
Owner: Codex lead integrator
Release worktree: `/private/tmp/ai-brain-ux-v2-main-ready`
Branch: `codex/ai-brain-ux-v2-magic-patterns`
Base evidence commit: `2c146699b68da083ec83d777c25413ec97250645`
Production URL: `https://brain.arunp.in`

## Source Authority

This pass resumes from the production handover and implements the confirmed web/WebView UI deltas that can be taken from the approved `UX_Final_Plan` plus the two Magic Patterns references without silently closing open product decisions.

Primary sources:

- Handover: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/Handover_docs/AI_MEMORY_UX_V2_PRODUCTION_AND_NEXT_AGENT_HANDOVER_2026-06-15_13-17-51_IST.md`
- Plan authority: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/UX_Final_Plan`
- Prior release evidence: `UX_v2/execution/UX_V2_PRODUCTION_RELEASE_2026-06-15.md`
- Open decisions: `UX_v2/execution/UX_V2_OPEN_DECISIONS_APPROVAL_PACKET_2026-06-14.md`
- Magic Patterns mobile: `https://www.magicpatterns.com/c/d5w3fb6rzxdeht7urnye5r`
- Magic Patterns desktop: `https://www.magicpatterns.com/c/fhbeo46qahq5fkjfseckxx`

Live Magic Patterns refs were re-opened during this execution. Resolved active artifacts:

- Mobile editor `d5w3fb6rzxdeht7urnye5r`, artifact `d7eeaec6-0272-40fa-a7ca-4de7871182e7`
- Desktop editor `fhbeo46qahq5fkjfseckxx`, artifact `f3312489-9172-4c3f-bcf8-2352ece9d417`

## Implementation Summary

| Area | Status | Notes |
| --- | --- | --- |
| Web shell | Implemented locally | Desktop sidebar with AI Memory identity, collapsible rail, route-aware active state, bottom mobile navigation, More route, Pair Device link, Needs Upgrade badge. |
| Android UI shell | Implemented as responsive WebView UI, validation pending deploy | Same responsive web assets drive Android. No Android UX v2 claim until deployed assets are loaded inside the APK and screenshot evidence is captured. |
| Library | Implemented locally | `/library` route, source/quality/tag filters, mobile filter sheet, search entry, bulk select, Ask selected, Needs Upgrade affordance. |
| Item detail | Implemented locally | Source trust strip, topics, collections/tags, related items, Ask item, repair affordance, focus mode that hides shell chrome. |
| Ask | Implemented locally within approved scope | Library/item/selected/tag/topic/collection scoped Ask, history panel for library scope, richer citation chips. Attachment persistence, high-quality-only controls, and scope-history schema remain deferred. |
| Topics | Implemented locally with migration | Additive `018_topics.sql`, topic repository, enrichment-derived topics, topic detail route, topic-scoped Ask. |
| Collections | Implemented locally | Collection detail route aligned to Magic Patterns with scoped Ask and item list. |
| Capture/result states | Already shipped; visual smoke refreshed | Existing capture page and result banner remain the approved PRD-06 implementation. Dedicated Android share result route remains deferred. |
| Needs Upgrade / Repair | Already shipped; UI refreshed | Existing repair route and weak-source queue remain the approved PRD-10 implementation. Mark-good-enough remains deferred. |
| More / Settings / Privacy / Offline | Implemented as informational UI only | More route and Settings trust copy avoid offline queue, QR, encryption, telemetry, and privacy-control overclaims. |
| Login / Unlock / Pair Device | Existing shipped flow retained | AI Memory branding and pairing copy are present; QR pairing and package-ID migration remain deferred. |
| Public assets | Implemented locally | Web icons and manifest point to AI Memory branding. |

## UX Matrix

| Screen / state / component | Platform | Source | Current status | Required change completed | Validation method / evidence | Decision handling |
| --- | --- | --- | --- | --- | --- | --- |
| DesktopLayout / global shell | Web | MP2 `DesktopLayout`, PLAN DOC-001 | Implemented locally | Collapsible sidebar, AI Memory identity, search, lower trust/pairing links, mobile-safe main padding | Browser screenshots: `2026-06-15-magic-patterns/desktop-library.png`; build route output | No open decision |
| MobileBottomNav / frame | Android WebView | MP1 `MobileBottomNav`, PLAN DOC-009 | Implemented locally as responsive shell | Four-tab bottom nav with route-aware Capture/More and active states | Browser mobile screenshots: `mobile-library.png`, `mobile-more.png`; Android runtime pending deploy | D-006 stays deferred; no raised Capture FAB added |
| DesktopLibrary | Web | MP2 `DesktopLibrary`, PLAN DOC-003/SRC-056 | Implemented locally | `/library`, filters, search, select, Ask selected, Needs Upgrade count | `desktop-library-seeded.png`, `desktop-library-needs-filter.png`; tests/build | No open decision |
| MobileLibrary | Android WebView | MP1 `MobileLibrary`, PLAN DOC-011/SRC-025 | Implemented locally as responsive route | Mobile filter sheet, compact item rows, selectable rows, Ask selected | `mobile-library-seeded.png`; Android runtime pending deploy | Long-press/native tabs not added; D-005 deferred |
| DesktopNeedsUpgrade | Web | MP2 `NeedsUpgrade`, PLAN DOC-004/SRC-058 | Already shipped, visually retained | Weak-source queue links to repair; AI Memory copy | `desktop-needs-upgrade.png`, `mobile-needs-upgrade-seeded.png`; repair tests | D-004 mark-good-enough deferred |
| MobileNeedsUpgrade | Android WebView | MP1 `NeedsUpgrade`, PLAN SRC-028 | Already shipped, responsive route retained | Queue remains repair-focused and truthful | `mobile-needs-upgrade-seeded.png`; Android runtime pending deploy | D-004 deferred |
| DesktopItemDetail | Web | MP2 `ItemDetail`, PLAN DOC-005/SRC-055 | Implemented locally | Source trust, repair panel, topics, collections/tags, related, focus, scoped Ask | `desktop-item-detail.png`, `desktop-item-weak.png`; item/topic tests | YouTube player D-014 deferred |
| MobileItemDetail | Android WebView | MP1 `ItemDetail`, PLAN DOC-013/SRC-024 | Implemented locally as responsive single page | Core detail UI is responsive; focus hides shell chrome | `mobile-item-detail.png`; focus screenshot fixed | Native/tabbed Android IA D-005 deferred |
| Focus mode | Web/Android WebView | MP1/MP2 focus screenshots, PLAN SS-004/SS-012 | Implemented locally | `/items/[id]?mode=focus` hides desktop and mobile nav; Exit focus link returns to item | `desktop-item-focus-shell-fixed.png`, visual assertion `navVisible:false` | No open decision |
| DesktopAsk | Web | MP2 `Ask`, PLAN DOC-006/SRC-052 | Implemented locally within scope | Scope banner, library history panel, citations, selected/tag/topic/collection scopes | `desktop-ask.png`; ask API/retrieval tests | D-001/D-002/D-003 deferred |
| MobileAsk | Android WebView | MP1 `Ask`, PLAN DOC-014/SRC-021 | Implemented locally as responsive Ask | Mobile-safe composer clearance, history details, scope banner | `mobile-ask.png`; Android runtime pending deploy | D-001/D-002/D-003 and PRD-12 native composer deferred |
| DesktopCapture | Web | MP2 `Capture`, PLAN DOC-007/SRC-053 | Already shipped, visually retained | Capture route and result-state contract retained | `desktop-capture.png`; capture tests from prior release still pass | No new decision |
| MobileCapture | Android WebView | MP1 `Capture`, PLAN SS-014/SRC-022 | Already shipped as responsive route | Bottom nav exposes Capture; result contract retained | `mobile-capture.png`; Android runtime pending deploy | Dedicated share result PRD-13 deferred |
| MobileShareCapture | Android WebView | MP1 `ShareCapture`, PLAN SRC-031 | Deferred | Existing Android share goes through shipped capture API; no dedicated share-result screen added | Prior production Android share evidence exists; new deploy validation pending | PRD-13 / multi-PDF / offline queue decisions deferred |
| MobileRepair | Android WebView | MP1 `Repair`, PLAN SRC-030 | Already shipped as responsive route | Add-text/transcript repair route remains available from weak items | Repair unit tests; weak item screenshot | Mark-good-enough D-004 deferred |
| DesktopSettings | Web | MP2 `Settings`, PLAN DOC-008/SRC-060 | Already shipped, retained | Informational provider/privacy/offline posture | Prior release PRD-14 evidence; More screenshots refreshed | D-007 active offline controls deferred |
| MobileMore | Android WebView | MP1 `More`, PLAN DOC-015/SRC-027 | Implemented locally | More route with Settings, Pair Device, privacy/offline/provider rows | `mobile-more.png`, `mobile-more-seeded.png` | D-007/D-008/D-006 deferred |
| MobileOffline | Android WebView | MP1 `Offline`, PLAN SRC-029 | Existing shipped fallback retained | No overclaim of offline capture/Ask/sync; server-required copy retained | Prior Android offline production evidence; post-deploy retest required if deployed | D-007 deferred |
| DesktopLogin / Unlock | Web | MP2 `Login`, PLAN DOC-002/SRC-057 | Existing shipped flow retained | AI Memory branding and lock/unlock entry kept | Prior production smoke `/unlock`; new live smoke pending deploy | No QR promise |
| MobileLogin | Android WebView | MP1 `Login`, PLAN DOC-010/SRC-026 | Existing shipped WebView entry retained | Code-entry pairing/unlock flow retained | Prior Android pairing evidence; new runtime pending deploy | D-008 QR and D-013 package ID deferred |
| DesktopPairDevice | Web | MP2 `PairDevice`, PLAN SRC-059 | Existing shipped flow retained | Pair Device route in shell and More | `desktop-pair-device.png`, `mobile-pair-device.png`; route tests | QR pairing D-008 deferred |
| DesktopTopic | Web | MP2 `Topic`, PLAN SRC-061 | Implemented locally | `/topics/[slug]`, source count, item list, Ask topic | `desktop-topic.png`; `src/db/topics.test.ts` | No open decision for read-only topic surfacing |
| MobileTopic | Android WebView | MP1 `Topic`, PLAN SRC-032 | Implemented locally as responsive route | Topic detail and scoped Ask available on mobile | Browser mobile coverage via responsive route; Android pending deploy | No native-only work |
| DesktopCollection | Web | MP2 `Collection`, PLAN SRC-054 | Implemented locally | `/collections/[id]`, item list, Ask collection | `desktop-collection.png`; build route output | No open decision |
| MobileCollection | Android WebView | MP1 `Collection`, PLAN SRC-023 | Implemented locally as responsive route | Collection detail available on mobile | Responsive route screenshot coverage via shared page; Android pending deploy | No native-only work |
| Public web manifest/icons | Web/Android WebView | Design asset package | Implemented locally | AI Memory icons and web manifest added | Static file presence; build metadata | No package-ID change |

## Release Matrix

| Gate / work item | Status | Evidence | Release handling |
| --- | --- | --- | --- |
| Baseline branch and dirty-state isolation | Done | Branch `codex/ai-brain-ux-v2-magic-patterns` from `2c14669`; original worktree preserved dirty | Safe |
| Magic Patterns audit | Done | Active artifact IDs recorded above; local screenshot matrix captured | Safe |
| Web UI implementation | Done locally | Changed routes/components listed in `git diff --stat`; screenshots under `UX_v2/execution/evidence/screenshots/2026-06-15-magic-patterns*` | Candidate |
| Android UI implementation | Done as web assets; runtime validation pending deploy | Browser mobile screenshots exist; Android APK must load deployed assets before claim | Blocking for Android UX v2 claim |
| Storage/API/data changes | Done locally | Additive `018_topics.sql`; selected-item Ask API/retriever tests | Requires backup/rollback before deploy |
| Unit/integration tests | Passed | `npm test`: 515 tests, 77 suites, 0 failures | Safe |
| Typecheck | Passed | `npm run typecheck` | Safe |
| Lint | Passed with known warnings | Existing unused-disable warnings only | Non-blocking |
| Build | Passed with known warning | `npm run build`; known `unpdf` warning | Non-blocking |
| Code review | In progress | Focused review found no P0/P1 so far; final diff-check pending | Must complete before deploy |
| Deploy access | Pending validation | Prior deploy uses `scripts/deploy.sh`; not run yet in this pass | Hard gate |
| Backup/restore | Documented below; actual predeploy backup pending | Additive migration requires predeploy SQLite snapshot and integrity check | Hard gate |
| Rollback | Documented below | Redeploy prior source; DB restore if schema rollback is required | Hard gate |
| Android pairing/share/offline validation | Pending deploy | Prior production APK evidence exists, but new UI assets need runtime check | Hard gate for Android claim |
| APK/version safety | Safe if no APK published; blocked if publishing without bump | Existing artifact is `1.0.2` / code `3` | No same-version overwrite |
| D-001 through D-014 | Deferred/nonblocking | Decision packet plus table below | No silent assumptions |

## Data Safety: Topics Migration And Ask Scope

Schema change:

- `018_topics.sql` adds `topics` and `item_topics`.
- It is additive and uses `CREATE TABLE IF NOT EXISTS` plus supporting indexes.
- No existing table or column is dropped or rewritten.
- Existing item, chunk, tag, collection, repair, and capture rows remain valid.

Runtime data changes:

- Enrichment may replace AI-derived topics for an item from the existing enrichment `tags` output.
- Repair clears stale topics together with stale derived enrichment state so a repaired item does not keep outdated topic assignments.
- Ask selected/tag/topic/collection scopes resolve to item IDs and pass those IDs to retrieval. They do not create a new persistent scope-history schema.

Predeploy backup plan:

1. Verify current production service and database path.
2. Create a timestamped SQLite backup under `/opt/brain/data/backups/`.
3. Run `PRAGMA integrity_check` on the backup and record item count plus file size.
4. Proceed only if backup integrity returns `ok`.

Restore / rollback plan:

1. If application deploy fails before migration use, redeploy prior known-good source through `scripts/deploy.sh`.
2. If the migration ran and schema rollback is required, stop `brain.service`, restore the verified predeploy SQLite snapshot using the established restore pattern, restart service, and smoke `/unlock`, authenticated `/api/health`, `/library`, `/ask`, and Android WebView.
3. If rollback is code-only, the additive topic tables can remain unused; a destructive down migration is not required.

Failure notes:

- Topic extraction is derived, not user-authored truth. UI labels should not present topics as manual organization.
- Ask selected scope is capped at 50 item IDs.
- D-003 scope-history persistence remains deferred; this implementation does not claim snapshot history semantics.

## D-001 To D-014 Handling

| Decision | Status in this pass |
| --- | --- |
| D-001 attached Ask context | Deferred. Existing saved items/scoped item IDs only. |
| D-002 high-quality-only Ask | Deferred. Weak-source warnings remain informational. |
| D-003 scope-history persistence | Deferred. No schema added for scope snapshots. |
| D-004 mark good enough | Deferred. Repair remains add-text/transcript only. |
| D-005 Android item-detail tabs | Deferred. Responsive item detail ships without native tab IA. |
| D-006 raised Capture on More | Deferred. More uses normal bottom nav behavior. |
| D-007 active offline controls | Deferred. Offline copy remains informational/fallback only. |
| D-008 QR pairing | Deferred. Code-entry pairing remains. |
| D-009 transcript operator visibility | Deferred to ops/admin track. |
| D-010 transcript provider fallback | Deferred to research/ops track. |
| D-011 product analytics | Deferred; no analytics added. |
| D-012 Chrome extension redesign | Deferred; no extension redesign added. |
| D-013 Android package ID | Deferred; package remains `com.arunprakash.brain`. |
| D-014 YouTube embedded player | Deferred; generic item detail remains. |

## Current Verdict

Web UX v2 Magic Patterns candidate is implemented locally and has passed typecheck, lint, tests, build, and browser screenshot QA. Deployment is not yet authorized by gates until final code review, deploy access, actual production backup, deploy script, post-deploy smoke, and Android WebView deployed-asset validation complete.
