# Gate 6 publication-safe safety matrix

**Artifact state:** Final pre-lock review-ready fixture/evaluator contract<br>
**Fixture schema:** `1.2`<br>
**Evaluator:** `safety-fixture-evaluator/1.0.0`<br>
**Verification date:** 2026-07-18<br>
**Primary benchmark denominator:** No

This matrix maps every `SAFE-*` fixture to one of four truthful oracle types:

- `executable_check` runs a deterministic, local check in the safety evaluator;
- `exact_existing_test` names an exact separately executable test, while the evaluator reports `not_applicable` rather than pretending the reference was executed;
- `known_gap` records a verified current-control gap without running a fake implementation; and
- `not_executed` records a dependent check that cannot run because its prerequisite gate is blocked.

The evaluator imports only the current pure YouTube-ID helper, the current literal private-address helper, and the frozen benchmark scorer/preflight functions. It does not invoke the DNS resolver, open a socket, fetch, follow a redirect, start the application, call a provider/model, read credentials or environment values, or use real corpus material. Generated file and repetition fixtures exist only in memory. Its JSON output contains aggregate counts plus fixture ID, status, and reason code; it contains no fixture input, transcript text, URL, test path, local path, or exception message.

## Status interpretation

| Status | Meaning |
|---|---|
| `pass` | The exact narrow executable helper or benchmark-guard expectation passed. It is not an end-to-end production-readiness claim. |
| `known_gap` | The expected safety behavior is absent or the executable current helper did not meet it. |
| `not_applicable` | The evaluator deliberately did not execute an exact external test, or the dependent Gate 4 check has not yet become runnable. |

The prospective local snapshot is **33 fixtures: 18 `pass`, 8 `known_gap`, and 7 `not_applicable`**. This is evidence that Gate 6 has material open security/product gaps, not evidence that the product safety gate passed.

## Fixture-to-oracle mapping

| Fixture | Oracle actually used | Evaluator status / reason | Scope-correct interpretation |
|---|---|---|---|
| `SAFE-URL-01` | Execute current `extractVideoId` | `pass` / `YOUTUBE_HELPER_REJECTED_UNSUPPORTED_HOST` | The pure helper does not recognize the reserved unsupported host. |
| `SAFE-URL-02` | Execute current `extractVideoId` | `pass` / `YOUTUBE_HELPER_REJECTED_MALFORMED_ID` | The pure helper rejects this short identifier. |
| `SAFE-URL-03` | Explicit current-product gap | `known_gap` / `PLAYLIST_FALLS_THROUGH_GENERIC_CAPTURE` | Playlist parsing returns no video ID, but product routing can treat it as a generic URL instead of an explicit unsupported YouTube state. |
| `SAFE-URL-04` | Parse literal locally; execute current `isPrivateAddress` | `pass` / `PRIVATE_HELPER_BLOCKED_IPV4_LOOPBACK` | Literal IPv4 loopback is classified private; no request occurs. |
| `SAFE-URL-05` | Parse literal locally; execute current `isPrivateAddress` | `pass` / `PRIVATE_HELPER_BLOCKED_IPV6_LOOPBACK` | Literal IPv6 loopback is classified private; no request occurs. |
| `SAFE-URL-06` | Parse through WHATWG `URL`; execute current `isPrivateAddress` on the canonical hostname | `known_gap` / `PRIVATE_HELPER_MISSED_CANONICAL_MAPPED_IPV6` | URL canonicalization changes the dotted mapped address to hexadecimal form that the current helper misses. |
| `SAFE-URL-07` | Parse literal locally; execute current `isPrivateAddress` | `pass` / `PRIVATE_HELPER_BLOCKED_METADATA_ADDRESS` | The link-local metadata-service literal is classified private. |
| `SAFE-URL-08` | Parse literal locally; execute current `isPrivateAddress` | `pass` / `PRIVATE_HELPER_BLOCKED_PRIVATE_10` | The `10/8` literal is classified private. |
| `SAFE-URL-09` | Parse literal locally; execute current `isPrivateAddress` | `pass` / `PRIVATE_HELPER_BLOCKED_PRIVATE_172` | The `172.16/12` literal is classified private. |
| `SAFE-URL-10` | Parse literal locally; execute current `isPrivateAddress` | `pass` / `PRIVATE_HELPER_BLOCKED_PRIVATE_192` | The `192.168/16` literal is classified private. |
| `SAFE-URL-11` | Parse literal locally; execute current `isPrivateAddress` | `pass` / `PRIVATE_HELPER_BLOCKED_IPV6_LINK_LOCAL` | The IPv6 link-local literal is classified private. |
| `SAFE-URL-12` | Execute both current pure helpers on the parsed userinfo-confusion URL | `pass` / `HELPERS_BLOCKED_USERINFO_HOST_CONFUSION` | The string is not recognized as YouTube and its actual literal host is classified private. |
| `SAFE-URL-13` | Execute current `extractVideoId` | `pass` / `YOUTUBE_HELPER_REJECTED_UNSUPPORTED_MEDIA` | The pure helper does not recognize the unsupported media URL as YouTube. |
| `SAFE-URL-14` | Explicit current-product gap; no mock fetch | `known_gap` / `REDIRECT_HOPS_NOT_REVALIDATED` | Generic capture follows redirects without validating every hop. A declarative resolution sequence is not called a test. |
| `SAFE-URL-15` | Explicit current-product gap; no mock DNS | `known_gap` / `DNS_RESOLUTION_NOT_PINNED_OR_REVALIDATED` | The generic check does not pin or revalidate resolution at connection/redirect time. A declarative sequence is not called a test. |
| `SAFE-URL-16` | Execute current `extractVideoId` | `pass` / `YOUTUBE_HELPER_REJECTED_SUFFIX_CONFUSION` | The suffix-confusion host is not recognized as YouTube. |
| `SAFE-URL-17` | Execute current `extractVideoId` | `pass` / `YOUTUBE_HELPER_REJECTED_NON_HTTP_SCHEME` | The non-HTTP scheme is not recognized as YouTube. |
| `SAFE-URL-18` | Execute current `extractVideoId` | `known_gap` / `YOUTUBE_HELPER_ACCEPTED_OVERLONG_ID_PREFIX` | The watch pattern accepts the leading 11 characters of an overlong identifier instead of requiring an ID boundary. |
| `SAFE-STATE-01` | Explicit current-product gap | `known_gap` / `NO_EXPLICIT_SCHEDULED_PREMIERE_CONTRACT` | There is no shared scheduled-premiere contract proving a truthful no-acquisition state. |
| `SAFE-STATE-02` | Explicit current-product gap | `known_gap` / `LIVE_RETRY_HAS_NO_HARD_LIFETIME_BUDGET` | Live caption gaps are retryable and recovery lacks a hard lifetime request budget. |
| `SAFE-STATE-03` | Exact separate test: `src/lib/capture/youtube-transcript/recovery.test.ts` — “treats unavailable videos as terminal manual-needed failures” | `not_applicable` / `EXACT_EXISTING_TEST_REQUIRES_SEPARATE_EXECUTION` | The exact unit test proves terminal/non-retry classification only when executed separately; it does not prove pre-classification network behavior or distinguish private from deleted. |
| `SAFE-TXT-01` | Exact separate A1 harness test: “DEV integration: instruction/tool/exfiltration-looking cue text remains inert data” | `not_applicable` / `EXACT_EXISTING_TEST_REQUIRES_SEPARATE_EXECUTION` | The separate test proves instruction-looking cue text remains ordinary A1 ingestion data with zero network/provider attempts and safe stdout. |
| `SAFE-TXT-02` | Same exact A1 harness test | `not_applicable` / `EXACT_EXISTING_TEST_REQUIRES_SEPARATE_EXECUTION` | The separate test proves tool-trigger-looking cue text is persisted as data and triggers no tool/provider/network action in the isolated A1 boundary. |
| `SAFE-TXT-03` | Explicit current-product gap | `known_gap` / `TRANSCRIPT_OUTPUT_SANITIZATION_NOT_END_TO_END_TESTED` | The harness detects parser transformation, but every future transcript/enrichment render and export sink lacks end-to-end sanitization evidence. |
| `SAFE-TXT-04` | Explicit dependent check not run | `not_applicable` / `GATE4_NOT_RUN_NO_CITATION_VALIDATOR_RUN` | Gate 4 is conditional on Gates 1 and 3 and has not run, so no false-timestamp enrichment/citation validator result exists yet. |
| `SAFE-TXT-05` | Same exact A1 harness test as `SAFE-TXT-01` | `not_applicable` / `EXACT_EXISTING_TEST_REQUIRES_SEPARATE_EXECUTION` | The separate test proves exfiltration-looking text causes no secret/provider/network action in isolated A1 ingestion; it does not validate a model boundary. |
| `SAFE-TXT-06` | Generate 50,001 tokens in memory; execute frozen scorer normalization | `pass` / `SCORER_REJECTED_REPETITION_BEFORE_DP` | The benchmark scorer rejects above its 50,000-token cap before dynamic programming. This is not a production pre-model request-body limit. |
| `SAFE-TXT-07` | Explicit dependent check not run | `not_applicable` / `GATE4_NOT_RUN_NO_MODEL_PROMPT_BOUNDARY_RUN` | Gate 4 is conditional on Gates 1 and 3 and has not run; no model prompt boundary or transcript-directed tool policy result exists yet. |
| `SAFE-FILE-01` | Generate invalid UTF-8 bytes in memory; execute strict preflight | `pass` / `PREFLIGHT_REJECTED_INVALID_UTF8` | The prospective strict benchmark boundary rejects replacement decoding. |
| `SAFE-FILE-02` | Generate one valid plus one malformed cue in memory; execute strict preflight | `pass` / `PREFLIGHT_REJECTED_MIXED_MALFORMED_FILE` | The strict boundary fails the whole file rather than dropping the bad cue. |
| `SAFE-FILE-03` | Generate `maxBytes + 1` bytes in memory; execute strict preflight | `pass` / `PREFLIGHT_REJECTED_OVERSIZED_BYTES` | Strict preflight rejects before UTF-8 decode or parsing. Product multipart buffering remains a separate known audit gap. |
| `SAFE-FILE-04` | Generate `maxCues + 1` minimal cues in memory; execute strict preflight | `pass` / `PREFLIGHT_REJECTED_EXCESSIVE_CUES` | Strict preflight rejects above its parser ceiling. |
| `SAFE-FILE-05` | Exact separate A1 harness test: “DEV integration: unknown completeness is a truthful safe rejection before DB/app imports” | `not_applicable` / `EXACT_EXISTING_TEST_REQUIRES_SEPARATE_EXECUTION` | The exact harness test must be run separately; a listing is not counted as execution. |

## Separate exact-test evidence

The evaluator intentionally does not spawn test runners. Before Commit A and again when Gate 6 evidence is recorded, run these local suites under the repository’s deny-network development rules:

```sh
node --import tsx --test src/lib/capture/youtube-transcript/recovery.test.ts
node --import tsx --test docs/feature-council/youtube-transcript-enrichment/spikes/a1-harness/tests/cli.integration.test.ts
```

The relevant exact test names are frozen in `SAFETY_FIXTURES.json`. Passing those suites does not change evaluator rows from `not_applicable`; the separate command output is the execution evidence. The A1 hostile-data test is deliberately limited to local transcript ingestion. `SAFE-TXT-07` prevents that evidence from being generalized to the conditional enrichment/model stage before a sealed Gate 4 run.

**Pre-lock DEV verification on 2026-07-18:** the unavailable-state exact test passed 1/1, and the two selected A1 harness exact tests passed 2/2, with zero failures. This is local synthetic/unit evidence only; it is not a primary experiment or a production end-to-end result.

The evaluator itself also completed with the 18/8/7 snapshot under an external macOS `deny network*` sandbox. No network exception occurred and no external-test row was promoted to a pass.

## Gate 6 consequence

The current snapshot cannot support a production-safety pass. At minimum, a future authorized implementation would need strict video-ID boundaries, explicit playlist/live/scheduled states, full address-range handling after URL canonicalization, redirect-hop validation, connection-time DNS pin/revalidation, pre-buffer request caps, hard retry/lifetime budgets, complete rendering/export sanitization, and a tested enrichment prompt/citation/tool boundary. No production change is authorized by this matrix.
