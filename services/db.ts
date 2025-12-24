import { DocumentData } from '../types';

const DB_NAME = 'SecappDB';
const STORE_NAME = 'documents';
const DB_VERSION = 1;

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => reject((event.target as IDBOpenDBRequest).error);

    request.onsuccess = (event) => resolve((event.target as IDBOpenDBRequest).result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('created_at', 'created_at', { unique: false });
        store.createIndex('statut', 'statut', { unique: false });
      }
    };
  });
};

export const saveDocument = async (doc: DocumentData): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.put(doc);
    
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

export const getAllDocuments = async (): Promise<DocumentData[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const res = request.result as DocumentData[];
      res.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
      resolve(res);
    };
    request.onerror = () => reject(request.error);
  });
};

export const deleteDocument = async (id: string): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.delete(id);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

export const getDocument = async (id: string): Promise<DocumentData | undefined> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// Helper for generating IDs safely in any environment
const safeGenerateId = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        try {
            return crypto.randomUUID();
        } catch (e) {
            // Fallback
        }
    }
    return `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

export const restoreBackup = async (backupData: any[]): Promise<number> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      // 1. Start Transaction
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      let successCount = 0;

      // 2. Define Transaction Handlers FIRST
      transaction.oncomplete = () => {
          console.log(`Transaction complete. Restored: ${successCount}`);
          resolve(successCount);
      };
      
      transaction.onerror = (e) => {
          console.error("Transaction failed completely", e);
          reject(transaction.error);
      };

      if (!Array.isArray(backupData) || backupData.length === 0) {
          resolve(0);
          return;
      }

      // 3. Loop and Insert
      backupData.forEach(rawDoc => {
          try {
              if (!rawDoc || typeof rawDoc !== 'object') return;

              // Generate ID if missing
              const docId = rawDoc.id ? String(rawDoc.id) : safeGenerateId();

              // Sanitize heavily
              const safeDoc = {
                  ...rawDoc,
                  id: docId,
                  // Ensure created_at is a number
                  created_at: Number(rawDoc.created_at) || Date.now(),
                  // Defaults
                  objet: rawDoc.objet || "Sans objet (Restauré)",
                  statut: rawDoc.statut || "En cours",
                  // Ensure image is string
                  document_image: (typeof rawDoc.document_image === 'string') ? rawDoc.document_image : "",
                  mimeType: rawDoc.mimeType || "image/jpeg"
              };

              store.put(safeDoc);
              successCount++;
          } catch (err) {
              console.error("Failed to restore single doc", rawDoc, err);
              // Do NOT reject here, continue with other docs
          }
      });
    });
};