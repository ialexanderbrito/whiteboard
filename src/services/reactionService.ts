import { ref, set, remove, onChildAdded, query, limitToLast } from 'firebase/database';
import { auth, rtdb, isFirebaseConfigured } from '../config/firebase';

export interface GlobalReactionEvent {
  id: string;
  userId?: string;
  emoji: string;
  reaction?: string;
  userName: string;
  timestamp: number;
  originX?: number;
  originY?: number;
}

// Ouvintes locais e canais por quadro
const localListeners = new Map<string, Set<(event: GlobalReactionEvent) => void>>();
const broadcastChannels = new Map<string, BroadcastChannel>();

// Conjunto para deduplicação de eventos (evita disparos duplos quando o RTDB retorna o próprio evento)
const seenEventIds = new Set<string>();

// Controle de throttle para envios de rede no RTDB (mantém feedback local em 0ms sem saturar WebSockets de colegas em PCs fracos)
const NETWORK_MIN_INTERVAL_MS = 180;
const lastNetworkSendAt = new Map<string, number>();
const pendingNetworkEvents = new Map<string, { boardId: string; event: GlobalReactionEvent }>();
const pendingNetworkTimers = new Map<string, ReturnType<typeof setTimeout>>();
const presenceCleanupTimers = new Map<string, ReturnType<typeof setTimeout>>();

function getBroadcastChannel(boardId: string): BroadcastChannel | null {
  if (typeof window === 'undefined' || !window.BroadcastChannel) return null;
  if (!broadcastChannels.has(boardId)) {
    try {
      const ch = new BroadcastChannel(`mirio_reactions_${boardId}`);
      ch.onmessage = (e) => {
        if (e.data && e.data.id) {
          dispatchReaction(boardId, e.data);
        }
      };
      broadcastChannels.set(boardId, ch);
    } catch {
      return null;
    }
  }
  return broadcastChannels.get(boardId) || null;
}

function dispatchReaction(boardId: string, event: GlobalReactionEvent): void {
  if (!event || !event.id) return;
  if (seenEventIds.has(event.id)) return;

  seenEventIds.add(event.id);

  // Mantém o conjunto de deduplicação leve (máx 300 IDs)
  if (seenEventIds.size > 300) {
    const oldestId = seenEventIds.values().next().value;
    if (oldestId) seenEventIds.delete(oldestId);
  }

  const normalized: GlobalReactionEvent = {
    ...event,
    emoji: event.emoji || event.reaction || '👍',
  };

  const listeners = localListeners.get(boardId);
  if (listeners && listeners.size > 0) {
    listeners.forEach((cb) => {
      try {
        cb(normalized);
      } catch (err) {
        console.warn('Erro ao processar listener de reação:', err);
      }
    });
  }
}

function flushReactionToRtdb(boardId: string, event: GlobalReactionEvent): void {
  const uid = auth?.currentUser?.uid;
  if (!isFirebaseConfigured || !rtdb || !uid) return;

  const presenceKey = `${boardId}_${uid}`;
  lastNetworkSendAt.set(boardId, Date.now());

  try {
    const userReactionRef = ref(rtdb, `presence/${boardId}/${uid}/reaction`);
    const presenceEvent = {
      id: event.id,
      emoji: event.emoji,
      userName: event.userName || 'Anônimo',
      timestamp: event.timestamp,
      ...(event.originX !== undefined ? { originX: event.originX } : {}),
      ...(event.originY !== undefined ? { originY: event.originY } : {}),
    };
    set(userReactionRef, presenceEvent).catch(() => {});

    // Único timer deduplicado de limpeza da presença (evita empilhar dezenas de removes no RTDB)
    const prevTimer = presenceCleanupTimers.get(presenceKey);
    if (prevTimer) clearTimeout(prevTimer);
    const cleanupTimer = setTimeout(() => {
      presenceCleanupTimers.delete(presenceKey);
      remove(userReactionRef).catch(() => {});
    }, 4500);
    presenceCleanupTimers.set(presenceKey, cleanupTimer);
  } catch (err) {
    console.warn('Erro ao atualizar presença com reação:', err);
  }

  try {
    const eventRef = ref(rtdb, `global_reactions/${boardId}/${event.id}`);
    set(eventRef, event).catch(() => {});

    setTimeout(() => {
      remove(eventRef).catch(() => {});
    }, 6500);
  } catch {
    // ignora se regras bloquearem nó separado
  }
}

export const reactionService = {
  dispatchReaction,
  subscribeReactions(
    boardId: string,
    callback: (event: GlobalReactionEvent) => void
  ): () => void {
    if (!localListeners.has(boardId)) {
      localListeners.set(boardId, new Set());
    }
    localListeners.get(boardId)!.add(callback);

    // Inicializa canal persistente de abas locais
    getBroadcastChannel(boardId);

    let unsubscribeRtdb: (() => void) | null = null;

    if (isFirebaseConfigured && rtdb) {
      try {
        const reactionsRef = query(ref(rtdb, `global_reactions/${boardId}`), limitToLast(16));
        const subscribeStartTime = Date.now() - 2000;

        unsubscribeRtdb = onChildAdded(
          reactionsRef,
          (snapshot) => {
            if (snapshot.exists()) {
              const val = snapshot.val() as GlobalReactionEvent;
              if (val && typeof val.timestamp === 'number') {
                if (val.timestamp >= subscribeStartTime) {
                  dispatchReaction(boardId, {
                    ...val,
                    id: val.id || snapshot.key || `${val.timestamp}`,
                    emoji: val.emoji || val.reaction || '👍',
                  });
                }
              }
            }
          },
          (err) => {
            console.warn('RTDB reactions child listener error:', err.message);
          }
        );
      } catch (err) {
        console.warn('Erro ao conectar ao RTDB de reações:', err);
      }
    }

    return () => {
      localListeners.get(boardId)?.delete(callback);
      if (localListeners.get(boardId)?.size === 0) {
        localListeners.delete(boardId);
        const ch = broadcastChannels.get(boardId);
        if (ch) {
          ch.close();
          broadcastChannels.delete(boardId);
        }
      }
      if (unsubscribeRtdb) unsubscribeRtdb();
    };
  },

  async triggerReaction(
    boardId: string,
    emoji: string,
    userName: string,
    origin?: { x: number; y: number }
  ): Promise<void> {
    const now = Date.now();
    const eventId = `${now}_${Math.random().toString(36).substring(2, 9)}`;
    const uid = auth?.currentUser?.uid;

    const event: GlobalReactionEvent = {
      id: eventId,
      ...(uid ? { userId: uid } : {}),
      emoji,
      reaction: emoji,
      userName: userName || 'Anônimo',
      timestamp: now,
      ...(origin?.x !== undefined ? { originX: Math.round(origin.x) } : {}),
      ...(origin?.y !== undefined ? { originY: Math.round(origin.y) } : {}),
    };

    // 1. Disparo local imediato (latência zero no client do remetente)
    dispatchReaction(boardId, event);

    // 2. Broadcast para abas locais via canal persistente
    try {
      const ch = getBroadcastChannel(boardId);
      ch?.postMessage(event);
    } catch {
      // ignora
    }

    // 3. Sincronização em tempo real no RTDB com coalescência inteligente de rajadas
    const lastSent = lastNetworkSendAt.get(boardId) || 0;
    const elapsed = now - lastSent;
    if (elapsed >= NETWORK_MIN_INTERVAL_MS) {
      const pendingTimer = pendingNetworkTimers.get(boardId);
      if (pendingTimer) {
        clearTimeout(pendingTimer);
        pendingNetworkTimers.delete(boardId);
        pendingNetworkEvents.delete(boardId);
      }
      flushReactionToRtdb(boardId, event);
    } else {
      pendingNetworkEvents.set(boardId, { boardId, event });
      if (!pendingNetworkTimers.has(boardId)) {
        const waitMs = Math.max(30, NETWORK_MIN_INTERVAL_MS - elapsed);
        const timer = setTimeout(() => {
          pendingNetworkTimers.delete(boardId);
          const pending = pendingNetworkEvents.get(boardId);
          pendingNetworkEvents.delete(boardId);
          if (pending) {
            flushReactionToRtdb(pending.boardId, pending.event);
          }
        }, waitMs);
        pendingNetworkTimers.set(boardId, timer);
      }
    }
  },
};
