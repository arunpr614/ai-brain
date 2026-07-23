# Narrow Addendum: Fixed-Origin Two-Channel Transcript Transfer

**Status:** corrected after Stage 0 adversarial findings and accepted by the focused contract recheck; Chrome implementation remains blocked on migration 027 and package/security gates  
**Scope:** resolves one contradiction between the final post-planning verification and the governing implementation sequence  
**Does not change:** user consent, exact-item binding, panel-only pre-confirm memory, production denial, fixed origin, server recomputation, or atomic attachment

## Conflict

The final V2 verification requires that transcript text live only in the side-panel document and never enter the extension service worker. It also requires the worker to construct the compile-time fixed Brain lab URL and own the paired bearer request. The governing goal separately calls for a fixed-origin service-worker transfer. A single runtime message carrying the confirmed transcript cannot satisfy all three statements.

## Frozen interpretation

Use two channels with distinct authority and three distinct origins:

1. **Brain page handoff origin:** one compile-time exact HTTPS Brain lab web-page origin is the sole `externally_connectable.matches` origin allowed to send the opaque intent to the fixture/lab extension. Runtime checks require that exact `sender.url` origin and the top frame. This grants no upload network authority.
2. **Lab destination origin:** one compile-time exact HTTPS Brain lab API destination is used for grant authorization, commit, and receipt reconciliation. The fixture/lab manifest grants only this reviewed host pattern and extension CSP `connect-src`; the panel/worker accept no URL from a page, payload, response, or configuration at runtime. Both fetch paths use `redirect: "error"`.
3. **Extension requester origin:** direct panel upload arrives with the exact `chrome-extension://<approved-fixture-or-lab-extension-id>` Origin. The API CORS policy allows only that requester origin for the fixed commit/reconciliation routes and exact methods/headers. It never uses `*`, never enables credentialed CORS, and rejects every other extension ID, web origin, scheme, host, or port.
4. **Authority channel, through the service worker:** after explicit confirmation, the panel sends only bounded content-free facts: intent identifier, tab/document/video binding token, extractor/contract versions, request ID, serialized byte length, cue count, and a SHA-256 digest computed in the trusted panel. The service worker validates shape/package mode, adds the paired lab bearer, and requests a short-lived one-time upload grant from the lab destination.
5. **Body channel, from the trusted side panel:** the service worker returns the opaque one-time grant only in the expected response to the requesting panel context, plus an enumerated route discriminator (never a URL). The panel uploads the byte-identical confirmed body to the imported lab destination using `credentials: "omit"`, `redirect: "error"`, `referrerPolicy: "no-referrer"`, and `cache: "no-store"`. The paired bearer never leaves the worker.
6. **Server binding:** the grant is a secret bearer capability. Only its cryptographic hash is stored. It is single-use, revocable, expires within the remaining intent lifetime, and is bound to user, item, expected content revision, canonical video, approved extension ID/origin/version, extractor/contract versions, request ID, body SHA-256, byte length, cue count, and destination. Commit consumes the grant and intent transactionally with the attachment receipt.
7. **Cleanup:** the panel discards transcript content and grant after cancel, expiry, navigation, identity drift, remount, extension reload, terminal response, or ambiguous-response reconciliation. Neither is written to extension storage. The worker retains no grant or request body in module-global state. Receipt reconciliation is content-free and requires neither body retransmission nor grant disclosure.

This is called a **service-worker-authorized fixed-origin transfer**. The worker owns durable bearer authority and destination selection; the panel owns only one body and a least-privilege, one-time upload capability.

## Required endpoint sequence

```text
Brain item -> service worker: opaque intent handoff (no transcript)
side panel -> API via worker: authorize inspect (no transcript)
side panel -> isolated extractor: explicit inspect
side panel: local review; no network/storage transcript write
side panel -> service worker: explicit-confirm grant request (content-free digest/size facts)
service worker -> fixed lab API: paired-bearer grant request
fixed lab API -> service worker -> side panel: opaque single-use upload grant
side panel -> fixed lab API: confirmed body + grant
fixed lab API: preconditions, hash/size recomputation, atomic exact-item commit
side panel -> fixed lab API: receipt reconciliation if response is ambiguous
```

## Fail-closed rules

- Production packages have no grant destination; production APIs deny grant creation before reading a body.
- A panel cannot supply a URL, host, protocol, path, requester origin, or extension identity.
- A page/content world cannot call the authority or body channel.
- Grant facts that differ at commit return a typed conflict and mutate nothing.
- Grant reuse returns the terminal receipt only for the same request/body binding; different binding conflicts.
- Expired, revoked, wrong-destination, wrong-requester-origin, wrong-extension, wrong-tab/document/video, stale-revision, consumed, disabled, or malformed grants mutate nothing.
- No redirect is followed across origin for grant or body requests.
- CORS preflight allows only the exact approved extension requester origin, fixed methods, `Content-Type`, the upload authorization header, and frozen contract headers. Responses set the exact allow-origin value and `Vary: Origin`; credentials are omitted.
- The grant is redacted as `<redacted:secret>` in every typed diagnostic/error representation and is forbidden in URLs, storage, page DOM, ordinary runtime messages, logs, analytics, crash evidence, screenshots, and reports.
- The server recomputes normalized cues, content hash, request hash, source classification, policy, and provenance; client hashes are binding aids, never truth.

## Required tests

1. Transcript sentinel never appears in worker messages, globals, storage, logs, diagnostics, URLs, or the page.
2. Paired bearer never appears in panel/page messages, storage, or requests other than worker-to-fixed-API authorization.
3. A grant sentinel appears only in the one worker-to-requesting-panel response and the one panel-to-fixed-API upload authorization field; it is absent from every forbidden surface and stored server-side only as a hash.
4. Destination origin, requester extension Origin, and externally-connectable Brain page origin each have independent positive and exhaustive foreign-origin/extension-ID/port/scheme/preflight tests.
5. Panel cannot override destination; redirect and alternate-origin attempts fail; host permissions and CSP contain only the reviewed lab destination.
6. Wrong digest, length, cue count, intent, request, item revision, video, extension, extractor, contract, destination, requester origin, expiry, revocation, or reused grant fails closed.
7. Response loss after commit reconciles one receipt/source without retransmitting body/grant and never repeats provider work.
8. Panel close/remount/navigation/reload requires reinspection and leaves no durable transcript or grant state.
9. Production mode denies grant creation and commit before body parsing, and the production extension bundle contains no recovery destination, panel, extractor, grant, or handoff code.

## Alternatives rejected

- **Transcript-bearing runtime message to the worker:** violates the final V2 panel-only memory boundary.
- **Paired bearer exposed to the side panel:** unnecessarily broadens durable request authority.
- **Page-mediated upload or page-selected destination:** violates the trust boundary.
- **Persistent extension storage or retry queue containing transcript:** violates explicit privacy requirements.
- **Direct panel upload with no worker authorization:** does not preserve worker-owned paired authority or the governing handoff boundary.

## Review gate

Implementation may begin only after an independent adversarial review issues GO/conditional GO with all P0/P1 findings resolved. If the existing authentication/API architecture cannot support this contract without weakening a non-negotiable boundary, stop the slice and seek explicit direction rather than reverting to transcript-bearing worker messaging.
