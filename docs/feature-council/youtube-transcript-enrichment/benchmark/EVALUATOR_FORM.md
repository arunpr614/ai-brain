# Blinded Enrichment Evaluator Form

> **STATUS: NON-AUTHORITATIVE HUMAN-READABLE WORKSHEET — MACHINE SCHEMAS AND EXECUTION CONTRACT CONTROL**

**Template version:** 1.0<br>
**Reconciled:** 2026-07-18

Use only after Gates 1 and 3 pass under the same verified seal and the deterministic Gate 4 output/schema/reference checks complete. The exact packet, decisions-only generation, trusted-wrapper result, adjudication, and aggregation schemas in `benchmark/model/` are authoritative; this form is an explanatory worksheet and cannot be submitted as a result. Evaluators receive bounded blinded evidence packets, never private paths, credentials, candidate identity, or one another's work.

## Packet identity

- Packet ID:
- Evaluator role: A / B
- Packet SHA-256:
- Evaluator instruction SHA-256:
- Assigned randomization seed/ordering hash:
- Started/completed UTC:
- Confirmation: model, provider, price, latency, filenames, and run order are hidden.
- Confirmation: the other evaluator’s work has not been viewed.

## Per-item scoring

| Field | Required value |
|---|---|
| Blinded item ID | String |
| Material claims | Each claim text, evidence interval(s), fully/partially/unsupported/contradicted, rationale |
| Critical hallucinations | Count, category, rationale; zero is explicit |
| Required citations | Count |
| Correct citations | Count; interval clipped to duration and matched within ±5 seconds |
| Missing required citations | Count once each |
| Text-groundable key points | Covered / required, with point IDs |
| Visual-only key points | Covered / required, with point IDs |
| Contradictions | Point IDs and rationale |
| Schema/semantic-reference issue | Yes/no and exact field/reference |
| Confidence | Low/medium/high; not used to override deterministic scoring |

## Deterministic disagreement detection

The evaluator does not adjudicate or choose which differences matter. After both exact-five results are final, the deterministic dispute detector flags every A/B metric-decision disagreement, including:

- material-claim support;
- citation correctness;
- key-point coverage or cause; and
- critical-hallucination classification.

The single optional QA adjudicator receives only the disputed decisions, both finalized rationales, and the already authorized evidence excerpts; it remains blinded to candidate identity. Original scores are preserved. Evaluator A, evaluator B, and the optional adjudicator use fresh processes and distinct prompts/seeds but the same pinned local model family, so they are not statistically or human independent.

All qualitative findings are **AI-evaluated and provisional pending human stakeholder review**.
