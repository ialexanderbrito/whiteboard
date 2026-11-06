import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../config/firebase';
import type { CanvasElement } from '../types/element';

const getLocalKey = (boardId: string) => `mirio_board_elements_${boardId}`;

export const elementService = {
  subscribeElements(boardId: string, callback: (elements: CanvasElement[]) => void): () => void {
    if (!isFirebaseConfigured || !db) {
      const channel = new BroadcastChannel(`mirio_elements_${boardId}`);
      const load = () => {
        const local = JSON.parse(localStorage.getItem(getLocalKey(boardId)) || '[]');
        callback(local);
      };
      load();

      channel.onmessage = () => load();
      window.addEventListener('storage', load);

      return () => {
        channel.close();
        window.removeEventListener('storage', load);
      };
    }

    const elementsRef = collection(db, 'boards', boardId, 'elements');
    return onSnapshot(elementsRef, (snapshot) => {
      const elements: CanvasElement[] = snapshot.docs.map(
        (docSnap) => ({ id: docSnap.id, ...docSnap.data() } as CanvasElement)
      );
      callback(elements);
    }, (error) => {
      console.error('Erro ao escutar elementos do Firestore:', error);
    });
  },

  async addElement(boardId: string, element: Omit<CanvasElement, 'id' | 'updatedAt'>): Promise<string> {
    const elementId = 'elem_' + Math.random().toString(36).substring(2, 11);
    const fullElement: CanvasElement = {
      ...element,
      id: elementId,
      updatedAt: Date.now(),
    };

    if (!isFirebaseConfigured || !db) {
      const key = getLocalKey(boardId);
      const local: CanvasElement[] = JSON.parse(localStorage.getItem(key) || '[]');
      local.push(fullElement);
      localStorage.setItem(key, JSON.stringify(local));
      const channel = new BroadcastChannel(`mirio_elements_${boardId}`);
      channel.postMessage('update');
      channel.close();
      return elementId;
    }

    const docRef = doc(db, 'boards', boardId, 'elements', elementId);
    await setDoc(docRef, fullElement);
    return elementId;
  },

  async updateElement(boardId: string, elementId: string, updates: Partial<CanvasElement>): Promise<void> {
    const payload = {
      ...updates,
      updatedAt: Date.now(),
    };

    if (!isFirebaseConfigured || !db) {
      const key = getLocalKey(boardId);
      const local: CanvasElement[] = JSON.parse(localStorage.getItem(key) || '[]');
      const idx = local.findIndex(e => e.id === elementId);
      if (idx !== -1) {
        local[idx] = { ...local[idx], ...payload };
        localStorage.setItem(key, JSON.stringify(local));
        const channel = new BroadcastChannel(`mirio_elements_${boardId}`);
        channel.postMessage('update');
        channel.close();
      }
      return;
    }

    const docRef = doc(db, 'boards', boardId, 'elements', elementId);
    await updateDoc(docRef, payload);
  },

  async deleteElement(boardId: string, elementId: string): Promise<void> {
    if (!isFirebaseConfigured || !db) {
      const key = getLocalKey(boardId);
      const local: CanvasElement[] = JSON.parse(localStorage.getItem(key) || '[]');
      const filtered = local.filter(e => e.id !== elementId);
      localStorage.setItem(key, JSON.stringify(filtered));
      const channel = new BroadcastChannel(`mirio_elements_${boardId}`);
      channel.postMessage('update');
      channel.close();
      return;
    }

    const docRef = doc(db, 'boards', boardId, 'elements', elementId);
    await deleteDoc(docRef);
  },

  async batchDeleteElements(boardId: string, elementIds: string[]): Promise<void> {
    if (elementIds.length === 0) return;
    await Promise.all(elementIds.map(id => this.deleteElement(boardId, id)));
  }
};
