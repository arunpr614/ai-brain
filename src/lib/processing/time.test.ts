import assert from "node:assert/strict";
import { test } from "node:test";
import { Temporal } from "@js-temporal/polyfill";
import { processingTimeWindow, validateTimezone } from "./time";

test("owner-local calendar boundaries use Temporal across DST", () => {
  const asOf = Number(Temporal.ZonedDateTime.from("2025-11-05T12:00-05:00[America/New_York]").epochMilliseconds);
  const window = processingTimeWindow("America/New_York", asOf);
  // The seven local dates include the autumn 25-hour day: fixed-duration
  // subtraction would incorrectly produce 168 hours.
  assert.equal(window.todayStartUtc - window.previous7StartUtc, 169 * 60 * 60 * 1000);
  assert.equal(
    Temporal.Instant.fromEpochMilliseconds(window.todayStartUtc).toZonedDateTimeISO("America/New_York").toPlainTime().toString(),
    "00:00:00",
  );
});

test("timezone validation accepts IANA zones and rejects arbitrary text", () => {
  assert.equal(validateTimezone("Asia/Kolkata"), "Asia/Kolkata");
  assert.throws(() => validateTimezone("not/a-zone"));
});

test("calendar construction remains defined around skipped civil dates", () => {
  const asOf = Number(Temporal.Instant.from("2012-01-02T00:00:00Z").epochMilliseconds);
  const window = processingTimeWindow("Pacific/Apia", asOf);
  assert.ok(window.previous30StartUtc < window.previous7StartUtc);
  assert.ok(window.previous7StartUtc < window.todayStartUtc);
});
