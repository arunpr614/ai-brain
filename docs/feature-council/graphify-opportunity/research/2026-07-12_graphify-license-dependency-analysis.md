# Graphify license and dependency analysis

**Status:** Stage 2 source note; not legal advice  
**Verified:** 2026-07-12  
**Graphify revision:** [`v0.9.13`](https://github.com/Graphify-Labs/graphify/releases/tag/v0.9.13), [`eec7a0183847cbdc8a87d92b233759a5204b89fe`](https://github.com/Graphify-Labs/graphify/commit/eec7a0183847cbdc8a87d92b233759a5204b89fe)  
**AI Brain revision:** `8c1341100b174fe4ca518e6a745c30b9078df21c`  

## Decision summary

Graphify itself is MIT-licensed and is compatible in principle with AI Brain's MIT license. The default Graphify runtime dependency set is permissively licensed. That does **not** make `graphifyy[all]` acceptable: the optional `tree-sitter-pascal 0.11.0` package is explicitly `AGPL-3.0-only`, and the all-extras bundle includes it. Other optional dependencies introduce LGPL components and a materially larger supply-chain/security surface.

**Recommendation:** do not make Graphify a production dependency or fork for the proposed product work. Reuse concepts and implement natively. If a separately authorized POC needs the package, pin exact Graphify and transitive versions, install only an explicit allowlist of extras, exclude `pascal` and `all`, retain MIT notices, generate an SBOM, and run a blocking license/vulnerability gate.

## Primary license

**Verified source:** [`LICENSE`](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/LICENSE) is the standard MIT License, copyright 2026 Safi Shamsi. SPDX identifier: **MIT**. The grant permits use, copy, modification, merging, publication, distribution, sublicensing, and sale. The condition is to include the copyright and permission notice in copies or substantial portions; warranty/liability are disclaimed.

`pyproject.toml` points package metadata at that license file ([lines 5-12](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/pyproject.toml#L5-L12)). GitHub's repository metadata also identifies SPDX `MIT`.

**AI Brain compatibility:** AI Brain's root `LICENSE` and `package.json` declare MIT. A dependency or copied substantial portion would require preserving Graphify's separate notice. Concept-only reuse does not copy protected implementation expression, but attribution in research/decision records remains good provenance.

## Release/package identity

- Distribution name: `graphifyy` (double “y”); CLI: `graphify`.
- Version: `0.9.13`; Python `>=3.10`.
- PyPI wheel SHA-256: `afa0bda41d6d8a2bcfff8e6877e2e3162d460b25988ae0af073d8fb0bccb8baa`.
- PyPI sdist SHA-256: `0bc386fd41015b2fab04f9227d525106450d8abd3e3d92f387c4fb230101380d`.
- PyPI uploads: 2026-07-12T10:00:31Z (wheel) and 10:00:36Z (sdist).
- Source tag commit: `eec7a0183847cbdc8a87d92b233759a5204b89fe`.

Source: [PyPI release JSON](https://pypi.org/pypi/graphifyy/0.9.13/json). The package metadata still uses the former `safishamsi/graphify` URLs at [`pyproject.toml` lines 45-48](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/pyproject.toml#L45-L48), while the canonical repository is now `Graphify-Labs/graphify`. This redirect/ownership history should be monitored in pinning and provenance checks.

## Default dependency license inventory

The committed lock resolved these direct core packages in the isolated Python 3.12 environment. Metadata was cross-checked from installed distribution metadata; Graphify's declared ranges are at [`pyproject.toml` lines 13-43](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/pyproject.toml#L13-L43).

| Direct core component | Resolved version | License identifier/family | Assessment |
|---|---:|---|---|
| NetworkX | 3.6.1 | BSD-3-Clause | Permissive |
| NumPy | 1.26.4 | BSD-3-Clause/BSD metadata | Permissive |
| RapidFuzz | 3.14.5 | MIT | Permissive |
| tree-sitter runtime | 0.25.2 | MIT | Permissive |
| 25 mandatory tree-sitter grammar wheels | lock-resolved versions within declared ranges | MIT metadata for each inspected distribution | Permissive, but broad package/supply-chain count |

The mandatory grammars cover Python, JavaScript, TypeScript, Go, Rust, Java, Groovy, C, C++, Ruby, C#, Kotlin, Scala, PHP, Swift, Lua, Zig, PowerShell, Elixir, Objective-C, Julia, Verilog, Fortran, Bash, and JSON. A default install therefore pulls roughly 29 direct runtime distributions before transitives, even if AI Brain needs none of those source-language extractors.

## Optional dependency findings

Declared extras are visible at [`pyproject.toml` lines 50-83](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/pyproject.toml#L50-L83).

| Extra/capability | Key resolved direct package(s) | License evidence | Reuse assessment |
|---|---|---|---|
| `mcp` / HTTP | `mcp 1.27.1`, `starlette 1.3.1` | MIT; BSD-3-Clause | Permissive; security/auth concerns remain. |
| Neo4j / FalkorDB | `neo4j 6.2.0`, `falkordb 1.6.1` | Apache-2.0 AND Python-2.0; MIT | Permissive. External server licensing/terms are separate. |
| PDF | `pypdf 6.13.3`, `markdownify 1.2.2` | BSD-3-Clause; MIT | Permissive direct deps; all-extras transitives included vulnerable `soupsieve` snapshot. |
| Watch / SVG | `watchdog 6.0.0`, `matplotlib 3.10.9` | Apache-2.0; PSF/BSD-compatible ecosystem | Generally permissive; notices still required. |
| Leiden | `graspologic 3.4.4` | MIT | Direct permissive; its all-extras transitive set included `gensim 4.4.0` under LGPL-2.1-only. |
| Office / Google | `python-docx 1.2.0`, `openpyxl 3.1.5` | MIT | Permissive. Google CLI/service terms separate. |
| PostgreSQL | `psycopg 3.3.4`, `psycopg-binary 3.3.4` | LGPL-3.0-only | Dynamic Python use is commonly manageable, but distribution and notice obligations require legal review. |
| Video | `faster-whisper 1.2.1`, `yt-dlp 2026.6.9` | MIT; Unlicense | Code licenses permissive/public-domain style; media/service rights remain content-specific. |
| Model SDKs | OpenAI 2.36.0, Anthropic 0.105.2, boto3 1.43.9, tiktoken 0.13.0 | Apache-2.0/MIT | Permissive; provider service terms/privacy/cost separate. |
| SQL / DreamMaker / Terraform grammars | `tree-sitter-sql 0.3.11`, `tree-sitter-dm 0.25.1`, `tree-sitter-hcl 1.2.0` | MIT; MIT; Apache-2.0 | Permissive. DM may compile from source on non-Windows. |
| **Pascal grammar** | **`tree-sitter-pascal 0.11.0`** | **AGPL-3.0-only** | **Do not include in AI Brain or an unrestricted all-extras bundle without legal approval.** |

### AGPL evidence

The PyPI metadata for [`tree-sitter-pascal 0.11.0`](https://pypi.org/project/tree-sitter-pascal/0.11.0/) declares `License-Expression: AGPL-3.0-only`; its wheel includes the AGPLv3 license text. Graphify declares this package in the optional `pascal` extra and also includes it in `all` at [`pyproject.toml` lines 73-83](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/pyproject.toml#L73-L83).

Installing Graphify's default core does **not** install this package. Installing `graphifyy[all]` does. Because it is a compiled grammar extension imported into the Python process, do not assume mere aggregation. Distribution or network service use of a combined/modified work can create source-offer/network-source obligations; qualified legal review is required. The simplest control is exclusion.

### Development-only licenses

The upstream development group includes Nuitka (AGPLv3+ metadata) and patchelf (metadata reported Apache/GPL options) at [`pyproject.toml` lines 89-106](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/pyproject.toml#L89-L106). These are not declared runtime dependencies, but they appeared in the isolated contributor environment. They must not accidentally enter distributed AI Brain artifacts.

## Dependency stability and supply chain

### Reproducibility

Graphify commits `uv.lock`, and upstream CI uses `--frozen`. End users installing `graphifyy==0.9.13` from PyPI do not automatically consume that lock. Core requirements use lower/upper ranges and many optional dependencies have no upper bound. A later install can therefore resolve a different transitive graph than the verified environment.

**Control for any POC:** preserve package artifact hashes, create an independent constraints/lock file, pin every direct/transitive distribution and platform wheel, generate SBOM/license notices, and verify hashes from PyPI. Do not rely on the project's development lock as AI Brain's production lock.

### Vulnerability scan snapshot

The exact all-extras environment contained 190 distributions during license enumeration. Independent `pip-audit --strict` failed:

- `pip 26.1.1`: `PYSEC-2026-196` / `CVE-2026-8643`, fixed in 26.1.2;
- `soupsieve 2.8.3`: `CVE-2026-49476` and `CVE-2026-49477`, fixed in 2.8.4.

The latter is in an optional document-conversion transitive path; applicability depends on use, but the lock was not clean. Upstream's pip-audit and Bandit steps are non-blocking (`continue-on-error`) at [`.github/workflows/ci.yml` lines 81-106](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/.github/workflows/ci.yml#L81-L106). Passing tests and a green overall workflow must not be represented as a passing security/license gate.

### Package-name risk

The official package is `graphifyy`, not `graphify`. This creates typo/dependency-confusion risk in manual setup. Use an allowlisted index, exact package name/version/hash, and automated provenance checks.

## Project maturity and governance

**Verified API snapshot on 2026-07-12:** repository created 2026-04-03; default branch `v8`; tag `v0.9.13`; 82,917 stars, 8,184 forks, and 475 open issues/PRs as returned by GitHub; active push on the verification date. These counts are volatile popularity/activity indicators, not quality guarantees.

The 20 most recent releases in the API span 2026-06-22 through 2026-07-12, showing unusually rapid release cadence. Contributor API data attributed 789 commits to the lead maintainer and much smaller counts to others. This indicates high activity and a concentration/bus-factor concern.

Maturity warnings:

- version remains `0.x`;
- open [1.0 plugin/CLI RFC #1070](https://github.com/Graphify-Labs/graphify/issues/1070) proposes public API/command restructuring;
- project URLs and security policy lag current repository/version;
- the changelog shows frequent correctness fixes in IDs, incremental merge, query resolution, exports, and privacy;
- open [#1652](https://github.com/Graphify-Labs/graphify/issues/1652) requests dry-run/backup/hub-loss protection after destructive graph updates;
- open [#1808](https://github.com/Graphify-Labs/graphify/issues/1808) reports incremental updates stripping community labels.

**Inference:** active and responsive, but not yet a stable embedded-platform dependency.

## Fork versus dependency

| Strategy | License posture | Engineering/exit posture | Recommendation |
|---|---|---|---|
| Concepts only/native implementation | No Graphify code distribution; retain research attribution. | Best fit with AI Brain IDs, SQLite, auth, deletion, mobile. | **Preferred.** |
| Pinned CLI/library POC | MIT core; include notice; explicit permissive extras only. | Disposable adapter, exact commit/artifact, no persisted production contract. | **Acceptable only with separate POC authorization.** |
| Production PyPI dependency | MIT core, but large/ranged dependency graph and optional copyleft traps. | Python runtime, second storage/query surface, upgrade churn. | **Reject.** |
| Fork | Must preserve MIT notice; fork modifications can remain MIT, but dependency licenses still apply. | Own ~48k Python LOC, security fixes, grammar/provider drift, merge burden. | **Reject absent a distinct long-term product strategy.** |
| Copy selected source | MIT permits with notice, but copied internals create provenance/update burden. | Private/underscore APIs and algorithms can change; native re-expression is simpler. | **Avoid.** |

## Upgrade and exit strategy for an authorized POC

1. Pin Graphify tag, source commit, PyPI artifact hashes, Python version, and full lock.
2. Install default core or a minimal explicit extra list; never `all`; explicitly deny `tree-sitter-pascal`.
3. Keep an adapter that consumes only a documented exported JSON fixture; never write Graphify IDs into AI Brain tables.
4. Store POC graphs in disposable ignored storage with publication-safe data.
5. Run full tests, blocking SCA/license policy, and synthetic compatibility fixtures before any version bump.
6. Review changelog/issues/security policy and diff exported schema/CLI behavior on each bump.
7. Exit by deleting the adapter/environment/output; no migration should be required because AI Brain remains source of truth.

## Required notices if redistributed

- Graphify MIT copyright and permission notice.
- Notices/licenses for every bundled Python distribution and binary grammar wheel.
- Source/offer and network-use obligations for any copyleft component, if approved.
- SBOM matching each platform artifact, not only the development environment.

## Verification limits

- License identifiers came from upstream license files and installed/PyPI metadata; this is not a legal opinion.
- The all-extras 190-distribution snapshot was reviewed for copyleft/unknown candidates, with direct dependencies prioritized. It is not a substitute for a production-grade policy engine and counsel review.
- External services, model APIs, GitHub, Google Workspace, databases, and ingested content have separate terms not analyzed here.

## Validation record

```text
git checkout/inspect exact commit eec7a0183847cbdc8a87d92b233759a5204b89fe
uv sync --all-extras --frozen --python 3.12
pip-licenses --with-system --with-urls --format=json
inspect installed METADATA and bundled license for tree-sitter-pascal 0.11.0
query PyPI JSON for graphifyy 0.9.13 and tree-sitter-pascal 0.11.0
pip-audit --strict
```

No dependencies were added to AI Brain and no third-party source was copied into the repository.
