# Spike S8 — Manual/daily orchestration and durability

- **Run time:** 2026-07-21 18:20–18:48 IST
- **Gate outcome:** Credential-free validation permitted; live calls blocked.
- **Hypothesis:** A file-backed provider-neutral lifecycle can atomically capture ordered work, preserve per-target new-only baselines, coalesce triggers by a frozen cutoff, recover two crash windows after reopen, fence stale workers, isolate poison items, and keep last-success truth separate from last attempt/progress.
- **Interface/version:** Node.js 22.22.3 built-in `node:sqlite`, local temporary database, injected async fakes.
- **Authorization/scopes:** None.
- **Synthetic input:** Reused fixed catalog identities with equal/older capture timestamps, atomic failpoints, manual/daily requests, paused async provider response, pending source, poison failure, and stable Drive revisions.
- **Expected result:** Outbox sequence—not `captured_at`—orders discovery. Item materialization and cursor advance commit together. A target created in `new_only` mode starts after its connection baseline. Only the current fence may commit after provider I/O. Partial work never advances a successful-run timestamp.
- **Observed result:** Four sequenced events survived close/reopen; rollback left neither item/outbox partial state. Materialization/cursor rollback replayed without duplicates. Per-target baselines/cursors differed correctly. Trigger cutoffs coalesced covered work and queued later events. Both post-response and post-terminal-commit crashes recovered after reopen. Poison work remained explicit while later healthy work completed. `PENDING` never counted as success. Drive reported only its exact unverified-refresh label.
- **Command:** `NODE_NO_WARNINGS=1 node --test docs/feature-council/notebooklm-sync/spikes/prototype/durable-sync-harness.test.mjs`
- **Observed output:** 25 durable tests passed, 0 failed, 0 skipped; final independent duration 489 ms. Combined suite: 46/46.
- **Attempts/retries:** Global simulated retry maximum respected; no network retry occurred.
- **Created source IDs:** Zero real NotebookLM sources.
- **Cleanup:** Each test removed its temporary SQLite directory. No repository credential or runtime dependency was added.
- **Verdict:** **Pass as a credential-free research harness.**
- **Limitations/next action:** Node 22 labels built-in SQLite experimental. The harness is not production code and intentionally does not implement real aggregate composition, OAuth persistence, deployment scheduling, or Google adapters.
