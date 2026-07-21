# AI Brain → NotebookLM — Security and Privacy Assessment

**Assessment date:** 2026-07-21
**Scope:** Supported Enterprise Preview API and Google Docs/Drive staging paths
**Method:** Read-only code and documentation review. No account, credentials, API, notebook, file, or production system was accessed.

## Security verdict

- **Gemini Notebook Enterprise Preview API:** Limited-go for a synthetic spike only, conditional on licensed user eligibility, least-privilege access, a dedicated private test notebook, and explicit acceptance of Preview risk. Production remains deferred until ambiguous-write reconciliation, terminal-state handling, deletion proof, capacity behavior, credential lifecycle, and API drift are validated.
- **Google Docs/Drive staging:** Limited-go as a semi-automated **publish to Drive** workflow. It must not claim verified NotebookLM synchronization. Notebook attachment, refresh observation, and NotebookLM-side source removal remain manual or unobservable through supported consumer interfaces.
- **Unofficial consumer connectors:** No-go for production and out of scope for execution in this goal.

The largest shared risks are unintended sensitive-content export, account/target mix-ups, token leakage, duplicate remote sources after ambiguous writes, misleading success states, unexpected sharing, and incomplete deletion.

## Threat model

| Boundary | Principal risk | Required control |
|---|---|---|
| AI Brain eligibility → outbound content | Blanket export of private notes, attachments, titles, or URLs | Notebook-specific consent; default deny; explicit item policy; sensitive classes excluded unless opted in |
| Local app → Google credentials | Refresh-token theft, broad scopes, or wrong-account reuse | Approved secure store; stable subject binding; exact scope record; revoke and purge on disconnect |
| Local state → notebook/file target | Cross-account or cross-notebook contamination | Scope every identity by owner, connection, target, item, content version, and strategy |
| Notebook/Drive sharing | Collaborators receive content beyond the AI Brain owner | Private-by-default target; ACL preflight; pause on unexpected sharing; explicit shared-target consent |
| Provider response → logs | Content, titles, URLs, IDs, tokens, or raw payloads leak | Structured allowlist logs; no raw request/response or raw Google errors |
| Remote write → local checkpoint | Lost response produces duplicates or skipped work | Durable pre-write manifest; `needs_reconcile`; reconciliation before any retry |
| Disconnect/deletion | Credential revoked while remote content remains; false erasure claim | Separate revocation, remote-source cleanup, Drive-file cleanup, and log-retention workflows |
| Imported content → future notebook output | Prompt injection drives sync or deletion actions | Strictly one-way flow; notebook output never controls eligibility, sync, or deletion |

Existing `include_in_ai` note consent does not authorize NotebookLM export. Destination, Google identity, target, data handling, and sharing are materially different. Consent should be bound to a fingerprint containing edition, Google subject alias, project/location or Drive file alias, notebook target, granted scopes, content policy, and aggregation strategy.

## Edition-specific data handling

- **Consumer:** Google’s current privacy help says that when a user submits feedback, associated queries, uploads, and model outputs may be included, human reviewers may process the feedback data, and disconnected copies may be retained for up to three years. The setup disclosure must warn users not to submit feedback containing private AI Brain material and must link the current terms.
- **Workspace:** Qualifying editions where NotebookLM is a core service receive different data handling; additional-service editions follow different terms. The exact Workspace edition/service classification must be confirmed before making a privacy claim.
- **Enterprise:** Project administrators can enable usage logging that may capture source and interaction content. Region, readers, sinks, and retention are separate from source cleanup.

These distinctions prohibit a single generic “Google does not train on your data” statement.

## Minimum identity and authorization

### Gemini Notebook Enterprise Preview API

- Use a dedicated Cloud project, dedicated licensed test identity, and private synthetic test notebook.
- Grant only the Cloud Gemini Notebook user role and notebook Owner/Editor permission needed for source mutation. Do not grant project Owner, broad admin, logging-reader, or audit-configuration privileges to the runtime.
- Begin with raw-text source creation. Do not request Drive access unless a separate Drive-backed source test is explicitly authorized.
- Use a licensed user credential for the first spike. Service-account/workload-identity compatibility with notebook licensing and ownership is not established.
- Isolate the temporary user credential in a private local auth profile. Record only credential type and scopes; revoke/remove the profile after cleanup.

### Google Docs/Drive staging

- Use user OAuth authorization code with PKCE, OpenID subject binding, and `https://www.googleapis.com/auth/drive.file`.
- Request email only if a visible account label is required. Never broaden automatically to full Drive, Drive read-only, or domain-wide delegation.
- Create one stable app-owned Google Doc carrying a private `appProperties` connection/run marker.
- Keep the document private and verify permissions after creation; inherited folder or Workspace defaults can otherwise broaden access.
- Bind OAuth subject alias, Drive file ID, and intended Notebook alias. A changed account or target requires a new namespace and renewed consent.
- Use Docs `requiredRevisionId` when changing the rolling document so collaborator edits cannot be overwritten silently.

## Credential lifecycle

- For a local single-user deployment, store tokens in the OS credential store. For a service deployment, use an approved secret manager or envelope-encrypted store with the master key delivered only to the trusted worker.
- Never store Google tokens, OAuth codes, client secrets, ADC files, or credential JSON in `.env`, plaintext SQLite settings, repository files, public/private sync reports, or error logs.
- AI Brain settings are plaintext and database backups retain them (`src/db/settings.ts:7-35`; `src/lib/backup.ts:20-35`). They are unsuitable for refresh tokens.
- Persist only a credential reference, subject HMAC/alias, granted scopes, authorization time, and last validated state.
- Refresh an expired access token once. `invalid_grant` or explicit revocation sets `reauth_required` and stops writes.
- Permission, license, or scope `403` fails closed. Never retry with broader privileges automatically.
- On ordinary disconnect, pause work and offer controlled remote cleanup before revoking/purging. On suspected compromise, revoke immediately and treat remaining cleanup as an explicit owner/admin action.

## Sharing and target integrity

Before the first write and on material target changes:

1. verify the bound Google subject alias;
2. verify the exact project/location/notebook or Drive file alias;
3. capture a privacy-preserving ACL digest and baseline source/file count;
4. stop on unexpected collaborators, inherited sharing, or ownership changes;
5. never fall back silently to a different notebook, project, folder, or file.

## Disconnect, retention, and deletion

### Enterprise path

1. Pause triggers, acquire a fenced target lease, and mark in-flight calls with unknown outcomes.
2. Offer “retain adapter-owned sources” or “delete adapter-owned sources.”
3. Delete only exact source resource names recorded for this connection; never delete the notebook or pre-existing sources.
4. Poll until absence or a documented terminal deletion state. A delete acknowledgement or `PENDING_DELETION` is not erasure proof.
5. Retain unresolved cleanup records and owner action.
6. Revoke OAuth/remove dedicated IAM access and purge credentials.
7. Retain only the minimum mapping/tombstone allowed by policy if remote sources remain.

Cloud usage logs have an independent retention boundary. Deleting a source or notebook does not prove deletion of existing log entries.

### Drive staging path

Treat these as independent actions:

- manually remove the source from NotebookLM;
- trash/permanently delete or explicitly retain the Drive document;
- revoke OAuth and purge the local credential.

Deleting or losing access to a Drive file can leave a NotebookLM source inaccessible while it still consumes source capacity. Neither “disconnect” nor “Drive file deleted” may be labeled “Notebook content erased.”

## Application logging allowlist

Allowed fields:

- event type and run UUID;
- keyed aliases for connection, target, and source;
- counts, byte/word estimates, source type, attempt, and latency;
- HTTP/gRPC status, normalized internal error code, and state transition.

Forbidden fields:

- source content, title, prompt, answer, citation, or URL;
- Drive, notebook, project, account, or raw source identifiers;
- account email;
- raw request/response bodies or Google error messages;
- cookies, OAuth code/state, access/refresh tokens, client secrets, ADC/credential paths, or credential JSON.

Provider errors must map to a fixed internal taxonomy. Existing recursive redaction is blocklist defense-in-depth, not permission to persist raw provider objects (`src/lib/security/redaction.ts:12-94`). The JSONL error sink writes supplied data, so callers must pass only allowlisted structures (`src/lib/errors/sink.ts:21-40`).

## Enterprise usage logging

Google documents project-level Notebook Enterprise usage logging that may contain request/response content, prompts, answers, grounding/citation material, and source metadata; sensitive data is not filtered. Keep it off during the synthetic spike unless logging is itself an approved test. If enabled, record bucket region, retention, readers, sinks, and deletion policy. Turning it off stops future capture but does not erase existing records.

## Mandatory no-go gates

- Enterprise source creation cannot be uniquely reconciled after a potentially accepted/lost response.
- The only available method requires browser cookies, undocumented RPCs, UI automation, or broad account impersonation.
- A credential must live in plaintext settings, a repository file, or a public report.
- Target identity or ACL cannot be verified before writes.
- Success cannot distinguish local enqueue, provider acceptance, processing, and terminal completion.
- The requested product promise requires verified consumer NotebookLM ingestion or deletion; the supported Drive path cannot observe either.
- Cleanup cannot be bounded to exact synthetic resources created by the spike.
- The account requires new paid service/subscription or exceeds the USD 0 spend constraint.

## Primary references

- [Gemini Notebook Enterprise notebook/source API](https://docs.cloud.google.com/gemini/enterprise/notebooklm-enterprise/docs/api-notebooks-sources)
- [Set up Gemini Notebook Enterprise](https://docs.cloud.google.com/gemini/enterprise/notebooklm-enterprise/docs/set-up-notebooklm)
- [Notebook Enterprise usage logging](https://docs.cloud.google.com/gemini/enterprise/notebooklm-enterprise/docs/set-up-usage-audit-logs-for-nblme)
- [Google Drive API scope guidance](https://developers.google.com/workspace/drive/api/guides/api-specific-auth)
- [Google Docs authorization scopes](https://developers.google.com/workspace/docs/api/auth)
- [Google Docs `batchUpdate`](https://developers.google.com/workspace/docs/api/reference/rest/v1/documents/batchUpdate)
- [NotebookLM source help](https://support.google.com/notebooklm/answer/16215270?hl=en)
- [Gemini Notebook privacy and terms](https://support.google.com/gemininotebook/answer/17004255?hl=en)
