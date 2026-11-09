import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { ref, set, onValue } from 'firebase/database';
import { db, rtdb, isFirebaseConfigured } from '../config/firebase';

export interface BoardTimerState {
  durationSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
  startedAt: number | null;
  endsAt: number | null;
  updatedByName?: string;
  youtubeUrl?: string;
  musicEnabled?: boolean;
  volume?: number;
  isOpenForEveryone?: boolean;
  lastAction?: 'start' | 'pause' | 'reset' | 'open' | 'close' | 'add_time' | 'set_duration';
  lastActionTimestamp?: number;
}

const DEFAULT_TIMER: BoardTimerState = {
  durationSeconds: 300,
  remainingSeconds: 300,
  isRunning: false,
  startedAt: null,
  endsAt: null,
  updatedByName: 'Participante',
  youtubeUrl: 'https://www.youtube.com/watch?v=wF2JZZPL7G4', // Lofi Focus oficial
  musicEnabled: false,
  volume: 70,
  isOpenForEveryone: false,
  lastAction: 'start',
  lastActionTimestamp: 0,
};

// Garante que NENHUM campo contenha `undefined`, pois o Firestore rejeita com erro fatal
export function sanitizeTimerState(state: Partial<BoardTimerState>): BoardTimerState {
  return {
    durationSeconds: Number(state.durationSeconds ?? DEFAULT_TIMER.durationSeconds),
    remainingSeconds: Number(state.remainingSeconds ?? DEFAULT_TIMER.remainingSeconds),
    isRunning: Boolean(state.isRunning),
    startedAt: state.startedAt !== undefined && state.startedAt !== null ? Number(state.startedAt) : null,
    endsAt: state.endsAt !== undefined && state.endsAt !== null ? Number(state.endsAt) : null,
    updatedByName: state.updatedByName ? String(state.updatedByName) : 'Participante',
    youtubeUrl: state.youtubeUrl ? String(state.youtubeUrl) : DEFAULT_TIMER.youtubeUrl || '',
    musicEnabled: Boolean(state.musicEnabled),
    volume: typeof state.volume === 'number' ? state.volume : 70,
    isOpenForEveryone: Boolean(state.isOpenForEveryone),
    lastAction: state.lastAction || 'start',
    lastActionTimestamp: state.lastActionTimestamp ? Number(state.lastActionTimestamp) : Date.now(),
  };
}

// Limpa prefixos "board_" para garantir que todos os clientes acessem rigorosamente a mesma chave
function cleanBoardId(rawId: string): string {
  return (rawId || '').replace(/^board_/, '');
}

// Ouvintes locais na mesma aba para resposta imediata
const localListeners = new Map<string, Set<(state: BoardTimerState) => void>>();

function getLocalState(rawBoardId: string): BoardTimerState {
  const boardId = cleanBoardId(rawBoardId);
  try {
    const raw = localStorage.getItem(`mirio_timer_${boardId}`);
    return raw ? sanitizeTimerState(JSON.parse(raw)) : { ...DEFAULT_TIMER };
  } catch {
    return { ...DEFAULT_TIMER };
  }
}

function saveLocalState(rawBoardId: string, state: BoardTimerState) {
  const boardId = cleanBoardId(rawBoardId);
  try {
    localStorage.setItem(`mirio_timer_${boardId}`, JSON.stringify(state));
  } catch {
    // ignora falhas em quota de storage
  }
}

function notifySubscribers(rawBoardId: string, state: BoardTimerState) {
  const boardId = cleanBoardId(rawBoardId);
  const setOfListeners = localListeners.get(boardId);
  if (setOfListeners) {
    setOfListeners.forEach((cb) => {
      try {
        cb(state);
      } catch (err) {
        console.error('Erro no callback do timer:', err);
      }
    });
  }
}

export const timerService = {
  subscribeTimer(
    rawBoardId: string,
    callback: (state: BoardTimerState) => void
  ): () => void {
    const boardId = cleanBoardId(rawBoardId);

    if (!localListeners.has(boardId)) {
      localListeners.set(boardId, new Set());
    }
    localListeners.get(boardId)!.add(callback);

    // Carrega estado inicial imediatamente
    const currentLocal = getLocalState(boardId);
    callback(currentLocal);

    // 1. Canal local para sincronizar abas do mesmo navegador
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(`mirio_timer_${boardId}`);
      channel.onmessage = (e) => {
        if (e.data) {
          const sanitized = sanitizeTimerState(e.data);
          saveLocalState(boardId, sanitized);
          notifySubscribers(boardId, sanitized);
        }
      };
    } catch {
      // BroadcastChannel não suportado em navegadores antigos
    }

    // 2. Ouvinte Primário Firestore (100% garantido entre todos os usuários remotos e abas anônimas/convidados)
    let unsubscribeFirestore: (() => void) | null = null;
    if (isFirebaseConfigured && db) {
      try {
        const boardDocRef = doc(db, 'boards', boardId);
        unsubscribeFirestore = onSnapshot(
          boardDocRef,
          (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.data();
              if (data && data.timer) {
                const val = sanitizeTimerState(data.timer);
                saveLocalState(boardId, val);
                notifySubscribers(boardId, val);
              }
            }
          },
          (err) => {
            console.warn('Ouvinte de timer Firestore:', err.message);
          }
        );
      } catch (err) {
        console.warn('Erro ao conectar ao Firestore do timer:', err);
      }
    }

    // 3. Ouvinte Secundário RTDB (se disponível com regras ativas no projeto)
    let unsubscribeRtdb: (() => void) | null = null;
    if (isFirebaseConfigured && rtdb) {
      try {
        const timerRef = ref(rtdb, `board_timer/${boardId}`);
        unsubscribeRtdb = onValue(
          timerRef,
          (snapshot) => {
            if (snapshot.exists()) {
              const val = sanitizeTimerState(snapshot.val());
              saveLocalState(boardId, val);
              notifySubscribers(boardId, val);
            }
          },
          (error) => {
            // Se permissão negada no RTDB, Firestore garante a sincronização
            if (!error.message.includes('permission_denied')) {
              console.warn('RTDB timer sync fallback para Firestore:', error.message);
            }
          }
        );
      } catch (err) {
        console.warn('Erro ao conectar ao RTDB do timer:', err);
      }
    }

    return () => {
      localListeners.get(boardId)?.delete(callback);
      if (channel) {
        channel.close();
      }
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
      }
      if (unsubscribeRtdb) {
        unsubscribeRtdb();
      }
    };
  },

  async updateTimer(rawBoardId: string, state: Partial<BoardTimerState>): Promise<void> {
    const boardId = cleanBoardId(rawBoardId);
    const cleanState = sanitizeTimerState(state);

    // 1. Atualização Otimista Imediata (zero latência local)
    saveLocalState(boardId, cleanState);
    notifySubscribers(boardId, cleanState);

    // 2. Notifica outras abas locais via BroadcastChannel
    try {
      const channel = new BroadcastChannel(`mirio_timer_${boardId}`);
      channel.postMessage(cleanState);
      channel.close();
    } catch {
      // ignora
    }

    // 3. Sincronização Primária via Firestore (garante compatibilidade total e satisfaz as regras de segurança)
    if (isFirebaseConfigured && db) {
      try {
        const boardDocRef = doc(db, 'boards', boardId);
        await setDoc(
          boardDocRef, 
          { 
            timer: cleanState 
          }, 
          { merge: true }
        );
      } catch (err) {
        console.error('Falha ao persistir timer no Firestore:', err);
      }
    }

    // 4. Sincroniza com Firebase RTDB para menor latência (caso regras estejam habilitadas)
    if (isFirebaseConfigured && rtdb) {
      try {
        const timerRef = ref(rtdb, `board_timer/${boardId}`);
        await set(timerRef, cleanState);
      } catch (err) {
        // Fallback silencioso pois o Firestore já sincronizou com sucesso
      }
    }
  },

  async startTimer(
    rawBoardId: string,
    durationSeconds: number,
    remainingSeconds: number,
    userName?: string,
    youtubeUrl?: string,
    musicEnabled?: boolean
  ): Promise<void> {
    const boardId = cleanBoardId(rawBoardId);
    const currentState = getLocalState(boardId);
    const now = Date.now();
    const endsAt = now + remainingSeconds * 1000;

    await this.updateTimer(boardId, {
      ...currentState,
      durationSeconds,
      remainingSeconds,
      isRunning: true,
      startedAt: now,
      endsAt,
      updatedByName: userName || 'Participante',
      youtubeUrl: youtubeUrl !== undefined ? youtubeUrl : currentState.youtubeUrl,
      musicEnabled: musicEnabled !== undefined ? musicEnabled : currentState.musicEnabled,
      isOpenForEveryone: true,
      lastAction: 'start',
      lastActionTimestamp: now,
    });
  },

  async pauseTimer(
    rawBoardId: string,
    currentRemaining: number,
    durationSeconds: number,
    userName?: string
  ): Promise<void> {
    const boardId = cleanBoardId(rawBoardId);
    const currentState = getLocalState(boardId);
    const now = Date.now();
    await this.updateTimer(boardId, {
      ...currentState,
      durationSeconds,
      remainingSeconds: Math.max(0, currentRemaining),
      isRunning: false,
      startedAt: null,
      endsAt: null,
      updatedByName: userName || 'Participante',
      isOpenForEveryone: true,
      lastAction: 'pause',
      lastActionTimestamp: now,
    });
  },

  async resetTimer(
    rawBoardId: string,
    durationSeconds: number,
    userName?: string
  ): Promise<void> {
    const boardId = cleanBoardId(rawBoardId);
    const currentState = getLocalState(boardId);
    const now = Date.now();
    await this.updateTimer(boardId, {
      ...currentState,
      durationSeconds,
      remainingSeconds: durationSeconds,
      isRunning: false,
      startedAt: null,
      endsAt: null,
      updatedByName: userName || 'Participante',
      isOpenForEveryone: true,
      lastAction: 'reset',
      lastActionTimestamp: now,
    });
  },

  async openTimer(rawBoardId: string, userName?: string): Promise<void> {
    const boardId = cleanBoardId(rawBoardId);
    const currentState = getLocalState(boardId);
    const now = Date.now();
    await this.updateTimer(boardId, {
      ...currentState,
      isOpenForEveryone: true,
      updatedByName: userName || 'Participante',
      lastAction: 'open',
      lastActionTimestamp: now,
    });
  },

  async closeTimer(rawBoardId: string, userName?: string): Promise<void> {
    const boardId = cleanBoardId(rawBoardId);
    const currentState = getLocalState(boardId);
    const now = Date.now();
    await this.updateTimer(boardId, {
      ...currentState,
      isOpenForEveryone: false,
      isRunning: false,
      startedAt: null,
      endsAt: null,
      updatedByName: userName || 'Participante',
      lastAction: 'close',
      lastActionTimestamp: now,
    });
  },

  async setDuration(
    rawBoardId: string,
    durationSeconds: number,
    userName?: string
  ): Promise<void> {
    const boardId = cleanBoardId(rawBoardId);
    const currentState = getLocalState(boardId);
    const now = Date.now();
    await this.updateTimer(boardId, {
      ...currentState,
      durationSeconds,
      remainingSeconds: durationSeconds,
      isRunning: false,
      startedAt: null,
      endsAt: null,
      updatedByName: userName || 'Participante',
      isOpenForEveryone: true,
      lastAction: 'set_duration',
      lastActionTimestamp: now,
    });
  },

  async addOneMinute(rawBoardId: string, userName?: string): Promise<void> {
    const boardId = cleanBoardId(rawBoardId);
    const currentState = getLocalState(boardId);
    const now = Date.now();

    if (currentState.isRunning && currentState.endsAt) {
      const newEnds = currentState.endsAt + 60 * 1000;
      await this.updateTimer(boardId, {
        ...currentState,
        durationSeconds: currentState.durationSeconds + 60,
        endsAt: newEnds,
        updatedByName: userName || 'Participante',
        isOpenForEveryone: true,
        lastAction: 'add_time',
        lastActionTimestamp: now,
      });
    } else {
      const newDuration = currentState.durationSeconds + 60;
      const newRemaining = currentState.remainingSeconds + 60;
      await this.updateTimer(boardId, {
        ...currentState,
        durationSeconds: newDuration,
        remainingSeconds: newRemaining,
        updatedByName: userName || 'Participante',
        isOpenForEveryone: true,
        lastAction: 'add_time',
        lastActionTimestamp: now,
      });
    }
  },

  async setMusicConfig(
    rawBoardId: string,
    youtubeUrl: string,
    musicEnabled: boolean
  ): Promise<void> {
    const boardId = cleanBoardId(rawBoardId);
    const currentState = getLocalState(boardId);
    await this.updateTimer(boardId, {
      ...currentState,
      youtubeUrl,
      musicEnabled,
    });
  },

  async setVolume(rawBoardId: string, volume: number): Promise<void> {
    const boardId = cleanBoardId(rawBoardId);
    const currentState = getLocalState(boardId);
    await this.updateTimer(boardId, {
      ...currentState,
      volume: Math.max(0, Math.min(100, volume)),
    });
  },
};
