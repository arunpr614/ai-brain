import { getDb, type ItemRow } from "./client";

export type TelegramUpdateStatus = "received" | "ignored" | "captured" | "failed";

export interface ClaimTelegramUpdateInput {
  update_id: number;
  message_id?: number | null;
  chat_id?: number | null;
  from_id?: number | null;
  file_unique_id?: string | null;
}

export interface TelegramUpdateRow extends ClaimTelegramUpdateInput {
  message_id: number | null;
  chat_id: number | null;
  from_id: number | null;
  file_unique_id: string | null;
  item_id: string | null;
  status: TelegramUpdateStatus;
  error: string | null;
  created_at: number;
  handled_at: number | null;
}

export function claimTelegramUpdate(input: ClaimTelegramUpdateInput): "claimed" | "duplicate" {
  const db = getDb();
  const result = db
    .prepare(
      `INSERT OR IGNORE INTO telegram_updates (
        update_id, message_id, chat_id, from_id, file_unique_id, status
      )
      VALUES (?, ?, ?, ?, ?, 'received')`,
    )
    .run(
      input.update_id,
      input.message_id ?? null,
      input.chat_id ?? null,
      input.from_id ?? null,
      input.file_unique_id ?? null,
    );
  return result.changes === 1 ? "claimed" : "duplicate";
}

export function markTelegramUpdateIgnored(updateId: number, reason: string): void {
  markTelegramUpdate(updateId, "ignored", null, reason);
}

export function markTelegramUpdateCaptured(updateId: number, itemId: string | null): void {
  markTelegramUpdate(updateId, "captured", itemId, null);
}

export function markTelegramUpdateFailed(updateId: number, error: string): void {
  markTelegramUpdate(updateId, "failed", null, error);
}

function markTelegramUpdate(
  updateId: number,
  status: TelegramUpdateStatus,
  itemId: string | null,
  error: string | null,
): void {
  getDb()
    .prepare(
      `UPDATE telegram_updates
       SET status = ?, item_id = COALESCE(?, item_id), error = ?, handled_at = ?
       WHERE update_id = ?`,
    )
    .run(status, itemId, error, Date.now(), updateId);
}

export function getTelegramUpdate(updateId: number): TelegramUpdateRow | null {
  const row = getDb()
    .prepare("SELECT * FROM telegram_updates WHERE update_id = ?")
    .get(updateId) as TelegramUpdateRow | undefined;
  return row ?? null;
}

export function findTelegramDocumentByUniqueId(fileUniqueId: string): ItemRow | null {
  const row = getDb()
    .prepare(
      `SELECT items.*
       FROM telegram_updates
       JOIN items ON items.id = telegram_updates.item_id
       WHERE telegram_updates.file_unique_id = ?
         AND telegram_updates.status = 'captured'
       ORDER BY telegram_updates.handled_at DESC
       LIMIT 1`,
    )
    .get(fileUniqueId) as ItemRow | undefined;
  return row ?? null;
}
