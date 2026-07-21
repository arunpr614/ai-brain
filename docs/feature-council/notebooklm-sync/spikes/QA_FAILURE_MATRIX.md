# NotebookLM Synchronization — Synthetic QA and Failure Matrix

**Created:** 2026-07-21
**Execution state:** Credential-free mapper/state/SQLite/fake-provider cases passed on 2026-07-21; live Google cases require Gate 0 authorization.

| Failure or boundary | Enterprise oracle | Drive/Docs oracle | Pass criterion |
|---|---|---|---|
| Exact rerun | Existing completed source mapping | Same Drive file ID and desired hash | No new remote object; no unnecessary write |
| Response lost after acceptance | Reconcile exact bound target + marker + desired hash through supported inventory | Find exact private application marker on the stable file; read file ID/revision/content hash | Exactly one binds; multiple block. Zero permits one bounded retry only after a supported conclusive visibility horizon; otherwise manual reconciliation |
| Partial or mixed batch | Reconcile every marker and terminal state | Invalid Docs batch leaves document unchanged | Successes retained, failures explicit, cursor safe |
| Pending/tentative ingestion | Poll documented source state | NotebookLM state is not observable | Bounded polling; queued is never called success |
| Permanent ingestion error | Map documented failure enum | Show Drive result separately from Notebook state | No generic retry of a permanent failure |
| Two overlapping triggers | Fenced per-target lease | Same | One writer; stale worker cannot commit |
| Crash after remote write | Resume from durable `needs_reconcile` | Re-read stable file and revision | Reconcile before any retry |
| `429`, `503`, timeout | Honor `Retry-After`; exponential backoff and jitter | Same | No duplicate; pending work retained |
| Source-cap race | Preflight with safety headroom; classify provider error | Notebook capacity remains manual/unobservable | Stop creation; never rotate target silently |
| Access token expires | One refresh | One refresh | Continue without logging token |
| Grant revoked / `invalid_grant` | Stop writes | Stop writes | `reauth_required`; pending work retained |
| Missing scope, IAM, or license | `403`; no escalation | `403`; no scope broadening | Clear safe action; zero mutation |
| Drive-backed Enterprise source denied | Documented Drive error | File/permission error | Raw-text Enterprise path unaffected; Drive path pauses |
| Notebook deleted or wrong location | Preflight `404`/mismatch | Manual target unavailable | Never create in a fallback target |
| Drive file deleted or trashed | N/A | Detect missing stable file | Do not silently create a replacement needing a new import |
| Collaborator edit | ACL/source inventory changed | `requiredRevisionId` conflict | Pause or safe merge; no blind overwrite |
| API schema or enum drift | Unknown field/state | Unknown API/permission response | Fail closed; Preview kill switch |
| Cleanup failure | Poll delete/absence | Manual Notebook removal attestation plus Drive state | Unresolved cleanup stays visible |
| Equal item timestamps | Outbox sequence drives order | Same | Every item exported once regardless of timestamp |
| Late insertion with older `captured_at` | Outbox sequence includes item | Same | Item is not skipped |
| Poison item between healthy items | Per-item retry isolates it | Same | Healthy later items progress; poison state remains explicit |
| Sensitive item excluded | Policy blocks before payload construction | Same | No content reaches adapter or logs |
| Wrong Google subject | Subject mismatch | Subject mismatch | Connection pauses before a target call |
| Unexpected target sharing | ACL digest mismatch | ACL digest mismatch | Write is blocked pending explicit consent |

## Mandatory blockers

- If Enterprise cannot uniquely reconcile a potentially accepted source create, unattended automatic sync is no-go because no documented provider idempotency key exists.
- Begin Enterprise live testing with one source per request. Do not rely on unknown batch atomicity.
- Drive/Docs success can mean only “Drive document updated.” If verified NotebookLM ingestion, refresh, or deletion is required, this lane is no-go.
- A discovery cursor may advance only after every selected event has durable per-item state. Provider failure must not lose work.
- Failed, unknown, capped, or unreconciled items must remain visible and independently retryable.

## Evidence standard

Before each live write, create an ignored private `0600` manifest recording:

- UTC timestamp, run UUID, case ID, API version, endpoint/location alias, and tool version;
- target/account aliases, not raw identifiers;
- source type, expected content hash, byte/word estimate, and intended operation;
- baseline source/file count and privacy-preserving ACL digest;
- expected transitions and exact cleanup target.

After the call, append:

- sanitized request/status identifier, normalized error, latency, and attempt;
- every observed state transition;
- post-state inventory/hash/revision and duplicate count;
- cleanup request and terminal proof;
- unresolved objects and exact owner action.

Successful, failed, and ambiguous accepted attempts all consume the hard-limit ledger. No blind retry is allowed.
