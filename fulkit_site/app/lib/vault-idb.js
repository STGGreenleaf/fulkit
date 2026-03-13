// IndexedDB wrapper for Model A directory handle persistence + sandbox chapters

const DB_NAME = "fulkit-vault";
const DB_VERSION = 2;
const STORE = "handles";
const SANDBOX_STORE = "sandbox-chapters";
const KEY = "vault-directory";

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = request.result;
      // v1: handles store
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
      // v2: sandbox-chapters store (keyPath = sandboxId+chapterId)
      if (!db.objectStoreNames.contains(SANDBOX_STORE)) {
        const store = db.createObjectStore(SANDBOX_STORE, { autoIncrement: true });
        store.createIndex("sandboxId", "sandboxId", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveHandle(handle) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(handle, KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getHandle() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).get(KEY);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function clearHandle() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ─── Sandbox chapter persistence ─────────────────────────────

export async function saveChapter(sandboxId, chapter) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SANDBOX_STORE, "readwrite");
    tx.objectStore(SANDBOX_STORE).add({ sandboxId, ...chapter });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadChapters(sandboxId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SANDBOX_STORE, "readonly");
    const index = tx.objectStore(SANDBOX_STORE).index("sandboxId");
    const request = index.getAll(sandboxId);
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function clearSandbox(sandboxId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SANDBOX_STORE, "readwrite");
    const store = tx.objectStore(SANDBOX_STORE);
    const index = store.index("sandboxId");
    const request = index.openCursor(sandboxId);
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
