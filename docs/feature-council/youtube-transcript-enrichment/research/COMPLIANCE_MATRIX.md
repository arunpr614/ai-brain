# YouTube Transcript and Enrichment — Compliance Matrix

**Status:** Pre-seal research classification — no legal or policy approval claimed<br>
**Access date baseline:** 2026-07-16; reconciled 2026-07-18

| Method ID | Exact mechanism | Declared supported class | Auth/user authorization | Software/license | Official-policy evidence | Bot/control exposure | Storage/data posture | Cost | Failure behavior | Benchmark state | Allowed classification(s) |
|---|---|---|---|---|---|---|---|---:|---|---|---|
| ACQ-SIDECAR (A1) | Authorized source-published UTF-8 SRT/VTT locally supplied; isolated parse/normalization | Exact source-published sidecar with source-row association, locked hash, provisional private-research classification, and no provider transfer | Evidence-bound attestation; no YouTube credential or caption request; production/legal-policy review remains required | Spike-only fail-closed wrapper around in-repo service/parser; no production change | Sidecar is not retrieved as API Data; source terms still govern every downstream use | Zero egress; direct local seed; no full instrumentation/workers/providers | Current product auto-asserts rights/full-text retention and lacks lifecycle enforcement; benchmark keeps full text private and expires it | USD 0 | Whole-file fail closed on invalid UTF-8/empty or malformed cue/unsafe timing; zero silent loss | Five positive and four rejection cells prepared; eligible only after seal; current-product readiness separately expected `0/5` | **Suitable only for controlled research; requires legal or policy review** |
| ACQ-OAUTH (A2) | Official YouTube Data API `captions.list` then explicit `captions.download?tfmt=vtt` | Caption track selected by an OAuth user permitted to edit the video | `youtube.force-ssl`/partner OAuth; minimum scope, verified public app, contextual disclosure/consent, identity binding, revocation | Official API; current adapter is dormant and accepts a raw token | API terms/policies, User Data Policy, derived-output matrix, and written compliance determination required | No bot bypass; quota/OAuth only; no fallback | No active OAuth/consent/revocation lifecycle; derived outputs and retention remain unresolved; list+download costs 250 quota units | USD 0 but API quota and high implementation/compliance cost | Truthful blocked/manual state; explicit caption ID; no translation or scraping fallback | Excluded before run; zero OAuth tokens, API calls, quota units, and cells | **Requires user authorization; requires legal or policy review** |
| STT-LOCAL (A3) | Local STT over independently authorized source-origin media | Owner/rights-holder source media; never YouTube-downloaded media | Exact media grant and independent speech reference required | At most two locally frozen engines if the corpus trigger fires | Source grant governs; no undocumented YouTube acquisition | Local compute only; source media remains outside Git | Trigger is 1/10; no eligible two-row increase or independent speech references | USD 0 | Truthful not-triggered state; no media/model download | Gate 2 not triggered; zero cells and zero runs | **Suitable only for controlled research; requires user authorization; requires legal or policy review** |
| X-UNOFFICIAL | `youtube-transcript-api`, `yt-dlp`, current InnerTube path, or another undocumented/public-web extraction tool | No proposed production class | Usually none; cookie/proxy/auth features are prohibited here | `youtube-transcript-api` 1.2.4 MIT; `yt-dlp` 2026.7.4 core Unlicense with bundled-license differences | Official policies prohibit undocumented API use and scraping/obtaining scraped YouTube data | High: IP blocking, anti-bot, proxy/cookie temptation, upstream drift | Full transcript storage would compound the unresolved source/policy issue | USD 0 in this research | Fail closed to metadata/manual repair; no proxy, cookie, alternate identity, or access-control workaround | Rejected before run; excluded desk-research class, not a fourth experimental method | **Technically unsuitable; rejected** |

Allowed classifications are: suitable for further production planning; controlled research only; requires user authorization; requires legal/policy review; technically unsuitable; rejected.

## Non-negotiable boundaries

- Technical access is not legal or policy approval.
- No cookies, personal YouTube credentials, private videos, or bypass of authentication, age, region, bot, or other access controls.
- No arbitrary-fetch fallback.
- No complete copyrighted transcript or media in Git.
- Any official caption API requiring owner authorization is evaluated only for that explicitly authorized class.
- Third-party claims remain third-party claims until corroborated by primary evidence and a controlled post-lock spike.

## Policy interpretation boundary

The Developer Policies state that API clients must not use API Data to create new or derived data or metrics. Whether an AI summary, chapters, tags, or embedding derived from an officially downloaded caption is covered in this use case is a material interpretation, not a settled technical fact. ACQ-2 therefore remains blocked on a written compliance/legal determination or a successful YouTube API compliance-review route. Content ownership alone does not waive YouTube API/platform terms.

## Current recommendation

Use ACQ-SIDECAR only as a controlled isolated Gate 1 strategy-feasibility candidate for the exact source-published VTT class. It is not automatic YouTube acquisition and the shipping route is not production-ready. Keep ACQ-OAUTH excluded/not run pending OAuth, lifecycle, quota, consent, exact editor authorization, and compliance work. Keep STT-LOCAL not triggered because its two-part corpus trigger is only 1/10. Reject X-UNOFFICIAL under this project’s production posture without spending experiment budget on behavior that cannot clear the posture requirement.
