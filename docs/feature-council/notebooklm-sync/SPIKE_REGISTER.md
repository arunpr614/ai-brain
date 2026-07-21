# AI Brain → NotebookLM Synchronization — Spike Register

**Gate state:** Credential-free spikes complete; no authenticated or unofficial spike authorized.

| ID | Spike | Gate dependency | Status | Real sources created | Cleanup |
|---|---|---|---|---:|---|
| S1 | Authentication and notebook resolution | Official eligibility + local auth | Live blocked; no auth attempted | 0 | N/A |
| S2 | Create/retrieve one raw-text source | S1 | Live blocked | 0 | N/A |
| S3 | Item-type mapping | Credential-free first; live fidelity after S2 | Local pass; Google processing gated | 0 | Temporary local state removed by tests |
| S4 | Batch creation and partial failure | S2 | Live blocked; batch atomicity not assumed | 0 | N/A |
| S5 | Adapter idempotency | Credential-free first; API behavior if eligible | Local pass; provider behavior gated | 0 | Temporary local state removed by tests |
| S6 | Lost-response recovery | Credential-free first; applicable official lane after Gate 0 | Local pass; provider behavior gated | 0 | Temporary local state removed by tests |
| S7 | Update/delete behavior | S2; spike-created IDs only | Live blocked; initial scope excludes edits/deletes | 0 | N/A |
| S8 | Manual/daily orchestration | Local fake | Local pass | 0 | Temporary SQLite files removed by tests |
| S9 | Capacity/scale simulation | Public limits and synthetic distributions | Pass | 0 | No remote state |
| S10 | Credential-expiration handling | Fake state machine first; official auth after Gate 0 | Local pass; live lifecycle gated | 0 | Fake credential data only |
| S11 | One-click item export contract | Credential-free; consumer unofficial live validation remains separately gated | Local pass (13/13); no Google call | 0 | In-memory fake only |

Reports are stored beside the spike protocol with hypothesis, exact input, observed output, evidence class, timestamp, retries, and cleanup. Credential-free fake objects are not NotebookLM sources and do not consume the real-source counter. S1–S10 use the shared catalog of ten unique synthetic AI Brain items. S11 reuses the catalog's URL-item identity in a self-contained contract fixture and makes no Google call.
