import { ref, set, onValue } from 'firebase/database';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, rtdb, isFirebaseConfigured } from '../config/firebase';
import type { CurrentUser } from '../types/board';
import type { CanvasElement } from '../types/element';

export type VotingScope = 'all' | 'sticky_only' | 'selection';

export interface VotingSessionConfig {
  title: string;
  durationMinutes: number; // e.g. 1, 2, 3, 5, 10
  votesPerPerson: number; // e.g. 1, 2, 3, 5, 10
  scope: VotingScope;
  allowedElementIds?: string[];
}

export interface VotingSession extends VotingSessionConfig {
  id: string;
  status: 'idle' | 'active' | 'ended';
  durationMinutes: number;
  votesPerPerson: number;
  scope: VotingScope;
  allowedElementIds?: string[];
  startedAt: number | null;
  endsAt: number | null;
  createdByName?: string;
  createdByUid?: string;
  // userUid -> { [elementId: string]: number of votes }
  votes: Record<string, Record<string, number>>;
  // userUid -> displayName
  userNames?: Record<string, string>;
  // userUid -> boolean (true if user clicked "Done")
  completedUsers?: Record<string, boolean>;
}

export interface UserVote {
  uid: string;
  name: string;
  elementId: string;
  timestamp: number;
}

export interface BoardVotingData {
  session: VotingSession | null;
  previousSessions?: VotingSession[];
  // Compatibilidade legada
  votesByUser?: Record<string, UserVote>;
}

const DEFAULT_VOTING: BoardVotingData = {
  session: null,
  previousSessions: [],
  votesByUser: {},
};

// Limpa prefixos "board_" para garantir que todos os clientes usem exatamente a mesma chave
function cleanBoardId(rawId: string): string {
  return (rawId || '').replace(/^board_/, '');
}

/**
 * Remove qualquer campo `undefined` que faria o Firestore `setDoc`/`updateDoc` falhar
 */
function cleanForFirestore<T>(obj: T): T {
  return JSON.parse(
    JSON.stringify(obj, (_, v) => (v === undefined ? null : v))
  );
}

// Cache em memória para acesso instantâneo síncrono
const memoryVotesCache = new Map<string, BoardVotingData>();

// Ouvintes locais para atualização otimista imediata
const localListeners = new Map<string, Set<(data: BoardVotingData) => void>>();

function getLocalVoting(rawBoardId: string): BoardVotingData {
  const boardId = cleanBoardId(rawBoardId);
  if (memoryVotesCache.has(boardId)) {
    return memoryVotesCache.get(boardId)!;
  }
  try {
    const raw = localStorage.getItem(`mirio_votes_${boardId}`);
    const data = raw ? JSON.parse(raw) : { ...DEFAULT_VOTING };
    if (!data.session) data.session = null;
    if (!data.previousSessions) data.previousSessions = [];
    if (!data.votesByUser) data.votesByUser = {};
    memoryVotesCache.set(boardId, data);
    return data;
  } catch {
    const fallback = { ...DEFAULT_VOTING };
    memoryVotesCache.set(boardId, fallback);
    return fallback;
  }
}

function saveLocalVoting(rawBoardId: string, data: BoardVotingData) {
  const boardId = cleanBoardId(rawBoardId);
  const safeData: BoardVotingData = {
    session: data.session || null,
    previousSessions: data.previousSessions || [],
    votesByUser: data.votesByUser || {},
  };
  memoryVotesCache.set(boardId, safeData);
  try {
    localStorage.setItem(`mirio_votes_${boardId}`, JSON.stringify(safeData));
  } catch {
    // ignora falha de cota de storage
  }
}

function notifySubscribers(rawBoardId: string, data: BoardVotingData) {
  const boardId = cleanBoardId(rawBoardId);
  const safeData: BoardVotingData = {
    session: data.session || null,
    previousSessions: data.previousSessions || [],
    votesByUser: data.votesByUser || {},
  };
  const listeners = localListeners.get(boardId);
  if (listeners) {
    listeners.forEach((cb) => {
      try {
        cb(safeData);
      } catch (err) {
        console.error('Erro no listener de votação:', err);
      }
    });
  }
}

export const votingService = {
  subscribeVoting(
    rawBoardId: string,
    callback: (data: BoardVotingData) => void
  ): () => void {
    const boardId = cleanBoardId(rawBoardId);

    if (!localListeners.has(boardId)) {
      localListeners.set(boardId, new Set());
    }
    localListeners.get(boardId)!.add(callback);

    // Emite estado local / cache instantaneamente para renderização imediata
    const current = getLocalVoting(boardId);
    callback(current);

    // 1. Canal BroadcastChannel para sincronizar abas no mesmo navegador
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(`mirio_votes_${boardId}`);
      channel.onmessage = (e) => {
        if (e.data) {
          const safeData: BoardVotingData = {
            session: e.data.session || null,
            previousSessions: e.data.previousSessions || [],
            votesByUser: e.data.votesByUser || {},
          };
          saveLocalVoting(boardId, safeData);
          notifySubscribers(boardId, safeData);
        }
      };
    } catch {
      // BroadcastChannel não suportado em ambientes antigos
    }

    // 2. Ouvinte Primário Firestore (Crucial: sincroniza entre diferentes computadores, celulares e navegadores)
    let unsubscribeFirestore: (() => void) | null = null;
    if (isFirebaseConfigured && db) {
      try {
        const boardDocRef = doc(db, 'boards', boardId);
        unsubscribeFirestore = onSnapshot(
          boardDocRef,
          (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.data();
              if (data && data.voting) {
                const rawVoting = data.voting;
                const rawSession = rawVoting.session;
                const session = rawSession ? {
                  ...rawSession,
                  votes: rawSession.votes || {},
                  userNames: rawSession.userNames || {},
                  completedUsers: rawSession.completedUsers || {},
                  allowedElementIds: Array.isArray(rawSession.allowedElementIds) ? rawSession.allowedElementIds : [],
                } : null;
                const safeData: BoardVotingData = {
                  session,
                  previousSessions: rawVoting.previousSessions || [],
                  votesByUser: rawVoting.votesByUser || {},
                };
                saveLocalVoting(boardId, safeData);
                notifySubscribers(boardId, safeData);
              } else if (data && data.voting === null) {
                const safeData: BoardVotingData = { ...DEFAULT_VOTING };
                saveLocalVoting(boardId, safeData);
                notifySubscribers(boardId, safeData);
              }
            }
          },
          (err) => {
            console.warn('Ouvinte de votação Firestore (fallback local):', err.message);
          }
        );
      } catch (err) {
        console.warn('Erro ao conectar ao Firestore da votação:', err);
      }
    }

    // 3. Ouvinte Secundário RTDB (se disponível no projeto para latência ultra baixa)
    let unsubscribeRtdb: (() => void) | null = null;
    if (isFirebaseConfigured && rtdb) {
      try {
        const votingRef = ref(rtdb, `board_voting/${boardId}`);
        unsubscribeRtdb = onValue(
          votingRef,
          (snapshot) => {
            const rawVal = snapshot.exists() ? snapshot.val() : null;
            if (rawVal) {
              const rawSession = rawVal.session;
              const session = rawSession ? {
                ...rawSession,
                votes: rawSession.votes || {},
                userNames: rawSession.userNames || {},
                completedUsers: rawSession.completedUsers || {},
                allowedElementIds: Array.isArray(rawSession.allowedElementIds) ? rawSession.allowedElementIds : [],
              } : null;
              const safeData: BoardVotingData = {
                session,
                previousSessions: rawVal.previousSessions || [],
                votesByUser: rawVal.votesByUser || {},
              };
              saveLocalVoting(boardId, safeData);
              notifySubscribers(boardId, safeData);
            }
          },
          () => {}
        );
      } catch {}
    }

    return () => {
      localListeners.get(boardId)?.delete(callback);
      if (channel) channel.close();
      if (unsubscribeFirestore) unsubscribeFirestore();
      if (unsubscribeRtdb) unsubscribeRtdb();
    };
  },

  async updateVoting(rawBoardId: string, data: BoardVotingData): Promise<void> {
    const boardId = cleanBoardId(rawBoardId);
    const safeData: BoardVotingData = {
      session: data.session || null,
      previousSessions: data.previousSessions || [],
      votesByUser: data.votesByUser || {},
    };

    // 1. Atualização Otimista Imediata (zero latência no cliente atual)
    saveLocalVoting(boardId, safeData);
    notifySubscribers(boardId, safeData);

    // 2. Broadcast local entre abas
    try {
      const channel = new BroadcastChannel(`mirio_votes_${boardId}`);
      channel.postMessage(safeData);
      channel.close();
    } catch {
      // ignora
    }

    // Garante que não haja nenhum undefined nos dados para o Firestore
    const firestoreData = cleanForFirestore(safeData);

    // 3. Sincronização Primária via Firestore (100% garantida entre todos os usuários remotos)
    if (isFirebaseConfigured && db) {
      const payload = {
        title: 'Quadro de Ideias',
        voting: firestoreData,
        updatedAt: Date.now(),
      };

      try {
        const boardDocRef = doc(db, 'boards', boardId);
        await setDoc(boardDocRef, payload, { merge: true });
      } catch (e) {
        console.warn('Erro ao persistir votação no Firestore:', e);
      }
    }

    // 4. Sincronização Secundária via Firebase RTDB (se disponível)
    if (isFirebaseConfigured && rtdb) {
      try {
        const votingRef = ref(rtdb, `board_voting/${boardId}`);
        await set(votingRef, firestoreData);
      } catch (err) {
        console.warn('Erro ao persistir votação no RTDB:', err);
      }
    }
  },

  /**
   * Inicia uma nova sessão estruturada de votação (Estilo Miro)
   */
  async startSession(
    rawBoardId: string,
    config: VotingSessionConfig,
    user: CurrentUser
  ): Promise<void> {
    const boardId = cleanBoardId(rawBoardId);
    const current = getLocalVoting(boardId);
    const now = Date.now();
    const durationSeconds = Math.max(30, config.durationMinutes * 60);
    const endsAt = now + durationSeconds * 1000;

    const newSession: VotingSession = {
      id: `vote_session_${now}`,
      title: config.title.trim() || 'Votação de Ideias',
      status: 'active',
      durationMinutes: config.durationMinutes,
      votesPerPerson: Math.max(1, config.votesPerPerson),
      scope: config.scope,
      allowedElementIds: Array.isArray(config.allowedElementIds) ? config.allowedElementIds : [],
      startedAt: now,
      endsAt,
      createdByName: user.displayName || 'Facilitador',
      createdByUid: user.uid,
      votes: {},
      userNames: {
        [user.uid]: user.displayName || 'Facilitador',
      },
      completedUsers: {},
    };

    // Se havia uma sessão anterior encerrada, arquiva no histórico
    const previous = current.previousSessions ? [...current.previousSessions] : [];
    if (current.session && current.session.status === 'ended') {
      previous.unshift(current.session);
      if (previous.length > 5) previous.pop();
    }

    await this.updateVoting(boardId, {
      ...current,
      session: newSession,
      previousSessions: previous,
    });
  },

  /**
   * Encerra a sessão ativa de votação para todos os usuários
   */
  async endSession(rawBoardId: string): Promise<void> {
    const boardId = cleanBoardId(rawBoardId);
    const current = getLocalVoting(boardId);
    if (!current.session || current.session.status !== 'active') return;

    const endedSession: VotingSession = {
      ...current.session,
      status: 'ended',
      endsAt: Date.now(),
    };

    await this.updateVoting(boardId, {
      ...current,
      session: endedSession,
    });
  },

  /**
   * Reseta e descarta a sessão atual
   */
  async resetSession(rawBoardId: string): Promise<void> {
    const boardId = cleanBoardId(rawBoardId);
    await this.updateVoting(boardId, {
      session: null,
      previousSessions: [],
      votesByUser: {},
    });
  },

  /**
   * Adiciona 1 voto do usuário em um elemento (respeitando o saldo disponível na sessão ativa)
   */
  async addVote(
    rawBoardId: string,
    elementId: string,
    user: CurrentUser
  ): Promise<boolean> {
    const boardId = cleanBoardId(rawBoardId);
    const current = getLocalVoting(boardId);
    const session = current.session;
    if (!session || session.status !== 'active') return false;

    const votes = { ...(session.votes || {}) };
    const userMap = { ...(votes[user.uid] || {}) };
    const userNames = { ...(session.userNames || {}) };
    userNames[user.uid] = user.displayName || 'Participante';

    // Calcula total de votos já utilizados pelo usuário
    const currentTotalUserVotes = Object.values(userMap).reduce((sum, n) => sum + n, 0);

    if (currentTotalUserVotes >= session.votesPerPerson) {
      // Sem saldo de votos restante
      return false;
    }

    userMap[elementId] = (userMap[elementId] || 0) + 1;
    votes[user.uid] = userMap;

    await this.updateVoting(boardId, {
      ...current,
      session: {
        ...session,
        votes,
        userNames,
      },
    });

    return true;
  },

  /**
   * Remove 1 voto do usuário do elemento
   */
  async removeVote(
    rawBoardId: string,
    elementId: string,
    user: CurrentUser
  ): Promise<boolean> {
    const boardId = cleanBoardId(rawBoardId);
    const current = getLocalVoting(boardId);
    const session = current.session;
    if (!session || session.status !== 'active') return false;

    const votes = { ...(session.votes || {}) };
    const userMap = { ...(votes[user.uid] || {}) };

    const currentCount = userMap[elementId] || 0;
    if (currentCount <= 0) return false;

    if (currentCount === 1) {
      delete userMap[elementId];
    } else {
      userMap[elementId] = currentCount - 1;
    }

    votes[user.uid] = userMap;

    await this.updateVoting(boardId, {
      ...current,
      session: {
        ...session,
        votes,
      },
    });

    return true;
  },

  /**
   * Marca ou desmarca o usuário como "Pronto / Votação Finalizada"
   */
  async toggleUserCompleted(
    rawBoardId: string,
    user: CurrentUser
  ): Promise<boolean> {
    const boardId = cleanBoardId(rawBoardId);
    const current = getLocalVoting(boardId);
    const session = current.session;
    if (!session || session.status !== 'active') return false;

    const completedUsers = { ...(session.completedUsers || {}) };
    const isNowDone = !completedUsers[user.uid];

    if (isNowDone) {
      completedUsers[user.uid] = true;
    } else {
      delete completedUsers[user.uid];
    }

    await this.updateVoting(boardId, {
      ...current,
      session: {
        ...session,
        completedUsers,
      },
    });

    return isNowDone;
  },

  // Helpers auxiliares de cálculo
  getUserAllocatedVotes(session: VotingSession | null, uid: string): number {
    if (!session || !session.votes || !session.votes[uid]) return 0;
    return Object.values(session.votes[uid]).reduce((acc, count) => acc + count, 0);
  },

  getUserRemainingVotes(session: VotingSession | null, uid: string): number {
    if (!session) return 0;
    const allocated = this.getUserAllocatedVotes(session, uid);
    return Math.max(0, session.votesPerPerson - allocated);
  },

  getElementUserVotes(
    session: VotingSession | null,
    uid: string,
    elementId: string
  ): number {
    if (!session || !session.votes || !session.votes[uid]) return 0;
    return session.votes[uid][elementId] || 0;
  },

  getTotalElementVotes(
    session: VotingSession | null,
    elementId: string
  ): number {
    if (!session || !session.votes) return 0;
    let total = 0;
    Object.values(session.votes).forEach((userMap) => {
      total += userMap[elementId] || 0;
    });
    return total;
  },

  isElementEligible(
    session: VotingSession | null,
    element: CanvasElement
  ): boolean {
    if (!session) return false;
    // Não permitir votação em linhas/setas ou frames de fundo
    if (element.type === 'arrow' || element.type === 'frame') return false;

    if (session.scope === 'selection') {
      return Boolean(session.allowedElementIds?.includes(element.id));
    }
    if (session.scope === 'sticky_only') {
      return (
        element.type === 'sticky' ||
        element.type === 'rect' ||
        element.type === 'circle' ||
        element.type === 'diamond' ||
        element.type === 'triangle' ||
        element.type === 'star'
      );
    }
    return true; // 'all'
  },

  /**
   * Compatibilidade com implementações existentes
   */
  async clearAllVotes(rawBoardId: string): Promise<void> {
    const boardId = cleanBoardId(rawBoardId);
    await this.resetSession(boardId);
  },
};
