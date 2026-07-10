# A10 Live Ask Provider Proof PRD V2

Created: 2026-06-16 14:32:00 IST
Owner: Main Codex execution agent
Status: Product source for A10 execution
Source blocker: A7 release packet live Ask/provider proof

## Goal

Produce honest release evidence for live Ask/provider readiness. The result can be either:

- Passed: providers reachable and synthetic live Ask answer/citation evidence captured.
- Blocked: providers unreachable or missing, with the exact environment blocker documented.

## Acceptance Criteria

| ID | Requirement | Release acceptance |
| --- | --- | --- |
| A10-PROVIDER | Configured enrichment, Ask, and embedding providers are checked. | Provider check output is captured without secrets. |
| A10-ASK | Live Ask is attempted only when providers are reachable. | Synthetic prompt returns a grounded answer/citation path; no private production data is used. |
| A10-NO-MUTATION | Environment is not changed silently. | Do not install Ollama/models or change `.env`; record blockers instead. |
| A10-TRACKING | Release docs stay accurate. | A7 release packet, tracker, and milestone tracker reflect passed or blocked status. |

## Explicit Non-Goals

- Installing Ollama or downloading models.
- Switching provider configuration.
- Production deployment.
- Android runtime validation.
