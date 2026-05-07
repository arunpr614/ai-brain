/**
 * SQLite client + migrations runner (F-000).
 *
 * Contracts:
 * - Single singleton `Database` instance per Node process (Next.js server).
 * - Applied migrations are tracked in `_migrations` and re-applying is idempotent.
 * - Migrations are read from `src/db/migrations/NNN_*.sql` at build time and
 *   bundled into the server build (via readdirSync at module load).
 * - Refuses to start if any migration fails.
 *
 * sqlite-vec:
 *   Loaded as an extension on connection. The virtual table for embeddings
 *   (`vec_items`) is created by a later migration in v0.4.0.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import Database from "better-sqlite3";
import * as sqliteVec from "sqlite-vec";

const DB_PATH =
  process.env.BRAIN_DB_PATH || resolve(process.cwd(), "data/brain.sqlite");

// Ensure parent directory exists before better-sqlite3 opens the file.
const dir = dirname(DB_PATH);
if (!existsSync(dir)) {
  mkdirSync(dir, { recursive: true });
}

let instance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (instance) return instance;

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("synchronous = NORMAL");

  // Load sqlite-vec. If the extension fails, fall back to non-vector operation
  // (v0.1.0 doesn't use vectors yet; v0.4.0 makes this required).
  try {
    sqliteVec.load(db);
  } catch (err) {
    console.warn("[db] sqlite-vec load failed:", (err as Error).message);
  }

  runMigrations(db);

  instance = db;
  return db;
}

/**
 * Apply all unapplied migrations in order. Tracked in `_migrations`.
 * Idempotent. Throws on any failure.
 */
function runMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id         INTEGER PRIMARY KEY,
      name       TEXT NOT NULL UNIQUE,
      applied_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );
  `);

  const applied = new Set(
    db
      .prepare("SELECT name FROM _migrations")
      .all()
      .map((r) => (r as { name: string }).name),
  );

  const migrationsDir = resolve(process.cwd(), "src/db/migrations");
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort(); // NNN_ prefix ensures lexicographic == numeric order

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = readFileSync(join(migrationsDir, file), "utf8");
    const insert = db.prepare(
      "INSERT INTO _migrations (name) VALUES (?)",
    );
    const tx = db.transaction(() => {
      db.exec(sql);
      insert.run(file);
    });
    try {
      tx();
      console.log(`[db] applied migration ${file}`);
    } catch (err) {
      console.error(`[db] migration ${file} failed:`, (err as Error).message);
      throw err;
    }
  }
}

/**
 * Typed row shapes for the v0.1.0 schema.
 */
export interface ItemRow {
  id: string;
  source_type: "url" | "pdf" | "note" | "youtube" | "podcast" | "epub" | "docx";
  source_url: string | null;
  title: string;
  author: string | null;
  body: string;
  summary: string | null;
  /** JSON-encoded array of 5 key quotes from enrichment. Added v0.3.0 (migration 004). */
  quotes: string | null;
  category: string | null;
  captured_at: number;
  enriched_at: number | null;
  enrichment_state: "pending" | "running" | "done" | "error";
  extraction_warning: string | null;
  total_pages: number | null;
  total_chars: number | null;
}

export interface SettingRow {
  key: string;
  value: string;
  updated_at: number;
}

/**
 * Convenience for creating item IDs. Short, URL-safe, not a UUID —
 * 96 bits of entropy is plenty for a single-user app.
 */
export function newId(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
