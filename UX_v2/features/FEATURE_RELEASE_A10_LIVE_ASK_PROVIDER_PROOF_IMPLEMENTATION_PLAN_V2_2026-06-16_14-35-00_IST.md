# A10 Live Ask Provider Proof Implementation Plan V2

Created: 2026-06-16 14:35:00 IST
Owner: Main Codex execution agent
Status: Approved for execution after adversarial review
Source PRD: `FEATURE_RELEASE_A10_LIVE_ASK_PROVIDER_PROOF_PRD_V2_2026-06-16_14-32-00_IST.md`

## Steps

1. Run `npm run check:ai-providers -- --warn-only`.
2. Inspect local Ollama state without installing or mutating environment:
   - `which ollama`
   - process check for Ollama
   - `curl --max-time 3 http://localhost:11434/api/tags`
3. If all providers pass, run synthetic live Ask proof.
4. If any required provider fails, create A10 blocked QA report.
5. Update A7 release packet and trackers.

## Release Status

A10 passes only with reachable providers and live Ask proof. Missing local provider tooling keeps release status `local_candidate_only`.
