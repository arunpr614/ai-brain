# Configuration Reference

Purpose: Describe configuration domains and feature flags without publishing private values.
Audience: AI agents, contributors, and operators.
Verified against: main documentation baseline `23868faf13c8e3d0821715e6f5d0e3d2af1e1a34` plus review candidate `fdd740617685c1ce730a6150c306152a04070f86` on `feat/recall-manual-sync`.
Runtime evidence through: 2026-07-10 for documented release flags; current private values are not published.
Last reviewed: 2026-07-11.
Owner: AI Brain maintainer.

| Domain | Configuration purpose |
|---|---|
| Core service | Node environment, data path, public origin, session/PIN state |
| API clients | Shared bearer token, allowed origins, client API versions, rate limits |
| Generation | Selected provider, endpoint/key, default model, timeout/batch behavior |
| Embeddings | Selected provider, endpoint/key, 768-dimensional model behavior |
| Capture | Timeouts, size caps, optional metadata providers, artifact limits |
| Notes | UI/write/processing rollout flags, Focus flag, provider-consent/default policy |
| Telegram | Webhook secret and owner/private-chat identity |
| Recall | Private endpoint/key, caps, checkpoint/lock/report locations, apply gates, and separate default-off manual UI/worker configuration |
| Deployment/backup | Service/build paths and private backup credentials/destinations |

Fresh-install examples default sensitive or unfinished features conservatively. Dated production evidence states attached-note and Focus flags were enabled for the verified release; do not infer current values without authorized inspection.

Never copy real values into the wiki. Use `.env.example`, typed config modules, preflight scripts, and private operator context.

Recall manual sync requires all three layers to agree before it is available: the browser UI flag, the trusted-worker configured flag, and the existing Recall sync enablement. The trusted service additionally has its own worker execution flag. Examples keep all manual flags off. Wake-marker, wrapper, lifecycle, lock, and credential locations belong to trusted host configuration; do not expose their real values or grant the web identity access to the Recall credential/private lock.
