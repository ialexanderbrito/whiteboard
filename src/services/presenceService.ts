import { 
  ref, 
  set, 
  update, 
  remove, 
  onValue, 
  onDisconnect, 
  serverTimestamp 
} from 'firebase/database';
import { rtdb, isFirebaseConfigured } from '../config/firebase';
import type { CurrentUser, UserPresence } from '../types/board';

export const presenceService = {
  joinBoard(
    boardId: string, 
    user: CurrentUser, 
    onPresenceUpdate: (users: UserPresence[]) => void
  ): {
    updateCursor: (x: number, y: number) => void;
    updateSelection: (elementId: string | null) => void;
    leaveBoard: () => void;
  } {
    let lastCursorUpdate = 0;
    const THROTTLE_MS = 35; // ~30 fps para cursores fluidos

    if (!isFirebaseConfigured || !rtdb) {
      // Fallback BroadcastChannel para testar cursores entre abas locais
      const channel = new BroadcastChannel(`mirio_presence_${boardId}`);
      let localUsers: Record<string, UserPresence> = {};

      const broadcastState = (cursor: { x: number; y: number } | null, selectedElementId: string | null) => {
        const payload: UserPresence = {
          userId: user.uid,
          name: user.displayName,
          color: user.color,
          cursor,
          selectedElementId,
          lastSeen: Date.now(),
        };
        localUsers[user.uid] = payload;
        channel.postMessage({ type: 'presence', data: payload });
        onPresenceUpdate(Object.values(localUsers).filter(u => u.userId !== user.uid));
      };

      channel.onmessage = (event) => {
        if (event.data?.type === 'presence') {
          const remote = event.data.data as UserPresence;
          localUsers[remote.userId] = remote;
          // Limpa usuários inativos após 15 segundos
          const now = Date.now();
          Object.keys(localUsers).forEach(id => {
            if (now - localUsers[id].lastSeen > 15000) {
              delete localUsers[id];
            }
          });
          onPresenceUpdate(Object.values(localUsers).filter(u => u.userId !== user.uid));
        } else if (event.data?.type === 'leave') {
          delete localUsers[event.data.userId];
          onPresenceUpdate(Object.values(localUsers).filter(u => u.userId !== user.uid));
        }
      };

      // Anuncia entrada
      broadcastState(null, null);

      return {
        updateCursor: (x: number, y: number) => {
          const now = Date.now();
          if (now - lastCursorUpdate >= THROTTLE_MS) {
            lastCursorUpdate = now;
            broadcastState({ x, y }, localUsers[user.uid]?.selectedElementId || null);
          }
        },
        updateSelection: (selectedElementId: string | null) => {
          broadcastState(localUsers[user.uid]?.cursor || null, selectedElementId);
        },
        leaveBoard: () => {
          channel.postMessage({ type: 'leave', userId: user.uid });
          channel.close();
        }
      };
    }

    const userRef = ref(rtdb, `presence/${boardId}/${user.uid}`);
    const boardPresenceRef = ref(rtdb, `presence/${boardId}`);

    const initialData: UserPresence = {
      userId: user.uid,
      name: user.displayName,
      color: user.color,
      cursor: null,
      selectedElementId: null,
      lastSeen: Date.now(),
    };

    // Registra presença e configura remoção automática na desconexão
    set(userRef, initialData);
    onDisconnect(userRef).remove();

    // Escuta todos os usuários conectados na sala
    const unsubscribe = onValue(boardPresenceRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        onPresenceUpdate([]);
        return;
      }
      const activeList: UserPresence[] = Object.values(data);
      // Filtra para exibir apenas outros usuários (exclui o próprio)
      const remoteUsers = activeList.filter((u) => u.userId !== user.uid);
      onPresenceUpdate(remoteUsers);
    });

    return {
      updateCursor: (x: number, y: number) => {
        const now = Date.now();
        if (now - lastCursorUpdate >= THROTTLE_MS) {
          lastCursorUpdate = now;
          update(userRef, {
            cursor: { x, y },
            lastSeen: serverTimestamp(),
          }).catch(() => {});
        }
      },
      updateSelection: (selectedElementId: string | null) => {
        update(userRef, {
          selectedElementId,
          lastSeen: serverTimestamp(),
        }).catch(() => {});
      },
      leaveBoard: () => {
        unsubscribe();
        remove(userRef).catch(() => {});
      }
    };
  }
};
