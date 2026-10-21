import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'habitrage-offline-queue';
const STORE_NAME = 'mutations';

export interface QueuedMutation {
  id?: number;
  collection: string;
  docId: string;
  data: any;
  action: 'set' | 'update' | 'delete';
  timestamp: number;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(db) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      },
    });
  }
  return dbPromise;
}

export async function queueMutation(mutation: QueuedMutation) {
  const db = await getDB();
  await db.add(STORE_NAME, mutation);
}

export async function getQueuedMutations(): Promise<QueuedMutation[]> {
  const db = await getDB();
  return await db.getAll(STORE_NAME);
}

export async function clearQueuedMutations() {
  const db = await getDB();
  await db.clear(STORE_NAME);
}
