import { openDB } from 'idb';

const DB_NAME = 'mtj-offline';
const STORE = 'queue';

async function getDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
      }
    },
  });
}

export async function queueTransaction(txn) {
  const db = await getDB();
  const entry = { 
    ...txn, 
    localId: crypto.randomUUID(), 
    createdAt: Date.now(), 
    status: 'queued', 
    retries: 0 
  };
  const id = await db.add(STORE, entry);
  return { localId: entry.localId, id };
}

export async function getQueue() {
  const db = await getDB();
  return db.getAll(STORE);
}

export async function markSynced(id) {
  const db = await getDB();
  const tx = db.transaction(STORE, 'readwrite');
  const req = await tx.store.get(id);
  if (req) {
    await tx.store.put({ ...req, status: 'synced', syncedAt: Date.now() });
  }
}

export async function markFailed(id, error) {
  const db = await getDB();
  const tx = db.transaction(STORE, 'readwrite');
  const req = await tx.store.get(id);
  if (req) {
    await tx.store.put({
      ...req,
      status: 'failed',
      error: error ? (error.message || 'Unknown') : 'Unknown',
      retries: (req.retries || 0) + 1,
    });
  }
}

export async function getQueueCount() {
  const all = await getQueue();
  return all.filter(x => x.status !== 'synced').length;
}