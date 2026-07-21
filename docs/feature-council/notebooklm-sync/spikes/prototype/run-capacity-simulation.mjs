import { modelCapacity } from "./sync-model.mjs";

const rates = [10, 50, 100];
const durations = [30, 90, 365];
const sourceLimits = [50, 100, 300, 600];
const wordsPerItemScenarios = [250, 1_000, 2_500];
const results = [];

for (const lane of ["enterprise", "drive"]) {
  for (const sourceLimit of sourceLimits) {
    for (const itemsPerDay of rates) {
      for (const averageWordsPerItem of wordsPerItemScenarios) {
        for (const days of durations) {
          results.push(
            modelCapacity({
              lane,
              itemsPerDay,
              days,
              averageWordsPerItem,
              averageCharactersPerItem: averageWordsPerItem * 6,
              wordLimit: 500_000,
              charLimit: 1_020_000,
              headroomRatio: 0.8,
              sourceLimit,
              existingSources: Math.min(10, Math.floor(sourceLimit * 0.1)),
              pendingDeletionSources: Math.min(2, Math.floor(sourceLimit * 0.02)),
              reservedHeadroom: Math.max(5, Math.floor(sourceLimit * 0.1)),
            }),
          );
        }
      }
    }
  }
}

console.log(
  JSON.stringify(
    {
      generatedFrom: "credential-free deterministic research model",
      syntheticItemsCreated: 0,
      googleCalls: 0,
      assumptions: {
        averageWordsPerItemScenarios: wordsPerItemScenarios,
        charactersPerWord: 6,
        wordLimit: 500_000,
        charLimit: 1_020_000,
        headroomRatio: 0.8,
      },
      results,
    },
    null,
    2,
  ),
);
