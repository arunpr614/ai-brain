# Recall Key Rotation Evidence File Secret Guard Execution Report

Created: 2026-06-25 02:15 IST
Owner: Codex
Status: Done for offline scope; no live Recall API call was made in this change

No live Recall API call was made in this change.

## Purpose

Make the key-rotation evidence gate reject private evidence JSON that accidentally stores secret-shaped values.

The private key-rotation evidence file is ignored and owner-only, but it now carries more live-probe metadata. The gate should fail closed if that metadata ever includes a Recall API key, bearer token, cookie, or signed/tokenized URL shape, and the failure output must not echo the suspect value.

## Files Changed

| File | Change |
|---|---|
| `scripts/check-recall-key-rotation-evidence.mjs` | Scans the private evidence JSON text for secret-shaped API-key, bearer-token, cookie, and signed/tokenized URL patterns. Findings use generic rule names and do not include value previews. |
| `scripts/smoke-recall-key-rotation-evidence.mjs` | Adds a negative fixture with a fake secret-shaped value and proves the gate fails without echoing that value. |

## New Fail-Closed Rules

The gate now rejects private evidence files with:

- `key_rotation_evidence_contains_recall_api_key_assignment`
- `key_rotation_evidence_contains_authorization_bearer`
- `key_rotation_evidence_contains_bare_bearer_token`
- `key_rotation_evidence_contains_sk_secret`
- `key_rotation_evidence_contains_cookie_header`
- `key_rotation_evidence_contains_signed_or_tokenized_query`

The output includes the rule and a generic remediation message only. It does not include the matching value, surrounding line, or preview.

## Validation

```text
node --check scripts/check-recall-key-rotation-evidence.mjs
node --check scripts/smoke-recall-key-rotation-evidence.mjs
node --check scripts/record-recall-key-rotation-evidence.mjs
node --check scripts/smoke-recall-key-rotation-evidence-record.mjs
npm run smoke:recall-key-rotation-evidence
npm run smoke:recall-key-rotation-evidence-record
```

Smoke coverage now proves:

- stale private env mtime fails;
- fresh private env mtime passes;
- fresh private evidence file passes when env mtime is stale;
- stale private evidence file fails when env mtime is stale;
- private evidence file with secret-shaped content fails without echoing the value;
- failure output does not print env file contents.

## Current Real Gate State

`npm run recall:first-apply:status` still reports `blocked_key_rotation_evidence`.

This change does not rotate the Recall API key, record real private evidence, refresh proof, run first capped apply, deploy, enable the scheduler, stage, commit, push, create a pull request, or advance a checkpoint.
