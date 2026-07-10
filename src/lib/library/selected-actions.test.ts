import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getAskSelectedActionState,
  MAX_ASK_SELECTED_ITEMS,
} from "./selected-actions";

describe("getAskSelectedActionState", () => {
  it("disables Ask when nothing is selected", () => {
    assert.deepEqual(getAskSelectedActionState(0), {
      disabled: true,
      label: "Ask",
      title: "Select at least one source",
    });
  });

  it("enables Ask for the supported selected-source range", () => {
    assert.deepEqual(getAskSelectedActionState(1), {
      disabled: false,
      label: "Ask",
      title: "Ask selected sources",
    });
    assert.deepEqual(getAskSelectedActionState(MAX_ASK_SELECTED_ITEMS), {
      disabled: false,
      label: "Ask",
      title: "Ask selected sources",
    });
  });

  it("disables Ask above the selected-source limit", () => {
    assert.deepEqual(getAskSelectedActionState(MAX_ASK_SELECTED_ITEMS + 1), {
      disabled: true,
      label: "Limit 50",
      title: "Ask up to 50 selected sources at a time",
    });
  });
});
