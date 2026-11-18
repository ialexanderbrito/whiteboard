import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  deleteField,
  arrayUnion,
  arrayRemove,
  writeBatch,
  onSnapshot 
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../config/firebase';
import type { CanvasElement } from '../types/element';
import {
  deserializeElementFromFirestore,
  serializeElementForFirestore,
  serializeForFirestoreValue,
} from '../utils/tableAndKanban';

const getLocalKey = (boardId: string) => `mirio_board_elements_${boardId.replace(/^board_/, '')}`;

// Cache em memória de alta performance para zero delay
const memoryCache = new Map<string, CanvasElement[]>();

// Mapa de inscritos locais na aba atual para cada boardId
const boardSubscribers = new Map<string, Set<(elements: CanvasElement[]) => void>>();

// Canais de transmissão ativos por board
const broadcastChannels = new Map<string, BroadcastChannel>();

// Funções de cancelamento ativas (garante limpeza de onSnapshot antigos durante Vite HMR)
const activeUnsubscribers = new Set<() => void>();

/**
 * Limpa recursivamente valores `undefined` para gravações completas (`setDoc` / `batch.set`).
 */
function cleanFirestoreSetData<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== undefined)
      .map((item) => cleanFirestoreSetData(item)) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) {
        out[k] = cleanFirestoreSetData(v);
      }
    }
    return out as T;
  }
  return value;
}

/**
 * Prepara payload parcial para `updateDoc` / `batch.update`:
 * - Chaves explicitamente passadas como `undefined` são convertidas em `deleteField()`
 * - Campos com arrays aninhados (como `tableData: string[][]`) são serializados em objetos compatíveis com o Firestore
 */
function prepareFirestoreUpdateData(data: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) {
      result[key] = deleteField();
    } else {
      result[key] = serializeForFirestoreValue(value, key);
    }
  }
  return result;
}

/**
 * Aplica atualizações parciais em um elemento em memória removendo chaves definidas como `undefined`.
 */
function mergeElementInMemory(existing: CanvasElement, updates: Partial<CanvasElement> & { updatedAt: number }): CanvasElement {
  const merged: Record<string, unknown> = { ...existing };
  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined) {
      delete merged[key];
    } else {
      merged[key] = value;
    }
  }
  return merged as unknown as CanvasElement;
}

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

function cleanupBroadcastChannelIfUnused(boardId: string) {
  const subs = boardSubscribers.get(boardId);
  if (!subs || subs.size === 0) {
    boardSubscribers.delete(boardId);
    const ch = broadcastChannels.get(boardId);
    if (ch) {
      try {
        ch.close();
      } catch {}
      broadcastChannels.delete(boardId);
    }
  }
}

// Margem de segurança abaixo do limite estrito de 500 operações por writeBatch no Firestore
const MAX_BATCH_SIZE = 400;
// Limite seguro de bytes aproximados por lote (evita estourar 10 MiB do Firestore com múltiplas imagens Base64)
const MAX_BATCH_BYTES = 7_500_000;

function chunkOperationsBySize<T>(items: T[], estimateBytes: (item: T) => number): T[][] {
  const chunks: T[][] = [];
  let currentChunk: T[] = [];
  let currentBytes = 0;

  for (const item of items) {
    const itemBytes = estimateBytes(item);
    if (
      currentChunk.length >= MAX_BATCH_SIZE ||
      (currentChunk.length > 0 && currentBytes + itemBytes > MAX_BATCH_BYTES)
    ) {
      chunks.push(currentChunk);
      currentChunk = [];
      currentBytes = 0;
    }
    currentChunk.push(item);
    currentBytes += itemBytes;
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }
  return chunks;
}

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
    const rawList: Array<Record<string, unknown>> = raw ? JSON.parse(raw) : [];
    const parsed: CanvasElement[] = Array.isArray(rawList)
      ? rawList.map((item, idx) =>
          deserializeElementFromFirestore(String(item?.id || `elem_${idx}`), item || {})
        )
      : [];
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
  clearMemoryCache(rawBoardId: string): void {
    const boardId = rawBoardId.replace(/^board_/, '');
    memoryCache.delete(boardId);
    const timer = persistTimers.get(boardId);
    if (timer) {
      clearTimeout(timer);
      persistTimers.delete(boardId);
    }
  },

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
    let handleChannelMessage: ((event: MessageEvent) => void) | null = null;
    if (channel) {
      handleChannelMessage = (event: MessageEvent) => {
        if (event.data?.type === 'sync' && Array.isArray(event.data.elements)) {
          const normalized = event.data.elements.map(
            (item: Record<string, unknown>, idx: number) =>
              deserializeElementFromFirestore(String(item?.id || `elem_${idx}`), item || {})
          );
          memoryCache.set(boardId, normalized);
          callback(normalized);
        } else {
          callback(getCachedElements(boardId));
        }
      };
      channel.addEventListener('message', handleChannelMessage);
    }

    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === getLocalKey(boardId) && e.newValue) {
        try {
          const rawParsed = JSON.parse(e.newValue);
          const parsed: CanvasElement[] = Array.isArray(rawParsed)
            ? rawParsed.map((item: Record<string, unknown>, idx: number) =>
                deserializeElementFromFirestore(String(item?.id || `elem_${idx}`), item || {})
              )
            : [];
          memoryCache.set(boardId, parsed);
          callback(parsed);
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorageEvent);

    if (!isFirebaseConfigured || !db) {
      const cleanupLocal = () => {
        activeUnsubscribers.delete(cleanupLocal);
        boardSubscribers.get(boardId)?.delete(callback);
        window.removeEventListener('storage', handleStorageEvent);
        if (channel && handleChannelMessage) {
          channel.removeEventListener('message', handleChannelMessage);
        }
        cleanupBroadcastChannelIfUnused(boardId);
      };
      activeUnsubscribers.add(cleanupLocal);
      return cleanupLocal;
    }

    // Escuta em tempo real no Firestore se configurado
    const elementsRef = collection(db, 'boards', boardId, 'elements');
    const unsubscribeFirestore = onSnapshot(
      elementsRef,
      (snapshot) => {
        const prevList = memoryCache.get(boardId) || [];
        const prevById = new Map(prevList.map((el) => [el.id, el]));
        let anyChanged = snapshot.docs.length !== prevList.length;

        const elements: CanvasElement[] = snapshot.docs.map((docSnap, idx) => {
          const restored = deserializeElementFromFirestore(
            docSnap.id,
            docSnap.data() as Record<string, unknown>
          );
          const prevEl = prevById.get(docSnap.id);
          if (
            prevEl &&
            prevEl.updatedAt === restored.updatedAt &&
            JSON.stringify(prevEl) === JSON.stringify(restored)
          ) {
            if (prevList[idx]?.id !== docSnap.id) {
              anyChanged = true;
            }
            return prevEl;
          }
          anyChanged = true;
          return restored;
        });

        if (!anyChanged && prevList.length > 0) {
          return;
        }
        persistElements(boardId, elements);
        callback(elements);
      },
      (error) => {
        console.warn('Escuta do Firestore com aviso (mantendo cache local):', error.message);
        callback(getCachedElements(boardId));
      }
    );

    const cleanupAll = () => {
      activeUnsubscribers.delete(cleanupAll);
      boardSubscribers.get(boardId)?.delete(callback);
      window.removeEventListener('storage', handleStorageEvent);
      if (channel && handleChannelMessage) {
        channel.removeEventListener('message', handleChannelMessage);
      }
      unsubscribeFirestore();
      cleanupBroadcastChannelIfUnused(boardId);
    };
    activeUnsubscribers.add(cleanupAll);
    return cleanupAll;
  },

  async addElement(rawBoardId: string, element: Omit<CanvasElement, 'id' | 'updatedAt'> & { id?: string }): Promise<string> {
    const boardId = rawBoardId.replace(/^board_/, '');
    const elementId = element.id || 'elem_' + Math.random().toString(36).substring(2, 11);
    const fullElement = cleanFirestoreSetData({
      ...element,
      id: elementId,
      updatedAt: Date.now(),
    }) as CanvasElement;

    const current = [...getCachedElements(boardId)];
    const existingIndex = current.findIndex((e) => e.id === elementId);
    if (existingIndex >= 0) {
      current[existingIndex] = fullElement;
    } else {
      current.push(fullElement);
    }

    persistElements(boardId, current);
    notifySubscribers(boardId, current);

    // Persiste no Firestore (serializa arrays 2D como tableData para evitar erro "Nested arrays are not supported")
    if (isFirebaseConfigured && db) {
      try {
        const docRef = doc(db, 'boards', boardId, 'elements', elementId);
        await setDoc(docRef, serializeElementForFirestore(fullElement));
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
    const fullElements: CanvasElement[] = elementsList.map((el) =>
      cleanFirestoreSetData({
        ...el,
        id: el.id || 'elem_' + Math.random().toString(36).substring(2, 11),
        updatedAt: now,
      }) as CanvasElement
    );

    const current = [...getCachedElements(boardId), ...fullElements];
    persistElements(boardId, current);
    notifySubscribers(boardId, current);

    if (isFirebaseConfigured && db) {
      try {
        const chunks = chunkOperationsBySize(fullElements, (el) => JSON.stringify(el).length + 256);
        for (const chunk of chunks) {
          const batch = writeBatch(db);
          chunk.forEach((el) => {
            const docRef = doc(db!, 'boards', boardId, 'elements', el.id);
            batch.set(docRef, serializeElementForFirestore(el));
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
      current[idx] = mergeElementInMemory(current[idx], payload);
      persistElements(boardId, current);
      notifySubscribers(boardId, current);
    }

    if (isFirebaseConfigured && db) {
      try {
        const docRef = doc(db, 'boards', boardId, 'elements', elementId);
        await updateDoc(docRef, prepareFirestoreUpdateData(payload));
      } catch (err) {
        console.warn('Erro ao atualizar elemento no Firestore:', err);
      }
    }
  },

  async toggleElementReaction(
    rawBoardId: string,
    elementId: string,
    reactionKey: string,
    userId: string,
    shouldAdd: boolean,
    fallbackReactions: Record<string, string[]>,
    legacyKeyToRemove?: string
  ): Promise<void> {
    const boardId = rawBoardId.replace(/^board_/, '');
    const now = Date.now();

    const current = [...getCachedElements(boardId)];
    const idx = current.findIndex((e) => e.id === elementId);
    if (idx !== -1) {
      current[idx] = {
        ...current[idx],
        reactions: fallbackReactions,
        updatedAt: now,
      };
      persistElements(boardId, current);
      notifySubscribers(boardId, current);
    }

    if (isFirebaseConfigured && db) {
      try {
        const docRef = doc(db, 'boards', boardId, 'elements', elementId);
        const atomicPayload: Record<string, unknown> = {
          [`reactions.${reactionKey}`]: shouldAdd ? arrayUnion(userId) : arrayRemove(userId),
          updatedAt: now,
        };
        if (legacyKeyToRemove && legacyKeyToRemove !== reactionKey && !/[.~*/[\]]/.test(legacyKeyToRemove)) {
          atomicPayload[`reactions.${legacyKeyToRemove}`] = deleteField();
        }
        await updateDoc(docRef, atomicPayload);
      } catch (err) {
        console.warn('Erro ao atualizar reação atômica no Firestore:', err);
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
        current[i] = mergeElementInMemory(current[i], { ...up, updatedAt: now });
      }
    }
    persistElements(boardId, current);
    notifySubscribers(boardId, current);

    if (isFirebaseConfigured && db) {
      try {
        const chunks = chunkOperationsBySize(
          updatesList,
          (u) => JSON.stringify(u.updates || {}).length + 256
        );
        for (const chunk of chunks) {
          const batch = writeBatch(db);
          chunk.forEach(({ id, updates: elemUpdates }) => {
            const docRef = doc(db!, 'boards', boardId, 'elements', id);
            batch.update(docRef, prepareFirestoreUpdateData({ ...elemUpdates, updatedAt: now }));
          });
          await batch.commit();
        }
      } catch (err) {
        console.warn('Erro ao atualizar elementos em lote no Firestore:', err);
      }
    }
  }
};

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    Array.from(activeUnsubscribers).forEach((fn) => {
      try {
        fn();
      } catch {}
    });
    activeUnsubscribers.clear();
  });
}
