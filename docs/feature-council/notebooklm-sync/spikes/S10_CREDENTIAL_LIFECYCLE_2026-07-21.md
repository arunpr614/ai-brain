# Spike S10 — Credential-expiration and permission-state handling

- **Run time:** 2026-07-21 18:20–18:48 IST
- **Gate outcome:** Fake state-machine evidence only; no official authorization flow attempted.
- **Hypothesis:** Authorization state can fail closed on missing/expired/revoked credentials, subject/ACL mismatch, missing scope, license, target permission, or Drive access without echoing credential material or broadening privileges.
- **Interface/version:** Pure local authorization projection in `sync-model.mjs`; no Google SDK/API.
- **Authorization/scopes:** No real authorization. The synthetic required scope string is `drive.file`; the fake token sentinel must never appear in output.
- **Synthetic input:** Ten state cases: missing; expired+successful fake refresh; expired+`invalid_grant`; revoked; wrong subject alias; missing scope; missing license; missing target permission; missing Drive access; changed ACL digest.
- **Expected result:** Only expired+valid refresh authorizes, with exactly one refresh attempt. Missing/revoked/invalid grant returns `reauth_required`; identity/ACL mismatch blocks; missing privilege returns a safe permission reason. No token or raw credential object appears in the result.
- **Observed result:** All ten state/reason pairs matched exactly. The token sentinel and credential object were absent. Provider error normalization mapped 401/403/429/5xx into safe fixed categories without preserving raw messages.
- **Command:** `node --test docs/feature-council/notebooklm-sync/spikes/prototype/sync-model.test.mjs`
- **Evidence:** Authorization and normalization cases passed within 21/21 model tests; combined local suite 46/46.
- **Attempts/retries:** Expired-valid case modeled one refresh; every invalid/revoked/permission case stopped without retry or scope expansion.
- **Created source IDs:** None.
- **Cleanup:** Fake data existed only in process memory.
- **Verdict:** **Pass for the local fail-closed contract; official token lifecycle remains untested.**
- **Limitations/next action:** This does not prove refresh-token issuance, revocation propagation, credential-store integration, subject claims, IAM/license behavior, or least-privilege scopes for the user's edition. Those remain Gate 0/live-spike dependencies.
