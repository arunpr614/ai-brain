# Spike S5 — Adapter idempotency

- **Run time:** 2026-07-21 18:20–18:48 IST
- **Gate outcome:** Eligibility uncertain; local fake-provider evidence only.
- **Hypothesis:** A durable target-scoped operation ledger can make exact reruns no-ops and prevent completed work from causing another create, without assuming provider-side idempotency.
- **Interface/version:** Node.js 22.22.3, file-backed built-in SQLite research store, async Enterprise/Drive fakes.
- **Authorization/scopes:** None.
- **Synthetic input:** Reused fixed catalog identities; monotonically sequenced create events, per-target baselines/cursors, full HMAC markers, desired hashes, and deterministic request idempotency keys.
- **Expected result:** Repeating a request key returns the same durable request; completed work remains terminal; reruns make no second provider write; each target maintains an independent cursor.
- **Observed result:** Request-key replay deduplicated, overlapping manual/daily intent attached to one cutoff, post-cutoff intent queued, exact reruns retained one fake provider object, and terminal reruns made no additional write. Drive retained one stable fake file across revisioned updates.
- **Command:** `NODE_NO_WARNINGS=1 node --test docs/feature-council/notebooklm-sync/spikes/prototype/durable-sync-harness.test.mjs`
- **Evidence:** 25/25 durable tests passed; combined local suite 46/46 after adversarial regressions.
- **Attempts/retries:** Exact-rerun cases used zero retries and one provider write/logical version.
- **Created source IDs:** Zero real sources. Fake IDs remained in memory only.
- **Cleanup:** Every temporary SQLite directory was removed by the test lifecycle.
- **Verdict:** **Pass for the local ledger contract; official provider create idempotency remains unverified.**
- **Limitations/next action:** The Enterprise fake intentionally does not deduplicate. Production feasibility still depends on a supported exact reconciliation surface; no direct Enterprise source-update or caller idempotency key was documented.
