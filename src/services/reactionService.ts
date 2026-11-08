import { ref, set, remove, onChildAdded } from 'firebase/database';
import { auth, rtdb, isFirebaseConfigured } from '../config/firebase';

export interface GlobalReactionEvent {
  id: string;
  emoji: string;
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

  const listeners = localListeners.get(boardId);
  if (listeners && listeners.size > 0) {
    listeners.forEach((cb) => {
      try {
        cb(event);
      } catch (err) {
        console.warn('Erro ao processar listener de reação:', err);
      }
    });
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
        const reactionsRef = ref(rtdb, `global_reactions/${boardId}`);
        // Considera apenas reações disparadas a partir de 2 segundos antes do momento da conexão
        const subscribeStartTime = Date.now() - 2000;

        unsubscribeRtdb = onChildAdded(
          reactionsRef,
          (snapshot) => {
            if (snapshot.exists()) {
              const val = snapshot.val() as GlobalReactionEvent;
              if (val && typeof val.timestamp === 'number') {
                if (val.timestamp >= subscribeStartTime) {
                  dispatchReaction(boardId, val);
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
    const eventId = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const event: GlobalReactionEvent = {
      id: eventId,
      emoji,
      userName: userName || 'Anônimo',
      timestamp: Date.now(),
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

    // 3. Sincronização em tempo real via Presence no RTDB (comprovadamente permitido pelas regras do Firebase)
    if (isFirebaseConfigured && rtdb) {
      const uid = auth?.currentUser?.uid;
      if (uid) {
        try {
          const userReactionRef = ref(rtdb, `presence/${boardId}/${uid}/reaction`);
          set(userReactionRef, event).catch(() => {});
        } catch (err) {
          console.warn('Erro ao atualizar presença com reação:', err);
        }
      }

      // 4. Canal de contingência em global_reactions
      try {
        const eventRef = ref(rtdb, `global_reactions/${boardId}/${eventId}`);
        set(eventRef, event).catch(() => {});

        setTimeout(() => {
          remove(eventRef).catch(() => {});
        }, 8000);
      } catch {
        // ignora se regras bloquearem nó separado
      }
    }
  },
};
