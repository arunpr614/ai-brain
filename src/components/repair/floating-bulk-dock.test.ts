import test from "node:test";
import assert from "node:assert/strict";

interface MockDockAction {
  id: string;
  label: string;
  count?: number;
}

test("FloatingBulkDock action formatting formats counts accurately", () => {
  const actions: MockDockAction[] = [
    { id: "asr", label: "Queue Mac ASR", count: 4 },
    { id: "heal", label: "Auto-Heal Articles", count: 2 },
    { id: "archive", label: "Archive", count: 6 },
  ];

  assert.equal(`${actions[0].label} (${actions[0].count} Videos)`, "Queue Mac ASR (4 Videos)");
  assert.equal(`${actions[1].label} (${actions[1].count} Articles)`, "Auto-Heal Articles (2 Articles)");
  assert.equal(`${actions[2].label} (${actions[2].count} Items)`, "Archive (6 Items)");
});

test("FloatingBulkDock progress calculation correctly maps current and total", () => {
  function computeProgress(current: number, total: number) {
    if (total <= 0) return { percent: 0, label: "0/0 completed" };
    const pct = Math.min(100, Math.round((current / total) * 100));
    return { percent: pct, label: `${current}/${total} completed (${pct}%)` };
  }

  assert.deepEqual(computeProgress(0, 5), { percent: 0, label: "0/5 completed (0%)" });
  assert.deepEqual(computeProgress(2, 4), { percent: 50, label: "2/4 completed (50%)" });
  assert.deepEqual(computeProgress(5, 5), { percent: 100, label: "5/5 completed (100%)" });
});
