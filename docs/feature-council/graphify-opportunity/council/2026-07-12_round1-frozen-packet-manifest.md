# Round 1 Frozen Packet Manifest

**Frozen:** 2026-07-12 23:50:33 IST  
**Combined packet SHA-256:** `05048a7a000ede70034bd06e0de05c70d0216b076c1d86dc545b3027f4355512`  
**Freeze commit:** `bad4fbd2af6a480aa8c208324bbb23e7234990a2` (use this commit to reproduce listed bytes after post-decision log/Wiki updates)
**Candidates:** B-00, C-01, C-02, C-03; C-03 variants are conditional only

## Hash construction

Each line below is `<SHA-256><two spaces><repository-relative path>`, sorted by path. The combined packet hash is SHA-256 of those exact UTF-8 lines joined with `LF`, including a final `LF`. The manifest itself is not included, avoiding a circular hash.

```text
5cf078df9b18342e5e88ed50abbb2c3d94288e70987a5e640507f916d63d2587  docs/feature-council/graphify-opportunity/DECISION_LOG.md
af00244de94c4d0cadca3ace4407b39e4a6da059de6fb199bc823cbdea9e5738  docs/feature-council/graphify-opportunity/RISK_REGISTER.md
e1073428fc4b65c0ecdd74286ac96f0d95062b93a759385d9c248d2ab521655e  docs/feature-council/graphify-opportunity/audit/2026-07-12_ai-brain-feature-audit_v2.md
55dff89823dc336cc3938e6657c9893b7ea9254fff3681df5880433117cd0a9a  docs/feature-council/graphify-opportunity/audit/2026-07-12_capability-acceptance-test-closure.csv
c4a694d91589c49828e53c9a991cf296c4e249e8cba23aa2f71f389eef8fad80  docs/feature-council/graphify-opportunity/audit/2026-07-12_capability-status-evidence-ledger.csv
b910f3facef23fd4f0f8f034855e078b125babfe5d3c78367ece17977c4bf44b  docs/feature-council/graphify-opportunity/audit/2026-07-12_semantic-event-and-graph-input-lifecycle-matrix.md
54986f429c2819ec03162d9205f0e3008481f05a90d7bcd0cafdde2d408aa5da  docs/feature-council/graphify-opportunity/council/2026-07-12_opportunity-shortlist_v2.md
8ba9973366e9ae1e1099e372501cfc46b46824e314ded5bdf0b8a468396cc162  docs/feature-council/graphify-opportunity/council/2026-07-12_round1-evaluation-rubric.md
9efe26002d561c6be939c4fb532b14da93383e794365eeccddd684e4dfb703fa  docs/feature-council/graphify-opportunity/research/2026-07-12_ai-brain-versus-graphify-capability-comparison.md
a9824c7f973a92933eb428a7156d4594e2aa30fa0e93d3aefa872b7f07ebee6b  docs/feature-council/graphify-opportunity/research/2026-07-12_graphify-research-note_v2.md
d3c6b0c343fd46775880ab5955ed7bd3dc03d2a72f5383ae71c9d612f6a9e508  docs/feature-council/graphify-opportunity/reviews/2026-07-12_ai-brain-audit-v2-qa-evidence-review.md
36952331e825e379e5ea9388982bddbe2cbac6aba8200354765ce6d384f007d0  docs/wiki/Feature-Council-FCP-004-Relationship-Graph-Connection-Map-PRD-v2.md
d436da0aa99e1470b12d06ca33de524b7a48ef5a9ac476e3e6d7dbd5dba611fa  docs/wiki/Feature-Council-FCP-004-Relationship-Graph-Connection-Map-Technical-v2.md
a2ea9bd58b4900ebc662ca50b6300122be0b43964c0c255d72216ab3200a5014  docs/wiki/Feature-Council-FCP-004-Relationship-Graph-Connection-Map-UX-v2.md
```

## Blind evaluation controls

- Evaluators may read only this manifest and its listed packet files before submitting.
- Evaluators must not read any other Round 1 submission, draft comparative matrix, reviewer conclusion, or coordinator synthesis.
- Every submission must declare the combined hash and blindness statements required by the rubric.
- Each evaluator owns one separate file. No shared-file edits are allowed during Round 1.
- Any material change to a listed packet file invalidates all submissions and restarts Round 1 with a new hash.
- Evaluation files are not packet inputs and do not change the hash.
- Post-decision updates to `DECISION_LOG.md` and FCP-004 Wiki status do not retroactively change the frozen evaluation evidence; the freeze commit above preserves the exact packet.
- `Unknown` remains non-passing. No Round 1 submission authorizes code, dependency, prototype, deployment, or merge.
