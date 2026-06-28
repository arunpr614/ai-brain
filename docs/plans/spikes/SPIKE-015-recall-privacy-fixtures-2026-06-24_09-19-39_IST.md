# SPIKE-015 — Can Recall sync evidence be captured without leaking private content or secrets?

| Field | Value |
|---|---|
| **Spike ID** | SPIKE-015 |
| **Date** | 2026-06-24 09:19 |
| **Author** | AI agent (Codex) |
| **Time box** | Estimate: 2 hours; actual: ~35 minutes |
| **Triggered by** | Recall daily sync V2 gate GATE-003: privacy-safe persistence before live API work |
| **Blocks** | Live Recall API spikes, real-payload reports, PRD readiness |
| **Verdict** | PROCEED-WITH-CHANGES; required redaction helper follow-up completed |

## Question

Can the Recall sync tooling be tested, logged, and reported without leaking private Recall content or secrets?

## Method

Inspected existing AI Brain privacy, artifact, and logging patterns without using live Recall data or secrets.

Commands and checks performed:

- Searched code and docs for existing redaction/sanitization helpers.
- Inspected capture artifact storage and artifact sanitizer.
- Inspected Android share log sanitization tests.
- Inspected owned-media transcript sanitizers.
- Inspected `.gitignore` and environment hygiene script.
- Verified `.env`, `data/artifacts/captures/...`, and `tmp/...` are gitignored through `git check-ignore`.

No live Recall API calls were made. No API keys were read. No real Recall content was saved.

## Evidence

### Existing artifact storage is capped and gitignored, but not Recall-safe by itself

`src/lib/capture/artifacts.ts` stores capture artifacts below `data/artifacts/captures` by default:

```text
src/lib/capture/artifacts.ts:13
const DEFAULT_ARTIFACT_ROOT = resolve(process.cwd(), "data/artifacts/captures");
```

The artifact caps are kind-based:

```text
src/lib/capture/artifacts.ts:15-23
youtube_oembed_json: 64 KB
youtube_data_api_json: 256 KB
youtube_timedtext_xml: 2 MB
html_snapshot: 512 KB
metadata_json: 128 KB
rss_entry_json: 512 KB
user_text: 256 KB
```

The sanitizer only changes HTML string bodies:

```text
src/lib/capture/artifacts.ts:144-150
if (!artifact.content_type.includes("html")) return artifact.body;
...
.replace(/\b(access_token|bearer|cookie)=([^"&\s]+)/gi, "$1=[redacted]");
```

Implication: JSON, plain text, exception text, report JSON, and Recall chunk bodies would not be redacted by this helper.

### Artifact DB rows can store raw error messages

Artifact write failures persist `error_message`:

```text
src/db/capture-artifacts.ts:23-40
INSERT INTO capture_artifacts (... error_message ...)
...
input.error_message ?? null
```

Implication: Recall sync must sanitize thrown error messages before writing DB run records or artifact failure rows.

### Existing Android share logs intentionally drop raw details

`sanitizeShareLogMessage()` returns only a stable code/status:

```text
src/lib/android-share/result.ts:351-355
export function sanitizeShareLogMessage(code: string, details?: unknown): string {
  const stable = stableCode(code);
  if (typeof details === "number") return `${stable}:status_${details}`;
  return stable;
}
```

The test verifies private URI and filename are not persisted:

```text
src/lib/android-share/result.test.ts:252-272
sanitizeShareLogMessage("share.pdf.read-failed", {
  uri: "content://private/report.pdf",
  token: "a".repeat(64),
});
...
assert.equal(raw.includes("content://"), false);
assert.equal(raw.includes("report.pdf"), false);
```

This is a good pattern for Recall dry-run logs: stable codes and counts, not raw payloads.

### Existing transcript sanitizers are narrow but useful references

Owned-media STT sanitizes identifiers:

```text
src/lib/capture/transcripts/owned-media-stt.ts:554-563
.replace(/Bearer\s+\S+/gi, "Bearer <redacted>")
.replace(/(?:api[_-]?key|token|secret|password)=\S+/gi, "<redacted>")
.slice(0, 160);
```

OpenAI-owned media STT returns `<redacted>` if the whole identifier looks secret-bearing:

```text
src/lib/capture/transcripts/openai-owned-media-stt.ts:303-315
if (/Bearer\s+\S+/i.test(cleaned) || /(?:api[_-]?key|token|secret|password)=\S+/i.test(cleaned)) {
  return "<redacted>";
}
```

Implication: Recall should get a shared redaction helper instead of copying another narrow private function.

### Local secret and artifact paths are gitignored

`git check-ignore` confirmed:

```text
.gitignore:26:.env    .env
.gitignore:32:data/   data/artifacts/captures/example.json
.gitignore:85:tmp/    tmp/recall-response.json
```

`.gitignore` ignores environment files, `data/`, and `tmp/`:

```text
.gitignore:25-36
.env
.env.local
.env.*.local
!.env.example
data/
data/brain.sqlite
data/brain.sqlite-shm
data/brain.sqlite-wal
data/backups/

.gitignore:83-85
.turbo/
tmp/
```

### Environment hygiene has a secret scan, but only for Telegram today

`scripts/check-env-gitignored.sh` checks `.env` and Telegram token patterns:

```text
scripts/check-env-gitignored.sh:26-40
.env must not be tracked and must be gitignored

scripts/check-env-gitignored.sh:48-57
Telegram secrets must not appear in tracked files
```

Implication: a later Recall implementation should extend secret checks for `RECALL_API_KEY` and Recall bearer values.

## Findings

1. AI Brain has several good privacy patterns, but no shared Recall-ready redaction helper.
2. Existing capture artifact storage is capped and gitignored, but its sanitizer only redacts HTML token-like patterns. It does not protect JSON/plain-text Recall chunks.
3. Android share logging demonstrates the safest pattern: store stable codes and status values, not raw error details.
4. Transcript provider code demonstrates useful secret-pattern redaction, but those helpers are private and narrow.
5. `.env`, `data/`, and `tmp/` are gitignored, so approved real response captures can be stored outside tracked files if the user explicitly approves.
6. The current environment hygiene script does not scan for Recall API key patterns.

### Required synthetic fixtures

The Recall fixture set should include:

| Fixture | Purpose |
|---|---|
| `recall-list-basic.json` | Normal list response with ID, title, created_at, source_url. |
| `recall-list-empty.json` | Empty date window. |
| `recall-list-no-url.json` | Card without `source_url`. |
| `recall-detail-basic.json` | Detail response with ordered chunks. |
| `recall-detail-exact-50-chunks.json` | Truncation/fidelity detection. |
| `recall-detail-empty-chunks.json` | Metadata-only or blocked classification. |
| `recall-detail-malformed-fields.json` | Null/missing/malformed fields. |
| `recall-error-401.json` | Auth failure. |
| `recall-error-422.json` | Validation failure. |
| `recall-error-429.json` | Rate limit. |
| `recall-error-500.json` | Server failure. |

All fixtures should be synthetic unless the user approves a specific real sample.

### Redaction test table

Any Recall probe or importer must satisfy this table before live API calls:

| Input class | Example input | Expected output |
|---|---|---|
| Recall API key | `RECALL_API_KEY=sk_abc123456789abcdef` | `RECALL_API_KEY=<redacted:secret>` |
| Bearer header | `Authorization: Bearer sk_abc123456789abcdef` | `Authorization: Bearer <redacted:token>` |
| Token query string | `https://example.com/a?token=abc&signature=def` | `https://example.com/a?token=<redacted>&signature=<redacted>` |
| Signed URL | `https://files.example.com/doc.pdf?X-Amz-Signature=abc` | query value redacted |
| Cookie | `Cookie: session=abc; recall=def` | `Cookie: <redacted:cookie>` |
| Full chunk body | long paragraph from Recall card | `<redacted:content length=N>` or omitted |
| Private title marked sensitive | `Private medical note` | `<redacted:title>` |
| Stack trace with token | `Error: Bearer sk_...` | stack frame preserved, token redacted |
| Filename with private title | `Private medical note.pdf` | safe generated fixture name or `<redacted:filename>` |

## Implementation recommendation

Do not run live Recall API spikes yet.

Before SPIKE-013 or SPIKE-014, add or prototype a Recall-safe redaction layer with these properties:

1. Shared helper, preferably under `src/lib/security/redaction.ts` or a spike-only script that can later move there.
2. Tests for the redaction table above.
3. A `redactRecallReportValue()` or equivalent that recursively sanitizes:
   - strings;
   - arrays;
   - plain objects;
   - `Error` objects;
   - URL query strings;
   - report JSON.
4. Dry-run report shape that stores counts, IDs if allowed, redacted titles if needed, redacted URLs, status codes, and fidelity states, but no full chunks.
5. Approved real captures, if any, must live in `data/artifacts/recall-sync/` or `tmp/recall-sync/` and remain untracked.
6. Extend secret hygiene checks later to catch committed `RECALL_API_KEY=sk_...` and `Authorization: Bearer sk_...`.

Suggested status for the project tracker:

- SPIKE-015: `Done - PROCEED-WITH-CHANGES`
- New required task before live API: `Add reusable Recall redaction helper/test table`
- Phase B live API spikes: still blocked until user API approval and redaction helper/test table are complete

### Follow-up completed

The required redaction helper/test table was implemented immediately after this spike:

- `src/lib/security/redaction.ts`
- `src/lib/security/redaction.test.ts`

Focused validation passed:

```text
node --import tsx --test src/lib/security/redaction.test.ts

# tests 6
# pass 6
# fail 0
```

This clears the helper/test-table gap for future Recall probe scripts. Live Recall API work is still blocked on user approval for API-key use, controlled cards, and reporting preferences.

## Risks / gaps surfaced

- Artifact sanitizer currently returns non-HTML bodies unchanged, so it must not be used as the only Recall privacy control.
- Existing private sanitizers are duplicated and narrow; copying them may miss signed URLs, cookies, stack traces, and JSON payloads.
- Report files themselves are tracked, so spike reports must never include full real Recall chunks.
- Real Recall titles may be sensitive. The user must decide whether titles can appear in local reports.
- The future `recall_sync_runs.report_json` field could become a private-data leak unless every write path uses the redaction helper.
