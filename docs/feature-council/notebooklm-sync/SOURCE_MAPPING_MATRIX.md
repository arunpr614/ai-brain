# AI Brain → NotebookLM Synchronization — Source-Mapping Matrix

**State:** Public support and credential-free mapping complete; observed Google processing still requires edition-gated synthetic spikes.
**Leading strategies:** Enterprise size-sharded immutable aggregate; consumer/Workspace bounded rolling Google Doc.

| AI Brain item | Candidate representation | Fidelity/searchability | Attribution/refresh | Capacity/privacy/failure notes | Evidence state |
|---|---|---|---|---|---|
| Note | Enterprise aggregate raw text/Markdown; consumer rolling Doc entry | High text fidelity; stable headings improve retrieval | Opaque connection-scoped marker and captured time; core items have no last-modified field | Default eligible only after destination-specific consent; never one source/item | Reachable type; credential-free formatter passed |
| URL/web page | Enterprise native public URL only when provably safe/reachable, otherwise aggregate text; consumer Doc entry | Native source has direct attribution; normalized text is deterministic | Public URL only under default-deny query policy; otherwise omit | Paywall, robots, private/signed URL, weak-content, and provider extraction failures remain distinct | Reachable type; official Enterprise web type documented; sanitizer passed |
| YouTube | Enterprise native YouTube URL or transcript-backed aggregate; consumer Doc entry | Native source may process captions; AI Brain transcript is deterministic known content | Reconstruct the public watch URL from a validated video ID and preserve transcript quality | Availability, rights, language, and processing failure remain independent | Reachable type; official Enterprise native type documented; sanitizer passed |
| PDF | Normalized extracted text/Markdown aggregate or Doc entry | Text is available; original-file fidelity is not | Opaque marker, safe title, and capture-quality label | Ordinary capture does not retain the original PDF for reuse; exclude sensitive files by default | Reachable type; never claim binary upload for existing items |
| Telegram-captured item | Map the resulting canonical note/URL/PDF type | Same fidelity as underlying item | Do not export chat/message/file identifiers or capture-channel metadata | Destination consent is independent from Telegram capture consent | Reachable channel, not a NotebookLM source type |
| Recall-captured item | Map canonical type only at verified full-text fidelity | Fidelity varies with verified chunks/metadata | Strip the current Recall provenance preamble, card ID, and signed source URL before formatting | Metadata-only, blocked, or partial Recall content is ineligible | Reachable channel; credential-free strip/deny cases passed |
| Podcast | No default export until a reachable capture path and representation exist | Unknown | N/A | Schema-only substrate | Not currently reachable; explicit skip |
| EPUB | No default export until a reachable capture path and representation exist | Unknown | N/A | Schema-only substrate; product support differs | Not currently reachable; explicit skip |
| DOCX | No default export until a reachable path and retained artifact exist | Unknown | N/A | Schema-only substrate; no verified reusable original | Not currently reachable; explicit skip |
| Image/audio artifact | Not a canonical AI Brain item; future explicit attachment policy only | Artifact-dependent | Never expose local paths | Requires a generalized attachment model and separate consent | Out of MVP; reject before outbox creation |
| Generated summary | Companion section in aggregate/Doc entry | Searchable but derived, not primary evidence | Label exactly `AI-generated` | Never let the label imply source-grounded certainty | Formatter passed; Google fidelity unobserved |
| Unsupported attachment | Skip with safe reason | No silent lossy conversion | Persist safe category and retry eligibility | One poison item must not block later eligible work | State-machine isolation passed |

## Deterministic ten-item fixture contract

The credential-free catalog contains exactly ten fixed AI Brain items. Five create canonical entries and five create explicit skip records; an attachment rejection does not consume an eleventh item.

| Fixture | Required outcome |
|---:|---|
| 1, note | Normalize CRLF and trailing whitespace; retain user body; label generated summary `AI-generated` |
| 2, generic URL with an arbitrary token | Retain normalized captured text; omit the whole URL because a non-allowlisted query remains |
| 3, YouTube URL with `si` and timestamp | Reconstruct exactly `https://www.youtube.com/watch?v=<validated-id>`; omit every other parameter |
| 4, extracted PDF text | Retain normalized text; emit no file, chat, or path identifier and make no binary-upload claim |
| 5, verified Recall full text | Remove provenance preamble, card ID, and signed URL; retain only verified post-preamble content |
| 6, Recall metadata-only | Skip `insufficient_fidelity`; adapter calls zero |
| 7, legacy `source_type=telegram` | Skip `legacy_unmapped_type`; modern Telegram capture maps its underlying canonical type |
| 8–10, podcast/EPUB/DOCX | Skip `schema_only_or_unreachable_type`; adapter calls zero |

For eligible items, the pure mapper emits only:

```text
{
  marker,
  title,
  type,
  capturedIso,
  quality,
  publicUrl | null,
  summary: {label: "AI-generated", text} | null,
  body
}
```

No input field passes through implicitly. The current single-item and ZIP Markdown exporters are not safe formatter implementations for this integration: they expose raw `brain_id`, `source_url`, and/or `thumbnail_url`, and their contracts differ.

## URL and content-minimization rules

- Remove fragments always.
- Reject credentials in the authority, malformed/non-HTTP(S) URLs, local/private-network hosts, and signed/private URLs.
- Reconstruct YouTube URLs from a validated video ID and allow only `v`.
- For generic hosts, omit the attribution URL when any query component remains. Removing only known tracking or secret names is insufficient.
- Fetch only the selected item's already-authorized content. Do not inspect adjacent private notes or capture artifacts to enrich a payload.
- Keep attached notes excluded unless separately opted in with destination-specific provider consent.

Every remote payload, status object, and log projection is scanned for the fixed raw item IDs/hashes and synthetic needles such as `TOPSECRET`, `rc-private-42`, `Recall card id:`, chat/message identifiers, local paths, notebook URLs, access/refresh tokens, and signatures. Eligible content must not contain them; skipped content never reaches the provider adapter.

## Opaque marker and reconciliation contract

The local ledger holds raw item IDs and content hashes. The remote marker uses a random 32-byte key per connection, stored separately from OAuth credentials, with the full 256-bit HMAC output:

```text
item_message =
  "notebooklm:item:v1" NUL
  item_id NUL
  local_content_sha256 NUL
  "map-v1"

item_marker =
  "ab1_" + base64url(HMAC-SHA256(connection_key, item_message))
```

Fixed credential-free vector:

```text
connection_key = 000102030405060708090a0b0c0d0e0f
                 101112131415161718191a1b1c1d1e1f
item_id         = 000000000000000000000001
content_hash    = 15c490f5cc213d5975926f647a4655f22c102fc31b44901554dc12605eb3f501
expected_marker = ab1_E3oJJeXbX1CGwnEo4Nem7tzKcF-1YBlski4PzPOmBtg
```

Changing only the content hash to `65fc8436f5633eca18ea1d4afbf4a5d532d3093fb9d1c98227b5af25c2823bc3` yields `ab1_fRUlKd-q7kLPrGaOyidCuCSQn0_NSgj98tDeGyPQezk`. Exact reruns preserve the original vector. The output is not truncated without a separate collision analysis.

For immutable Enterprise aggregates, derive a source marker from the bound target alias, strategy, frozen period/cutoff, and ordered item markers. Reconcile only an exact target + source marker + locally bound desired manifest/hash match. A zero-result lookup is sufficient for retry only when the provider supplies a conclusive visibility horizon; otherwise it enters manual reconciliation.

For Drive, use a stable file ID, private application-property marker, and expected Drive revision/content hash. Updating that Doc is never presented as evidence that NotebookLM refreshed it.

## Publication-safe headers and telemetry

Every synchronized item carries only:

- connection-scoped opaque marker;
- safe title and source type;
- captured time, without inventing a last-modified time;
- proven-safe public source URL or `null`;
- capture/transcript quality;
- explicit mapping version held locally; and
- an `AI-generated` label for a derived summary.

Do not include private paths, notebook URLs/IDs, account identifiers, tokens, raw provider errors, raw item IDs/hashes, or policy-excluded content. Logs/status may contain only allowlisted aliases, counts, timing, source type, safe state, status, and normalized error code—not titles, bodies, URLs, raw provider responses, or credentials.

## Update and deletion posture

- **Enterprise initial scope:** append immutable aggregate source versions; do not assume in-place update. Delete only integration-created sources by stored resource name, after replacement reaches `COMPLETE`, under explicit retention policy.
- **Consumer/Workspace initial scope:** rebuild a stable integration-owned rolling Doc from the authoritative local publication ledger. The application proves only that Drive changed; supported NotebookLM refresh observability was not found.
- **Product boundary:** synchronize only new eligible items created after connection. Updates/deletes remain unsupported until AI Brain has content versions and deletion tombstones.
