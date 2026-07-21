# Benchmark Method × Item Matrix

> **STATUS: FINAL PROSPECTIVE LOCK INPUT — DENOMINATORS ARE UNSEALED; PRIMARY RUNS PROHIBITED**

**Matrix version:** 1.1<br>
**Reconciled:** 2026-07-18<br>
**Machine authority:** `METHOD_ITEM_MATRIX.json`, validated by `METHOD_ITEM_MATRIX.schema.json` and the lock verifier; this Markdown is its human-readable mirror

`METHOD_ITEM_MATRIX.json` is the sole authority for method/item and pre-run Gate states. This Markdown mirrors it for review. Other sealed artifacts govern only their own fields; any disagreement stops the run and requires a new prospective seal. Each cell must be one of:

- `eligible-supported`
- `expected-safe-rejection`
- `excluded-before-run: <reason>`

`UNRESOLVED` was permitted only during draft development. This final prospective input contains none; Commit A remains prohibited if an unresolved/provisional value reappears or independent review has not closed.

This human-readable table must exactly reconcile with the machine matrix, reference ledger, nine attestations, run plan, and `LOCK.json`. A disagreement is a seal failure, not an editorial discrepancy.

## Primary real-video cells

| Item | A1 — authorized sidecar | A2 — official captions API | A3 — source-origin local STT | Locked content class |
|---|---|---|---|---|
| YT-01 | `eligible-supported` | `excluded-before-run: OAuth client lacks callback/consent and no editor-authorized item` | `excluded-before-run: Gate 2 not triggered` | Authorized NASA VTT; short Spanish visual explainer |
| YT-02 | `eligible-supported` | `excluded-before-run: OAuth client lacks callback/consent and no editor-authorized item` | `excluded-before-run: Gate 2 not triggered` | Authorized NASA VTT; visual tutorial/explainer |
| YT-03 | `expected-safe-rejection: strict preflight INVALID_STRUCTURE at empty-text cue 88` | `excluded-before-run: OAuth client lacks callback/consent and no editor-authorized item` | `excluded-before-run: Gate 2 not triggered` | Authorized NASA VTT; multi-speaker/field audio; no repair/drop allowed |
| YT-04 | `expected-safe-rejection: 8,974 cues exceed declared 7,200-cue A1 class` | `excluded-before-run: OAuth client lacks callback/consent and no editor-authorized item` | `excluded-before-run: Gate 2 not triggered` | Authorized NASA VTT; >60-minute boundary |
| YT-05 | `expected-safe-rejection: strict preflight INVALID_STRUCTURE at empty-text cue 723` | `excluded-before-run: OAuth client lacks callback/consent and no editor-authorized item` | `excluded-before-run: Gate 2 not triggered` | Authorized NASA VTT; long multi-speaker broadcast; no repair/drop allowed |
| YT-06 | `expected-safe-rejection: strict preflight INVALID_STRUCTURE at empty-text cue 2` | `excluded-before-run: OAuth client lacks callback/consent and no editor-authorized item` | `excluded-before-run: Gate 2 not triggered` | Authorized NASA VTT; short Spanish animation; no repair/drop allowed |
| YT-07 | `eligible-supported` | `excluded-before-run: OAuth client lacks callback/consent and no editor-authorized item` | `excluded-before-run: Gate 2 not triggered` | Authorized NASA VTT; field audio/high visual dependency |
| YT-08 | `eligible-supported` | `excluded-before-run: OAuth client lacks callback/consent and no editor-authorized item` | `excluded-before-run: Gate 2 not triggered` | Authorized NASA VTT; very short trailer |
| YT-09 | `eligible-supported` | `excluded-before-run: OAuth client lacks callback/consent and no editor-authorized item` | `excluded-before-run: Gate 2 not triggered` | Authorized NASA VTT; short mission explainer |
| YT-10 | `excluded-before-run: exact NOAA source row provides no ingestible sidecar` | `excluded-before-run: OAuth client lacks callback/consent and no editor-authorized item` | `excluded-before-run: Gate 2 not triggered (1/10; 10%)` | Authorized NOAA source media; no official source sidecar |

## YouTube safe-rejection control

| Item | A1 | A2 | A3 | Locked content class |
|---|---|---|---|---|
| No real video | `excluded-before-run: no safe stable rights-verifiable unavailable/private identifier` | `excluded-before-run: no safe stable rights-verifiable unavailable/private identifier` | `excluded-before-run: Gate 2 not triggered` | Synthetic `CTRL-STRUCT-01`/`SAFE-*` controls are separate and never imply a real-video status |

## Denominator ledger

| Measure | Locked denominator | State |
|---|---:|---|
| A1 primary positive cells | 5 | YT-01, YT-02, YT-07, YT-08, YT-09; pending two-commit seal |
| A1 safe-rejection cells | 4 | YT-03/YT-05/YT-06 strict structure; YT-04 cue-limit boundary |
| A2 primary cells | 0 | Blocked / Not run |
| A3 primary positive cells | 0 | Gate 2 not triggered |
| A3 safe-rejection cells | 0 | Gate 2 not triggered |
| A1 current-product-readiness assessments | 5 | Same five positive cells; non-substitutable outcome, prospectively expected to remain 0/5 ready |
| Rights-screened real YouTube publications | 10 | Five A1 positives, four A1 rejection controls, and one A1 exclusion; not a positive denominator |
| Real unavailable/private controls | 0 | Declared corpus limitation; no live probing |
| Synthetic/non-video fixtures | Excluded from every primary denominator | Declared |

## Gate eligibility ledger

| Gate | Pre-run state | Dependency / rationale |
|---|---|---|
| 1 | `eligible` after valid seal | Five A1 positives plus four A1 rejection controls |
| 2 | `not_triggered` | Exactly 1/10 rows satisfies both trigger booleans; below ≥2 and ≥20% |
| 3 | `eligible_conditional` | Runs five exact repeats only after Gate 1 passes |
| 4 | `eligible_conditional` | Runs one frozen local text candidate only after Gates 1 and 3 pass |
| 5 | `not_triggered` | Requires Gate 4 transcript-only visual coverage below 80%; if fired, this seal has no visual method/media and records `Triggered but blocked / Not run` |
| 6 | `eligible` | Mandatory evidence synthesis for every upstream outcome |
| Council | `eligible` | Mandatory three-PM/council decision for every upstream outcome |

## A1 dual outcomes

Every A1 primary cell records two non-substitutable results:

1. `isolated_strategy_result` — rights-attested sidecar ingestion in the egress-observed spike harness; and
2. `current_product_readiness` — must fail if the shipping path lacks attestation, fail-closed parsing/completeness, recovery isolation, or truthful provenance.

A passing isolated strategy cannot overwrite a failing current-product readiness result.

For YT-04, success is harness `status=safe_rejection`, zero service/network/provider activity, and no private DB/output. For YT-03, YT-05, and YT-06, success is the predeclared nonzero CLI result `status=fail`, `error_code=PREFLIGHT_REJECTED`, `detail_code=INVALID_STRUCTURE`, zero network activity, and no private DB/output. A structurally invalid file is not converted into an eligible output or silently excluded after the run.

## Pre-freeze checks

- [x] Every row maps to an exact `CORPUS_MANIFEST.md` item.
- [x] Rights, transcript, media, access-mechanism, retention/derivation, attribution, and source-row version-association evidence is recorded.
- [x] A1 cell states reflect provisional private-research authorization, strict empty-cue rejection, and the predeclared 7,200-cue supported-class boundary.
- [x] Gate 2’s trigger is 1/10 and 10%; both required conditions fail.
- [x] Every A3 cell says `excluded-before-run: Gate 2 not triggered`.
- [x] Positive and safe-rejection denominators are integers and reconcile to the reference ledger/run plan.
- [x] Every selected A1 cell remains in its locked denominator; no post-result exclusion mechanism exists.
- [x] Gate 2 uses both item-level authorization booleans from `CORPUS_MANIFEST.md`; strict-invalid/out-of-class sidecars do not become A3 rows unless independent source media is also authorized.
- [x] Machine matrix, ledger, attestations, run plan, lock schema, and verifier receive independent pre-lock review and same-reviewer closure.
