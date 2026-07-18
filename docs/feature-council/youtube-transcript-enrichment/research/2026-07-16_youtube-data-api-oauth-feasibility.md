# YouTube Data API OAuth Feasibility Note

**Status:** Desk validation complete; authenticated API call **Blocked / Not run**<br>
**Verified:** 2026-07-16<br>
**Experimental calls:** 0<br>
**Quota consumed by this work:** 0 units<br>
**Tokens created or stored:** 0

## Question

Can the newly supplied OAuth client configuration make the official YouTube Data API caption path (`captions.list` followed by `captions.download`) eligible for the locked benchmark?

## Credential-safe inspection

The supplied file was inspected locally without printing or copying its client ID or secret into the repository. It is a Google OAuth **web application** client. Its downloaded configuration contains no `redirect_uris` entry.

Google's web-server OAuth documentation requires the authorization request's redirect URI to exactly match an authorized redirect URI configured for the client. The same documentation permits localhost redirect URIs for testing and states that out-of-band authorization is no longer supported. Therefore this client cannot complete an OAuth consent flow in its current configuration.

The credential file is not an API key and does not itself authorize YouTube user data. No authorization URL was opened, no consent was requested, and no access or refresh token was created.

## Official caption-path requirements

| Step | Official requirement | Current evidence/state |
|---|---|---|
| Project setup | YouTube Data API v3 enabled for the Google Cloud project | Not verified from the client file |
| OAuth redirect | Exact authorized redirect URI for the web client | Missing from the supplied configuration; blocker |
| User consent | OAuth 2.0 authorization for `youtube.force-ssl` or a qualifying partner scope | Not requested; blocker |
| Caption track list | `captions.list`, 50 quota units | Technically specified; not called |
| Caption download | `captions.download`, 200 quota units | Requires the authorized user to have permission to edit the video; not called |
| Test video | Exact video editable by the consenting account | Not supplied/verified; blocker |
| Data handling | Disclosure, least privilege, secure token handling, deletion/refresh, and policy review | Design obligations remain open |

One list-plus-download attempt would consume 250 documented quota units before pagination or retries. Google's quota page currently describes a default 10,000-unit daily project allocation, but the actual project's API enablement and quota have not been inspected.

## Benchmark consequence

This new evidence narrows, but does not remove, A2's blocker. The official method remains a plausible **creator/editor-authorized** path and is not an arbitrary-public-caption path. A2 stays `excluded-before-run` with zero denominator and zero calls until all of the following exist before the content freeze:

1. a configured localhost callback for this web client;
2. verified YouTube Data API enablement and available quota;
3. explicit OAuth consent to the required broad caption-management scope;
4. an exact non-sensitive test video that the consenting account may edit;
5. a sealed token-lifecycle, deletion, disclosure, and output-retention plan; and
6. a predeclared request plan limited to `captions.list` and `captions.download` with no fallback or public-video probing.

If those prerequisites arrive only after Commit A, A2 must remain not run for protocol v2; adding it would require a fresh two-commit seal. Client credentials do not prove user authorization, video ownership, caption availability, API enablement, or policy approval.

## Smallest safe next action

Configure an authorized localhost callback for the OAuth web client (for example, an exact callback under `http://localhost:8080`), then identify a test video editable by the account that will explicitly consent. Do not paste a replacement secret or token into chat. Any token used for a future isolated spike must stay outside Git, use the minimum required scope, avoid private content, and be revoked after the bounded test.

Because the client secret was disclosed in the conversation, rotate it after the exploration and before any production design relies on it.

## Primary sources

- [YouTube web-server OAuth guide](https://developers.google.com/youtube/v3/guides/auth/server-side-web-apps) — redirect, consent, scope, state, and token-flow requirements.
- [`captions.list`](https://developers.google.com/youtube/v3/docs/captions/list) — OAuth requirement and 50-unit quota cost.
- [`captions.download`](https://developers.google.com/youtube/v3/docs/captions/download) — edit permission, supported output formats, and 200-unit quota cost.
- [YouTube quota calculator](https://developers.google.com/youtube/v3/determine_quota_cost) — current default quota description and reset behavior.
- [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy) — disclosure, minimum-permission, limited-use, and secure-handling obligations.
