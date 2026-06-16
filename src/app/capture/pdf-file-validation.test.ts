import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getPdfFileValidationError } from "./pdf-file-validation";

describe("getPdfFileValidationError", () => {
  it("accepts application/pdf files", () => {
    assert.equal(
      getPdfFileValidationError({ name: "brief.bin", type: "application/pdf" }),
      null,
    );
  });

  it("accepts .pdf files when the picker omits MIME type", () => {
    assert.equal(getPdfFileValidationError({ name: "brief.PDF", type: "" }), null);
  });

  it("rejects non-PDF files", () => {
    assert.equal(
      getPdfFileValidationError({ name: "brief.txt", type: "text/plain" }),
      "Only PDF files are supported.",
    );
  });
});
