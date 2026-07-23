import "./sink.test.setup";

import assert from "node:assert/strict";
import {
  existsSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import { join, relative, resolve } from "node:path";
import { after, beforeEach, test } from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import {
  ERROR_EVENT_CODES,
  ERRORS_LOG_PATH,
  isErrorEventCode,
  logContainmentDiagnostic,
  logError,
} from "./sink";
import { TEST_ERROR_SINK_DIR } from "./sink.test.setup";

const THIS_TEST_FILE = fileURLToPath(import.meta.url);

after(() => {
  rmSync(TEST_ERROR_SINK_DIR, { recursive: true, force: true });
});

beforeEach(() => {
  rmSync(ERRORS_LOG_PATH, { force: true });
  rmSync(`${ERRORS_LOG_PATH}.1`, { force: true });
});

test("logError persists only an allowlisted code and a normalized UTC timestamp", () => {
  logError("capture.artifact-save-failed");

  const rows = readFileSync(ERRORS_LOG_PATH, "utf8").trim().split("\n");
  assert.equal(rows.length, 1);
  const row = JSON.parse(rows[0]) as Record<string, unknown>;
  assert.deepEqual(Object.keys(row).sort(), ["event_code", "timestamp"]);
  assert.equal(row.event_code, "capture.artifact-save-failed");
  assert.equal(typeof row.timestamp, "string");
  assert.equal(new Date(row.timestamp as string).toISOString(), row.timestamp);
});

test("logError rejects unknown, dynamic, and accessor-bearing input without reading it", () => {
  let accessorReads = 0;
  const accessorPayload = Object.create(null, {
    event_code: {
      enumerable: true,
      get() {
        accessorReads += 1;
        return "capture.artifact-save-failed";
      },
    },
    message: {
      enumerable: true,
      get() {
        accessorReads += 1;
        return "private";
      },
    },
  });
  const callUntyped = logError as (input: unknown) => void;

  callUntyped("not.allowlisted");
  callUntyped(accessorPayload);
  callUntyped(null);

  assert.equal(accessorReads, 0);
  assert.equal(existsSync(ERRORS_LOG_PATH), false);
  assert.equal(isErrorEventCode("not.allowlisted"), false);
});

test("logContainmentDiagnostic revalidates untyped input and persists only its normalized shape", () => {
  const callUntyped = logContainmentDiagnostic as (input: unknown) => void;

  callUntyped({
    event: "claimant_guarded",
    outcome: "denied",
    claimant: "transcript_recovery",
    aggregateCount: 2,
    guardrailTriggered: true,
  });

  const rows = readFileSync(ERRORS_LOG_PATH, "utf8").trim().split("\n");
  assert.equal(rows.length, 1);
  assert.deepEqual(JSON.parse(rows[0]), {
    event: "claimant_guarded",
    outcome: "denied",
    claimant: "transcript_recovery",
    aggregateCount: 2,
    guardrailTriggered: true,
  });
});

test("logContainmentDiagnostic rejects casts, JavaScript shapes, and accessors without reading forbidden values", () => {
  let accessorReads = 0;
  const accessorPayload = Object.create(null, {
    event: {
      enumerable: true,
      get() {
        accessorReads += 1;
        return "claimant_guarded";
      },
    },
    outcome: {
      enumerable: true,
      value: "denied",
    },
    message: {
      enumerable: true,
      get() {
        accessorReads += 1;
        return "private diagnostic sentinel";
      },
    },
    toJSON: {
      enumerable: true,
      get() {
        accessorReads += 1;
        return () => ({ message: "private diagnostic sentinel" });
      },
    },
  });
  const callUntyped = logContainmentDiagnostic as (input: unknown) => void;

  callUntyped(accessorPayload);
  callUntyped({
    event: "claimant_guarded",
    outcome: "not_allowlisted",
  });
  callUntyped({
    event: "claimant_guarded",
    outcome: "denied",
    message: "private diagnostic sentinel",
  });
  callUntyped(
    Object.assign(Object.create({ inherited: true }), {
      event: "claimant_guarded",
      outcome: "denied",
    }),
  );
  callUntyped(["claimant_guarded", "denied"]);
  callUntyped(null);

  assert.equal(accessorReads, 0);
  assert.equal(existsSync(ERRORS_LOG_PATH), false);
});

test("all TypeScript logError calls use one fixed allowlisted string literal", () => {
  const srcRoot = resolve(process.cwd(), "src");
  const violations: string[] = [];

  for (const file of listTypeScriptFiles(srcRoot)) {
    if (file === THIS_TEST_FILE) continue;
    const source = ts.createSourceFile(
      file,
      readFileSync(file, "utf8"),
      ts.ScriptTarget.Latest,
      true,
      file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );

    function visit(node: ts.Node): void {
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === "logError"
      ) {
        const argument = node.arguments[0];
        if (
          node.arguments.length !== 1 ||
          !argument ||
          !ts.isStringLiteral(argument) ||
          !isErrorEventCode(argument.text)
        ) {
          const position = source.getLineAndCharacterOfPosition(
            node.getStart(source),
          );
          violations.push(
            `${relative(process.cwd(), file)}:${position.line + 1}`,
          );
        }
      }
      ts.forEachChild(node, visit);
    }

    visit(source);
  }

  assert.deepEqual(violations, []);
  assert.equal(new Set(ERROR_EVENT_CODES).size, ERROR_EVENT_CODES.length);
});

function listTypeScriptFiles(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...listTypeScriptFiles(path));
    } else if (
      entry.isFile() &&
      (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) &&
      !entry.name.endsWith(".d.ts") &&
      statSync(path).size > 0
    ) {
      files.push(path);
    }
  }
  return files;
}
