import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  writeBatch,
  onSnapshot 
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../config/firebase';
import type { CanvasElement } from '../types/element';

const getLocalKey = (boardId: string) => `mirio_board_elements_${boardId.replace(/^board_/, '')}`;

// Cache em memória de alta performance para zero delay
const memoryCache = new Map<string, CanvasElement[]>();

// Mapa de inscritos locais na aba atual para cada boardId
const boardSubscribers = new Map<string, Set<(elements: CanvasElement[]) => void>>();

// Canais de transmissão ativos por board
const broadcastChannels = new Map<string, BroadcastChannel>();

function getBroadcastChannel(rawBoardId: string): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null;
  const boardId = rawBoardId.replace(/^board_/, '');
  if (!broadcastChannels.has(boardId)) {
    try {
      const channel = new BroadcastChannel(`mirio_elements_${boardId}`);
      broadcastChannels.set(boardId, channel);
    } catch {
      return null;
    }
  }
  return broadcastChannels.get(boardId) || null;
}

// Margem de segurança abaixo do limite estrito de 500 operações por writeBatch no Firestore
const MAX_BATCH_SIZE = 400;

// Temporizadores de debounce para persistência em localStorage (evita congelamento da thread principal)
const persistTimers = new Map<string, ReturnType<typeof setTimeout>>();

function getCachedElements(rawBoardId: string): CanvasElement[] {
  const boardId = rawBoardId.replace(/^board_/, '');
  if (memoryCache.has(boardId)) {
    return memoryCache.get(boardId)!;
  }
  // Se o Firebase estiver ativo, o Firestore onSnapshot carregará direto do IndexedDB (0ms)
  if (isFirebaseConfigured && db) {
    return [];
  }
  try {
    let raw = localStorage.getItem(getLocalKey(boardId));
    if (!raw) {
      // Fallback para chave antiga com prefixo board_
      raw = localStorage.getItem(`mirio_board_elements_board_${boardId}`);
      if (raw) {
        localStorage.setItem(getLocalKey(boardId), raw);
      }
    }
    const parsed: CanvasElement[] = raw ? JSON.parse(raw) : [];
    memoryCache.set(boardId, parsed);
    return parsed;
  } catch {
    return [];
  }
}

function persistElements(rawBoardId: string, elements: CanvasElement[]) {
  const boardId = rawBoardId.replace(/^board_/, '');
  // Atualiza cache em memória instantaneamente (0ms de atraso na interface)
  memoryCache.set(boardId, elements);

  // Quando o Firebase está configurado, o Firestore já persiste os elementos no IndexedDB
  // (persistentLocalCache com persistentMultipleTabManager). Gravar no localStorage duplicaria
  // megabytes de dados e estouraria a cota de 5MB do navegador.
  if (isFirebaseConfigured && db) {
    return;
  }

  // Debounce da gravação em disco para evitar travamentos de I/O em arrastos rápidos (modo offline)
  const existingTimer = persistTimers.get(boardId);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  persistTimers.set(
    boardId,
    setTimeout(() => {
      persistTimers.delete(boardId);
      try {
        localStorage.setItem(getLocalKey(boardId), JSON.stringify(elements));
      } catch (err) {
        // Trata cota excedida de localStorage de forma silenciosa
        console.warn('Armazenamento local do navegador indisponível ou cheio:', err);
      }
    }, 400)
  );
}

function notifySubscribers(rawBoardId: string, elements: CanvasElement[]) {
  const boardId = rawBoardId.replace(/^board_/, '');
  const subs = boardSubscribers.get(boardId);
  if (subs) {
    subs.forEach((cb) => {
      try {
        cb(elements);
      } catch (err) {
        console.error('Erro ao notificar inscrito do board:', err);
      }
    });
  }

  // Notifica outras abas com o payload em memória instantâneo
  const channel = getBroadcastChannel(boardId);
  if (channel) {
    try {
      channel.postMessage({ type: 'sync', elements });
    } catch {}
  }
}

export const elementService = {
  subscribeElements(rawBoardId: string, callback: (elements: CanvasElement[]) => void): () => void {
    const boardId = rawBoardId.replace(/^board_/, '');
    if (!boardSubscribers.has(boardId)) {
      boardSubscribers.set(boardId, new Set());
    }
    boardSubscribers.get(boardId)!.add(callback);

    // Carregamento inicial a partir do cache em memória / local
    const initial = getCachedElements(boardId);
    callback(initial);

    const channel = getBroadcastChannel(boardId);
    if (channel) {
      channel.onmessage = (event) => {
        if (event.data?.type === 'sync' && Array.isArray(event.data.elements)) {
          memoryCache.set(boardId, event.data.elements);
          callback(event.data.elements);
        } else {
          callback(getCachedElements(boardId));
        }
      };
    }

    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === getLocalKey(boardId) && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          memoryCache.set(boardId, parsed);
          callback(parsed);
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorageEvent);

    if (!isFirebaseConfigured || !db) {
      return () => {
        boardSubscribers.get(boardId)?.delete(callback);
        window.removeEventListener('storage', handleStorageEvent);
      };
    }

    // Escuta em tempo real no Firestore se configurado
    const elementsRef = collection(db, 'boards', boardId, 'elements');
    const unsubscribeFirestore = onSnapshot(
      elementsRef,
      (snapshot) => {
        const elements: CanvasElement[] = snapshot.docs.map(
          (docSnap) => ({ id: docSnap.id, ...docSnap.data() } as CanvasElement)
        );
        persistElements(boardId, elements);
        callback(elements);
      },
      (error) => {
        console.warn('Escuta do Firestore com aviso (mantendo cache local):', error.message);
        callback(getCachedElements(boardId));
      }
    );

    return () => {
      boardSubscribers.get(boardId)?.delete(callback);
      window.removeEventListener('storage', handleStorageEvent);
      unsubscribeFirestore();
    };
  },

  async addElement(rawBoardId: string, element: Omit<CanvasElement, 'id' | 'updatedAt'> & { id?: string }): Promise<string> {
    const boardId = rawBoardId.replace(/^board_/, '');
    const elementId = element.id || 'elem_' + Math.random().toString(36).substring(2, 11);
    const fullElement: CanvasElement = {
      ...element,
      id: elementId,
      updatedAt: Date.now(),
    };

    const current = [...getCachedElements(boardId)];
    const existingIndex = current.findIndex((e) => e.id === elementId);
    if (existingIndex >= 0) {
      current[existingIndex] = fullElement;
    } else {
      current.push(fullElement);
    }

    persistElements(boardId, current);
    notifySubscribers(boardId, current);

    // Persiste no Firestore
    if (isFirebaseConfigured && db) {
      try {
        const docRef = doc(db, 'boards', boardId, 'elements', elementId);
        await setDoc(docRef, fullElement);
      } catch (err) {
        console.warn('Erro ao sincronizar novo elemento no Firestore (persistido localmente):', err);
      }
    }

    return elementId;
  },

  async batchAddElements(
    rawBoardId: string, 
    elementsList: (Omit<CanvasElement, 'id' | 'updatedAt'> & { id?: string })[]
  ): Promise<string[]> {
    const boardId = rawBoardId.replace(/^board_/, '');
    if (elementsList.length === 0) return [];

    const now = Date.now();
    const fullElements: CanvasElement[] = elementsList.map((el) => ({
      ...el,
      id: el.id || 'elem_' + Math.random().toString(36).substring(2, 11),
      updatedAt: now,
    }));

    const current = [...getCachedElements(boardId), ...fullElements];
    persistElements(boardId, current);
    notifySubscribers(boardId, current);

    if (isFirebaseConfigured && db) {
      try {
        for (let i = 0; i < fullElements.length; i += MAX_BATCH_SIZE) {
          const chunk = fullElements.slice(i, i + MAX_BATCH_SIZE);
          const batch = writeBatch(db);
          chunk.forEach((el) => {
            const docRef = doc(db!, 'boards', boardId, 'elements', el.id);
            batch.set(docRef, el);
          });
          await batch.commit();
        }
      } catch (err) {
        console.warn('Erro ao inserir elementos em lote no Firestore (persistidos localmente):', err);
      }
    }

    return fullElements.map((e) => e.id);
  },

  async updateElement(rawBoardId: string, elementId: string, updates: Partial<CanvasElement>): Promise<void> {
    const boardId = rawBoardId.replace(/^board_/, '');
    const payload = {
      ...updates,
      updatedAt: Date.now(),
    };

    const current = [...getCachedElements(boardId)];
    const idx = current.findIndex((e) => e.id === elementId);
    if (idx !== -1) {
      current[idx] = { ...current[idx], ...payload };
      persistElements(boardId, current);
      notifySubscribers(boardId, current);
    }

    if (isFirebaseConfigured && db) {
      try {
        const docRef = doc(db, 'boards', boardId, 'elements', elementId);
        await updateDoc(docRef, payload);
      } catch (err) {
        console.warn('Erro ao atualizar elemento no Firestore:', err);
      }
    }
  },

  async deleteElement(rawBoardId: string, elementId: string): Promise<void> {
    const boardId = rawBoardId.replace(/^board_/, '');
    const current = getCachedElements(boardId).filter((e) => e.id !== elementId);
    persistElements(boardId, current);
    notifySubscribers(boardId, current);

    if (isFirebaseConfigured && db) {
      try {
        const docRef = doc(db, 'boards', boardId, 'elements', elementId);
        await deleteDoc(docRef);
      } catch (err) {
        console.warn('Erro ao deletar elemento no Firestore:', err);
      }
    }
  },

  async batchDeleteElements(rawBoardId: string, elementIds: string[]): Promise<void> {
    const boardId = rawBoardId.replace(/^board_/, '');
    if (elementIds.length === 0) return;
    const toDeleteSet = new Set(elementIds);
    const current = getCachedElements(boardId).filter((e) => !toDeleteSet.has(e.id));
    persistElements(boardId, current);
    notifySubscribers(boardId, current);

    if (isFirebaseConfigured && db) {
      try {
        for (let i = 0; i < elementIds.length; i += MAX_BATCH_SIZE) {
          const chunk = elementIds.slice(i, i + MAX_BATCH_SIZE);
          const batch = writeBatch(db);
          chunk.forEach((id) => {
            const docRef = doc(db!, 'boards', boardId, 'elements', id);
            batch.delete(docRef);
          });
          await batch.commit();
        }
      } catch (err) {
        console.warn('Erro ao deletar elementos em lote no Firestore:', err);
      }
    }
  },

  async batchUpdateElements(
    rawBoardId: string,
    updatesList: { id: string; updates: Partial<CanvasElement> }[]
  ): Promise<void> {
    const boardId = rawBoardId.replace(/^board_/, '');
    if (updatesList.length === 0) return;
    const now = Date.now();
    const current = [...getCachedElements(boardId)];
    const updateMap = new Map(updatesList.map((u) => [u.id, u.updates]));

    for (let i = 0; i < current.length; i++) {
      const up = updateMap.get(current[i].id);
      if (up) {
        current[i] = { ...current[i], ...up, updatedAt: now };
      }
    }
    persistElements(boardId, current);
    notifySubscribers(boardId, current);

    if (isFirebaseConfigured && db) {
      try {
        for (let i = 0; i < updatesList.length; i += MAX_BATCH_SIZE) {
          const chunk = updatesList.slice(i, i + MAX_BATCH_SIZE);
          const batch = writeBatch(db);
          chunk.forEach(({ id, updates: elemUpdates }) => {
            const docRef = doc(db!, 'boards', boardId, 'elements', id);
            batch.update(docRef, { ...elemUpdates, updatedAt: now });
          });
          await batch.commit();
        }
      } catch (err) {
        console.warn('Erro ao atualizar elementos em lote no Firestore:', err);
      }
    }
  }
};
