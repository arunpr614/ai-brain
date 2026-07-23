/**
 * B-301 tests for postProcessTitle — the de-hyphenation helper added in
 * v0.3.1 to rewrite slug-shaped LLM titles without damaging legitimate
 * compound-adjective titles.
 *
 * Rule (tightened per self-critique P-1): fire ONLY when the title has
 * zero spaces AND at least two hyphens.
 */
import { TEST_DB_DIR as PIPELINE_TEST_DB_DIR } from "../embed/pipeline.test.setup";
import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { after, describe, it } from "node:test";
import {
  composeEnrichmentTitle,
  enrichItem,
  postProcessTitle,
} from "./pipeline";
import { getDb } from "@/db/client";
import { insertCaptured } from "@/db/items";
import { resetProviderCache } from "@/lib/llm/factory";

after(() => {
  rmSync(PIPELINE_TEST_DB_DIR, { recursive: true, force: true });
});

describe("postProcessTitle", () => {
  describe("fires on pure slug inputs (0 spaces, ≥2 hyphens)", () => {
    it("Growth-Loops-Messy-Draft → Growth Loops Messy Draft", () => {
      assert.equal(
        postProcessTitle("Growth-Loops-Messy-Draft"),
        "Growth Loops Messy Draft",
      );
    });

    it("Why-the-Best-PMs-Say-No → Why the Best PMs Say No", () => {
      assert.equal(
        postProcessTitle("Why-the-Best-PMs-Say-No"),
        "Why the Best PMs Say No",
      );
    });

    it("HYPHENATED-ALL-CAPS → Hyphenated All Caps (normalises case)", () => {
      assert.equal(
        postProcessTitle("HYPHENATED-ALL-CAPS"),
        "Hyphenated All Caps",
      );
    });
  });

  describe("does NOT fire on titles containing any space", () => {
    it("preserves State-of-the-Art 2026 (3 hyphens but 1 space)", () => {
      assert.equal(
        postProcessTitle("State-of-the-Art 2026"),
        "State-of-the-Art 2026",
      );
    });

    it("preserves Long-term thinking (1 hyphen, 1 space)", () => {
      assert.equal(
        postProcessTitle("Long-term thinking"),
        "Long-term thinking",
      );
    });
  });

  describe("does NOT fire on titles with fewer than 2 hyphens", () => {
    it("preserves Already Clean Title (0 hyphens)", () => {
      assert.equal(
        postProcessTitle("Already Clean Title"),
        "Already Clean Title",
      );
    });

    it("preserves single-word (1 hyphen, 0 spaces)", () => {
      assert.equal(postProcessTitle("single-word"), "single-word");
    });
  });

  describe("edge cases", () => {
    it("empty string round-trips", () => {
      assert.equal(postProcessTitle(""), "");
    });

    it("small-word lowercasing: the/of/a/etc are lowercased after position 0", () => {
      // Deliberately constructed slug input to trigger small-word handling.
      assert.equal(
        postProcessTitle("A-Tale-of-Two-Products"),
        "A Tale of Two Products",
      );
    });

    it("first word always title-cases even if it's a small word", () => {
      assert.equal(
        postProcessTitle("the-Only-Way-Forward"),
        "The Only Way Forward",
      );
    });
  });
});

// v0.5.1 T-YT-7: YouTube items get channel + duration injected into the
// "Original title" the enrichment LLM sees, so the 12,000-char body slice
// still has the key metadata for videos where the opening minutes aren't
// representative. Stored items.title is unchanged.
describe("composeEnrichmentTitle", () => {
  it("returns stored title unchanged for non-youtube source types", () => {
    assert.equal(
      composeEnrichmentTitle({
        source_type: "url",
        title: "Growth loops primer",
        author: "Lenny",
        duration_seconds: null,
      }),
      "Growth loops primer",
    );
  });

  it("appends channel + H:M duration for a long video", () => {
    assert.equal(
      composeEnrichmentTitle({
        source_type: "youtube",
        title: "Growth loops primer",
        author: "Lenny's Podcast",
        duration_seconds: 5000, // 1h 23m
      }),
      "Growth loops primer — Lenny's Podcast (1h23m)",
    );
  });

  it("omits duration when zero or null", () => {
    assert.equal(
      composeEnrichmentTitle({
        source_type: "youtube",
        title: "Short",
        author: "Ch",
        duration_seconds: 0,
      }),
      "Short — Ch",
    );
    assert.equal(
      composeEnrichmentTitle({
        source_type: "youtube",
        title: "Short",
        author: "Ch",
        duration_seconds: null,
      }),
      "Short — Ch",
    );
  });

  it("omits channel segment when author is null", () => {
    assert.equal(
      composeEnrichmentTitle({
        source_type: "youtube",
        title: "Untitled",
        author: null,
        duration_seconds: 180,
      }),
      "Untitled (3m)",
    );
  });

  it("formats minute-only for sub-hour durations", () => {
    assert.equal(
      composeEnrichmentTitle({
        source_type: "youtube",
        title: "Quick",
        author: "Ch",
        duration_seconds: 630, // 10m30s
      }),
      "Quick — Ch (10m)",
    );
  });
});

const VALID_ENRICHMENT = {
  summary:
    "This sufficiently long synthetic summary explains the source without relying on any private fixture content.",
  quotes: ["Synthetic quote"],
  category: "General",
  title: "Synthetic Enriched Title",
  tags: ["synthetic", "containment"],
} as const;

interface SyntheticEnrichmentOutput {
  readonly summary: string;
  readonly quotes: readonly string[];
  readonly category: string;
  readonly title: string;
  readonly tags: readonly string[];
}

function installPartialFeatureSchema(): void {
  getDb().exec(`
    CREATE TABLE content_processing_holds (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      state TEXT NOT NULL
    )
  `);
}

function removePartialFeatureSchema(): void {
  getDb().exec("DROP TABLE content_processing_holds");
}

function enrichmentWriteSnapshot(itemId: string): {
  item: {
    summary: string | null;
    category: string | null;
    enrichment_state: string;
    enriched_at: number | null;
  };
  usage: number;
  tags: number;
  topics: number;
} {
  const db = getDb();
  return {
    item: db
      .prepare(
        `SELECT summary,category,enrichment_state,enriched_at
       FROM items
       WHERE id = ?`,
      )
      .get(itemId) as {
      summary: string | null;
      category: string | null;
      enrichment_state: string;
      enriched_at: number | null;
    },
    usage: (
      db.prepare("SELECT COUNT(*) AS n FROM llm_usage").get() as {
        n: number;
      }
    ).n,
    tags: (
      db
        .prepare("SELECT COUNT(*) AS n FROM item_tags WHERE item_id = ?")
        .get(itemId) as { n: number }
    ).n,
    topics: (
      db
        .prepare("SELECT COUNT(*) AS n FROM item_topics WHERE item_id = ?")
        .get(itemId) as { n: number }
    ).n,
  };
}

function ollamaResponse(
  output: SyntheticEnrichmentOutput = VALID_ENRICHMENT,
): Response {
  return new Response(
    JSON.stringify({
      response: JSON.stringify(output),
      prompt_eval_count: 11,
      eval_count: 7,
    }),
    {
      status: 200,
      headers: { "content-type": "application/json" },
    },
  );
}

describe("enrichItem body-processing containment", () => {
  it("preserves schema-026 short-body behavior without provider dispatch", async () => {
    const item = insertCaptured({
      source_type: "note",
      title: "Short schema-026 item",
      body: "A short ordinary note.",
    });
    let providerCalls = 0;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      providerCalls += 1;
      return ollamaResponse();
    };
    try {
      const result = await enrichItem(item.id);
      assert.equal(result.ok, true);
      assert.equal(providerCalls, 0);
      if (result.ok) {
        assert.equal(result.output.summary, "A short ordinary note.");
        assert.equal(result.attempts, 0);
      }
      const stored = getDb()
        .prepare("SELECT enrichment_state,enriched_at FROM items WHERE id = ?")
        .get(item.id) as {
        enrichment_state: string;
        enriched_at: number | null;
      };
      assert.equal(stored.enrichment_state, "done");
      assert.notEqual(stored.enriched_at, null);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("preserves schema-026 provider results and commits derived data plus usage", async () => {
    const item = insertCaptured({
      source_type: "note",
      title: "Long schema-026 item",
      body: "Synthetic ordinary body. ".repeat(20),
    });
    const beforeUsage = enrichmentWriteSnapshot(item.id).usage;
    let providerCalls = 0;
    const originalFetch = globalThis.fetch;
    const originalProvider = process.env.LLM_ENRICH_PROVIDER;
    process.env.LLM_ENRICH_PROVIDER = "ollama";
    resetProviderCache();
    globalThis.fetch = async () => {
      providerCalls += 1;
      return ollamaResponse();
    };
    try {
      const result = await enrichItem(item.id);
      assert.equal(result.ok, true);
      assert.equal(providerCalls, 1);
      if (result.ok) {
        assert.deepEqual(result.output, VALID_ENRICHMENT);
        assert.equal(result.attempts, 1);
      }
      const after = enrichmentWriteSnapshot(item.id);
      assert.equal(after.item.summary, VALID_ENRICHMENT.summary);
      assert.equal(after.item.category, "General");
      assert.equal(after.item.enrichment_state, "done");
      assert.equal(after.usage, beforeUsage + 1);
      assert.equal(after.tags, 2);
      assert.equal(after.topics, 2);
    } finally {
      globalThis.fetch = originalFetch;
      if (originalProvider === undefined) {
        delete process.env.LLM_ENRICH_PROVIDER;
      } else {
        process.env.LLM_ENRICH_PROVIDER = originalProvider;
      }
      resetProviderCache();
    }
  });

  it("returns a content-free no-effect before provider or derived writes for an incompatible schema", async () => {
    const item = insertCaptured({
      source_type: "note",
      title: "Initially incompatible",
      body: "Synthetic blocked body. ".repeat(20),
    });
    const before = enrichmentWriteSnapshot(item.id);
    let providerCalls = 0;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      providerCalls += 1;
      return ollamaResponse();
    };
    installPartialFeatureSchema();
    try {
      const result = await enrichItem(item.id);
      assert.deepEqual(result, {
        ok: false,
        blocked: true,
        code: "processing_schema_incompatible",
      });
      assert.equal(providerCalls, 0);
      assert.deepEqual(enrichmentWriteSnapshot(item.id), before);
    } finally {
      removePartialFeatureSchema();
      globalThis.fetch = originalFetch;
    }
  });

  it("rechecks after provider dispatch and suppresses output, raw data, usage, and apply writes when capability changes", async () => {
    const item = insertCaptured({
      source_type: "note",
      title: "Capability race",
      body: "Synthetic race body. ".repeat(20),
    });
    const before = enrichmentWriteSnapshot(item.id);
    const privateSentinel = "PRIVATE_PROVIDER_OUTPUT_SENTINEL";
    const originalFetch = globalThis.fetch;
    const originalProvider = process.env.LLM_ENRICH_PROVIDER;
    process.env.LLM_ENRICH_PROVIDER = "ollama";
    resetProviderCache();
    let providerCalls = 0;
    globalThis.fetch = async () => {
      providerCalls += 1;
      installPartialFeatureSchema();
      return ollamaResponse({
        ...VALID_ENRICHMENT,
        summary: `${VALID_ENRICHMENT.summary} ${privateSentinel}`,
      });
    };
    try {
      const result = await enrichItem(item.id);
      assert.deepEqual(result, {
        ok: false,
        blocked: true,
        code: "processing_schema_incompatible",
      });
      assert.equal(providerCalls, 1);
      assert.equal(JSON.stringify(result).includes(privateSentinel), false);
      assert.deepEqual(enrichmentWriteSnapshot(item.id), before);
    } finally {
      removePartialFeatureSchema();
      globalThis.fetch = originalFetch;
      if (originalProvider === undefined) {
        delete process.env.LLM_ENRICH_PROVIDER;
      } else {
        process.env.LLM_ENRICH_PROVIDER = originalProvider;
      }
      resetProviderCache();
    }
  });

  it("does not return raw provider output when validation fails", async () => {
    const item = insertCaptured({
      source_type: "note",
      title: "Validation privacy",
      body: "Synthetic body for validation privacy. ".repeat(20),
    });
    const before = enrichmentWriteSnapshot(item.id);
    const privateSentinel = "PRIVATE_ENRICHMENT_RAW_SENTINEL";
    const originalFetch = globalThis.fetch;
    const originalProvider = process.env.LLM_ENRICH_PROVIDER;
    process.env.LLM_ENRICH_PROVIDER = "ollama";
    resetProviderCache();
    globalThis.fetch = async () =>
      ollamaResponse({
        ...VALID_ENRICHMENT,
        summary: "",
        title: privateSentinel,
      });
    try {
      const result = await enrichItem(item.id);
      assert.deepEqual(result, {
        ok: false,
        item_id: item.id,
        error: "enrichment_validation_failed",
      });
      assert.equal(JSON.stringify(result).includes(privateSentinel), false);
      assert.deepEqual(enrichmentWriteSnapshot(item.id), before);
    } finally {
      globalThis.fetch = originalFetch;
      if (originalProvider === undefined) {
        delete process.env.LLM_ENRICH_PROVIDER;
      } else {
        process.env.LLM_ENRICH_PROVIDER = originalProvider;
      }
      resetProviderCache();
    }
  });

  it("does not recreate outputs or usage when the item is deleted after provider dispatch", async () => {
    const item = insertCaptured({
      source_type: "note",
      title: "Deletion race",
      body: "Synthetic body for deletion race containment. ".repeat(20),
    });
    const db = getDb();
    const beforeUsage = enrichmentWriteSnapshot(item.id).usage;
    const originalFetch = globalThis.fetch;
    const originalProvider = process.env.LLM_ENRICH_PROVIDER;
    process.env.LLM_ENRICH_PROVIDER = "ollama";
    resetProviderCache();
    let providerCalls = 0;
    globalThis.fetch = async () => {
      providerCalls += 1;
      db.prepare("DELETE FROM items WHERE id = ?").run(item.id);
      return ollamaResponse();
    };
    try {
      const result = await enrichItem(item.id);
      assert.deepEqual(result, {
        ok: false,
        item_id: item.id,
        error: "item_not_found",
      });
      assert.equal(providerCalls, 1);
      assert.equal(
        (
          db.prepare("SELECT COUNT(*) AS n FROM llm_usage").get() as {
            n: number;
          }
        ).n,
        beforeUsage,
      );
      assert.equal(
        (
          db
            .prepare("SELECT COUNT(*) AS n FROM item_tags WHERE item_id = ?")
            .get(item.id) as { n: number }
        ).n,
        0,
      );
      assert.equal(
        (
          db
            .prepare("SELECT COUNT(*) AS n FROM item_topics WHERE item_id = ?")
            .get(item.id) as { n: number }
        ).n,
        0,
      );
    } finally {
      globalThis.fetch = originalFetch;
      if (originalProvider === undefined) {
        delete process.env.LLM_ENRICH_PROVIDER;
      } else {
        process.env.LLM_ENRICH_PROVIDER = originalProvider;
      }
      resetProviderCache();
    }
  });

  it("discards provider output when the authoritative worker mode changes in flight", async () => {
    const item = insertCaptured({
      source_type: "note",
      title: "Mode drift",
      body: "Synthetic body for authoritative mode drift. ".repeat(20),
    });
    const before = enrichmentWriteSnapshot(item.id);
    const originalFetch = globalThis.fetch;
    const originalProvider = process.env.LLM_ENRICH_PROVIDER;
    const originalMode = process.env.BRAIN_BACKGROUND_WORKERS_MODE;
    const originalDeployment = process.env.BRAIN_DEPLOYMENT_ENV;
    const originalProduction = process.env.BRAIN_PRODUCTION_RUNTIME;
    process.env.LLM_ENRICH_PROVIDER = "ollama";
    process.env.BRAIN_BACKGROUND_WORKERS_MODE = "standard";
    process.env.BRAIN_DEPLOYMENT_ENV = "test";
    process.env.BRAIN_PRODUCTION_RUNTIME = "0";
    resetProviderCache();
    const { isScheduledEnrichmentStandardMode } =
      await import("@/lib/queue/enrichment-worker");
    let providerCalls = 0;
    globalThis.fetch = async () => {
      providerCalls += 1;
      process.env.BRAIN_BACKGROUND_WORKERS_MODE = "disabled";
      return ollamaResponse();
    };
    try {
      const result = await enrichItem(item.id, {
        revalidateAuthority: () => isScheduledEnrichmentStandardMode(),
      });
      assert.deepEqual(result, {
        ok: false,
        blocked: true,
        code: "processing_authority_changed",
      });
      assert.equal(providerCalls, 1);
      assert.deepEqual(enrichmentWriteSnapshot(item.id), before);
    } finally {
      globalThis.fetch = originalFetch;
      restoreEnvironment("LLM_ENRICH_PROVIDER", originalProvider);
      restoreEnvironment("BRAIN_BACKGROUND_WORKERS_MODE", originalMode);
      restoreEnvironment("BRAIN_DEPLOYMENT_ENV", originalDeployment);
      restoreEnvironment("BRAIN_PRODUCTION_RUNTIME", originalProduction);
      resetProviderCache();
    }
  });
});

function restoreEnvironment(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
