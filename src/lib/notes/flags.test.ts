import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { noteFocusModeEnabled } from "./flags";

const original = process.env.NOTE_FOCUS_MODE_ENABLED;

afterEach(() => {
  if (original === undefined) delete process.env.NOTE_FOCUS_MODE_ENABLED;
  else process.env.NOTE_FOCUS_MODE_ENABLED = original;
});

test("note Focus Mode is disabled by default", () => {
  delete process.env.NOTE_FOCUS_MODE_ENABLED;
  assert.equal(noteFocusModeEnabled(), false);
});

test("note Focus Mode accepts the repository's enabled values", () => {
  for (const value of ["1", "true", "yes", "on", " TRUE "]) {
    process.env.NOTE_FOCUS_MODE_ENABLED = value;
    assert.equal(noteFocusModeEnabled(), true, value);
  }
});

test("note Focus Mode rejects unrecognized values", () => {
  for (const value of ["0", "false", "off", "enabled", ""]) {
    process.env.NOTE_FOCUS_MODE_ENABLED = value;
    assert.equal(noteFocusModeEnabled(), false, value);
  }
});
