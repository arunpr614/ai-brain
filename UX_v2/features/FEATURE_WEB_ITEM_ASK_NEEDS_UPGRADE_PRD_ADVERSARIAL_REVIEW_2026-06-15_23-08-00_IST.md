# Adversarial Review: Web Item Detail, Ask, and Needs Upgrade PRD v1

**Created:** 2026-06-15 23:08:00 IST
**Reviewed artifact:** `FEATURE_WEB_ITEM_ASK_NEEDS_UPGRADE_PRD_V1_2026-06-15_23-06-13_IST.md`
**Review mode:** Adversarial product and QA review
**Verdict:** No-go until revised

## Executive Summary

The PRD identifies the right surfaces and catches the dangerous Item Detail delete gap, but it is not yet execution-safe. It asks for Ask citations and all scopes without defining how local QA will prove a successful answer when the configured provider is intentionally down. It also treats Needs Upgrade grouping as optional, leaves destructive-delete source removal too broad, and does not define exact browser postconditions for repair. A v2 must lock deterministic request-body evidence, repair postconditions, no-delete verification, and local provider-down versus live-provider claims.

## Findings

| Severity | Finding | Why it matters | Required revision |
| --- | --- | --- | --- |
| P0 | Ask answer-with-citations acceptance is underspecified for local QA | The current local QA server points Ask at an unreachable provider. The PRD cannot require citation-answer evidence without defining either a live provider, a stubbed provider, or a release-only gate. | Split Ask QA into local provider-down interaction, request-body scope proof, API/unit citation mapping where possible, and live-provider citation evidence as an integrated/release gate. |
| P0 | Delete removal is stated for Item Detail but not tied to source and browser checks | Removing the button visually is insufficient if the server action or keyboard-reachable affordance remains. | Require source scan for `deleteItemAction`, `Trash2`, and visible/focusable Delete on Item Detail and Needs Upgrade. |
| P0 | Repair success postconditions are too broad but not test-routed | The PRD lists backend reset behavior, but no deterministic before/after browser or DB proof is required. | Require a repair fixture, short-text failure, success redirect, DB postcondition test, Needs Upgrade count/list removal, and item detail success banner. |
| P1 | Needs Upgrade grouping is optional | The source PRD asks for grouped weak-source queue. Making grouping optional risks shipping a flat list again. | Require grouping by reason when more than one weak reason exists, while preserving empty/populated single-group states. |
| P1 | Ask scope body verification is not specific enough | The app currently converts tag/topic/collection to item ids. Without explicit route examples, tests may cover only selected/item. | Require route-specific proof for selected, tag, topic, and collection item-set scopes, including missing-scope recovery. |
| P1 | Mobile matrix is too wide for a single slice without priority | The PRD names many routes across five widths; it risks producing screenshot volume without interaction proof. | Define required mobile/desktop minimums and reserve the full matrix for key states. |

## Go/No-Go Decision

No-go for implementation. Revise the PRD so it can be executed and verified locally without pretending a live LLM answer was tested. The v2 must preserve the no-delete requirement and make repair and Ask scope evidence deterministic.
