# Telegram Capture Bot Adversarial Audit

**Created:** 2026-06-09 21:46:36 IST
**Repo:** `ai-brain/phase2`
**Branch audited:** `codex/v0.7.2-stabilization-clean`
**Purpose:** Complete adversarial review of the Telegram bot capture implementation as a capture surface alongside Android and web.

---

## Executive Verdict

The Telegram bot implementation is useful and structurally sane: it uses Telegram's webhook secret header, restricts capture to a configured owner user ID, reuses the existing URL/YouTube/PDF/note capture pipeline, and has passing unit coverage for the happy paths and basic auth gates.

However, I would not call it production-hardened yet. The main risks are not in the basic idea; they are in the public webhook's edges:

1. **The bot does not actually tag captured items as `telegram`**, despite schema/docs implying that bot-originated items can be identified later.
2. **A leaked webhook secret becomes a full forged-capture capability**, because the owner ID is trusted from the JSON body after the secret header passes.
3. **The bot can leak capture acknowledgements into Telegram groups** if the owner uses it outside a private chat.
4. **There is no idempotency/replay protection**, so Telegram retries, duplicate deliveries, or forged repeats can create duplicate notes/PDFs.
5. **The deployment script references a Telegram smoke test that does not exist**, so the live validation gate is currently aspirational.
6. **Local git history/stash contains a high-risk Telegram provisioning trail** from an earlier branch; the clean branch is okay, but the local repo still needs secret-hygiene cleanup before any future push from `main` or the dirty branch.

The short version: the feature is good enough for careful single-user experimentation, but it needs a focused hardening pass before it should be treated as a reliable always-on capture channel.

---

## Scope Reviewed

### Source Code

- `src/app/api/telegram/webhook/route.ts`
- `src/lib/telegram/webhook-handler.ts`
- `src/lib/telegram/dispatch.ts`
- `src/lib/telegram/client.ts`
- `src/lib/telegram/types.ts`
- `src/db/migrations/009_telegram_source_type.sql`
- `src/db/client.ts`
- `src/db/items.ts`
- Related capture endpoints:
  - `src/app/api/capture/url/route.ts`
  - `src/app/api/capture/note/route.ts`
  - `src/app/api/capture/pdf/route.ts`
  - `src/app/capture-actions.ts`
- Public-route/proxy/deploy wiring:
  - `src/proxy.ts`
  - `scripts/deploy.sh`
  - `package.json`
  - `.env.example`

### Runtime/Repository State

- Current branch is clean: `codex/v0.7.2-stabilization-clean`.
- `origin/codex/v0.7.2-stabilization-clean` matches local branch.
- Current clean branch token scan did not find a Telegram token in tracked files.
- Local stash exists: `leftover-docs-and-provisioning-before-clean-pr`.
- Local branch/history still includes a sensitive-looking local-only provisioning commit trail; do not push local `main` or `codex/v0.7.2-stabilization` wholesale.

### Verification Run

Command used:

```bash
PATH="/opt/homebrew/opt/node@22/bin:$PATH" npm test -- src/lib/telegram/*.test.ts src/app/api/telegram/webhook/route.test.ts src/db/migrations/009_telegram_source_type.test.ts
```

Result:

- Test runner executed the full `src/**/*.test.ts` suite because of the package script shape.
- **393 tests passed, 0 failed.**

Live public webhook probe:

```bash
curl --request POST https://brain.arunp.in/api/telegram/webhook
```

Result:

- Returned **401**, which is correct for a request without Telegram's secret-token header.

---

## Current Implementation Map

Telegram flow today:

1. Telegram posts an `Update` to `/api/telegram/webhook`.
2. `src/proxy.ts` marks `/api/telegram/webhook` as public so it bypasses normal session/bearer auth.
3. `handleTelegramWebhookPost()` checks `x-telegram-bot-api-secret-token` against `TELEGRAM_WEBHOOK_SECRET`.
4. It parses JSON and checks `update.message.from.id === TELEGRAM_OWNER_USER_ID`.
5. `handleCaptureMessage()` dispatches by message shape:
   - document first
   - first URL in text/caption second
   - plain text note third
   - unsupported message nudge last
6. URL/YouTube/PDF/note capture calls existing internal capture helpers directly.
7. Bot sends a Telegram acknowledgement with the captured item title and item link.

This is a good architecture choice: no internal HTTP loop, no extra bot framework dependency, and shared capture logic with Android/web.

---

## What Is Strong

### S1. Webhook Is Not Open By Default

`src/lib/telegram/webhook-handler.ts` rejects missing/wrong `x-telegram-bot-api-secret-token` with `401`.

This is the correct primary defense for Telegram server-to-server webhooks, because Telegram webhooks do not provide browser `Origin` headers.

### S2. Owner Allowlist Exists

The handler checks `TELEGRAM_OWNER_USER_ID` before dispatching. Non-owner messages are silently dropped with `200`, which prevents Telegram from retrying spam forever.

### S3. The Bot Reuses Existing Capture Pipeline

`src/lib/telegram/dispatch.ts` calls:

- `extractArticleFromUrl`
- `extractYoutubeVideo`
- `extractPdf`
- `insertCaptured`

This avoids a parallel capture implementation and keeps extraction behavior mostly aligned with Android/web.

### S4. Basic Unit Coverage Is Solid

Tests cover:

- missing/wrong webhook secret
- missing server secret
- non-owner drop
- missing message drop
- valid owner dispatch
- dispatch failure acknowledgement
- malformed JSON
- URL routing
- duplicate URL behavior
- note capture
- PDF type/size handling
- Telegram API client request shapes
- migration 009 forward repair

### S5. Live Route Is Reachable And Rejects Unsigned Requests

Production currently returns `401` for a bare webhook POST without the Telegram secret header. That confirms the public route is alive and not accidentally accepting unsigned requests.

---

## Severity-Ranked Findings

### P0/P1. Local Secret Hygiene Risk Around Telegram Provisioning

**Evidence**

- Current clean branch scan only found placeholder references:
  - `.env.example`
  - `docs/plans/v0.6.5-telegram-capture.md`
- Local git history shows:
  - `ba327c9 chore: provision file with real recall_ai_brain_bot details (local only, do not push)`
  - `9cae7f9 docs(provision): add ready-to-use telegram-bot-commands.txt with fresh secret and exact next steps`
  - stash: `leftover-docs-and-provisioning-before-clean-pr`

**Risk**

Even though the pushed clean branch is safe, the local repo still contains a risky trail. A future accidental push from local `main`, the old stabilization branch, or the stash contents could expose a Telegram bot token and/or webhook secret.

If the bot token was ever pushed anywhere outside the local machine, it must be considered compromised. If it only exists in local history/stash, the risk is accidental future exposure.

**Recommendation**

- Rotate the Telegram bot token if there is any doubt it left the local machine.
- Rotate `TELEGRAM_WEBHOOK_SECRET` after cleaning the provisioning workflow.
- Keep production values only in `/etc/brain/.env` or a password manager.
- Remove or archive the risky local branch/stash after extracting any non-secret notes.
- Add a pre-commit or CI secret scan for Telegram token format: `<bot-id>:<auth-string>`.

---

### P1. Bot-Originated Items Are Not Tagged As Telegram

**Evidence**

`src/db/migrations/009_telegram_source_type.sql` says:

- "Telegram capture stores bot-originated items as source_type='telegram'."

But `src/lib/telegram/dispatch.ts` inserts:

- URL captures as `source_type: "url"`
- YouTube captures as `source_type: "youtube"`
- notes as `source_type: "note"`
- PDFs as `source_type: "pdf"`

No dispatch path inserts `source_type: "telegram"`.

**Risk**

The implementation loses source provenance. Later, the app cannot reliably answer:

- What did I capture through Telegram?
- Is Telegram being used?
- Are Telegram captures failing more than Android/web?
- Should there be a Telegram inbox/filter?

This also means migration 009 and the plan/docs are misleading. The schema supports `telegram`, but live bot captures do not use it.

**Recommendation**

Decide on the data model explicitly:

- Option A: keep content type in `source_type` and add a separate `capture_source` / `ingest_channel` field with values like `web`, `android`, `extension`, `telegram`.
- Option B: use `source_type = "telegram"` for bot notes only, but that still fails for Telegram URLs/PDFs.

Option A is better. It preserves content type and capture channel separately.

---

### P1. Webhook Secret Leak Enables Forged Owner Captures

**Evidence**

The handler trusts `msg.from?.id` from the JSON body after the static secret header passes:

```ts
if (!ownerId || msg.from?.id !== ownerId) {
  return NextResponse.json({ ok: true });
}
```

There is no independent Telegram signature beyond the secret-token header.

**Risk**

If `TELEGRAM_WEBHOOK_SECRET` leaks, an attacker can POST a fabricated update with the owner's numeric Telegram ID and trigger captures. That gives them a path to:

- create arbitrary notes in the library
- force server-side URL fetches
- attempt SSRF-style fetches via URL capture
- consume CPU/network via repeated extraction attempts
- pollute the knowledge base

This is not a Telegram-specific flaw; it is the standard risk of using a shared webhook secret. The risk is heightened here because earlier local history/stash appears to include real provisioning details.

**Recommendation**

- Treat the webhook secret like a bearer credential.
- Rotate it after any provisioning-file cleanup.
- Add replay/idempotency tracking for `update_id`.
- Add a small schema validator so forged-but-malformed updates cannot throw.
- Consider making the webhook path include an unguessable path component as defense in depth, e.g. `/api/telegram/webhook/<random-id>`, while still keeping the header check.

---

### P1. Group Chat Privacy Leak

**Evidence**

The owner check uses only `msg.from.id`. It does not require:

```ts
msg.chat.type === "private"
```

`handleCaptureMessage()` replies to `msg.chat.id`, whatever chat that is.

**Risk**

If the bot is added to a Telegram group and the owner posts a URL/note/PDF there, the bot can:

- save the group message into Brain
- reply in the group with the captured title and item link
- reveal that the item was captured into the private Brain library

Non-owner group messages are silently dropped, which is good, but owner messages in a group are still accepted.

**Recommendation**

Require private chats only for capture:

- If `msg.chat.type !== "private"`, return `200` silently or send a one-time private-chat-only explanation.
- Add tests for owner-in-group rejection.
- Document that the bot should not be added to groups.

---

### P1. No Idempotency Or Replay Protection

**Evidence**

`TelegramUpdate.update_id`, `message_id`, and document `file_unique_id` are not persisted or checked. URL captures check historical duplicate URLs, but note and PDF captures do not have durable dedup.

**Risk**

Duplicate captures can happen from:

- Telegram retry after a transient non-2xx before the app receives the body
- operator webhook replays
- accidental duplicate message deliveries
- malicious replays if the secret leaks
- repeated note/PDF sends by Telegram clients

URL/YouTube captures are partially protected by `findItemByUrl()`. Notes and PDFs are not.

**Recommendation**

Add a small `telegram_updates` table:

- `update_id INTEGER PRIMARY KEY`
- `message_id INTEGER`
- `chat_id INTEGER`
- `from_id INTEGER`
- `handled_at INTEGER`
- `item_id TEXT NULL`
- `status TEXT`
- `error TEXT NULL`

Insert/claim the `update_id` before dispatch. If the same update arrives again, return `200` without duplicate capture.

For documents, also consider deduping by `file_unique_id`.

---

### P1. Missing Runtime Schema Validation Can Turn Malformed Signed Payloads Into 500s

**Evidence**

`handleTelegramWebhookPost()` casts raw JSON directly:

```ts
update = (await req.json()) as TelegramUpdate;
```

Then it assumes fields like `msg.chat.id` exist in downstream code and in the catch path.

**Risk**

Legitimate Telegram payloads are well-formed, but a signed malformed payload could trigger exceptions. Worse, the error path itself attempts to use `msg.chat.id`, so a message object with matching `from.id` but missing `chat` can fail while reporting the failure.

This matters most if the webhook secret leaks.

**Recommendation**

Add a narrow `zod` schema for the subset consumed:

- `update_id` required number
- `message` optional object
- if `message` exists:
  - `message_id` required number
  - `chat.id` required number
  - `chat.type` required enum
  - `from.id` optional number
  - `text`/`caption` optional strings with max lengths
  - `entities`/`caption_entities` bounded arrays
  - `document` bounded object

For invalid signed payloads, log and return `200` without dispatch.

---

### P1. Live Telegram Smoke Gate Is Referenced But Missing

**Evidence**

`scripts/deploy.sh` includes:

```bash
BRAIN_BASE_URL="$BASE_URL" npm run smoke:telegram
```

But `package.json` has no `smoke:telegram` script, and `scripts/` has no Telegram smoke script.

**Risk**

Operators may believe `TELEGRAM_RELEASE=1` validates Telegram, but it will fail at runtime with a missing npm script. Because it is opt-in, it may not be noticed until a Telegram-specific release or incident.

**Recommendation**

Create `scripts/smoke-telegram.mjs` and add:

```json
"smoke:telegram": "node --import tsx scripts/smoke-telegram.mjs"
```

Smoke should verify at least:

- no-secret POST returns `401`
- wrong-secret POST returns `401`
- valid-secret non-owner synthetic update returns `200` and creates no item
- valid-secret owner synthetic note creates an item in a disposable test DB or test-mode endpoint

For production, avoid creating real library pollution unless explicitly requested.

---

### P2. Telegram Path Does Not Share Android/Web Dedup Window For Notes

**Evidence**

The HTTP note route hashes title/body and uses `isDuplicateShare()` to prevent duplicate shares within the 2-second window. Telegram note capture inserts directly without that dedup window.

**Risk**

Accidental double sends create duplicate notes. Replayed updates create duplicate notes. This is a parity gap versus Android/web.

**Recommendation**

Use the same `shareDedupKey("note", hash)` path in Telegram note capture, or rely on the durable `telegram_updates` table recommended above. Best result is both: short-window dedup plus durable update-id idempotency.

---

### P2. Telegram PDF Path Has Weaker Integrity And Size Checks Than Android/Web

**Evidence**

Android/web PDF upload supports `X-Expected-SHA256` round-trip verification. Telegram PDF capture does not compute or store a file hash. It only checks `doc.file_size` before download if Telegram supplied it, then downloads and extracts.

**Risk**

Telegram's API is trusted, so this is not the same risk as an arbitrary multipart upload. Still:

- no post-download size check if `file_size` is absent or inaccurate
- no hash stored for later dedup/debugging
- duplicate PDF sends cannot be identified
- extraction failures cannot be correlated to a file digest

**Recommendation**

After download:

- enforce `bytes.byteLength <= PDF_MAX_BYTES`
- compute SHA256
- store digest in a future `capture_artifacts` table or error log
- dedupe by `file_unique_id` and/or SHA256

---

### P2. Commands Like `/start` And `/help` Become Notes

**Evidence**

The dispatch logic only checks document, URL, and text length. It does not special-case `bot_command` entities.

`/start` length is >= 3, so it can be saved as a note.

**Risk**

Normal Telegram bot onboarding commands pollute the library.

**Recommendation**

Add explicit command handling before note capture:

- `/start` -> short help message
- `/help` -> short help message
- unknown command -> "I can capture URLs, PDFs, and notes."

Add tests for command messages.

---

### P2. Failure Semantics Can Lose Messages After The Secret Check

**Evidence**

The route intentionally returns `200` after dispatch errors and sends a failure message to the owner. This prevents Telegram retries after a downstream error.

**Risk**

This is good for non-retryable extraction failures, but bad for transient failures after acceptance:

- database temporarily locked
- disk hiccup
- Telegram send ack failure
- file download timeout
- process dependency momentarily broken

Telegram will not retry because the route returns `200`. The only durable trace is `data/errors.jsonl`; no retry queue exists.

**Recommendation**

Classify failures:

- validation/user-content failures: return `200`, notify owner
- transient infrastructure failures before item creation: persist a retry job or return `503` so Telegram retries
- failures after item creation but before ack: return `200`, log ack failure only

Durable `telegram_updates` status tracking would make this safer.

---

### P2. Public Webhook Has No Rate Limit

**Evidence**

`src/proxy.ts` bypasses bearer auth and bearer rate limiting for `/api/telegram/webhook`. Wrong-secret requests still call `logError()`.

**Risk**

An unauthenticated internet client can hit the route repeatedly and cause:

- error-log churn
- CPU overhead
- operational noise

The JSONL sink rotates at 5 MB and keeps one backup, so disk blow-up is bounded, but noisy public routes still deserve throttling.

**Recommendation**

Add a lightweight in-memory rate limit for bad-secret webhook attempts, preferably keyed by Cloudflare IP headers. Keep it lenient for valid Telegram traffic.

---

### P2. URL Capture Has No Private-Network Guard

**Evidence**

Telegram URL capture calls the same URL extractor as web/API capture. `extractArticleFromUrl()` validates `http`/`https`, caps response size, and times out, but it does not block private IPs, link-local addresses, localhost, or cloud metadata addresses.

**Risk**

With normal owner-only use, this is mostly self-risk. If the webhook secret leaks, a forged update can make the server fetch attacker-chosen URLs from the server's network position.

**Recommendation**

Add a shared server-side URL safety check before all capture fetches:

- reject localhost
- reject private/link-local ranges
- reject metadata IPs
- resolve DNS and check resulting IPs before fetch where practical

This should apply to Android/web/extension too, not only Telegram.

---

### P3. Telegram API Client Has No Timeout

**Evidence**

`src/lib/telegram/client.ts` calls `fetch()` without an `AbortController`.

**Risk**

A stuck Telegram API request could hold a webhook request open longer than intended. Usually rare, but easy to improve.

**Recommendation**

Wrap Telegram API calls and file downloads with a timeout, e.g. 10-15 seconds for API calls and a separate cap for file downloads.

---

### P3. Error Messages May Echo Too Much Detail To Telegram

**Evidence**

Unhandled errors are sent back as:

```ts
Capture failed: ${(err as Error).message.slice(0, 200)}
```

**Risk**

In private chat this is probably fine. In group chat it becomes a privacy issue. Some internal errors can reveal implementation detail.

**Recommendation**

After enforcing private chat only, keep owner-facing errors user-friendly. Log technical details in `errors.jsonl`, but send Telegram a generic message with a short failure code.

---

### P3. Documentation And Implementation Drift

**Evidence**

The v0.6.5 plan mentions separate files like:

- `src/lib/telegram/capture-url.ts`
- `src/lib/telegram/capture-note.ts`
- `src/lib/telegram/capture-pdf.ts`
- `scripts/smoke-telegram.mjs`

The implementation consolidated capture into `dispatch.ts`, which is fine, but the smoke script did not land.

The PRD/implementation docs also discuss `source = telegram`, while implementation preserves content source types.

**Risk**

Future agents may make incorrect assumptions from the docs and repair the wrong thing.

**Recommendation**

Update the v0.6.5 Telegram plan with an "as-built" section:

- single dispatch file, not three capture files
- content type and capture channel are currently conflated/missing
- smoke script status
- group/private chat rule once fixed

---

## Android/Web Parity Review

| Capability | Android/Web | Telegram Bot | Gap |
|---|---|---|---|
| URL capture | Yes | Yes | Mostly aligned |
| YouTube URL capture | Yes | Yes | Mostly aligned |
| PDF capture | Yes | Yes | Telegram lacks SHA/hash and durable dedup |
| Plain note capture | Yes | Yes | Telegram lacks note body max/dedup |
| Bearer/session auth | Yes | No, uses Telegram secret | Acceptable but separate hardening needed |
| Origin validation | Yes | No | Acceptable for Telegram server-to-server |
| API version guard | Yes | No | Probably okay; bot is server-side, not versioned client |
| Rate limiting | Bearer route has rate limit | No webhook-specific rate limit | Gap |
| Capture channel visibility | Partial/client-dependent | Missing | Gap |
| Smoke coverage | Multiple smoke scripts | Deploy references missing smoke | Gap |
| Live user acknowledgement | App UI/toasts | Telegram messages | Good, but group leakage risk |

---

## Recommended Fix Order

### Immediate

1. Rotate/clean Telegram secrets if there is any chance the provisioning token/secret left the machine.
2. Add private-chat-only enforcement.
3. Add runtime schema validation for Telegram updates.
4. Add durable `update_id` idempotency.
5. Add a real `smoke:telegram` script or remove the deploy reference until it exists.

### Next Hardening Pass

6. Add `capture_source` / `ingest_channel` so Telegram captures are visible without losing content type.
7. Add note dedup and command handling.
8. Add post-download PDF size/hash checks.
9. Add webhook bad-secret rate limiting.
10. Add Telegram client fetch timeouts.

### Broader Shared Capture Safety

11. Add private-network URL fetch protection shared by all capture surfaces.
12. Add docs/runbook cleanup: as-built Telegram architecture, secret rotation, webhook verification, and live smoke instructions.

---

## Proposed Acceptance Criteria For Remediation

- A forged signed payload missing required Telegram fields returns `200` and creates no item.
- Owner messages in group/supergroup/channel chats create no item and leak no item link to the group.
- Reposting the same `update_id` creates at most one item.
- `/start` and `/help` do not create notes.
- Telegram note duplicate sends within a short window do not create duplicate notes.
- Telegram PDF capture records or logs SHA256 and enforces byte-size after download.
- `npm run smoke:telegram` exists and passes locally against a synthetic mode.
- `TELEGRAM_RELEASE=1 scripts/deploy.sh` no longer fails due to a missing npm script.
- Library/debug views can distinguish `content_type` from `capture_source`, or at minimum can filter "captured via Telegram".
- Secret scan blocks Telegram bot token patterns before commit.

---

## Final Assessment

The implementation is a solid first version, but the current threat model is too optimistic. It assumes Telegram is always the caller, the secret never leaks, the owner only uses private chat, and duplicate/retry behavior is harmless. Those assumptions are reasonable during a prototype, but they are not safe as long-term operational defaults.

The best next step is a narrow Telegram hardening patch, not a rewrite. Keep the direct-dispatch architecture, keep the zero-dependency Telegram client, and add the missing guardrails around it.
