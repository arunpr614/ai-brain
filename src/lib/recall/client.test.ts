import test from "node:test";
import assert from "node:assert/strict";
import { RecallApiClient, RecallApiError } from "./client";

test("RecallApiClient lists cards with documented date filters and bearer auth", async () => {
  const requests: Array<{ url: URL; authorization: string | null }> = [];
  const client = new RecallApiClient({
    apiKey: "sk_test_client_secret_12345",
    baseUrl: "https://recall.test/api/v1/",
    fetchFn: async (url, init) => {
      requests.push({
        url: new URL(String(url)),
        authorization: new Headers(init?.headers).get("authorization"),
      });
      return jsonResponse({
        results: [
          { id: "card_001", title: "One" },
          { card_id: "card_002", title: "Two" },
          { title: "Missing id" },
        ],
        total_count: 3,
      });
    },
  });

  const cards = await client.listCards({
    dateFrom: "2026-06-24T00:00:00.000Z",
    dateTo: "2026-06-24T23:59:59.000Z",
  });

  assert.deepEqual(cards, {
    cards: [{ id: "card_001" }, { id: "card_002" }],
    totalCount: 3,
  });
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url.pathname, "/api/v1/cards");
  assert.equal(requests[0].url.searchParams.get("date_from"), "2026-06-24T00:00:00.000Z");
  assert.equal(requests[0].url.searchParams.get("date_to"), "2026-06-24T23:59:59.000Z");
  assert.equal(requests[0].authorization, "Bearer sk_test_client_secret_12345");
});

test("RecallApiClient gets card detail and clamps max_chunks to documented range", async () => {
  const urls: URL[] = [];
  const client = new RecallApiClient({
    apiKey: "sk_test_client_secret_12345",
    baseUrl: "https://recall.test/api/v1",
    fetchFn: async (url) => {
      urls.push(new URL(String(url)));
      return jsonResponse({
        card_id: "card_detail_001",
        title: "Detail",
        created_at: "2026-06-24T10:00:00Z",
        source_url: "https://example.com/detail",
        image: "https://example.com/detail.png",
        chunks: [{ chunk_id: "chunk_001", content: "Chunk body" }],
      });
    },
  });

  const detail = await client.getCardDetail("card_detail_001", { maxChunks: 999 });

  assert.equal(urls[0].pathname, "/api/v1/cards/card_detail_001");
  assert.equal(urls[0].searchParams.get("max_chunks"), "50");
  assert.deepEqual(detail, {
    id: "card_detail_001",
    title: "Detail",
    created_at: "2026-06-24T10:00:00Z",
    source_url: "https://example.com/detail",
    image: "https://example.com/detail.png",
    chunks: [{ chunk_id: "chunk_001", content: "Chunk body" }],
  });
});

test("RecallApiClient throws status-aware errors without leaking the API key", async () => {
  const client = new RecallApiClient({
    apiKey: "sk_test_client_secret_12345",
    fetchFn: async () =>
      jsonResponse(
        { detail: { message: "Invalid API key", request_id: "req_123" } },
        { status: 401, statusText: "Unauthorized" },
      ),
  });

  await assert.rejects(
    () =>
      client.listCards({
        dateFrom: "2026-06-24T00:00:00.000Z",
        dateTo: "2026-06-24T23:59:59.000Z",
      }),
    (error) => {
      assert.equal(error instanceof RecallApiError, true);
      assert.equal((error as RecallApiError).status, 401);
      assert.equal((error as RecallApiError).requestId, "req_123");
      assert.doesNotMatch((error as Error).message, /sk_test_client_secret/);
      return true;
    },
  );
});

function jsonResponse(value: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(value), {
    status: init.status ?? 200,
    statusText: init.statusText,
    headers: { "content-type": "application/json" },
  });
}
