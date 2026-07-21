# Gate 1 — Compliant transcript acquisition

**Decision:** **Fail**<br>
**Execution date:** 2026-07-19<br>
**Content commit:** `6b829798101a59fadd9a1d0efd65428539f400ad`<br>
**Seal commit:** `0ed1b13729802f4ded921f1a94369ddc110dabc3`<br>
**Lock SHA-256:** `bef4437a05ac20418a49f3c06a99a1f74ad93c9395dcc780d1c0307aa354b8c3`<br>
**Spend / external activity:** USD 0; zero primary external requests, provider calls, OAuth/API calls, model inference calls, media downloads, or subscriptions

## Fixed-denominator result

All nine predeclared A1 cells consumed exactly one canonical claim in the frozen order. No cell was retried, repaired, replaced, or removed after its outcome.

| Item | Locked role | Publication-safe observation | Control outcome |
|---|---|---|---|
| YT-01 | Eligible positive | Operator and scorer passed; token preservation `1.00`; anchor match `1.00`; isolated strategy feasible; current product not ready | Pass |
| YT-02 | Eligible positive | Canonical terminal `A1_OPERATOR_ORACLE_FAILED`; harness exit `1`; no signal, timeout, truncation, stderr, or scorer; rerun prohibited | **Fail** |
| YT-03 | Structural rejection | Harness returned the predeclared `PREFLIGHT_REJECTED / INVALID_STRUCTURE`; zero network attempts; no normalized output or database | Pass |
| YT-04 | Supported-class rejection | `safe_rejection`; locked and observed class agree; zero network/provider attempts; no normalized output or database | Pass |
| YT-05 | Structural rejection | Harness returned the predeclared `PREFLIGHT_REJECTED / INVALID_STRUCTURE`; zero network attempts; no normalized output or database | Pass |
| YT-06 | Structural rejection | Harness returned the predeclared `PREFLIGHT_REJECTED / INVALID_STRUCTURE`; zero network attempts; no normalized output or database | Pass |
| YT-07 | Eligible positive | Operator and scorer passed; token preservation `1.00`; anchor match `1.00`; isolated strategy feasible; current product not ready | Pass |
| YT-08 | Eligible positive | Canonical terminal `A1_OPERATOR_ORACLE_FAILED`; harness exit `1`; no signal, timeout, truncation, stderr, or scorer; rerun prohibited | **Fail** |
| YT-09 | Eligible positive | Operator and scorer passed; token preservation `1.00`; anchor match `1.00`; isolated strategy feasible; current product not ready | Pass |

- Eligible first-attempt success: **3/5 (60%)**, below the exact required **5/5**.
- Truthful rejection controls: **4/4 (100%)**, meeting that separate oracle.
- Successful eligible preservation checks: **3/3** at `1.00` token preservation and `1.00` anchor match. The two failed eligible cells produced no score and remain failures in the five-cell denominator.
- Canonical public evidence: [nine claims and two failure terminals](A1_EVIDENCE_INDEX.md). Seven completed cells have exclusive private receipts; private transcript, database, scorer-option, and normalized-output files remain outside Git.

The child boundary used the sealed default dependencies, a minimal environment, disabled recovery/workers, and macOS network denial. Successful publication-safe reports record zero network/provider attempts. The two failure terminals intentionally publish hashes/counts rather than raw child content; they do not expose per-cell network counters, so they cannot be upgraded into safety passes. No external request or spend was observed.

## Product boundary and stop

Even the three eligible successes report `current_product.ready=false` with the same five gaps: current service attestation, fail-closed parsing, runtime retention/derivation enforcement, legacy recovery coupling, and full normalized-contract persistence. Gate 1 therefore establishes neither reliable isolated feasibility across the fixed class nor current-product readiness.

Gate 1 fails on the locked first-attempt threshold. YT-02 and YT-08 cannot be retried. Gates 3, 4, and 5 and every replacement cell are prohibited under this seal. Gate 6 and the product council remain mandatory.
