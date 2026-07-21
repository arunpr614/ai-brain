# AI Brain → NotebookLM Synchronization — Compliance Matrix

| Requirement | Control/evidence | State |
|---|---|---|
| One-way only | Scope and architecture documents | Enforced |
| Official API preferred | Gate 0 and decision D-003 | Enforced |
| No undocumented API execution | Decision D-004; spike gate | Enforced |
| No production implementation/migration/dependency/deploy | Research-only branch and tracker | Enforced |
| Preserve unrelated user work | Isolated clean worktree | Verified |
| No secrets in chat/repo/logs | Protocol, redaction checks, no `.env` propagation | Enforced |
| Synthetic content only | Fixed fixture catalog, spike protocol, and hard-limit ledger | Enforced; 10/10 fixed local identities used, zero production items |
| Dedicated test notebook | Required before live spikes | Not created; required only if Gate 0 later authorizes one selected lane |
| No pre-existing source modification/deletion | Source-ID ledger and cleanup rules | Enforced; zero real sources used |
| Idempotent retry-safe design | Architecture/reconciliation requirements, S5/S6, durable-harness adversarial review | Credential-free local cases passed; provider semantics remain live-gated |
| Stable per-item state | Provider-neutral outbound ledger recommendation | Designed; implementation prohibited |
| Manual and daily triggers share service | Recall audit and spike S8 | Shared durable path passed locally; provider/live scheduling remains gated |
| Source capacity modeled | `CAPACITY_MODEL.md` and S9 | Deterministic local model passed; eligible real-payload distributions remain gated |
| Privacy boundary disclosed | Security/privacy assessment | Research complete; product UX intentionally not created under Defer |
| Independent PM recommendations | Three isolated individual memos plus integrated council v1/review/v2 | Complete; all recommend Defer, disagreements retained |
| Decision-bearing research v1/review/v2 | Research package | Complete |
| Decision-bearing council v1/review/v2 | Council package | Complete; 0 P0/3 P1/3 P2 review findings resolved in v2 |
| Conditional PRD/UX/prototype/technical package | Final council decision | Not applicable under Defer; intentionally omitted |
| Wiki contains publication-safe status | Canonical Wiki sources and remote verification | Complete; live commit `6b0e90a91d374dc88a746ab6b11a1dcf2c091d3c`, HTTP 200, zero privacy/link findings |
| Review-only PR; no merge | Delivery checklist | Verified; draft PR [#36](https://github.com/arunpr614/ai-brain/pull/36) is open, CI passed, and unmerged |
