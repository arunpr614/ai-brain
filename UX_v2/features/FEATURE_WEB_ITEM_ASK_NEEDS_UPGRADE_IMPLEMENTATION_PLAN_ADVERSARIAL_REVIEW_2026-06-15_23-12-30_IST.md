# Adversarial Review: Web Item Detail, Ask, and Needs Upgrade Implementation Plan v1

**Created:** 2026-06-15 23:12:30 IST
**Reviewed artifact:** `FEATURE_WEB_ITEM_ASK_NEEDS_UPGRADE_IMPLEMENTATION_PLAN_V1_2026-06-15_23-11-00_IST.md`
**Review mode:** Adversarial implementation and release-readiness review
**Verdict:** No-go until revised

## Executive Summary

The plan is correctly scoped and avoids most product overreach, but it still has three execution hazards. First, it says to create chunks in the seed without defining whether embeddings/vector rows are needed, which could make Ask/retrieval evidence flaky. Second, the Ask helper test plan proves request construction but not route wiring from selected/tag/topic/collection pages into that helper. Third, browser repair success can mutate the seeded weak queue and invalidate later screenshots unless the order and manifest expectations are locked.

## Findings

| Severity | Finding | Why it matters | Required revision |
| --- | --- | --- | --- |
| P0 | Fixture script may create incomplete retrieval fixtures | Chunks without matching vector rows may not exercise retrieval and could mislead citation claims. | State that local Ask QA is provider-down and scope-banner/request-body only; do not claim retrieval/citation unless vector fixtures or live provider are explicitly created. |
| P0 | Route wiring evidence for Ask scopes is missing | A helper test can pass while `/ask?scope=topic` still passes the wrong props. | Add a server-side route helper or focused page-level test if feasible; otherwise browser QA must verify scope banner labels and unit tests must cover `AskPage` data mapping indirectly through manifest route states. |
| P1 | Browser repair order can invalidate Needs Upgrade populated evidence | Repairing the only weak item before screenshots would make the queue look empty and hide grouping. | Capture populated/grouped screenshots before repair; use a separate repair target or ensure one weak item remains after repair. |
| P1 | Delete source scan list is incomplete | Item Detail may still import `deleteItemAction` or render action text through a form even without `Trash2`. | Require scans for `deleteItemAction`, `Trash2`, `>Delete<`, `aria-label=\"Delete\"`, and role/focusable browser checks. |
| P2 | Provider-down copy is vague | It says improve copy "if needed", which can lead to no product-facing change. | Make product-facing Ask offline copy an explicit implementation item and test assertion. |

## Go/No-Go Decision

No-go. Revise the plan to avoid overclaiming retrieval/citation, lock browser QA order, strengthen delete verification, and make Ask provider-down copy explicit.
