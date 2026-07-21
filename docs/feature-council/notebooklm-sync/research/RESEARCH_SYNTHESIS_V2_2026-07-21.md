# AI Brain → NotebookLM Synchronization — Research Synthesis v2

**Created:** 2026-07-21
**Evidence through:** 2026-07-21
**Status:** Revised after independent adversarial review; Gate 0 account facts pending
**Code baseline:** `ad78d77495dcaa90f62aab038fe63ae95cf36862`

## Decision

**Limited-go to account-gated synthetic feasibility testing; no-go for production implementation.** The researched paths are materially different products and must never share one misleading “synchronized” promise.

This Limited-go is a **research disposition only**. The subsequent controlling [council v2](../council/2026-07-21_council-recommendation_v2.md) product decision is **Defer**; it permits no build or downstream product package.

| Account/path | Supported automation boundary | Truthful terminal state | Current decision |
|---|---|---|---|
| Gemini Notebook Enterprise | Documented Preview/`v1alpha` notebook/source operations | `Synced` only after exact source mapping and documented `COMPLETE` state | Limited-go to synthetic spike if already entitled and Preview approved |
| Consumer/Workspace | Official Docs/Drive update after one-time manual source import | `Drive document updated — NotebookLM refresh unverified` | Limited-go to semi-automated bridge if that promise is acceptable |
| Unofficial consumer connector | Internal RPC or browser/DOM automation with Google session state | Unsupported and unsafe to promise | No-go; do not execute without separate approval |
| Manual Markdown | User export/import | User-confirmed only | Safe fallback |

No live strategy has been executed. Two credential-free strategy simulations used the fixed 10/10 synthetic identities and exercised two simulated retries for one definite failure; the final local suites passed 46/46. No account, notebook, project, real source, OAuth flow, subscription, or real item has been used, and all live/authentication/resource/spend counters remain zero.

## Evidence-backed findings

### Enterprise

- Google’s current documentation exposes notebook/source operations for the separate Gemini Notebook Enterprise Cloud product through Discovery Engine `v1alpha`; current how-to pages label the surface Preview/Pre-GA.
- Existing personal/Plus notebooks are not directly accessible through that product.
- A licensed user, Cloud project/API, region, IAM role, and notebook Owner/Editor access are required. Service-account compatibility with licensed notebook ownership is not documented.
- Source creation/upload/get/delete is documented. Source update/refresh, webhook, caller source ID, idempotency key, source-list endpoint, batch maximum, and method-specific quotas are not.
- The absence of documented create idempotency makes a lost provider response the decisive risk. A synthetic spike must prove unique marker reconciliation through supported notebook/source inventory. If it cannot, unattended creation is no-go.
- Enterprise sources are static. Size-bounded daily or weekly aggregate sources plus explicit retention are more viable than per-item sources; council did not select a cadence without live latency, capacity, and workflow evidence.

### Consumer and ordinary Workspace

- No documented source-management API was found. This is a current search conclusion, not a Google guarantee that one never exists.
- Official Docs/Drive APIs can maintain one stable app-created Doc under narrow `drive.file` authorization.
- Current Google help describes periodic/on-open Drive-source refresh and a manual sync action after import. This is documented UI behavior, unverified for the target account/edition, with no supported observation API or freshness SLA.
- The application can prove a Drive revision update, not NotebookLM ingestion, citations, refresh completion, or source deletion.
- Every Doc rotation requires a manual NotebookLM import. Retaining old sources grows source count; removing them is a separate manual action.

### Capacity

- One source per item fails every 90-day/year scenario at 10, 50, or 100 items/day under current 50–600 source limits.
- Enterprise’s 300-source limit lasts about 300 days at one daily source before retention.
- A rolling Doc rotates before the smaller of:

```text
floor(500,000 / words_per_day)
floor(1,020,000 / characters_per_day)
```

- Usable new-source capacity is documented limit minus existing sources, pending deletions, and reserved safety headroom.
- Actual item word/character distributions and target occupancy were intentionally not read from production.

### AI Brain

- Existing Recall machinery supplies valuable request/execution/run, heartbeat, cap, safe-status, redaction, trusted-worker, mapping/hash, and crash-recovery concepts.
- Recall is inbound and cannot solve outbound atomicity across SQLite and Google.
- AI Brain has no ordered content outbox, general item version/hash, deletion tombstone, outbound mapping/attempt ledger, Google identity/token domain, or destination-specific eligibility policy.
- `captured_at` is overloaded and item IDs are random. Neither is a safe cursor.
- The reachable MVP must be **new eligible items created after connection, append-only**. Historical backfill, edits, and deletes require separate future authorization and substrate.
- Existing PDF captures can provide normalized extracted text, not a guaranteed retained original PDF.
- Attached My notes remain excluded unless separately opted in for this destination.

## Corrected source representation rules

- Map actual AI Brain types and channels; do not present image/audio as canonical item types.
- Use one versioned canonical formatter across single and aggregate exports.
- Keep raw item IDs and deterministic content hashes in the local ledger only.
- If a remote marker is necessary, publish a connection-scoped opaque HMAC operation key.
- Strip sensitive/signed query parameters before including a public source URL.
- Do not invent a last-modified timestamp the item model does not have.
- Label generated summaries as derived content and keep private notes excluded by default.

## Required orchestration model

1. Transactional monotonic outbox records every new eligible item event.
2. Discovery advances after durable per-item desired state exists, not after provider success.
3. Target-scoped renewable leases include fencing tokens so a stale worker cannot commit.
4. Each logical item/target/content version has one deterministic operation key and mapping version.
5. Immutable attempts record only safe identifiers, timing, normalized outcome, and ambiguity.
6. A potentially accepted write with no response enters `needs_reconcile`; zero/one/multiple matches have explicit branches and blind retry is prohibited.
7. Manual and daily triggers enqueue the same service and coalesce overlapping work.
8. Failures retry independently; one poison item cannot block newer items.
9. OAuth subject, connection, and target identities are bound together. Wrong subject/target/ACL fails before a write.
10. Credentials live in the OS credential store, an approved secret manager, or a worker-only encrypted mutable store—not plaintext settings, `.env`, reports, or database backups.

## Security and privacy requirements

- Default-deny destination eligibility and separate NotebookLM consent; existing AI-provider consent is insufficient.
- Private test/production target by default, with ACL digest preflight and explicit shared-target consent.
- Consumer, Workspace core/additional service, and Enterprise logging/privacy disclosures remain distinct.
- Consumer feedback can carry uploaded/source/output context into a separate human-review/retention boundary; users must be warned not to submit feedback containing private AI Brain data.
- Enterprise usage logging remains off for ordinary synthetic spikes unless logging is separately approved and its region/readers/retention are recorded.
- Logs allow only counts, safe state transitions, latency, status, and keyed aliases. Content, titles, URLs, emails, identifiers, and raw Google errors are forbidden.
- Disconnect does not imply erasure. Remote source cleanup, Drive-file disposition, credential revocation, and Google log retention are independent.

## Gate 0 — minimum non-secret request

Only these facts are needed to select a spike lane:

1. Account class and exact visible edition text: consumer NotebookLM, Workspace NotebookLM, or Gemini Notebook Enterprise.
2. If Enterprise is already entitled, confirmation that a license is assigned and synthetic use of its Preview/Pre-GA API is permitted.
3. Permission to use one empty synthetic test notebook and one private app-created synthetic Google Doc.
4. Ability to complete an official local user browser/`gcloud` authorization flow without sharing secrets.
5. For consumer/Workspace, acceptance of one manual Doc import and manual visual refresh verification.

Do not paste URLs, project/notebook/source IDs, screenshots containing account details, passwords, OAuth codes, cookies, access/refresh tokens, API keys, client secrets, service-account keys, or credential files. Applicable identifiers are entered locally only after a lane is selected. Schedule, content policy, retention, historical backfill, and edit/delete preferences are deliberately deferred.

## Post-Gate synthetic program

### Credential-free local first

- outbox and per-item ledger with equal timestamps and late insertions;
- crash boundaries before call, after fake acceptance, after response, and before local commit;
- exact lost-response reconciliation with zero/one/multiple matches;
- overlapping manual/daily triggers, fencing, restart, and poison-item isolation;
- mapping fixtures for reachable item types and exclusion/non-disclosure tests;
- capacity simulation using words, characters, occupancy, pending deletion, and headroom;
- OAuth lifecycle state machine with fake tokens only.

### One applicable official live lane

- **Enterprise:** licensed-user official auth, one raw-text source at a time, documented state polling, ambiguous-response reconciliation, and exact source cleanup.
- **Drive/Docs:** `drive.file`, one stable private Doc, `appProperties` marker, revision-aware update, permissions check, one manual NotebookLM import, manual refresh/citation observation, and independent Notebook/Drive/OAuth cleanup.

Every successful, failed, or ambiguous potentially accepted create consumes the ten-source limit. No real AI Brain content is permitted.

## No-go gates

- Enterprise create cannot be uniquely reconciled after a potentially accepted lost response.
- Consumer requirement insists on programmatically verified notebook ingestion, refresh, or deletion.
- Only unofficial/browser-session automation is available.
- Target account, notebook/file, or ACL cannot be verified before writes.
- Token storage requires plaintext settings/repository/report material.
- Status cannot distinguish enqueue, Drive write/provider acceptance, processing, completion, unknown outcome, and cleanup.
- Cleanup cannot be limited to exact spike-owned objects.
- Any required path incurs new spend or subscription.

## Final v2 recommendation

Proceed only to the minimal account eligibility check. If Gate 0 selects a supported path, run the credential-free cases and then the smallest applicable official synthetic spike under the reviewed protocol. Do not begin production code, migrations, dependencies, deployment, or real-content synchronization.

The eventual product council must evaluate evidence from the applicable spike, not just platform documentation. A direct Enterprise recommendation remains conditional on reconciliation and unattended-auth feasibility. A consumer/Workspace recommendation must be named and designed as a Drive publishing bridge unless Google exposes a supported observable NotebookLM interface.

## Evidence and review

- [Research synthesis v1](RESEARCH_SYNTHESIS_V1_2026-07-21.md)
- [Independent adversarial review](../reviews/NOTEBOOKLM_SYNC_RESEARCH_SYNTHESIS_V1_ADVERSARIAL_REVIEW_2026-07-21_17-49-44_IST.md)
- [Google platform research](2026-07-21_google-platform-research.md)
- [Open-source integration research](2026-07-21_open-source-integration-research.md)
- [Security/privacy assessment](2026-07-21_security-privacy-assessment.md)
- [Focused current-state audit](../audit/focused-current-state-audit.md)
- [Recall reuse assessment](../audit/recall-sync-architecture.md)
- [Reviewed spike protocol](../spikes/SPIKE_PROTOCOL.md)
- [QA failure matrix](../spikes/QA_FAILURE_MATRIX.md)
- [Capacity model](../CAPACITY_MODEL.md)
