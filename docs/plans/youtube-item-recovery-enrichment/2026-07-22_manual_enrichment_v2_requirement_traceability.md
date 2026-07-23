# Held Browser Transcript Manual Enrichment: V2 Requirement Traceability

**Date:** 2026-07-22
**Status:** Final planning control
**Requirement source:** `2026-07-22_ai_brain_item_recovery_manual_enrichment_prd_v2_final.md`
**Implementation source:** `2026-07-22_ai_brain_item_recovery_manual_enrichment_implementation_plan_v2_final.md`

## Use

This ledger is the merge and enablement checklist for every P0 `ME-F` requirement. An implementation PR must replace each planned evidence target with a stable test, CI job, migration report, or reviewed browser artifact. A row cannot be waived by a feature flag: the cited no-go gate keeps execution disabled until its evidence passes.

## Traceability Matrix

| Requirement | Implementation section | Deterministic test and evidence target | Accountable role | No-go gate |
| --- | --- | --- | --- | --- |
| `ME-F01` | §6.3 processing holds; §10 transcript commit | Transaction rollback and claimant-negative tests prove attachment creates source, revision, hold, held generation, and receipt without dispatch | DB + Capture | 3 |
| `ME-F02` | §15 UI implementation | Extension/item browser tests assert held copy and zero enabled processing before the third action | Web + Extension | 24 |
| `ME-F03` | §7 plan service; §8.2 status GET | Eligibility table tests cover missing, multiple, stale, non-browser, released-hold, and exact-held sources | Backend | 2, 25 |
| `ME-F04` | §7 provider plan; §15 components | Provider-plan contract and browser tests show digest and embedding provider/model/boundary rows from one snapshot | Backend + Web | 8 |
| `ME-F05` | §15 interaction | Browser E2E proves inline non-collapsible local approval and dialog/sheet remote approval, with one mounted command | Web + Design QA | 24 |
| `ME-F06` | §7.1-§7.2 identities; §15 disclosure | Provider-request fixtures and browser assertions match first-12k digest input, full transcript/digest index input, outputs, clocks, and exclusions | Product + Web | 8, 32 |
| `ME-F07` | §7.2 context; §8.3 command; §9 authorization | One-field-at-a-time canonical-context drift table rejects every material change before dispatch | Backend + Security | 8, 9 |
| `ME-F08` | §9.2 transaction algorithm | Inject failure after each write; receipt, hold, job, and compatibility projection all commit once or roll back together | DB + Backend | 6 |
| `ME-F09` | §9.1 fingerprint; §9.3 competing requests | Same-ID replay, changed-payload mismatch, two-ID race, and post-commit lost-response tests converge on one effective job | Backend | 6, 19 |
| `ME-F10` | §8.3 run-creation POST | Route test asserts durable receipt before `202`, no provider call in request, and bounded response latency | Backend | 6 |
| `ME-F11` | §8.3 legacy containment | Bodyless, queue-reset, and `force=realtime` calls against an active hold return typed no-effect and zero queue/provider calls | Backend | 4 |
| `ME-F12` | §12 batch hardening | Batch selection/submit/poll fixtures prove interactive generations are never selected or mutated | Processing | 7 |
| `ME-F13` | §11.2-§11.3 worker gates; §13.1 embedding worker | Pause-before-dispatch matrix changes source, revision, context, expiry, plan, generation, token, hold, deletion, flag, and item | Processing | 9 |
| `ME-F14` | §11.4 and §13.2 apply transactions | Pause-before-apply matrix proves every stale or deleted outcome makes zero current derived writes | Processing + DB | 9, 11 |
| `ME-F15` | §11.4 apply; §15 item UI | Before/after snapshots prove title, transcript, provenance, notes, workflow, collections, and manual tags are unchanged | Processing + Web | 12 |
| `ME-F16` | §11 attempts; §12 batch aliases; §16 privacy | Provider spy and log scan prove random aliases and no stable item/source/video/account/mutation identifier | Processing + Security | 10, 14 |
| `ME-F17` | §8.2 read model; §14 projection | Projection fixtures cover authorization, stage, dispatch, retry, drift, expiry, deletion, retrieval compatibility, and allowed action | Backend + Web | 20 |
| `ME-F18` | §13.4 partial success/retry | Forced embedding failure preserves digest; index-only retry records one embedding call and zero digest calls | Processing | 13 |
| `ME-F19` | §8.1 HTTP helper; §16 security/privacy | Typed-error snapshots and forbidden-field scan cover HTTP, logs, screenshots, and reports | Security + Backend | 14 |
| `ME-F20` | §15 placement and interaction | Desktop, tablet, and mobile browser tests reopen the item and complete/retry from Brain without Chrome | Web | 24 |
| `ME-F21` | §15 UI; §20 UI/accessibility tests | Keyboard, focus trap/return, screen-reader names, 200% zoom, 320 px, contrast, and reduced-motion report | Accessibility QA | 24 |
| `ME-F22` | §18 flags/modes; §22 deployment | Exhaustive deployment/mode/flag/manifest matrix proves production denial wins | Platform + Security | 18 |
| `ME-F23` | §17 deletion | Delete at authorization, claim, both dispatches, response, and apply; late results cannot recreate rows or outputs | DB + Processing | 15 |
| `ME-F24` | §16 analytics/privacy | Allowlist schema rejects content and identifiers; exported analytics and logs pass canary scans | Security + Data | 14 |
| `ME-F25` | §7.2 expiry; §11/§13 gates; §18 kill switches | Clock-controlled and switch-flip tests at authorization, claim, each dispatch, and each apply | Backend + Processing | 9, 16 |
| `ME-F26` | §8.3 reconciliation; §9.3 races; §14 projection | Response-loss injection before/after commit, serialization, claim, reload, and offline recovery proves one receipt and truthful unknown state | Backend + Web | 19 |
| `ME-F27` | §6.4a snapshots/runs; §6.6 attempts; §13.1 embedding lineage | FK/integrity queries prove every job and attempt joins one immutable accepted input/context snapshot and receipt | DB | 22 |
| `ME-F28` | §6.2 generation allocation | Migration seed and ABA regression prove strictly increasing identity across replacement and rollback | DB | 21 |
| `ME-F29` | §6.6 dispatch facts; §14 status; §15 UI | Before-dispatch, after-digest, between-stage, and after-index fixtures assert distinct copy/actions | Backend + Web | 20 |
| `ME-F30` | §15 placement/navigation | DOM and browser tests assert one mounted command, unique IDs, and Original/Digest/Ask/Related/Details/Notes query behavior | Web | 24 |
| `ME-F31` | §7.1 input; §7.2 context; §8.3 POST; §9.2 lock | Title/author/duration/source/body drift tests prove both fingerprints exist before review and are only compared by claims | Backend | 27 |
| `ME-F32` | §7.3 processing manifest/decision | Schema, owner, symlink, data-root, exact-target, expiry, and capture-manifest-only denial tests | Security + Backend | 25 |
| `ME-F33` | §18.1 worker-mode state machine | Startup with every queue class proves `manual-transcript-lab` starts and claims only accepted interactive digest/index work | Platform + Processing | 26 |
| `ME-F34` | §13.5 embedding space/current source | Mixed-space and stale-revision matrix covers Search, library/scoped Ask, Related, citations, and readiness | Retrieval | 28 |
| `ME-F35` | §8.3 operations; §11.5 retry; §13.4 index retry | Generation-bound reauthorize/digest/index command tests plus provider spy proving index retry makes zero LLM calls | Backend + Processing | 33 |
| `ME-F36` | §10 replacement; §11/§13 fencing | Replace transcript or model-input metadata during every barrier; old claims never apply or inherit new policy | DB + Processing | 9, 21 |
| `ME-F37` | §11.3 compute/output contract | Prompt/parser/provider-fixture tests enforce three paragraphs, 1-5 source excerpts, category, and 3-8 topics; UI fixture matches | AI Platform + Web | 32 |
| `ME-F38` | §6 schema evolution; §21 PR sequence; §23 rollback | Old/transition/new binary against old/expanded/contracted schema matrix plus restore rehearsal | DB + Release Engineering | 29 |

## CI Policy

Before any live flag or worker mode can be enabled:

1. Every row must link to passing evidence from the implementation PR series.
2. Each evidence artifact must record source SHA, schema version, and test command or browser matrix.
3. A failed or missing row blocks the corresponding no-go gate; aggregate pass percentage cannot override it.
4. Production remains a separate decision even when all rows pass in fixture or isolated-lab environments.
