# NotebookLM One-Click Export

Purpose: Explain the narrow AI Memory → consumer NotebookLM export, its setup, user states, privacy boundary, and operator controls.

Audience: AI Memory users, maintainers, support responders, security reviewers, and AI agents.

Verified against: Protected-main release `167a15d57b8f70574a017ea4cda507870f3600d4`, deployed to production on 2026-07-22 with migration `026_notebooklm_export.sql`, connector protocol v1, mapper v1, and the attested Chrome extension 0.7.0 artifact.

Runtime evidence through: 2026-07-22 for protected-main deployment, migration/integrity/health checks, retention and operations timers, and authenticated AI Memory Settings/item UI. Production is UI-only (`1:0:0`): queueing and provider writes are off. The extension artifact is installed locally but is not loaded or paired. No target bind, consumer NotebookLM source, signed-in synthetic canary, or real-content enablement is claimed.

Last reviewed: 2026-07-22.

Owner: AI Brain maintainer.

**Status:** Experimental · **Availability:** Deployed UI-only; queue and provider writes off · **Confidence:** High for code and dark/UI-only runtime controls; live-provider confidence pending

The [repository evidence record](https://github.com/arunpr614/ai-brain/blob/0b297c214715261194c0c90e11ebc37d2ac5bc5b/docs/feature-council/notebooklm-sync/release/production-release-evidence-2026-07-22.md) records the current verified boundary at an immutable documentation commit.

## Summary

NotebookLM one-click export sends one deliberately selected saved AI Memory item as one static copied-text source to one fixed, preconfigured, owner-only private consumer NotebookLM notebook.

It is an **export**, not synchronization:

- changes in AI Memory do not update an existing NotebookLM source;
- changes in NotebookLM do not return to AI Memory;
- an updated AI Memory version creates another source only after confirmation; and
- no source is automatically replaced, moved, or deleted.

The feature uses the owner's existing signed-in desktop Chrome session through the local Brain extension. Google session material stays in Chrome and is not sent to or stored by the AI Memory server.

This is an experimental consumer integration over undocumented NotebookLM web behavior. Google can change the behavior without notice. AI Memory must fail closed on protocol drift and must not imply Google endorsement.

## Use the right NotebookLM address

| Address | Use |
|---|---|
| [https://notebooklm.google/](https://notebooklm.google/) | Public product entrance. Use this link to open NotebookLM and sign in. |
| `https://notebooklm.google.com/` | Authenticated application and connector host. Chrome's optional permission is limited to this host. A notebook URL pasted during setup stays local to the extension. |

The public entrance is intentionally shown to the user. The authenticated `.google.com` host is used only after sign-in and for the locally bound notebook.

## Terms and account review — 2026-07-22

This review covers the narrow owner-operated consumer-account workflow. It is not legal advice or a permanent approval; re-review is required if the account type, Google terms, sharing model, machine-readable instructions, or provider behavior changes.

- Google's [privacy and terms help](https://support.google.com/notebooklm/answer/17004255?hl=en) says ordinary consumer use is governed by the Google Terms of Service. It says notebook content is not used to directly train foundational models unless the user submits feedback; feedback can include sources/uploads and may be reviewed. Qualifying work and school accounts have different terms and handling. Confirm the account type, and do not submit feedback containing sensitive exported content.
- Google's [source help](https://support.google.com/notebooklm/answer/16215270?hl=en) documents copied-and-pasted text, up to 50 sources for free users, and per-source limits above this feature's intentionally stricter limits.
- Google's [public-notebook help](https://support.google.com/notebooklm/answer/16322204?hl=en) confirms that a notebook can be made public and later restricted. AI Memory therefore requires a positive owner-only private check rather than assuming that a notebook is private.
- The [Google Terms of Service](https://policies.google.com/terms?hl=en-US) prohibit bypassing protective measures and automated access that violates machine-readable instructions. The public entrance's [robots.txt](https://notebooklm.google/robots.txt) currently allows `/`, but that is not an API contract or permission to bypass application controls.

**Explicit inference, not an official Google statement:** the reviewed official pages describe user-driven source creation, privacy, sharing, limits, and terms, but do not document a supported public source-management API or expressly authorize internal web-RPC calls. The connector therefore remains experimental, owner-only, one-item/one-click, low-rate, and default-off. It must not perform bulk or scheduled writes, bypass or automate through authentication/protective challenges, or continue provider writes after protocol drift or another safety signal.

## Current availability

The protected-main server release and migration 026 are deployed. The production tuple is UI-only `1:0:0`, and authenticated AI Memory Settings/item checks showed queueing paused, provider writes off, and item export unavailable. The attested extension 0.7.0 artifact is installed in a stable local directory but is not loaded in Chrome. This page does **not** claim that:

- the extension is loaded or paired in the signed-in Chrome profile;
- a target has been bound or positively verified owner-only/private;
- a real NotebookLM source has been created;
- the signed-in private synthetic canary has passed; or
- real AI Memory content is enabled for export.

Those statements may be updated only after the redacted signed-in synthetic-canary and owner-only enablement evidence exists. A visible setup surface is not evidence that the provider workflow is available.

## Target user and user journey

**Target user:** the single AI Memory owner who has reviewed one saved item, uses consumer NotebookLM in a signed-in desktop Chrome profile, and wants a deliberate static copy in one fixed owner-only private notebook.

The user journey is one-time local connector setup → paste and verify one exact private notebook URL → open an AI Memory item → review the fixed generic destination and payload preview → select **Export to NotebookLM** → follow durable queued/sending/processing status → reach **Ready** only when the exact NotebookLM source reports ready. A mobile click may queue the request, but the signed-in desktop connector performs delivery.

The initial loading state is **Loading NotebookLM export…** while the item page checks the configured destination and current durable request. An empty saved body is blocked before queueing; success, failure, authentication-attention, capacity, and unresolved-result states remain explicit rather than being collapsed into a generic completion message.

## What is included

- One configured consumer NotebookLM notebook.
- Owner-only private targets; shared, public, and unknown posture are blocked.
- One explicit item action from the item-detail page.
- Durable queueing when the desktop connector is offline.
- Copied-text source creation only.
- Unchanged-content deduplication.
- Explicit confirmation before exporting an updated version.
- Explicit confirmation for limited/weak captured text.
- Exact-source processing checks and truthful `Ready` status.
- Read-only reconciliation after an uncertain create response.
- Capacity reserve, payload limits, temporary-snapshot retention, and a provider-write safety stop.
- Existing Markdown export as the manual fallback.

## What remains deferred

Broad or daily synchronization remains deferred. This feature does not provide:

- whole-library, scheduled, automatic, batch, or backfill export;
- discovery of newly eligible items;
- per-click notebook choice or multiple target notebooks;
- update, delete, or retention propagation to NotebookLM;
- automatic source cleanup or rotation;
- native URL, Drive, YouTube, or PDF-file source modes;
- NotebookLM questions, answers, citations, chats, audio, or generated artifacts;
- NotebookLM-to-AI-Memory import; or
- a promise that NotebookLM continuously reflects AI Memory.

The earlier [NotebookLM Synchronization Research](NotebookLM-Synchronization-Research) remains the dated record for the broader synchronization decision. This later one-item export is a narrower, separately authorized scope; it does not reverse the broad-sync deferral.

## One-time setup

Setup is performed in the Brain Chrome extension on the signed-in desktop profile.

For a release build, install the Product CI extension artifact through `scripts/install-verified-extension-release.mjs`, not directly from a per-release ZIP or per-SHA extraction directory. The verifier checks the zip, release manifest, checksum, exact file hashes/paths, Manifest V3, the narrow NotebookLM permission, and GitHub attestations from this repository's `main` Product CI workflow. It installs into one stable absolute unpacked-extension directory; reusing that path on later updates helps preserve the paired Chrome extension origin.

1. Open the extension Options page.
2. Use **Open NotebookLM sign-in**. It opens the public entrance at [https://notebooklm.google/](https://notebooklm.google/).
3. Sign in, then grant the optional permission limited to `https://notebooklm.google.com/*`.
4. In AI Memory, open **Settings → NotebookLM export** and create a short-lived connector code.
5. Enter that code in extension Options. The extension receives a scoped connector credential that is separate from the normal page-capture token.
6. Paste one specific authenticated notebook URL into extension Options. A local numeric `authuser` route from 0 through 10 is accepted for a secondary signed-in account.
7. The extension checks the exact target, owner identity, owner-only private posture, source occupancy, and safety reserve before binding.

The raw notebook URL/ID, sanitized bounded local notebook label, account route, and provider source IDs remain in local extension storage. The server receives only a generic label, private/capacity facts, cryptographic binding proofs, and opaque source aliases. The connector does not enumerate notebooks.

Setup fails closed if the account or target changes, sharing is not positively private, occupancy cannot be read, the five-source reserve is exhausted, or the provider protocol no longer matches the connector.

## Export an item

The action appears on an item detail page immediately before **Export as .md** when the UI flag is enabled.

For a normal full-text item:

1. Review the generic private destination, connector status, and safe source slots.
2. Select **Export to NotebookLM**.
3. AI Memory freezes the minimized saved text and queues a durable request.
4. The local desktop connector revalidates the account, target, private posture, and capacity.
5. It performs at most one automated copied-text create.
6. AI Memory reports success only after NotebookLM reports that exact source ready.

The page may be closed after queueing. A mobile-originated click queues work, but the signed-in desktop Chrome connector performs delivery.

If the same saved version already succeeded, AI Memory returns **Already exported** with no new source. If the saved item changed, **Export updated version** requires confirmation and leaves the older source untouched.

## What is sent

The deterministic copied-text source includes:

1. normalized human title;
2. exact normalized saved body at click time;
3. author, when available; and
4. a valid publication date, when available.

This release omits every source URL because the current item schema does not carry a trustworthy signal that a URL is anonymously public. A future mapper may include a URL only after explicit public-access proof and the existing strict URL-safety checks both pass.

The full normalized title remains the first heading in the copied text and participates in the canonical content hash. A separate provider display title appends the opaque recovery marker; only its human-title portion may be shortened to fit the 180-character provider envelope. It allows the connector to find the exact source after a lost response without creating another copy.

The export excludes summaries, quotes, chats, attached private notes, AI Memory IDs and hashes, capture internals, thumbnails, temporary paths, unsafe URLs, raw Google/provider identifiers, errors, cookies, CSRF values, and session material.

Recall-captured text is exported only after the exact Recall provenance envelope is removed. A malformed envelope fails closed. Weak captures require a preview/confirmation. Empty text is blocked. Schema-only podcast, EPUB, and DOCX items remain blocked unless they have an explicitly supported full-text capture quality.

## Size and capacity limits

The complete copied-text payload must be no larger than:

- 200,000 UTF-8 bytes; and
- 50,000 normalized words.

Both limits apply. V1 does not silently truncate or split the copied-text title or body. Only the separate provider display title may be shortened as described above.

The connector deliberately assumes the lowest supported planning limit:

```text
safe slots = 50 - 5 reserved - observed sources - open requests that can still create
```

The final term reserves a slot for every conclusively unsent pre-create request that can still create and for every dispatched/possibly-delivered request that lacks a known source alias, even if that ambiguous request has been terminalized. An uncertain provider write therefore cannot silently return capacity to the pool.

- Ten or fewer safe slots produces a visible low-capacity warning but still allows a deliberate export.
- Zero safe slots blocks enqueue/create and protects the five-source reserve.
- Occupancy is rechecked immediately before a create.
- Only one provider create can be active for the target.
- Unknown occupancy is treated as blocked, never as zero.
- AI Memory never deletes another source to make room.

Paid-plan capacity is not inferred from branding or user input.

## Architecture and runtime flow

The architecture/runtime flow is authenticated item page → strict item export API → versioned default-deny mapper → SQLite durable request plus temporary frozen snapshot → scoped connector claim → local Chrome account/target/privacy/capacity preflight → one server-authorized copied-text create through the browser-managed NotebookLM session → normalized connector events → exact-source processing poll or read-only marker reconciliation. AI Memory never receives Google session material or raw NotebookLM account/notebook/source identifiers.

## User-visible states

| State | Meaning and safe action |
|---|---|
| Ready to export | Target is configured/private and content/capacity checks pass. |
| Queued | The frozen request is durable and can still be cancelled before dispatch. |
| Waiting for desktop connector | The desktop extension is offline; closing the page is safe. |
| Sending | The one provider create may be in progress; ordinary retry is absent. |
| Processing | The exact source is known, but NotebookLM has not reported it ready. |
| Ready | The exact accepted/adopted source reports ready. |
| Already exported | The unchanged target/binding/mapper/content tuple already succeeded; zero new writes. |
| Reconnect NotebookLM | Sign-in is needed. The next action depends on whether the request is pre-create, reconcile, or poll; post-dispatch work never returns to create. |
| Checking whether NotebookLM received it | A create response was uncertain; recovery lists titles/statuses and searches for the exact marker without re-sending. |
| Result unresolved | No marker is visible yet, but that is not proof the create failed. AI Memory will not create another source. |
| Conflict | Multiple marker matches or a reused source identity were found. Automated create/delete is blocked. |
| Target needs review | Account, notebook, privacy posture, availability, or capacity changed. |
| Nothing was sent | A conclusive pre-send failure may be deliberately retried using the same durable request. |
| Nothing was sent (`lease_exhausted`) | Three pre-create connector leases expired. The safe reason is retained in the ledger; a deliberate retry resets the pre-create lease sequence and no provider write occurred. |
| Provider processing failed | The known source failed after creation. AI Memory does not create a replacement automatically. |
| Cancelled | Cancellation completed before provider dispatch; the frozen snapshot was purged. |
| Export expired | The seven-day pre-send window ended; the snapshot was purged and nothing was sent. |
| Stopped checking | The owner acknowledged that a source may exist; recovery stopped and the frozen snapshot was purged. This is not remote deletion. |

## Lost-response and duplicate safety

Immediately before its one non-idempotent provider request, the extension persists a content-free `possibly delivered` journal entry. After that point, any timeout, network error, rate limit, server error, authentication boundary, or protocol failure is handled by read-only reconciliation.

Reconciliation searches only the exact bound notebook for the opaque title marker:

- one match is adopted and polled;
- multiple matches become a conflict;
- zero visible matches remain unresolved because NotebookLM may be eventually consistent; and
- no match authorizes a blind create retry.

The honest guarantee is **at most one automated create unless non-delivery is conclusive**, not exactly once.

## Privacy and local storage

The server stores a temporary minimized snapshot and a durable non-content ledger. It does not store Google session material or raw NotebookLM account/notebook/source identifiers. AI Memory is intentionally single-owner: export rows use one local owner namespace and the deployment has one active target. NotebookLM owner/private posture is verified by the extension in Chrome; the server receives only a notebook-salted subject proof and the normalized private posture, not the raw Google identity.

Chrome local storage contains the scoped connector token, raw target binding, account route, actual local notebook label, content-free delivery journal, raw provider source references, and latest worker status. Chrome local storage is not application-level encrypted. The exported title/body are used in memory for the create attempt and are not saved as a second local body copy by the connector.

The optional NotebookLM host permission is separate from normal page capture. The extension does not request Chrome's cookie API. CORS reflects only syntactically valid Chrome-extension origins. Pairing exchange also requires the one-time code; after pairing, scoped connector routes require the exact stored extension origin, connector token, and protocol version. Connector requests do not use browser cookies.

The emergency **clear local connector data** control removes local connector state and the optional permission. It does not revoke the server connection or erase a NotebookLM source. Use AI Memory's server-side controls first: ordinary **Disconnect** is blocked while work is unresolved, while **Emergency revoke** is reserved for suspected connector/profile compromise and explicitly acknowledges that queued snapshots will be purged and already-sent sources may still exist.

Private means single-owner/authenticated/default-unshared; it does not mean end-to-end encrypted. The original AI Memory item remains private application data under the normal backup trust model, but the additional frozen NotebookLM export title/body is specifically excluded from application, deployment/preflight, and off-site backup copies.

## Retention

| Data | Retention behavior |
|---|---|
| Frozen snapshot before any create | Up to seven days. |
| Frozen snapshot after a create may have been dispatched | Purged within 24 hours. |
| Pre-send cancellation | Purged immediately. |
| Stop checking | Purged immediately after explicit acknowledgement. |
| AI Memory item deletion | Matching snapshots are purged immediately. Unsent work becomes terminal cancelled; possibly sent work becomes terminal unresolved because a remote source may exist. |
| Request/target/content hash/source-alias ledger | Retained while linked for dedupe and truthful history. A terminal request is eligible for deletion after 30 days only when its AI Memory item is absent and its target is inactive; old unreferenced inactive targets/revoked connectors are then pruned. |
| Redacted request and operational events | No longer than 30 days; cleanup uses a five-minute safety margin. |
| Local unresolved possible-delivery journal | Retained until explicit positive/terminal reconciliation or emergency local clear. |
| Remote NotebookLM source | Never automatically deleted by this feature. |

The application sweeps at startup and every minute, with enqueue/claim cleanup as an additional trigger and a five-minute margin on the seven-day, 24-hour, and 30-day maxima. A separate mutating fallback, `brain-notebooklm-retention.timer`, runs every minute outside the app and invokes the exact immutable release bundle only when the app sweep is stale, failed, physically pending, or overdue. The separate `brain-notebooklm-operations.timer` is read-only and never purges. Live SQLite uses `secure_delete=ON`; after a frozen snapshot is removed, a successful WAL truncate checkpoint is required so stale title/body frames are not silently retained. A cleanup or checkpoint failure blocks new request intake and provider writes until retention health recovers while preserving read-only recovery.

Every supported application/off-site, Recall, and root-run deployment/restore path creates raw SQLite bytes only under its identity-specific owner-only `/run` directory after proving canonical `tmpfs` and capacity for four database copies plus 64 MiB. Low volatile capacity fails closed. SQLite copy/scrub/check commands run in independent process groups with both SQLite temp variables pinned to the stage. Scrub forces a copied WAL-mode database to isolated `journal_mode=DELETE`, uses memory temp storage, and rejects surviving SQLite sidecars. Each stage has a non-extendable three-minute deadline plus authenticated owner, command, and process-group identities. The copy is scrubbed and vacuumed, integrity-checked, copied to a hidden sanitized candidate, and its atomic link/rename passes a deadline-and-sanitized publication fence; a suspended or timed-out producer cannot publish later. A copied pre-create row whose payload was omitted is marked terminal `expired` with `backup_snapshot_omitted`; interrupted create/reconcile and poll work is normalized back to claimable recovery while its payload and lease are cleared and its opaque marker/source alias remain. Normal cleanup and three concurrently run one-minute identity janitors kill expired producers/groups and prove no stage file descriptor remains before unlink. Missing/invalid-fence orphans have a conservative 123-second bound and valid active stages a 244-second bound, inside the five-minute early-purge margin; reboot clears `/run`. A subsequent lock-scoped run also removes sanitized hidden publication residue older than ten minutes. The content-free safety ledger remains in the backup.

## Operational evidence

AI Memory persists only content-free NotebookLM analytics and transition facts. The item surface records `notebooklm.export_viewed` on a one-shot best-effort authenticated PATCH. Accepted export actions record `notebooklm.export_clicked`; limited-text confirmation and unchanged/idempotent replay record `notebooklm.limited_confirmed` and `notebooklm.request_deduped` in the request journal.

The journals also record setup/permission, target bind/rebind/health, connector disable/safe/emergency revocation, protocol and write-stop changes, claim/transitions, cancellation/stop-checking, item deletion, snapshot purge, expiry, and retention-sweep success/failure. They never include title/body, raw provider responses/errors, Google session material, or raw account/notebook/source identifiers. There is no third-party NotebookLM analytics feed in this release.

## Operator controls

The feature uses three dependency-ordered rollout stages:

1. UI/setup;
2. durable queue; and
3. a tightly controlled provider-write window for synthetic canary content after all pre-canary gates pass.

Production is currently at Stage 1 only: UI/setup surfaces are visible, queueing is paused, provider writes are off, and item export is unavailable. Ongoing or real-content provider writes remain off until the private synthetic canary passes. Enabling writes temporarily for the canary is not real-content enablement.

The immutable deployment policy defaults the NotebookLM feature-flag tuple to dark (`0:0:0`). An explicit preserve policy is available only for a dependency-ordered tuple and verifies that deployment did not change it. The currently verified production tuple is UI-only `1:0:0`.

`BRAIN_NOTEBOOKLM_REMEDIATION_POLICY` defaults to `strict`, so a host already stopped by `provider_write_blocked` cannot be mutated by a normal deployment. The only remediation lane is the explicit value `preserve_existing_provider_block`: deployment proves the block remains `1` before and after, leaves it set, records the exception in release evidence, and permits the checker to ignore only that existing block. Failed or stale retention, a pending physical purge, overdue snapshots, and work unresolved beyond 24 hours remain blocking in either mode.

Provider-write disablement stops new creates while preserving known-source polling and read-only marker reconciliation. Provider source-list, create-response, and status protocol/schema drift latches that stop immediately; other normalized connector/transport failures—including retryable network/server outcomes and uncertain create outcomes—trip it after three consecutive failures. The database-backed safety gate also blocks new intake/create after a retention failure, when no successful retention sweep is recent enough, or when any frozen snapshot is overdue. An ordinary protocol-drift stop may be cleared only after the operator attests that the connector was updated and the target was revalidated and the server verifies a fresh healthy private target. `multiple_marker_matches`, `provider_source_identity_reused`, and `restore_reconciliation_required` are deliberately not clearable by that generic reset: V1 has no approved exact-evidence clear path for those duplicate-risk conditions.

Settings exposes retention health, last successful/failed sweep, normalized failure reason/streak, durable physical-purge-pending state, overdue snapshots, and post-dispatch work unresolved beyond 24 hours. The hardened read-only `brain-notebooklm-operations.timer` runs `check:notebooklm-operations:ready` approximately every minute and reports failure for a provider block, failed/stale sweep, pending physical purge, overdue snapshot, or unresolved-over-24-hour request. It is intentionally distinct from the mutating `brain-notebooklm-retention.timer` fallback.

Ordinary **Disconnect** revokes the scoped token and deactivates the target only when no export remains unresolved. **Emergency revoke** is the compromise-response path: it immediately revokes live scoped tokens, terminalizes outstanding work, purges snapshots belonging to that unresolved work, and warns that already-sent sources may still exist. Neither mode changes or deletes a remote NotebookLM source.

Immediate write-stop triggers include a wrong-target write, credential/session leakage, an automatic duplicate, `Ready` before the exact source is ready, a target/privacy/capacity preflight bypass, provider schema drift, or any automatic deletion of an unverified source.

Disconnect/rebind is blocked while unresolved work exists. Server rollback and extension rollback are separate; neither deletes remote sources. Migration 026 is additive and has no destructive down migration. A pre-026 server can be restored only before setup or work exists: either the freshly migrated empty/default state or the equivalent first-dark-boot state containing only zero-count retention-success heartbeats. Any other event, setup, request, counter/failure, or pending physical purge requires a feature-aware server. The mutating fallback timer and any running oneshot are stopped before the final compatibility proof and runtime switch; timer state is restored only after the immutable release identity, and a pre-026 target keeps the retention unit disabled.

Database restore is stricter because the remote notebook may contain sources created after the restored ledger. The operator must pre-stop both NotebookLM timers plus any running retention oneshot; the hardened restore rejects pre-026 snapshots, proves those units remain inactive before and after acquiring its locks, and latches schema-026 snapshots to `restore_reconciliation_required` before publication. Restarts, deployments, protocol events, and the ordinary settings reset cannot remove that block. Provider writes must remain off while the owner inspects the exact bound owner-only private target for every post-backup marker/source and records redacted backup hash/time, target-binding fingerprint, inspection time, and dispositions. This release intentionally has no approved unblock command; a separately reviewed feature-aware command must verify that evidence atomically. Direct SQL is not an approved recovery procedure. After `brain` restarts, resume both timers, verify each is enabled and active, and execution-prove the retention oneshot with `Result=success`; the provider-write latch remains set throughout.

## Release and synthetic-canary gate

Before a signed-in provider canary or real-content enablement, release evidence must include:

- migration apply/reapply, hash, integrity, foreign-key, backup, restore, and audited rollback compatibility;
- server unit/route/state/race/retention/privacy tests and a production build;
- extension type/unit/build checks plus the Product CI Manifest V3 zip, release manifest, checksum, and GitHub attestations;
- successful verification/install through `scripts/install-verified-extension-release.mjs` into the stable unpacked-extension path without origin drift;
- frozen-snapshot scrubbing/vacuum proof for application, deployment, and off-site backup copies, plus a healthy read-only one-minute operational audit and successful immutable execution proof for the mutating one-minute fallback;
- browser responsive/accessibility validation;
- no open release-blocking adversarial findings;
- a dedicated owner-only private synthetic notebook selected locally;
- target/account/privacy/capacity inspection;
- exactly one synthetic copied-text create and exact-source readiness;
- unchanged-content dedupe and updated-version confirmation;
- a controlled lost-response proof that reconciles without a second create;
- independent write-stop proof while recovery reads remain safe; and
- redacted retention/observability evidence with no account, target, source, marker, cookie, or content leakage.

If any live read needed for target, owner, privacy, occupancy, source identity, readiness, or reconciliation cannot be interpreted safely, provider writes remain off and **Export as .md** remains the fallback.

The [production release-evidence record](https://github.com/arunpr614/ai-brain/blob/0b297c214715261194c0c90e11ebc37d2ac5bc5b/docs/feature-council/notebooklm-sync/release/production-release-evidence-2026-07-22.md) covers the protected-main artifact and UI-only deployment at an immutable documentation commit. It remains incomplete for the signed-in canary, owner-only real-content enablement, and GitHub Wiki publication verification. Tests, controls, and a visible production UI do not by themselves prove the consumer NotebookLM workflow.

The detailed data and canary contract is maintained in `docs/datawiki/NotebookLM-One-Click-Export.md` in the repository.

## Relevant implementation

- Product boundary: `docs/feature-council/notebooklm-sync/product/ONE_CLICK_EXPORT_DELIVERY_CONTRACT_2026-07-21.md`
- Data model: `src/db/migrations/026_notebooklm_export.sql`
- Server state and controls: `src/db/notebooklm-export.ts`, `src/db/notebooklm-export-control.ts`
- Mapper/security/API contracts: `src/lib/notebooklm/`
- Item and setup UI: `src/components/notebooklm-export.tsx`, `src/components/notebooklm-connector-setup.tsx`
- Server routes: `src/app/api/items/[id]/notebooklm-export/`, `src/app/api/settings/notebooklm-export/`, `src/app/api/notebooklm/`
- Local connector: `extension/src/notebooklm/`, `extension/src/options.ts`, `extension/src/background.ts`, `extension/manifest.json`
- Retention/operations: `scripts/notebooklm-retention.ts`, `scripts/dist/notebooklm-retention-prod.mjs`, `scripts/check-notebooklm-operations.mjs`, `scripts/scrub-notebooklm-backup.mjs`, `scripts/verified-volatile-backup-staging.sh`, `scripts/cleanup-volatile-backup-staging.mjs`, `scripts/deploy/brain-backup-staging-cleanup.service`, `scripts/deploy/brain-backup-staging-cleanup.timer`, `scripts/deploy/brain-notebooklm-retention.service`, `scripts/deploy/brain-notebooklm-retention.timer`, `scripts/deploy/brain-notebooklm-operations.service`, `scripts/deploy/brain-notebooklm-operations.timer`, `src/lib/backup.ts`
- Release compatibility/stable extension install: `scripts/check-release-migration-compatibility.mjs`, `scripts/install-verified-extension-release.mjs`, and immutable-release scripts

## Related pages

- [NotebookLM Synchronization Research](NotebookLM-Synchronization-Research)
- [Browser Extension](Browser-Extension)
- [Data Model and Storage](Data-Model)
- [APIs and Integrations](APIs-and-Integrations)
- [Security, Privacy, and Redaction](Security-Privacy-and-Redaction)
- [Deployment and Operations](Deployment-and-Operations)
- [Backups and Restore](Backups-and-Restore)
