# AI Brain → NotebookLM Synchronization — Account and API Eligibility

**Gate state:** Public research, credential-free spikes, and final council complete; one minimum non-secret request was issued and remains unanswered
**Authenticated testing:** Not authorized yet
**Unofficial testing:** Not authorized

## Gate rules

1. Complete public official-path research before requesting user information.
2. Ask once for only non-secret facts still required to choose a supported path.
3. Never request credentials, tokens, cookies, passwords, client secrets, or private keys in chat.
4. If authentication is warranted, explain least-privilege scopes and use an official local flow with credentials outside the repository.
5. Use a separate test notebook and synthetic content only.

## Facts to establish

| Question | Current state | Evidence needed |
|---|---|---|
| Which NotebookLM edition/Google plan does the user have? | Unknown; decisive | User non-secret account/plan description and visible badge |
| Is Gemini Notebook Enterprise licensed and enabled? | Unknown | User confirmation and, later, official access check |
| Does the applicable edition expose a supported source-management API? | Verified only for Gemini Notebook Enterprise; current guide is Preview/`v1alpha` | User edition plus current official Google documentation |
| Is the selected lane's dedicated synthetic target available? | Unknown | After edition selection: one Enterprise test notebook, or one consumer/Workspace test notebook plus one app-created Doc |
| Can the user complete an official local `gcloud` or OAuth browser flow? | Unknown | User confirmation; no secrets pasted |
| Can account-specific identifiers be supplied locally after lane selection? | Unknown; not needed in chat | User confirmation only if execution reaches that gate |

## Possible outcomes

- **Officially eligible:** Run supported API spikes.
- **Eligibility uncertain:** Finish non-authenticated work and request the missing facts.
- **Consumer-only/no supported API:** Evaluate documented Drive or manual alternatives.
- **Unofficial-only:** Stop before execution and request separate approval.
- **No acceptable path:** Recommend No-go.

The consolidated request below contains only the remaining lane-selection facts; all questions answerable from public evidence were removed.

## Public-research conclusion

- Consumer and paid consumer plans: no documented public source-management API found; official Docs/Drive staging is supported.
- Ordinary Workspace plans: no documented public source-management API found; official Docs/Drive staging is supported, with privacy terms depending on edition.
- Gemini Notebook Enterprise: documented notebook/source API exists, but current guides are Preview/Pre-GA and `v1alpha`; licensing, IAM, project, region, notebook permissions, and acceptance of Preview terms must be confirmed.
- Enterprise Drive-backed Docs/Slides require licensed-user Google credentials and must not be assumed to auto-refresh.
- Current Google help describes periodic/on-open Drive-source refresh and manual sync. This is unverified for the target account and has no supported observation API or freshness SLA.

## Consolidated Gate 0 request and minimization correction

The one request has already been issued and must not be repeated. Interpret it conditionally:

1. Account class and exact visible edition text: consumer NotebookLM, Workspace NotebookLM, or Gemini Notebook Enterprise.
2. If already entitled to Enterprise, confirmation that a license is assigned and synthetic Preview/Pre-GA API use is permitted.
3. Ability to complete an official local user browser/`gcloud` authorization flow without sharing secrets.
4. For consumer/Workspace only, acceptance of one manual Doc import and manual visual refresh verification.
5. Permission for exactly the selected resource after the edition is known: one private Enterprise test notebook, or one private consumer/Workspace test notebook plus one private app-created synthetic Doc.

The original wording asked about both resource types at once. That was broader than necessary. If the response grants both, execute only the one selected official lane; do not treat broader permission as authority for two lanes.

Do not request or accept URLs, project/notebook/source identifiers, account screenshots, passwords, OAuth codes, cookies, tokens, API keys, client secrets, service-account keys, or credential files in chat. Applicable identifiers are entered locally only after a lane is selected. Schedule, content-selection, retention, and update/delete preferences are deferred until feasibility is established.

## Final blocker effect

The missing response blocks every authenticated/live spike but does not block the evidence-based product decision. The final council result is **Defer**. The smallest re-entry action is one non-secret answer covering the conditional facts above; no identifier or credential belongs in conversation.
