import type Database from "better-sqlite3";
import { getDb } from "@/db/client";

export function recordNotebookLmOperationalEvent(input: {
  eventType: string;
  connectorId?: string | null;
  targetId?: string | null;
  safeReason?: string | null;
  now?: number;
  db?: Database.Database;
}): void {
  const eventType = input.eventType.trim();
  if (!/^[a-z0-9_.-]{1,64}$/.test(eventType)) {
    throw new Error("invalid_notebooklm_operational_event");
  }
  (input.db ?? getDb())
    .prepare(
      `INSERT INTO notebooklm_operational_events
       (event_type, connector_id, target_id, safe_reason, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(
      eventType,
      input.connectorId ?? null,
      input.targetId ?? null,
      input.safeReason?.slice(0, 96) ?? null,
      input.now ?? Date.now(),
    );
}
