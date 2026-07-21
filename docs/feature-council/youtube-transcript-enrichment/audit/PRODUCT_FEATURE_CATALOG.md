# Product Feature Catalog

**Scope:** Lightweight product-wide catalog; detailed findings are limited to YouTube ingestion and enrichment.<br>
**Code baseline:** `ad78d77495dcaa90f62aab038fe63ae95cf36862` (`origin/main`)<br>
**Production evidence baseline:** `8c1341100b174fe4ca518e6a745c30b9078df21c`, recorded as verified in `docs/agent-docs/source-baseline.json` on 2026-07-12<br>
**Audited:** 2026-07-16

“Implemented on `main`” means code and protecting tests exist at the audited commit. It does not imply that a runtime flag is enabled, credentials exist, an external provider still behaves as expected, or the path has policy approval. “Production verified” is used only when the maintained production evidence supports it.

| Product area | Classification | Current capability | Important boundary |
|---|---|---|---|
| Notes and text capture | Implemented on `main`; production baseline verified | Save user-authored notes and selected text | Not re-audited deeply |
| Generic URL/article capture | Implemented on `main`; production baseline verified | Public-URL validation, bounded fetch, Readability extraction, provenance | Redirect targets are not revalidated; see focused audit |
| PDF capture | Implemented on `main`; production baseline verified | Authenticated upload/extraction path with validation | Not re-audited deeply |
| YouTube URL recognition | Implemented on `main` | Watch, `youtu.be`, Shorts, mobile watch, and embed URLs; strict 11-character ID; canonical watch URL | Playlist/channel/live URL classes are not given an explicit unsupported result |
| Automatic YouTube metadata and captions | Implemented on `main`; save/degraded fallback production-verified historically; transcript success variable | Fixed InnerTube player request, optional Data API metadata, timed-text parsing, oEmbed metadata fallback | Undocumented/unofficial acquisition; bypasses the newer policy/source/segment records |
| Inline pasted text during YouTube URL capture | Partial | Skips automatic caption retrieval and stores user text plus an artifact | Unlike the dedicated transcript repair API, it does not write a policy decision, transcript source, or segments |
| User-provided YouTube transcript repair | Implemented on `main`; documented as available | Paste or upload VTT/SRT/TXT/Markdown; writes a caller-supplied policy label, source, and segment provenance; resets derived state | Current API/UI collects no explicit rights attestation, and retention is not enforced at runtime |
| Official creator-authorized YouTube captions | Inactive | Library code lists/downloads caption tracks with OAuth and writes normalized provenance | No non-test product caller; current platform-policy posture still requires review |
| Owned-media speech-to-text | Inactive | Validation, attestation, adapter, and persistence libraries exist | Public route deliberately returns `503 provider_disabled`; no production provider is enabled |
| Transcript recovery queue | Implemented on `main`; control loop/cooldown production-verified historically; successful recovery variable | Durable jobs/attempts, backoff, cooldown, retry/manual/ignored/done states | Throttling can extend the nominal attempt cap indefinitely; flags are not in `.env.example` |
| Capture quality and repair | Implemented on `main` | Metadata-only/weak states, review queues, retry/ignore/manual repair, provenance display | UI claims about automatic public recovery do not fully agree with worker behavior |
| Generic AI enrichment | Implemented on `main`; production baseline verified | Summary, five quotes, category, cleaned title, and auto-tags | Only the first 12,000 body characters; no chapters, evidence graph, timestamp citations, or groundedness check |
| Generation providers | Implemented on `main` | Ollama, Anthropic, or OpenRouter selected independently for enrichment and Ask | Realtime usage accounting hardcodes Ollama/Qwen/zero cost even for remote providers |
| Embeddings | Implemented on `main`; production baseline verified | Ollama or Gemini; original content and AI summary are independently chunked | Transcript segments are not first-class indexed units |
| Search and retrieval | Implemented on `main`; production baseline verified | Item FTS, vector retrieval, Related, and citation-filtered Ask | Results collapse to item/chunk level; no search-within-transcript or timestamp hit navigation |
| Item detail and provenance | Partial | Original, digest, Ask, related, details, notes, repair, transcript source, and first segment preview | Timestamps are text, not seek links; preview is bounded; no transcript-local search |
| Tags, categories, topics, collections | Implemented on `main`; production baseline verified | Manual and AI tags, one generic category, topics, collections | Current enrichment taxonomy is not video-specific |
| Processing Inbox/workflow | Implemented on `main`; production baseline verified | Durable processing status and user workflow controls | Independent transcript/enrichment/embed states can diverge |
| Recall import | Implemented on `main`; runtime scope varies | Automated and separately gated manual paths documented | Outside this focused audit |
| Authentication and authorization | Implemented on `main`; production baseline verified | Session cookies, bearer clients, origin controls, rate limits, item-scoped mutations | New transcript routes must preserve both cookie/bearer contracts intentionally |
| Observability and analytics | Partial | Job attempts, provider-health cooldown, error JSONL, usage rows, operator logs | Provider/model/cost data is not reliable for comparative or billing claims |
| Deployment and backup | Production verified for recorded baseline | Unprivileged loopback service, managed edge, startup migrations/workers, backup scheduler | Current external caption behavior and runtime flags were not live-tested in this audit |
| Feature flags/configuration | Partial | Environment controls for transcript workers and model providers; several UI gates | Default-on transcript recovery is operationally surprising and under-documented |

## Classification notes

- No audited YouTube transcript capability is classified as policy-approved. Technical implementation is not legal approval.
- The repository’s relevant YouTube/transcript/enrichment code did not differ between the recorded production SHA and the audited `main` SHA. Historical log evidence separately verifies metadata-only save/requeue, recovery control-loop/cooldown, and production backfill dry-run behavior, but not reliable transcript success or current runtime configuration.
- Draft PR #6 is unmerged, conflicting, and not part of current behavior.
