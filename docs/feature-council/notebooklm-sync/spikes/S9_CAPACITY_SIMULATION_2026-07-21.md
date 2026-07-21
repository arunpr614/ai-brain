# Spike S9 — Capacity and scale simulation

- **Run time:** 2026-07-21 18:20–18:48 IST
- **Gate outcome:** Public limits and local arithmetic require no account authorization.
- **Hypothesis:** Source-count-only projections understate exhaustion; a deterministic model applying word, Google Docs character, occupancy, pending-deletion, and headroom constraints will identify safe sharding and stop boundaries.
- **Interface/version:** Pure local capacity function under Node.js 22.22.3; official limits verified 2026-07-21.
- **Synthetic input:** Enterprise and Drive lanes; 10/50/100 items/day; 30/90/365 days; 250/1,000/2,500 words/item; six characters/word; 500,000 words, 1.02 million Docs characters, and 20% size reserve; source limits 50/100/300/600 with deterministic occupancy/reserve cases.
- **Expected result:** Drive uses the stricter word/character shard count; Enterprise uses the documented word cap; daily and weekly periods split when needed; usable capacity subtracts existing, pending deletion, and reserved sources; `needed > U` stops safely.
- **Observed result:** The Docs character cap binds at typical six-character words. At 1,000 words/item, Drive weekly source counts for 10/50/100 items/day over 30/90/365 days were `5/13/53`, `13/39/157`, and `26/77/313`; retained rolling Docs were `3/7/27`, `12/34/135`, and `23/67/269`. At 2,500 words and 100/day, Drive daily was `60/180/730`, Drive weekly `56/168/678`, and Enterprise weekly `22/64/261`. Boundary budgets resolved to 32, 235, and 0 exactly.
- **Commands:** `node docs/feature-council/notebooklm-sync/spikes/prototype/run-capacity-simulation.mjs | shasum -a 256` and the combined local test command.
- **Determinism evidence:** Repeated runs, including the final post-review run, produced SHA-256 `bc959f91427ed04a16b59e28a871c24b9ab4dd04807d8264812ba7e1513e71be`; all three capacity assertions passed within 21/21 model tests.
- **Attempts/retries:** Two identical local simulations; no retry or network call.
- **Created source IDs:** None.
- **Cleanup:** No persisted state.
- **Verdict:** **Pass for deterministic planning math.**
- **Limitations/next action:** Actual item-size distribution, notebook occupancy, retention choice, API quotas, and conversion expansion were not measured. A live plan must use measured counts and preserve safety headroom; one-source/item is rejected.
