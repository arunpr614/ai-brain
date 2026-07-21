# Focused QA Baseline

**Code baseline:** `ad78d77495dcaa90f62aab038fe63ae95cf36862`<br>
**Executed:** 2026-07-16<br>
**Result:** 194 tests passed; 0 failed, skipped, cancelled, or todo; 28 suites; about 7.7 seconds

## Scope

The focused mocked/unit run covered:

- YouTube URL/platform recognition, automatic extractor, metadata, URL safety, and policy;
- VTT/SRT/TXT parsing and user-provided transcript persistence;
- official-caption and owned-media STT adapters plus the deliberately disabled public route;
- transcript recovery, provider cooldown, durable jobs/attempts, and worker failure paths;
- enrichment prompt/pipeline utilities;
- Anthropic/OpenRouter/factory behavior, including OpenRouter routing pins;
- embedding, item-level FTS, and retrieval.

The run used the repository lockfile and local test doubles. It did not contact YouTube, use credentials, invoke an external model, incur spend, or exercise production.

## Interpretation

Passing tests confirm the repository’s intended code contracts at the audited commit. They do not resolve the audit findings because the relevant gaps are mostly missing invariants or missing tests: automatic-path policy provenance, redirect/caption-host safety, hostile transcript isolation, long-video coverage, truthful provider/cost accounting, remote-call lease/timeout behavior, and segment-level search/navigation.

## Reproduction

Use Node with the repository’s `tsx` import hook and pass the focused test files under:

- `src/lib/capture/`
- `src/app/api/capture/transcript/`
- `src/app/api/transcripts/owned-media/`
- `src/db/transcript-jobs.test.ts`
- `src/lib/queue/transcript-worker.test.ts`
- `src/lib/enrich/`
- `src/lib/llm/`
- `src/lib/embed/`
- `src/lib/search/`
- `src/lib/retrieve/`

The complete test command is preserved in the task execution record; no test output containing source content is committed.
