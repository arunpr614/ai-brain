import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseTimestampToSeconds,
  formatSecondsToTimestamp,
  parseRecallMemory,
} from "./recall-parser";

describe("Recall Parser Engine (TICKET-STUDIO-RECALL-01 & TICKET-STUDIO-RECALL-04)", () => {
  it("converts varied timestamp formats accurately to seconds", () => {
    assert.equal(parseTimestampToSeconds("(00:01:35)"), 95);
    assert.equal(parseTimestampToSeconds("(01:35)"), 95);
    assert.equal(parseTimestampToSeconds("00:01:35"), 95);
    assert.equal(parseTimestampToSeconds("01:35"), 95);
    assert.equal(parseTimestampToSeconds("(01:05:20)"), 3920);
    assert.equal(parseTimestampToSeconds("(00:00:00)"), 0);
    assert.equal(parseTimestampToSeconds("invalid"), null);
    assert.equal(parseTimestampToSeconds(null), null);
  });

  it("formats seconds into MM:SS and HH:MM:SS strings", () => {
    assert.equal(formatSecondsToTimestamp(95), "01:35");
    assert.equal(formatSecondsToTimestamp(3920), "1:05:20");
    assert.equal(formatSecondsToTimestamp(0), "00:00");
  });

  it("parses full Recall item body with metadata headers, sections, bullet takeaways, and virtual segments", () => {
    const sampleBody = `Imported from Recall
Recall card id: 87513f5c-4135-432d-bab9-14600be66607
Recall created_at: 2026-08-18T17:14:57.362000+00:00
Original source: https://www.youtube.com/watch?v=YRMPQGPexUA
Content fidelity: api_chunks_unverified
Imported at: 2026-08-18T20:07:04.001Z

---

- A large trial published in the New England Journal of Medicine compared the MIND diet to standard caloric restriction and found that both groups experienced similar benefits (00:01:35).
- Observational studies have shown that individuals whose diets resemble the Mediterranean diet have a lower risk of dementia (00:01:47).

## Nutrient Density & Whole Foods (00:02:25)

- Improving and maintaining brain health is primarily driven by the consumption of nutrient-dense whole foods rather than the strict avoidance of specific food groups. (00:02:25)

---

smaller cuz you just don't have the resources to invest in, you know, the structure (00:04:09) and to maintain it. At the other end, you see the same thing. So, if you're chronically in a
(00:04:14) chronic state of caloric excess, you also tend to have a smaller brain on average.
`;

    const summary = "Executive summary text of the whole video.";
    const memory = parseRecallMemory(sampleBody, summary);

    assert.equal(memory.isRecall, true);
    assert.equal(memory.cardId, "87513f5c-4135-432d-bab9-14600be66607");
    assert.equal(memory.sourceUrl, "https://www.youtube.com/watch?v=YRMPQGPexUA");
    assert.equal(memory.fidelity, "api_chunks_unverified");
    assert.equal(memory.rawSummary, summary);

    // Verify sections
    assert.ok(memory.sections.length >= 2);
    const nutrientSection = memory.sections.find((s) => s.title.includes("Nutrient Density"));
    assert.ok(nutrientSection);
    assert.equal(nutrientSection.timestampSeconds, 145);
    assert.equal(nutrientSection.timestampLabel, "02:25");

    // Verify takeaways
    assert.ok(memory.takeaways.length >= 3);
    const mindDietTakeaway = memory.takeaways[0];
    assert.ok(mindDietTakeaway.text.includes("New England Journal of Medicine"));
    assert.equal(mindDietTakeaway.timestampSeconds, 95);
    assert.equal(mindDietTakeaway.timestampLabel, "01:35");

    // Verify virtual segments
    assert.ok(memory.virtualSegments.length >= 3);
    const firstSeg = memory.virtualSegments[0];
    assert.equal(firstSeg.start_ms, 95000);
  });

  it("handles non-Recall items gracefully without breaking", () => {
    const nonRecallBody = "This is a simple plain text article captured directly via URL.";
    const memory = parseRecallMemory(nonRecallBody, "Summary");

    assert.equal(memory.isRecall, false);
    assert.equal(memory.cardId, null);
    assert.equal(memory.sections.length, 1);
    assert.equal(memory.virtualSegments.length, 0);
  });
});
