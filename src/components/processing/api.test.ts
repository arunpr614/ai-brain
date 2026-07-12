import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ProcessingEnrollmentJobDto } from "@/lib/processing/types";
import {
  addSelectedToProcessingInbox,
  normalizeItem,
} from "./api";

function enrollmentJob(
  overrides: Partial<ProcessingEnrollmentJobDto> = {},
): ProcessingEnrollmentJobDto {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    version: 1,
    mode: "selected",
    state: "preview_ready",
    previewAsOfUtc: 1_720_000_000_000,
    recentStartUtc: null,
    ownerTimezone: "Asia/Kolkata",
    timezoneVersion: 0,
    frozenCount: 1,
    recentOverflow: null,
    frozenHash: "a".repeat(64),
    confirmedAt: null,
    processedCount: 0,
    enrolledCount: 0,
    alreadyEnrolledCount: 0,
    deletedCount: 0,
    attempts: 0,
    errorCode: null,
    previewExpiresAt: 1_720_000_900_000,
    ...overrides,
  };
}

describe("normalizeItem", () => {
  it("maps the bounded backend DTO without dropping workflow truth", () => {
    const item = normalizeItem({
      itemId: "source-1",
      title: "A source",
      excerpt: "Bounded excerpt",
      sourceType: "article",
      captureChannel: "web",
      captureQuality: "full_text",
      capturedAt: 1_720_000_000_000,
      status: "in_progress",
      version: 4,
      inboxEnteredAt: null,
      archivedAt: null,
      userTags: [{ id: "tag-1", label: "Research" }],
      aiTopics: [{ id: "topic-1", label: "AI" }],
    });

    assert.equal(item.id, "source-1");
    assert.equal(item.workflowStatus, "in_progress");
    assert.equal(item.workflowVersion, 4);
    assert.deepEqual(item.userTags, [{ id: "tag-1", name: "Research" }]);
    assert.deepEqual(item.aiTopics, [{ id: "topic-1", name: "AI" }]);
  });

  it("merges a projection shape using top-level status and version", () => {
    const item = normalizeItem({
      id: "source-2",
      title: "Existing title",
      status: "done",
      version: 8,
      archivedAt: 1_720_000_100_000,
    });

    assert.equal(item.id, "source-2");
    assert.equal(item.title, "Existing title");
    assert.equal(item.workflowStatus, "done");
    assert.equal(item.workflowVersion, 8);
    assert.equal(item.archivedAt, 1_720_000_100_000);
  });

});

describe("addSelectedToProcessingInbox", () => {
  const requestId = "22222222-2222-4222-8222-222222222222";
  const confirmMutationId = "33333333-3333-4333-8333-333333333333";

  it("previews, confirms, and waits for the exact selected enrollment", async () => {
    const originalFetch = globalThis.fetch;
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const responses = [
      new Response(JSON.stringify({ job: enrollmentJob() }), { status: 201 }),
      new Response(
        JSON.stringify({
          job: enrollmentJob({ version: 2, state: "running", confirmedAt: 1_720_000_000_100 }),
          receipt: { outcomeClass: "accepted_effective", resultCode: "enrollment_confirmed" },
          replayed: false,
        }),
      ),
      new Response(
        JSON.stringify({
          job: enrollmentJob({
            version: 4,
            state: "completed",
            confirmedAt: 1_720_000_000_100,
            processedCount: 1,
            enrolledCount: 1,
          }),
        }),
      ),
    ];
    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(input), init });
      return responses.shift()!;
    }) as typeof fetch;

    try {
      const result = await addSelectedToProcessingInbox(
        ["source-1", "source-1"],
        { pollIntervalMs: 0, maxPolls: 2, requestId, confirmMutationId },
      );
      assert.deepEqual(result, {
        requestedCount: 1,
        addedCount: 1,
        alreadyInProcessingCount: 0,
        unavailableCount: 0,
      });
      assert.equal(calls[0]?.url, "/api/processing/enrollment/jobs");
      assert.deepEqual(JSON.parse(String(calls[0]?.init?.body)), {
        requestId,
        mode: "selected",
        selectedItemIds: ["source-1"],
      });
      assert.equal(calls[1]?.url, `/api/processing/enrollment/jobs/${enrollmentJob().id}/confirm`);
      assert.equal(
        JSON.parse(String(calls[1]?.init?.body)).mutationId,
        confirmMutationId,
      );
      assert.equal(calls[2]?.url, `/api/processing/enrollment/jobs/${enrollmentJob().id}`);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("reports an already-enrolled selection without resetting its workflow", async () => {
    const originalFetch = globalThis.fetch;
    const responses = [
      new Response(
        JSON.stringify({ job: enrollmentJob({ frozenCount: 0, frozenHash: "b".repeat(64) }) }),
        { status: 201 },
      ),
      new Response(
        JSON.stringify({
          job: enrollmentJob({
            version: 2,
            state: "running",
            frozenCount: 0,
            frozenHash: "b".repeat(64),
          }),
          receipt: { outcomeClass: "accepted_effective", resultCode: "enrollment_confirmed" },
        }),
      ),
      new Response(
        JSON.stringify({
          job: enrollmentJob({
            version: 3,
            state: "completed",
            frozenCount: 0,
            frozenHash: "b".repeat(64),
            processedCount: 1,
            alreadyEnrolledCount: 1,
          }),
        }),
      ),
    ];
    globalThis.fetch = (async () => responses.shift()!) as typeof fetch;
    try {
      assert.deepEqual(
        await addSelectedToProcessingInbox(["source-1"], {
          pollIntervalMs: 0,
          maxPolls: 2,
          requestId,
          confirmMutationId,
        }),
        {
          requestedCount: 1,
          addedCount: 0,
          alreadyInProcessingCount: 1,
          unavailableCount: 0,
        },
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("preserves the normalized enrollment conflict code for Library feedback", async () => {
    const originalFetch = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = (async () => {
      calls += 1;
      return new Response(JSON.stringify({ error: "enrollment_job_active" }), {
        status: 409,
      });
    }) as typeof fetch;
    try {
      await assert.rejects(
        addSelectedToProcessingInbox(["source-1"], {
          pollIntervalMs: 0,
          maxPolls: 1,
          requestId,
          confirmMutationId,
        }),
        (error: Error & { code?: string }) =>
          error.code === "enrollment_job_active",
      );
      assert.equal(calls, 1, "authoritative conflicts are not reconciled as transport failures");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("preserves a request mismatch without adopting the mismatched job", async () => {
    const originalFetch = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = (async () => {
      calls += 1;
      return new Response(JSON.stringify({ error: "enrollment_request_mismatch" }), {
        status: 422,
      });
    }) as typeof fetch;
    try {
      await assert.rejects(
        addSelectedToProcessingInbox(["source-1"], {
          pollIntervalMs: 0,
          maxPolls: 1,
          requestId,
          confirmMutationId,
        }),
        (error: Error & { code?: string }) => error.code === "enrollment_request_mismatch",
      );
      assert.equal(calls, 1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("recovers the exact job when the start response is lost", async () => {
    const originalFetch = globalThis.fetch;
    const calls: string[] = [];
    let step = 0;
    globalThis.fetch = (async (input: string | URL | Request) => {
      calls.push(String(input));
      step += 1;
      if (step === 1) throw new TypeError("response lost");
      if (step === 2) {
        return new Response(JSON.stringify({ job: enrollmentJob({ id: requestId }) }));
      }
      if (step === 3) {
        return new Response(JSON.stringify({
          job: enrollmentJob({ id: requestId, version: 2, state: "running" }),
          receipt: { outcomeClass: "accepted_effective", resultCode: "enrollment_confirmed" },
        }));
      }
      return new Response(JSON.stringify({
        job: enrollmentJob({
          id: requestId,
          version: 3,
          state: "completed",
          processedCount: 1,
          enrolledCount: 1,
        }),
      }));
    }) as typeof fetch;
    try {
      const result = await addSelectedToProcessingInbox(["source-1"], {
        pollIntervalMs: 0,
        maxPolls: 2,
        requestId,
        confirmMutationId,
      });
      assert.equal(result.addedCount, 1);
      assert.equal(calls[1], `/api/processing/enrollment/jobs/${requestId}`);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("recovers durable completion when the confirm response is lost", async () => {
    const originalFetch = globalThis.fetch;
    const calls: string[] = [];
    let step = 0;
    globalThis.fetch = (async (input: string | URL | Request) => {
      calls.push(String(input));
      step += 1;
      if (step === 1) {
        return new Response(JSON.stringify({ job: enrollmentJob({ id: requestId }) }), { status: 201 });
      }
      if (step === 2) throw new TypeError("response lost");
      return new Response(JSON.stringify({
        job: enrollmentJob({
          id: requestId,
          version: 3,
          state: "completed",
          processedCount: 1,
          enrolledCount: 1,
        }),
      }));
    }) as typeof fetch;
    try {
      const result = await addSelectedToProcessingInbox(["source-1"], {
        pollIntervalMs: 0,
        maxPolls: 2,
        requestId,
        confirmMutationId,
      });
      assert.equal(result.addedCount, 1);
      assert.equal(calls[2], `/api/processing/enrollment/jobs/${requestId}`);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("reports a terminal state returned by the final poll", async () => {
    const originalFetch = globalThis.fetch;
    const responses = [
      new Response(JSON.stringify({ job: enrollmentJob({ id: requestId }) }), { status: 201 }),
      new Response(JSON.stringify({
        job: enrollmentJob({ id: requestId, version: 2, state: "running" }),
        receipt: { outcomeClass: "accepted_effective", resultCode: "enrollment_confirmed" },
      })),
      new Response(JSON.stringify({
        job: enrollmentJob({ id: requestId, version: 3, state: "failed", errorCode: "worker_failure" }),
      })),
    ];
    globalThis.fetch = (async () => responses.shift()!) as typeof fetch;
    try {
      await assert.rejects(
        addSelectedToProcessingInbox(["source-1"], {
          pollIntervalMs: 0,
          maxPolls: 1,
          requestId,
          confirmMutationId,
        }),
        (error: Error & { code?: string }) => error.code === "selected_enrollment_failed",
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
