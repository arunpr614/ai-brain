# Security, Privacy, and Redaction

Purpose: Document authentication, trust boundaries, content handling, publication safety, and verified risks.
Audience: AI agents, security reviewers, and contributors touching auth, integrations, notes, logs or operations.
Verified against: deployed application `167a15d57b8f70574a017ea4cda507870f3600d4` plus retained feature-specific evidence.
Runtime evidence through: 2026-07-23 for protected-main deployment, Card Processing session/privacy boundaries, and NotebookLM URL-source production controls/provider canary.
Last reviewed: 2026-07-23.
Owner: AI Brain maintainer.

## Trust boundaries

- Browser: PBKDF2 PIN hash and signed HttpOnly/SameSite session cookie.
- Programmatic clients: one global bearer token and in-process limits. Client-version validation runs only when the header is present; `Origin` may be absent, and Chrome-extension origins are accepted broadly.
- Pairing: short-lived one-use code that exchanges for the global bearer token.
- Telegram: webhook secret plus owner/private-chat policy.
- Attached notes: same-origin mutation checks plus feature flags, per-note AI opt-in and provider acknowledgement.
- Card Processing: PIN-session-only reads and writes, bearer-negative routes, exact-origin mutations, private/no-store responses, allow-listed DTOs, bounded bodies, compare-and-swap/replay controls, and per-session throttling.
- Recall and providers: separate private environment credentials. The manual-sync candidate further separates the web and trusted Recall identities; the web side can persist intent and write an empty marker but cannot receive the credential, execute the wrapper, or open the private outer lock.
- NotebookLM: a separate scoped connector token and exact extension-origin/protocol binding mediate server work; Google session material stays in Chrome. The public entrance is `https://notebooklm.google/`; the optional permission and signed-in app are limited to `https://notebooklm.google.com/*`. Raw account/notebook/source identifiers stay local, and owner-only/private posture must be positively verified before any create. Production is `1:1:1`; extension 0.7.4 is paired at protocol v2 and a content-free provider-level URL-source canary passed.
- Managed edge terminates public TLS before the loopback Node service.

Private means single-owner/authenticated/default-unshared, not end-to-end encrypted. SQLite, local backups, artifact files, browser note journals/service-worker caches, extension storage and Android preferences lack application-level encryption. NotebookLM creates an additional copy outside AI Memory only after explicit export; this release never automatically updates or deletes that remote copy.

The Recall manual-sync route exposes only allowlisted lifecycle state, safe reasons, aggregate counts, trusted timestamps, and opaque request identifiers. Raw Recall content, reports, exceptions, credentials, private paths, provider identifiers, and schedule command output are denied. Actual host permissions remain an explicit pre-enablement proof gate; static unit definitions are not runtime evidence.

## Verified risks

The minimum PIN is four characters and no unlock-attempt limiter was found. Normal API-client identity/revocation is global. Several rate limits reset on restart. CSP is absent. URL safety does not clearly revalidate every redirect destination. Error-sink callers can submit arbitrary context. Android allows platform backup. Database backup excludes capture-artifact files. NotebookLM uses undocumented consumer web behavior rather than a supported public source-management API; provider/schema drift, account/profile ambiguity, and local extension-storage exposure remain explicit experimental risks. Stop on authentication challenges, security friction, protocol drift, sharing uncertainty, or any inability to verify the exact target safely.

## Publication denylist

Do not publish credentials, environment values, tokens/cookies/keys, signed URLs, pairing codes, extension origins, private content/IDs, raw NotebookLM account/notebook/source identifiers or markers, live hosts/tunnels/accounts, local absolute paths, raw logs, dangerous approval text, or executable production-write/deploy/restore/backfill/key/scheduler instructions. Summarize only public-safe behavior and record excluded sources without reproducing them.

## Provider, privacy, and offline settings

**Status:** Implemented, with NotebookLM experimental owner-operated export · **Confidence:** High for current code, fail-closed controls, and provider-level URL-source canary · **Availability:** default Settings/More surfaces. The owner opens Settings/More to inspect point-in-time provider health, attached-note consent/default, privacy/offline explanations, backup/export visibility and pairing controls. Empty/unconfigured providers show unavailable rather than healthy; loading/probe state is transient; success is point-in-time; failure does not erase existing content or consent state. Settings pages call provider/status and note-consent/default APIs and read configuration/settings data. Session authentication protects the pages; note provider acknowledgement adds a purpose/model/destination privacy boundary. NotebookLM Settings reports independent master, queue, and provider-write controls beneath the deployment emergency ceiling. Tests include provider-status route/module, note consent/default API/component/policy, NotebookLM auth/privacy/redaction/retention controls, and trust-copy coverage. Changes can affect AI eligibility, client pairing, trust copy and operational guidance. The full Trust Center remains a separate Planned proposal.

See [Authentication and Pairing](Authentication-Sessions-and-Device-Pairing), [Manual Content Notes](Manual-Content-Notes), and [Known Limitations](Known-Limitations-and-Technical-Debt).
