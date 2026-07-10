# AI Memory UX v2 Missing Feature To-Do

> Current-status note: this is the original missing-feature to-do. For authoritative current status, decision gates, and implementation order, use `07_FEATURE_CLASSIFICATION_AND_GAP_ANALYSIS.md`, `trackers/master_feature_inventory.md`, `trackers/prd_tracker.md`, `trackers/implementation_plan_tracker.md`, and `trackers/baseline_status_reconciliation.md`.

Created: 2026-06-14
Status: Live backlog. Append new gaps as they are discovered.

## Evidence Inputs

- UX package: `../UX_UI_DESIGN_PACKAGE`
- Handover: `../Handover_docs/AI_BRAIN_HANDOVER_2026-06-11_22-36-37_IST.md`
- Requirements backlog: `02_REQUIREMENTS_PRD_BACKLOG.md`
- Progress tracker: `03_IMPLEMENTATION_PROGRESS.md`

## Status Legend

- `Missing`: no working implementation found.
- `Partial`: some implementation exists, but design requirements remain.
- `Implemented pending verification`: code exists, but evidence is incomplete.
- `Verified`: implementation and evidence are recorded.

## Active Missing/Partial Features

| ID | Feature | Status | Evidence | Next Required Artifact |
| --- | --- | --- | --- | --- |
| PRD-06-FU | Capture duplicate, updated-existing, error-with-save result states | Partial | Result banners exist for URL/PDF/note saves, but duplicate/updated/error-with-save states are still listed as follow-up in `03_IMPLEMENTATION_PROGRESS.md`. | PRD v1 |
| PRD-09-FU | Attached context override and high-quality-only Ask scope | Partial | Ask scope banners/history exist; attached override, high-quality-only scope, and durable tag/topic/collection history are still listed as follow-up. | PRD v1 |
| PRD-10 | Web repair workflow for weak captures | Missing | `02_REQUIREMENTS_PRD_BACKLOG.md` defines add transcript/text, retry, mark good enough, merge duplicate, and derived-state reset; progress tracker has no completed PRD-10 slice. | PRD v1 |
| PRD-11-FU | Android long-press/select-mode polish | Partial | Mobile selection control exists, but long-press select mode is still an acceptance gap. | PRD v1 or implementation plan if scoped small |
| PRD-12 | Android unified Ask composer and add-context sheets | Missing | Design package requires plus/add context, attach saved item, paste link, write note, keyboard-safe composer, and history sheet. Current mobile Ask only has compact History disclosure. | PRD v1 |
| PRD-13 | Android share capture landing and result states | Missing | Handover confirms Android share/capture exists historically, but UX v2 share result states are not implemented in progress tracker. | PRD v1 |
| PRD-14 | Settings/privacy/offline trust states | Partial | Settings exists and `/more` is being introduced, but capture settings, offline/server state, and richer data/privacy disabled controls need design-complete treatment. | PRD v1 |
| PRD-15 | Login/unlock/pairing/session/offline entry states | Partial | AI Memory brand updates exist; session expired, pairing success/failure, and Android offline fallback evidence remains incomplete. | PRD v1 |
| PRD-16 | QA evidence and release gates | Missing | No completed acceptance checklist copy with screenshots, brand/privacy search, production web build, or Android APK evidence. | PRD v1 |
| OPS-01 | Transcript operator visibility page | Missing | Handover recommends `/ops/transcripts` or `/admin/transcripts`; not part of current UX_v2 implementation progress. | Separate PRD v1 |
| OPS-02 | Transcript provider fallback strategy | Missing | Handover states YouTube timed-text is blocked by anti-bot and backfill alone will not fix transcripts. | Research PRD v1 |

## Implemented Pending Verification

| ID | Feature | Current State | Remaining Verification |
| --- | --- | --- | --- |
| PRD-11-SHELL | Four-item mobile nav, route-aware Capture, and `/more` surface | Code added in `src/components/sidebar.tsx` and `src/app/more/page.tsx`. | Browser smoke for mobile Library/Ask/Capture/More and desktop `/more`; update progress tracker after verification. |

## Completed Slices Already Recorded

These slices are recorded in `03_IMPLEMENTATION_PROGRESS.md` and should not be redone unless a new gap is discovered:

- PRD-01 / PRD-02: Brand and design foundation.
- PRD-03: Web shell and navigation, excluding the new PRD-11 mobile shell follow-up.
- PRD-04: Library filters and Ask selected.
- PRD-05: Needs Upgrade queue.
- PRD-06: Basic capture result banners.
- PRD-07: Item detail focus mode.
- PRD-08: Included Topics, topic pages, collection Ask.
- PRD-09: Ask scope clarity, weak warnings, citation metadata, library/item durable history.
- PRD-11: Mobile Library compact filters and bottom sheet.

## Discovery Notes

- The handover document is production-operations oriented and references v0.8.5 YouTube recovery/backfill. UX_v2 is a broader redesign layer on top of that product history.
- The current worktree is intentionally dirty with many UX_v2 changes and generated assets. Do not treat dirty state alone as evidence of a completed feature.
- A feature is complete only when the relevant web and Android/mobile acceptance criteria have direct evidence.
