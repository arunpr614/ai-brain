# UX v2 Project Tracker Update

**Created:** 2026-06-15 23:27:55 IST
**Project folder:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`
**Branch:** `codex/ai-brain-ux-v2-execution`
**Status:** Main Codex checkpoint after completing the web item detail / Ask / Needs Upgrade feature slice locally.

## Current Milestone Status

| Milestone | Previous status | Updated status | Evidence |
| --- | --- | --- | --- |
| M1 - Stabilize execution-source baseline | Done | Done | `UX_v2/execution/WEB_EXPERIENCE_REVAMP_PHASE2_BASELINE_2026-06-15_22-35-00_IST.md` |
| M2 - Re-review revised web implementation plan | Done | Done | `UX_v2/execution/WEB_EXPERIENCE_REVAMP_REVISED_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-15_21-55-00_IST.md` |
| M3 - Magic Patterns source baseline | Done for source manifest; continue per-feature visual QA | Done for completed web slices; continue per-feature visual QA | `UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/` |
| M4 - Fixture, auth, QA, backup/rollback runbooks | Fixture and browser QA harness used for prior web slices | Fixture and browser QA harness used for item/Ask/Needs Upgrade; broader release runbooks still pending | `UX_v2/execution/WEB_EXPERIENCE_REVAMP_BROWSER_QA_HARNESS_2026-06-15_21-48-07_IST.md` |
| M5 - Contrast/token repair | Complete locally; not released | Complete locally; not released | `UX_v2/execution/WEB_EXPERIENCE_REVAMP_CONTRAST_QA_2026-06-15_22-20-00_IST.md` |
| M7a - Web shell/navigation and route frame | Complete locally; not released | Complete locally; not released | `UX_v2/execution/WEB_EXPERIENCE_REVAMP_SHELL_NAVIGATION_QA_2026-06-15_22-30-00_IST.md` |
| M7b - Web library/search/topics/collections | Complete locally; not released | Complete locally; not released | `UX_v2/execution/WEB_EXPERIENCE_REVAMP_LIBRARY_SEARCH_TOPICS_COLLECTIONS_QA_2026-06-15_23-02-46_IST.md` |
| M7c - Web item detail/Ask/Needs Upgrade | Ready for feature cycle | Complete locally; not released | `UX_v2/execution/WEB_EXPERIENCE_REVAMP_ITEM_ASK_NEEDS_UPGRADE_QA_2026-06-15_23-27-55_IST.md` |
| M6 - Android revamp implementation | Not started | Not started in this checkpoint | Android revised PRD/plan exist; no Android feature execution yet in this checkpoint |
| M7 - Remaining web revamp implementation | Capture/settings/pairing/export/provider health pending | Capture/settings/pairing/export/provider health pending | Next feature cycle required |
| M8 - Integrated QA/code review | Pending | Pending | Needs remaining web slice, Android pickup where claimed, accessibility, review, and release packet |
| M9 - Release/deploy | Pending | Pending | No production deployment has been performed for UX v2 work in this checkpoint |
| M10 - Closure/handover | Pending | Pending | Goal remains active |

## Feature Cycle Ledger

| Feature | PRD cycle | Plan cycle | Execution | QA | Release status |
| --- | --- | --- | --- | --- | --- |
| Contrast and token safety | Complete through PRD v2 | Complete through plan v2 | Complete locally | Static/code QA pass; local browser visual QA pass; Android pickup pending | Not released/deployed |
| Web shell/navigation and route frame | Complete through PRD v2 | Complete through plan v2 | Complete locally | Helper tests, static checks, build, browser shell QA pass; manual keyboard release pass still pending | Not released/deployed |
| Web library/search/topics/collections | Complete through PRD v2 | Complete through plan v2 | Complete locally | Static gates, full tests/build, browser viewport/evidence pass, final console pass | Not released/deployed |
| Web item detail/Ask/Needs Upgrade | Complete through PRD v2 | Complete through plan v2 | Complete locally | Static gates, full tests/build, browser viewport/evidence pass, repair pass, final console pass | Not released/deployed |
| Web capture/settings/pairing/export/provider health | Not started | Not started | Not started | Not started | Pending |
| Android shell/navigation and mobile route parity | Not started | Revised umbrella docs exist only | Not started | Not started | Pending |
| Android native entry/share/offline/pairing evidence | Not started | Revised umbrella docs exist only | Not started | Not started | Pending |

## Newly Completed Feature Evidence

| Evidence | Status |
| --- | --- |
| `UX_v2/features/FEATURE_WEB_ITEM_ASK_NEEDS_UPGRADE_PRD_V1_2026-06-15_23-06-13_IST.md` | Created |
| `UX_v2/features/FEATURE_WEB_ITEM_ASK_NEEDS_UPGRADE_PRD_ADVERSARIAL_REVIEW_2026-06-15_23-08-00_IST.md` | Created; original PRD was no-go |
| `UX_v2/features/FEATURE_WEB_ITEM_ASK_NEEDS_UPGRADE_PRD_V2_2026-06-15_23-09-30_IST.md` | Created; accepted product source |
| `UX_v2/features/FEATURE_WEB_ITEM_ASK_NEEDS_UPGRADE_IMPLEMENTATION_PLAN_V1_2026-06-15_23-11-00_IST.md` | Created |
| `UX_v2/features/FEATURE_WEB_ITEM_ASK_NEEDS_UPGRADE_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-15_23-12-30_IST.md` | Created; original plan was no-go |
| `UX_v2/features/FEATURE_WEB_ITEM_ASK_NEEDS_UPGRADE_IMPLEMENTATION_PLAN_V2_2026-06-15_23-14-00_IST.md` | Created; approved for local execution |
| `UX_v2/execution/WEB_EXPERIENCE_REVAMP_ITEM_ASK_NEEDS_UPGRADE_QA_2026-06-15_23-27-55_IST.md` | Created; records implementation, static checks, browser QA, visual evidence, console recheck, and release caveats |

## Item Detail / Ask / Needs Upgrade Validation Summary

| Gate | Result |
| --- | --- |
| Deterministic fixture seed | Pass |
| Delete control removal | Pass; item detail and Needs Upgrade expose no visible/focusable destructive Delete action |
| Needs Upgrade grouping | Pass; grouped by Needs transcript, Preview only, and Needs pasted post text before repair |
| Repair flow | Pass; short-text guard shown, source-text repair succeeds, item leaves Needs Upgrade, remaining weak groups stay visible |
| Ask request-body helper | Pass; item, item-set, dedupe, priority, and library fallback tests covered |
| Ask provider-down state | Pass; product-facing unavailable copy shown on desktop and mobile |
| Ask scope and recovery states | Pass; all-sources, selected, tag, topic, collection, and missing-scope states verified |
| `git diff --check` | Pass |
| Focused tests | Pass, 6 tests |
| `npm run typecheck` | Pass |
| `npm run lint` | Pass with existing unrelated warning in `src/lib/queue/enrichment-batch-cron.ts` |
| `npm test` | Pass, 514 tests across 68 suites |
| `npm run build` | Pass with existing `unpdf` warning |
| Browser viewport and route QA | Pass; evidence saved under `UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/screenshots/item-ask-needs-upgrade/` |
| Final browser console recheck | Pass; 10 routes, 0 fresh console warnings/errors |

## Open Gates Before Any Production Claim

| Gate | Status | Notes |
| --- | --- | --- |
| Live Ask citation evidence | Pending | Local provider-down QA passed; live citation quality requires an available AI provider and release-grade seeded data |
| Manual keyboard release pass | Pending | Required before release; current browser checks cover DOM/focusability and visual evidence, not a full manual keyboard sweep |
| Remaining web feature cycles | Pending | Capture/settings/pairing/export/provider health still requires full PRD/review/plan/review/execution/QA cycle |
| Android implementation | Pending | Android revised umbrella docs exist, but no Android execution has been completed in this checkpoint |
| Full integrated route QA | Pending | Required after remaining web and Android slices are complete |
| Accessibility release sweep | Pending | Needs keyboard, focus, labels, touch targets, reduced-motion, and contrast checks across all changed surfaces |
| Code review/release packet | Pending | Required before production deploy |
| Backup/rollback | Pending | Required before production deploy |
| Production deploy/live smoke | Not started | No deployment has been run for this revamp update |

## Next Recommended Slice

Start the feature cycle for web capture, settings, pairing, export, and provider health. This should cover capture entry points, local trust/provider messaging, device pairing route safety, export states, and offline/provider-health release boundaries.
