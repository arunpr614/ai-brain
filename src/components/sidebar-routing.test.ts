import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getDesktopShellTarget,
  getMobileShellTarget,
  usesStandardMobileCapture,
  type DesktopShellTarget,
  type MobileShellTarget,
} from "./sidebar-routing";

describe("getDesktopShellTarget", () => {
  const cases: Array<[string, DesktopShellTarget]> = [
    ["/", "library"],
    ["/library", "library"],
    ["/processing", "processing"],
    ["/processing?view=board", "processing"],
    ["/items/fixture-1", "library"],
    ["/items/fixture-1?mode=focus", "library"],
    ["/items/fixture-1/ask", "ask"],
    ["/topics/ai", "library"],
    ["/collections/manual-1", "library"],
    ["/search", "library"],
    ["/needs-upgrade", "needs-upgrade"],
    ["/needs-upgrade/anything", "needs-upgrade"],
    ["/ask", "ask"],
    ["/ask/thread-1", "ask"],
    ["/capture", "capture"],
    ["/capture?tab=note", "capture"],
    ["/settings/device-pairing", "pair-device"],
    ["/settings/device-pairing?state=expired", "pair-device"],
    ["/settings", "settings"],
    ["/settings/tags", "settings"],
    ["/settings/collections", "settings"],
    ["/more", null],
    ["/unknown", null],
  ];

  for (const [pathname, expected] of cases) {
    it(`${pathname} -> ${expected}`, () => {
      assert.equal(getDesktopShellTarget(pathname), expected);
    });
  }
});

describe("getMobileShellTarget", () => {
  const cases: Array<[string, MobileShellTarget]> = [
    ["/", "library"],
    ["/library", "library"],
    ["/processing", "more"],
    ["/processing?view=archived", "more"],
    ["/items/fixture-1", "library"],
    ["/items/fixture-1?mode=focus", "library"],
    ["/items/fixture-1/ask", "ask"],
    ["/topics/ai", "library"],
    ["/collections/manual-1", "library"],
    ["/search", "library"],
    ["/needs-upgrade", "library"],
    ["/ask", "ask"],
    ["/capture", "capture"],
    ["/capture?tab=note", "capture"],
    ["/capture/share-result", "capture"],
    ["/capture/share-result?key=fixture", "capture"],
    ["/settings/device-pairing", "more"],
    ["/settings", "more"],
    ["/settings/tags", "more"],
    ["/more", "more"],
    ["/setup-apk", "library"],
    ["/unknown", "library"],
  ];

  for (const [pathname, expected] of cases) {
    it(`${pathname} -> ${expected}`, () => {
      assert.equal(getMobileShellTarget(pathname), expected);
    });
  }
});

describe("usesStandardMobileCapture", () => {
  const cases: Array<[string, boolean]> = [
    ["/ask", true],
    ["/items/fixture-1/ask", true],
    ["/capture", true],
    ["/capture?tab=note", true],
    ["/capture/share-result", true],
    ["/library", false],
    ["/processing", false],
    ["/items/fixture-1", false],
    ["/more", false],
    ["/settings", false],
    ["/setup-apk", false],
  ];

  for (const [pathname, expected] of cases) {
    it(`${pathname} -> ${expected}`, () => {
      assert.equal(usesStandardMobileCapture(pathname), expected);
    });
  }
});
