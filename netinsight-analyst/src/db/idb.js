import { openDB } from 'idb';

const DB_NAME = 'netinsight';
const STORE_NAME = 'files';

async function getDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    },
  });
}

export async function saveFileRecord(record) {
  const db = await getDB();
  await db.put(STORE_NAME, record);
}

export async function getAllRecords() {
  const db = await getDB();
  return db.getAll(STORE_NAME);
}

export async function updateRecordStatus(id, status) {
  const db = await getDB();
  const record = await db.get(STORE_NAME, id);
  if (record) {
    record.status = status;
    await db.put(STORE_NAME, record);
  }
}

export async function getRecordById(id) {
  const db = await getDB();
  return db.get(STORE_NAME, id);
}

export async function saveParseResult(id, result) {
  const db = await getDB();
  const record = await db.get(STORE_NAME, id);
  if (record) {
    record.parseResult = result;
    record.parsedAt = Date.now();
    await db.put(STORE_NAME, record);
  }
}

export async function getParseResult(id) {
  const db = await getDB();
  const record = await db.get(STORE_NAME, id);
  return record?.parseResult || null;
} 