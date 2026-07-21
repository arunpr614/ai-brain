# Open-Source NotebookLM Integration Research

**Accessed:** 2026-07-21
**Method:** Repository source, releases, security documentation, and maintenance metadata; no installation or execution
**Status:** Research complete; unofficial execution remains outside authorization

## Finding

No official consumer NotebookLM MCP server or public source-management client was found. Google’s current MCP repository has an open request for NotebookLM support rather than a supported server. Consumer-oriented connectors fall into two unsupported classes:

1. replay of undocumented internal `batchexecute` RPCs; or
2. browser/DOM automation using a persistent signed-in Google session.

Both inherit bearer-equivalent account authority without OAuth scope isolation. Restrictive local file permissions reduce accidental exposure but do not protect against a compromised host or make the interface supported. Release histories show concrete breakage from changed RPCs/selectors, anti-abuse redirects, cookie expiry, MIME behavior, login hangs, CPU loops, polling timeouts, and orphaned browsers.

The supported consumer/Workspace recommendation remains official Google Docs/Drive staging with a one-time NotebookLM import. If Gemini Notebook Enterprise eligibility exists, prefer direct official REST over a third-party wrapper.

## Representative projects

### Official-API client

| Project | Revision and license | Auth/interface | Security/reliability | Suitability |
|---|---|---|---|---|
| [K-dash/nblm-rs](https://github.com/K-dash/nblm-rs) | v0.2.3, `60f3daf73c40c6e6a8a96708086d84296116b2cb`, 2025-11-19; main `49b130870811c7da960035a24cc68504a54edce2`, 2026-06-07; MIT | Google access token/`gcloud`; documented Gemini Notebook Enterprise API; no browser cookies | API remains `v1alpha`; sharing called untested; “production-ready” is a maintainer claim | High research value if Enterprise eligible; conditional production only after Preview/dependency review; direct REST preferred initially |

### Unofficial consumer connectors

| Project | Revision and license | Unsupported mechanism and auth | Security/reliability evidence | Research / production |
|---|---|---|---|---|
| [jacob-bd/notebooklm-mcp-cli](https://github.com/jacob-bd/notebooklm-mcp-cli) | v0.9.0, `2f28855b1545ea321568be6e39dc8c2efb338dd5`, 2026-07-21; MIT | Internal `batchexecute`; Chrome/CDP login or cookie import | Profile dirs 0700/cookies 0600 but no at-rest encryption; remote mode lacks built-in auth/TLS/isolation; documented API/cookie/VPS breakage | Highest unofficial research candidate, only under separate approval and isolated test account; **No production** |
| [teng-lin/notebooklm-py](https://github.com/teng-lin/notebooklm-py) | v0.7.3, 2026-06-30; main `45fd4258e608fbb9685496f26cfcea48810c44ee`, 2026-07-18; MIT | Internal APIs; Playwright/browser login or cookie import | Storage state is a bearer credential; 0600/0700 permissions but no scope isolation; fixes for MIME, anti-abuse redirects, and login hangs; release/main support-version drift | High unofficial research value; **No production** |
| [PleasePrompto/notebooklm-mcp](https://github.com/PleasePrompto/notebooklm-mcp) | v2.0.0, `50b3e7f67f8535d9899c5e2b1b68f37d17b72aef`, 2026-05-01; MIT | Chrome/Patchright DOM automation and persistent browser profile | Loopback default is useful; external bind warning; prior version broke on one removed DOM element; later fixes for selectors, CPU loops, orphaned Chrome, launch failures | Medium UI-automation comparison value; **No production** |
| [roomi-fields/notebooklm-mcp](https://github.com/roomi-fields/notebooklm-mcp) | v2.2.0, 2026-07-11; main `1eff93182226aa378605ad44d2cb6f23f97708e9`, 2026-07-13; MIT | DOM automation; persistent profile; optional automated email/password/TOTP | Full session and destructive operations; default `0.0.0.0`/permissive CORS; API-auth example is not verified built-in protection; repeated timeout/selector/auth/orphan fixes | Low research value; **No production** |
| [Pantheon-Security/notebooklm-mcp-secure](https://github.com/Pantheon-Security/notebooklm-mcp-secure) | v2026.4.1, `778fcc003c854a7ee37be9f5f4b82152352ccc9a`, 2026-06-01; MIT | Hardened fork of browser automation; MCP token plus Google browser session | Claims encrypted cookie storage, path validation, redaction, auth, audit hashing; “independent audit” was four AI reviewers; history includes auth-bypass, command-injection, SSRF, and credential-deletion fixes | Low–medium security-comparison value; underlying unsupported interface remains **No production** |

No unofficial connector was installed, authenticated, or run. If later separately authorized, the first comparison candidates would be the current pinned releases of `jacob-bd/notebooklm-mcp-cli` and `teng-lin/notebooklm-py`, using a dedicated test account/notebook, synthetic content, no remote listener, and a strict 60-minute limit for one tool.

## NotebookLM-style open-source alternatives

These are destination substitutes, not ways to synchronize with Google NotebookLM.

| Project | Revision/license | Security and operations | Assessment |
|---|---|---|---|
| [lfnovo/open-notebook](https://github.com/lfnovo/open-notebook) | v1.14.0, `30c7e2a63e43b7f270fc2c638f0b6246934a53f4`, 2026-07-21; main `1c5f1c673a1d8bba7bf92e4ca1ccc863d31f1608`; MIT | Optional app password is off unless configured; provider-key Fernet option; local-development Docker defaults require TLS/CORS/database-password/backup hardening | Highest alternative research value; conditional production after hardening; no first-class Drive connector found |
| [MODSetter/SurfSense](https://github.com/MODSetter/SurfSense) | v0.0.34, `612f627198a7e1ec72498c1e0217612f8fc63557`, 2026-07-18; main `bea603e2253989970389eb26db56406c4070500c`; mixed Apache-2.0/BSL 1.1 | OAuth PKCE/HMAC state; refresh tokens/client secret encrypted with app secret; requests full restricted Drive scope; auto-update option should be disabled/pinned | High architecture benchmark, but maintainer says not production-ready; licensing/scope review required |
| [Cinnamon/kotaemon](https://github.com/Cinnamon/kotaemon) | v0.12.0, `9ad3e4e49aa35b8acddd235918a5d9753c1cfdf9`, 2026-05-31; Apache-2.0 | Generic RAG; default `admin/admin` must be replaced; broad bind needs TLS/network controls | Medium citation/RAG benchmark; conditional self-hosted use after normal hardening |
| [Mintplex-Labs/anything-llm](https://github.com/Mintplex-Labs/anything-llm) | v1.15.0, `70e0d2eb1dcb08cbb18a44b927d94f8667f57a7f`, 2026-06-25; main `28fbff47f8d3dd57f7228f81355406e78065cbd5`; MIT | App users/password/JWT; placeholder secrets must rotate; telemetry requires an explicit decision | Medium mature replacement benchmark; conditional after threat review, TLS, backups, secret rotation, access validation, and telemetry decision |

## Reliability synthesis

- Internal RPC replay is generally more deterministic than UI clicking, but Google can change RPC IDs, request shapes, anti-abuse behavior, and session requirements without notice.
- DOM automation additionally breaks on markup, localization, timing, browser lifecycle, and bot-detection changes.
- A local MCP token controls access to the connector, not the downstream authority of the stored Google session.
- Security hardening cannot turn an undocumented consumer interface into a supported long-term production dependency.

## Recommendation

- **Consumer/Workspace:** Limited-go for official Drive/Docs staging after a small edition-specific refresh pilot.
- **Enterprise:** Conditional-go for official API research if eligibility is confirmed; start with direct REST and use `nblm-rs` only as a reference or later reviewed dependency.
- **Unofficial consumer connector:** No-go for production; research-only with separate approval.
- **Alternative destination:** Evaluate Open Notebook only if the user is willing to change the destination from Google NotebookLM; this is outside the current one-way integration goal.

## Sources

- [Google MCP request for NotebookLM support](https://github.com/google/mcp/issues/19)
- [Official NotebookLM source/Drive behavior](https://support.google.com/notebooklm/answer/16215270?hl=en)
- [Official Gemini Notebook Enterprise source API](https://docs.cloud.google.com/gemini/enterprise/notebooklm-enterprise/docs/api-notebooks-sources)
- Project repository, release, commit, license, security, and README links embedded above.
