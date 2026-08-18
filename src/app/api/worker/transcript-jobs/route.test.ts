import "./route.test.setup";

import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { after, before, describe, it } from "node:test";
import { NextRequest } from "next/server";
import { TEST_DB_DIR } from "./route.test.setup";
import { GET as pollRoute } from "./poll/route";
import { POST as completeRoute } from "./complete/route";
import { POST as failRoute } from "./fail/route";
import { POST as heartbeatRoute } from "./heartbeat/route";
import { GET as statusRoute } from "./status/route";
import { POST as enqueueRoute } from "./enqueue/route";
import { getItem, insertCaptured } from "@/db/items";
import {
  enqueueTranscriptJobForItem,
  getTranscriptJobForItem,
} from "@/db/transcript-jobs";
import {
  getActiveTranscriptSourceForItem,
  listTranscriptSegmentsForSource,
} from "@/db/transcripts";
import { setPin } from "@/lib/auth";

const GOOD_WORKER_TOKEN = "w".repeat(64);
const GOOD_API_TOKEN = "a".repeat(64);

before(() => {
  setPin("1234");
  process.env.BRAIN_WORKER_TOKEN = GOOD_WORKER_TOKEN;
  process.env.BRAIN_API_TOKEN = GOOD_API_TOKEN;
});

after(() => {
  delete process.env.BRAIN_WORKER_TOKEN;
  delete process.env.BRAIN_API_TOKEN;
  try {
    rmSync(TEST_DB_DIR, { recursive: true, force: true });
  } catch {}
});

function createWorkerRequest(
  url: string,
  method = "GET",
  body?: Record<string, unknown>,
  token = GOOD_WORKER_TOKEN,
): NextRequest {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-worker-name": "mac-m5-pro",
  };
  if (token) {
    headers["authorization"] = `Bearer ${token}`;
  }
  return new NextRequest(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("Worker REST API Endpoints", () => {
  it("rejects unauthorized requests with 401", async () => {
    const unauthReq = createWorkerRequest("http://localhost:3000/api/worker/transcript-jobs/poll", "GET", undefined, "wrong_token");
    const res = await pollRoute(unauthReq);
    assert.equal(res.status, 401);
  });

  it("returns 204 when queue is empty", async () => {
    const req = createWorkerRequest("http://localhost:3000/api/worker/transcript-jobs/poll");
    const res = await pollRoute(req);
    assert.equal(res.status, 204);
  });

  it("claims a pending job on GET /poll", async () => {
    const item = insertCaptured({
      source_type: "youtube",
      capture_source: "web",
      source_url: "https://www.youtube.com/watch?v=apipoll0001",
      title: "API Poll Test Video",
      body: "metadata only",
      source_platform: "youtube",
      capture_quality: "metadata_only",
      extraction_warning: "no_transcript",
    });
    enqueueTranscriptJobForItem(item, { priority: 100 });

    const req = createWorkerRequest("http://localhost:3000/api/worker/transcript-jobs/poll?worker_name=mac-m5-pro");
    const res = await pollRoute(req);
    assert.equal(res.status, 200);

    const data = (await res.json()) as {
      job: { id: number; item_id: string; video_id: string; title: string; priority: number };
    };
    assert.equal(data.job.item_id, item.id);
    assert.equal(data.job.video_id, "apipoll0001");
    assert.equal(data.job.priority, 100);

    const dbJob = getTranscriptJobForItem(item.id);
    assert.equal(dbJob?.state, "running");
    assert.equal(dbJob?.worker_name, "mac-m5-pro");
  });

  it("completes a job on POST /complete with dual-representation storage", async () => {
    const item = insertCaptured({
      source_type: "youtube",
      capture_source: "android",
      source_url: "https://www.youtube.com/watch?v=apicompl001",
      title: "API Complete Test Video",
      body: "metadata only",
      source_platform: "youtube",
      capture_quality: "metadata_only",
      extraction_warning: "no_transcript",
    });
    enqueueTranscriptJobForItem(item, { priority: 80 });

    // Claim first
    const pollReq = createWorkerRequest("http://localhost:3000/api/worker/transcript-jobs/poll");
    const pollRes = await pollRoute(pollReq);
    const pollData = (await pollRes.json()) as { job: { id: number } };

    const completeReq = createWorkerRequest(
      "http://localhost:3000/api/worker/transcript-jobs/complete",
      "POST",
      {
        jobId: pollData.job.id,
        itemId: item.id,
        fullText: "This is a completed transcript from the Mac M5 Pro worker via REST API.",
        language: "en",
        segments: [
          { start: 0.0, end: 2.0, text: "This is a completed transcript", confidence: 0.99 },
          { start: 2.0, end: 5.5, text: "from the Mac M5 Pro worker via REST API.", confidence: 0.97 },
        ],
        workerMetadata: {
          engine: "mlx-whisper",
          model: "whisper-large-v3-turbo",
          device: "Apple M5 Pro Metal GPU",
          inference_latency_seconds: 1.45,
        },
      },
    );

    const res = await completeRoute(completeReq);
    assert.equal(res.status, 200);
    const data = (await res.json()) as { ok: boolean; transcriptSourceId: string };
    assert.equal(data.ok, true);
    assert.ok(data.transcriptSourceId);

    // Verify item updated
    const updatedItem = getItem(item.id);
    assert.equal(updatedItem?.body, "This is a completed transcript from the Mac M5 Pro worker via REST API.");
    assert.equal(updatedItem?.capture_quality, "high");
    assert.equal(updatedItem?.extraction_warning, null);

    // Verify transcript segments
    const activeSource = getActiveTranscriptSourceForItem(item.id);
    assert.ok(activeSource);
    const segments = listTranscriptSegmentsForSource(activeSource!.id);
    assert.equal(segments.length, 2);
    assert.equal(segments[0].text, "This is a completed transcript");
    assert.equal(segments[0].start_ms, 0);
    assert.equal(segments[0].end_ms, 2000);
  });

  it("handles failure on POST /fail", async () => {
    const item = insertCaptured({
      source_type: "youtube",
      capture_source: "web",
      source_url: "https://www.youtube.com/watch?v=apifail0001",
      title: "API Fail Test Video",
      body: "metadata only",
      source_platform: "youtube",
      capture_quality: "metadata_only",
      extraction_warning: "no_transcript",
    });
    enqueueTranscriptJobForItem(item, { priority: 50 });

    // Claim
    const pollReq = createWorkerRequest("http://localhost:3000/api/worker/transcript-jobs/poll");
    const pollRes = await pollRoute(pollReq);
    const pollData = (await pollRes.json()) as { job: { id: number } };

    const failReq = createWorkerRequest(
      "http://localhost:3000/api/worker/transcript-jobs/fail",
      "POST",
      {
        jobId: pollData.job.id,
        itemId: item.id,
        errorCode: "video_unavailable",
        errorMessage: "This video has been removed by the uploader.",
        retryable: false,
      },
    );

    const res = await failRoute(failReq);
    assert.equal(res.status, 200);

    const job = getTranscriptJobForItem(item.id);
    assert.equal(job?.state, "manual_needed");
    assert.equal(job?.last_error_code, "video_unavailable");
  });

  it("records heartbeats on POST /heartbeat and reflects in GET /status", async () => {
    const hbReq = createWorkerRequest(
      "http://localhost:3000/api/worker/transcript-jobs/heartbeat",
      "POST",
      {
        workerId: "mac-m5-pro",
        hostname: "Arun-MacBook-Pro-M5",
        systemInfo: "Apple M5 Pro (18 GPU Cores, 24GB RAM)",
      },
    );
    const hbRes = await heartbeatRoute(hbReq);
    assert.equal(hbRes.status, 200);

    const statusReq = createWorkerRequest("http://localhost:3000/api/worker/transcript-jobs/status?worker_id=mac-m5-pro");
    const statusRes = await statusRoute(statusReq);
    assert.equal(statusRes.status, 200);

    const statusData = (await statusRes.json()) as {
      ok: boolean;
      is_online: boolean;
      hostname: string;
      system_info: string;
      pending_jobs_count: number;
    };
    assert.equal(statusData.ok, true);
    assert.equal(statusData.is_online, true);
    assert.equal(statusData.hostname, "Arun-MacBook-Pro-M5");
    assert.equal(statusData.system_info, "Apple M5 Pro (18 GPU Cores, 24GB RAM)");
  });

  it("enqueues an item on POST /enqueue", async () => {
    const item = insertCaptured({
      source_type: "youtube",
      capture_source: "web",
      source_url: "https://www.youtube.com/watch?v=apienque001",
      title: "API Enqueue Test Video",
      body: "metadata only",
      source_platform: "youtube",
      capture_quality: "metadata_only",
      extraction_warning: "no_transcript",
    });

    const req = createWorkerRequest(
      "http://localhost:3000/api/worker/transcript-jobs/enqueue",
      "POST",
      {
        itemId: item.id,
        priority: 95,
        preferredModel: "whisper-large-v3-turbo",
      },
    );

    const res = await enqueueRoute(req);
    assert.equal(res.status, 200);

    const data = (await res.json()) as { ok: boolean; job: { priority: number; preferred_model: string } };
    assert.equal(data.ok, true);
    assert.equal(data.job.priority, 95);
    assert.equal(data.job.preferred_model, "whisper-large-v3-turbo");
  });
});
