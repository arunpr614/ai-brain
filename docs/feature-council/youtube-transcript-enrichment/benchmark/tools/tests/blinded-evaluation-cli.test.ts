import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  BlindedPacketOperatorError,
  generateSealedBlindedPacketPackage,
  type GenerateSealedBlindedPacketPackageOptions,
} from "../blinded-packet-operator";

const PROJECT_ROOT = realpathSync(fileURLToPath(new URL("../../../../../../", import.meta.url)));
const CLI_PATH = fileURLToPath(new URL("../blinded-evaluation-cli.ts", import.meta.url));

const VALID_CONSENT = {
  state: "affirmative",
  attestation_id: "CONSENT-DEV-PRECLAIM-001",
  recorded_at: "2026-07-18T13:00:00Z",
  withdrawn: false,
  bounded_excerpt_transfer_authorized: true,
} as const;

function noPackageSideEffects(base: string): void {
  const projectRoot = path.join(base, "project");
  const privateEvidenceRoot = path.join(base, "private-evidence");
  for (const [label, candidate] of [
    ["project root", projectRoot],
    ["public package claim/terminal authority root", path.join(
      projectRoot,
      "docs/feature-council/youtube-transcript-enrichment/decisions/gate4-evaluation-attempt-claims",
    )],
    ["private packet/role child output root", path.join(privateEvidenceRoot, "outputs")],
    ["private evidence root", privateEvidenceRoot],
    ["Gate 4 source-output root", path.join(base, "gate4-private")],
    ["runtime root", path.join(base, "runtime")],
    ["model file", path.join(base, "model.gguf")],
  ] as const) {
    assert.equal(existsSync(candidate), false, `${label} must remain absent`);
  }
}

test("package CLI rejects missing, malformed, duplicate, non-UTF-8, future, and withdrawn consent before side effects", (t) => {
  const base = mkdtempSync(path.join(tmpdir(), "gate4-consent-cli-"));
  t.after(() => rmSync(base, { recursive: true, force: true }));

  const missingId = { ...VALID_CONSENT } as Record<string, unknown>;
  delete missingId.attestation_id;
  const cases: Array<{
    name: string;
    bytes: Buffer | string | null;
  }> = [
    { name: "missing-file", bytes: null },
    { name: "invalid-json", bytes: "{\"state\":" },
    { name: "missing-key", bytes: `${JSON.stringify(missingId)}\n` },
    {
      name: "invalid-id",
      bytes: `${JSON.stringify({ ...VALID_CONSENT, attestation_id: "CONSENT-short" })}\n`,
    },
    {
      name: "extra-key",
      bytes: `${JSON.stringify({ ...VALID_CONSENT, extra: "forbidden" })}\n`,
    },
    {
      name: "duplicate-key",
      bytes: `{"state":"affirmative","attestation_id":"${VALID_CONSENT.attestation_id}","attestation_id":"CONSENT-DUPLICATE-KEY-002","recorded_at":"${VALID_CONSENT.recorded_at}","withdrawn":false,"bounded_excerpt_transfer_authorized":true}\n`,
    },
    {
      name: "malformed-utf8",
      bytes: Buffer.concat([
        Buffer.from('{"state":"affirmative","attestation_id":"CONSENT-', "utf8"),
        Buffer.from([0xff]),
        Buffer.from('","recorded_at":"2026-07-18T13:00:00Z","withdrawn":false,"bounded_excerpt_transfer_authorized":true}\n', "utf8"),
      ]),
    },
    {
      name: "future",
      bytes: `${JSON.stringify({ ...VALID_CONSENT, recorded_at: "2999-01-01T00:00:00Z" })}\n`,
    },
    {
      name: "withdrawn",
      bytes: `${JSON.stringify({ ...VALID_CONSENT, withdrawn: true })}\n`,
    },
    {
      name: "bounded-transfer-denied",
      bytes: `${JSON.stringify({ ...VALID_CONSENT, bounded_excerpt_transfer_authorized: false })}\n`,
    },
  ];

  for (const fixture of cases) {
    const caseRoot = path.join(base, fixture.name);
    mkdirSync(caseRoot, { mode: 0o700 });
    const consentPath = path.join(caseRoot, "consent.json");
    if (fixture.bytes !== null) writeFileSync(consentPath, fixture.bytes, { mode: 0o600 });
    const result = spawnSync(
      process.execPath,
      [
        "--import", "tsx",
        CLI_PATH,
        "package",
        "--project-root", path.join(caseRoot, "project"),
        "--private-evidence-root", path.join(caseRoot, "private-evidence"),
        "--gate4-private-root", path.join(caseRoot, "gate4-private"),
        "--runtime-dir", path.join(caseRoot, "runtime"),
        "--model", path.join(caseRoot, "model.gguf"),
        "--consent-attestation", consentPath,
      ],
      {
        cwd: PROJECT_ROOT,
        encoding: "utf8",
        env: {
          HOME: caseRoot,
          NODE_ENV: "test",
          PATH: "/usr/bin:/bin",
          TMPDIR: caseRoot,
          TSX_DISABLE_CACHE: "1",
        },
      },
    );
    assert.equal(result.status, 1, `${fixture.name}: ${result.stderr}`);
    assert.equal(result.stdout, "", `${fixture.name} must not emit a success result`);
    const terminalLine = result.stderr.trim().split("\n").at(-1);
    assert.ok(terminalLine, `${fixture.name} must emit one failure record`);
    const report = JSON.parse(terminalLine) as { state: string; code: string };
    assert.deepEqual(report, {
      state: "failed",
      code: "CONSENT_UNAVAILABLE",
      external_provider_calls: 0,
      external_content_transfer: false,
    });
    noPackageSideEffects(caseRoot);
  }
});

test("programmatic package operator rejects invalid consent before inspecting paths or mutating evidence", async (t) => {
  const base = mkdtempSync(path.join(tmpdir(), "gate4-consent-operator-"));
  t.after(() => rmSync(base, { recursive: true, force: true }));
  const options = {
    projectRoot: path.join(base, "project"),
    privateEvidenceRoot: path.join(base, "private-evidence"),
    gate4PrivateRoot: path.join(base, "gate4-private"),
    runtimeDir: path.join(base, "runtime"),
    modelPath: path.join(base, "model.gguf"),
  };
  const invalidValues: unknown[] = [
    undefined,
    {},
    { ...VALID_CONSENT, extra: "forbidden" },
    { ...VALID_CONSENT, recorded_at: "2999-01-01T00:00:00Z" },
    { ...VALID_CONSENT, withdrawn: true },
    { ...VALID_CONSENT, bounded_excerpt_transfer_authorized: false },
  ];

  for (const consent of invalidValues) {
    await assert.rejects(
      generateSealedBlindedPacketPackage({
        ...options,
        consent,
      } as unknown as GenerateSealedBlindedPacketPackageOptions),
      (error: unknown) => (
        error instanceof BlindedPacketOperatorError
        && error.code === "PACKAGE_WRITE_FAILED"
        && /affirmative consent/u.test(error.message)
      ),
    );
    noPackageSideEffects(base);
  }
});
