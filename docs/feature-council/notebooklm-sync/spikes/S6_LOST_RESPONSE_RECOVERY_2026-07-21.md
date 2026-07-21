# Spike S6 — Lost-response recovery

- **Run time:** 2026-07-21 18:20–18:48 IST
- **Gate outcome:** Eligibility uncertain; no live provider behavior tested.
- **Hypothesis:** A potentially accepted create can recover without duplication only by reconciling exact target + opaque marker + desired hash; a non-conclusive zero or multiple exact matches must stop unattended creation.
- **Interface/version:** File-backed SQLite harness and async injected fakes under Node.js 22.22.3.
- **Authorization/scopes:** None.
- **Synthetic input:** Reused fixed item identities with outcomes `accept_then_timeout`, `ambiguous_without_accept`, delayed visibility, multiple exact matches, crash after provider response, and async lease takeover.
- **Expected result:** One exact match binds; non-exact candidates are ignored; multiple exact matches block; zero blocks unless a supported conclusive visibility horizon has elapsed; a stale writer cannot bind its response.
- **Observed result:** Accepted/lost response reconciled to exactly one fake source with one write. Wrong-target/wrong-hash candidates produced `manual_reconcile`; multiple exact matches produced `reconcile_multiple`; default Enterprise zero produced `reconcile_zero_inconclusive` with no retry. A hypothetical conclusive horizon allowed one ambiguity retry. Reopen and stale-fence cases reconciled the already accepted object without duplication.
- **Command:** `NODE_NO_WARNINGS=1 node --test docs/feature-council/notebooklm-sync/spikes/prototype/durable-sync-harness.test.mjs`
- **Evidence:** All relevant cases passed within the 25/25 durable suite, including negative/invalid visibility horizons, ordered two-item Drive recovery, and target-scope fencing.
- **Attempts/retries:** Ambiguity retry capped at one. Definite transient failure test allowed the initial call plus exactly two retries, then stopped—matching the global maximum.
- **Created source IDs:** Zero real sources; all fake objects were local/in-memory.
- **Cleanup:** Temporary databases removed; no external object existed.
- **Verdict:** **Pass for fail-closed local behavior; Enterprise unattended recovery is not yet proven.**
- **Limitations/next action:** No official Enterprise visibility horizon or create idempotency key was found. Unless live supported evidence closes that gap, a zero-result Enterprise lookup must remain `manual_reconcile` and unattended automatic creation is limited-go/no-go.
