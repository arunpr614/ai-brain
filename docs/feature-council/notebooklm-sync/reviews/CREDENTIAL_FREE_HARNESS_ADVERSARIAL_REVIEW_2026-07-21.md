# Credential-free synchronization harness — adversarial review

**Review date:** 2026-07-21
**Reviewer:** Independent adversarial sub-agent
**Final verdict:** Clean for the credential-free synthetic scope; not evidence of live Google behavior.

## Scope

The reviewer inspected and executed the pure mapper/capacity model, file-backed SQLite harness, async Enterprise/Drive fakes, and their tests. The review targeted durability, ordered discovery, reconciliation, retry caps, lease fencing, Drive revision ordering, content minimization, target isolation, and truthful status. It used only the shared ten-item catalog, temporary local databases, and fake providers.

## Findings and resolutions

| Priority | Finding | Resolution and regression |
|---|---|---|
| P1 | Drive continued after an ambiguous accepted revision, causing the next item to use a stale revision and fail | Drive now stops on unresolved ordered work, reconciles first, then resumes; two-item lost-response case proves revisions 1→2 and one write/item |
| P1 | Retry maximum could be configured above two | Constructor/store validation and SQLite `CHECK` constraints cap retries at two; both scaffolds reject larger values |
| P1 | Malformed mapping input could roll back a whole page and wedge newer work | Required fields fail closed; unexpected mapper exceptions persist safe `mapping_failed` work; poison/later-healthy regression advances the cursor |
| P1 | `pageSize=0` could skip discovery and mark success | Page size must be a positive safe integer; finalization separately requires cursor ≥ execution cutoff |
| P1 | Negative visibility horizon could authorize a blind duplicate retry | Invalid/missing horizons normalize to inconclusive; the horizon is frozen at intent and a hidden accepted source produces `manual_reconcile`, one write, one source |
| P1 | A valid lease could mutate another target's execution/work | Every recovery/create/result/reconcile/observe/finalize mutation asserts target-bound execution and work scope; cross-target probes fail without mutation |
| P2 | Drive accepted a non-advancing receipt | Receipt revision must equal the bound local revision + 1; same-revision receipt stops at manual reconciliation and no success label |
| P2 | False YouTube suffixes, literal IPs, and trailing-dot local names bypassed URL policy | Exact/subdomain YouTube matching, literal-IP rejection, and terminal-dot normalization now fail closed |
| P2 | Unknown baseline strings silently enabled history | Target creation accepts only `new_only` or `all`; typo regression creates no target |
| P2 | Success labels appeared before success evidence | Both status projections return a terminal label only after a completed source or Drive update |
| P2 | Malformed/BOM/leading-space Recall envelopes could emit card IDs/private URLs | Recall is accepted only through a parsed envelope after explicitly allowed BOM/leading-whitespace normalization; malformed cases skip and leak regressions pass |

## Final evidence

```text
NODE_NO_WARNINGS=1 node --test \
  docs/feature-council/notebooklm-sync/spikes/prototype/sync-model.test.mjs \
  docs/feature-council/notebooklm-sync/spikes/prototype/durable-sync-harness.test.mjs

46 tests passed
0 failed
0 skipped
```

The mapper/model subset passed 21/21 and the durable subset passed 25/25. No network, production environment, credential, Google account, or external resource was accessed.

## Residual limitations

- Fake providers cannot establish real NotebookLM/Drive acceptance, visibility, processing, refresh, revision, permission, quota, or cleanup semantics.
- No official OAuth flow, refresh token, license/IAM check, account binding, or secret store was exercised.
- Enterprise still lacks a documented conclusive source-visibility horizon or create idempotency key in the reviewed public surface; default behavior therefore remains manual reconciliation after a zero result.
- Consumer/Workspace still has no supported NotebookLM refresh-observation API in the reviewed evidence.
- Node 22's built-in SQLite API is experimental; the harness is a research proof, not production implementation.
