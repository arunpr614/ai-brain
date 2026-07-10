# UX FCP-005 AI Services And Privacy Trust Center v2

Purpose: Preserve AI Brain Feature Council research and planning evidence.
Audience: Product, design, engineering, documentation maintainers, and AI agents.
Artifact source commit: `9de8de87de915e874e8290aa556e2b6772d6fabf`
Audited application baseline: `2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a`
Research evidence date: 2026-06-28.
Lifecycle: Current feature-council artifact.
Runtime verification: Not provided.
Superseded by: None.
Public disclosure: Reviewed and sanitized.
Owner: AI Brain maintainer.

> **Current feature-council artifact.** This is planning evidence, not proof of production implementation or current runtime behavior.

Status: v2 final planning package  
Review addressed: [reviews/FCP005_PACKAGE_V1_ADVERSARIAL_REVIEW_2026-06-28_21-23-55_IST.md](Feature-Council-FCP-005-v1-Adversarial-Review)

## UX Direction

The Trust Center should be calm, specific, and non-marketing. It should answer "what works?", "what leaves Brain?", and "what can I safely export?"

## Sections

1. AI Services: generation, embeddings, transcript recovery, provider status.
2. Source Readiness: full, weak, unindexed, stale, repaired counts.
3. Privacy And Data Flow: provider-specific data categories.
4. Diagnostics: redaction rules and export preview.
5. Backup And Export: local/off-site/user export status.
6. Offline: what the web shell/APK can and cannot do offline.

## States

| State | UX behavior |
| --- | --- |
| Provider ok | Show provider/model and last checked time. |
| Provider down | Show affected features and retry/check action. |
| Quota/billing | Show feature impact without exposing secrets. |
| Unconfigured | Explain what is unavailable. |
| Diagnostics disabled | Explain default redaction and export action. |
| Offline partial | Use exact capability labels; no queue claims unless real. |

## Mobile Behavior

Use stacked sections with summary rows. Avoid dense tables on narrow screens; convert data-flow matrix to expandable rows.

## Accessibility

Status must be text-first. Use clear headings and table alternatives for mobile.

## Prototype

See [prototypes/fcp005-trust-center.html](https://github.com/arunpr614/ai-brain/blob/9de8de87de915e874e8290aa556e2b6772d6fabf/docs/feature-council/prototypes/fcp005-trust-center.html).
