# NotebookLM Synchronization Spike Protocol

No live Google or unofficial integration test may begin until `ACCOUNT_ELIGIBILITY.md` records a gate outcome that explicitly permits it.

## Required preamble for every spike

- **Hypothesis:** A falsifiable statement.
- **Tool/API and release stage:** Exact supported interface and version/date.
- **Authorization:** Official local flow, scopes, and why each scope is needed; never record secret material.
- **Synthetic input:** Maximum ten total AI Brain items across all spikes; no real user content or copyrighted payloads.
- **Marker:** Prefix every created object `AI-BRAIN-SPIKE-<UTC-date>-<run-uuid>-<case-id>` so reruns cannot collide.
- **Expected result and success criteria:** Observable and edition-specific.
- **Failure conditions:** Authentication, permission, quota, validation, processing, timeout, or reconciliation outcomes.
- **Security constraints:** No content/token/cookie/private URL/account identifier logging.
- **Cleanup:** Record every successful, failed, or ambiguously accepted create in a private local run ledger, and delete only exact spike-created objects.
- **Time/retry limit:** No more than two retries for the same failure; no unofficial tool may receive more than 60 minutes.

## Mandatory preflight

Before a live write:

1. Confirm the permitted edition/path, supported interface version, release stage, region, and dedicated synthetic target.
2. Bind the authorization to an allowlisted Google subject alias and exact target alias. Stop on account or target mismatch.
3. Record exact granted scopes without recording tokens. Stop on unexpected scope expansion.
4. Record a privacy-preserving baseline ACL digest and source/file inventory. Stop on unexpected sharing.
5. For Enterprise, confirm project/API, license, IAM, notebook Owner/Editor access, and current Preview acceptance.
6. For Drive/Docs, confirm `drive.file`, one stable private app-created Doc, a private `appProperties` marker, and revision-aware updates.
7. Record Enterprise usage-logging state. Keep it off unless logging is the separately approved test.
8. Persist an ignored private `0600` pre-write manifest with the run UUID, marker, desired content hash, API version/location alias, expected transitions, and cleanup target.

The manifest must exist before the remote call. It may contain raw resource IDs needed for cleanup but must never be committed or copied into a public report.

## Shared safety rules

1. Use a dedicated test notebook.
2. Record the notebook only as a redacted alias in committed artifacts.
3. Verify authorization without printing token values.
4. Do not store credentials in the repository or create persistent authentication hooks.
5. Do not modify or delete pre-existing notebook sources.
6. If a provider create may have succeeded but its response is lost, set `needs_reconcile`; never retry before the reconciliation decision tree completes.
7. A queued request is not a successful synchronization; poll and record the documented terminal state where supported.
8. After each spike group, reconcile the source-ID ledger and prove cleanup.
9. Successful, failed, and ambiguous potentially accepted creates all consume the ten-source limit.
10. Provider errors are recorded only through a fixed safe taxonomy; never persist raw Google error objects.
11. A wrong account, wrong target, unexpected collaborator, unknown API status, or cleanup ambiguity stops the spike group.

## Lost-response reconciliation

1. Query only through the documented list/get surface for the bound target.
2. Match the unique run marker and expected content hash/metadata available through that surface.
3. If exactly one matching object exists, bind its provider ID and continue terminal-state observation.
4. If none exists, retry only when the supported provider surface defines a conclusive visibility horizon and that horizon has elapsed. Then allow at most one ambiguity retry within the global two-retry limit. Without conclusive absence evidence, stop at `manual_reconcile` and do not create again.
5. If more than one exists or the interface cannot perform a reliable search/list, stop and require manual reconciliation. Do not create again.

For Drive/Docs, reconcile by the private `appProperties` marker, stable file ID, revision, and content hash. Do not search user file content or require a broad Drive scope.

## Path-specific success semantics

### Gemini Notebook Enterprise Preview

- Start with a single raw-text source per call; do not assume batch atomicity.
- Record provider acceptance and every observed source status separately.
- Success requires the documented terminal complete state and an exact source mapping.
- A deletion acknowledgement or `PENDING_DELETION` is not cleanup proof; poll to absence or a documented terminal state.

### Google Docs/Drive staging

- Reuse one stable app-created file ID and use revision-aware Docs updates.
- Application success means only **Drive document updated**.
- Notebook attachment, refresh, citation behavior, and source removal are separate manual observations.
- Never label a successful Drive write as “NotebookLM synchronized.”
- Removing the NotebookLM source, deleting/retaining the Drive file, and revoking OAuth are independent cleanup decisions.

## Credential handling

- Use a temporary isolated official user-auth profile for a spike.
- Store tokens only in the OS credential store or approved private auth cache outside the repository.
- Record credential type, subject alias, and granted scopes—not token values, emails, credential paths containing identity, or raw IDs.
- Revoke the spike grant and remove temporary credential material after cleanup.
- On `invalid_grant`, revocation, license loss, or required-scope denial, stop writes and record `reauth_required`; never escalate privileges automatically.

## Evidence template

```markdown
# Spike <ID> — <name>

- Run date/time and timezone:
- Gate outcome:
- Hypothesis:
- Interface/version:
- Authorization/scopes:
- Account and target aliases verified:
- Baseline ACL/inventory digest:
- Usage-logging state:
- Synthetic input and marker:
- Desired content hash and pre-write manifest recorded:
- Expected result:
- Observed result:
- Status-transition history:
- Attempts/retries:
- Reconciliation result:
- Created source IDs (redacted in public artifact):
- Cleanup result:
- Credential revocation/purge result:
- Verdict: Pass / Fail / Inconclusive / Not applicable
- Limitations and next action:
```

## Review status

The 2026-07-21 security/QA review findings were incorporated. Passing this document review does not authorize authentication or execution; `ACCOUNT_ELIGIBILITY.md` remains controlling.
