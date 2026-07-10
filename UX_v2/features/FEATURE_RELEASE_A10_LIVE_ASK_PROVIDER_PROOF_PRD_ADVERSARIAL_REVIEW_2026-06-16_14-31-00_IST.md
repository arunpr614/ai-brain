# A10 Live Ask Provider Proof PRD Adversarial Review

Created: 2026-06-16 14:31:00 IST
Reviewer: Main Codex using adversarial-review standard
Status: Review complete

## Findings

| Severity | Finding | Evidence | Required revision |
| --- | --- | --- | --- |
| P1 | V1 could overclaim Ask proof by checking provider reachability only. | Reachability does not prove a grounded answer or citations. | Require a live Ask route/API answer only when providers are reachable; otherwise explicitly mark Ask proof blocked. |
| P1 | V1 does not prevent accidental provider/environment mutation. | Installing Ollama/models or changing `.env` could alter the user's machine and release configuration. | Add a no-mutation rule: inspect and run safe checks only, unless a separate environment setup feature is approved. |
| P2 | V1 does not define what evidence is safe. | Ask prompts may contain private saved content. | Use synthetic fixtures only and redact any token/code patterns in reports. |

## Recommendation

Revise before execution. A blocked provider proof is acceptable evidence, but it must not be represented as a release pass.
