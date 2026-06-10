/**
 * Telegram Bot API client (v0.6.5).
 *
 * Thin `fetch` wrapper around https://api.telegram.org/bot<token>/.
 * Only the methods v0.6.5 needs — sendMessage, editMessageText, getFile,
 * downloadFile. No npm dep.
 *
 * The token is read at call time (not module load) so tests can stub
 * process.env without a re-import.
 */

import type {
  SendMessageOptions,
  TelegramFile,
  TelegramMessage,
} from "./types";

const TELEGRAM_API_BASE = "https://api.telegram.org";
const TELEGRAM_FILE_BASE = "https://api.telegram.org/file";
let apiTimeoutMs = 10_000;
let fileTimeoutMs = 30_000;

export class TelegramTimeoutError extends Error {
  constructor(operation: string, timeoutMs: number) {
    super(`${operation} timed out after ${timeoutMs}ms`);
    this.name = "TelegramTimeoutError";
  }
}

function token(): string {
  const t = process.env.TELEGRAM_BOT_TOKEN;
  if (!t) throw new Error("TELEGRAM_BOT_TOKEN not set");
  return t;
}

interface TelegramApiResponse<T> {
  ok: boolean;
  result?: T;
  error_code?: number;
  description?: string;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  operation: string,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      throw new TelegramTimeoutError(operation, timeoutMs);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

async function call<T>(method: string, body: unknown): Promise<T> {
  const res = await fetchWithTimeout(`${TELEGRAM_API_BASE}/bot${token()}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }, `telegram.${method}`, apiTimeoutMs);
  const json = (await res.json()) as TelegramApiResponse<T>;
  if (!json.ok || json.result === undefined) {
    throw new Error(
      `telegram.${method} failed: ${json.error_code ?? res.status} ${json.description ?? "(no description)"}`,
    );
  }
  return json.result;
}

export async function sendMessage(
  chatId: number,
  text: string,
  opts: SendMessageOptions = {},
): Promise<TelegramMessage> {
  return call<TelegramMessage>("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: opts.parse_mode,
    reply_to_message_id: opts.reply_to_message_id,
    disable_web_page_preview: opts.disable_web_page_preview ?? true,
  });
}

export async function editMessageText(
  chatId: number,
  messageId: number,
  text: string,
  opts: Pick<SendMessageOptions, "parse_mode" | "disable_web_page_preview"> = {},
): Promise<TelegramMessage | true> {
  return call<TelegramMessage | true>("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: opts.parse_mode,
    disable_web_page_preview: opts.disable_web_page_preview ?? true,
  });
}

export async function getFile(fileId: string): Promise<TelegramFile> {
  return call<TelegramFile>("getFile", { file_id: fileId });
}

export async function downloadFile(filePath: string): Promise<ArrayBuffer> {
  const res = await fetchWithTimeout(
    `${TELEGRAM_FILE_BASE}/bot${token()}/${filePath}`,
    {},
    "telegram.downloadFile",
    fileTimeoutMs,
  );
  if (!res.ok) {
    throw new Error(`telegram.downloadFile failed: ${res.status} ${res.statusText}`);
  }
  return res.arrayBuffer();
}

export function __setTelegramTimeoutsForTests(apiMs: number, fileMs: number): void {
  apiTimeoutMs = apiMs;
  fileTimeoutMs = fileMs;
}
