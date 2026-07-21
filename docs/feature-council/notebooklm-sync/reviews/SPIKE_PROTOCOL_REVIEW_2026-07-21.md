# NotebookLM Spike Protocol — Security and QA Review

**Created:** 2026-07-21
**Reviewed target:** `spikes/SPIKE_PROTOCOL.md` before revision
**Review type:** Independent security/QA review; no execution

## Verdict

**No-go as originally drafted; revise before any authenticated write.** The original protocol correctly gated live work and prohibited real data, secret logging, blind retries, and modification of existing sources. It did not yet specify the evidence needed to prove target identity, reconcile ambiguous creates, verify permissions, manage credentials, or prove cleanup.

## P1 findings

1. **No exact lost-response reconciliation algorithm.** A warning to stop blind retries is insufficient without a durable pre-write marker/hash manifest and a deterministic enumeration/search decision tree.
2. **Marker collision across reruns.** A date plus test ID is not unique per execution.
3. **Credential lifecycle missing.** The protocol lacks credential-cache location/permissions, subject binding, scope-diff, revocation, and purge evidence.
4. **No target privacy baseline.** ACL and source/file inventory must be captured before and after each case.
5. **No terminal deletion proof.** Delete acknowledgement cannot be treated as cleanup completion.
6. **Enterprise usage logging unaddressed.** Its content risk, retention, readers, and current state must be checked.
7. **Drive staging needs its own contract.** Stable file ID, `appProperties`, revision control, permissions, one-time manual attachment, refresh qualification, and independent Drive/Notebook cleanup are distinct from Enterprise sources.
8. **Isolation tests missing.** Wrong account, wrong target, and unexpected sharing must fail before a write.

## P2 findings

1. No deterministic timeout injection around send, provider acceptance, response, and local commit.
2. No pending-state timeout, `Retry-After`, capacity-headroom, or cleanup-failure rule.
3. Evidence template omits exact API version/location, status history, tool version, request-shape hash, and sanitized request identifier.
4. The ten-source limit must count successful, failed, ambiguous, and leaked duplicates—not only currently visible successful sources.

## Required revision inputs

- Generate a per-execution UUID marker.
- Persist an ignored `0600` pre-write manifest before the provider call.
- Define zero/one/multiple reconciliation branches.
- Add subject, target, ACL, inventory, and usage-log preflights.
- Define temporary credential isolation, exact scopes, revocation, and purge proof.
- Split Enterprise and Drive/Docs success semantics.
- Add deletion terminal-state evidence and unresolved-cleanup reporting.
- Add wrong-account/target/sharing, timeout-boundary, revision-conflict, quota, capacity, and API-drift cases.
- Count every potentially accepted create against the hard limit.

## Go condition

The revised protocol may proceed to Gate 0 only after these controls appear in the canonical protocol. Passing that document review does not itself authorize authentication or a live write.
