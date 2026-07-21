# AI Brain → NotebookLM Synchronization — Research Synthesis v1

**Created:** 2026-07-21
**Evidence through:** 2026-07-21
**Status:** Research recommendation only; account eligibility and all authenticated behavior remain unverified
**Code baseline:** `ad78d77495dcaa90f62aab038fe63ae95cf36862`

## Executive recommendation

**Limited-go to a gated feasibility phase; no production implementation.** There are two supportable lanes, but the user’s actual NotebookLM edition decides which promise is possible:

1. **Gemini Notebook Enterprise Preview API:** potentially supports direct notebook/source management through a documented Google Cloud `v1alpha` API. It is the only lane that can plausibly support observable source creation and terminal processing state. It requires a separately licensed Cloud product, project/API/location/IAM setup, a licensed user, notebook permission, Preview risk acceptance, and a solution for ambiguous creates because no idempotency key is documented.
2. **Consumer or ordinary Workspace NotebookLM:** no documented source-management API was found. A supported Google Docs/Drive bridge can update one stable app-created document after the user imports it once. This is semi-automated publishing to Drive, not verifiable NotebookLM synchronization; the app cannot truthfully confirm notebook refresh or deletion.

Unofficial internal-RPC and browser-automation connectors are unsuitable for production and remain out of execution scope. A fully manual Markdown export/import is the safest fallback if neither supported lane meets the product promise.

## What is verified

### Platform boundary

- Google’s documented programmable notebook/source management belongs to **Gemini Notebook Enterprise**, the separately licensed Google Cloud product, not ordinary consumer or Workspace NotebookLM.
- Current how-to pages label the surface Preview/Pre-GA and use Discovery Engine `v1alpha`, despite an older release-note signal that used GA language. The conservative release classification is Preview until the applicable project or Google resolves the contradiction.
- The Enterprise API documents notebook create/get/list-recent/batch-delete/share and source create/upload/get/batch-delete operations. It documents raw text, web, YouTube, Google Docs/Slides, and supported file uploads.
- It does not document source update/replace/refresh, a caller-supplied source ID, request idempotency key, webhook, dedicated source-list method, or service-account compatibility with licensed notebook ownership.
- Personal/Plus notebooks are not directly reachable from the Enterprise product.

### Consumer/Workspace bridge

- Current NotebookLM help documents Drive-backed sources and describes periodic refresh plus a manual refresh action after import.
- Google Docs and Drive APIs offer supported app-created-file access under `drive.file` and revision-aware document updates.
- No supported consumer API was found for attaching a source, observing NotebookLM ingestion, listing sources, or removing a source.
- Therefore the supported automation boundary ends at “Drive document updated.” Refresh behavior and citations need observed validation against the user’s edition, and NotebookLM-side cleanup remains manual.

### Limits and capacity

- Documented notebook source limits range from 50 on standard consumer/Workspace tiers through 600 on the highest tier; Gemini Notebook Enterprise documents 300 sources per notebook.
- One source per item is not viable at sustained capture volume. At 10, 50, and 100 items/day, 300 sources last roughly 30, 6, and 3 days. Lower tiers exhaust sooner.
- A daily aggregate for Enterprise and a bounded rolling Google Doc for consumer/Workspace are the leading strategies. Both need explicit retention/rotation and word/size headroom.

### AI Brain readiness

- AI Brain already has mature concepts for durable requests, runs, occurrence identity, heartbeats, safe status, dry-run/apply separation, redacted reporting, a trusted worker boundary, and remote-ID/content-hash bookkeeping in Recall.
- It does not have a trustworthy outbound event sequence, general content version/hash, deletion tombstone, destination resource ledger, Google authorization domain, or ambiguous-write reconciliation state.
- `captured_at` is overloaded and may reflect document metadata; random item IDs are unordered. Neither can safely drive a checkpoint.
- Current item Markdown exports disagree about whether summary/tags are included. A versioned canonical formatter is required.
- Attached My notes have their own provider-consent boundary and must remain excluded unless separately authorized for NotebookLM.

### Open-source landscape

- Reviewed consumer connectors use undocumented Google RPCs or browser/DOM automation with bearer-equivalent Google session state. Active maintenance does not turn those surfaces into supported contracts.
- `K-dash/nblm-rs` is different: it targets the documented Enterprise API and may be useful as research reference, but direct official REST/client use is preferable until dependency and Preview risks are reviewed.
- `Open Notebook` is the strongest reviewed self-hosted NotebookLM-style alternative if destination flexibility becomes acceptable; it is not a NotebookLM synchronization path.

## Three evaluated strategies

| Strategy | Support status | Automation truth | Capacity posture | Current recommendation |
|---|---|---|---|---|
| Enterprise daily aggregate via official Preview API | Documented Preview for separate Cloud product | Direct create/status/delete can be observed; create idempotency/update remain undocumented | Daily source plus bounded retention | Conditional preferred lane if eligible |
| Consumer/Workspace rolling Google Doc | Supported Docs/Drive APIs plus documented NotebookLM Drive-source behavior | App observes only Drive write; notebook refresh/removal unobservable | Stable source count; rotate before word/size ceiling | Conditional supported fallback |
| Manual Markdown export/import | Fully user-mediated | No automated NotebookLM claim | User manages source limits | Safe fallback / No-go escape hatch |

No strategy has been executed. Hard-limit usage remains zero.

## Required architecture if feasibility is confirmed

- provider-neutral `connections`, `targets`, outbox, per-item desired/observed state, immutable attempts, and request/execution/run lifecycle;
- monotonic transactional outbox cursor, never timestamp discovery;
- versioned canonical content snapshot and mapping hash;
- target-scoped leases with fencing and independent per-item retry schedules;
- explicit `needs_reconcile` state before any retry after a potentially accepted create;
- stable Google subject/target binding and private-by-default ACL preflight;
- encrypted/OS-secured refresh-token storage outside plaintext settings and backups;
- allowlist-only logging with keyed aliases and normalized errors;
- append-only new-item MVP; update/delete deferred until versions and tombstones exist;
- truthful UI states that distinguish queued, prepared, provider accepted, processing, synchronized, Drive-updated-only, auth required, capacity blocked, and cleanup unresolved.

## Hypotheses and falsification tests

| Hypothesis | Falsifier | Required evidence |
|---|---|---|
| Enterprise raw-text creation can be reconciled without duplicates | Lost response cannot be uniquely matched using documented list/get data | Synthetic unique marker, inventory, state history, exact cleanup proof |
| Enterprise processing provides usable terminal truth | Source remains indefinite/unknown or enum drift is not safely handled | Bounded polling and documented complete/permanent-failure evidence |
| One rolling Doc can serve consumer/Workspace reliably | Notebook does not refresh consistently, citations collapse, or size/rewrites degrade | One private synthetic Doc, one-time import, timed observations, citation checks |
| Local orchestration is retry-safe | Crash/concurrency creates duplicate desired work or loses an event | Fake-adapter crash matrix and concurrent trigger tests |
| Daily aggregation remains within limits | Word/size/source projections exceed safety margin at expected volume | Capacity simulation with 10/50/100 items/day and retention policy |

## Security requirements

- Default-deny item eligibility and destination-specific consent.
- `drive.file` plus OpenID subject binding for the Drive lane; no automatic scope escalation.
- Dedicated licensed user, project, and private notebook for an Enterprise spike.
- No secrets, identifiers, titles, content, URLs, or raw Google errors in committed artifacts/logs.
- No plaintext refresh token in settings, `.env`, or the database backup set.
- Separate remote cleanup, Drive-file cleanup, credential revocation, and provider-log retention semantics.
- Enterprise usage logging off during ordinary synthetic spikes unless separately approved.

## Gate 0 facts still required from the user

1. Actual NotebookLM edition/visible plan or access badge: personal consumer, Workspace edition/access group, or Gemini Notebook Enterprise.
2. Permission to use a dedicated empty synthetic notebook and, for the Drive lane, one private app-created synthetic Google Doc.
3. Willingness to complete an official local browser/`gcloud` authorization without pasting secrets.
4. If Enterprise: non-secret project number, location, synthetic notebook ID/URL, confirmation that a license is assigned, and approval to test a Preview/Pre-GA API.
5. If consumer/Workspace: non-secret synthetic notebook URL and acceptance of a one-time manual Google Doc import plus the “Drive updated; notebook refresh unverified” product boundary.
6. Preferred daily time/timezone and whether the MVP should export all new items or only explicitly selected items. Recommended default is selected items only.
7. Confirmation that edits/deletions remain out of MVP. Recommended default is yes.

Do not provide passwords, OAuth codes, cookies, API keys, client secrets, service-account keys, or credential files.

## V1 verdict

**Limited-go pending Gate 0.** The feasibility question is no longer “does any path exist?” At least one supportable path exists for each broad edition class. The unresolved question is whether the path available to this account meets the requested product promise:

- Enterprise may support direct observable synchronization but carries licensing, Preview, and idempotency/reconciliation uncertainty.
- Consumer/Workspace supports a narrow rolling-Doc bridge, but not verifiable end-to-end NotebookLM synchronization.

No implementation, migration, dependency, deployment, subscription, real-content sync, or live provider write is authorized by this verdict.

## Evidence package

- [Google platform research](2026-07-21_google-platform-research.md)
- [Open-source integration research](2026-07-21_open-source-integration-research.md)
- [Security and privacy assessment](2026-07-21_security-privacy-assessment.md)
- [Focused AI Brain audit](../audit/focused-current-state-audit.md)
- [Recall architecture reuse assessment](../audit/recall-sync-architecture.md)
- [Source mapping matrix](../SOURCE_MAPPING_MATRIX.md)
- [Capacity model](../CAPACITY_MODEL.md)
- [QA failure matrix](../spikes/QA_FAILURE_MATRIX.md)
