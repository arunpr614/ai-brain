# A10 Live Ask Provider Proof Implementation Plan Adversarial Review

Created: 2026-06-16 14:34:00 IST
Reviewer: Main Codex using adversarial-review standard
Status: Review complete

## Findings

| Severity | Finding | Evidence | Required revision |
| --- | --- | --- | --- |
| P1 | V1 does not say what to do if providers are missing locally. | A failed preflight could be ignored as "warning mode." | Treat failed provider preflight as release-blocking unless a live Ask proof is captured through another approved provider. |
| P1 | V1 does not explicitly record non-installation. | Installing Ollama or models could be slow and change the user's machine. | State that A10 inspects only; environment setup requires a separate approved task. |
| P2 | V1 lacks exact commands/evidence fields. | Future agents need reproducible blocker evidence. | Capture `check:ai-providers`, `which ollama`, process check, and local port probe. |

## Recommendation

Proceed with revised plan and record blocked status if Ollama/provider checks fail.
