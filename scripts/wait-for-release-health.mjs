#!/usr/bin/env node

import { pathToFileURL } from "node:url";

const TRANSIENT_DELAY_MS = 1_000;
const REQUEST_TIMEOUT_MS = 3_000;
const MAX_DEADLINE_MS = 45_000;
const PERMANENT_STATUSES = new Set([401, 403, 404]);

export async function waitForReleaseHealth({
  url,
  token,
  deadlineMs = MAX_DEADLINE_MS,
  fetchFn = globalThis.fetch,
  now = Date.now,
  sleep = (duration) => new Promise((resolve) => setTimeout(resolve, duration)),
}) {
  if (typeof token !== "string" || token.length === 0) throw new Error("health token is required");
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) throw new Error("health URL must be credential-free HTTPS");
  if (!Number.isSafeInteger(deadlineMs) || deadlineMs < 1 || deadlineMs > MAX_DEADLINE_MS) {
    throw new Error("health deadline is invalid");
  }
  const deadline = now() + deadlineMs;
  let attempts = 0;
  let lastStatus = 0;
  while (now() < deadline) {
    attempts += 1;
    const remaining = Math.max(1, deadline - now());
    try {
      const response = await fetchFn(parsed, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(Math.min(REQUEST_TIMEOUT_MS, remaining)),
      });
      lastStatus = response.status;
      if (lastStatus === 200) return { ok: true, attempts, status: lastStatus };
      if (PERMANENT_STATUSES.has(lastStatus)) {
        throw new Error(`permanent health response ${lastStatus}`);
      }
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("permanent health response ")) throw error;
      lastStatus = 0;
    }
    const delay = Math.min(TRANSIENT_DELAY_MS, Math.max(0, deadline - now()));
    if (delay > 0) await sleep(delay);
  }
  throw new Error(`health did not reach 200 before deadline; attempts=${attempts}; lastStatus=${lastStatus}`);
}

async function main() {
  const [url, rawDeadline] = process.argv.slice(2);
  if (!url || process.argv.length > 4) throw new Error("usage: wait-for-release-health <url> [deadline-ms]");
  const deadlineMs = rawDeadline === undefined ? MAX_DEADLINE_MS : Number(rawDeadline);
  const result = await waitForReleaseHealth({
    url,
    token: process.env.BRAIN_RELEASE_HEALTH_TOKEN ?? "",
    deadlineMs,
  });
  console.log(JSON.stringify(result));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`[wait-for-release-health] ${error instanceof Error ? error.message : "health verification failed"}`);
    process.exit(1);
  });
}
