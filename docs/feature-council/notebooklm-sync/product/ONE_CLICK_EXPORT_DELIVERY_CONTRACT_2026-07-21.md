# AI Memory → NotebookLM one-click export — PM delivery contract

**Date:** 2026-07-21
**Owner:** Product management
**Product surface:** Consumer NotebookLM
**Public destination:** `https://notebooklm.google/`
**Authenticated app host:** `https://notebooklm.google.com/`
**Decision:** Build and release a narrow, explicit one-item export through a local Chrome connector, subject to the release gates in this contract
**Broad synchronization decision:** Still deferred
**Evidence status:** Current AI Memory code and design inspected; credential-free one-click contract passed 13/13; live consumer NotebookLM behavior remains unverified

## 1. Decision boundary

This contract authorizes the newly scoped **one-click export of one saved AI Memory item to one prebound consumer NotebookLM notebook**. It does not reverse the earlier product-council decision for broad synchronization.

The following broader capability remains deferred:

- manual whole-library synchronization;
- automatic or daily synchronization;
- discovery of all newly eligible items;
- backfill, batch, or aggregate publication;
- edit or deletion propagation;
- automatic source retention or rotation;
- cross-notebook routing; and
- a promise that AI Memory continuously keeps NotebookLM current.

The narrow feature is materially different: the owner explicitly chooses one saved item, AI Memory freezes one minimized snapshot, and the connector makes at most one automated copied-text create to one fixed destination. The product must call this **Export to NotebookLM**, not sync.

Consumer NotebookLM does not expose a supported public source-management API in the reviewed official material. The connector therefore remains an experimental consumer integration using a tightly bounded local browser-session transport. AI Memory must not imply that Google supports or endorses this integration.

## 2. Evidence and current-product facts

| Fact | Product implication | Evidence |
|---|---|---|
| AI Memory is a single-user product. | The first release serves one owner and needs no multi-tenant or team workflow. | `README.md`, Core constraints |
| Desktop and mobile item detail already place `Export as .md` in the footer. | Insert the NotebookLM action immediately before that control in both layouts; do not add a Library-card action. | `src/app/items/[id]/page.tsx` desktop and mobile footers |
| Existing Markdown export includes raw `brain_id`, raw source metadata, and URLs. | It is not the provider payload. A separate default-deny mapper is mandatory. | `src/app/api/items/[id]/export.md/route.ts` |
| Existing Chrome MV3 extension already has a service worker, local storage, notifications, and AI Memory pairing. | Extend this client instead of introducing a hosted Google credential or broad MCP/CLI backend. | `extension/manifest.json`, `extension/src/background.ts`, `extension/src/capture.ts` |
| AI Memory items can be repaired without a general content-version timestamp. | Freeze an immutable sanitized snapshot and compute a canonical content hash at click time. | Focused current-state audit and `src/db/items.ts` |
| Credential-free S11 passed 13/13 one-click contract cases. | The state and dedupe semantics are credible locally, but live Google behavior is still a release gate. | `spikes/S11_ONE_CLICK_EXPORT_CONTRACT_2026-07-21.md` |
| Current documented consumer source capacity starts at 50 sources per notebook and varies by plan. | V1 uses the lowest known limit rather than inferring a paid tier. | `CAPACITY_MODEL.md` |

## 3. Target user and job

### Target user

The target is the single AI Memory owner who:

- saves articles, notes, PDFs, transcripts, and other readable text in AI Memory;
- uses consumer NotebookLM in a signed-in desktop Chrome profile;
- wants selected source material available in one private NotebookLM notebook; and
- may initiate the export from desktop or mobile, while accepting that the desktop connector performs delivery.

### User story

> After one-time local setup, I can click **Export to NotebookLM** on a saved item and trust that the exact saved text goes once to my fixed private notebook, without exposing my Google session or falsely claiming success.

### Product outcome

The owner can deliberately move a reviewed AI Memory snapshot into NotebookLM with:

- one click on the normal path;
- a durable status that survives navigation and restart;
- truthful processing and completion states;
- no automatic duplicate for unchanged content or an uncertain write;
- clear disclosure that delivery uses the one locally confirmed fixed private destination, plus the exported fields; and
- a local-only Google session boundary.

## 4. V1 scope and non-goals

### In scope

- One configured consumer NotebookLM notebook.
- One explicit item at a time.
- Deterministic copied-text source creation.
- Desktop and mobile item-detail actions.
- Durable queueing when the desktop connector is offline.
- Unchanged-content deduplication.
- Explicit changed-version export.
- Weak-capture confirmation.
- Processing-state polling and read-only ambiguous-write reconciliation.
- Local setup, reauthentication, disable, and safe rebind flows.
- Capacity, payload, privacy, retention, and redacted observability controls.
- Existing Markdown export as the supported manual fallback.

### Out of scope

- Automatic, scheduled, or daily export.
- Bulk export, history scan, or backfill.
- Library-card, collection, or multi-select actions.
- Per-click notebook selection, notebook enumeration, dynamic routing, or any raw notebook URL/ID supplied to the item page or AI Memory API. One exact setup-time URL pasted locally into extension Options is in scope.
- Shared notebooks in the first release.
- Native URL, Drive, YouTube, PDF-file, or other binary source modes.
- Updating, replacing, or deleting an existing NotebookLM source.
- Automatically deleting older item versions.
- Exporting summaries, quotes, chats, attached private notes, or adjacent artifacts.
- NotebookLM-to-AI-Memory import, questions, answers, citations, or generated artifacts.
- Android-native Google transport.
- Google cookies or session material on the AI Memory server.
- A hosted worker using the owner's primary Google session.

## 5. One-time setup contract

Setup occurs only in the local Chrome connector. The item page never discovers or selects notebooks.

1. The owner enables the NotebookLM connector in the existing AI Memory extension.
2. Chrome requests access only to `https://notebooklm.google.com/*` when the feature is used. The extension must not request `<all_urls>`, `cookies`, `debugger`, or broad scripting access.
3. The owner opens the public product entrance at `https://notebooklm.google/` and signs in in Chrome.
4. The owner opens the intended private notebook in the authenticated application and pastes its exact `https://notebooklm.google.com/notebook/<uuid>` URL into extension Options. An optional numeric `?authuser=N` route from 0 through 10 remains local to Chrome.
5. The connector strictly parses that one URL and does not list or enumerate other notebooks. The raw URL/ID, account route, and bounded locally observed notebook label remain in Chrome.
6. The connector verifies the expected Google subject, exact notebook, access, private/owner-only posture, source occupancy, and safety reserve.
7. AI Memory creates an immutable target-binding version and exposes only the generic label `Private NotebookLM target`, posture, connector state, and safe-slot state to the item page. The exact target remains confirmable in extension Options.

Setup fails closed on:

- wrong or changed Google account;
- a malformed/non-exact notebook URL or unsupported query parameter;
- inaccessible or changed notebook;
- shared or unknown sharing posture;
- unreadable source occupancy;
- exhausted safety reserve;
- protocol drift; or
- any requirement to copy Google cookies or session tokens.

Rebinding is unavailable while queued, running, processing, reconciling, authentication-attention, conflict, or otherwise unresolved work exists. A successful rebind creates a new binding and dedupe namespace. Existing sources remain in their original notebook.

## 6. Exact one-click behavior

### Normal trusted item

Before the action, the item page shows:

- `NotebookLM destination`;
- the generic fixed-target label `Private NotebookLM target` (the exact URL and bounded local label remain in Chrome);
- `Private`;
- connector state;
- safe source slots;
- `Sends a static copy of the saved text. Changes do not sync automatically.`; and
- `What will be sent?`.

For an eligible full-text item, one click on **Export to NotebookLM**:

1. authenticates and authorizes the current AI Memory item;
2. resolves the immutable server-side target binding;
3. freezes the minimized mapper output;
4. computes its canonical content hash and opaque recovery marker;
5. transactionally creates or returns the durable request;
6. returns an inline state within two seconds; and
7. allows the page to be closed while delivery continues.

No modal appears on this normal path.

### Desktop offline or mobile-originated click

The same click creates the durable request and shows:

**Queued — waiting for desktop connector**
The request will continue when the connected computer is online.

The user may safely close the page. A mobile click never sends Google session material through Android.

### Unchanged content

If the same target binding, mapper version, and canonical content hash already succeeded, the click returns:

**Already exported**
This exact saved version is already ready in the configured notebook. No new source was created.

### Changed content

If the item content changed after the last successful export, the action becomes **Export updated version** and opens a confirmation:

**Export an updated version?**
The saved item changed after its last successful export. This creates a new source; the previous source remains in NotebookLM.

No prior source is deleted or overwritten.

### Limited capture

For `metadata_only`, `paywall_preview`, or `failed` quality with a non-empty saved body, the action opens a preview and requires the checkbox:

> I understand. Export only the limited text shown in AI Memory.

The confirm action is **Export limited text**. Empty normalized content is ineligible.

## 7. Eligibility policy

| Input | V1 behavior |
|---|---|
| Standalone note with saved body | Eligible |
| URL/article with full saved text | Eligible |
| YouTube item with saved transcript | Eligible |
| PDF with extracted saved text | Eligible as copied text; no original-file claim |
| Telegram-captured canonical note/URL/PDF | Eligible under the underlying type and quality |
| Recall-captured full text | Eligible only after Recall provenance, card identifiers, and signed URLs are removed |
| `metadata_only`, `paywall_preview`, or `failed` with visible saved text | Eligible only after explicit limited-text confirmation |
| Empty normalized body | Blocked |
| Podcast, EPUB, or DOCX schema-only substrate | Blocked until a reachable, tested capture path exists |
| Unsupported attachment or local artifact | Blocked |

Eligibility also requires:

- an active immutable target binding;
- the expected Google account;
- the exact target to be accessible and owner-private;
- readable source occupancy and positive safe headroom;
- a valid mapper output under the payload ceiling; and
- no existing in-flight or successful request for the same dedupe tuple.

## 8. Shared-notebook policy

Shared notebooks are excluded from V1, even when the user is willing to acknowledge collaborators.

The first release permits only a target the connector can positively verify as private and owner-only. `shared` and `unknown` both block real content. This is the conservative resolution of the design prototype's open shared-notebook decision and matches AI Memory's current single-owner model.

A future shared-target release requires a separate product and privacy review, explicit collaborator disclosure, reliable live posture inspection, and renewed destination consent. It must not be enabled by loosening a hidden configuration value.

## 9. Payload contract

### Included

The deterministic copied-text source contains only:

1. a provider display title derived from the human title plus an opaque recovery marker;
2. copied text beginning with the full normalized human title;
3. the exact normalized saved body at click time;
4. author, when present in the saved source; and
5. publication date, when present.

The current item schema has no trustworthy proof that a source URL is anonymously public. Mapper v1 therefore omits every source URL, including an otherwise queryless public-host URL. A future mapper version may include one only after an explicit public-access signal and the strict URL-safety checks both pass. Unsafe provenance URLs are always omitted in full; they are never partially cleaned.

### Excluded

- AI-generated summary and quotes;
- chat history and NotebookLM output;
- attached or adjacent private notes;
- raw item, user, database, content-hash, connector, notebook, or source identifiers;
- capture/extraction internals and database timestamps;
- thumbnails and temporary media paths;
- local, private-network, signed, credential-bearing, malformed, or query-bearing URLs;
- raw provider errors or responses; and
- cookies, CSRF values, OAuth data, or other Google session material.

### Initial hard envelope

The complete canonical UTF-8 payload must be:

- no more than **200,000 bytes**; and
- no more than **50,000 normalized words**.

Both limits apply. The first release has no chunking or alternate-source fallback. AI Memory never silently truncates the full copied-text title provenance or saved body to make an item fit. Only the provider display title may be shortened to fit its 180-character envelope while preserving the opaque marker; the full normalized title remains the first copied-text heading and participates in the content hash.

Oversize copy:

**This item is too large for a safe one-source export**
No copied-text title or body was truncated or sent.

The live synthetic gate must test the configured boundary before real-content write enablement. Lowering the ceiling after evidence is a reversible safety adjustment; increasing it requires new provider evidence and tests.

## 10. Capacity policy

V1 deliberately assumes the lowest documented consumer capacity even if the owner has a higher paid tier.

```text
effective_source_limit = 50
reserved_headroom = 5
safe_slots = 50
  - 5
  - observed_source_count
  - reserved_source_slots
```

`reserved_source_slots` includes both conclusively unsent pre-create requests that are still eligible to create and every request for which create was dispatched but no source alias is known. The latter reservation remains even when the local row is terminal, because an unresolved or duplicate-risk provider source may still occupy capacity. Once an exact source alias is known, that source is represented by observed occupancy instead of a request reservation.

Rules:

- Warn when `safe_slots <= 10`.
- Reject a new request when `safe_slots <= 0`.
- Recheck occupancy immediately before each create.
- Allow only one active provider create per target.
- Count visible processing, failed, and pending-deletion sources as occupied.
- Reserve a slot for every conclusively unsent pre-create request still eligible to create.
- Reserve a slot for every dispatched or possibly delivered request without a known source alias, including terminal unresolved rows; a terminal local state does not return ambiguous capacity.
- Treat unreadable occupancy as blocked, not zero.
- Never evict, delete, replace, or move a user source automatically.
- Never automatically remove an older AI Memory version.

Block copy:

**Destination safety reserve reached**
Remove sources in NotebookLM or deliberately configure another private destination. No item was sent.

Higher plan capacity may be supported later only after its limit can be positively identified and tested. V1 must not infer a tier from account branding or user expectation.

## 11. Retention and cleanup policy

The frozen snapshot is a temporary second copy of the item's content.

### Frozen content

- Retain the frozen title and text while a request is queued, waiting for the connector, awaiting authentication before create, or eligible for a retry that is conclusively known not to have sent.
- Expire and purge any such pre-send snapshot after **7 days**. Terminal copy is `Export expired. Nothing was sent.`
- If a provider create may have been attempted, purge frozen title and text within **24 hours**, including requests in processing, succeeded, reconciling, conflict, or terminal failure.
- Cancellation before send purges the snapshot immediately.
- After a possibly delivered create, no automated create may use that request again.
- The connector holds provider-bound content in memory only and does not persist a second local body copy.

### Non-content ledger

Retain the content hash, target-binding version, mapper version, safe state, timestamps, and sealed provider source alias while the item and binding exist. This ledger enables durable dedupe without retaining the exported body.

Retain redacted attempts and events for **30 days**. Logs and metrics may be aggregated after that only if they contain no content or raw identifiers.

### Independent enforcement and backup boundary

- The application runs retention at startup and approximately every minute. A separate mutating `brain-notebooklm-retention.timer` is the app-independent fallback: it invokes the exact immutable release approximately every minute and takes over only when the application sweep is stale or failed, physical purge is pending, or a snapshot is overdue. The separate `brain-notebooklm-operations.timer` is read-only and must never substitute for retention enforcement.
- The live database uses `secure_delete=ON`. Removing frozen content latches physical purge pending; a truncating WAL checkpoint and successful physical-purge proof are required. Enqueue and provider writes fail closed while retention health, snapshot deadlines, or physical purge are unhealthy.
- Every supported database backup copy is scrubbed and vacuumed before publication. Pre-create frozen snapshots become terminal `expired` with `backup_snapshot_omitted`; post-dispatch ledgers remain available for duplicate-safe recovery, but no frozen title or body is published in application, deployment/preflight, off-site, Recall/root, or restore-related backup copies.
- Any raw SQLite staging copy is identity-specific, owner-only, and held on canonical private tmpfs sized for four database copies plus 64 MiB. Its non-extendable deadline is three minutes, copy and scrub are independently timed, and scrub/vacuum/integrity checks must finish before publication. Cleanup and janitor controls must keep any raw residue within the five-minute safety margin.

### Unresolved work

The owner may choose **Stop checking and purge** for an unresolved request. The confirmation must state that recovery will stop and a source may still exist in NotebookLM. This action never claims remote deletion.

Provider cleanup may address only an exact recorded source identity after revalidating the account and target. V1 does not perform automatic remote cleanup.

## 12. State, recovery, and user copy

| State | Headline | Required behavior/action |
|---|---|---|
| `ready_private` | Destination: `{safe label}` · Private | Show static-copy disclosure and Export action. |
| `queued` | Queued for NotebookLM | Snapshot is durable; Cancel remains safe. |
| `queued_offline` | Queued — waiting for desktop connector | Page may close; Cancel remains safe. |
| `running` | Sending the saved copy to NotebookLM… | One create is in progress; ordinary Retry is absent. |
| `processing` | Added to NotebookLM. Processing… | Exact source is known; poll status; do not call it exported. |
| `succeeded` | Ready in `{safe label}` | NotebookLM reports the exact source ready. |
| `already_exported` | Already exported | Zero new writes. |
| `changed_content` | This item changed since its last export | Require explicit updated-version confirmation. |
| `browser_unknown` | We couldn't confirm the request | Retry safely using the same idempotency key. |
| `authentication_attention:create` | Reconnect NotebookLM | Nothing was sent; reconnect resumes to queued. |
| `authentication_attention:reconcile` | Reconnect to check the result | It may already have been received; reconnect resumes read-only reconciliation. |
| `authentication_attention:poll` | Reconnect to finish checking | Known source exists; reconnect resumes status polling only. |
| `reconciling` | Checking whether NotebookLM received it… | Marker lookup only; no new create. |
| `conflict` | Export paused to prevent another copy | Multiple exact marker matches or a reused provider source identity; no create or delete. |
| `processing_failed` | NotebookLM could not process this source | Known source failed; no automatic replacement. |
| `target_attention` | Export paused — destination needs review | Wrong account, target, sharing, or unreadable health; nothing sent. |
| `target_capacity_blocked` | Destination safety reserve reached | Restore headroom or deliberately rebind. |
| `payload_too_large` | This item is too large for a safe one-source export | No truncation and no write. |
| `cancelled` | Export cancelled | Cancellation completed before send; purge immediately. |
| `expired` | Export expired | Seven-day pre-send window ended; nothing was sent. |

### Ambiguous-write rule

After any timeout, network error, 429, 5xx, or authentication boundary that may have followed delivery:

1. do not issue another create;
2. list sources in the exact bound notebook;
3. find the exact opaque marker;
4. adopt and poll exactly one matching source;
5. enter `conflict` for multiple matches; and
6. remain unresolved when no match is visible but provider absence is not conclusive.

The honest guarantee is **at most one automated create unless non-delivery is conclusive**, not exactly once.

Either `multiple_marker_matches` or `provider_source_identity_reused` terminalizes the affected request as a duplicate conflict, marks the target for attention, and trips the provider-wide write block. The ordinary settings reset cannot clear either reason. V1 has no approved generic or exact-evidence unblock command for these duplicate-risk conditions.

## 13. Analytics and operational observability

V1 uses local operational analytics. It does not add a third-party analytics service.

### Persisted events

Operational events use these exact names:

- `notebooklm.setup_started`
- `notebooklm.permission_granted`
- `notebooklm.target_bound`
- `notebooklm.target_rebound`
- `notebooklm.target_health_checked`
- `notebooklm.connector_revoked`
- `notebooklm.connector_emergency_revoked`
- `notebooklm.connector_disabled`
- `notebooklm.protocol_failure`
- `notebooklm.write_kill_switch_tripped`
- `notebooklm.write_kill_switch_cleared`
- `notebooklm.restore_write_block_latched`
- `notebooklm.retention_sweep_succeeded`
- `notebooklm.retention_sweep_failed`
- `notebooklm.export_viewed`

Request-ledger events use the exact stored names below. The two UI facts and the dedupe fact remain namespaced; lifecycle and accepted connector-event types are stored literally.

- UI/dedupe: `notebooklm.export_clicked`, `notebooklm.limited_confirmed`, `notebooklm.request_deduped`
- Lifecycle: `request_queued`, `requeued_by_user`, `connector_claimed`
- Accepted connector events: `preflight_ok`, `authentication_required`, `target_attention`, `capacity_blocked`, `dispatch_started`, `create_accepted`, `create_uncertain`, `reconcile_result`, `source_status`, `retryable_failure`, `connector_update_required`
- Other request events: `request_cancelled`, `checking_stopped`, `connector_emergency_revoked`, `item_deleted`, `snapshot_purged`, `request_expired`, `lease_expired`, `lease_exhausted`

### Allowed properties

- opaque request, connection, target, and source aliases;
- canonical source type and capture-quality class;
- mapper and binding versions;
- byte and word-count buckets;
- safe-slot bucket;
- state, phase, attempt number, and normalized error code;
- timestamps and latencies; and
- connector availability.

Never record title, body, URL, email, account identifier, notebook/source identifier, raw item/hash, provider request/response, raw error, cookie, CSRF value, credential, or credential path.

### Product and safety metrics

- Setup completion rate.
- Eligible click-to-queue acknowledgement P50/P95.
- Online queue-to-claim P50/P95.
- Provider-ready rate and latency distribution.
- Offline-queue duration.
- Authentication-intervention rate by phase.
- Safe unchanged-content dedupe count.
- Reconciliation zero/one/multiple-match counts.
- Requests unresolved for more than 24 hours.
- Eligibility, payload, and capacity block rates.
- Snapshot-purge overdue count.
- Wrong-target, credential, false-success, and automatic-duplicate incidents.

Provider processing latency is measured but is not a user-facing SLA in V1.

## 14. Launch stages

### Stage 0 — Production-compatible implementation, writes off

- Deploy additive storage, APIs, UI, connector code, and documentation behind the exact three gates below. Every gate is false when unset.
- `BRAIN_NOTEBOOKLM_EXPORT_UI_ENABLED` exposes the product surface.
- `BRAIN_NOTEBOOKLM_EXPORT_QUEUE_ENABLED` is evaluated after and depends on the UI gate plus healthy runtime safety controls; it permits durable enqueue but not provider create by itself.
- `BRAIN_NOTEBOOKLM_EXPORT_PROVIDER_WRITE_ENABLED` is evaluated last and depends on the queue gate; it permits provider create. Turning it off preserves safe status reads and read-only reconciliation.
- Existing AI Memory behavior and Markdown export remain unaffected.

### Stage 1 — Read-only shadow

- Verify expected subject, exact target, private posture, occupancy, source listings, and status parsing.
- Make zero provider creates.
- Any unreadable invariant returns a safe blocked state.

### Stage 2 — Private synthetic canary

Use a dedicated private test notebook and synthetic content only. Prove:

- copied-text create returns a source identity;
- the exact source becomes ready and appears only in the bound notebook;
- auth expiry behaves correctly before create, after a possible write, and during polling;
- a controlled lost response does not trigger a second create;
- zero/one/multiple-marker reconciliation behaves safely;
- capacity and payload boundaries fail closed;
- disable/revoke stops new claims; and
- cleanup addresses only a recorded canary source after target revalidation.

### Stage 3 — Owner-only production opt-in

Enable writes only after every release gate passes. The owner deliberately completes setup and explicitly clicks each item. No account is auto-connected and no content is selected automatically.

### Stage 4 — Stable owner release

After at least seven days of owner dogfood with zero severe safety incidents, the feature may become normally visible. Setup remains opt-in, the target remains private-only, and broad sync remains deferred.

## 15. Acceptance criteria

### Setup and security

- [ ] Extension requests only the authenticated NotebookLM host permission needed for this feature.
- [ ] Extension has no `cookies`, `<all_urls>`, `debugger`, or broad scripting permission.
- [ ] Google cookies, CSRF values, and browser-session artifacts never enter AI Memory requests, SQLite, logs, backups, or UI DTOs.
- [ ] Item-page requests cannot supply a notebook ID, URL, alias, connector, or target override.
- [ ] Setup accepts one exact notebook URL locally, does not enumerate notebooks, and sends no raw URL/ID/title to AI Memory.
- [ ] Setup binds the expected Google subject, exact target, private posture, occupancy, connector, and binding version.
- [ ] Wrong account, target drift, shared/unknown posture, and unreadable occupancy fail closed before content leaves the device.
- [ ] Rebinding is blocked while outstanding work exists and creates a new dedupe namespace afterward.

### UI and accessibility

- [ ] Desktop action appears immediately before `Export as .md` in the item footer.
- [ ] Mobile action appears immediately before `Export as .md` in the Original tab and has at least a 44px target.
- [ ] The generic fixed-target label, private posture, static-copy disclosure, connector state, safe slots, and last-checked time are visible in AI Memory; the exact URL and bounded local label remain confirmable in extension Options.
- [ ] The normal eligible path requires one click and no confirmation modal.
- [ ] Weak capture and changed version use the exact confirmation behavior in this contract.
- [ ] Status persists across navigation, reload, process restart, and connector restart.
- [ ] Progress uses polite live announcements; authentication, conflict, and safety blocks use assertive announcements.
- [ ] Dialog focus is trapped and restored; state never depends on color or animation; reduced motion is respected.
- [ ] Retry is absent, not merely disabled, after a possibly delivered create.

### Mapping and privacy

- [ ] Mapper is a pure versioned default-deny function with fixed test vectors.
- [ ] Payload contains only the included fields in this contract.
- [ ] Mapper v1 emits no source URL because no trustworthy anonymous-public signal exists.
- [ ] Unsafe URLs are omitted in full.
- [ ] AI summaries, quotes, chats, attached notes, internal identifiers, capture metadata, thumbnails, and credentials are absent.
- [ ] PDF export uses saved extracted text and makes no binary-file claim.
- [ ] Recall provenance and signed identifiers are stripped before eligibility.
- [ ] Byte and word ceilings are enforced without truncating the full copied-text title or body; only the bounded provider display title may be shortened as documented.

### Durability and correctness

- [ ] Request creation and dedupe constraints are transactional in SQLite.
- [ ] Concurrent clicks across processes return one durable request.
- [ ] Same idempotency key always resolves to the same accepted request.
- [ ] Unchanged successful content produces zero new writes.
- [ ] Changed content requires explicit new-version action and preserves the old source.
- [ ] Target concurrency is one active provider create.
- [ ] Offline/mobile queueing is durable and the online connector claims within 60 seconds.
- [ ] The item page shows the accepted state within two seconds.
- [ ] Success is impossible before the exact source reports ready.
- [ ] Lost-response, crash/restart, lease expiry, stale worker, and all three auth phases preserve correct recovery.
- [ ] No possibly delivered create is blindly retried.
- [ ] Multiple marker matches and provider-source-identity reuse terminalize the request, mark target attention, block provider-wide writes, and cannot be cleared by the ordinary reset.

### Capacity, retention, and operations

- [ ] Capacity formula accounts for observed sources, eligible unsent pre-create requests, and every dispatched request without a known source alias, including terminal unresolved rows.
- [ ] Warning and block thresholds match this contract.
- [ ] Unknown occupancy blocks real content.
- [ ] Pre-send cancellation is safe and immediate; post-send cancellation never claims rollback.
- [ ] Seven-day pre-send expiry and 24-hour post-attempt purge are tested with controlled clocks.
- [ ] Non-content dedupe remains after body purge.
- [ ] Redacted event retention is bounded to 30 days.
- [ ] Application retention and the independent one-minute mutating fallback meet the same deadlines; the separate one-minute operations audit remains read-only.
- [ ] Every supported backup copy is scrubbed/vacuumed before publication, and raw staging is private tmpfs with a non-extendable three-minute deadline and five-minute residue safety margin.
- [ ] Snapshot removal proves secure deletion and a truncating WAL checkpoint; overdue content or pending physical purge fails enqueue/provider writes closed.
- [ ] A kill switch stops new enqueue/create while preserving status reads and read-only reconciliation.
- [ ] Existing sources are never auto-deleted during rollback, disable, or rebind.

### Delivery evidence

- [ ] Migration apply, repeated apply, scrubbed backup, schema-026 restore latch, integrity, and foreign-key checks pass.
- [ ] Audited runtime rollback proves either a feature-aware prior release or the narrowly allowed pristine/first-dark pre-026 state; database restore remains a separate path and rejects pre-026 snapshots.
- [ ] Unit, route, repository, state-machine, race, connector, UI, accessibility, redaction, and release smokes pass.
- [ ] Production build and immutable release validation pass.
- [ ] Live synthetic canary passes without real AI Memory content.
- [ ] No open P0 or P1 adversarial-review findings remain.
- [ ] DataWiki, living repository Wiki, GitHub Wiki, configuration, operations, and troubleshooting documentation match the deployed behavior.

## 16. Release gates

Writes may be enabled only when all of these are true:

1. The implementation passes every applicable acceptance criterion above.
2. A live private synthetic canary proves target/account/privacy/capacity inspection, copied-text creation, source identity, processing readiness, and marker reconciliation.
3. Google session material remains entirely Chrome-managed.
4. The target is positively private; `unknown` is not accepted.
5. Lost-response testing produces no automatic duplicate.
6. Protocol drift and normalized failure monitoring are active.
7. Application retention, the independent mutating fallback, read-only operations audit, backup scrubbing, and physical-purge proof are healthy with no overdue records.
8. Current Google terms/account-security behavior has been reviewed and the product is labeled experimental.
9. The release has a tested, independent write kill switch.
10. Production deployment, authenticated smoke, documentation publication, and rollback evidence are recorded.

## 17. Rollback and stop conditions

### Immediate write-disable triggers

- any wrong-target write;
- any Google cookie/session/credential leakage;
- any automatic duplicate caused by retry;
- any `Ready` claim before the exact provider source is ready;
- any target, account, sharing, or capacity preflight bypass;
- source-list/create/status protocol schema drift;
- a `multiple_marker_matches` or `provider_source_identity_reused` duplicate-risk conflict;
- any automatic deletion of an unverified source; or
- three consecutive normalized provider protocol failures, excluding expected auth, capacity, eligibility, and user-cancellation states.

### Immutable runtime and extension rollback

- Stop accepting new export requests and stop all new provider creates. Continue compatible safe status reads, known-source polling, and read-only reconciliation so uncertain work is not stranded.
- Preserve schema 026, its additive ledger, and truthful browser-visible states. Never delete or move a NotebookLM source automatically, and do not revoke the connector while an outcome is uncertain.
- Restore only an attested compatible immutable runtime. A feature-aware prior runtime is required once setup or work exists.
- A pre-026 runtime is allowed only through the audited-additive compatibility path with the exact attested migration hashes and no NotebookLM setup or work state. The only allowed states are a freshly migrated pristine schema or the narrowly equivalent first-dark state containing only zero-count `notebooklm.retention_sweep_succeeded` heartbeats and their last-success timestamp. Any pairing, connector, target, other event, request, payload, unresolved work, nonzero counter, protocol/retention failure, or pending physical purge blocks pre-026 runtime rollback.
- Stop the mutating fallback timer and any running oneshot for the final compatibility proof with application writers stopped. Resume it only after the prior immutable release identity is proved; a pre-026 runtime keeps the retention unit disabled.
- Handle extension rollback separately and preserve protocol compatibility. Keep `Export as .md` available throughout.

### Database restore

A database restore is a separate destructive-recovery boundary, not runtime rollback, and is approved only as a last resort because later local writes are lost.

- The operator must stop `brain`, both NotebookLM timers, and any running retention oneshot before invoking restore. The hardened restore proves those units remain inactive before and after it acquires its locks; it does not stop them on the operator's behalf.
- Restore rejects every pre-026 snapshot. A schema-026 candidate is scrubbed, vacuumed, and integrity-checked before publication, then latched to `provider_write_blocked=1` with reason `restore_reconciliation_required` and a content-free `notebooklm.restore_write_block_latched` event.
- Ordinary reset, restart, deployment, and protocol success/failure handling cannot clear or overwrite the restore latch. V1 has no approved unblock command. A future separately reviewed feature-aware command must atomically verify the current latch and redacted exact-target evidence for every source or marker that may have been created after the backup timestamp. Direct SQL is not an approved recovery interface.
- After restarting `brain`, the operator must enable and resume both NotebookLM timers, prove each is enabled and active, and run the retention oneshot once with `Result=success`. Those post-restore timer steps do not clear the provider-write latch.

## 18. Truly blocking external evidence

Implementation and deployment behind write-off do not require another routine product decision. Real-content write enablement still requires external evidence that code cannot manufacture:

1. A signed-in Chrome profile and a dedicated private synthetic notebook chosen locally. No credential, URL, notebook ID, account screenshot, or session material belongs in chat or the repository.
2. The live consumer interface must expose enough read behavior to verify the exact subject, target, private posture, occupancy, returned source identity, source-title listing, and processing readiness.
3. A live ambiguous-write test must prove read-only marker reconciliation without a second create.
4. Current consumer NotebookLM terms and account-security behavior must not make the intended local connector unacceptable.

If private posture or capacity cannot be positively read, real-content export remains blocked under this contract. If source identity/readiness or safe reconciliation cannot be implemented, the product falls back to manual Markdown export rather than weakening the promise.

Only an explicit policy override would reopen shared or unknown targets, larger/chunked payloads, automatic cleanup, or server-held Google credentials. Product management recommends none of those overrides.

## 19. Documentation handoff

This file is the authoritative PM contract for implementation and acceptance.

When implementation evidence exists, create a living feature page at:

`docs/wiki/NotebookLM-One-Click-Export.md`

Update the living DataWiki/GitHub Wiki surfaces for data model, APIs, browser extension, security/privacy, configuration, deployment/operations, feature status, navigation, and documentation history.

Preserve `docs/wiki/NotebookLM-Synchronization-Research.md` as dated research. Add a clear successor note: broad automatic synchronization remains deferred, while the later one-item export is a narrower, separately authorized product scope. Do not rewrite credential-free research as production or live-provider evidence.

## 20. Source artifacts

- `docs/feature-council/notebooklm-sync/research/2026-07-21_one-click-export-repository-fit-analysis.md`
- `docs/feature-council/notebooklm-sync/spikes/S11_ONE_CLICK_EXPORT_CONTRACT_2026-07-21.md`
- `docs/feature-council/notebooklm-sync/design/notebooklm-export-design/bundle.html`
- `docs/feature-council/notebooklm-sync/design/notebooklm-export-design/src/model.ts`
- `docs/feature-council/notebooklm-sync/design/notebooklm-export-design/src/Specification.tsx`
- `docs/feature-council/notebooklm-sync/CAPACITY_MODEL.md`
- `docs/feature-council/notebooklm-sync/SOURCE_MAPPING_MATRIX.md`
- `docs/feature-council/notebooklm-sync/research/2026-07-21_security-privacy-assessment.md`
- `docs/feature-council/notebooklm-sync/audit/focused-current-state-audit.md`
