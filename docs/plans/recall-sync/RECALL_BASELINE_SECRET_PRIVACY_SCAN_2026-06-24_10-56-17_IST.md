# Recall Baseline Secret And Privacy Scan

Created: 2026-06-24 10:56 IST
Status: Passed with allowed placeholders/fake test values only
Scope: Recall-owned docs, scripts, tests, schema, package scripts, deploy updates, and redaction helpers. Generated `scripts/dist/**` and ignored `data/**` were excluded.

## Command Shape

```bash
rg -n --glob '!scripts/dist/**' --glob '!data/**' \
  -e 'sk_' \
  -e 'Bearer' \
  -e 'RECALL_API_KEY=' \
  -e 'Cookie:' \
  -e 'x-amz-signature' \
  -e 'access_token' \
  -e 'refresh_token' \
  -e 'password' \
  -e 'secret' \
  docs/plans/recall-sync \
  docs/plans/spikes/SPIKE-0*recall* \
  scripts/sync-recall.ts \
  scripts/recall-first-apply-preflight.mjs \
  scripts/recall-scheduled-apply.sh \
  scripts/check-recall-scheduler-artifacts.mjs \
  scripts/spikes/recall-rest-enumeration.ts \
  scripts/spikes/recall-content-fidelity.ts \
  src/lib/recall \
  src/db/recall-sync.ts \
  src/db/migrations/020_recall_sync.sql \
  src/db/migrations/020_recall_sync.test.ts \
  src/lib/security/redaction.ts \
  src/lib/security/redaction.test.ts \
  package.json \
  scripts/deploy.sh \
  scripts/deploy/brain-recall-sync.service \
  scripts/deploy/brain-recall-sync.timer
```

## Result

No real Recall API key, bearer token, cookie, signed URL secret, access token, refresh token, or private Recall content was identified.

Observed matches were expected and allowed:

| Category | Examples | Verdict |
|---|---|---|
| Documentation placeholders | `RECALL_API_KEY=<redacted>`, `RECALL_API_KEY=sk_...`, `Authorization: Bearer <key>` | Allowed placeholder text. |
| Fake test values | `sk_test_client_secret_12345`, `sk_abc123456789abcdef`, `sk_live_recall_secret_1234567890` | Allowed synthetic values used to prove redaction. |
| Redaction implementation | regexes for `Bearer`, `sk_`, cookies, query tokens, and secrets | Required safety code. |
| Runtime env usage | `Authorization: Bearer ${apiKey}`, `Authorization: Bearer ${token}` | Expected runtime construction from env; no literal secret committed. |
| Existing deploy health check | `Authorization: Bearer ${token}` in `scripts/deploy.sh` | Existing non-Recall env-token pattern; not a committed secret. |

## Follow-Up Rules

- Re-run this scan before any public report, commit, or PR.
- After live Recall testing, scan both public docs and private evidence paths before summarizing results.
- Do not paste live Recall keys into docs, chat, command output, or fixture files.
- Keep generated bundles and private evidence out of git (`scripts/dist/**` is ignored through `dist/`; `data/**` is ignored).
