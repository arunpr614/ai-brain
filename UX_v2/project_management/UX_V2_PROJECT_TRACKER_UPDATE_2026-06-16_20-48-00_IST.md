# UX v2 Project Tracker Update - A19 Final Staged Candidate Review

Created: 2026-06-16 20:48:00 IST
Milestone: A19 Final Staged Candidate Review
Status: `request_changes_p1_blockers_confirmed`

## Summary

A19 reviewed only the staged 258-file candidate. The review found two confirmed P1 blockers: verified-session enforcement is missing on sensitive private surfaces, and Ask history can stay bound to the wrong thread after navigation.

## Confirmed Findings

| Severity | Finding | Status |
| --- | --- | --- |
| P1 | Sensitive private surfaces trust cookie presence instead of verified session HMAC | Must fix before commit/release |
| P1 | Ask history can display/write to wrong thread after route navigation | Must fix before commit/release |
| P2 | Tag/topic/collection Ask silently caps scope to 50 items | Follow-up or owner acceptance needed |
| P2 | Item deletion affordance is no longer reachable | Follow-up or owner acceptance needed |
| P3 | IPv6 localhost SW bypass misses `[::1]` | Follow-up |
| P3 | Mobile bulk selection lacks tag/add-to-collection actions | Follow-up |

## Current Gates

| Gate | Status | Note |
| --- | --- | --- |
| A18 staged candidate validation | Passed | Still staged at 258 paths. |
| A19 final code review | Request changes | P1 blockers confirmed. |
| Commit/PR/push | Blocked | Requires A20 fix/revalidation first. |
| APK publication | Blocked | Needs explicit authorization and target after code blockers are resolved. |

## Next

1. Create A20 governed fix/revalidation slice.
2. Fix verified-session enforcement and Ask thread-state reset.
3. Rerun affected tests plus staged validation needed by changed surfaces.
4. Re-review before commit consideration.
