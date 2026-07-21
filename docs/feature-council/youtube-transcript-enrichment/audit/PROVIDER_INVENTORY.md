# Current Provider Inventory

**Baseline:** `ad78d77495dcaa90f62aab038fe63ae95cf36862`<br>
**Audited:** 2026-07-16<br>
**Rule:** A provider’s presence in code is not evidence that it is enabled, funded, policy-approved, or currently healthy.

## YouTube and transcript acquisition

| Provider/method | Classification | Authentication | Runtime use | Data produced | Audit boundary |
|---|---|---|---|---|---|
| YouTube InnerTube player + timed text | Implemented on `main`; active path | None | Automatic URL capture and recovery worker | Metadata, formatted transcript body, raw timed-text artifact | Undocumented/unofficial; bot/rate-limit exposure; no policy/source/segment write |
| YouTube Data API `videos.list` | Implemented, optional | API key | Metadata enrichment when key is configured | Title, channel, duration, description, date, thumbnail, raw JSON | Does not provide transcript text |
| YouTube oEmbed | Implemented fallback | None | Anti-bot metadata-only fallback | Title, author, thumbnail | Metadata only |
| User paste/upload | Implemented and available | AI Brain session or approved bearer | Repair flow | Policy decision, source, normalized text/segments | Requires user authorization/rights attestation contract |
| YouTube Data API `captions.list/download` | Implemented library; inactive | Creator/editor OAuth token | No non-test product caller | Official caption VTT, source, segments, provenance | API permissions and derivative/storage policy require review before production planning |
| Owned uploaded media + STT | Inactive | AI Brain session plus rights attestation | Route validates then returns disabled | Library can produce source/segments | Authorized media path and a provider must be approved and enabled |
| OpenAI-compatible STT | Inactive adapter | Provider API key | Not invoked by public route | Paragraph-only transcript in current adapter | No timestamps; hosted data handling/cost not approved under this goal |

## Text generation

| Provider | Classification | Selection | Relevant behavior | Reproducibility/ops gap |
|---|---|---|---|---|
| Ollama | Implemented; default in code | `LLM_ENRICH_PROVIDER=ollama` / `LLM_ASK_PROVIDER=ollama` | Local generation/streaming/JSON; model configurable | Exact deployed model and hardware need runtime evidence |
| Anthropic direct | Implemented | Provider environment variables and API key | Generation, streaming, JSON, optional message batches | Paid calls are prohibited in this research; retention/privacy terms must be frozen for recommendation |
| OpenRouter | Implemented | Provider environment variables and API key | OpenAI-compatible chat; upstream order; fallbacks disabled; `data_collection: deny` | No request timeout by default; request ID/upstream/price/router config not persisted; paid calls prohibited |

The current enrichment pipeline invokes the selected provider but records every realtime result as provider `ollama`, a fixed Qwen model (or `unknown`), and USD 0. This inventory therefore must not use `llm_usage` as a trustworthy source for provider cost or comparative model evidence.

## Embeddings

| Provider | Classification | Selection | Relevant behavior | Boundary |
|---|---|---|---|---|
| Ollama embedding service | Implemented | Embedding provider configuration | Local 768-dimensional embeddings | Exact runtime model/availability needs host evidence |
| Google Gemini embeddings | Implemented | Provider configuration and API key | Hosted 768-dimensional embedding path | External data handling and cost must be evaluated separately |

## Routing constraints for the future benchmark

Any Gate 4 comparison must freeze canonical model ID, exact upstream provider, routing block, modality, prompt/schema hashes, token/reasoning settings, request ID, retry/fallback, usage, and execution-time price. Aliases, automatic model routing, and the current usage ledger are insufficient for reproducibility.
