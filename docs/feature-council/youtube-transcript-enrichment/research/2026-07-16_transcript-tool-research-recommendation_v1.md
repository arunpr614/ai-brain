# Transcript and Tool Research Recommendation — v1

**Decision-bearing artifact:** v1, awaiting independent adversarial review<br>
**Status:** Research recommendation — no Gate 1 pass/fail result yet<br>
**Verified:** 2026-07-16<br>
**Revalidate no later than:** 2026-10-14, and earlier after any YouTube policy/API or selected tool change

## Recommendation

Do not plan “automatic transcripts for arbitrary public YouTube videos.” Under the current primary evidence, the only acquisition class suitable for further production planning is a caption file directly supplied by the creator, rights holder, or an authorized user. A local STT fallback may later extend that class when the same user independently supplies authorized original media; it must never download media from YouTube.

The official YouTube captions API is technically real but narrowly creator/editor-scoped and not yet cleared for transcript-derived enrichment. Keep it as a conditional strategy pending a written compliance/legal determination or YouTube API compliance review. Reject `youtube-transcript-api`, `yt-dlp`, the current InnerTube path, cookies, proxies, and browser impersonation as production acquisition methods.

This is a technical/policy recommendation, not legal advice or legal approval.

## Current official facts

- [`captions.list`](https://developers.google.com/youtube/v3/docs/captions/list) returns caption-track metadata, not text; it requires OAuth and costs 50 quota units.
- [`captions.download`](https://developers.google.com/youtube/v3/docs/captions/download) returns a track only when the authorized user can edit the video; it requires OAuth, costs 200 units, and can return SRT, VTT, SBV, SCC, or TTML.
- The [caption resource](https://developers.google.com/youtube/v3/docs/captions) distinguishes ASR, forced, and standard tracks and supplies BCP-47 language metadata.
- The [YouTube API Services Developer Policies](https://developers.google.com/youtube/terms/developer-policies), updated 2026-06-24, prohibit undocumented API use, scraping/obtaining scraped YouTube data, and unauthorized audiovisual download/storage. They require timely revocation/deletion and generally require other authorized data to be refreshed or deleted within 30 days.
- The same policies prohibit using API Data to create new or derived data or metrics. It is a material inference—not a legal conclusion—that persistent transcript summaries, chapters, tags, or embeddings may fall within this restriction. Production use needs an explicit compliance determination.

## Method evaluation

### Strategy 1 — Creator/user-supplied SRT or WebVTT

**Declared supported class:** An existing YouTube item whose creator, rights holder, or authorized user directly supplies a UTF-8 caption file and records permission.

**Mechanism:** AI Brain accepts the file, validates type/size/encoding/cue count, deterministically parses it, records rights/retention/provenance and hashes, and stores normalized timestamped segments. It does not retrieve transcript contents or media from YouTube.

**Assessment:** Suitable for further production planning; requires user authorization. This is already the closest path to current `main` behavior. Its Gate 1 reliability can be measured prospectively on a fixed synthetic/permissioned sidecar corpus without external spend or YouTube credentials.

**Limits:** It is a repair/import workflow, not automatic public transcript retrieval. User friction and truthful unsupported states are central to the product decision.

### Strategy 2 — Official creator-authorized captions API

**Declared supported class:** Tracks on videos the OAuth user is permitted to edit.

**Mechanism:** `captions.list` → explicit track selection → `captions.download` in a frozen format; store source/hash/segments only within the consent and retention contract; never silently fall back to public scraping.

**Assessment:** Requires user authorization and legal/policy review. It is technically plausible and the repository already has a tested adapter, but there is no active product caller or consent/revocation lifecycle. The derived-data and retention rules make enrichment specifically unresolved.

**Limits:** Broad OAuth scope, quota, token protection, reauthorization, revocation deletion, 30-day refresh/delete, creator/editor-only coverage, and compliance-review lead time. No Gate 1 live run can occur without a dedicated authorized test identity and approval.

### Strategy 3 — Undocumented or downloader-based public extraction

**Declared supported class:** None for production.

**Mechanism:** `youtube-transcript-api`, `yt-dlp`, current InnerTube/timed-text code, or similar web-client/downloader behavior.

**Assessment:** Rejected for production. Current official policy prohibits undocumented API use and scraping. The tools also expose the exact operational failure surfaces the project prohibits: IP blocks, rotating proxies, cookies, authentication workarounds, region workarounds, and rapid upstream breakage.

**Failure behavior:** Existing product code should fail closed to an honest metadata-only/manual-repair state. This research will not test cookies, proxies, private/age/region-restricted access, alternate identities, or control bypass.

## Open-source inventory

| Tool | Version verified | License | Appropriate role |
|---|---:|---|---|
| [`youtube-transcript-api`](https://pypi.org/project/youtube-transcript-api/) | 1.2.4, released 2026-01-29 | MIT | Mechanism/maintenance desk research only; its documentation explicitly says it uses an undocumented web-client API and warns of IP blocking/breakage |
| [`yt-dlp`](https://pypi.org/project/yt-dlp/) | 2026.7.4, released 2026-07-04 | Core source/wheel Unlicense; bundled release components vary | Rejected production YouTube acquisition; general downloader and subtitle writer with broad cookie/proxy/auth surface |
| [`faster-whisper`](https://pypi.org/project/faster-whisper/) | 1.2.1, released 2025-10-31 | MIT | Preferred Gate 2 baseline for independently supplied authorized media; pin package, CTranslate2, model ID, and weight hash |
| [`WhisperX`](https://pypi.org/project/whisperx/) | 3.8.6, released 2026-05-25 | BSD-2-Clause | Optional second Gate 2 approach only if alignment/diarization has material value; freeze external model terms and hashes |
| [`openai-whisper`](https://pypi.org/project/openai-whisper/) | 20250625, released 2025-06-26 | MIT code and model weights | Underlying multilingual ASR reference family, not a YouTube acquisition method |

Software licensing never establishes content rights or platform permission.

## Conditional authorized-media fallback

If the locked corpus proves that creator-supplied captions leave material authorized coverage unmet, Gate 2 may compare at most two local approaches:

1. `faster-whisper` as the operational baseline.
2. WhisperX only for measured word alignment or speaker diarization value.

The input must be original media independently supplied by its creator or rights holder, with a stored permission record and hash. YouTube URL downloading is not an audio-access path. A hosted STT call is outside the zero-spend plan unless a separately authorized free path has acceptable data handling; free credits do not grant spending authority.

## Gate 1 implications

The prospective Gate 1 benchmark should measure Strategy 1 on a fixed set of synthetic/permissioned caption files and safe negative controls. Strategy 2 remains a documented blocked/conditional candidate unless authorization and compliance clearance arrive before protocol lock. Strategy 3 needs no behavioral benchmark to establish production rejection; desk evidence and current-code audit are the relevant result.

Passing Strategy 1 would justify at most a **Limited-go: creator/user-supplied captions only** trajectory. It would not validate automatic YouTube transcript retrieval, official caption-derived enrichment, or STT. The eventual gate decision still requires the locked ≥90% acquisition threshold, truthful recovery at 100%, and no circumvention at 100%.

## Unresolved questions

1. Does the applicable YouTube agreement permit durable AI enrichment derived from creator-authorized caption API data, and under what retention/deletion terms?
2. Can a dedicated product OAuth project obtain an appropriately narrow, reviewable consent experience for `youtube.force-ssl`?
3. Will the council accept the friction and limited coverage of direct caption upload as meaningful user value?
4. Does locally supplied media add enough authorized coverage to justify STT complexity?

## Primary sources

- [YouTube API Services Developer Policies](https://developers.google.com/youtube/terms/developer-policies)
- [YouTube developer-policy compliance guide](https://developers.google.com/youtube/terms/developer-policies-guide)
- [YouTube Data API captions list](https://developers.google.com/youtube/v3/docs/captions/list)
- [YouTube Data API captions download](https://developers.google.com/youtube/v3/docs/captions/download)
- [YouTube caption resource](https://developers.google.com/youtube/v3/docs/captions)
- [YouTube-supported caption file formats](https://support.google.com/youtube/answer/2734698?hl=en)
- Package/repository sources linked in the open-source inventory
