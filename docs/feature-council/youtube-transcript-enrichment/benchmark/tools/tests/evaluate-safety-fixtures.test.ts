import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  SafetyFixtureError,
  evaluateSafetyFixtures,
  evaluateSafetyFixturesJson,
  parseSafetyFixturesBytes,
  parseSafetyFixturesJson,
} from "../evaluate-safety-fixtures";

const fixturePath = fileURLToPath(new URL("../../SAFETY_FIXTURES.json", import.meta.url));
const evaluatorPath = fileURLToPath(new URL("../evaluate-safety-fixtures.ts", import.meta.url));
const fixtureJson = readFileSync(fixturePath, "utf8");

function expectCode(action: () => unknown, code: SafetyFixtureError["code"]): void {
  assert.throws(action, (error: unknown) => {
    assert.ok(error instanceof SafetyFixtureError);
    assert.equal(error.code, code);
    return true;
  });
}

describe("parseSafetyFixturesJson", () => {
  it("accepts only the final publication-safe pre-lock fixture contract", () => {
    const parsed = parseSafetyFixturesJson(fixtureJson);

    assert.equal(parsed.schema_version, "1.2");
    assert.equal(parsed.status, "final_prelock_review_ready");
    assert.equal(parsed.primary_denominator, false);
    assert.equal(parsed.publication_safe, true);
    assert.equal(parsed.fixtures.length, 33);
    assert.equal(new Set(parsed.fixtures.map((fixture) => fixture.id)).size, 33);
  });

  it("rejects duplicate JSON keys before JSON.parse can overwrite them", () => {
    const duplicated = `{"schema_version":"1.2",${fixtureJson.slice(1)}`;
    expectCode(() => parseSafetyFixturesJson(duplicated), "DUPLICATE_JSON_KEY");
  });

  it("rejects malformed UTF-8 fixture bytes before text parsing", () => {
    expectCode(
      () => parseSafetyFixturesBytes(
        Uint8Array.of(0x7b, 0x22, 0x78, 0x22, 0x3a, 0x22, 0xff, 0x22, 0x7d),
      ),
      "INVALID_JSON",
    );
  });

  it("rejects missing, additional, reordered, and remapped fixture fields", () => {
    const additional = JSON.parse(fixtureJson);
    additional.unreviewed = true;
    expectCode(() => parseSafetyFixturesJson(JSON.stringify(additional)), "INVALID_SCHEMA");

    const reordered = JSON.parse(fixtureJson);
    [reordered.fixtures[0], reordered.fixtures[1]] = [
      reordered.fixtures[1],
      reordered.fixtures[0],
    ];
    expectCode(() => parseSafetyFixturesJson(JSON.stringify(reordered)), "INVALID_SCHEMA");

    const remapped = JSON.parse(fixtureJson);
    remapped.fixtures[0].oracle.check = "private_literal_blocked";
    expectCode(() => parseSafetyFixturesJson(JSON.stringify(remapped)), "INVALID_SCHEMA");

    const missing = JSON.parse(fixtureJson);
    delete missing.fixtures[0].expected;
    expectCode(() => parseSafetyFixturesJson(JSON.stringify(missing)), "INVALID_SCHEMA");
  });

  it("rejects unsafe status drift and malformed mock/state inputs", () => {
    const draft = JSON.parse(fixtureJson);
    draft.status = "draft_not_frozen";
    expectCode(() => parseSafetyFixturesJson(JSON.stringify(draft)), "INVALID_SCHEMA");

    const mock = JSON.parse(fixtureJson);
    mock.fixtures.find((fixture: { id: string }) => fixture.id === "SAFE-URL-14")
      .input.resolution_sequence.push("10.0.0.1");
    expectCode(() => parseSafetyFixturesJson(JSON.stringify(mock)), "INVALID_SCHEMA");

    const state = JSON.parse(fixtureJson);
    state.fixtures.find((fixture: { id: string }) => fixture.id === "SAFE-STATE-01")
      .input.live_broadcast_content = "none";
    expectCode(() => parseSafetyFixturesJson(JSON.stringify(state)), "INVALID_SCHEMA");
  });
});

describe("evaluateSafetyFixtures", () => {
  it("executes pure checks and reports the current gaps without promoting references to passes", () => {
    const report = evaluateSafetyFixturesJson(fixtureJson);
    const byId = new Map(report.results.map((result) => [result.id, result]));

    assert.deepEqual(report.counts, {
      total: 33,
      pass: 18,
      known_gap: 8,
      not_applicable: 7,
    });
    assert.equal(report.status, "complete_with_known_gaps");
    assert.deepEqual(byId.get("SAFE-URL-04"), {
      id: "SAFE-URL-04",
      status: "pass",
      reason_code: "PRIVATE_HELPER_BLOCKED_IPV4_LOOPBACK",
    });
    assert.deepEqual(byId.get("SAFE-URL-06"), {
      id: "SAFE-URL-06",
      status: "known_gap",
      reason_code: "PRIVATE_HELPER_MISSED_CANONICAL_MAPPED_IPV6",
    });
    assert.deepEqual(byId.get("SAFE-URL-18"), {
      id: "SAFE-URL-18",
      status: "known_gap",
      reason_code: "YOUTUBE_HELPER_ACCEPTED_OVERLONG_ID_PREFIX",
    });
    assert.deepEqual(byId.get("SAFE-TXT-01"), {
      id: "SAFE-TXT-01",
      status: "not_applicable",
      reason_code: "EXACT_EXISTING_TEST_REQUIRES_SEPARATE_EXECUTION",
    });
  });

  it("exercises scorer and strict subtitle bounds entirely in memory", () => {
    const report = evaluateSafetyFixturesJson(fixtureJson);
    const passingIds = new Set(
      report.results
        .filter((result) => result.status === "pass")
        .map((result) => result.id),
    );

    for (const id of [
      "SAFE-TXT-06",
      "SAFE-FILE-01",
      "SAFE-FILE-02",
      "SAFE-FILE-03",
      "SAFE-FILE-04",
    ]) assert.equal(passingIds.has(id), true, id);
  });

  it("revalidates programmatic inputs instead of trusting TypeScript assertions", () => {
    const parsed = parseSafetyFixturesJson(fixtureJson);
    const mutated = structuredClone(parsed) as unknown as Record<string, unknown>;
    const fixtures = mutated.fixtures as Array<Record<string, unknown>>;
    fixtures[0].id = "SAFE-URL-99";

    expectCode(
      () => evaluateSafetyFixtures(mutated as unknown as Parameters<typeof evaluateSafetyFixtures>[0]),
      "INVALID_SCHEMA",
    );
  });

  it("emits only aggregate, ID, status, and reason-code evidence", () => {
    const report = evaluateSafetyFixturesJson(fixtureJson);
    assert.deepEqual(Object.keys(report), [
      "evaluator_version",
      "fixture_schema_version",
      "status",
      "counts",
      "results",
    ]);
    assert.deepEqual(Object.keys(report.counts), [
      "total",
      "pass",
      "known_gap",
      "not_applicable",
    ]);
    for (const result of report.results) {
      assert.deepEqual(Object.keys(result), ["id", "status", "reason_code"]);
      assert.match(result.id, /^SAFE-/);
      assert.match(result.reason_code, /^[A-Z][A-Z0-9_]+$/);
    }

    const serialized = JSON.stringify(report);
    for (const forbidden of [
      "example.invalid",
      "dQw4w9WgXcQ",
      "AbCdEfGhI_1",
      "Ignore prior instructions",
      "OAuth tokens",
      "javascript:alert",
      "cli.integration.test.ts",
      "recovery.test.ts",
    ]) assert.equal(serialized.includes(forbidden), false, forbidden);
  });

  it("CLI stdout is one publication-safe JSON line and performs no external-test promotion", () => {
    const result = spawnSync(
      process.execPath,
      ["--import", "tsx", evaluatorPath, fixturePath],
      { encoding: "utf8", env: { NODE_ENV: "test" }, timeout: 30_000 },
    );

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, "");
    assert.equal(result.stdout.trim().split("\n").length, 1);
    const report = JSON.parse(result.stdout);
    assert.equal(report.counts.total, 33);
    assert.equal(
      report.results.find((entry: { id: string }) => entry.id === "SAFE-FILE-05").status,
      "not_applicable",
    );
  });
});
