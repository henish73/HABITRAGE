import { doc, setDoc, updateDoc, deleteDoc, collection, addDoc } from 'firebase/firestore';
import { db } from './firebase';
import { queueMutation, getQueuedMutations, clearQueuedMutations } from './offline';

export const safeSetDoc = async (docPath: string, data: any, options?: { merge: boolean }) => {
  if (!navigator.onLine) {
    const parts = docPath.split('/');
    const docId = parts.pop()!;
    const collection = parts.join('/');
    await queueMutation({ collection, docId, data, action: 'set', timestamp: Date.now() });
    return;
  }
  return setDoc(doc(db, docPath), data, options);
};

export const safeUpdateDoc = async (docPath: string, data: any) => {
  if (!navigator.onLine) {
    const parts = docPath.split('/');
    const docId = parts.pop()!;
    const collection = parts.join('/');
    await queueMutation({ collection, docId, data, action: 'update', timestamp: Date.now() });
    return;
  }
  return updateDoc(doc(db, docPath), data);
};

export const safeAddDoc = async (collectionPath: string, data: any) => {
  if (!navigator.onLine) {
    await queueMutation({ collection: collectionPath, docId: crypto.randomUUID(), data, action: 'set', timestamp: Date.now() });
    return;
  }
  return addDoc(collection(db, collectionPath), data);
};

export const flushOfflineQueue = async () => {
  if (!navigator.onLine) return;
  const mutations = await getQueuedMutations();
  if (mutations.length === 0) return;

  console.log(`Flushing ${mutations.length} offline mutations...`);
  for (const m of mutations) {
    try {
      if (m.action === 'set') {
        await setDoc(doc(db, `${m.collection}/${m.docId}`), m.data);
      } else if (m.action === 'update') {
        await updateDoc(doc(db, `${m.collection}/${m.docId}`), m.data);
      }
    } catch (err) {
      console.error("Flush failed for mutation:", m, err);
    }
  }
  await clearQueuedMutations();
};
