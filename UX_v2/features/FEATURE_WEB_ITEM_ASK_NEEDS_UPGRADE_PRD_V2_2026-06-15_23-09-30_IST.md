# Feature PRD v2: Web Item Detail, Ask, and Needs Upgrade

**Created:** 2026-06-15 23:09:30 IST
**Project folder:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`
**Feature owner:** Main Codex execution agent
**Status:** Revised after adversarial review; approved for implementation planning

## Product Problem

The web revamp needs its reading, repair, and Ask surfaces to match the stronger shell and library experience. A user must be able to read saved sources, understand weak capture quality, repair weak saves, and ask scoped questions without unsafe destructive controls or misleading Ask scope behavior.

## Non-Negotiable Outcomes

1. Item Detail and Needs Upgrade expose no destructive delete control in this slice.
2. Needs Upgrade is a real repair queue with reason-based grouping when multiple weak reasons exist.
3. Repair has deterministic short-text failure, success redirect, item-quality update, stale derived-state reset, enrichment requeue, and Needs Upgrade removal evidence.
4. Ask scope UI and request body agree for library, item, selected, tag, topic, and collection.
5. Local Ask QA honestly proves provider-down behavior and request-body scoping. Live answer-with-citations evidence remains a later integrated/release gate unless a deterministic stub provider is added.

## Goals

| Goal | Acceptance |
| --- | --- |
| Trustworthy Item Detail | Full and weak item pages show real metadata, quality, repair state, tags, topics, collections, digest/placeholder, related items when real, focus mode, Ask item, and export. |
| Safe actions | No Item Detail or Needs Upgrade Delete button, delete icon, delete form, or keyboard-reachable delete action remains. |
| Repairable weak captures | Weak item detail, focus mode, Needs Upgrade, and repair form lead to the same real repair route. |
| Scoped Ask | Selected/tag/topic/collection routes pass route-derived item ids as `{ scope: "items", item_ids }`; item route passes `{ scope: "item", item_id }`; missing scopes do not silently fall back. |
| Honest local QA | Provider-down Ask is treated as a valid local state; live answer/citation evidence is not claimed unless actually run. |

## Non-Goals

- No production deployment in this slice.
- No unsupported high-quality-only toggle, attachments, or persisted topic/tag/collection Ask history.
- No destructive delete, mark-good-enough, merge, retry, or fake mutation controls.
- No fake related items, fake digest, fake citations, or fake repair result.
- No embedded YouTube player.

## Functional Requirements

### Item Detail

- Remove the Item Detail delete form, Delete button, `Trash2` import, and `deleteItemAction` use from the item detail page.
- Keep full-text reading layout stable at desktop and mobile widths.
- Show trust/quality metadata using stored item fields: platform, capture source, quality, saved time, source link where present, author/pages/chars where present.
- Show weak repair panel only when `needsUpgradeReason` or limited capture quality applies.
- Focus mode must preserve Ask, Source, and weak repair affordances without overlap.
- Tags, collections, included topics, digest, and related items must remain real-data only.

### Needs Upgrade

- Group weak items by repair reason when more than one reason exists; single-reason queues may render as one group.
- Each row must show title, reason, platform, quality, age, hint/description, detail link, Add text, and Source when available.
- Empty state must say no captures need attention and explain what future captures would appear.
- Delete, mark-good-enough, merge, retry, and fake repair controls are excluded.

### Repair

- Short text below `MIN_REPAIR_TEXT_CHARS` shows an inline error and does not mutate the item.
- Successful repair:
  - updates title/body
  - sets `capture_quality` to `user_provided_full_text`
  - clears `extraction_warning`
  - clears summary, quotes, category, enriched timestamp, batch id
  - deletes stale chunks, vector rows, auto tags, item topics, and embedding jobs
  - creates or resets enrichment job to pending
  - redirects to `/items/[id]?repair=queued`
  - removes the item from `/needs-upgrade`
- Browser QA must include short-text failure and success redirect. Unit tests must cover DB postconditions.

### Ask

- Scope banner must show scope kind, label, source count, source chips, and limited-source warning where applicable.
- Item Ask sends `{ scope: "item", item_id }`.
- Selected, tag, topic, and collection Ask send `{ scope: "items", item_ids }` based on the route-derived items.
- Missing selected/tag/topic/collection scopes show a recovery state with Back to Library and do not invoke `/api/ask`.
- Local provider-down Ask submission shows product-facing copy. It must not expose internal command instructions.
- Citation-answer proof is required before production release, but not claimed in this local provider-down slice unless a deterministic stub provider is implemented.

## Deterministic Fixture Requirements

Create or extend a UX v2 seed script for this slice with a manifest containing:

| Fixture | Purpose |
| --- | --- |
| full text item | Item Detail, focus mode, Ask item scope |
| weak metadata-only item | Needs Upgrade, weak detail, focus repair panel |
| second weak item with different reason if supported | Needs Upgrade grouping |
| manual tag and generated topic | Ask tag/topic route scope |
| collection | Ask collection route scope |
| repair target | Short-text failure and success repair |
| provider-down Ask environment | Local Ask product error state |

The seed must print item ids and routes for browser automation.

## Required Tests and Evidence

| Area | Required evidence |
| --- | --- |
| Source delete removal | Source scan for `Trash2`, `deleteItemAction`, and visible `Delete` in Item Detail/Needs Upgrade files plus browser focusable-action check |
| Repair | Existing repair tests remain passing; add any missing test for queue/list removal if not already explicit |
| Ask scope request bodies | Deterministic client or browser-level evidence for item, selected, tag, topic, and collection request bodies |
| Static gates | `git diff --check`, focused tests, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` |
| Browser states | Full item, weak item, focus mode, Needs Upgrade populated/grouped, Needs Upgrade empty or post-repair removal, repair short-text error, repair success banner, Ask item provider-down, selected/topic/collection scope banners |
| Viewports | 390 and 1280 required for each primary route; 768/1024/1440 for item detail and Needs Upgrade key states |
| Console | Final route sweep with 0 fresh warnings/errors |

## Release Boundary

This feature can be marked complete locally after implementation, tests, browser QA, QA report, and tracker update. It must remain "not released/deployed" until all UX v2 web and Android slices pass integrated QA, review, backup/rollback, and live smoke. Live Ask answer/citation evidence is a release gate unless a deterministic local provider stub is added and validated.
