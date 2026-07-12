# Configuration Reference

Purpose: Describe configuration domains and feature flags without publishing private values.
Audience: AI agents, contributors, and operators.
Verified against: deployed application `ea7b159515fc37f76ffdb83dedf2d33d17f9a193`.
Runtime evidence through: 2026-07-12 for documented Processing flags; private values are not published.
Last reviewed: 2026-07-12.
Owner: AI Brain maintainer.

| Domain | Configuration purpose |
|---|---|
| Core service | Node environment, data path, public origin, session/PIN state |
| API clients | Shared bearer token, allowed origins, client API versions, rate limits |
| Generation | Selected provider, endpoint/key, default model, timeout/batch behavior |
| Embeddings | Selected provider, endpoint/key, 768-dimensional model behavior |
| Capture | Timeouts, size caps, optional metadata providers, artifact limits |
| Notes | UI/write/processing rollout flags, Focus flag, provider-consent/default policy |
| Card processing | Independent read/write/navigation flags, dedicated cursor HMAC, exact public origin, owner IANA timezone, session write rate |
| Telegram | Webhook secret and owner/private-chat identity |
| Recall | Private endpoint/key, caps, checkpoint/lock/report locations, apply gates, and separate default-off manual UI/worker configuration |
| Deployment/backup | Service/build paths and private backup credentials/destinations |

Fresh-install examples default sensitive or unfinished features conservatively. Dated production evidence states attached-note and Focus flags were enabled for the verified release; do not infer current values without authorized inspection.

Card Processing requires read, write, and navigation flags to be enabled in order; fresh examples keep all three off. A fresh green readiness checkpoint, dedicated 64-hex cursor HMAC, exact HTTPS origin, valid owner timezone, and positive rate limit are also required. Runtime checks expose only configuration validity and effective flag state, never secret values.

Never copy real values into the wiki. Use `.env.example`, typed config modules, preflight scripts, and private operator context.

Recall manual sync requires all three layers to agree before it is available: the browser UI flag, the trusted-worker configured flag, and the existing Recall sync enablement. The trusted service additionally has its own worker execution flag. Examples keep all manual flags off. Wake-marker, wrapper, lifecycle, lock, and credential locations belong to trusted host configuration; do not expose their real values or grant the web identity access to the Recall credential/private lock.
