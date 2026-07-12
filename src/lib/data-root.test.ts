import assert from "node:assert/strict";
import { test } from "node:test";
import { brainDataRoot } from "./data-root";

test("durable paths stay beside the canonical database outside the immutable runtime", () => {
  assert.equal(
    brainDataRoot(
      { BRAIN_DB_PATH: "/opt/brain/data/brain.sqlite" },
      "/opt/brain/releases/example/runtime",
    ),
    "/opt/brain/data",
  );
});

test("development falls back to cwd data without an absolute database path", () => {
  assert.equal(brainDataRoot({}, "/workspace/ai-brain"), "/workspace/ai-brain/data");
  assert.equal(
    brainDataRoot({ BRAIN_DB_PATH: "data/test.sqlite" }, "/workspace/ai-brain"),
    "/workspace/ai-brain/data",
  );
});
