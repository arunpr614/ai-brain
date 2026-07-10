export const NOTE_JOURNAL_DB = "brain-manual-notes-v2";
const NOTE_JOURNAL_VERSION = 1;
const NOTE_JOURNAL_STORE = "journals";

export type LocalJournalState =
  | "dirty"
  | "in_flight"
  | "conflict"
  | "copy_only"
  | "acknowledged";

export interface LocalEditorJournal {
  itemId: string;
  editorInstanceId: string;
  localSequence: number;
  epoch: number | null;
  baseGeneration: number | null;
  contentMarkdown: string;
  contentHash: string;
  mutationId: string;
  state: LocalJournalState;
  updatedAt: number;
  acknowledgedHash?: string;
}

function indexedDb(): IDBFactory {
  if (typeof indexedDB === "undefined") {
    throw new Error("NOTE_LOCAL_JOURNAL_UNAVAILABLE");
  }
  return indexedDB;
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction aborted"));
    transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed"));
  });
}

export function openNoteJournalDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDb().open(NOTE_JOURNAL_DB, NOTE_JOURNAL_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(NOTE_JOURNAL_STORE)) {
        const store = db.createObjectStore(NOTE_JOURNAL_STORE, {
          keyPath: ["itemId", "editorInstanceId"],
        });
        store.createIndex("itemId", "itemId", { unique: false });
        store.createIndex("state", "state", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Unable to open note recovery storage"));
    request.onblocked = () => reject(new Error("Note recovery storage upgrade is blocked"));
  });
}

/**
 * Store only a sequence at least as new as the durable record. IndexedDB write
 * transactions are serialized, so a delayed older caller cannot regress it.
 */
export async function putLatestJournal(
  journal: LocalEditorJournal,
): Promise<LocalEditorJournal> {
  const db = await openNoteJournalDb();
  try {
    const tx = db.transaction(NOTE_JOURNAL_STORE, "readwrite", { durability: "strict" });
    const store = tx.objectStore(NOTE_JOURNAL_STORE);
    const key: [string, string] = [journal.itemId, journal.editorInstanceId];
    const current = (await requestResult(store.get(key))) as LocalEditorJournal | undefined;
    const accepted = !current || journal.localSequence >= current.localSequence ? journal : current;
    if (accepted === journal) store.put(journal);
    await transactionDone(tx);
    return accepted;
  } finally {
    db.close();
  }
}

export async function listRecoverableJournals(itemId: string): Promise<LocalEditorJournal[]> {
  const db = await openNoteJournalDb();
  try {
    const tx = db.transaction(NOTE_JOURNAL_STORE, "readonly");
    const rows = (await requestResult(
      tx.objectStore(NOTE_JOURNAL_STORE).index("itemId").getAll(itemId),
    )) as LocalEditorJournal[];
    await transactionDone(tx);
    return rows
      .filter((row) => row.state !== "acknowledged")
      .sort((a, b) => b.updatedAt - a.updatedAt);
  } finally {
    db.close();
  }
}

export async function deleteJournal(itemId: string, editorInstanceId: string): Promise<void> {
  const db = await openNoteJournalDb();
  try {
    const tx = db.transaction(NOTE_JOURNAL_STORE, "readwrite", { durability: "strict" });
    tx.objectStore(NOTE_JOURNAL_STORE).delete([itemId, editorInstanceId]);
    await transactionDone(tx);
  } finally {
    db.close();
  }
}

export async function destroyNoteJournalDbForTests(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDb().deleteDatabase(NOTE_JOURNAL_DB);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("Note journal database is blocked"));
  });
}

