import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
  ACCEPTANCE_REGISTRY_KEYS,
  ACCEPTANCE_REGISTRY_CASE_KEYS,
  ASSERTION_MANIFEST_KEYS,
  ASSERTION_MANIFEST_RECORD_KEYS,
  assertCommandOutputSha256,
  assertRunBindingSha256,
  authenticateFrozenAssertionManifest,
  authenticateFrozenAcceptanceRegistry,
  canonicalJsonBytes,
  canonicalRunBindingPayload,
  commandOutputPreimage,
  commandOutputSha256,
  decodeLengthFrames,
  encodeControlFrame,
  encodeLengthFrame,
  encodeStructuredEvent,
  FROZEN_ACCEPTANCE_REGISTRY_SHA256,
  FROZEN_ASSERTION_MANIFEST_SHA256,
  LengthFrameDecoder,
  parseCanonicalJsonBytes,
  parseControlFrame,
  parseRunBindingPayload,
  projectRunBindingRecord,
  registryBoundRunBindingSha256,
  RUN_BINDING_DOMAIN,
  RUN_BINDING_KEYS,
  runBindingPreimage,
  runBindingSha256,
  Stage2EvidenceProtocolError,
  validateStructuredChildEvents,
} from "./protocol.mjs";

const ACCEPTANCE_REGISTRY_URL = new URL(
  "../../../docs/feature-council/youtube-item-recovery-implementation/implementation/fixtures/stage2-acceptance-registry-v2.json",
  import.meta.url,
);
const ACCEPTANCE_REGISTRY_BYTES = readFileSync(ACCEPTANCE_REGISTRY_URL);
const ACCEPTANCE_REGISTRY = JSON.parse(
  ACCEPTANCE_REGISTRY_BYTES.toString("utf8"),
);
const ASSERTION_MANIFEST_URL = new URL(
  "../../../docs/feature-council/youtube-item-recovery-implementation/implementation/fixtures/stage2-assertion-manifest-v1.json",
  import.meta.url,
);
const ASSERTION_MANIFEST_BYTES = readFileSync(ASSERTION_MANIFEST_URL);
const ASSERTION_MANIFEST = JSON.parse(
  ASSERTION_MANIFEST_BYTES.toString("utf8"),
);
const CONTROL_KEYS = Object.freeze(["domain", "nonce", "sequence"]);
const SAMPLE_CONTROL = Object.freeze({
  domain: "stage2-test-control-v1",
  nonce: "n-1",
  sequence: 1,
});

function protocolRefusal(callback, code) {
  assert.throws(callback, (error) => {
    assert.ok(error instanceof Stage2EvidenceProtocolError);
    assert.equal(error.code, code);
    return true;
  });
}

function framePayload(payload) {
  const prefix = Buffer.alloc(4);
  prefix.writeUInt32BE(payload.length, 0);
  return Buffer.concat([prefix, payload]);
}

function event(caseId, assertionId, status = "PASS") {
  return {
    case_id: caseId,
    assertion_id: assertionId,
    status,
  };
}

function manifestRecords(caseId) {
  return ASSERTION_MANIFEST.cases[caseId];
}

function assertionIdsSha256(records) {
  return createHash("sha256")
    .update(
      Buffer.from(
        JSON.stringify(records.map((record) => record.assertion_id)),
        "utf8",
      ),
    )
    .digest("hex");
}

function assertionValidationOptions(
  caseId,
  { includeEvidenceBindings = true } = {},
) {
  const options = {
    caseId,
    assertionManifestBytes: ASSERTION_MANIFEST_BYTES,
    expectedAssertionManifestSha256: FROZEN_ASSERTION_MANIFEST_SHA256,
  };
  if (includeEvidenceBindings) {
    const records = manifestRecords(caseId);
    options.expectedAssertionCount = records.length;
    options.expectedAssertionIdsSha256 = assertionIdsSha256(records);
  }
  return options;
}

function sampleRunBinding(overrides = {}) {
  const record = {
    case_id: "S2-AC-02",
    contract_sha256: "1".repeat(64),
    registry_sha256: "2".repeat(64),
    shared_run_binding_sha256: "3".repeat(64),
    aggregation_binding_sha256: "4".repeat(64),
    platform: "linux",
    platform_descriptor_sha256: "5".repeat(64),
    host_control_oracle_bundle_sha256: null,
    git_commit: "6".repeat(40),
    migration_sha256: "7".repeat(64),
    fixture_sha256: "8".repeat(64),
    schema_manifest_sha256: "9".repeat(64),
    failpoint_registry_sha256: "a".repeat(64),
    generated_migration_failpoints_sha256: "b".repeat(64),
    binary_artifact_sha256: "c".repeat(64),
    assertion_manifest_sha256: "d".repeat(64),
    evidence_runner_sha256: "e".repeat(64),
    operation_matrix_sha256: "f".repeat(64),
    command:
      "node scripts/run-stage2-acceptance.mjs --platform linux --case S2-AC-02 -- test",
    timeout_seconds: 300,
  };
  return Object.assign(record, overrides);
}

describe("canonical Stage 2 JSON", () => {
  it("emits exact compact JSON with the selected LF policy", () => {
    assert.deepEqual(
      canonicalJsonBytes(SAMPLE_CONTROL, CONTROL_KEYS),
      Buffer.from(
        '{"domain":"stage2-test-control-v1","nonce":"n-1","sequence":1}\n',
        "ascii",
      ),
    );
    assert.deepEqual(
      canonicalJsonBytes(SAMPLE_CONTROL, CONTROL_KEYS, { trailingLf: false }),
      Buffer.from(
        '{"domain":"stage2-test-control-v1","nonce":"n-1","sequence":1}',
        "ascii",
      ),
    );
  });

  it("round-trips only exact key order, membership, escapes, and one LF", () => {
    const canonical = canonicalJsonBytes(SAMPLE_CONTROL, CONTROL_KEYS);
    assert.deepEqual(
      parseCanonicalJsonBytes(canonical, CONTROL_KEYS),
      SAMPLE_CONTROL,
    );

    const refusals = [
      [
        '{"nonce":"n-1","domain":"stage2-test-control-v1","sequence":1}\n',
        "invalid_keys",
      ],
      [
        '{"domain":"stage2-test-control-v1","nonce":"n-1","sequence":1,"extra":0}\n',
        "invalid_keys",
      ],
      [
        '{"domain":"wrong","domain":"stage2-test-control-v1","nonce":"n-1","sequence":1}\n',
        "noncanonical_json",
      ],
      [
        '{"domain":"stage2-test-control-v1", "nonce":"n-1","sequence":1}\n',
        "noncanonical_json",
      ],
      [
        '{"domain":"stage2-test-control-v1","nonce":"\\u006e-1","sequence":1}\n',
        "noncanonical_json",
      ],
      [
        '{"domain":"stage2-test-control-v1","nonce":"n-1","sequence":1}\r\n',
        "invalid_canonical_bytes",
      ],
      [
        '{"domain":"stage2-test-control-v1","nonce":"n-1","sequence":1}\n\n',
        "invalid_trailing_lf",
      ],
    ];
    for (const [text, code] of refusals) {
      protocolRefusal(
        () =>
          parseCanonicalJsonBytes(Buffer.from(text, "utf8"), CONTROL_KEYS),
        code,
      );
    }

    protocolRefusal(
      () =>
        parseCanonicalJsonBytes(
          Buffer.concat([
            Buffer.from([0xef, 0xbb, 0xbf]),
            canonical,
          ]),
          CONTROL_KEYS,
        ),
      "invalid_canonical_bytes",
    );
    protocolRefusal(
      () =>
        parseCanonicalJsonBytes(
          Buffer.from(
            '{"domain":"stage2-test-control-v1","nonce":"é","sequence":1}\n',
            "utf8",
          ),
          CONTROL_KEYS,
        ),
      "invalid_ascii",
    );
  });

  it("refuses values JSON.stringify would silently normalize", () => {
    protocolRefusal(
      () =>
        canonicalJsonBytes(
          { domain: "stage2-test-control-v1", nonce: "n-1", sequence: -0 },
          CONTROL_KEYS,
        ),
      "invalid_canonical_integer",
    );
    protocolRefusal(
      () =>
        canonicalJsonBytes(
          { domain: "stage2-test-control-v1", nonce: "n-1", sequence: 1.5 },
          CONTROL_KEYS,
        ),
      "invalid_canonical_integer",
    );
    protocolRefusal(
      () =>
        canonicalJsonBytes(
          {
            domain: "stage2-test-control-v1",
            nonce: "n-1",
            sequence: Number.MAX_SAFE_INTEGER + 1,
          },
          CONTROL_KEYS,
        ),
      "invalid_canonical_integer",
    );
  });

  it("is immune to inherited toJSON and refuses own toJSON or accessors", () => {
    const keys = ["domain", "entries"];
    const value = {
      domain: "stage2-data-only-json-v1",
      entries: ["safe"],
    };
    const objectToJson = Object.getOwnPropertyDescriptor(
      Object.prototype,
      "toJSON",
    );
    const arrayToJson = Object.getOwnPropertyDescriptor(
      Array.prototype,
      "toJSON",
    );

    Object.defineProperty(Object.prototype, "toJSON", {
      configurable: true,
      value: () => ({ attacker: true }),
    });
    Object.defineProperty(Array.prototype, "toJSON", {
      configurable: true,
      value: () => ["attacker"],
    });
    try {
      const expected =
        '{"domain":"stage2-data-only-json-v1","entries":["safe"]}\n';
      assert.deepEqual(
        canonicalJsonBytes(value, keys),
        Buffer.from(expected, "ascii"),
      );
      assert.deepEqual(
        parseCanonicalJsonBytes(Buffer.from(expected, "ascii"), keys),
        value,
      );
    } finally {
      if (objectToJson) {
        Object.defineProperty(Object.prototype, "toJSON", objectToJson);
      } else {
        delete Object.prototype.toJSON;
      }
      if (arrayToJson) {
        Object.defineProperty(Array.prototype, "toJSON", arrayToJson);
      } else {
        delete Array.prototype.toJSON;
      }
    }

    protocolRefusal(
      () =>
        canonicalJsonBytes(
          {
            domain: "stage2-data-only-json-v1",
            entries: {
              toJSON() {
                return "attacker";
              },
            },
          },
          keys,
        ),
      "invalid_json_value",
    );

    const accessor = {};
    Object.defineProperties(accessor, {
      domain: {
        enumerable: true,
        value: "stage2-test-control-v1",
      },
      nonce: {
        enumerable: true,
        get: () => "n-1",
      },
      sequence: {
        enumerable: true,
        value: 1,
      },
    });
    protocolRefusal(
      () => canonicalJsonBytes(accessor, CONTROL_KEYS),
      "noncanonical_property",
    );
  });
});

describe("uint32be length framing and control frames", () => {
  it("accepts equality, arbitrary chunk boundaries, and exact EOF", () => {
    const payload = Buffer.from("ABCD", "ascii");
    const frame = encodeLengthFrame(payload, { maxPayloadBytes: 4 });
    assert.equal(frame.readUInt32BE(0), 4);
    assert.deepEqual(frame.subarray(4), payload);

    const decoder = new LengthFrameDecoder({
      maxPayloadBytes: 4,
      totalCapBytes: 8,
      minFrames: 1,
      maxFrames: 1,
      label: "test stream",
    });
    assert.equal(decoder.push(frame.subarray(0, 1)), undefined);
    assert.equal(decoder.push(frame.subarray(1, 4)), undefined);
    assert.equal(decoder.push(frame.subarray(4, 6)), undefined);
    assert.equal(decoder.push(frame.subarray(6)), undefined);
    assert.deepEqual(decoder.finish(), {
      frames: [payload],
      frameCount: 1,
      totalBytes: 8,
    });
  });

  it("refuses zero, plus-one, malformed lengths, truncation, and trailing frames", () => {
    protocolRefusal(
      () => encodeLengthFrame(Buffer.alloc(0), { maxPayloadBytes: 4 }),
      "invalid_frame_length",
    );
    protocolRefusal(
      () => encodeLengthFrame(Buffer.alloc(5), { maxPayloadBytes: 4 }),
      "invalid_frame_length",
    );

    const zero = Buffer.alloc(4);
    protocolRefusal(
      () =>
        decodeLengthFrames(zero, {
          maxPayloadBytes: 4,
          totalCapBytes: 8,
        }),
      "invalid_frame_length",
    );

    const oversize = Buffer.alloc(4);
    oversize.writeUInt32BE(5, 0);
    protocolRefusal(
      () =>
        decodeLengthFrames(oversize, {
          maxPayloadBytes: 4,
          totalCapBytes: 9,
        }),
      "invalid_frame_length",
    );

    protocolRefusal(
      () =>
        decodeLengthFrames(Buffer.from([0, 0, 0]), {
          maxPayloadBytes: 4,
          totalCapBytes: 8,
        }),
      "truncated_frame_prefix",
    );
    protocolRefusal(
      () =>
        decodeLengthFrames(Buffer.from([0, 0, 0, 4, 0x41]), {
          maxPayloadBytes: 4,
          totalCapBytes: 8,
        }),
      "truncated_frame_payload",
    );

    const frame = encodeLengthFrame(Buffer.from("A"), {
      maxPayloadBytes: 4,
    });
    protocolRefusal(
      () =>
        decodeLengthFrames(Buffer.concat([frame, frame]), {
          maxPayloadBytes: 4,
          totalCapBytes: 10,
          maxFrames: 1,
        }),
      "too_many_frames",
    );

    protocolRefusal(
      () =>
        decodeLengthFrames(Buffer.concat([frame, Buffer.from([0])]), {
          maxPayloadBytes: 4,
          totalCapBytes: frame.length,
          maxFrames: 1,
        }),
      "frame_total_cap_exceeded",
    );
  });

  it("irreversibly poisons a decoder after a protocol error", () => {
    const decoder = new LengthFrameDecoder({
      maxPayloadBytes: 4,
      totalCapBytes: 5,
      minFrames: 1,
      maxFrames: 1,
      label: "poisoned stream",
    });
    const frame = encodeLengthFrame(Buffer.from("A"), {
      maxPayloadBytes: 4,
    });
    assert.equal(decoder.push(frame), undefined);
    protocolRefusal(
      () => decoder.push(Buffer.from([0])),
      "frame_total_cap_exceeded",
    );
    protocolRefusal(() => decoder.finish(), "decoder_failed");
  });

  it("enforces the frozen 4096-byte payload and 8388608-byte stream caps", () => {
    const equalityPayload = Buffer.alloc(4_096, 0x41);
    const equalityFrame = encodeLengthFrame(equalityPayload, {
      maxPayloadBytes: 4_096,
    });
    assert.deepEqual(
      decodeLengthFrames(equalityFrame, {
        maxPayloadBytes: 4_096,
        totalCapBytes: equalityFrame.length,
      }),
      [equalityPayload],
    );

    const plusOnePrefix = Buffer.alloc(4);
    plusOnePrefix.writeUInt32BE(4_097, 0);
    protocolRefusal(
      () =>
        decodeLengthFrames(plusOnePrefix, {
          maxPayloadBytes: 4_096,
          totalCapBytes: 8_388_608,
        }),
      "invalid_frame_length",
    );

    const capFrame = encodeLengthFrame(Buffer.alloc(4_092, 0x42), {
      maxPayloadBytes: 4_096,
    });
    const capEquality = Buffer.concat(Array(2_048).fill(capFrame));
    assert.equal(capEquality.length, 8_388_608);
    assert.equal(
      decodeLengthFrames(capEquality, {
        maxPayloadBytes: 4_096,
        totalCapBytes: 8_388_608,
        maxFrames: 10_000,
      }).length,
      2_048,
    );
    protocolRefusal(
      () =>
        decodeLengthFrames(Buffer.concat([capEquality, Buffer.from([0])]), {
          maxPayloadBytes: 4_096,
          totalCapBytes: 8_388_608,
          maxFrames: 10_000,
        }),
      "frame_total_cap_exceeded",
    );
  });

  it("parses one exact canonical control frame and hashes prefix plus payload", () => {
    const frame = encodeControlFrame(SAMPLE_CONTROL, CONTROL_KEYS, {
      maxPayloadBytes: 65_536,
    });
    const parsed = parseControlFrame(frame, CONTROL_KEYS, {
      maxPayloadBytes: 65_536,
    });

    assert.deepEqual(parsed.value, SAMPLE_CONTROL);
    assert.equal(
      parsed.frameSha256,
      createHash("sha256").update(frame).digest("hex"),
    );
    assert.equal(frame.readUInt32BE(0), frame.length - 4);
  });

  it("refuses malformed, duplicate, reordered, extra, and invalid-UTF8 control payloads", () => {
    const payloads = [
      [
        Buffer.from(
          '{"domain":"stage2-test-control-v1","nonce":"n-1","sequence":}',
        ),
        "invalid_json",
      ],
      [
        Buffer.from(
          '{"domain":"first","domain":"stage2-test-control-v1","nonce":"n-1","sequence":1}',
        ),
        "noncanonical_json",
      ],
      [
        Buffer.from(
          '{"nonce":"n-1","domain":"stage2-test-control-v1","sequence":1}',
        ),
        "invalid_keys",
      ],
      [
        Buffer.from(
          '{"domain":"stage2-test-control-v1","nonce":"n-1","sequence":1,"extra":0}',
        ),
        "invalid_keys",
      ],
      [Buffer.from([0x7b, 0x22, 0xc3, 0x28, 0x22, 0x7d]), "invalid_utf8"],
    ];

    for (const [payload, code] of payloads) {
      protocolRefusal(
        () =>
          parseControlFrame(framePayload(payload), CONTROL_KEYS, {
            maxPayloadBytes: 65_536,
          }),
        code,
      );
    }
  });
});

describe("structured child terminal events", () => {
  it("validates a complete PASS set independent of arrival order", () => {
    const caseId = "S2-AC-13";
    const records = manifestRecords(caseId);
    const childAssertionIds = records
      .filter((record) => record.source === "child_event")
      .map((record) => record.assertion_id);
    const arrivalOrder = [...childAssertionIds].reverse();
    const carrier = Buffer.concat(
      arrivalOrder.map((assertionId) =>
        encodeStructuredEvent(event(caseId, assertionId)),
      ),
    );
    const options = assertionValidationOptions(caseId);

    assert.deepEqual(
      validateStructuredChildEvents(carrier, options),
      {
        events: arrivalOrder.map((assertionId) =>
          event(caseId, assertionId),
        ),
        assertionManifestSha256: FROZEN_ASSERTION_MANIFEST_SHA256,
        assertionCount: records.length,
        assertionIds: records.map((record) => record.assertion_id),
        assertionIdsSha256: options.expectedAssertionIdsSha256,
        childAssertionCount: childAssertionIds.length,
        childAssertionIds,
        oracleAssertionCount: 0,
        oracleAssertionIds: [],
        nonpassAssertionCount: 0,
      },
    );
  });

  it("refuses missing, duplicate, unexpected, foreign-case, and nonpass events", () => {
    const multiCaseId = "S2-AC-13";
    const multiOptions = assertionValidationOptions(multiCaseId);
    const frames = manifestRecords(multiCaseId).map((record) =>
      encodeStructuredEvent(event(multiCaseId, record.assertion_id)),
    );

    protocolRefusal(
      () =>
        validateStructuredChildEvents(
          Buffer.concat(frames.slice(1)),
          multiOptions,
        ),
      "missing_assertion",
    );
    protocolRefusal(
      () =>
        validateStructuredChildEvents(
          Buffer.concat([...frames, frames[0]]),
          multiOptions,
        ),
      "duplicate_assertion",
    );

    const caseId = "S2-AC-05";
    const options = assertionValidationOptions(caseId);
    const assertionId = manifestRecords(caseId)[0].assertion_id;
    protocolRefusal(
      () =>
        validateStructuredChildEvents(
          encodeStructuredEvent(event(caseId, "S2-AC-05/gamma")),
          options,
        ),
      "unexpected_assertion",
    );
    protocolRefusal(
      () =>
        validateStructuredChildEvents(
          encodeStructuredEvent(
            event(
              "S2-AC-06",
              manifestRecords("S2-AC-06")[0].assertion_id,
            ),
          ),
          options,
        ),
      "foreign_case_event",
    );
    protocolRefusal(
      () =>
        validateStructuredChildEvents(
          encodeStructuredEvent(event(caseId, assertionId, "SKIP")),
          options,
        ),
      "nonpass_assertion",
    );
  });

  it("refuses malformed schemas, statuses, assertion IDs, UTF-8, and payload limits", () => {
    const caseId = "S2-AC-05";
    const assertionId = manifestRecords(caseId)[0].assertion_id;
    const options = assertionValidationOptions(caseId);
    const invalidPayloads = [
      [
        Buffer.from(
          `{"assertion_id":"${assertionId}","case_id":"S2-AC-05","status":"PASS"}`,
        ),
        "invalid_keys",
      ],
      [
        Buffer.from(
          `{"case_id":"S2-AC-05","assertion_id":"${assertionId}","status":"PASS","extra":0}`,
        ),
        "invalid_keys",
      ],
      [
        Buffer.from(
          `{"case_id":"S2-AC-05","assertion_id":"first","assertion_id":"${assertionId}","status":"PASS"}`,
        ),
        "noncanonical_json",
      ],
      [
        Buffer.from(
          `{"case_id":"S2-AC-05","assertion_id":"${assertionId}","status":"UNKNOWN"}`,
        ),
        "unknown_event_status",
      ],
      [
        Buffer.from(
          '{"case_id":"S2-AC-05","assertion_id":"S2-AC-05/UPPER","status":"PASS"}',
        ),
        "invalid_assertion_id",
      ],
      [Buffer.from([0x7b, 0xc3, 0x28, 0x7d]), "invalid_utf8"],
    ];

    for (const [payload, code] of invalidPayloads) {
      protocolRefusal(
        () => validateStructuredChildEvents(framePayload(payload), options),
        code,
      );
    }

    const oversize = Buffer.alloc(4);
    oversize.writeUInt32BE(4_097, 0);
    protocolRefusal(
      () => validateStructuredChildEvents(oversize, options),
      "invalid_frame_length",
    );
  });

  it("refuses an oracle-owned AC01 assertion emitted by the child", () => {
    const caseId = "S2-AC-01";
    const oracleId = "S2-AC-01/linux.boot_identity";
    const childId = "S2-AC-01/linux.package_contract";
    const records = manifestRecords(caseId);
    const options = assertionValidationOptions(caseId);

    protocolRefusal(
      () =>
        validateStructuredChildEvents(
          encodeStructuredEvent(event(caseId, oracleId)),
          options,
        ),
      "oracle_assertion_from_child",
    );

    const result = validateStructuredChildEvents(
      encodeStructuredEvent(event(caseId, childId)),
      options,
    );
    assert.equal(result.assertionCount, records.length);
    assert.equal(result.childAssertionCount, 1);
    assert.deepEqual(result.childAssertionIds, [childId]);
    assert.equal(result.oracleAssertionCount, records.length - 1);
    assert.ok(result.oracleAssertionIds.includes(oracleId));
  });

  it("authenticates the exact canonical manifest and all 17 cases", () => {
    assert.equal(
      createHash("sha256").update(ASSERTION_MANIFEST_BYTES).digest("hex"),
      FROZEN_ASSERTION_MANIFEST_SHA256,
    );
    const manifest = authenticateFrozenAssertionManifest(
      ASSERTION_MANIFEST_BYTES,
    );
    assert.deepEqual(Object.keys(manifest), [...ASSERTION_MANIFEST_KEYS]);
    assert.equal(manifest.domain, "stage2-assertion-manifest-v1");
    assert.deepEqual(
      Object.keys(manifest.cases),
      Array.from(
        { length: 17 },
        (_, index) => `S2-AC-${String(index + 1).padStart(2, "0")}`,
      ),
    );
    assert.ok(Object.isFrozen(manifest));
    assert.ok(Object.isFrozen(manifest.cases));
    for (const [caseId, records] of Object.entries(manifest.cases)) {
      assert.ok(records.length > 0, `${caseId} has assertions`);
      assert.ok(Object.isFrozen(records));
      for (const record of records) {
        assert.deepEqual(Object.keys(record), [
          ...ASSERTION_MANIFEST_RECORD_KEYS,
        ]);
        assert.ok(Object.isFrozen(record));
      }
    }
  });

  it("derives count and ID hash internally and checks optional evidence bindings", () => {
    const caseId = "S2-AC-05";
    const records = manifestRecords(caseId);
    const carrier = encodeStructuredEvent(
      event(caseId, records[0].assertion_id),
    );
    const withoutEvidenceBindings = assertionValidationOptions(caseId, {
      includeEvidenceBindings: false,
    });
    const result = validateStructuredChildEvents(
      carrier,
      withoutEvidenceBindings,
    );
    assert.equal(result.assertionCount, records.length);
    assert.equal(result.assertionIdsSha256, assertionIdsSha256(records));
    assert.equal(
      result.assertionManifestSha256,
      FROZEN_ASSERTION_MANIFEST_SHA256,
    );

    assert.equal(
      validateStructuredChildEvents(carrier, {
        ...withoutEvidenceBindings,
        expectedAssertionCount: records.length,
      }).assertionCount,
      records.length,
    );
    assert.equal(
      validateStructuredChildEvents(carrier, {
        ...withoutEvidenceBindings,
        expectedAssertionIdsSha256: assertionIdsSha256(records),
      }).assertionIdsSha256,
      assertionIdsSha256(records),
    );

    protocolRefusal(
      () =>
        validateStructuredChildEvents(carrier, {
          ...withoutEvidenceBindings,
          expectedAssertionCount: 2,
        }),
      "assertion_count_mismatch",
    );
    protocolRefusal(
      () =>
        validateStructuredChildEvents(carrier, {
          ...withoutEvidenceBindings,
          expectedAssertionIdsSha256: "0".repeat(64),
        }),
      "assertion_ids_hash_mismatch",
    );
    protocolRefusal(
      () =>
        validateStructuredChildEvents(carrier, {
          ...assertionValidationOptions(caseId),
          assertionManifestRecords: records,
        }),
      "invalid_keys",
    );
  });

  it("refuses the exact AC01 source-relabeling exploit and byte/hash substitution", () => {
    const caseId = "S2-AC-01";
    const attackerManifest = JSON.parse(
      ASSERTION_MANIFEST_BYTES.toString("utf8"),
    );
    const bootIdentity = {
      ...attackerManifest.cases[caseId][0],
      source: "child_event",
    };
    const brokerOracle = attackerManifest.cases[caseId][1];
    attackerManifest.cases[caseId] = [bootIdentity, brokerOracle];
    const attackerBytes = Buffer.from(
      `${JSON.stringify(attackerManifest)}\n`,
      "utf8",
    );
    const attackerManifestSha256 = createHash("sha256")
      .update(attackerBytes)
      .digest("hex");
    const attackerRecords = attackerManifest.cases[caseId];
    const carrier = encodeStructuredEvent(
      event(caseId, bootIdentity.assertion_id),
    );

    protocolRefusal(
      () =>
        validateStructuredChildEvents(carrier, {
          caseId,
          assertionManifestBytes: attackerBytes,
          expectedAssertionManifestSha256: attackerManifestSha256,
          expectedAssertionCount: attackerRecords.length,
          expectedAssertionIdsSha256:
            assertionIdsSha256(attackerRecords),
        }),
      "unexpected_assertion_manifest_sha256",
    );
    protocolRefusal(
      () =>
        validateStructuredChildEvents(carrier, {
          caseId,
          assertionManifestBytes: attackerBytes,
          expectedAssertionManifestSha256:
            FROZEN_ASSERTION_MANIFEST_SHA256,
          expectedAssertionCount: attackerRecords.length,
          expectedAssertionIdsSha256:
            assertionIdsSha256(attackerRecords),
        }),
      "assertion_manifest_hash_mismatch",
    );

    protocolRefusal(
      () =>
        validateStructuredChildEvents(carrier, {
          caseId,
          assertionManifestBytes: Buffer.from(
            '{"domain":"stage2-assertion-manifest-v1","cases":{}}\n',
            "ascii",
          ),
          expectedAssertionManifestSha256:
            FROZEN_ASSERTION_MANIFEST_SHA256,
        }),
      "assertion_manifest_hash_mismatch",
    );
    protocolRefusal(
      () =>
        validateStructuredChildEvents(carrier, {
          caseId,
          assertionManifestBytes: ASSERTION_MANIFEST_BYTES,
          expectedAssertionManifestSha256: "0".repeat(64),
        }),
      "unexpected_assertion_manifest_sha256",
    );
  });
});

describe("stage2-command-output-v1 hashing", () => {
  it("hashes domain, uint64be lengths, and raw streams without decoding", () => {
    const stdout = Buffer.from([0x41, 0x0a, 0xff]);
    const stderr = Buffer.from([0x00, 0x42, 0x0d, 0x0a]);
    const preimage = commandOutputPreimage(stdout, stderr);
    const domainLength = Buffer.byteLength("stage2-command-output-v1");

    assert.deepEqual(
      preimage.subarray(0, domainLength + 1),
      Buffer.concat([
        Buffer.from("stage2-command-output-v1", "ascii"),
        Buffer.from([0]),
      ]),
    );
    assert.equal(
      preimage.readBigUInt64BE(domainLength + 1),
      BigInt(stdout.length),
    );
    assert.equal(
      preimage.readBigUInt64BE(domainLength + 1 + 8 + stdout.length),
      BigInt(stderr.length),
    );

    const expected =
      "7f02c5ba72ee5b2c4611ff84ea7267f1ff23a0d34d0520a07c2471626cead7a4";
    assert.equal(createHash("sha256").update(preimage).digest("hex"), expected);
    assert.equal(commandOutputSha256(stdout, stderr), expected);
    assert.equal(assertCommandOutputSha256(stdout, stderr, expected), expected);
  });

  it("refuses text inputs and mismatched or malformed output hashes", () => {
    protocolRefusal(
      () => commandOutputSha256("stdout", Buffer.alloc(0)),
      "invalid_bytes",
    );
    const expected = commandOutputSha256(
      Buffer.from("line\n"),
      Buffer.alloc(0),
    );
    protocolRefusal(
      () =>
        assertCommandOutputSha256(
          Buffer.from("line"),
          Buffer.alloc(0),
          expected,
        ),
      "command_output_hash_mismatch",
    );
    protocolRefusal(
      () =>
        assertCommandOutputSha256(
          Buffer.from("line\n"),
          Buffer.alloc(0),
          expected.toUpperCase(),
        ),
      "invalid_sha256",
    );
  });
});

describe("stage2-run-binding-v2", () => {
  it("constructs the exact ordered compact payload and domain-separated hash", () => {
    const record = sampleRunBinding();
    const payload = canonicalRunBindingPayload(record);
    assert.deepEqual(Object.keys(JSON.parse(payload.toString("utf8"))), [
      ...RUN_BINDING_KEYS,
    ]);
    assert.equal(payload.at(-1), 0x7d);

    const preimage = runBindingPreimage(record);
    assert.deepEqual(
      preimage.subarray(0, RUN_BINDING_DOMAIN.length + 1),
      Buffer.concat([
        Buffer.from(RUN_BINDING_DOMAIN, "ascii"),
        Buffer.from([0]),
      ]),
    );
    assert.deepEqual(
      preimage.subarray(RUN_BINDING_DOMAIN.length + 1),
      payload,
    );

    const expected =
      "7771406fd38b117b300d4584335399e29502dc101bc21bfe7c8a33579cf2727a";
    assert.equal(createHash("sha256").update(preimage).digest("hex"), expected);
    assert.equal(runBindingSha256(record), expected);
    assert.equal(assertRunBindingSha256(record, expected), expected);
    assert.deepEqual(parseRunBindingPayload(payload), record);
  });

  it("refuses missing, extra, reordered, duplicate, or malformed fields", () => {
    const record = sampleRunBinding();

    const missing = { ...record };
    delete missing.command;
    protocolRefusal(
      () => canonicalRunBindingPayload(missing),
      "invalid_keys",
    );

    protocolRefusal(
      () =>
        canonicalRunBindingPayload({
          ...record,
          extra: "forbidden",
        }),
      "invalid_keys",
    );

    const reordered = {
      registry_sha256: record.registry_sha256,
      case_id: record.case_id,
      ...Object.fromEntries(
        RUN_BINDING_KEYS.slice(2).map((key) => [key, record[key]]),
      ),
    };
    protocolRefusal(
      () => canonicalRunBindingPayload(reordered),
      "invalid_keys",
    );

    const payload = canonicalRunBindingPayload(record).toString("utf8");
    protocolRefusal(
      () =>
        parseRunBindingPayload(
          Buffer.from(
            payload.replace(
              '"case_id":"S2-AC-02",',
              '"case_id":"S2-AC-01","case_id":"S2-AC-02",',
            ),
          ),
        ),
      "noncanonical_json",
    );

    protocolRefusal(
      () =>
        canonicalRunBindingPayload(
          sampleRunBinding({ contract_sha256: "A".repeat(64) }),
        ),
      "invalid_sha256",
    );
    protocolRefusal(
      () =>
        canonicalRunBindingPayload(
          sampleRunBinding({ timeout_seconds: 0 }),
        ),
      "invalid_integer",
    );
  });

  it("enforces the frozen platform and host-oracle partition", () => {
    protocolRefusal(
      () =>
        canonicalRunBindingPayload(
          sampleRunBinding({ platform: "darwin" }),
        ),
      "platform_case_mismatch",
    );
    protocolRefusal(
      () =>
        canonicalRunBindingPayload(
          sampleRunBinding({
            host_control_oracle_bundle_sha256: "0".repeat(64),
          }),
        ),
      "unexpected_oracle_hash",
    );

    const ac01 = sampleRunBinding({
      case_id: "S2-AC-01",
      host_control_oracle_bundle_sha256: "0".repeat(64),
    });
    assert.equal(typeof runBindingSha256(ac01), "string");

    const ac17 = sampleRunBinding({
      case_id: "S2-AC-17",
      platform: "darwin",
      host_control_oracle_bundle_sha256: "0".repeat(64),
    });
    assert.equal(typeof runBindingSha256(ac17), "string");
  });

  it("authenticates the exact frozen registry and all 17 ordered cases", () => {
    assert.equal(
      createHash("sha256").update(ACCEPTANCE_REGISTRY_BYTES).digest("hex"),
      FROZEN_ACCEPTANCE_REGISTRY_SHA256,
    );
    const registry = authenticateFrozenAcceptanceRegistry(
      ACCEPTANCE_REGISTRY_BYTES,
    );
    assert.deepEqual(Object.keys(registry), [...ACCEPTANCE_REGISTRY_KEYS]);
    assert.equal(registry.cases.length, 17);
    assert.deepEqual(
      registry.cases.map((registryCase) => registryCase.id),
      Array.from(
        { length: 17 },
        (_, index) => `S2-AC-${String(index + 1).padStart(2, "0")}`,
      ),
    );
    assert.ok(Object.isFrozen(registry));
    assert.ok(Object.isFrozen(registry.cases));
    for (const registryCase of registry.cases) {
      assert.deepEqual(Object.keys(registryCase), [
        ...ACCEPTANCE_REGISTRY_CASE_KEYS,
      ]);
      assert.ok(Object.isFrozen(registryCase));
    }
  });

  it("projects evidence deterministically and binds command and timeout to authenticated frozen bytes", () => {
    const registryCase = ACCEPTANCE_REGISTRY.cases[1];
    const evidenceLike = {
      unrelated_prefix: "ignored-after-evidence-schema-validation",
      ...sampleRunBinding({
        registry_sha256: FROZEN_ACCEPTANCE_REGISTRY_SHA256,
        command: registryCase.command,
        timeout_seconds: registryCase.timeout_seconds,
      }),
      unrelated_suffix: "ignored-after-evidence-schema-validation",
    };
    const projected = projectRunBindingRecord(evidenceLike);
    assert.deepEqual(Object.keys(projected), [...RUN_BINDING_KEYS]);
    assert.equal(
      registryBoundRunBindingSha256(evidenceLike, {
        registryBytes: ACCEPTANCE_REGISTRY_BYTES,
        expectedRegistrySha256: FROZEN_ACCEPTANCE_REGISTRY_SHA256,
      }),
      runBindingSha256(projected),
    );
  });

  it("refuses fabricated registry cases, bytes, hashes, commands, and timeouts", () => {
    const registryCase = ACCEPTANCE_REGISTRY.cases[1];
    const record = sampleRunBinding({
      registry_sha256: FROZEN_ACCEPTANCE_REGISTRY_SHA256,
      command: registryCase.command,
      timeout_seconds: registryCase.timeout_seconds,
    });
    const options = {
      registryBytes: ACCEPTANCE_REGISTRY_BYTES,
      expectedRegistrySha256: FROZEN_ACCEPTANCE_REGISTRY_SHA256,
    };

    protocolRefusal(
      () =>
        registryBoundRunBindingSha256(
          { ...record, command: `${registryCase.command} --drift` },
          options,
        ),
      "run_binding_registry_mismatch",
    );
    protocolRefusal(
      () =>
        registryBoundRunBindingSha256(
          { ...record, timeout_seconds: registryCase.timeout_seconds + 1 },
          options,
        ),
      "run_binding_registry_mismatch",
    );
    protocolRefusal(
      () =>
        registryBoundRunBindingSha256(
          { ...record, registry_sha256: "0".repeat(64) },
          options,
        ),
      "run_binding_registry_hash_mismatch",
    );

    const mutatedRegistryBytes = Buffer.from(ACCEPTANCE_REGISTRY_BYTES);
    const mutationOffset = mutatedRegistryBytes.indexOf(
      Buffer.from("S2-AC-02", "ascii"),
    );
    assert.notEqual(mutationOffset, -1);
    mutatedRegistryBytes[mutationOffset + 7] = 0x33;
    protocolRefusal(
      () =>
        registryBoundRunBindingSha256(record, {
          registryBytes: mutatedRegistryBytes,
          expectedRegistrySha256: FROZEN_ACCEPTANCE_REGISTRY_SHA256,
        }),
      "registry_hash_mismatch",
    );

    const attackerExpected = createHash("sha256")
      .update(mutatedRegistryBytes)
      .digest("hex");
    protocolRefusal(
      () =>
        registryBoundRunBindingSha256(record, {
          registryBytes: mutatedRegistryBytes,
          expectedRegistrySha256: attackerExpected,
        }),
      "unexpected_registry_sha256",
    );
    protocolRefusal(
      () =>
        registryBoundRunBindingSha256(record, {
          ...options,
          registryCase: {
            ...registryCase,
            command: `${registryCase.command} --fabricated`,
          },
        }),
      "invalid_keys",
    );
    protocolRefusal(
      () =>
        authenticateFrozenAcceptanceRegistry(
          ACCEPTANCE_REGISTRY_BYTES.subarray(
            0,
            ACCEPTANCE_REGISTRY_BYTES.length - 1,
          ),
        ),
      "registry_hash_mismatch",
    );
  });

  it("refuses stale or mismatched bindings", () => {
    const record = sampleRunBinding();
    const expected = runBindingSha256(record);
    protocolRefusal(
      () =>
        assertRunBindingSha256(
          sampleRunBinding({ fixture_sha256: "0".repeat(64) }),
          expected,
        ),
      "run_binding_hash_mismatch",
    );
    protocolRefusal(
      () => assertRunBindingSha256(record, "0".repeat(64)),
      "run_binding_hash_mismatch",
    );
  });
});
