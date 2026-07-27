#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import {
  basename,
  dirname,
  isAbsolute,
  relative,
  resolve,
  sep,
} from "node:path";
import process from "node:process";

const DATE = "2026-07-27";
const HANDOVER_ROOT =
  "docs/feature-council/youtube-item-recovery-implementation/handover";
const DATE_ROOT = `${HANDOVER_ROOT}/${DATE}`;
const INDEX_PATH = `${HANDOVER_ROOT}/INDEX.md`;
const MANIFEST_PATH = `${DATE_ROOT}/HANDOVER_MANIFEST.md`;
const RUNNING_LOG_PATH = "RUNNING_LOG.md";
const VERIFIER_PATH = "scripts/verify-youtube-item-recovery-handover.mjs";
const PUBLIC_REPOSITORY = "arunpr614/ai-brain";
const PUBLICATION_BRANCH = "feat/youtube-item-recovery-enrichment";
const PUBLIC_REPOSITORY_URL_PATTERN =
  /^(?:git@github\.com:|https:\/\/github\.com\/)arunpr614\/ai-brain(?:\.git)?$/u;
const MAX_GIT_BLOB_BYTES = 16 * 1024 * 1024;

const REQUIRED_PAYLOAD = Object.freeze([
  "README.md",
  "GOVERNING_GOAL_PUBLIC_SNAPSHOT.md",
  "CURRENT_STATE.md",
  "01_GOAL_SCOPE_AND_AUTHORITY.md",
  "02_REFERENCE_EVIDENCE_INVENTORY.md",
  "03_WORK_COMPLETED_AND_DELIVERED.md",
  "04_CURRENT_WORKTREE_AND_UNCOMMITTED_STATE.md",
  "05_STAGE2_CONTRACT_CRASH_RECOVERY_AND_WAL.md",
  "06_ARCHITECTURE_AND_DATA_FLOW.md",
  "07_REQUIREMENTS_AND_VERIFICATION_STATUS.md",
  "08_EXECUTION_PLAYBOOK.md",
  "09_DECISIONS_RISKS_BLOCKERS_AND_STOP_CONDITIONS.md",
  "10_GIT_PR_CI_TESTS_AND_COMMANDS.md",
  "11_DOCUMENTATION_WIKI_LAB_AND_RELEASE.md",
  "12_SUCCESSOR_COMPLETION_CHECKLIST.md",
  "13_D021_ADVERSARIAL_REVIEW_SESSION_FINDINGS.md",
  "14_FILE_ARTIFACT_AND_COMMIT_MAP.md",
  "ADVERSARIAL_REVIEW_DISPOSITION.md",
  "COLD_START_READER_TEST.md",
]);

const EXPECTED_SELF_SCAN_FACTORY_SHA256 = Object.freeze({
  createPrivacyDefinitions:
    "71c526390cc9564cc15228f123077f0d5086e1d947088066fc2aeb620142927b",
  createCredentialScanner:
    "0fec893e7e6513c5eb4a84f9961875974772ff572389a68bf73e34ea24a09dd2",
});

function createPrivacyDefinitions(credentialAssignmentScanner) {
  const PRIVACY_SIGNATURES = Object.freeze([
    { label: "absolute user-home path", pattern: /\/Users\//u },
    {
      label: "email address",
      pattern: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/iu,
    },
    { label: "Codex attachment locator", pattern: /\.codex\/attachments\//u },
    { label: "cloud-storage topology", pattern: /CloudStorage/u },
    { label: "device topology", pattern: /Other computers|My MacBook/iu },
    {
      label: "ephemeral pasted-text filename",
      pattern: /pasted-text-\d+\.txt/u,
    },
    {
      label: "UUID",
      pattern:
        /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/iu,
    },
    {
      label: "machine-specific nested checkout name",
      pattern: /Phase4\.1-AIModelConfig/u,
    },
    { label: "Homebrew executable path", pattern: /\/opt\/homebrew\//u },
    { label: "local file URI", pattern: /\bfile:\/\//iu },
    {
      label: "credential assignment",
      test: credentialAssignmentScanner,
    },
    {
      label: "bearer credential",
      pattern:
        /\bAuthorization\s*[:=]\s*["']?Bearer\s+[A-Za-z0-9._~+/=-]{12,}/iu,
    },
    {
      label: "private-key block",
      pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u,
    },
    {
      label: "GitHub credential",
      pattern: /\b(?:ghp|github_pat)_[A-Za-z0-9_]{20,}\b/u,
    },
    {
      label: "AWS access-key identifier",
      pattern: /\bAKIA[0-9A-Z]{16}\b/u,
    },
  ]);

  const PRIVACY_SIGNATURE_PROBES = Object.freeze([
    {
      label: "UUIDv7-style private review identifier",
      sample: "review_id=019f8ccc-8942-7af0-95e6-54d524a8ca62",
    },
    {
      label: "credential-like assignment",
      sample: "client_secret=synthetic_probe_value_12345",
    },
    {
      label: "environment-prefixed API key",
      sample: "OPENAI_API_KEY=synthetic_probe_value_12345",
    },
    {
      label: "one-character JavaScript literal template credential",
      sample: "clientSecret = `a`;",
    },
    {
      label: "two-character JavaScript literal template credential",
      sample: "clientSecret = `ab`;",
    },
    {
      label: "three-character JavaScript literal template credential",
      sample: "clientSecret = `abc`;",
    },
    {
      label: "four-character JavaScript literal template credential",
      sample: "clientSecret = `abcd`;",
    },
    {
      label: "five-character JavaScript literal template credential",
      sample: "clientSecret = `abcde`;",
    },
    {
      label: "six-character JavaScript literal template credential",
      sample: "clientSecret = `abcdef`;",
    },
    {
      label: "seven-character JavaScript literal template credential",
      sample: "clientSecret = `abcdefg`;",
    },
    {
      label: "whitespace-only JavaScript literal template credential",
      sample: "clientSecret = ` `;",
    },
    {
      label: "generic token assignment",
      sample: "INTERNAL_SERVICE_TOKEN=synthetic_probe_value_12345",
    },
    {
      label: "generic secret assignment",
      sample: "SIGNING_SECRET=synthetic_probe_value_12345",
    },
    {
      label: "secret-key assignment",
      sample: 'DJANGO_SECRET_KEY="!synthetic_probe_value_12345"',
    },
    {
      label: "quoted JSON credential assignment",
      sample: '"client_secret": "!synthetic_probe_value_12345"',
    },
    {
      label: "client-secret-key assignment",
      sample: "APP_CLIENT_SECRET_KEY=!synthetic_probe_value_12345",
    },
    {
      label: "camel-case API key assignment",
      sample: "openaiApiKey=synthetic_probe_value_12345",
    },
    {
      label: "compound sensitive-fragment assignment",
      sample: "clientSecretValue=synthetic_probe_value_12345",
    },
    {
      label: "multiline JSON credential assignment",
      sample: '"client_secret":\n  "!synthetic_probe_value_12345"',
    },
    {
      label: "multiline YAML credential assignment",
      sample: "client_secret:\n!synthetic_probe_value_12345",
    },
    {
      label: "whitespace-split JSON credential assignment",
      sample: '"client_secret"\n  :\n\n  "!synthetic_probe_value_12345"',
    },
    {
      label: "escaped JSON credential key assignment",
      sample: '"client\\u005fsecret": "synthetic_probe_value_12345"',
    },
    {
      label: "YAML literal-block credential assignment",
      sample: "client_secret: |-\n  ZXCVBNMASDFGHJKL123456",
    },
    {
      label: "YAML folded-block credential assignment",
      sample: "client_secret: >-\n  ZXCVBNMASDFGHJKL123456",
    },
    {
      label: "YAML block credential assignment with header comment",
      sample: "client_secret: |- # synthetic comment\n  ZXCVBNMASDFGHJKL123456",
    },
    {
      label: "tagged YAML block credential assignment",
      sample: "client_secret: !!str |-\n  ZXCVBNMASDFGHJKL123456",
    },
    {
      label: "anchored and tagged YAML block credential assignment",
      sample:
        "client_secret: &credential !!str >- # synthetic comment\n  ZXCVBNMASDFGHJKL123456",
    },
    {
      label: "YAML block safe-prefix credential assignment",
      sample: "client_secret: |-\n  placeholder\n  ZXCVBNMASDFGHJKL123456",
    },
    {
      label: "explicit-indent YAML block credential assignment",
      sample: "client_secret: |2-\n    short\n  ZXCVBNMASDFGHJKL123456",
    },
    {
      label: "angle-placeholder trailing credential assignment",
      sample: "client_secret=<placeholder>ZXCVBNMASDFGHJKL123456",
    },
    {
      label: "placeholder trailing credential assignment",
      sample: "client_secret=placeholder-ZXCVBNMASDFGHJKL123456",
    },
    {
      label: "documentation path trailing credential assignment",
      sample: "client_secret=configuration.md-ZXCVBNMASDFGHJKL123456",
    },
    {
      label: "multiline double-quoted YAML credential assignment",
      sample: 'client_secret: "short\n  ZXCVBNMASDFGHJKL123456"',
    },
    {
      label: "doubled-apostrophe YAML credential assignment",
      sample: "client_secret: 'placeholder''ZXCVBNMASDFGHJKL123456'",
    },
    {
      label: "literal-backslash doubled-apostrophe YAML credential assignment",
      sample: "client_secret: 'x\\''ZXCVBNMASDFGHJKL123456'",
    },
    {
      label: "multiline single-quoted YAML credential assignment",
      sample: "client_secret: 'placeholder\n  ZXCVBNMASDFGHJKL123456'",
    },
    {
      label: "multiline plain YAML safe-prefix credential assignment",
      sample: "client_secret: placeholder\n  ZXCVBNMASDFGHJKL123456",
    },
    {
      label: "multiline plain YAML short-prefix credential assignment",
      sample: "client_secret: short\n  ZXCVBNMASDFGHJKL123456",
    },
    {
      label: "comment-delayed YAML credential assignment",
      sample: "client_secret: # synthetic comment\n  ZXCVBNMASDFGHJKL123456",
    },
    {
      label: "next-line YAML credential assignment",
      sample: "client_secret:\n  ZXCVBNMASDFGHJKL123456",
    },
    {
      label: "TOML multiline credential assignment",
      sample: 'client_secret = """ZXCVBNMASDFGHJKL123456"""',
    },
    {
      label: "escaped-delimiter TOML multiline credential assignment",
      sample: 'client_secret = """x\\"""ZXCVBNMASDFGHJKL123456"""',
    },
    {
      label: "JavaScript escaped-apostrophe credential assignment",
      sample: "clientSecret = 'x\\'ZXCVBNMASDFGHJKL123456'",
    },
    {
      label: "multiline JavaScript template credential assignment",
      sample: "clientSecret = `short\nZXCVBNMASDFGHJKL123456`",
    },
    {
      label: "escaped-backtick JavaScript template credential assignment",
      sample: "clientSecret = `x\\`ZXCVBNMASDFGHJKL123456`",
    },
    {
      label: "nested-expression JavaScript template credential assignment",
      sample:
        'clientSecret = `${(() => { const brace = "}"; return `x`; })()}ZXCVBNMASDFGHJKL123456`',
    },
    {
      label:
        "next-line concatenated environment template credential assignment",
      sample:
        'clientSecret = `${process.env.CLIENT_SECRET}`\n  + "ZXCVBNMASDFGHJKL123456"',
    },
    {
      label: "commented next-line environment template concatenation",
      sample:
        'clientSecret = `${process.env.CLIENT_SECRET}`\n  /* synthetic */\n  + "ZXCVBNMASDFGHJKL123456"',
    },
    {
      label: "quoted spaced credential key assignment",
      sample: '"api key": "ZXCVBNMASDFGHJKL123456"',
    },
    {
      label: "unquoted spaced credential key assignment",
      sample: "api key: ZXCVBNMASDFGHJKL123456",
    },
    {
      label: "dotted credential key assignment",
      sample: "api.key: ZXCVBNMASDFGHJKL123456",
    },
    {
      label: "escaped spaced credential key assignment",
      sample: '"api\\u0020key": "ZXCVBNMASDFGHJKL123456"',
    },
    {
      label: "JavaScript bracket credential key assignment",
      sample: 'config["clientSecret"] = "ZXCVBNMASDFGHJKL123456"',
    },
    {
      label: "JavaScript static-template bracket credential key assignment",
      sample: 'config[`clientSecret`] = "ZXCVBNMASDFGHJKL123456"',
    },
    {
      label: "slash-separated YAML credential key assignment",
      sample: "api/key: ZXCVBNMASDFGHJKL123456",
    },
    {
      label: "spaced slash-separated YAML credential key assignment",
      sample: "api / key: ZXCVBNMASDFGHJKL123456",
    },
    {
      label: "repeated-space YAML credential key assignment",
      sample: "api  key: ZXCVBNMASDFGHJKL123456",
    },
    {
      label: "backslash-separated YAML credential key assignment",
      sample: "api\\key: ZXCVBNMASDFGHJKL123456",
    },
    {
      label: "colon-separated YAML credential key assignment",
      sample: "api:key: ZXCVBNMASDFGHJKL123456",
    },
    {
      label: "tab-separated YAML credential key assignment",
      sample: "api\tkey: ZXCVBNMASDFGHJKL123456",
    },
    {
      label: "punctuation-separated YAML credential key assignment",
      sample: "api@key: ZXCVBNMASDFGHJKL123456",
    },
    {
      label: "equals-separated YAML credential key assignment",
      sample: "api=key: ZXCVBNMASDFGHJKL123456",
    },
    {
      label: "non-BMP-separated YAML credential key assignment",
      sample: "api🔑key: ZXCVBNMASDFGHJKL123456",
    },
    {
      label: "JavaScript code-point escaped bracket credential key assignment",
      sample: 'config["client\\u{53}ecret"] = "ZXCVBNMASDFGHJKL123456"',
    },
    {
      label: "JavaScript LF-continuation bracket credential key assignment",
      sample: 'config["client\\' + "\n" + 'Secret"] = "ZXCVBNMASDFGHJKL123456"',
    },
    {
      label: "JavaScript CRLF-continuation bracket credential key assignment",
      sample:
        "config[`client\\" + "\r\n" + 'Secret`] = "ZXCVBNMASDFGHJKL123456"',
    },
    {
      label: "JavaScript line-comment bracket credential key assignment",
      sample:
        'config[ // before\n "clientSecret" // after\n ] = "ZXCVBNMASDFGHJKL123456"',
    },
    {
      label: "JavaScript block-comment bracket credential key assignment",
      sample:
        "config[ /* before */ 'clientSecret' /* after */ ] = 'ZXCVBNMASDFGHJKL123456'",
    },
    {
      label: "JavaScript CRLF-commented static-template bracket assignment",
      sample:
        "config?.[\r\n/* before */ `clientSecret` // after\r\n] = `ZXCVBNMASDFGHJKL123456`",
    },
    {
      label: "YAML flow-mapping punctuation credential key assignment",
      sample: "{other: value, api@key: ZXCVBNMASDFGHJKL123456}",
    },
    {
      label: "nested YAML flow-mapping credential key assignment",
      sample: "outer: {api@key: ZXCVBNMASDFGHJKL123456}",
    },
    {
      label: "list YAML flow-mapping non-BMP credential key assignment",
      sample: "- {other: value, api🔑key: ZXCVBNMASDFGHJKL123456}",
    },
    {
      label: "YAML explicit-mapping credential key assignment",
      sample: "? api@key\n: ZXCVBNMASDFGHJKL123456",
    },
    {
      label: "YAML explicit key with a separation comment",
      sample: "? api@key # note\n: ZXCVBNMASDFGHJKL123456",
    },
    {
      label: "YAML explicit key with CRLF comment and blank line",
      sample:
        "? api@key # note\r\n  # intervening\r\n\r\n: ZXCVBNMASDFGHJKL123456",
    },
    {
      label: "YAML multiline explicit credential key",
      sample: "? api@\n  key\n: ZXCVBNMASDFGHJKL123456",
    },
    {
      label: "YAML list explicit key with tag and anchor",
      sample:
        "- ? &credential !!str api@key # note\n  : ZXCVBNMASDFGHJKL123456",
    },
    {
      label: "YAML explicit key with verbatim tag",
      sample:
        "? !<tag:yaml.org,2002:str> api@key\n: ZXCVBNMASDFGHJKL123456",
    },
    {
      label: "YAML flow key with tag and anchor",
      sample:
        "{other: value, &credential !!str api@key: ZXCVBNMASDFGHJKL123456}",
    },
    {
      label: "YAML flow-explicit commented credential key",
      sample: "{? api@key # note\n: ZXCVBNMASDFGHJKL123456}",
    },
    {
      label: "YAML nested list flow-explicit credential key",
      sample:
        "outer: [{other: value}, {? !!str &credential api@key: ZXCVBNMASDFGHJKL123456}]",
    },
    {
      label: "invalid bare-flow commented key fails closed",
      sample: "{api@key # note\n: ZXCVBNMASDFGHJKL123456}",
    },
    {
      label: "short password assignment",
      sample: "password=hunter2",
    },
    {
      label: "short token assignment",
      sample: "token=abc1234",
    },
    {
      label: "JavaScript private credential field assignment",
      sample: 'class C { #clientSecret = "ZXCVBNMASDFGHJKL123456" }',
    },
    {
      label: "JavaScript private credential property assignment",
      sample: 'this.#clientSecret = "ZXCVBNMASDFGHJKL123456"',
    },
    {
      label: "JavaScript OR-assignment credential field",
      sample: 'clientSecret ||= "ZXCVBNMASDFGHJKL123456"',
    },
    {
      label: "JavaScript nullish-assignment credential field",
      sample: 'clientSecret ??= "ZXCVBNMASDFGHJKL123456"',
    },
    {
      label: "JavaScript additive-assignment credential field",
      sample: 'clientSecret += "ZXCVBNMASDFGHJKL123456"',
    },
    {
      label: "JavaScript exponent-assignment credential field",
      sample: 'clientSecret **= "ZXCVBNMASDFGHJKL123456"',
    },
    {
      label: "JavaScript left-shift-assignment credential field",
      sample: 'clientSecret <<= "ZXCVBNMASDFGHJKL123456"',
    },
    {
      label: "JavaScript signed-right-shift-assignment credential field",
      sample: 'clientSecret >>= "ZXCVBNMASDFGHJKL123456"',
    },
    {
      label: "JavaScript unsigned-right-shift-assignment credential field",
      sample: 'clientSecret >>>= "ZXCVBNMASDFGHJKL123456"',
    },
    {
      label: "JavaScript double-quoted credential continuation",
      sample:
        'clientSecret = "placeholder" + "ZXCVBNMASDFGHJKL123456"',
    },
    {
      label: "JavaScript single-quoted credential continuation",
      sample:
        "clientSecret = 'placeholder' + 'ZXCVBNMASDFGHJKL123456'",
    },
    {
      label: "JavaScript commented credential continuation",
      sample:
        'clientSecret = "placeholder" /* synthetic */ + "ZXCVBNMASDFGHJKL123456"',
    },
    {
      label: "JavaScript template-suffix credential continuation",
      sample:
        'clientSecret = "placeholder" + `ZXCVBNMASDFGHJKL123456`',
    },
    {
      label: "JavaScript ternary credential continuation",
      sample:
        'clientSecret = "placeholder" ? "ZXCVBNMASDFGHJKL123456" : ""',
    },
    {
      label: "JavaScript concat-call credential continuation",
      sample:
        'clientSecret = "placeholder".concat("ZXCVBNMASDFGHJKL123456")',
    },
    {
      label: "double-triple-quoted credential continuation",
      sample:
        'clientSecret = """placeholder""" + "ZXCVBNMASDFGHJKL123456"',
    },
    {
      label: "single-triple-quoted credential continuation",
      sample:
        "clientSecret = '''placeholder''' + 'ZXCVBNMASDFGHJKL123456'",
    },
    {
      label: "JavaScript block-comment trivia before assignment operator",
      sample: 'clientSecret /**/= "ZXCVBNMASDFGHJKL123456"',
    },
    {
      label: "JavaScript dotted-key trivia before compound operator",
      sample:
        'this.clientSecret /* synthetic */ ||= "ZXCVBNMASDFGHJKL123456"',
    },
    {
      label: "JavaScript private-key trivia before compound operator",
      sample:
        'this.#clientSecret /* synthetic */ ??= "ZXCVBNMASDFGHJKL123456"',
    },
    {
      label: "JavaScript URL before credential assignment",
      sample:
        'const url = "https://example.invalid"; clientSecret = "ZXCVBNMASDFGHJKL123456"',
    },
    {
      label: "JavaScript regex before credential assignment",
      sample:
        'const pattern = /\\/\\//; clientSecret = "ZXCVBNMASDFGHJKL123456"',
    },
    {
      label: "unsafe unquoted environment fallback",
      sample:
        'clientSecret = process.env.CLIENT_SECRET || "ZXCVBNMASDFGHJKL123456"',
    },
    {
      label: "unsafe comment-delayed environment continuation",
      sample:
        'clientSecret = process.env.CLIENT_SECRET /* note */ + "ZXCVBNMASDFGHJKL123456"',
    },
    {
      label: "later credential after safe comma-delimited environment reference",
      sample:
        'clientSecret = process.env.CLIENT_SECRET, apiKey = "ZXCVBNMASDFGHJKL123456"',
    },
    {
      label: "long-trivia JavaScript computed credential key",
      sample:
        'const value = { [/*' +
        "x".repeat(4096) +
        '*/"clientSecret"]: ' +
        '"ZXCVBNMASDFGHJKL123456" };',
    },
    {
      label: "external narrative trailing credential assignment",
      sample:
        "client secret: stored in the environment. ZXCVBNMASDFGHJKL123456",
    },
    {
      label: "runtime narrative trailing credential assignment",
      sample:
        "api key: supplied by the operator at runtime. ZXCVBNMASDFGHJKL123456",
    },
    {
      label: "same-line block-comment environment template concatenation",
      sample:
        'clientSecret = `${process.env.CLIENT_SECRET}` /* synthetic */ + "ZXCVBNMASDFGHJKL123456"',
    },
    {
      label: "line-comment environment template continuation",
      sample:
        'clientSecret = `${process.env.CLIENT_SECRET}` // synthetic\n  + "ZXCVBNMASDFGHJKL123456"',
    },
    {
      label: "bearer credential",
      sample: "Authorization: Bearer syntheticProbeToken12345",
    },
    {
      label: "private-key header",
      sample: "-----BEGIN PRIVATE KEY-----",
    },
  ]);

  const PRIVACY_SIGNATURE_NEGATIVE_PROBES = Object.freeze([
    {
      label: "documented placeholder assignment",
      sample: "token=placeholder",
    },
    {
      label: "documentation path assignment",
      sample: "docs/client_secret=configuration.md",
    },
    {
      label: "environment reference assignment",
      sample: "clientSecret=process.env.CLIENT_SECRET",
    },
    {
      label: "YAML block placeholder assignment",
      sample: "client_secret: |-\n  placeholder",
    },
    {
      label: "TOML multiline placeholder assignment",
      sample: 'client_secret = """placeholder"""',
    },
    {
      label: "angle-placeholder assignment",
      sample: "client_secret=<CLIENT_SECRET>",
    },
    {
      label: "shell environment reference assignment",
      sample: "client_secret=${CLIENT_SECRET}",
    },
    {
      label: "single-quoted YAML placeholder assignment",
      sample: "client_secret: 'placeholder'",
    },
    {
      label: "multiline double-quoted YAML placeholder assignment",
      sample: 'client_secret: "placeholder\n  "',
    },
    {
      label: "comment-delayed YAML placeholder assignment",
      sample: "client_secret: # synthetic comment\n  placeholder",
    },
    {
      label: "same-indent setting after YAML placeholder assignment",
      sample: "client_secret: placeholder\nnext_setting: enabled",
    },
    {
      label: "empty YAML credential field before same-indent setting",
      sample: "client_secret:\nnext_setting: enabled",
    },
    {
      label: "escaped JSON credential key placeholder assignment",
      sample: '"client\\u005fsecret": "placeholder"',
    },
    {
      label: "JavaScript template environment reference assignment",
      sample: "clientSecret = `${process.env.CLIENT_SECRET}`",
    },
    {
      label: "empty JavaScript literal template assignment",
      sample: "clientSecret = ``;",
    },
    {
      label: "placeholder JavaScript literal template assignment",
      sample: "clientSecret = `placeholder`;",
    },
    {
      label: "environment template before a new JavaScript statement",
      sample:
        "clientSecret = `${process.env.CLIENT_SECRET}`\nnextSetting = true",
    },
    {
      label: "quoted spaced credential key placeholder assignment",
      sample: '"api key": "placeholder"',
    },
    {
      label: "unquoted spaced credential key placeholder assignment",
      sample: "api key: placeholder",
    },
    {
      label: "dotted credential key placeholder assignment",
      sample: "api.key: placeholder",
    },
    {
      label: "escaped spaced credential key placeholder assignment",
      sample: '"api\\u0020key": "placeholder"',
    },
    {
      label: "JavaScript bracket credential key environment assignment",
      sample: 'config["clientSecret"] = process.env.CLIENT_SECRET',
    },
    {
      label: "JavaScript static-template bracket key environment assignment",
      sample: "config[`clientSecret`] = process.env.CLIENT_SECRET",
    },
    {
      label: "slash-separated YAML credential key placeholder assignment",
      sample: "api/key: placeholder",
    },
    {
      label: "spaced slash-separated YAML key placeholder assignment",
      sample: "api / key: placeholder",
    },
    {
      label: "repeated-space YAML credential key placeholder assignment",
      sample: "api  key: placeholder",
    },
    {
      label: "backslash-separated YAML credential key placeholder assignment",
      sample: "api\\key: placeholder",
    },
    {
      label: "colon-separated YAML credential key placeholder assignment",
      sample: "api:key: placeholder",
    },
    {
      label: "tab-separated YAML credential key placeholder assignment",
      sample: "api\tkey: placeholder",
    },
    {
      label: "punctuation-separated YAML credential key placeholder assignment",
      sample: "api@key: placeholder",
    },
    {
      label: "equals-separated YAML credential key placeholder assignment",
      sample: "api=key: placeholder",
    },
    {
      label: "non-BMP-separated YAML credential key placeholder assignment",
      sample: "api🔑key: placeholder",
    },
    {
      label: "JavaScript code-point escaped bracket key environment assignment",
      sample: 'config["client\\u{53}ecret"] = process.env.CLIENT_SECRET',
    },
    {
      label: "JavaScript LF-continuation bracket key placeholder assignment",
      sample: 'config["client\\' + "\n" + 'Secret"] = "placeholder"',
    },
    {
      label: "JavaScript line-comment bracket key environment assignment",
      sample:
        'config[ // before\n "clientSecret" // after\n ] = process.env.CLIENT_SECRET',
    },
    {
      label: "JavaScript block-comment bracket key placeholder assignment",
      sample:
        "config[ /* before */ 'clientSecret' /* after */ ] = '${CLIENT_SECRET}'",
    },
    {
      label: "JavaScript CRLF-commented bracket key placeholder assignment",
      sample:
        "config?.[\r\n/* before */ `clientSecret` // after\r\n] = '<credential-placeholder>'",
    },
    {
      label: "YAML flow-mapping punctuation key placeholder assignment",
      sample: "{other: value, api@key: placeholder}",
    },
    {
      label: "nested YAML flow-mapping environment-reference assignment",
      sample: "outer: {api@key: ${API_KEY}}",
    },
    {
      label: "list YAML flow-mapping key placeholder assignment",
      sample: "- {other: value, api🔑key: placeholder}",
    },
    {
      label: "YAML explicit-mapping key placeholder assignment",
      sample: "? api@key\n: placeholder",
    },
    {
      label: "YAML explicit commented key placeholder assignment",
      sample: "? api@key # note\n: placeholder",
    },
    {
      label: "YAML multiline explicit key environment assignment",
      sample: "? api@\n  key\n: ${API_KEY}",
    },
    {
      label: "YAML list explicit tagged key placeholder assignment",
      sample: "- ? !!str &credential api@key # note\n  : placeholder",
    },
    {
      label: "YAML flow-explicit tagged key environment assignment",
      sample: "{? &credential !!str api@key: ${API_KEY}}",
    },
    {
      label: "YAML harmless explicit semantic key with sensitive trivia",
      sample:
        "? &api_key harmless # client secret documentation\n: ZXCVBNMASDFGHJKL123456",
    },
    {
      label: "YAML harmless flow-explicit key with sensitive trivia",
      sample:
        "{? !<tag:yaml.org,2002:str> harmless # api key documentation\n: ZXCVBNMASDFGHJKL123456}",
    },
    {
      label: "JavaScript private credential field placeholder assignment",
      sample: 'class C { #clientSecret = "placeholder" }',
    },
    {
      label: "JavaScript private credential property environment assignment",
      sample: "this.#clientSecret = process.env.CLIENT_SECRET",
    },
    {
      label: "JavaScript block-comment trivia before placeholder",
      sample: 'config["clientSecret"] = /* synthetic */ "placeholder"',
    },
    {
      label: "JavaScript block-comment trivia before environment reference",
      sample:
        'config["clientSecret"] = /* synthetic */ process.env.CLIENT_SECRET',
    },
    {
      label: "JavaScript LF line-comment trivia before placeholder",
      sample:
        'config["clientSecret"] = // synthetic\n  "placeholder"',
    },
    {
      label: "JavaScript CRLF line-comment trivia before environment reference",
      sample:
        "config[\"clientSecret\"] = // synthetic\r\n  process.env.CLIENT_SECRET",
    },
    {
      label: "JavaScript CR line-comment trivia before placeholder",
      sample:
        "config[\"clientSecret\"] = // synthetic\r  \"placeholder\"",
    },
    {
      label: "double-quoted YAML placeholder with trailing comment",
      sample: 'client_secret: "placeholder" # documentation',
    },
    {
      label: "single-quoted YAML placeholder with trailing comment",
      sample: "client_secret: 'placeholder' # documentation",
    },
    {
      label: "double-triple-quoted placeholder with trailing comment",
      sample: 'client_secret = """placeholder""" # documentation',
    },
    {
      label: "single-triple-quoted placeholder with trailing comment",
      sample: "client_secret = '''placeholder''' # documentation",
    },
    {
      label: "JavaScript key trivia before placeholder assignment",
      sample: 'clientSecret /* synthetic */ = "placeholder"',
    },
    {
      label: "JavaScript dotted-key trivia before environment assignment",
      sample:
        "this.clientSecret /* synthetic */ ||= process.env.CLIENT_SECRET",
    },
    {
      label: "JavaScript private-key trivia before placeholder assignment",
      sample: 'this.#clientSecret /* synthetic */ ??= "placeholder"',
    },
    {
      label: "JavaScript URL before credential placeholder",
      sample:
        'const url = "https://example.invalid"; clientSecret = "placeholder"',
    },
    {
      label: "JavaScript template URL before environment reference",
      sample:
        "const url = `https://example.invalid`; clientSecret = process.env.CLIENT_SECRET",
    },
    {
      label: "semicolon-terminated environment reference",
      sample: "clientSecret = process.env.CLIENT_SECRET;",
    },
    {
      label: "comma-terminated bracket environment reference",
      sample: 'clientSecret: process.env["CLIENT_SECRET"], next: true',
    },
    {
      label: "parenthesis-terminated imported environment reference",
      sample: "consume(clientSecret = import.meta.env.CLIENT_SECRET)",
    },
    {
      label: "brace-terminated shell environment reference",
      sample: "{client_secret: ${CLIENT_SECRET}}",
    },
    {
      label: "line-comment-terminated environment reference",
      sample:
        "clientSecret = process.env.CLIENT_SECRET; // documentation",
    },
    {
      label: "block-comment-terminated Deno environment reference",
      sample:
        'clientSecret = Deno.env.get("CLIENT_SECRET") /* documentation */;',
    },
    {
      label: "credential field storage prose",
      sample: "Client secret: stored in the environment.",
    },
    {
      label: "credential field external-management prose",
      sample: "The client secret: remains externally managed.",
    },
    {
      label: "credential field runtime prose",
      sample: "API key: supplied by the operator at runtime.",
    },
    {
      label: "credential guidance Markdown heading",
      sample: "### Client secret: configuration guidance",
    },
    {
      label: "credential field documentation prose",
      sample: "Field called client@secret: this is documentation only.",
    },
    {
      label: "credential inline-code documentation prose",
      sample: "See `client_secret`: a credential field name.",
    },
    {
      label: "credential placeholder prose",
      sample: "Use client secret: placeholder",
    },
    {
      label: "credential environment-reference prose",
      sample: "Use client secret: process.env.CLIENT_SECRET",
    },
    {
      label: "credential rotation recommendation prose",
      sample: "Recommendation: rotate the client secret regularly.",
    },
    {
      label: "credential phrase without assignment",
      sample: "The phrase client secret appears without assignment.",
    },
    {
      label: "same-line line-comment environment template assignment",
      sample:
        "clientSecret = `${process.env.CLIENT_SECRET}` // synthetic\nnextSetting = true",
    },
    {
      label: "same-line block-comment environment template assignment",
      sample: "clientSecret = `${process.env.CLIENT_SECRET}` /* synthetic */;",
    },
    {
      label: "same-line block-comment empty template assignment",
      sample: "clientSecret = `` /* synthetic */;",
    },
    {
      label: "same-line line-comment placeholder template assignment",
      sample: "clientSecret = `placeholder` // synthetic\nnextSetting = true",
    },
    {
      label: "nested YAML block placeholder before sibling setting",
      sample:
        "outer:\n  client_secret: |-\n    placeholder\n  next_setting: enabled",
    },
    {
      label: "list-item YAML block placeholder before sibling setting",
      sample: "- client_secret: |-\n    placeholder\n  next_setting: enabled",
    },
    {
      label: "doubly nested list YAML block placeholder before sibling setting",
      sample:
        "- - client_secret: |-\n      placeholder\n    next_setting: enabled",
    },
  ]);

  return {
    PRIVACY_SIGNATURES,
    PRIVACY_SIGNATURE_PROBES,
    PRIVACY_SIGNATURE_NEGATIVE_PROBES,
  };
}

const FORBIDDEN_CURRENT_CLAIMS = Object.freeze([
  {
    label: "three separately durable exact-hash reviews",
    pattern:
      /Three independent exact-hash|Three exact-hash reviews|three successive contract reviews/u,
  },
  {
    label: "unqualified complete crash builder",
    pattern: /\bComplete deterministic profile builder\b/u,
  },
  {
    label: "automatic mutation after technical GO",
    pattern:
      /Only after local review is GO,\s*(?:commit|push)|Commit\/push only/u,
  },
]);

const REQUIRED_SEMANTICS = Object.freeze([
  {
    label: "content-free authorize-inspect gate",
    patterns: [
      /authorize inspect/iu,
      /before any (?:extractor or )?DOM read/iu,
    ],
  },
  {
    label: "production bundle capability absence",
    patterns: [
      /production bundle/iu,
      /source(?:\/|, )build(?:\/|, )module(?:\/|, )(?:chunk(?:\/|, ))?sourcemap/iu,
    ],
  },
  {
    label: "migration 029 expand gate",
    patterns: [/029_manual_transcript_enrichment_expand\.sql/u],
  },
  {
    label: "migration 030 contract gate",
    patterns: [/030_manual_transcript_enrichment_contract\.sql/u],
  },
  {
    label: "SQLite semantic compatibility locators",
    patterns: [/3076/u, /3085/u, /4443/u, /4449/u, /4514/u, /4521/u],
  },
  {
    label: "distinct retry states",
    patterns: [/retryable/iu, /terminal/iu, /outcome-unknown/iu],
  },
  {
    label: "pre-push and post-hosted reviews",
    patterns: [/pre-push/iu, /post-hosted/iu, /exact-commit/iu],
  },
  {
    label: "live remote refresh",
    patterns: [/git ls-remote/u, /gh pr view/u],
  },
  {
    label: "current operation-trace digest",
    patterns: [
      /1bca0c280eef643bf7b286973a70d59eed1cc08650f20791315b5b107b9cdbc7/u,
    ],
  },
  {
    label: "explicit mutation authority",
    patterns: [/ready but not authorized/iu, /current explicit authority/iu],
  },
]);

function uniqueRuntimeFunctionRange(text, candidate, expectedName) {
  if (typeof candidate !== "function") {
    return undefined;
  }
  const source = Function.prototype.toString.call(candidate);
  if (!source.startsWith(`function ${expectedName}(`)) {
    return undefined;
  }
  const start = text.indexOf(source);
  if (start < 0 || text.indexOf(source, start + 1) >= 0) {
    return undefined;
  }
  return { start, end: start + source.length, source };
}

function parseMode(argv) {
  if (argv.length === 0) {
    return "local";
  }
  if (argv.length === 2 && argv[0] === "--mode") {
    if (argv[1] === "local" || argv[1] === "publication") {
      return argv[1];
    }
  }
  throw new Error(
    "Usage: node scripts/verify-youtube-item-recovery-handover.mjs " +
      "[--mode local|publication]",
  );
}

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: REPO_ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  }).trim();
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function lineCount(bytes, relativePath) {
  if (bytes.length > 0 && bytes.at(-1) !== 0x0a) {
    errors.push(`${relativePath}: file is not newline-terminated`);
  }
  let count = 0;
  for (const byte of bytes) {
    if (byte === 0x0a) {
      count += 1;
    }
  }
  return count;
}

function repoPath(relativePath) {
  return resolve(REPO_ROOT, relativePath);
}

function readRequired(relativePath) {
  const absolutePath = repoPath(relativePath);
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    errors.push(`${relativePath}: required file is missing`);
    return Buffer.from("");
  }
  return readFileSync(absolutePath);
}

function latestRunningLogEntry(text) {
  const entryStarts = [...text.matchAll(/^## /gmu)];
  if (entryStarts.length === 0) {
    return "";
  }
  return text.slice(entryStarts.at(-1).index);
}

function stripMarkdownHtmlComments(text, label) {
  const visible = text.split("");
  let searchIndex = 0;
  while (searchIndex < text.length) {
    const commentStart = text.indexOf("<!--", searchIndex);
    if (commentStart < 0) {
      break;
    }
    const commentEnd = text.indexOf("-->", commentStart + 4);
    if (commentEnd < 0) {
      errors.push(`${label}: unterminated HTML comment`);
      for (let index = commentStart; index < text.length; index += 1) {
        if (visible[index] !== "\r" && visible[index] !== "\n") {
          visible[index] = " ";
        }
      }
      searchIndex = text.length;
      break;
    }
    for (let index = commentStart; index < commentEnd + 3; index += 1) {
      if (visible[index] !== "\r" && visible[index] !== "\n") {
        visible[index] = " ";
      }
    }
    searchIndex = commentEnd + 3;
  }
  const visibleText = visible.join("");
  if (visibleText.includes("-->")) {
    errors.push(`${label}: unmatched HTML comment terminator`);
  }
  return visibleText;
}

function parseUniqueKeyValueBlock(
  text,
  { label, startLine, endLine, allowedKeys },
) {
  const lines = stripMarkdownHtmlComments(text, label).split("\n");
  const startIndexes = [];
  const endIndexes = [];
  for (const [index, line] of lines.entries()) {
    if (line === startLine) {
      startIndexes.push(index);
    }
    if (line === endLine) {
      endIndexes.push(index);
    }
  }
  if (startIndexes.length !== 1 || endIndexes.length !== 1) {
    errors.push(
      `${label}: expected one exact start/end marker, found ` +
        `${startIndexes.length}/${endIndexes.length}`,
    );
    return new Map();
  }

  const startIndex = startIndexes[0];
  const endIndex = endIndexes[0];
  if (endIndex <= startIndex) {
    errors.push(`${label}: end marker does not follow start marker`);
    return new Map();
  }

  const fields = new Map();
  for (let index = startIndex; index <= endIndex; index += 1) {
    const match = lines[index].match(/^([a-z][a-z0-9_]*)=(\S.*)$/u);
    if (!match) {
      errors.push(`${label}: malformed block line ${lines[index]}`);
      continue;
    }
    const [, key, value] = match;
    if (!allowedKeys.has(key)) {
      errors.push(`${label}: unexpected field ${key}`);
      continue;
    }
    if (fields.has(key)) {
      errors.push(`${label}: duplicate field ${key}`);
      continue;
    }
    fields.set(key, value);
  }

  for (const [index, line] of lines.entries()) {
    if (index >= startIndex && index <= endIndex) {
      continue;
    }
    const match = line.match(/^([a-z][a-z0-9_]*)=/u);
    if (match && allowedKeys.has(match[1])) {
      errors.push(`${label}: reserved field outside exact block ${match[1]}`);
    }
  }
  return fields;
}

function requireExactFields(fields, expectedFields, label) {
  for (const [key, expectedValue] of expectedFields) {
    if (!fields.has(key)) {
      errors.push(`${label}: missing field ${key}`);
    } else if (fields.get(key) !== expectedValue) {
      errors.push(
        `${label}: field ${key}=${fields.get(key)} != ${expectedValue}`,
      );
    }
  }
}

function markdownAnchors(text) {
  const counts = new Map();
  const anchors = new Set();
  for (const match of text.matchAll(/^#{1,6}\s+(.+?)\s*#*\s*$/gmu)) {
    const base = match[1]
      .normalize("NFKD")
      .toLowerCase()
      .replace(/[^\p{Letter}\p{Number}\s_-]/gu, "")
      .trim()
      .replace(/\s+/gu, "-");
    const prior = counts.get(base) ?? 0;
    counts.set(base, prior + 1);
    anchors.add(prior === 0 ? base : `${base}-${prior}`);
  }
  return anchors;
}

function checkMarkdownLinks(relativePath, text) {
  const sourceAbsolute = repoPath(relativePath);
  const linkPattern = /(?<!!)\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/gu;
  for (const match of text.matchAll(linkPattern)) {
    let target = match[1];
    if (target.startsWith("<") && target.endsWith(">")) {
      target = target.slice(1, -1);
    }
    if (/^(?:https?:|mailto:)/iu.test(target)) {
      continue;
    }
    if (
      isAbsolute(target) ||
      target.startsWith("~") ||
      /^file:/iu.test(target)
    ) {
      errors.push(`${relativePath}: non-portable Markdown target ${target}`);
      continue;
    }

    const [encodedPath, encodedAnchor] = target.startsWith("#")
      ? ["", target.slice(1)]
      : target.split("#", 2);
    let decodedPath;
    let decodedAnchor;
    try {
      decodedPath = decodeURIComponent(encodedPath);
      decodedAnchor =
        encodedAnchor === undefined
          ? undefined
          : decodeURIComponent(encodedAnchor);
    } catch {
      errors.push(`${relativePath}: invalid URL encoding in ${target}`);
      continue;
    }

    const destination =
      decodedPath === ""
        ? sourceAbsolute
        : resolve(dirname(sourceAbsolute), decodedPath);
    const escaped = relative(REPO_ROOT, destination);
    if (escaped.startsWith(`..${sep}`) || escaped === "..") {
      errors.push(`${relativePath}: link escapes repository: ${target}`);
      continue;
    }
    if (!existsSync(destination)) {
      errors.push(`${relativePath}: broken Markdown target ${target}`);
      continue;
    }
    if (decodedAnchor) {
      if (!statSync(destination).isFile()) {
        errors.push(
          `${relativePath}: Markdown anchor targets a non-file ${target}`,
        );
        continue;
      }
      const destinationText = readFileSync(destination, "utf8");
      if (!markdownAnchors(destinationText).has(decodedAnchor.toLowerCase())) {
        errors.push(`${relativePath}: missing Markdown anchor ${target}`);
      }
    }
  }
}

function parseManifest(text) {
  const rows = new Map();
  const lines = stripMarkdownHtmlComments(text, MANIFEST_PATH).split("\n");
  const headingIndexes = [];
  for (const [index, line] of lines.entries()) {
    if (line === "## Payload hashes") {
      headingIndexes.push(index);
    }
  }
  if (headingIndexes.length !== 1) {
    errors.push(
      `${MANIFEST_PATH}: expected one visible payload-hashes section, found ` +
        `${headingIndexes.length}`,
    );
    return rows;
  }

  const headerIndex = headingIndexes[0] + 2;
  if (
    !/^\|[ \t]+File[ \t]+\|[ \t]+Lines[ \t]+\|[ \t]+SHA-256[ \t]+\|$/u.test(
      lines[headerIndex] ?? "",
    ) ||
    !/^\|[ \t]*-+[ \t]*\|[ \t]*-+:?[ \t]*\|[ \t]*-+[ \t]*\|$/u.test(
      lines[headerIndex + 1] ?? "",
    )
  ) {
    errors.push(`${MANIFEST_PATH}: malformed visible payload table header`);
    return rows;
  }

  const pattern =
    /^\|[ \t]+`([^`\r\n]+)`[ \t]+\|[ \t]+([0-9]+)[ \t]+\|[ \t]+`([0-9a-f]{64})`[ \t]+\|$/u;
  for (
    let index = headerIndex + 2;
    index < lines.length && lines[index] !== "";
    index += 1
  ) {
    const match = lines[index].match(pattern);
    if (!match) {
      errors.push(`${MANIFEST_PATH}: malformed visible payload row`);
      continue;
    }
    if (rows.has(match[1])) {
      errors.push(`${MANIFEST_PATH}: duplicate row for ${match[1]}`);
    }
    rows.set(match[1], {
      lines: Number.parseInt(match[2], 10),
      sha: match[3],
    });
  }
  return rows;
}

function checkIndexBindings(text, manifestSha) {
  const visibleText = stripMarkdownHtmlComments(text, INDEX_PATH);
  const manifestHashRows = [
    ...visibleText.matchAll(
      /^\|[ \t]+Manifest SHA-256[ \t]+\|[ \t]+`([0-9a-f]{64})`[ \t]+\|$/gmu,
    ),
  ];
  if (
    manifestHashRows.length !== 1 ||
    manifestHashRows[0][1] !== manifestSha
  ) {
    errors.push(
      `${INDEX_PATH}: visible manifest SHA-256 field does not equal ` +
        `${manifestSha}`,
    );
  }

  const manifestLinkRows = [
    ...visibleText.matchAll(
      /^\|[ \t]+Manifest[ \t]+\|[ \t]+\[dated manifest\]\(([^)\r\n]+)\)[ \t]+\|$/gmu,
    ),
  ];
  const expectedManifestLink = `${DATE}/HANDOVER_MANIFEST.md`;
  if (
    manifestLinkRows.length !== 1 ||
    manifestLinkRows[0][1] !== expectedManifestLink
  ) {
    errors.push(
      `${INDEX_PATH}: visible manifest link does not equal ` +
        `${expectedManifestLink}`,
    );
  }

  for (const modeName of ["local", "publication"]) {
    const command =
      `node scripts/verify-youtube-item-recovery-handover.mjs ` +
      `--mode ${modeName}`;
    const occurrences = visibleText
      .split("\n")
      .filter((line) => line === command).length;
    if (occurrences !== 1) {
      errors.push(
        `${INDEX_PATH}: expected one visible ${modeName} verifier command, ` +
          `found ${occurrences}`,
      );
    }
  }
}

function createCredentialScanner() {
function lineIndentAt(text, index) {
  const lineStart = text.lastIndexOf("\n", Math.max(0, index - 1)) + 1;
  const leadingIndent =
    text.slice(lineStart).match(/^[ \t]*/u)?.[0].length ?? 0;
  const beforeMatch = text.slice(lineStart + leadingIndent, index + 1);
  const listMarkers = beforeMatch.match(/^(?:-[ \t]+)+/u)?.[0];
  return leadingIndent + (listMarkers?.length ?? 0);
}

function consumeLineBreak(text, index) {
  return text[index] === "\r" && text[index + 1] === "\n"
    ? index + 2
    : index + 1;
}

function findCredentialScalarStart(text, startIndex, assignmentIndent) {
  let index = startIndex;
  let requiresIndent = false;
  while (index < text.length) {
    const afterJavascriptTrivia = skipJavascriptTrivia(
      text,
      index,
      text.length,
    );
    if (afterJavascriptTrivia > index) {
      if (/[\r\n]/u.test(text.slice(index, afterJavascriptTrivia))) {
        requiresIndent = true;
      }
      index = afterJavascriptTrivia;
      continue;
    }
    let indentation = 0;
    while (text[index] === " " || text[index] === "\t") {
      indentation += 1;
      index += 1;
    }

    if (text[index] === "\r" || text[index] === "\n") {
      index = consumeLineBreak(text, index);
      requiresIndent = true;
      continue;
    }

    if (text[index] === "#") {
      while (
        index < text.length &&
        text[index] !== "\r" &&
        text[index] !== "\n"
      ) {
        index += 1;
      }
      if (index < text.length) {
        index = consumeLineBreak(text, index);
        requiresIndent = true;
        continue;
      }
      return text.length;
    }

    if (requiresIndent && indentation <= assignmentIndent) {
      const nextLineEnd = text.slice(index).search(/[\r\n]/u);
      const nextLine =
        nextLineEnd < 0
          ? text.slice(index)
          : text.slice(index, index + nextLineEnd);
      if (/^["']?[a-z0-9_.-]+["']?\s*[:=]/iu.test(nextLine)) {
        return text.length;
      }
    }
    return index;
  }
  return text.length;
}

function findSingleQuoteEnd(text, startIndex, grammar) {
  for (let index = startIndex + 1; index < text.length; index += 1) {
    if (grammar === "javascript" && text[index] === "\\") {
      index += 1;
      continue;
    }
    if (text[index] !== "'") {
      continue;
    }
    if (grammar === "yaml" && text[index + 1] === "'") {
      index += 1;
      continue;
    }
    return index;
  }
  return -1;
}

function readSingleQuotedScalarCandidates(text, startIndex) {
  const candidates = [];
  for (const grammar of ["yaml", "javascript"]) {
    const endIndex = findSingleQuoteEnd(text, startIndex, grammar);
    if (endIndex >= 0) {
      const forceSensitive = !templateHasSafeTerminator(text, endIndex + 1);
      const value = forceSensitive
        ? text.slice(startIndex + 1)
        : text.slice(startIndex + 1, endIndex);
      if (
        !candidates.some(
          (candidate) =>
            candidate.value === value &&
            candidate.forceSensitive === forceSensitive,
        )
      ) {
        candidates.push({ value, forceSensitive });
      }
    }
  }
  return candidates.length > 0
    ? candidates
    : [
        {
          value: text.slice(startIndex + 1),
          forceSensitive: false,
        },
      ];
}

function readDoubleQuotedScalar(text, startIndex) {
  let escaped = false;
  for (let index = startIndex + 1; index < text.length; index += 1) {
    const character = text[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === "\\") {
      escaped = true;
      continue;
    }
    if (character === '"') {
      const forceSensitive = !templateHasSafeTerminator(text, index + 1);
      return {
        value: forceSensitive
          ? text.slice(startIndex + 1)
          : text.slice(startIndex + 1, index),
        forceSensitive,
      };
    }
  }
  return {
    value: text.slice(startIndex + 1),
    forceSensitive: true,
  };
}

function templateHasSafeTerminator(text, afterIndex) {
  let index = afterIndex;
  let sawLineBreak = false;

  while (index < text.length) {
    if (text[index] === " " || text[index] === "\t") {
      index += 1;
      continue;
    }
    if (text[index] === "\r" || text[index] === "\n") {
      sawLineBreak = true;
      index = consumeLineBreak(text, index);
      continue;
    }
    if (text.startsWith("//", index)) {
      while (
        index < text.length &&
        text[index] !== "\r" &&
        text[index] !== "\n"
      ) {
        index += 1;
      }
      if (index >= text.length) {
        return true;
      }
      continue;
    }
    if (text.startsWith("/*", index)) {
      const commentEnd = text.indexOf("*/", index + 2);
      if (commentEnd < 0) {
        return false;
      }
      if (/[\r\n]/u.test(text.slice(index + 2, commentEnd))) {
        sawLineBreak = true;
      }
      index = commentEnd + 2;
      continue;
    }
    break;
  }

  if (
    index >= text.length ||
    text[index] === "#" ||
    /[,;)}\]]/u.test(text[index])
  ) {
    return true;
  }
  if (!sawLineBreak) {
    return false;
  }
  return !/^(?:as\b|in\b|instanceof\b|satisfies\b|[+\-*/%&|^?.([=<>!:`,])/u.test(
    text.slice(index),
  );
}

function readSimpleTemplateScalar(text, startIndex) {
  for (let index = startIndex + 1; index < text.length; index += 1) {
    if (text[index] === "\\" || text.startsWith("${", index)) {
      return undefined;
    }
    if (text[index] === "`") {
      return {
        value: text.slice(startIndex + 1, index),
        afterIndex: index + 1,
      };
    }
  }
  return undefined;
}

function readTemplateScalar(text, startIndex) {
  const environmentTemplate = text
    .slice(startIndex)
    .match(
      /^`(\$\{(?:[A-Z_][A-Z0-9_]*|process\.env(?:\.[A-Z0-9_]+|\[["'][^"']+["']\])|import\.meta\.env\.[A-Z0-9_]+|Deno\.env\.get\(["'][^"']+["']\))\})`/iu,
    );
  if (
    environmentTemplate &&
    templateHasSafeTerminator(text, startIndex + environmentTemplate[0].length)
  ) {
    return {
      value: environmentTemplate[1],
      forceSensitive: false,
    };
  }

  const simpleTemplate = readSimpleTemplateScalar(text, startIndex);
  if (
    simpleTemplate &&
    templateHasSafeTerminator(text, simpleTemplate.afterIndex)
  ) {
    return {
      value: simpleTemplate.value,
      forceSensitive: false,
    };
  }

  return {
    value: text.slice(startIndex + 1),
    forceSensitive: true,
  };
}

function isBackslashEscaped(text, index) {
  let backslashes = 0;
  for (
    let cursor = index - 1;
    cursor >= 0 && text[cursor] === "\\";
    cursor -= 1
  ) {
    backslashes += 1;
  }
  return backslashes % 2 === 1;
}

function readTripleQuotedScalar(text, startIndex, delimiter) {
  for (
    let index = startIndex + delimiter.length;
    index <= text.length - delimiter.length;
    index += 1
  ) {
    if (!text.startsWith(delimiter, index)) {
      continue;
    }
    if (delimiter === '"""' && isBackslashEscaped(text, index)) {
      continue;
    }
    const forceSensitive = !templateHasSafeTerminator(
      text,
      index + delimiter.length,
    );
    return {
      value: forceSensitive
        ? text.slice(startIndex + delimiter.length)
        : text.slice(startIndex + delimiter.length, index),
      forceSensitive,
    };
  }
  return {
    value: text.slice(startIndex + delimiter.length),
    forceSensitive: true,
  };
}

function readYamlBlockScalar(text, indicatorIndex, assignmentIndent) {
  const headerEnd = text.indexOf("\n", indicatorIndex);
  if (headerEnd < 0) {
    return "";
  }

  const lines = text.slice(headerEnd + 1).split(/\r?\n/u);
  const content = [];
  let sawContent = false;
  for (const line of lines) {
    if (line.trim() === "") {
      if (sawContent) {
        content.push("");
      }
      continue;
    }
    const indentation = line.match(/^[ \t]*/u)?.[0].length ?? 0;
    if (indentation <= assignmentIndent) {
      break;
    }
    sawContent = true;
    content.push(line.trim());
  }
  return content.join("\n").trim();
}

function readYamlPlainScalar(text, startIndex, assignmentIndent) {
  const content = [];
  let index = startIndex;
  let firstLine = true;
  while (index < text.length) {
    const newlineIndex = text.indexOf("\n", index);
    const lineEnd = newlineIndex < 0 ? text.length : newlineIndex;
    const line = text.slice(index, lineEnd).replace(/\r$/u, "");
    const indentation = line.match(/^[ \t]*/u)?.[0].length ?? 0;
    const body = line.slice(indentation);

    if (!firstLine && body.trim() !== "" && indentation <= assignmentIndent) {
      break;
    }
    if (body.trim() !== "" && !body.startsWith("#")) {
      const withoutComment = body.replace(/[ \t]+#.*$/u, "").trim();
      if (withoutComment !== "") {
        content.push(withoutComment);
      }
    }

    if (newlineIndex < 0) {
      break;
    }
    index = newlineIndex + 1;
    firstLine = false;
  }
  return content.join("\n").trim();
}

function readCredentialScalar(text, startIndex, assignmentStartIndex) {
  const assignmentIndent = lineIndentAt(text, assignmentStartIndex);
  let index = findCredentialScalarStart(text, startIndex, assignmentIndent);

  while (text[index] === "!" || text[index] === "&") {
    const property = text
      .slice(index)
      .match(/^(?:![^\s]+|&[a-z0-9_-]+)[ \t]+/iu);
    if (!property) {
      break;
    }
    index += property[0].length;
  }

  const terminatedSafeReference = readTerminatedSafeCredentialReference(
    text,
    index,
    assignmentIndent,
  );
  if (terminatedSafeReference) {
    return [
      {
        value: terminatedSafeReference,
        forceSensitive: false,
      },
    ];
  }

  if (text[index] === "|" || text[index] === ">") {
    return [
      {
        value: readYamlBlockScalar(text, index, assignmentIndent),
        forceSensitive: false,
      },
    ];
  }

  const tripleQuote = text.slice(index, index + 3);
  if (tripleQuote === '"""' || tripleQuote === "'''") {
    return [readTripleQuotedScalar(text, index, tripleQuote)];
  }

  if (text[index] === "'") {
    return readSingleQuotedScalarCandidates(text, index);
  }

  if (text[index] === '"') {
    return [readDoubleQuotedScalar(text, index)];
  }

  if (text[index] === "`") {
    return [readTemplateScalar(text, index)];
  }

  const lineEnd = text.slice(index).search(/[\r\n]/u);
  if (lineEnd < 0) {
    return [
      {
        value: text
          .slice(index)
          .replace(/[ \t]+#.*$/u, "")
          .trim(),
        forceSensitive: false,
      },
    ];
  }
  return [
    {
      value: readYamlPlainScalar(text, index, assignmentIndent),
      forceSensitive: false,
    },
  ];
}

function isSafeCredentialReference(value) {
  const scalar = value.trim();
  if (
    /^(?:placeholder|example(?:[_-]?value)?|sample(?:[_-]?value)?|dummy(?:[_-]?value)?|change[_-]?me|redacted|masked|not[_-]?set|unset)$/iu.test(
      scalar,
    )
  ) {
    return true;
  }
  if (/^<[^>\r\n]+>$/u.test(scalar)) {
    return true;
  }
  if (/^(?:\$\{[A-Z_][A-Z0-9_]*\}|\$[A-Z_][A-Z0-9_]*)$/u.test(scalar)) {
    return true;
  }
  if (
    /^(?:stored in the environment|supplied by the operator at runtime|remains externally managed)\.$/iu.test(
      scalar,
    )
  ) {
    return true;
  }
  if (
    /^(?:(?:process\.env(?:\.[A-Z0-9_]+|\[["'][^"']+["']\])|import\.meta\.env\.[A-Z0-9_]+|Deno\.env\.get\(["'][^"']+["']\))|\$\{(?:process\.env(?:\.[A-Z0-9_]+|\[["'][^"']+["']\])|import\.meta\.env\.[A-Z0-9_]+|Deno\.env\.get\(["'][^"']+["']\))\})$/iu.test(
      scalar,
    )
  ) {
    return true;
  }
  return /^(?:\.{0,2}\/)?(?:[a-z0-9_.-]+\/)*[a-z0-9_.-]+\.(?:md|txt|json|ya?ml|toml|example|template)$/iu.test(
    scalar,
  );
}

function hasIndentedYamlContinuation(text, startIndex, assignmentIndent) {
  const lineBreakOffset = text.slice(startIndex).search(/[\r\n]/u);
  if (lineBreakOffset < 0) {
    return false;
  }
  const beforeLineBreak = text.slice(
    startIndex,
    startIndex + lineBreakOffset,
  );
  if (beforeLineBreak.trim() !== "") {
    return false;
  }

  let lineStart = consumeLineBreak(text, startIndex + lineBreakOffset);
  while (lineStart < text.length) {
    const nextBreakOffset = text.slice(lineStart).search(/[\r\n]/u);
    const lineEnd =
      nextBreakOffset < 0 ? text.length : lineStart + nextBreakOffset;
    const line = text.slice(lineStart, lineEnd);
    const indentation = line.match(/^[ \t]*/u)?.[0].length ?? 0;
    const body = line.slice(indentation);
    if (body.trim() === "" || body.startsWith("#")) {
      if (nextBreakOffset < 0) {
        return false;
      }
      lineStart = consumeLineBreak(text, lineEnd);
      continue;
    }
    return indentation > assignmentIndent;
  }
  return false;
}

function readTerminatedSafeCredentialReference(
  text,
  startIndex,
  assignmentIndent,
) {
  const maximumEnd = Math.min(text.length, startIndex + 2048);
  for (let endIndex = startIndex + 1; endIndex <= maximumEnd; endIndex += 1) {
    const candidate = text.slice(startIndex, endIndex);
    if (
      isSafeCredentialReference(candidate) &&
      templateHasSafeTerminator(text, endIndex) &&
      !hasIndentedYamlContinuation(text, endIndex, assignmentIndent)
    ) {
      return candidate.trim();
    }
    if (
      text[endIndex - 1] === "\r" ||
      text[endIndex - 1] === "\n"
    ) {
      break;
    }
  }
  return undefined;
}

function decodeCredentialScanEscapes(text) {
  const decode = (match, hexadecimal) => {
    const codePoint = Number.parseInt(hexadecimal, 16);
    return codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : match;
  };
  return text
    .replace(/\\x([0-9a-fA-F]{2})/gu, decode)
    .replace(/\\u([0-9a-fA-F]{4})/gu, decode)
    .replace(/\\U([0-9a-fA-F]{8})/gu, decode)
    .replace(/\\u\{([0-9a-fA-F]{1,6})\}/gu, decode)
    .replace(/\\(?:\r\n|[\r\n])/gu, "");
}

function stripJavascriptComments(text) {
  const stripped = text.split("");
  let quote;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quote) {
      if (character === "\\") {
        index += 1;
        continue;
      }
      if (character === quote) {
        quote = undefined;
      }
      continue;
    }
    if (character === '"' || character === "'" || character === "`") {
      quote = character;
      continue;
    }
    if (text.startsWith("//", index)) {
      for (
        let cursor = index;
        cursor < text.length &&
        text[cursor] !== "\r" &&
        text[cursor] !== "\n";
        cursor += 1
      ) {
        stripped[cursor] = " ";
        index = cursor;
      }
      continue;
    }
    if (text.startsWith("/*", index)) {
      const commentEnd = text.indexOf("*/", index + 2);
      if (commentEnd < 0) {
        continue;
      }
      for (let cursor = index; cursor < commentEnd + 2; cursor += 1) {
        if (text[cursor] !== "\r" && text[cursor] !== "\n") {
          stripped[cursor] = " ";
        }
      }
      index = commentEnd + 1;
    }
  }
  return stripped.join("");
}

function skipJavascriptTrivia(text, startIndex, maximumEnd) {
  let index = startIndex;
  while (index < maximumEnd) {
    if (
      text[index] === " " ||
      text[index] === "\t" ||
      text[index] === "\r" ||
      text[index] === "\n"
    ) {
      index += 1;
      continue;
    }
    if (text.startsWith("//", index)) {
      const lineBreakOffset = text
        .slice(index + 2, maximumEnd)
        .search(/[\r\n]/u);
      if (lineBreakOffset < 0) {
        return maximumEnd;
      }
      index += 2 + lineBreakOffset;
      index = consumeLineBreak(text, index);
      continue;
    }
    if (text.startsWith("/*", index)) {
      const commentEnd = text.indexOf("*/", index + 2);
      if (commentEnd < 0 || commentEnd + 2 > maximumEnd) {
        return maximumEnd;
      }
      index = commentEnd + 2;
      continue;
    }
    break;
  }
  return index;
}

function normalizeStaticBracketKeys(text) {
  const normalized = text.split("");

  for (
    let bracketIndex = text.indexOf("[");
    bracketIndex >= 0;
    bracketIndex = text.indexOf("[", bracketIndex + 1)
  ) {
    const maximumEnd = text.length;
    let index = skipJavascriptTrivia(text, bracketIndex + 1, maximumEnd);
    const delimiter = text[index];
    if (delimiter !== '"' && delimiter !== "'" && delimiter !== "`") {
      continue;
    }

    const keyStart = index + 1;
    let keyEnd = -1;
    for (index = keyStart; index < maximumEnd; index += 1) {
      if (text[index] === "\\") {
        index += text[index + 1] === "\r" && text[index + 2] === "\n" ? 2 : 1;
        continue;
      }
      if (text[index] === delimiter) {
        keyEnd = index;
        break;
      }
    }
    if (keyEnd < 0) {
      continue;
    }

    index = skipJavascriptTrivia(text, keyEnd + 1, maximumEnd);
    if (text[index] !== "]") {
      continue;
    }
    index = skipJavascriptTrivia(text, index + 1, maximumEnd);
    if (text[index] !== ":" && text[index] !== "=") {
      continue;
    }

    for (let cursor = bracketIndex; cursor < index; cursor += 1) {
      normalized[cursor] = "_";
    }
    for (let cursor = keyStart; cursor < keyEnd; cursor += 1) {
      if (/[a-z0-9_-]/iu.test(text[cursor])) {
        normalized[cursor] = text[cursor];
      }
    }
  }

  return normalized.join("");
}

function normalizeYamlSensitiveKey(text, normalized, keyStart, keyEnd) {
  const sensitiveKeyPattern =
    /^(?:api[_-]*key|access[_-]*key(?:[_-]*id)?|access[_-]*token|refresh[_-]*token|client[_-]*secret(?:[_-]*key)?|secret[_-]*access[_-]*key|secret(?:[_-]*key)?|private[_-]*key|token|password|passwd|authorization)$/iu;
  const keyText = text.slice(keyStart, keyEnd);
  const working = keyText.split("");
  const structural = new Set();
  let quote;
  let verbatimTag = false;

  const mask = (start, end) => {
    for (let index = start; index < end; index += 1) {
      structural.add(index);
      if (working[index] !== "\r" && working[index] !== "\n") {
        working[index] = " ";
      }
    }
  };

  for (let index = 0; index < keyText.length; index += 1) {
    const character = keyText[index];
    if (quote) {
      if (character === "\\" && quote === '"') {
        index += 1;
        continue;
      }
      if (character === quote) {
        if (quote === "'" && keyText[index + 1] === "'") {
          index += 1;
        } else {
          quote = undefined;
        }
      }
      continue;
    }
    if (verbatimTag) {
      if (character === ">") {
        verbatimTag = false;
      }
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === "!" && keyText[index + 1] === "<") {
      verbatimTag = true;
      index += 1;
      continue;
    }
    if (
      character === "#" &&
      (index === 0 || /[ \t\r\n]/u.test(keyText[index - 1]))
    ) {
      let commentEnd = index;
      while (
        commentEnd < keyText.length &&
        keyText[commentEnd] !== "\r" &&
        keyText[commentEnd] !== "\n"
      ) {
        commentEnd += 1;
      }
      mask(index, commentEnd);
      if (
        keyText[commentEnd] === "\r" ||
        keyText[commentEnd] === "\n"
      ) {
        structural.add(commentEnd);
        if (
          keyText[commentEnd] === "\r" &&
          keyText[commentEnd + 1] === "\n"
        ) {
          structural.add(commentEnd + 1);
        }
      }
      index = commentEnd - 1;
    }
  }

  let contentStart = 0;
  const skipWhitespace = () => {
    while (
      contentStart < working.length &&
      /[ \t\r\n]/u.test(working[contentStart])
    ) {
      contentStart += 1;
    }
  };
  skipWhitespace();
  if (
    working[contentStart] === "?" &&
    /[ \t\r\n]/u.test(working[contentStart + 1] ?? "")
  ) {
    mask(contentStart, contentStart + 1);
    contentStart += 1;
  }

  while (contentStart < working.length) {
    skipWhitespace();
    const remaining = working.join("").slice(contentStart);
    const property = remaining.match(
      /^(?:!(?:<[^>\r\n]+>|[^\s[\]{},]+)|&[^\s[\]{},]+)(?=[ \t\r\n])/u,
    );
    if (!property) {
      break;
    }
    mask(contentStart, contentStart + property[0].length);
    contentStart += property[0].length;
  }
  for (let index = 0; index < contentStart; index += 1) {
    structural.add(index);
  }
  let contentEnd = working.length;
  while (
    contentEnd > contentStart &&
    /[ \t\r\n]/u.test(working[contentEnd - 1])
  ) {
    contentEnd -= 1;
  }
  for (let index = contentEnd; index < working.length; index += 1) {
    structural.add(index);
  }

  const canonicalKey = working
    .join("")
    .replace(/[^a-z0-9_-]+/giu, "_")
    .replace(/^_+|_+$/gu, "");
  if (!sensitiveKeyPattern.test(canonicalKey)) {
    return false;
  }

  for (let offset = 0; offset < working.length; offset += 1) {
    const sourceCharacter = text[keyStart + offset];
    if (structural.has(offset)) {
      normalized[keyStart + offset] = " ";
    } else if (sourceCharacter === "\r" || sourceCharacter === "\n") {
      normalized[keyStart + offset] = "_";
    } else if (!/[a-z0-9_-]/iu.test(sourceCharacter)) {
      normalized[keyStart + offset] = "_";
    }
  }
  return true;
}

function normalizeYamlMappingKeys(text) {
  const normalized = text.split("");
  let lineStart = 0;

  while (lineStart < text.length) {
    const lineBreakOffset = text.slice(lineStart).search(/[\r\n]/u);
    const lineEnd =
      lineBreakOffset < 0 ? text.length : lineStart + lineBreakOffset;
    let keyStart = lineStart;
    while (text[keyStart] === " " || text[keyStart] === "\t") {
      keyStart += 1;
    }
    while (
      text[keyStart] === "-" &&
      (text[keyStart + 1] === " " || text[keyStart + 1] === "\t")
    ) {
      keyStart += 1;
      while (text[keyStart] === " " || text[keyStart] === "\t") {
        keyStart += 1;
      }
    }

    if (
      keyStart < lineEnd &&
      text[keyStart] !== "#" &&
      text[keyStart] !== ">" &&
      text[keyStart] !== "`"
    ) {
      let quote;
      let verbatimTag = false;
      let delimiterIndex = -1;
      for (let index = keyStart; index < lineEnd; index += 1) {
        const character = text[index];
        if (quote) {
          if (character === "\\" && quote === '"') {
            index += 1;
          } else if (character === quote) {
            if (quote === "'" && text[index + 1] === "'") {
              index += 1;
            } else {
              quote = undefined;
            }
          }
          continue;
        }
        if (verbatimTag) {
          if (character === ">") {
            verbatimTag = false;
          }
          continue;
        }
        if (character === '"' || character === "'") {
          quote = character;
          continue;
        }
        if (character === "!" && text[index + 1] === "<") {
          verbatimTag = true;
          index += 1;
          continue;
        }
        if (
          character === ":" &&
          (index + 1 === lineEnd ||
            text[index + 1] === " " ||
            text[index + 1] === "\t")
        ) {
          delimiterIndex = index;
          break;
        }
      }
      if (delimiterIndex >= 0) {
        normalizeYamlSensitiveKey(
          text,
          normalized,
          keyStart,
          delimiterIndex,
        );
      }
    }

    if (lineBreakOffset < 0) {
      break;
    }
    lineStart = consumeLineBreak(text, lineEnd);
  }

  return normalized.join("");
}

function normalizeYamlFlowMappingKeys(text) {
  const normalized = text.split("");
  const frames = [];
  let quote;
  let lineComment = false;
  let blockComment = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (lineComment) {
      if (character === "\r" || character === "\n") {
        lineComment = false;
      }
      continue;
    }
    if (blockComment) {
      if (text.startsWith("*/", index)) {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (character === "\\" && quote !== "'") {
        index += 1;
        continue;
      }
      if (character === quote) {
        if (quote === "'" && text[index + 1] === "'") {
          index += 1;
        } else {
          quote = undefined;
        }
      }
      continue;
    }
    if (character === '"' || character === "'" || character === "`") {
      quote = character;
      continue;
    }
    if (text.startsWith("//", index)) {
      lineComment = true;
      index += 1;
      continue;
    }
    if (text.startsWith("/*", index)) {
      blockComment = true;
      index += 1;
      continue;
    }
    if (
      character === "#" &&
      (index === 0 || /[ \t\r\n]/u.test(text[index - 1]))
    ) {
      lineComment = true;
      continue;
    }
    if (character === "{") {
      frames.push({
        type: "mapping",
        expectingKey: true,
        keyStart: index + 1,
        sawMapping: false,
      });
      continue;
    }
    if (character === "[") {
      frames.push({ type: "sequence" });
      continue;
    }
    if (character === "}" || character === "]") {
      const frame = frames.at(-1);
      if (
        character === "}" &&
        frame?.type === "mapping" &&
        frame.sawMapping
      ) {
        normalized[index] = "\n";
      }
      if (
        (character === "}" && frame?.type === "mapping") ||
        (character === "]" && frame?.type === "sequence")
      ) {
        frames.pop();
      }
      continue;
    }

    const frame = frames.at(-1);
    if (frame?.type !== "mapping") {
      continue;
    }
    if (
      frame.expectingKey &&
      character === "!" &&
      text[index + 1] === "<"
    ) {
      const tagEnd = text.indexOf(">", index + 2);
      if (tagEnd >= 0) {
        index = tagEnd;
      }
      continue;
    }
    if (frame.expectingKey && character === ":") {
      normalizeYamlSensitiveKey(text, normalized, frame.keyStart, index);
      frame.expectingKey = false;
      frame.sawMapping = true;
      continue;
    }
    if (!frame.expectingKey && character === ",") {
      normalized[index] = "\n";
      frame.expectingKey = true;
      frame.keyStart = index + 1;
    }
  }

  return normalized.join("");
}

function normalizeYamlExplicitMappingKeys(text) {
  const normalized = text.split("");
  let lineStart = 0;

  while (lineStart < text.length) {
    const lineBreakOffset = text.slice(lineStart).search(/[\r\n]/u);
    const lineEnd =
      lineBreakOffset < 0 ? text.length : lineStart + lineBreakOffset;
    let markerIndex = lineStart;
    while (text[markerIndex] === " " || text[markerIndex] === "\t") {
      markerIndex += 1;
    }
    while (
      text[markerIndex] === "-" &&
      (text[markerIndex + 1] === " " || text[markerIndex + 1] === "\t")
    ) {
      markerIndex += 1;
      while (text[markerIndex] === " " || text[markerIndex] === "\t") {
        markerIndex += 1;
      }
    }

    if (
      text[markerIndex] === "?" &&
      (text[markerIndex + 1] === " " || text[markerIndex + 1] === "\t")
    ) {
      const mappingIndent = lineIndentAt(text, markerIndex);
      let candidateLineStart =
        lineBreakOffset < 0 ? text.length : consumeLineBreak(text, lineEnd);
      let delimiterLineStart = -1;
      while (candidateLineStart < text.length) {
        const candidateBreakOffset = text
          .slice(candidateLineStart)
          .search(/[\r\n]/u);
        const candidateLineEnd =
          candidateBreakOffset < 0
            ? text.length
            : candidateLineStart + candidateBreakOffset;
        let contentStart = candidateLineStart;
        while (
          text[contentStart] === " " ||
          text[contentStart] === "\t"
        ) {
          contentStart += 1;
        }
        const indentation = contentStart - candidateLineStart;
        const content = text.slice(contentStart, candidateLineEnd);
        if (content === "" || content.startsWith("#")) {
          candidateLineStart =
            candidateBreakOffset < 0
              ? text.length
              : consumeLineBreak(text, candidateLineEnd);
          continue;
        }
        if (content.startsWith(":") && indentation === mappingIndent) {
          delimiterLineStart = candidateLineStart;
        } else if (indentation <= mappingIndent) {
          break;
        }
        if (delimiterLineStart >= 0 || candidateBreakOffset < 0) {
          break;
        }
        candidateLineStart = consumeLineBreak(text, candidateLineEnd);
      }
      if (delimiterLineStart >= 0) {
        normalizeYamlSensitiveKey(
          text,
          normalized,
          markerIndex,
          delimiterLineStart,
        );
      }
    }

    if (lineBreakOffset < 0) {
      break;
    }
    lineStart = consumeLineBreak(text, lineEnd);
  }

  return normalized.join("");
}

function normalizeCredentialKeySyntax(text) {
  const normalizeKey = (match) =>
    match.replace(/[^a-z0-9_-]/giu, (character) =>
      character === "\r" || character === "\n"
        ? character
        : "_".repeat(character.length),
    );
  const normalizeBracketKey = (match) =>
    match.replace(/[^a-z0-9_-]/giu, (character) =>
      "_".repeat(character.length),
    );

  return normalizeYamlExplicitMappingKeys(
    normalizeYamlFlowMappingKeys(
      normalizeYamlMappingKeys(normalizeStaticBracketKeys(text)),
    ),
  )
    .replace(
      /(?:[a-z0-9_$?.-]+[ \t\r\n]*)?\[[ \t\r\n]*(?:"(?:\\[\s\S]|[^"\\]){0,240}"|'(?:\\[\s\S]|[^'\\]){0,240}'|`(?:\\[\s\S]|[^`\\]){0,240}`)[ \t\r\n]*\](?=[ \t\r\n]*[:=])/giu,
      normalizeBracketKey,
    )
    .replace(
      /(?:"(?:\\.|[^"\\\r\n])*"|'(?:\\.|[^'\\\r\n])*')(?=\s*[:=])/gu,
      normalizeKey,
    )
    .replace(
      /[a-z0-9_$][a-z0-9_$-]*(?:[^a-z0-9_$\r\n=]+[a-z0-9_$-]+){1,6}[^a-z0-9_$\r\n=]*(?=[ \t]*=)/giu,
      normalizeKey,
    );
}

function hasCredentialKeyContext(text, delimiterIndex) {
  let keyStart = delimiterIndex;
  while (keyStart > 0 && /[ \t\r\n]/u.test(text[keyStart - 1])) {
    keyStart -= 1;
  }
  while (keyStart > 0 && /[a-z0-9_$'"?-]/iu.test(text[keyStart - 1])) {
    keyStart -= 1;
  }

  const lineStart =
    Math.max(
      text.lastIndexOf("\n", keyStart - 1),
      text.lastIndexOf("\r", keyStart - 1),
    ) + 1;
  const prefix = text.slice(lineStart, keyStart);
  if (/^[ \t]*(?:-[ \t]+)*$/u.test(prefix)) {
    return true;
  }
  if (/(?:[.#([{,;]|\?\.?)[ \t]*$/u.test(prefix)) {
    return true;
  }
  return /(?:^|[;{}()[\],])[ \t]*(?:(?:export|declare)[ \t]+)*(?:const|let|var)[ \t]+$/u.test(
    prefix,
  );
}

function containsCredentialAssignmentInView(text) {
  const assignmentPattern =
    /(?:^|[^a-z0-9_-])["']?[a-z0-9_-]*?(?:api[_-]*key|access[_-]*key(?:[_-]*id)?|access[_-]*token|refresh[_-]*token|client[_-]*secret(?:[_-]*key)?|secret[_-]*access[_-]*key|secret(?:[_-]*key)?|private[_-]*key|token|password|passwd|authorization)[a-z0-9_-]*["']?(?:\s|\/\*[\s\S]*?\*\/|\/\/[^\r\n]*(?:\r\n|[\r\n]|$))*(?::|(?:&&|\|\||\?\?|>>>|>>|<<|\*\*|[+\-*/%&|^])?=)[ \t]*/gimu;
  for (const match of text.matchAll(assignmentPattern)) {
    const delimiter = match[0].match(
      /(?::|(?:&&|\|\||\?\?|>>>|>>|<<|\*\*|[+\-*/%&|^])?=)[ \t]*$/u,
    );
    const delimiterOffset = delimiter
      ? match[0].length - delimiter[0].length
      : -1;
    if (
      delimiterOffset < 0 ||
      !hasCredentialKeyContext(text, match.index + delimiterOffset)
    ) {
      continue;
    }
    const scalarCandidates = readCredentialScalar(
      text,
      match.index + match[0].length,
      match.index,
    );
    if (
      scalarCandidates.some(
        ({ value, forceSensitive }) => {
          const scalarLength = value.length;
          return (
            !isSafeCredentialReference(value) &&
            (forceSensitive || scalarLength > 0)
          );
        },
      )
    ) {
      return true;
    }
  }
  return false;
}

function containsCredentialAssignmentSyntaxInView(text) {
  const assignmentPattern =
    /(?:^|[^a-z0-9_-])["']?[a-z0-9_-]*?(?:api[_-]*key|access[_-]*key(?:[_-]*id)?|access[_-]*token|refresh[_-]*token|client[_-]*secret(?:[_-]*key)?|secret[_-]*access[_-]*key|secret(?:[_-]*key)?|private[_-]*key|token|password|passwd|authorization)[a-z0-9_-]*["']?(?:\s|\/\*[\s\S]*?\*\/|\/\/[^\r\n]*(?:\r\n|[\r\n]|$))*(?::|(?:&&|\|\||\?\?|>>>|>>|<<|\*\*|[+\-*/%&|^])?=)[ \t]*/gimu;
  return assignmentPattern.test(text);
}

function containsCredentialMethodSyntaxInView(text) {
  const methodPattern =
    /(?:^|[^a-z0-9_-])["']?[a-z0-9_-]*?(?:api[_-]*key|access[_-]*key(?:[_-]*id)?|access[_-]*token|refresh[_-]*token|client[_-]*secret(?:[_-]*key)?|secret[_-]*access[_-]*key|secret(?:[_-]*key)?|private[_-]*key|token|password|passwd|authorization)[a-z0-9_-]*["']?\s*\([^(){}]*\)\s*\{/gimu;
  return methodPattern.test(text);
}

function javascriptPreviousWord(text, beforeIndex) {
  let index = beforeIndex - 1;
  while (index >= 0 && /\s/u.test(text[index])) {
    index -= 1;
  }
  const end = index + 1;
  while (index >= 0 && /[a-z0-9_$]/iu.test(text[index])) {
    index -= 1;
  }
  return Object.freeze({
    word: text.slice(index + 1, end).join(""),
    start: index + 1,
    before: index,
  });
}

function javascriptMatchingOpen(
  text,
  closingIndex,
  openingCharacter,
  closingCharacter,
) {
  let depth = 0;
  for (let index = closingIndex; index >= 0; index -= 1) {
    if (text[index] === closingCharacter) {
      depth += 1;
    } else if (text[index] === openingCharacter) {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }
  return -1;
}

function javascriptDeclarationContext(text, keywordStart) {
  let index = keywordStart - 1;
  while (index >= 0 && /\s/u.test(text[index])) {
    index -= 1;
  }
  if (index < 0 || /[;{}]/u.test(text[index])) {
    return true;
  }
  const prior = javascriptPreviousWord(text, keywordStart);
  if (/^(?:async|default|export)$/u.test(prior.word)) {
    return javascriptDeclarationContext(text, prior.start);
  }
  return false;
}

function javascriptClosesStatementBlock(text, closingBraceIndex) {
  const openingBraceIndex = javascriptMatchingOpen(
    text,
    closingBraceIndex,
    "{",
    "}",
  );
  if (openingBraceIndex < 0) {
    return false;
  }

  let index = openingBraceIndex - 1;
  while (index >= 0 && /\s/u.test(text[index])) {
    index -= 1;
  }
  if (index < 0 || /[;{}]/u.test(text[index])) {
    return true;
  }

  const precedingWord = javascriptPreviousWord(text, openingBraceIndex);
  if (/^(?:catch|do|else|finally|try)$/u.test(precedingWord.word)) {
    return true;
  }
  if (precedingWord.word !== "") {
    const declarationWord = javascriptPreviousWord(
      text,
      precedingWord.start,
    );
    if (
      /^(?:class|function)$/u.test(declarationWord.word) &&
      javascriptDeclarationContext(text, declarationWord.start)
    ) {
      return true;
    }
  }

  if (text[index] !== ")") {
    return false;
  }
  const openingParenthesisIndex = javascriptMatchingOpen(
    text,
    index,
    "(",
    ")",
  );
  if (openingParenthesisIndex < 0) {
    return false;
  }
  const headerWord = javascriptPreviousWord(
    text,
    openingParenthesisIndex,
  );
  if (/^(?:catch|for|if|switch|while|with)$/u.test(headerWord.word)) {
    return true;
  }
  const declarationWord = javascriptPreviousWord(text, headerWord.start);
  return (
    declarationWord.word === "function" &&
    javascriptDeclarationContext(text, declarationWord.start)
  );
}

function javascriptRegexCanStart(
  text,
  slashIndex,
  regexClosingIndexes,
) {
  let index = slashIndex - 1;
  while (index >= 0 && /\s/u.test(text[index])) {
    index -= 1;
  }
  if (index < 0) {
    return true;
  }
  if (/[[({,:;=!?&|*%^~<>]/u.test(text[index])) {
    return true;
  }
  if (text[index] === "+" || text[index] === "-") {
    return text[index - 1] !== text[index];
  }
  if (text[index] === "/") {
    return !regexClosingIndexes.has(index);
  }
  if (text[index] === "}") {
    return javascriptClosesStatementBlock(text, index);
  }
  if (text[index] === ")") {
    let depth = 0;
    for (let cursor = index; cursor >= 0; cursor -= 1) {
      if (text[cursor] === ")") {
        depth += 1;
      } else if (text[cursor] === "(") {
        depth -= 1;
        if (depth === 0) {
          cursor -= 1;
          while (cursor >= 0 && /\s/u.test(text[cursor])) {
            cursor -= 1;
          }
          const wordEnd = cursor + 1;
          while (cursor >= 0 && /[a-z]/iu.test(text[cursor])) {
            cursor -= 1;
          }
          return /^(?:catch|for|if|switch|while|with)$/u.test(
            text.slice(cursor + 1, wordEnd).join(""),
          );
        }
      }
    }
    return false;
  }
  if (!/[a-z0-9_$]/iu.test(text[index])) {
    return false;
  }
  const wordEnd = index + 1;
  while (index >= 0 && /[a-z0-9_$]/iu.test(text[index])) {
    index -= 1;
  }
  return /^(?:await|case|delete|do|else|in|instanceof|of|return|throw|typeof|void|yield)$/u.test(
    text.slice(index + 1, wordEnd).join(""),
  );
}

function javascriptQuotedLiteralEnd(text, startIndex, delimiter) {
  for (let index = startIndex + 1; index < text.length; index += 1) {
    if (text[index] === "\\") {
      index += 1;
      continue;
    }
    if (text[index] === delimiter) {
      return index;
    }
    if (text[index] === "\r" || text[index] === "\n") {
      return -1;
    }
  }
  return -1;
}

function javascriptTemplateLiteral(text, startIndex) {
  let interpolated = false;
  for (let index = startIndex + 1; index < text.length; index += 1) {
    if (text[index] === "\\") {
      index += 1;
      continue;
    }
    if (text.startsWith("${", index)) {
      interpolated = true;
      index += 1;
      continue;
    }
    if (text[index] === "`") {
      return Object.freeze({ end: index, interpolated });
    }
  }
  return Object.freeze({ end: -1, interpolated });
}

function javascriptLiteralIsExecutableKey(text, literalEnd) {
  let index = skipJavascriptTrivia(text, literalEnd + 1, text.length);
  if (text[index] === ":" || text[index] === "(") {
    return true;
  }
  if (text[index] !== "]") {
    return false;
  }
  index = skipJavascriptTrivia(text, index + 1, text.length);
  return /^(?:\(|:|(?:&&|\|\||\?\?|>>>|>>|<<|\*\*|[+\-*/%&|^])?=)/u.test(
    text.slice(index),
  );
}

function javascriptStaticComputedKeyIsSensitive(text, bracketStart) {
  let index = skipJavascriptTrivia(text, bracketStart + 1, text.length);
  let parentheses = 0;
  let combined = "";
  let literalCount = 0;
  let expectingLiteral = true;

  while (index < text.length) {
    while (text[index] === "(") {
      parentheses += 1;
      index = skipJavascriptTrivia(text, index + 1, text.length);
    }
    if (!expectingLiteral) {
      return false;
    }

    const delimiter = text[index];
    let end = -1;
    if (delimiter === "'" || delimiter === '"') {
      end = javascriptQuotedLiteralEnd(text, index, delimiter);
    } else if (delimiter === "`") {
      const templateResult = javascriptTemplateLiteral(text, index);
      if (templateResult.interpolated) {
        return false;
      }
      end = templateResult.end;
    }
    if (end < 0) {
      return false;
    }

    combined += decodeCredentialScanEscapes(text.slice(index + 1, end))
      .replace(/\\([^0-9xuU\r\n])/gu, "$1");
    literalCount += 1;
    index = skipJavascriptTrivia(text, end + 1, text.length);

    while (parentheses > 0 && text[index] === ")") {
      parentheses -= 1;
      index = skipJavascriptTrivia(text, index + 1, text.length);
    }
    if (text[index] === "+") {
      expectingLiteral = true;
      index = skipJavascriptTrivia(text, index + 1, text.length);
      continue;
    }
    if (text[index] !== "]" || parentheses !== 0) {
      return false;
    }

    index = skipJavascriptTrivia(text, index + 1, text.length);
    if (
      !/^(?:\(|:|(?:&&|\|\||\?\?|>>>|>>|<<|\*\*|[+\-*/%&|^])?=)/u.test(
        text.slice(index),
      )
    ) {
      return false;
    }
    const normalized = combined.replace(/[^a-z0-9_-]+/giu, "_");
    return (
      literalCount > 0 &&
      containsCredentialAssignmentSyntaxInView(normalized + "=")
    );
  }
  return false;
}

function sanitizeJavascriptExecutableSyntax(text) {
  const sanitized = text.split("");
  const regexClosingIndexes = new Set();
  let mode = "code";
  let regexCharacterClass = false;
  let unsafe = false;

  const blank = (index) => {
    if (sanitized[index] !== "\r" && sanitized[index] !== "\n") {
      sanitized[index] = " ";
    }
  };

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (mode === "line-comment") {
      if (character === "\r" || character === "\n") {
        mode = "code";
      } else {
        blank(index);
      }
      continue;
    }
    if (mode === "block-comment") {
      blank(index);
      if (text.startsWith("*/", index)) {
        blank(index + 1);
        index += 1;
        mode = "code";
      }
      continue;
    }
    if (mode === "regex") {
      if (character === "\\") {
        blank(index);
        if (index + 1 < text.length) {
          index += 1;
          blank(index);
        }
      } else if (character === "[") {
        blank(index);
        regexCharacterClass = true;
      } else if (character === "]") {
        blank(index);
        regexCharacterClass = false;
      } else if (character === "/" && !regexCharacterClass) {
        regexClosingIndexes.add(index);
        while (/[a-z]/iu.test(text[index + 1] ?? "")) {
          index += 1;
        }
        mode = "code";
      } else {
        blank(index);
      }
      continue;
    }

    if (text.startsWith("//", index)) {
      blank(index);
      blank(index + 1);
      index += 1;
      mode = "line-comment";
    } else if (text.startsWith("/*", index)) {
      blank(index);
      blank(index + 1);
      index += 1;
      mode = "block-comment";
    } else if (
      character === "[" &&
      javascriptStaticComputedKeyIsSensitive(text, index)
    ) {
      unsafe = true;
    } else if (character === "'" || character === '"') {
      const literalEnd = javascriptQuotedLiteralEnd(text, index, character);
      if (literalEnd < 0) {
        unsafe = true;
        break;
      }
      if (!javascriptLiteralIsExecutableKey(text, literalEnd)) {
        for (
          let cursor = index + 1;
          cursor < literalEnd;
          cursor += 1
        ) {
          blank(cursor);
        }
      }
      index = literalEnd;
    } else if (character === "`") {
      const templateResult = javascriptTemplateLiteral(text, index);
      if (templateResult.end < 0 || templateResult.interpolated) {
        unsafe = true;
      }
      if (templateResult.end < 0) {
        break;
      }
      if (!javascriptLiteralIsExecutableKey(text, templateResult.end)) {
        for (
          let cursor = index + 1;
          cursor < templateResult.end;
          cursor += 1
        ) {
          blank(cursor);
        }
      }
      index = templateResult.end;
    } else if (
      character === "/" &&
      text[index + 1] !== "=" &&
      javascriptRegexCanStart(sanitized, index, regexClosingIndexes)
    ) {
      regexCharacterClass = false;
      mode = "regex";
    }
  }

  if (mode !== "code" && mode !== "line-comment") {
    unsafe = true;
  }
  return Object.freeze({ text: sanitized.join(""), unsafe });
}

function containsCredentialAssignmentSyntax(text) {
  const { text: stripped, unsafe } =
    sanitizeJavascriptExecutableSyntax(text);
  if (unsafe) {
    return true;
  }
  const decoded = decodeCredentialScanEscapes(stripped);
  const views = new Set([
    stripped,
    decoded,
    normalizeCredentialKeySyntax(stripped),
    normalizeCredentialKeySyntax(decoded),
  ]);
  for (const view of views) {
    if (
      containsCredentialAssignmentSyntaxInView(view) ||
      containsCredentialMethodSyntaxInView(view)
    ) {
      return true;
    }
  }
  return false;
}

function containsCredentialAssignment(text) {
  const decoded = decodeCredentialScanEscapes(text);
  const uncommented = stripJavascriptComments(text);
  const decodedUncommented = stripJavascriptComments(decoded);
  const views = new Set([
    text,
    decoded,
    uncommented,
    decodedUncommented,
    normalizeCredentialKeySyntax(text),
    normalizeCredentialKeySyntax(decoded),
    normalizeCredentialKeySyntax(uncommented),
    normalizeCredentialKeySyntax(decodedUncommented),
  ]);
  for (const view of views) {
    if (containsCredentialAssignmentInView(view)) {
      return true;
    }
  }
  return false;
}

const CREDENTIAL_SYNTAX_POSITIVE_PROBES = Object.freeze([
  {
    label: "direct declaration",
    sample: 'function probe() { const hiddenPassword = "synthetic"; }',
  },
  {
    label: "quoted object key",
    sample:
      'function probe() { return { "hiddenPassword": "synthetic" }; }',
  },
  {
    label: "quoted bracket key",
    sample:
      'function probe() { target["hiddenPassword"] = "synthetic"; }',
  },
  {
    label: "quoted class key",
    sample:
      'function probe() { class C { ["hiddenPassword"] = "synthetic" } }',
  },
  {
    label: "bare object method",
    sample:
      'function probe() { return { hiddenPassword() { return "synthetic"; } }; }',
  },
  {
    label: "quoted object method",
    sample:
      'function probe() { return { "hiddenPassword"() { return "synthetic"; } }; }',
  },
  {
    label: "object getter",
    sample:
      'function probe() { return { get hiddenPassword() { return "synthetic"; } }; }',
  },
  {
    label: "concatenated static class method",
    sample:
      'function probe() { class C { ["hiddenPass" + "word"]() {} } }',
  },
  {
    label: "escaped bracket key",
    sample:
      'function probe() { target["hiddenP\\u0061ssword"] = "synthetic"; }',
  },
  {
    label: "concatenated static bracket key",
    sample:
      'function probe() { target["hiddenPass" + "word"] = "synthetic"; }',
  },
  {
    label: "postfix division assignment",
    sample:
      "function probe(x, value) { " +
      "return x++ / (hiddenPassword = value) / 2; }",
  },
  {
    label: "string division assignment",
    sample:
      'function probe(value) { return "x" / ' +
      '(hiddenPassword = value) / 2; }',
  },
  {
    label: "regex division assignment",
    sample:
      "function probe(value) { return /x/ / " +
      "(hiddenPassword = value) / 2; }",
  },
  {
    label: "concise arrow assignment",
    sample:
      "function probe(value) { " +
      "return (() => hiddenPassword = value)(); }",
  },
  {
    label: "interpolated executable template",
    sample:
      'function probe(value) { return `${hiddenPassword = value}`; }',
  },
]);

const CREDENTIAL_SYNTAX_NEGATIVE_PROBES = Object.freeze([
  {
    label: "credential-shaped sample string",
    sample:
      'function probe() { return { sample: "password=hunter2" }; }',
  },
  {
    label: "credential-shaped regular expression",
    sample:
      "function probe() { " +
      "const pattern = /hiddenPassword\\s*=/u; return pattern; }",
  },
  {
    label: "regular-expression statement after control header",
    sample:
      "function probe(ok, text) { " +
      "if (ok) /password=value/u.test(text); }",
  },
  {
    label: "regular expression after addition",
    sample:
      "function probe(text) { " +
      "return 1 + /password=value/u.test(text); }",
  },
  {
    label: "regular expression after multiplication",
    sample:
      "function probe(text) { " +
      "return 1 * /password=value/u.test(text); }",
  },
  {
    label: "ordinary division",
    sample: "function probe(x, y) { return x / y; }",
  },
  {
    label: "regular expression as division operand",
    sample:
      "function probe(x, text) { " +
      "return x / /password=value/u.test(text); }",
  },
  {
    label: "regular expression after postfix division",
    sample:
      "function probe(x, text) { " +
      "return x++ / /password=value/u.test(text); }",
  },
  {
    label: "regular expression after conditional block",
    sample:
      "function probe(ok, text) { " +
      "if (ok) {} /password=value/u.test(text); }",
  },
  {
    label: "regular expression after bare block",
    sample:
      "function probe(text) { " +
      "{} /password=value/u.test(text); }",
  },
  {
    label: "regular expression after try-catch",
    sample:
      "function probe(text) { " +
      "try {} catch {} /password=value/u.test(text); }",
  },
  {
    label: "regular expression after function declaration",
    sample:
      "function probe(text) { function inner() {} " +
      "/password=value/u.test(text); }",
  },
  {
    label: "ordinary quoted object key",
    sample:
      'function probe() { return { "ordinaryField": "password=hunter2" }; }',
  },
  {
    label: "credential-shaped comment and return value",
    sample:
      "function probe() { /* hiddenPassword = value */ " +
      'return "hiddenPassword=value"; }',
  },
]);

function credentialSyntaxRegressionFailures() {
  const failures = [];
  for (const probe of CREDENTIAL_SYNTAX_POSITIVE_PROBES) {
    if (!containsCredentialAssignmentSyntax(probe.sample)) {
      failures.push("positive probe missed: " + probe.label);
    }
  }
  for (const probe of CREDENTIAL_SYNTAX_NEGATIVE_PROBES) {
    if (containsCredentialAssignmentSyntax(probe.sample)) {
      failures.push("negative probe blocked: " + probe.label);
    }
  }
  return failures;
}

return Object.freeze({
  containsCredentialAssignment,
  containsCredentialAssignmentSyntax,
  credentialSyntaxRegressionFailures,
});
}

const credentialScanner = createCredentialScanner();
const {
  containsCredentialAssignment,
  containsCredentialAssignmentSyntax,
  credentialSyntaxRegressionFailures,
} = credentialScanner;

const {
  PRIVACY_SIGNATURES,
  PRIVACY_SIGNATURE_PROBES,
  PRIVACY_SIGNATURE_NEGATIVE_PROBES,
} = createPrivacyDefinitions(containsCredentialAssignment);

function matchesPrivacySignature(signature, text) {
  return signature.pattern
    ? signature.pattern.test(text)
    : signature.test(text);
}

function checkPrivacy(relativePath, text) {
  for (const signature of PRIVACY_SIGNATURES) {
    if (matchesPrivacySignature(signature, text)) {
      errors.push(
        `${relativePath}: privacy signature found (${signature.label})`,
      );
    }
  }
}

function checkCurrentClaims(relativePath, text) {
  for (const claim of FORBIDDEN_CURRENT_CLAIMS) {
    if (claim.pattern.test(text)) {
      errors.push(`${relativePath}: forbidden claim found (${claim.label})`);
    }
  }
}

const mode = parseMode(process.argv.slice(2));
const errors = [];
const notes = [];
const selfScanBoundaryFunctions = [
  [createPrivacyDefinitions, "createPrivacyDefinitions"],
  [createCredentialScanner, "createCredentialScanner"],
];
for (const [candidate, expectedName] of selfScanBoundaryFunctions) {
  const source = Function.prototype.toString.call(candidate);
  const canonical = uniqueRuntimeFunctionRange(source, candidate, expectedName);
  if (!canonical || canonical.start !== 0 || canonical.end !== source.length) {
    errors.push(
      `self-scan boundary identity is not canonical: ${expectedName}`,
    );
  }
  const expectedFactorySha =
    EXPECTED_SELF_SCAN_FACTORY_SHA256[expectedName];
  const actualFactorySha = sha256(Buffer.from(source, "utf8"));
  if (
    !/^[0-9a-f]{64}$/u.test(expectedFactorySha ?? "") ||
    actualFactorySha !== expectedFactorySha
  ) {
    errors.push(
      `self-scan factory source pin mismatch: ${expectedName}`,
    );
  } else {
    const tamperedSourceSha = sha256(
      Buffer.from(source + "\n", "utf8"),
    );
    if (tamperedSourceSha === expectedFactorySha) {
      errors.push(
        `self-scan factory tamper-only probe is accepted: ${expectedName}`,
      );
    }
    const tamperedPin =
      (expectedFactorySha[0] === "0" ? "1" : "0") +
      expectedFactorySha.slice(1);
    if (actualFactorySha === tamperedPin) {
      errors.push(
        `self-scan factory pin-only probe is accepted: ${expectedName}`,
      );
    }
  }
  if (containsCredentialAssignmentSyntax(source)) {
    errors.push(
      `self-scan excluded factory contains credential assignment syntax: ` +
        `${expectedName}`,
    );
  }
  const inlineLookalike = `/* function ${expectedName} */\n${source}`;
  const inlineRange = uniqueRuntimeFunctionRange(
    inlineLookalike,
    candidate,
    expectedName,
  );
  if (!inlineRange || inlineRange.end !== inlineLookalike.length) {
    errors.push(`self-scan inline lookalike is not ignored: ${expectedName}`);
  }
  if (
    uniqueRuntimeFunctionRange(`${source}\n${source}`, candidate, expectedName)
  ) {
    errors.push(
      `self-scan duplicate boundary is not rejected: ${expectedName}`,
    );
  }
  const fullSourceLookalike = `/*\n${source}\n*/\n${source}`;
  if (
    uniqueRuntimeFunctionRange(fullSourceLookalike, candidate, expectedName)
  ) {
    errors.push(
      `self-scan full-source lookalike is not rejected: ${expectedName}`,
    );
  }
  if (uniqueRuntimeFunctionRange("missing", candidate, expectedName)) {
    errors.push(`self-scan missing boundary is not rejected: ${expectedName}`);
  }
}
for (const failure of credentialSyntaxRegressionFailures()) {
  errors.push(`self-scan factory credential-syntax regression: ${failure}`);
}
for (const probe of PRIVACY_SIGNATURE_PROBES) {
  if (
    !PRIVACY_SIGNATURES.some((signature) =>
      matchesPrivacySignature(signature, probe.sample),
    )
  ) {
    errors.push(`privacy regression probe is uncovered: ${probe.label}`);
  }
}
for (const probe of PRIVACY_SIGNATURE_NEGATIVE_PROBES) {
  if (
    PRIVACY_SIGNATURES.some((signature) =>
      matchesPrivacySignature(signature, probe.sample),
    )
  ) {
    errors.push(`privacy safe-reference probe is blocked: ${probe.label}`);
  }
}
const REPO_ROOT = execFileSync("git", ["rev-parse", "--show-toplevel"], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
}).trim();

const packagePaths = REQUIRED_PAYLOAD.map((file) => `${DATE_ROOT}/${file}`);
const allPublicPaths = [...packagePaths, MANIFEST_PATH, INDEX_PATH];
const packageTexts = new Map();
const expectedDatedEntries = new Set([
  ...REQUIRED_PAYLOAD,
  "HANDOVER_MANIFEST.md",
]);

let actualDatedEntries = [];
try {
  actualDatedEntries = readdirSync(repoPath(DATE_ROOT), {
    withFileTypes: true,
  });
} catch (error) {
  errors.push(`${DATE_ROOT}: unable to enumerate package directory: ${error}`);
}
for (const entry of actualDatedEntries) {
  if (!entry.isFile()) {
    errors.push(`${DATE_ROOT}: unexpected non-file entry ${entry.name}`);
  } else if (!expectedDatedEntries.has(entry.name)) {
    errors.push(`${DATE_ROOT}: unexpected unsealed file ${entry.name}`);
  }
}
for (const expectedEntry of expectedDatedEntries) {
  if (!actualDatedEntries.some((entry) => entry.name === expectedEntry)) {
    errors.push(`${DATE_ROOT}: missing sealed file ${expectedEntry}`);
  }
}

for (const relativePath of allPublicPaths) {
  const bytes = readRequired(relativePath);
  const text = bytes.toString("utf8");
  packageTexts.set(relativePath, text);
  lineCount(bytes, relativePath);
  checkPrivacy(relativePath, text);
  checkCurrentClaims(relativePath, text);
  if (relativePath.endsWith(".md")) {
    checkMarkdownLinks(relativePath, text);
  }
}

const manifestBytes = readRequired(MANIFEST_PATH);
const manifestText = manifestBytes.toString("utf8");
const manifestRows = parseManifest(manifestText);
const requiredSet = new Set(REQUIRED_PAYLOAD);

for (const file of REQUIRED_PAYLOAD) {
  const row = manifestRows.get(file);
  if (!row) {
    errors.push(`${MANIFEST_PATH}: missing payload row for ${file}`);
    continue;
  }
  const bytes = readRequired(`${DATE_ROOT}/${file}`);
  const actualLines = lineCount(bytes, `${DATE_ROOT}/${file}`);
  const actualSha = sha256(bytes);
  if (row.lines !== actualLines) {
    errors.push(
      `${MANIFEST_PATH}: ${file} line count ${row.lines} != ${actualLines}`,
    );
  }
  if (row.sha !== actualSha) {
    errors.push(`${MANIFEST_PATH}: ${file} SHA-256 ${row.sha} != ${actualSha}`);
  }
}

for (const file of manifestRows.keys()) {
  if (!requiredSet.has(file)) {
    errors.push(`${MANIFEST_PATH}: unexpected payload row ${file}`);
  }
}

if (manifestRows.size !== REQUIRED_PAYLOAD.length) {
  errors.push(
    `${MANIFEST_PATH}: payload row count ${manifestRows.size} != ` +
      `${REQUIRED_PAYLOAD.length}`,
  );
}

const joinedPackageText = packagePaths
  .map((relativePath) => packageTexts.get(relativePath) ?? "")
  .join("\n");
for (const semantic of REQUIRED_SEMANTICS) {
  for (const pattern of semantic.patterns) {
    if (!pattern.test(joinedPackageText)) {
      errors.push(
        `${DATE_ROOT}: missing required semantic (${semantic.label}; ${pattern})`,
      );
    }
  }
}

const manifestSha = sha256(manifestBytes);
const indexText = packageTexts.get(INDEX_PATH) ?? "";
checkIndexBindings(indexText, manifestSha);

if (mode === "publication") {
  let currentBranch;
  try {
    currentBranch = run("git", ["branch", "--show-current"]);
  } catch (error) {
    errors.push(`publication: branch lookup failed: ${error}`);
  }
  if (!currentBranch || currentBranch !== PUBLICATION_BRANCH) {
    errors.push(
      `publication: branch ${currentBranch} is not ${PUBLICATION_BRANCH}`,
    );
  }

  let originUrls = [];
  try {
    originUrls = run("git", ["remote", "get-url", "--all", "origin"])
      .split("\n")
      .filter(Boolean);
  } catch (error) {
    errors.push(`publication: origin lookup failed: ${error}`);
  }
  if (originUrls.length === 0) {
    errors.push(`publication: origin has no fetch URL`);
  }
  for (const originUrl of originUrls) {
    if (!PUBLIC_REPOSITORY_URL_PATTERN.test(originUrl)) {
      errors.push(
        `publication: origin ${originUrl} is not ${PUBLIC_REPOSITORY}`,
      );
    }
  }

  let originPushUrls = [];
  try {
    originPushUrls = run("git", [
      "remote",
      "get-url",
      "--push",
      "--all",
      "origin",
    ])
      .split("\n")
      .filter(Boolean);
  } catch (error) {
    errors.push(`publication: origin push lookup failed: ${error}`);
  }
  if (originPushUrls.length === 0) {
    errors.push(`publication: origin has no push URL`);
  }
  for (const originPushUrl of originPushUrls) {
    if (!PUBLIC_REPOSITORY_URL_PATTERN.test(originPushUrl)) {
      errors.push(
        `publication: origin push ${originPushUrl} is not ${PUBLIC_REPOSITORY}`,
      );
    }
  }

  let visibility;
  try {
    visibility = JSON.parse(
      run("gh", [
        "repo",
        "view",
        PUBLIC_REPOSITORY,
        "--json",
        "visibility,nameWithOwner",
      ]),
    );
  } catch (error) {
    errors.push(`publication: repository visibility check failed: ${error}`);
  }
  if (visibility) {
    notes.push(
      `repository=${visibility.nameWithOwner} visibility=${visibility.visibility}`,
    );
    if (
      visibility.nameWithOwner !== PUBLIC_REPOSITORY ||
      visibility.visibility !== "PUBLIC"
    ) {
      errors.push(
        "publication: expected public repository " +
          `${PUBLIC_REPOSITORY}, received ` +
          `${visibility.nameWithOwner} visibility=${visibility.visibility}`,
      );
    }
  }

  const verifierBytes = readRequired(VERIFIER_PATH);
  const verifierSha = sha256(verifierBytes);
  const indexSha = sha256(readRequired(INDEX_PATH));
  const verifierText = verifierBytes.toString("utf8");
  const privacyDefinitionBoundary = uniqueRuntimeFunctionRange(
    verifierText,
    createPrivacyDefinitions,
    "createPrivacyDefinitions",
  );
  const credentialScannerBoundary = uniqueRuntimeFunctionRange(
    verifierText,
    createCredentialScanner,
    "createCredentialScanner",
  );
  const privacyDefinitionStart = privacyDefinitionBoundary?.start ?? -1;
  const privacyDefinitionEnd = privacyDefinitionBoundary?.end ?? -1;
  const credentialScannerStart = credentialScannerBoundary?.start ?? -1;
  const credentialScannerEnd = credentialScannerBoundary?.end ?? -1;
  if (
    privacyDefinitionStart < 0 ||
    privacyDefinitionEnd <= privacyDefinitionStart ||
    credentialScannerStart <= privacyDefinitionEnd ||
    credentialScannerEnd <= credentialScannerStart
  ) {
    errors.push(
      `${VERIFIER_PATH}: cannot isolate privacy definitions and scanner`,
    );
  } else {
    const verifierOperationalText =
      verifierText.slice(0, privacyDefinitionStart) +
      verifierText.slice(privacyDefinitionEnd, credentialScannerStart) +
      verifierText.slice(credentialScannerEnd);
    checkPrivacy(VERIFIER_PATH, verifierOperationalText);
  }

  const publicationPaths = [...allPublicPaths, VERIFIER_PATH, RUNNING_LOG_PATH];
  const allowed = new Set(publicationPaths);
  for (const relativePath of publicationPaths) {
    let indexBlob;
    try {
      indexBlob = run("git", ["rev-parse", `:${relativePath}`]);
    } catch {
      errors.push(
        `publication: ${relativePath} is not tracked or staged in the index`,
      );
      continue;
    }
    const worktreeBlob = run("git", ["hash-object", relativePath]);
    if (indexBlob !== worktreeBlob) {
      errors.push(`publication: index/worktree byte drift for ${relativePath}`);
    }
  }

  let appendedLogText = "";
  try {
    const headLogBytes = execFileSync(
      "git",
      ["show", `HEAD:${RUNNING_LOG_PATH}`],
      {
        cwd: REPO_ROOT,
        maxBuffer: MAX_GIT_BLOB_BYTES,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    const stagedLogBytes = execFileSync(
      "git",
      ["show", `:${RUNNING_LOG_PATH}`],
      {
        cwd: REPO_ROOT,
        maxBuffer: MAX_GIT_BLOB_BYTES,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    if (
      stagedLogBytes.length <= headLogBytes.length ||
      !stagedLogBytes.subarray(0, headLogBytes.length).equals(headLogBytes)
    ) {
      errors.push(
        `publication: ${RUNNING_LOG_PATH} is not a strict append of HEAD`,
      );
    } else {
      appendedLogText = stagedLogBytes
        .subarray(headLogBytes.length)
        .toString("utf8");
    }
  } catch (error) {
    errors.push(
      `publication: append-only ${RUNNING_LOG_PATH} check failed: ${error}`,
    );
  }

  checkPrivacy(`${RUNNING_LOG_PATH} appended suffix`, appendedLogText);
  checkCurrentClaims(`${RUNNING_LOG_PATH} appended suffix`, appendedLogText);

  const latestLogEntry = latestRunningLogEntry(appendedLogText);
  const logBlockStart = "handover_final_review_schema=v1";
  const logBlockEnd = "handover_final_review_end=v1";
  const logAllowedKeys = new Set([
    "handover_final_review_schema",
    "stable_index",
    "manifest_sha256",
    "index_sha256",
    "verifier_sha256",
    "review_scope",
    "review_artifact_id",
    "review_artifact_path",
    "review_report_sha256",
    "authority_basis",
    "authority_repository",
    "authority_branch",
    "authority_scope",
    "authority_actions",
    "authority_exclusions",
    "verdict",
    "p0",
    "p1",
    "handover_final_review_end",
  ]);
  const logFields = parseUniqueKeyValueBlock(appendedLogText, {
    label: `${RUNNING_LOG_PATH} appended final-review block`,
    startLine: logBlockStart,
    endLine: logBlockEnd,
    allowedKeys: logAllowedKeys,
  });
  requireExactFields(
    logFields,
    new Map([
      ["handover_final_review_schema", "v1"],
      ["stable_index", INDEX_PATH],
      ["manifest_sha256", manifestSha],
      ["index_sha256", indexSha],
      ["verifier_sha256", verifierSha],
      ["review_scope", "SANITIZED_HANDOVER_PUBLICATION_ONLY"],
      ["authority_basis", "GOVERNING_GOAL_PLUS_CURRENT_USER_REQUEST"],
      ["authority_repository", PUBLIC_REPOSITORY],
      ["authority_branch", PUBLICATION_BRANCH],
      ["authority_scope", "SANITIZED_HANDOVER_GROUP_E_ONLY"],
      [
        "authority_actions",
        "STAGE_FOR_VERIFICATION_THEN_COMMIT_PUSH_PR_UPDATE_AFTER_PASS",
      ],
      [
        "authority_exclusions",
        "FEATURE_CODE_MERGE_DEPLOY_RELEASE_WIKI_LAB_PRODUCTION",
      ],
      ["verdict", "GO"],
      ["p0", "0"],
      ["p1", "0"],
      ["handover_final_review_end", "v1"],
    ]),
    `${RUNNING_LOG_PATH} appended final-review block`,
  );
  if (
    !latestLogEntry.includes(logBlockStart) ||
    !latestLogEntry.includes(logBlockEnd)
  ) {
    errors.push(
      `${RUNNING_LOG_PATH}: exact final-review block is not in the latest entry`,
    );
  }

  const reviewArtifactId = logFields.get("review_artifact_id");
  const reviewArtifactPath = logFields.get("review_artifact_path");
  const reviewReportExpectedSha = logFields.get("review_report_sha256");
  if (!reviewArtifactId || !/^[A-Z0-9][A-Z0-9_-]+$/u.test(reviewArtifactId)) {
    errors.push(`${RUNNING_LOG_PATH}: invalid review_artifact_id`);
  }
  if (
    !reviewArtifactPath ||
    !/^ReviewReport\/[A-Z0-9][A-Z0-9_-]+\.md$/u.test(reviewArtifactPath)
  ) {
    errors.push(`${RUNNING_LOG_PATH}: invalid review_artifact_path`);
  }
  if (
    reviewArtifactId &&
    reviewArtifactPath &&
    basename(reviewArtifactPath, ".md") !== reviewArtifactId
  ) {
    errors.push(
      `${RUNNING_LOG_PATH}: review artifact ID does not match report path`,
    );
  }
  if (reviewArtifactPath) {
    try {
      run("git", ["ls-files", "--error-unmatch", "--", reviewArtifactPath]);
      errors.push(
        `${RUNNING_LOG_PATH}: local review artifact is tracked or staged`,
      );
    } catch {
      // Expected: the privacy-sensitive raw review remains local-only.
    }
  }
  if (
    !reviewReportExpectedSha ||
    !/^[0-9a-f]{64}$/u.test(reviewReportExpectedSha)
  ) {
    errors.push(`${RUNNING_LOG_PATH}: invalid review_report_sha256`);
  }

  if (reviewArtifactPath && reviewReportExpectedSha) {
    const reviewReportBytes = readRequired(reviewArtifactPath);
    const reviewReportSha = sha256(reviewReportBytes);
    if (reviewReportSha !== reviewReportExpectedSha) {
      errors.push(
        `${RUNNING_LOG_PATH}: final-review report SHA-256 ` +
          `${reviewReportExpectedSha} != ${reviewReportSha}`,
      );
    }

    const reportBlockStart = "handover_exact_review_schema=v1";
    const reportBlockEnd = "handover_exact_review_end=v1";
    const reportFields = parseUniqueKeyValueBlock(
      reviewReportBytes.toString("utf8"),
      {
        label: reviewArtifactPath,
        startLine: reportBlockStart,
        endLine: reportBlockEnd,
        allowedKeys: new Set([
          "handover_exact_review_schema",
          "scope",
          "manifest_sha256",
          "index_sha256",
          "verifier_sha256",
          "verdict",
          "p0",
          "p1",
          "handover_exact_review_end",
        ]),
      },
    );
    requireExactFields(
      reportFields,
      new Map([
        ["handover_exact_review_schema", "v1"],
        ["scope", "SANITIZED_HANDOVER_PUBLICATION_ONLY"],
        ["manifest_sha256", manifestSha],
        ["index_sha256", indexSha],
        ["verifier_sha256", verifierSha],
        ["verdict", "GO"],
        ["p0", "0"],
        ["p1", "0"],
        ["handover_exact_review_end", "v1"],
      ]),
      reviewArtifactPath,
    );
  }

  const staged = run("git", ["diff", "--cached", "--name-only", "--no-renames"])
    .split("\n")
    .filter(Boolean);
  for (const relativePath of staged) {
    if (!allowed.has(relativePath)) {
      errors.push(
        `publication: unexpected staged path outside exact allowlist: ${relativePath}`,
      );
    }
  }
  for (const relativePath of publicationPaths) {
    if (!staged.includes(relativePath)) {
      errors.push(
        `publication: required path absent from exact staged set: ${relativePath}`,
      );
    }
  }

  try {
    run("git", ["diff", "--cached", "--check"]);
  } catch (error) {
    errors.push(`publication: staged diff check failed: ${error}`);
  }
}

if (errors.length > 0) {
  process.stderr.write(
    `Handover verification FAILED (${mode}): ${errors.length} issue(s)\n`,
  );
  for (const error of errors) {
    process.stderr.write(`- ${error}\n`);
  }
  process.exitCode = 1;
} else {
  process.stdout.write(
    `Handover verification PASS (${mode})\n` +
      `payload_files=${REQUIRED_PAYLOAD.length}\n` +
      `manifest_sha256=${manifestSha}\n`,
  );
  for (const note of notes) {
    process.stdout.write(`${note}\n`);
  }
}
