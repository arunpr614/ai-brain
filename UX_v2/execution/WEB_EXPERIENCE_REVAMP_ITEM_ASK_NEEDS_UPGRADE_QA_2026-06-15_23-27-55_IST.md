# Web Experience Revamp Item Detail / Ask / Needs Upgrade QA

**Created:** 2026-06-15 23:27:55 IST
**Project folder:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`
**Branch:** `codex/ai-brain-ux-v2-execution`
**Status:** Complete locally; not released or deployed.

## Feature Cycle Evidence

| Artifact | Status |
| --- | --- |
| `UX_v2/features/FEATURE_WEB_ITEM_ASK_NEEDS_UPGRADE_PRD_V1_2026-06-15_23-06-13_IST.md` | Created |
| `UX_v2/features/FEATURE_WEB_ITEM_ASK_NEEDS_UPGRADE_PRD_ADVERSARIAL_REVIEW_2026-06-15_23-08-00_IST.md` | Created; original PRD was no-go until delete removal, deterministic repair postconditions, Ask scope evidence, and live-citation boundaries were explicit |
| `UX_v2/features/FEATURE_WEB_ITEM_ASK_NEEDS_UPGRADE_PRD_V2_2026-06-15_23-09-30_IST.md` | Created; accepted product source for this slice |
| `UX_v2/features/FEATURE_WEB_ITEM_ASK_NEEDS_UPGRADE_IMPLEMENTATION_PLAN_V1_2026-06-15_23-11-00_IST.md` | Created |
| `UX_v2/features/FEATURE_WEB_ITEM_ASK_NEEDS_UPGRADE_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-15_23-12-30_IST.md` | Created; original plan was no-go until retrieval/citation claims, browser QA order, delete scans, and provider-down copy were tightened |
| `UX_v2/features/FEATURE_WEB_ITEM_ASK_NEEDS_UPGRADE_IMPLEMENTATION_PLAN_V2_2026-06-15_23-14-00_IST.md` | Created; approved for local execution |

## Implementation Summary

| Area | Result |
| --- | --- |
| Item detail destructive action | Removed the footer Delete form/action from item detail; safe footer actions remain Focus mode, Ask this item, and Export as `.md` |
| Needs Upgrade grouping | Grouped weak sources by reason: Needs transcript, Preview only, Needs pasted post text, with per-group counts and repair/source actions |
| Repair flow | Verified short-text guard, successful source-text repair, success banner, full-text state, manual repair method, and removal from Needs Upgrade |
| Ask request body | Added `buildAskRequestBody()` helper with tests for item, selected-items, dedupe, item-set priority, and library fallback semantics |
| Ask provider-down copy | Replaced technical provider failure copy with product-facing "AI services unavailable" guidance |
| Deterministic fixtures | Added `scripts/ux-v2-seed-item-ask-needs-upgrade.ts` for full-text, weak YouTube, preview-only Substack, repair-target LinkedIn, tag, topic, collection, and Ask scope routes |

## Static Validation

| Gate | Result |
| --- | --- |
| Delete source scan | Pass; no `Trash2`, `deleteItemAction`, `>Delete<`, or `aria-label="Delete"` remained in `src/app/items/[id]/page.tsx` or `src/app/needs-upgrade/page.tsx` |
| Focused tests: Ask request helper and item repair | Pass, 6 tests |
| Deterministic seed smoke | Pass with `/tmp/ai-memory-item-ask-needs-qa.sqlite` |
| `git diff --check` | Pass |
| `npm run typecheck` | Pass |
| `npm run lint` | Pass with existing unrelated warning in `src/lib/queue/enrichment-batch-cron.ts` |
| `npm test` | Pass, 514 tests across 68 suites |
| `npm run build` | Pass with existing `unpdf` import.meta warning |

## Browser QA Evidence

Evidence directory:

`UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/screenshots/item-ask-needs-upgrade/`

| Browser gate | Result | Evidence |
| --- | --- | --- |
| Item detail responsive states | Pass | `full-item-390-light.png`, `full-item-1280-light.png`, `full-item-1440-dark.png` |
| Weak item and focus mode | Pass | `weak-item-390-light.png`, `weak-item-1280-light.png`, `weak-focus-390-light.png`, `weak-focus-1280-light.png` |
| Delete removal | Pass | Browser report shows no visible/focusable Delete control on item detail, weak item, focus mode, or Needs Upgrade |
| Needs Upgrade grouped reasons | Pass | Before repair headings: Needs transcript, Preview only, Needs pasted post text |
| Repair short-text guard | Pass | `repair-short-text-validation-1280-light.png`; visible 200-character instruction remained present |
| Repair success | Pass | `repair-success-item-detail-1280-light.png`; Source text updated banner, repaired body, full-text quality, and `manual_repair_text` method shown |
| Needs Upgrade post-repair removal | Pass | `needs-upgrade-after-repair-1280-light.png`; repaired LinkedIn item removed, remaining weak groups preserved |
| Ask item provider-down | Pass | `ask-item-provider-down-1280-light.png`, `ask-item-provider-down-390-light.png`; "AI services unavailable" copy shown |
| Ask scope banners | Pass | `ask-library-scope-1280-light.png`, `ask-selected-scope-1280-light.png`, `ask-tag-scope-1280-light.png`, `ask-topic-scope-1280-light.png`, `ask-collection-scope-1280-light.png` |
| Missing scope recovery | Pass | `ask-missing-topic-recovery-1280-light.png`; missing selected/topic/collection routes show Back to Library and no composer/send controls |
| Final route and console recheck | Pass | `item-ask-needs-upgrade-console-final-recheck.json`; 10 routes, 0 fresh console warnings/errors |

Primary browser report:

`UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/screenshots/item-ask-needs-upgrade/item-ask-needs-upgrade-browser-report.json`

## Notes

- Live citation quality was not claimed in this local slice. The browser pass intentionally used an unavailable local AI provider to prove product-facing provider-down behavior. Live answer/citation evidence remains a later release gate when an AI provider is available.
- The Ask request-body scoping contract is covered by `src/app/ask/ask-request.test.ts`; browser QA verifies the user-visible scope banners and missing-scope recovery states.
- The repaired item displays "Full text" in the UI and `manual_repair_text` in the capture method metadata. It no longer appears in Needs Upgrade after repair.
- No production deployment was performed for this slice. Release remains pending until the remaining web and Android UX v2 milestones pass feature cycles, integrated QA, code review, backup/rollback, and live smoke gates.
