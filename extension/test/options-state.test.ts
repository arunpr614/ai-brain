import assert from "node:assert/strict";
import test from "node:test";
import { connectorControlState } from "../src/notebooklm/options-state.ts";

test("connector controls fail closed when either narrow host permission is missing", () => {
  assert.deepEqual(
    connectorControlState({ paired: false, bound: false, hasBinding: false, brainAccess: true, notebookLmAccess: false }),
    {
      grantDisabled: false,
      pairDisabled: false,
      pairingInputDisabled: false,
      pairingRevealDisabled: false,
      targetDisabled: true,
      bindDisabled: true,
      runDisabled: true,
      emergencyHidden: true,
    },
  );
  assert.deepEqual(
    connectorControlState({ paired: true, bound: true, hasBinding: true, brainAccess: false, notebookLmAccess: true }),
    {
      grantDisabled: true,
      pairDisabled: true,
      pairingInputDisabled: true,
      pairingRevealDisabled: true,
      targetDisabled: true,
      bindDisabled: true,
      runDisabled: true,
      emergencyHidden: false,
    },
  );
  assert.equal(
    connectorControlState({ paired: true, bound: true, hasBinding: true, brainAccess: true, notebookLmAccess: false }).runDisabled,
    true,
  );
  assert.deepEqual(
    connectorControlState({ paired: true, bound: true, hasBinding: true, brainAccess: true, notebookLmAccess: true }),
    {
      grantDisabled: true,
      pairDisabled: true,
      pairingInputDisabled: true,
      pairingRevealDisabled: true,
      targetDisabled: false,
      bindDisabled: false,
      runDisabled: false,
      emergencyHidden: false,
    },
  );
  assert.equal(
    connectorControlState({
      paired: false,
      bound: false,
      hasBinding: true,
      brainAccess: true,
      notebookLmAccess: false,
    }).emergencyHidden,
    false,
  );
});
