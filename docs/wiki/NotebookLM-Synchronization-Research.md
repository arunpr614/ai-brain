# NotebookLM Synchronization Research

Purpose: Preserve the historical broad-synchronization research, credential-free validation, and product decision that preceded the narrower one-click export.
Audience: AI Brain users, maintainers, product/design collaborators, security reviewers, and AI agents.
Verified against: living documentation baseline `167a15d57b8f70574a017ea4cda507870f3600d4`; focused current-code audit `ad78d77495dcaa90f62aab038fe63ae95cf36862`.
Runtime evidence through: None; no Google or production runtime was exercised.
Last reviewed: 2026-07-22 for the separately authorized narrow successor; the broad-sync decision itself remains dated 2026-07-21.
Decision: **Broad, automatic, or daily synchronization remains deferred.**
Implementation/runtime status: **Historical broad-sync research only. A separate experimental [one-click export](NotebookLM-One-Click-Export) is the narrow successor.**
Revalidate by: **2026-08-21**, or earlier after the eligibility gate, a relevant Google platform change, or an authorized official synthetic spike.
Owner: AI Brain maintainer.

## Decision summary

This page records the state and decision on 2026-07-21. At that time AI Brain had no NotebookLM setting, credential, job, source ledger, runtime adapter, or deployed integration.

The later [NotebookLM One-Click Export](NotebookLM-One-Click-Export) was separately authorized as an experimental owner-operated path for one explicit saved item and one fixed private consumer notebook. It does not enumerate notebooks, run automatically, backfill history, update or delete remote sources, or make NotebookLM continuously reflect AI Memory. That narrow successor changes the former blanket “no integration exists” statement without reversing this page's broad-sync deferral.

The product council deferred implementation. The local research harness passed 46/46 credential-free checks for mapping, durable intent, retry/reconciliation boundaries, concurrency, truthful status, fake credential states, and capacity arithmetic. Those checks prove application-side design properties only. They do not prove Google authorization, source creation, Drive refresh, NotebookLM ingestion, citations, quotas, cleanup, or end-to-end user value.

The bounded next step is to identify the applicable edition without sharing account identifiers or secrets. If an official lane is available and the maintainer authorizes one private synthetic target, the smallest applicable supported spike may be run. A passing spike must return to council before any implementation decision.

## NotebookLM products are not interchangeable

| Product/account surface | Documented automation found | Truthful current conclusion |
|---|---|---|
| Consumer NotebookLM | No public source-management API was found | No supported automatic NotebookLM synchronization path |
| Paid consumer NotebookLM | Higher limits, but no public source-management API was found | A paid tier does not imply Enterprise API entitlement |
| Ordinary Google Workspace/Education NotebookLM | No public source-management API was found | A Drive document may be published through official APIs, but NotebookLM refresh remains manual or unobservable by AI Brain |
| Gemini Notebook Enterprise | Direct notebook/source operations are documented through a separate licensed Google Cloud product | Promising official lane, but current guides are Preview/Pre-GA and `v1alpha`; entitlement, auth, provider behavior, and cleanup are unverified |

Primary official references: [NotebookLM plans and limits](https://support.google.com/notebooklm/answer/16213268?hl=en), [NotebookLM source and Drive refresh behavior](https://support.google.com/notebooklm/answer/16215270?co=GENIE.Platform%3DDesktop&hl=en), [Workspace edition matrix](https://support.google.com/notebooklm/answer/16337734?hl=en), [Gemini Notebook Enterprise overview](https://docs.cloud.google.com/gemini/enterprise/notebooklm-enterprise/docs/overview), and [Enterprise source API](https://docs.cloud.google.com/gemini/enterprise/notebooklm-enterprise/docs/api-notebooks-sources).

## Approaches evaluated

| Approach | Support class | Decision |
|---|---|---|
| Direct Gemini Notebook Enterprise API | Official, separate licensed Cloud product | Deferred pending edition/license/Preview eligibility and live synthetic proof |
| Stable app-owned Google Doc | Official Docs/Drive APIs; manual NotebookLM boundary | Possible only as a separately named **Drive publishing bridge**, never as verified NotebookLM synchronization |
| Size-bounded aggregate sources | Architecture/capacity strategy within a supported lane | Required if a lane re-enters; cadence, attribution, retention, and shard behavior remain unproven |
| One source per AI Brain item | Official operations where available, but poor capacity strategy | Rejected as the default because modeled source budgets exhaust rapidly |
| Manual Markdown export/import | Supported manual workflow | Retained as the safe, reversible fallback |
| Internal consumer web RPC | Unofficial/undocumented | Not authorized or executed by this research; later separately authorized only for the bounded experimental one-click successor |
| Third-party/open-source wrapper | Depends on its underlying interface | No wrapper converted an unofficial consumer surface into an official supported API; none was installed or executed |

## Mapping boundary tested locally

The initial hypothesis is a new-after-connection, append-only published snapshot—not a historical mirror.

Potentially eligible after final policy review:

- standalone note text;
- generic web capture text, with URL included only when a strict public-URL allowlist permits it;
- YouTube transcript text reconstructed to a canonical public video URL;
- extracted PDF text, not an original PDF binary that AI Brain does not retain through the current capture path; and
- verified-complete Recall content after its internal provenance envelope is removed.

Default-denied in the research boundary:

- metadata-only or insufficient-fidelity Recall content;
- schema-only podcast, EPUB, and DOCX types without complete ingestion paths;
- legacy/ambiguous Telegram typing unless a future canonical rule is approved;
- attached private notes without separate destination consent;
- raw AI Brain IDs, deterministic content hashes, capture internals, local paths, private or signed URLs, tokens, and credentials.

Existing single-item and ZIP Markdown exporters are inconsistent and may include fields unsuitable for a remote payload. A future implementation would need one reviewed, versioned, minimization-first formatter.

## Capacity findings

Per-item sources are not viable as the default. At 10, 50, or 100 eligible items per day, a 300-source notebook would be exhausted in roughly 30, 6, or 3 days before headroom, existing sources, and pending deletion are considered.

Aggregation changes rather than removes the constraint:

- Enterprise immutable aggregates can fit many modeled scenarios when size-sharded and retained within a bounded horizon, but daily sources exceed 300 in a year and weekly sources trade freshness for capacity.
- Capacity uses the minimum of the 1.02-million-character Google Docs limit and NotebookLM's 500,000-word source limit. In the six-characters-per-word, 20%-reserve planning fixture, the character limit binds first. A rolling-Doc bridge therefore requires rotation, repeated import/removal decisions, and a user-accepted history boundary.
- Actual target occupancy, eligible volume, item sizes, retention, deletion lag, safety reserve, and freshness tolerance remain unknown.

No cadence or retention policy has been selected.

## Reliability and status truth

AI Brain's current `captured_at` field is not a safe outbound cursor. IDs are unordered, content has no general version/hash, deletion has no tombstone, and there is no provider-neutral outbound ledger. A future implementation would require a transactional monotonic outbox and target-scoped desired-state/attempt records.

Enterprise and Drive have different terminal facts:

- Enterprise could report a provider source as processed only after an exact mapped source reaches the documented terminal state. A useful knowledge outcome still requires a separate retrieval/citation check.
- A Drive bridge may report only **Drive document updated — NotebookLM refresh unverified**. It must never infer NotebookLM freshness from a successful Drive revision.
- A potentially accepted create with a lost response must enter reconciliation. Without a documented conclusive visibility horizon, an exact zero result cannot authorize a blind retry.
- Manual and daily triggers must feed one durable executor with per-target ordering, leases/fences, independent retries, and poison-item isolation.

## Security, privacy, and cleanup

- No Google credential was acquired. A future official flow must use the narrowest applicable user authorization, bind the exact Google subject and private target, and stop on permission or sharing drift.
- AI Brain's plaintext settings and ordinary backups are not an approved refresh-token store. Mutable credentials require an OS credential store, approved secret manager, or worker-only envelope-encrypted design before implementation.
- Existing AI-provider consent does not authorize publication to Google. Destination-specific, default-deny eligibility and edition-specific disclosure are required.
- Consumer feedback handling, Workspace service classification, and Enterprise usage logging have different privacy and retention boundaries. Avoid generic claims about training or deletion.
- Logs may contain safe aliases, counts, sizes, timings, state transitions, and normalized error classes—not content, titles, URLs, emails, raw provider identifiers/errors, request bodies, or secrets.
- Pause, credential revocation, NotebookLM source removal, Drive-file disposition, and provider-log retention are separate actions. Disconnect must not be labeled erasure.

## Evidence and limits

Credential-free evidence:

- 10/10 fixed synthetic item identities consumed locally; no production items;
- 46/46 combined mapper/durable checks passed after independent adversarial review;
- two credential-free strategy simulations; zero live strategies;
- zero authentication approaches executed;
- zero real NotebookLM sources or Google files created, modified, or deleted;
- two simulated retries for one definite failure; zero live retries;
- zero unofficial-tool execution, external-service spend, subscriptions, deployments, migrations, or production dependencies.

The full evidence package is maintained in the repository under [`docs/feature-council/notebooklm-sync/`](https://github.com/arunpr614/ai-brain/tree/research/notebooklm-sync/docs/feature-council/notebooklm-sync), including the final council recommendation, source mapping, capacity model, security review, spike reports, tests, individual PM opinions, and adversarial reviews.

## Re-entry gate

Before another council decision:

1. Identify the exact edition and existing entitlement without publishing account details.
2. Confirm official local user authorization and permission for exactly the selected resource: one private Enterprise test notebook, or one private consumer/Workspace notebook plus one private app-created Doc.
3. Revalidate official API stage, terms, scopes, IAM, quotas, pricing, privacy, and limits within seven days of the spike.
4. Fix the exact lane-specific product promise before execution.
5. Test only one applicable official lane with existing synthetic fixtures and exact cleanup ownership.
6. Observe identity/target binding, processing or manual refresh truth, retry/reconciliation, token expiry/revocation, capacity, citation fidelity, and cleanup as applicable.
7. Treat a passing one-source/one-Doc check as research evidence only. Before product Limited-go, validate deterministic aggregates across all eligible fixtures, successive scheduled/manual publication, correct citations and negative cross-item questions, a publication-readiness/finality rule, an actual capacity/retention envelope, accepted recurring burden, secure credentials, logging state, and exact cleanup.
8. Return to council before any product design or implementation.

Because this broad-sync decision was Defer, it created no PRD, UX/UI package, HTML product prototype, or production technical plan. The later one-click contract and implementation are separate artifacts with a materially narrower promise.

## What this page does not claim

- It does not claim that NotebookLM synchronization exists in AI Brain.
- It does not claim that a paid consumer or Workspace account can use the Enterprise API.
- It does not claim that Drive updates are visible or current in NotebookLM.
- It does not claim that Enterprise Preview behavior works for the maintainer's account.
- It did not itself authorize credentials, subscriptions, real content, production code, deployment, or unofficial automation; the later user-owned delivery goal separately authorized the narrow successor.
- It does not turn a future successful spike into implementation approval.

For current behavior, rollout state, terms boundary, and operational controls, use [NotebookLM One-Click Export](NotebookLM-One-Click-Export).
