import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolvePrivateShellCounts } from "./private-counts";

describe("resolvePrivateShellCounts", () => {
  it("does not expose private counts without a verified session", () => {
    let countCalled = false;
    const result = resolvePrivateShellCounts({
      sessionToken: null,
      verifySession: () => false,
      countNeedsUpgrade: () => {
        countCalled = true;
        return 7;
      },
    });

    assert.deepEqual(result, { needsUpgradeCount: 0 });
    assert.equal(countCalled, false);
  });

  it("exposes private counts only after session verification passes", () => {
    const result = resolvePrivateShellCounts({
      sessionToken: "signed-session",
      verifySession: (token) => token === "signed-session",
      countNeedsUpgrade: () => 7,
    });

    assert.deepEqual(result, { needsUpgradeCount: 7 });
  });
});
