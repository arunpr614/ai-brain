#!/usr/bin/env node

const baseUrl = process.env.BRAIN_BASE_URL ?? "https://brain.arunp.in";
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
const ownerId = Number(process.env.TELEGRAM_OWNER_USER_ID ?? "0");

function fail(message) {
  console.error(`[smoke:telegram] FAIL: ${message}`);
  process.exit(1);
}

if (!secret) fail("TELEGRAM_WEBHOOK_SECRET is required");
if (!ownerId) fail("TELEGRAM_OWNER_USER_ID is required");

const webhookUrl = new URL("/api/telegram/webhook", baseUrl).toString();

async function postUpdate(body, headerSecret = secret) {
  const headers = { "content-type": "application/json" };
  if (headerSecret) headers["x-telegram-bot-api-secret-token"] = headerSecret;
  return fetch(webhookUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

function update(message, updateId) {
  return { update_id: updateId, message };
}

function message(extra) {
  return {
    message_id: Math.floor(Math.random() * 1_000_000),
    chat: { id: ownerId, type: "private" },
    from: { id: ownerId, is_bot: false, first_name: "Smoke" },
    date: Math.floor(Date.now() / 1000),
    ...extra,
  };
}

const startedAt = Date.now();

let res = await fetch(webhookUrl, { method: "POST" });
if (res.status !== 401 && res.status !== 429) {
  fail(`no-secret POST returned ${res.status}, expected 401 or 429`);
}

res = await postUpdate(update(message({ text: "bad secret" }), startedAt), "wrong-secret");
if (res.status !== 401 && res.status !== 429) {
  fail(`wrong-secret POST returned ${res.status}, expected 401 or 429`);
}

res = await postUpdate(
  update(
    {
      ...message({ text: "not owner" }),
      from: { id: ownerId + 10_000, is_bot: false, first_name: "Smoke" },
    },
    startedAt + 1,
  ),
);
if (res.status !== 200) fail(`non-owner update returned ${res.status}, expected 200`);

res = await postUpdate(update({ message_id: 1, text: "missing chat" }, startedAt + 2));
if (res.status !== 200) fail(`invalid schema update returned ${res.status}, expected 200`);

if (process.env.TELEGRAM_SMOKE_OWNER_ACK === "1") {
  res = await postUpdate(
    update(
      message({
        text: "/help",
        entities: [{ type: "bot_command", offset: 0, length: 5 }],
      }),
      startedAt + 3,
    ),
  );
  if (res.status !== 200) fail(`/help update returned ${res.status}, expected 200`);
}

if (process.env.TELEGRAM_SMOKE_CREATE_ITEM === "1") {
  res = await postUpdate(
    update(
      message({
        text: `Telegram release smoke ${new Date().toISOString()}`,
      }),
      startedAt + 4,
    ),
  );
  if (res.status !== 200 && res.status !== 201) {
    fail(`create-item smoke returned ${res.status}, expected 200/201`);
  }
}

console.log("[smoke:telegram] ok");
