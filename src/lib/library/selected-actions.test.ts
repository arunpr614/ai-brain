import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getAskSelectedActionState,
  getProcessingSelectedActionState,
  MAX_ASK_SELECTED_ITEMS,
  MAX_PROCESSING_SELECTED_ITEMS,
  processingSelectedResultMessage,
  removeSubmittedSelection,
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

describe("getProcessingSelectedActionState", () => {
  it("names the direct Inbox action and enforces its bounded selection", () => {
    assert.deepEqual(getProcessingSelectedActionState(1), {
      disabled: false,
      label: "Add to Inbox",
      title: "Add selected sources directly to Processing Inbox",
    });
    assert.deepEqual(
      getProcessingSelectedActionState(MAX_PROCESSING_SELECTED_ITEMS + 1),
      {
        disabled: true,
        label: "Limit 100",
        title: "Add up to 100 selected sources at a time",
      },
    );
  });

  it("summarizes added, already-present, and unavailable results", () => {
    assert.equal(
      processingSelectedResultMessage({
        addedCount: 1,
        alreadyInProcessingCount: 0,
        unavailableCount: 0,
      }),
      "Added 1 selected source to Processing Inbox.",
    );
    assert.equal(
      processingSelectedResultMessage({
        addedCount: 2,
        alreadyInProcessingCount: 1,
        unavailableCount: 1,
      }),
      "Added 2 selected sources to Processing Inbox. 1 is already in Processing. 1 is no longer available.",
    );
  });

  it("clears only submitted ids and preserves a source selected later", () => {
    assert.deepEqual(
      [...removeSubmittedSelection(new Set(["submitted", "selected-later"]), ["submitted"])],
      ["selected-later"],
    );
  });
});
