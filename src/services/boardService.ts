import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs,
  deleteDoc, 
  updateDoc, 
  writeBatch,
  onSnapshot,
  deleteField,
  arrayUnion,
  arrayRemove,
  query,
  where
} from 'firebase/firestore';
import { ref as rtdbRef, remove as rtdbRemove } from 'firebase/database';
import { db, rtdb, isFirebaseConfigured } from '../config/firebase';
import type { Board, BoardCollaborator, BoardMember, BoardPermission, CurrentUser, JoinRequest } from '../types/board';
import { hashBoardPassword } from '../utils/security';

export interface CreateBoardOptions {
  boardId?: string;
  title: string;
  defaultPermission?: BoardPermission;
  collaborators?: Record<string, BoardCollaborator>;
  collaboratorEmails?: string[];
  waitingRoomEnabled?: boolean;
  isPasswordProtected?: boolean;
  password?: string;
  templateId?: string;
}

const LOCAL_BOARDS_KEY = 'mirio_local_boards';
const BOARDS_CHANNEL_NAME = 'mirio_boards_channel';
const VISITED_BOARDS_PREFIX = 'mirio_visited_boards_';
const INVITES_COLLECTION = 'invites';

/** Snapshot público e seguro do convite: só dados não sensíveis (nunca senha, membros ou permissões) */
export interface BoardInviteSnapshot {
  boardId: string;
  title: string;
  ownerName: string;
  ownerId: string;
  updatedAt: number;
}

// Callbacks locais para sincronização de abas
const localSubscribers = new Set<() => void>();

function notifyLocalSubscribers() {
  localSubscribers.forEach((cb) => {
    try {
      cb();
    } catch (e) {
      console.error('Erro no callback de quadros locais:', e);
    }
  });

  try {
    const channel = new BroadcastChannel(BOARDS_CHANNEL_NAME);
    channel.postMessage('update');
    channel.close();
  } catch {
    // BroadcastChannel pode não estar disponível em ambientes legados
  }
}

/**
 * Garante que o ID do quadro seja uma string limpa e sem o prefixo redundante 'board_'.
 * Protegido contra valores nulos, indefinidos ou tipos não-string.
 */
export function cleanBoardId(rawId: unknown): string {
  if (typeof rawId !== 'string') return '';
  return rawId.trim().replace(/^board_/, '');
}

/**
 * Gera um ID de quadro limpo, compacto e alfanumérico (ex: x3nn0eru).
 * Não utiliza prefixos redundantes como 'board_' para manter os links elegantes e curtos (/b/{id}).
 */
export function generateBoardId(): string {
  return Math.random().toString(36).substring(2, 10);
}

/**
 * Obtém os IDs dos quadros visitados/acessados por um usuário específico.
 */
export function getVisitedBoardIds(userId: string): string[] {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(`${VISITED_BOARDS_PREFIX}${userId}`);
    if (!raw) return [];
    const list: unknown[] = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list
      .map((id) => cleanBoardId(id))
      .filter((id): id is string => Boolean(id) && id.length > 0);
  } catch {
    return [];
  }
}

/**
 * Registra que um usuário acessou um determinado quadro através do link de compartilhamento.
 */
export function recordVisitedBoard(rawBoardId: unknown, userId: string): void {
  const boardId = cleanBoardId(rawBoardId);
  if (!boardId || !userId) return;
  try {
    const current = getVisitedBoardIds(userId).filter((id) => id !== boardId);
    current.unshift(boardId);
    // Armazena até 30 quadros acessados recentemente
    localStorage.setItem(
      `${VISITED_BOARDS_PREFIX}${userId}`,
      JSON.stringify(current.slice(0, 30))
    );
  } catch (e) {
    console.error('Erro ao registrar histórico de quadro visitado:', e);
  }
}

/**
 * Remove um quadro do histórico de visitados do usuário.
 */
export function removeVisitedBoard(rawBoardId: unknown, userId: string): void {
  const boardId = cleanBoardId(rawBoardId);
  if (!boardId || !userId) return;
  try {
    const current = getVisitedBoardIds(userId).filter((id) => id !== boardId);
    localStorage.setItem(
      `${VISITED_BOARDS_PREFIX}${userId}`,
      JSON.stringify(current)
    );
  } catch (e) {
    console.error('Erro ao remover quadro visitado:', e);
  }
}

export const boardService = {
  cleanBoardId,
  generateBoardId,
  getVisitedBoardIds,
  recordVisitedBoard,
  removeVisitedBoard,

  /**
   * Sobe (ou atualiza) o snapshot público do convite em /invites/{boardId}:
   * contém APENAS título e nome do proprietário — dados suficientes para a
   * tela de convite pré-login, sem expor senha (hash), membros ou permissões.
   */
  async syncInviteSnapshot(
    board: Pick<Board, 'id' | 'title' | 'ownerId' | 'ownerName'>
  ): Promise<void> {
    const boardId = cleanBoardId(board.id);
    if (!boardId) return;

    const snapshot: BoardInviteSnapshot = {
      boardId,
      title: board.title || 'Quadro sem título',
      ownerName: board.ownerName || 'Usuário',
      ownerId: board.ownerId,
      updatedAt: Date.now(),
    };

    if (!isFirebaseConfigured || !db) {
      localStorage.setItem(`mirio_invite_snapshot_${boardId}`, JSON.stringify(snapshot));
      return;
    }

    try {
      await setDoc(doc(db, INVITES_COLLECTION, boardId), snapshot);
    } catch {
      // Best-effort: a falha de escrita do snapshot não deve quebrar o fluxo principal
    }
  },

  /** Lê o snapshot público do convite (permitido sem autenticação pelas regras do Firestore) */
  async getInviteSnapshot(rawBoardId: string): Promise<BoardInviteSnapshot | null> {
    const boardId = cleanBoardId(rawBoardId);
    if (!boardId) return null;

    if (!isFirebaseConfigured || !db) {
      try {
        const raw = localStorage.getItem(`mirio_invite_snapshot_${boardId}`);
        return raw ? (JSON.parse(raw) as BoardInviteSnapshot) : null;
      } catch {
        return null;
      }
    }

    try {
      const snap = await getDoc(doc(db, INVITES_COLLECTION, boardId));
      if (!snap.exists()) return null;
      const data = snap.data() as BoardInviteSnapshot;
      // Defesa extra: nunca retorna snapshot de outro quadro
      if (data?.boardId !== boardId) return null;
      return data;
    } catch {
      return null;
    }
  },

  async createBoard(titleOrOptions: string | CreateBoardOptions, user: CurrentUser): Promise<string> {
    const isOptions = typeof titleOrOptions !== 'string';
    const options: CreateBoardOptions = isOptions ? titleOrOptions : { title: titleOrOptions };

    const rawId = options.boardId || generateBoardId();
    // Garante que o ID seja sempre limpo e sem o prefixo redundante "board_"
    const boardId = rawId.replace(/^board_/, '');
    const title = options.title?.trim() || 'Novo Quadro de Ideias';
    const defaultPermission = options.defaultPermission || 'edit';
    const collaborators = options.collaborators || {};
    const collaboratorEmails = options.collaboratorEmails || (
      options.collaborators ? Object.values(options.collaborators).map((c) => c.email.toLowerCase()) : []
    );
    const isPasswordProtected = Boolean(options.isPasswordProtected && options.password?.trim());
    const password = isPasswordProtected && options.password ? await hashBoardPassword(options.password.trim()) : '';

    const newBoard: Board = {
      id: boardId,
      title,
      ownerId: user.uid,
      ownerName: user.displayName?.trim() || (user.isAnonymous ? 'Convidado' : 'Usuário'),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      defaultPermission,
      collaborators,
      collaboratorEmails,
      waitingRoomEnabled: options.waitingRoomEnabled !== undefined ? options.waitingRoomEnabled : true,
      joinRequests: {},
      isPasswordProtected,
      password,
    };

    // Registra como quadro visitado/criado pelo usuário
    recordVisitedBoard(boardId, user.uid);

    if (!isFirebaseConfigured || !db) {
      const local: Board[] = JSON.parse(localStorage.getItem(LOCAL_BOARDS_KEY) || '[]');
      local.unshift(newBoard);
      localStorage.setItem(LOCAL_BOARDS_KEY, JSON.stringify(local));
      notifyLocalSubscribers();
      await this.syncInviteSnapshot(newBoard);
      return boardId;
    }

    const boardRef = doc(db, 'boards', boardId);
    await setDoc(boardRef, newBoard);
    // Snapshot público do convite (título + dono) para a tela de convite pré-login
    await this.syncInviteSnapshot(newBoard);
    return boardId;
  },

  /**
   * Escuta os quadros visíveis para o usuário autenticado ou convidado:
   * 1. Quadros dos quais ele é proprietário (ownerId == user.uid)
   * 2. Quadros compartilhados diretamente com seu e-mail (collaboratorEmails contendo user.email)
   * 3. Quadros em que o usuário está registrado como membro (members)
   * 4. Quadros compartilhados com convidados (defaultPermission !== 'none')
   * 5. Quadros acessados via link no passado (visitedBoardIds)
   */
  subscribeBoards(
    user: CurrentUser | null,
    callback: (boards: Board[]) => void
  ): () => void {
    if (!user) {
      callback([]);
      return () => {};
    }

    if (!isFirebaseConfigured || !db) {
      const load = () => {
        const allLocal: Board[] = JSON.parse(localStorage.getItem(LOCAL_BOARDS_KEY) || '[]');
        let modified = false;

        // Migração suave e retrocompatível de IDs legados com prefixo "board_"
        allLocal.forEach((b) => {
          if (!b.title || typeof b.title !== 'string') {
            b.title = 'Quadro sem título';
            modified = true;
          }
          if (b.id && b.id.startsWith('board_')) {
            const oldId = b.id;
            b.id = b.id.replace(/^board_/, '');
            const oldElems = localStorage.getItem(`mirio_board_elements_${oldId}`);
            if (oldElems && !localStorage.getItem(`mirio_board_elements_${b.id}`)) {
              localStorage.setItem(`mirio_board_elements_${b.id}`, oldElems);
            }
            modified = true;
          }
        });
        if (modified) {
          localStorage.setItem(LOCAL_BOARDS_KEY, JSON.stringify(allLocal));
        }

        const visitedIds = getVisitedBoardIds(user.uid);
        const userEmailLower = user.email ? user.email.toLowerCase() : null;

        const filtered = allLocal.filter((b) => {
          const isReinvited = (userEmailLower && (
            (b.collaboratorEmails && b.collaboratorEmails.map((e) => String(e).toLowerCase()).includes(userEmailLower)) ||
            (b.collaborators && Object.values(b.collaborators).some((c) => c?.email && String(c.email).toLowerCase() === userEmailLower))
          )) || Boolean(b.members && b.members[user.uid] && b.members[user.uid].role !== 'none');

          // Se o usuário foi expressamente removido pelo proprietário deste quadro e não foi re-adicionado, não exibe
          if (!isReinvited) {
            if (b.removedMemberIds && b.removedMemberIds.includes(user.uid)) {
              return false;
            }
            if (b.members && b.members[user.uid]?.role === 'none') {
              return false;
            }
          }

          // 1. É o proprietário do quadro
          if (b.ownerId === user.uid) return true;

          // 2. Foi convidado por e-mail
          if (userEmailLower) {
            if (b.collaboratorEmails && b.collaboratorEmails.map((e) => String(e).toLowerCase()).includes(userEmailLower)) {
              return true;
            }
            if (b.collaborators) {
              const hasEmail = Object.values(b.collaborators).some(
                (c) => c?.email && String(c.email).toLowerCase() === userEmailLower
              );
              if (hasEmail) return true;
            }
          }

          // 3. É membro registrado no quadro com acesso permitido (role !== 'none')
          if (b.members && b.members[user.uid] && b.members[user.uid].role !== 'none') {
            return true;
          }

          // 4. Foi visitado por este usuário via link específico e não possui acesso restrito ('none')
          if (visitedIds.includes(b.id) && b.defaultPermission !== 'none') {
            return true;
          }

          return false;
        });

        // Ordena por data de atualização mais recente
        filtered.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        callback(filtered);
      };

      const localCb = () => load();
      localSubscribers.add(localCb);

      // Carregamento inicial
      load();

      let channel: BroadcastChannel | null = null;
      try {
        channel = new BroadcastChannel(BOARDS_CHANNEL_NAME);
        channel.onmessage = () => load();
      } catch {}

      window.addEventListener('storage', load);

      return () => {
        localSubscribers.delete(localCb);
        if (channel) {
          channel.close();
        }
        window.removeEventListener('storage', load);
      };
    }

    // Modo Firebase:
    // Consulta segmentada com isolamento estrito no servidor (sem varredura global de coleção):
    // 1. Quadros dos quais o usuário é proprietário (ownerId == user.uid)
    // 2. Quadros compartilhados onde o usuário foi convidado por e-mail
    // 3. Quadros acessados previamente pelo usuário via link específico
    const boardsRef = collection(db, 'boards');
    const ownedBoardsMap = new Map<string, Board>();
    const collabBoardsMap = new Map<string, Board>();
    const visitedBoardsMap = new Map<string, Board>();
    const unsubs: Array<() => void> = [];

    const publishMergedBoards = () => {
      const mergedMap = new Map<string, Board>();
      const userEmailLower = user.email ? user.email.toLowerCase() : null;

      [ownedBoardsMap, collabBoardsMap, visitedBoardsMap].forEach((m) => {
        m.forEach((b, id) => {
          const isReinvited = (userEmailLower && (
            (b.collaboratorEmails && b.collaboratorEmails.includes(userEmailLower)) ||
            (b.collaborators && Object.values(b.collaborators).some((c) => c?.email && String(c.email).toLowerCase() === userEmailLower))
          )) || Boolean(b.members && b.members[user.uid] && b.members[user.uid].role !== 'none');

          if (!isReinvited) {
            if (b.removedMemberIds && b.removedMemberIds.includes(user.uid)) return;
            if (b.members && b.members[user.uid]?.role === 'none') return;
          }
          mergedMap.set(id, b);
        });
      });

      const list = Array.from(mergedMap.values());
      list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      callback(list);
    };

    const parseDocToBoard = (docSnap: any): Board | null => {
      const rawData = docSnap.data() as Partial<Board>;
      if (!rawData || typeof rawData !== 'object') return null;
      const cleanId = cleanBoardId(docSnap.id || rawData?.id);
      if (!cleanId) return null;
      return {
        id: cleanId,
        title: typeof rawData.title === 'string' && rawData.title.trim() ? rawData.title.trim() : 'Quadro sem título',
        ownerId: rawData.ownerId || '',
        ownerName: typeof rawData.ownerName === 'string' && rawData.ownerName.trim() ? rawData.ownerName.trim() : 'Criador',
        createdAt: rawData.createdAt || Date.now(),
        updatedAt: rawData.updatedAt || rawData.createdAt || Date.now(),
        defaultPermission: rawData.defaultPermission || 'edit',
        collaborators: rawData.collaborators || {},
        collaboratorEmails: Array.isArray(rawData.collaboratorEmails)
          ? rawData.collaboratorEmails.filter(Boolean).map((e) => String(e).toLowerCase())
          : [],
        members: rawData.members || {},
        removedMemberIds: Array.isArray(rawData.removedMemberIds) ? rawData.removedMemberIds : [],
        isPasswordProtected: Boolean(rawData.isPasswordProtected),
        password: rawData.password || '',
      };
    };

    // 1. Escuta quadros de propriedade do usuário
    const ownedQuery = query(boardsRef, where('ownerId', '==', user.uid));
    const unsubOwned = onSnapshot(
      ownedQuery,
      (snapshot) => {
        ownedBoardsMap.clear();
        snapshot.docs.forEach((d) => {
          const b = parseDocToBoard(d);
          if (b) ownedBoardsMap.set(b.id, b);
        });
        publishMergedBoards();
      },
      (error) => {
        console.warn('Aviso ao consultar quadros próprios no Firestore:', error);
      }
    );
    unsubs.push(unsubOwned);

    // 2. Escuta quadros onde o usuário foi convidado por e-mail
    if (user.email) {
      const emailLower = user.email.trim().toLowerCase();
      const collabQuery = query(boardsRef, where('collaboratorEmails', 'array-contains', emailLower));
      const unsubCollab = onSnapshot(
        collabQuery,
        (snapshot) => {
          collabBoardsMap.clear();
          snapshot.docs.forEach((d) => {
            const b = parseDocToBoard(d);
            if (b) collabBoardsMap.set(b.id, b);
          });
          publishMergedBoards();
        },
        (error) => {
          console.warn('Aviso ao consultar quadros compartilhados no Firestore:', error);
        }
      );
      unsubs.push(unsubCollab);
    }

    // 3. Quadros acessados previamente via link
    const visitedIds = getVisitedBoardIds(user.uid).slice(0, 20);
    visitedIds.forEach((vId) => {
      const cleanId = cleanBoardId(vId);
      if (!cleanId) return;
      const docRef = doc(boardsRef, cleanId);
      const unsubVisited = onSnapshot(
        docRef,
        (snap) => {
          if (snap.exists()) {
            const b = parseDocToBoard(snap);
            if (b && b.defaultPermission !== 'none') {
              visitedBoardsMap.set(b.id, b);
            } else {
              visitedBoardsMap.delete(cleanId);
            }
          } else {
            visitedBoardsMap.delete(cleanId);
          }
          publishMergedBoards();
        },
        () => {
          visitedBoardsMap.delete(cleanId);
        }
      );
      unsubs.push(unsubVisited);
    });

    return () => {
      unsubs.forEach((u) => u());
    };
  },

  async ensureBoardExists(rawBoardId: string, initialBoard: Board): Promise<void> {
    const boardId = cleanBoardId(rawBoardId);
    if (!boardId || !isFirebaseConfigured || !db) return;
    try {
      const boardRef = doc(db, 'boards', boardId);
      await setDoc(boardRef, { ...initialBoard, id: boardId }, { merge: true });
    } catch (e) {
      console.warn('Erro ao assegurar existência do quadro no Firestore:', e);
    }
  },

  /**
   * Escuta alterações em tempo real de um quadro específico.
   * Suporta retrocompatibilidade transparente se o ID fornecido contiver ou não o prefixo "board_".
   */
  subscribeBoard(rawBoardId: string, callback: (board: Board | null) => void): () => void {
    const boardId = cleanBoardId(rawBoardId);
    if (!boardId) {
      callback(null);
      return () => {};
    }

    if (!isFirebaseConfigured || !db) {
      const load = () => {
        let local: Board[] = [];
        try {
          local = JSON.parse(localStorage.getItem(LOCAL_BOARDS_KEY) || '[]');
          if (!Array.isArray(local)) local = [];
        } catch {
          local = [];
        }
        const found = local.find(
          (b) => b && (cleanBoardId(b.id) === boardId || b.id === `board_${boardId}`)
        ) || null;
        callback(found ? { ...found, id: boardId } : null);
      };

      const localCb = () => load();
      localSubscribers.add(localCb);
      load();

      let channel: BroadcastChannel | null = null;
      try {
        channel = new BroadcastChannel(BOARDS_CHANNEL_NAME);
        channel.onmessage = () => load();
      } catch {}

      window.addEventListener('storage', load);

      return () => {
        localSubscribers.delete(localCb);
        if (channel) channel.close();
        window.removeEventListener('storage', load);
      };
    }

    const docRef = doc(db!, 'boards', boardId);
    const legacyDocRef = doc(db!, 'boards', `board_${boardId}`);

    return onSnapshot(
      docRef,
      async (snap) => {
        if (!snap.exists()) {
          // Fallback para IDs legados com prefixo board_
          try {
            const legacySnap = await getDoc(legacyDocRef);
            if (legacySnap.exists()) {
              const legacyData = legacySnap.data() as Board;
              const migratedBoard: Board = {
                ...legacyData,
                id: boardId,
              };
              // Persiste o documento com o ID limpo para consolidar a migração
              await setDoc(docRef, migratedBoard, { merge: true });
              callback(migratedBoard);
              return;
            }
          } catch (e) {
            console.warn('Erro ao carregar quadro legado:', e);
          }
          callback(null);
          return;
        }

        const currentData = snap.data() as Board;
        // Se o documento existe mas está sem ownerId (estado inconsistente após criação parcial)
        if (!currentData.ownerId) {
          try {
            const legacySnap = await getDoc(legacyDocRef);
            if (legacySnap.exists()) {
              const legacyData = legacySnap.data() as Board;
              const mergedBoard: Board = {
                ...legacyData,
                ...currentData,
                id: boardId,
                ownerId: legacyData.ownerId || currentData.ownerId,
                ownerName: legacyData.ownerName || currentData.ownerName,
              };
              await setDoc(docRef, mergedBoard, { merge: true });
              callback(mergedBoard);
              return;
            }
          } catch (e) {
            console.warn('Erro ao mesclar dados do quadro legado:', e);
          }
        }

        callback({ ...currentData, id: boardId });
      },
      (error) => {
        console.error('Erro ao escutar quadro no Firestore:', error);
      }
    );
  },

  async getBoard(rawBoardId: string): Promise<Board | null> {
    const boardId = cleanBoardId(rawBoardId);
    if (!boardId) return null;

    if (!isFirebaseConfigured || !db) {
      let local: Board[] = [];
      try {
        local = JSON.parse(localStorage.getItem(LOCAL_BOARDS_KEY) || '[]');
        if (!Array.isArray(local)) local = [];
      } catch {
        local = [];
      }
      const found = local.find(
        (b) => b && (cleanBoardId(b.id) === boardId || b.id === `board_${boardId}`)
      );
      return found ? { ...found, id: boardId } : null;
    }

    const docRef = doc(db, 'boards', boardId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      const legacySnap = await getDoc(doc(db, 'boards', `board_${boardId}`));
      if (legacySnap.exists()) {
        const legacyData = legacySnap.data() as Board;
        const migratedBoard = { ...legacyData, id: boardId };
        await setDoc(docRef, migratedBoard, { merge: true }).catch(() => {});
        return migratedBoard;
      }
      return null;
    }

    const currentData = snap.data() as Board;
    if (!currentData.ownerId) {
      const legacySnap = await getDoc(doc(db, 'boards', `board_${boardId}`));
      if (legacySnap.exists()) {
        const legacyData = legacySnap.data() as Board;
        const mergedBoard = {
          ...legacyData,
          ...currentData,
          id: boardId,
          ownerId: legacyData.ownerId || currentData.ownerId,
          ownerName: legacyData.ownerName || currentData.ownerName,
        };
        await setDoc(docRef, mergedBoard, { merge: true }).catch(() => {});
        return mergedBoard;
      }
    }
    return { ...(snap.data() as Board), id: boardId };
  },

  async updateBoardTitle(rawBoardId: string, title: string): Promise<void> {
    const boardId = cleanBoardId(rawBoardId);
    if (!boardId) return;

    if (!isFirebaseConfigured || !db) {
      let local: Board[] = [];
      try {
        local = JSON.parse(localStorage.getItem(LOCAL_BOARDS_KEY) || '[]');
        if (!Array.isArray(local)) local = [];
      } catch {
        local = [];
      }
      const idx = local.findIndex((b) => b && (cleanBoardId(b.id) === boardId || b.id === `board_${boardId}`));
      if (idx !== -1) {
        local[idx].title = title;
        local[idx].id = boardId;
        local[idx].updatedAt = Date.now();
        localStorage.setItem(LOCAL_BOARDS_KEY, JSON.stringify(local));
        notifyLocalSubscribers();
      }
      return;
    }

    const docRef = doc(db, 'boards', boardId);
    await updateDoc(docRef, {
      title,
      updatedAt: Date.now(),
    });

    // Mantém o snapshot público do convite em sincronia com o título (best-effort:
    // se quem renomeou não é o proprietário, a escrita falha silenciosamente)
    try {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        await this.syncInviteSnapshot(snap.data() as Board);
      }
    } catch {
      // Snapshot do convite é opcional; a renomeação principal já foi concluída
    }
  },

  async updateBoardSettings(
    rawBoardId: string,
    updates: Partial<Pick<Board, 'title' | 'ownerId' | 'ownerName' | 'defaultPermission' | 'collaborators' | 'collaboratorEmails' | 'members' | 'removedMemberIds' | 'waitingRoomEnabled' | 'joinRequests' | 'isPasswordProtected' | 'password'>>
  ): Promise<void> {
    const boardId = cleanBoardId(rawBoardId);
    if (!boardId) return;

    const payload: Record<string, unknown> = {
      ...updates,
      updatedAt: Date.now(),
    };

    if (updates.password !== undefined) {
      const p = updates.password ? updates.password.trim() : '';
      if (p) {
        payload.password = /^[0-9a-fA-F]{64}$/.test(p) ? p : await hashBoardPassword(p);
      } else {
        payload.password = '';
      }
    }

    // Mantém o array collaboratorEmails sincronizado automaticamente com os colaboradores
    if (updates.collaborators && !updates.collaboratorEmails) {
      payload.collaboratorEmails = Object.values(updates.collaborators).map((c) =>
        c?.email ? c.email.toLowerCase() : ''
      ).filter(Boolean);
    }

    if (!isFirebaseConfigured || !db) {
      let local: Board[] = [];
      try {
        local = JSON.parse(localStorage.getItem(LOCAL_BOARDS_KEY) || '[]');
        if (!Array.isArray(local)) local = [];
      } catch {
        local = [];
      }
      const idx = local.findIndex((b) => b && (cleanBoardId(b.id) === boardId || b.id === `board_${boardId}`));
      if (idx !== -1) {
        local[idx] = { ...local[idx], ...payload, id: boardId };
        localStorage.setItem(LOCAL_BOARDS_KEY, JSON.stringify(local));
        notifyLocalSubscribers();
      }
      return;
    }

    const docRef = doc(db, 'boards', boardId);
    try {
      await updateDoc(docRef, payload);
    } catch {
      await setDoc(docRef, payload, { merge: true });
    }
  },

  /**
   * Remove um membro/convidado do quadro de forma definitiva:
   * 1. Remove da coleção members no Firestore (via deleteField) e localStorage
   * 2. Adiciona o UID em removedMemberIds para impedir que ele volte ou veja o quadro
   * 3. Remove a presença ativa no Realtime Database e BroadcastChannel
   * 4. Remove do histórico de quadros visitados do usuário
   */
  async removeBoardMember(rawBoardId: string, memberUid: string): Promise<void> {
    const boardId = cleanBoardId(rawBoardId);
    if (!boardId || !memberUid) return;

    // 1. Remove histórico local de visitas
    removeVisitedBoard(boardId, memberUid);

    // 2. Limpa presença no RTDB se estiver conectado
    if (isFirebaseConfigured && rtdb) {
      try {
        const presenceRef = rtdbRef(rtdb, `presence/${boardId}/${memberUid}`);
        await rtdbRemove(presenceRef);
      } catch (e) {
        console.warn('Erro ao remover presença RTDB:', e);
      }
    }

    // Broadcast local para abas desconectarem presença
    try {
      const channel = new BroadcastChannel(`mirio_presence_${boardId}`);
      channel.postMessage({ type: 'leave', userId: memberUid });
      channel.close();
    } catch {}

    // 3. Atualiza Firestore
    if (isFirebaseConfigured && db) {
      try {
        const docRef = doc(db, 'boards', boardId);
        await updateDoc(docRef, {
          [`members.${memberUid}`]: deleteField(),
          [`joinRequests.${memberUid}.status`]: 'rejected',
          removedMemberIds: arrayUnion(memberUid),
          updatedAt: Date.now(),
        });
        return;
      } catch (err) {
        console.warn('Erro ao remover membro do Firestore via updateDoc:', err);
      }
    }

    // 4. Armazenamento Local
    let local: Board[] = [];
    try {
      local = JSON.parse(localStorage.getItem(LOCAL_BOARDS_KEY) || '[]');
      if (!Array.isArray(local)) local = [];
    } catch {
      local = [];
    }
    const idx = local.findIndex((b) => b && (cleanBoardId(b.id) === boardId || b.id === `board_${boardId}`));
    if (idx !== -1) {
      const updatedMembers = { ...(local[idx].members || {}) };
      delete updatedMembers[memberUid];
      const updatedJoinRequests = { ...(local[idx].joinRequests || {}) };
      if (updatedJoinRequests[memberUid]) {
        updatedJoinRequests[memberUid] = {
          ...updatedJoinRequests[memberUid],
          status: 'rejected',
          respondedAt: Date.now(),
        };
      }
      const removedIds = Array.from(new Set([...(local[idx].removedMemberIds || []), memberUid]));
      local[idx] = {
        ...local[idx],
        members: updatedMembers,
        joinRequests: updatedJoinRequests,
        removedMemberIds: removedIds,
        updatedAt: Date.now(),
      };
      localStorage.setItem(LOCAL_BOARDS_KEY, JSON.stringify(local));
      notifyLocalSubscribers();
    }
  },

  /**
   * Re-adiciona / desbloqueia um membro previamente removido, restaurando seu acesso ao quadro.
   */
  async unremoveBoardMember(rawBoardId: string, memberUid: string, role: BoardPermission = 'edit'): Promise<void> {
    const boardId = cleanBoardId(rawBoardId);
    if (!boardId || !memberUid) return;

    if (isFirebaseConfigured && db) {
      try {
        const docRef = doc(db, 'boards', boardId);
        await updateDoc(docRef, {
          [`members.${memberUid}.role`]: role,
          removedMemberIds: arrayRemove(memberUid),
          updatedAt: Date.now(),
        });
        return;
      } catch (err) {
        console.warn('Erro ao desbloquear membro no Firestore via updateDoc:', err);
      }
    }

    // Armazenamento Local
    let local: Board[] = [];
    try {
      local = JSON.parse(localStorage.getItem(LOCAL_BOARDS_KEY) || '[]');
      if (!Array.isArray(local)) local = [];
    } catch {
      local = [];
    }
    const idx = local.findIndex((b) => b && (cleanBoardId(b.id) === boardId || b.id === `board_${boardId}`));
    if (idx !== -1) {
      const updatedMembers = { ...(local[idx].members || {}) };
      if (updatedMembers[memberUid]) {
        updatedMembers[memberUid] = { ...updatedMembers[memberUid], role };
      }
      const updatedRemoved = (local[idx].removedMemberIds || []).filter((id) => id !== memberUid);
      local[idx] = {
        ...local[idx],
        members: updatedMembers,
        removedMemberIds: updatedRemoved,
        updatedAt: Date.now(),
      };
      localStorage.setItem(LOCAL_BOARDS_KEY, JSON.stringify(local));
      notifyLocalSubscribers();
    }
  },

  /**
   * Envia uma solicitação de entrada na Sala de Espera para o anfitrião autorizar.
   */
  async requestBoardAccess(rawBoardId: string, user: CurrentUser): Promise<void> {
    const boardId = cleanBoardId(rawBoardId);
    if (!boardId || !user || !user.uid) return;

    const joinRequest: JoinRequest = {
      uid: user.uid,
      name: user.displayName || (user.isAnonymous ? 'Convidado' : 'Usuário'),
      email: user.email || null,
      photoURL: user.photoURL || null,
      isAnonymous: Boolean(user.isAnonymous),
      color: user.color || '#3b82f6',
      status: 'pending',
      requestedAt: Date.now(),
    };

    if (isFirebaseConfigured && db) {
      try {
        const docRef = doc(db, 'boards', boardId);
        await updateDoc(docRef, {
          [`joinRequests.${user.uid}`]: joinRequest,
          updatedAt: Date.now(),
        });
        return;
      } catch (err) {
        console.warn('Erro ao registrar solicitação de acesso no Firestore:', err);
      }
    }

    // Armazenamento Local
    let local: Board[] = [];
    try {
      local = JSON.parse(localStorage.getItem(LOCAL_BOARDS_KEY) || '[]');
      if (!Array.isArray(local)) local = [];
    } catch {
      local = [];
    }
    const idx = local.findIndex((b) => b && (cleanBoardId(b.id) === boardId || b.id === `board_${boardId}`));
    if (idx !== -1) {
      local[idx].joinRequests = {
        ...(local[idx].joinRequests || {}),
        [user.uid]: joinRequest,
      };
      local[idx].updatedAt = Date.now();
      localStorage.setItem(LOCAL_BOARDS_KEY, JSON.stringify(local));
      notifyLocalSubscribers();
    }
  },

  /**
   * Aprova uma solicitação de entrada na Sala de Espera, concedendo o papel escolhido
   * e restaurando o acesso mesmo se o convidado estivesse na lista de removidos.
   */
  async approveBoardAccess(
    rawBoardId: string,
    requestUid: string,
    role: BoardPermission = 'edit',
    requestData?: Partial<JoinRequest>
  ): Promise<void> {
    const boardId = cleanBoardId(rawBoardId);
    if (!boardId || !requestUid) return;

    const memberUpdate: Partial<BoardMember> = {
      uid: requestUid,
      name: requestData?.name || 'Convidado',
      email: requestData?.email || null,
      photoURL: requestData?.photoURL || null,
      color: requestData?.color || '#3b82f6',
      isAnonymous: Boolean(requestData?.isAnonymous),
      role,
      hasCustomRole: true,
      lastSeen: Date.now(),
    };

    if (isFirebaseConfigured && db) {
      try {
        const docRef = doc(db, 'boards', boardId);
        const updates: Record<string, unknown> = {
          [`joinRequests.${requestUid}.status`]: 'approved',
          [`joinRequests.${requestUid}.assignedRole`]: role,
          [`joinRequests.${requestUid}.respondedAt`]: Date.now(),
          [`members.${requestUid}.uid`]: requestUid,
          [`members.${requestUid}.name`]: memberUpdate.name,
          [`members.${requestUid}.email`]: memberUpdate.email,
          [`members.${requestUid}.photoURL`]: memberUpdate.photoURL,
          [`members.${requestUid}.color`]: memberUpdate.color,
          [`members.${requestUid}.isAnonymous`]: memberUpdate.isAnonymous,
          [`members.${requestUid}.role`]: role,
          [`members.${requestUid}.hasCustomRole`]: true,
          [`members.${requestUid}.lastSeen`]: Date.now(),
          removedMemberIds: arrayRemove(requestUid),
          updatedAt: Date.now(),
        };
        await updateDoc(docRef, updates);
        return;
      } catch (err) {
        console.warn('Erro ao aprovar solicitação no Firestore:', err);
      }
    }

    // Armazenamento Local
    let local: Board[] = [];
    try {
      local = JSON.parse(localStorage.getItem(LOCAL_BOARDS_KEY) || '[]');
      if (!Array.isArray(local)) local = [];
    } catch {
      local = [];
    }
    const idx = local.findIndex((b) => b && (cleanBoardId(b.id) === boardId || b.id === `board_${boardId}`));
    if (idx !== -1) {
      const b = local[idx];
      const currentReq = b.joinRequests?.[requestUid] || {
        uid: requestUid,
        name: memberUpdate.name || 'Convidado',
        status: 'pending',
        requestedAt: Date.now(),
      };
      b.joinRequests = {
        ...(b.joinRequests || {}),
        [requestUid]: {
          ...currentReq,
          status: 'approved',
          assignedRole: role,
          respondedAt: Date.now(),
        },
      };
      b.members = {
        ...(b.members || {}),
        [requestUid]: {
          uid: requestUid,
          name: memberUpdate.name || 'Convidado',
          email: memberUpdate.email || null,
          photoURL: memberUpdate.photoURL || null,
          color: memberUpdate.color || '#3b82f6',
          isAnonymous: Boolean(memberUpdate.isAnonymous),
          role,
          hasCustomRole: true,
          joinedAt: b.members?.[requestUid]?.joinedAt || Date.now(),
          lastSeen: Date.now(),
        },
      };
      b.removedMemberIds = (b.removedMemberIds || []).filter((id) => id !== requestUid);
      b.updatedAt = Date.now();
      localStorage.setItem(LOCAL_BOARDS_KEY, JSON.stringify(local));
      notifyLocalSubscribers();
    }
  },

  /**
   * Recusa uma solicitação de entrada na Sala de Espera.
   */
  async rejectBoardAccess(rawBoardId: string, requestUid: string): Promise<void> {
    const boardId = cleanBoardId(rawBoardId);
    if (!boardId || !requestUid) return;

    if (isFirebaseConfigured && db) {
      try {
        const docRef = doc(db, 'boards', boardId);
        await updateDoc(docRef, {
          [`joinRequests.${requestUid}.status`]: 'rejected',
          [`joinRequests.${requestUid}.respondedAt`]: Date.now(),
          [`members.${requestUid}.role`]: 'none',
          updatedAt: Date.now(),
        });
        return;
      } catch (err) {
        console.warn('Erro ao recusar solicitação no Firestore:', err);
      }
    }

    // Armazenamento Local
    let local: Board[] = [];
    try {
      local = JSON.parse(localStorage.getItem(LOCAL_BOARDS_KEY) || '[]');
      if (!Array.isArray(local)) local = [];
    } catch {
      local = [];
    }
    const idx = local.findIndex((b) => b && (cleanBoardId(b.id) === boardId || b.id === `board_${boardId}`));
    if (idx !== -1) {
      const b = local[idx];
      const currentReq = b.joinRequests?.[requestUid] || {
        uid: requestUid,
        name: 'Convidado',
        status: 'pending',
        requestedAt: Date.now(),
      };
      b.joinRequests = {
        ...(b.joinRequests || {}),
        [requestUid]: {
          ...currentReq,
          status: 'rejected',
          respondedAt: Date.now(),
        },
      };
      if (b.members?.[requestUid]) {
        b.members[requestUid].role = 'none';
      }
      b.updatedAt = Date.now();
      localStorage.setItem(LOCAL_BOARDS_KEY, JSON.stringify(local));
      notifyLocalSubscribers();
    }
  },

  /**
   * Aprova em lote todas as solicitações pendentes na Sala de Espera.
   */
  async approveAllBoardAccess(rawBoardId: string, role: BoardPermission = 'edit'): Promise<void> {
    const boardId = cleanBoardId(rawBoardId);
    if (!boardId) return;

    const board = await this.getBoard(boardId);
    if (!board || !board.joinRequests) return;

    const pendingUids = Object.entries(board.joinRequests)
      .filter(([_, req]) => req && req.status === 'pending')
      .map(([uid]) => uid);

    if (pendingUids.length === 0) return;

    for (const uid of pendingUids) {
      const req = board.joinRequests[uid];
      await this.approveBoardAccess(boardId, uid, role, req);
    }
  },

  /**
   * Ativa ou desativa a Sala de Espera do quadro.
   */
  async toggleWaitingRoom(rawBoardId: string, enabled: boolean): Promise<void> {
    await this.updateBoardSettings(rawBoardId, { waitingRoomEnabled: enabled });
  },

  /**
   * Remove um colaborador convidado por e-mail:
   * 1. Remove da coleção collaborators no Firestore (via deleteField) e localStorage
   * 2. Remove o e-mail do array collaboratorEmails
   */
  async removeBoardCollaborator(rawBoardId: string, email: string): Promise<void> {
    const boardId = cleanBoardId(rawBoardId);
    if (!boardId || !email) return;

    const emailLower = email.toLowerCase().trim();
    const emailKey = emailLower.replace(/[.#$[\]]/g, '_');

    if (isFirebaseConfigured && db) {
      try {
        const docRef = doc(db, 'boards', boardId);
        await updateDoc(docRef, {
          [`collaborators.${emailKey}`]: deleteField(),
          collaboratorEmails: arrayRemove(emailLower),
          updatedAt: Date.now(),
        });
        return;
      } catch (err) {
        console.warn('Erro ao remover colaborador do Firestore via updateDoc:', err);
      }
    }

    // Armazenamento Local
    let local: Board[] = [];
    try {
      local = JSON.parse(localStorage.getItem(LOCAL_BOARDS_KEY) || '[]');
      if (!Array.isArray(local)) local = [];
    } catch {
      local = [];
    }
    const idx = local.findIndex((b) => b && (cleanBoardId(b.id) === boardId || b.id === `board_${boardId}`));
    if (idx !== -1) {
      const updatedCollaborators = { ...(local[idx].collaborators || {}) };
      delete updatedCollaborators[emailKey];
      const updatedEmails = Object.values(updatedCollaborators)
        .map((c) => (c?.email ? c.email.toLowerCase() : ''))
        .filter(Boolean);
      local[idx] = {
        ...local[idx],
        collaborators: updatedCollaborators,
        collaboratorEmails: updatedEmails,
        updatedAt: Date.now(),
      };
      localStorage.setItem(LOCAL_BOARDS_KEY, JSON.stringify(local));
      notifyLocalSubscribers();
    }
  },

  /**
   * Registra um usuário ou convidado que acessou o quadro colaborativo,
   * garantindo que ele apareça na lista de "Pessoas com Acesso",
   * mesmo que tenha entrado sem Google (modo visitante / anônimo).
   */
  async registerBoardMember(
    rawBoardId: string,
    user: CurrentUser,
    defaultRole: BoardPermission = 'edit'
  ): Promise<void> {
    const boardId = cleanBoardId(rawBoardId);
    if (!boardId || !user || !user.uid) return;

    const memberData: BoardMember = {
      uid: user.uid,
      name: user.displayName || (user.isAnonymous ? 'Convidado' : 'Usuário'),
      email: user.email || null,
      photoURL: user.photoURL || null,
      role: defaultRole,
      hasCustomRole: false,
      joinedAt: Date.now(),
      lastSeen: Date.now(),
      isAnonymous: Boolean(user.isAnonymous),
      color: user.color || '#3b82f6',
    };

    // Atualiza armazenamento local
    let local: Board[] = [];
    try {
      local = JSON.parse(localStorage.getItem(LOCAL_BOARDS_KEY) || '[]');
      if (!Array.isArray(local)) local = [];
    } catch {
      local = [];
    }
    const idx = local.findIndex((b) => b && (cleanBoardId(b.id) === boardId || b.id === `board_${boardId}`));
    if (idx !== -1) {
      // O proprietário nunca deve ser adicionado aos membros/visitantes do seu próprio quadro
      if (local[idx].ownerId === user.uid) {
        return;
      }
      // Se o usuário foi removido deste quadro pelo proprietário e não foi re-convidado, não permite auto-registro
      const userEmailLower = user.email ? user.email.toLowerCase() : null;
      const isReinvitedLocal = (userEmailLower && (
        local[idx].collaboratorEmails?.includes(userEmailLower) ||
        (local[idx].collaborators && Object.values(local[idx].collaborators).some((c) => c?.email?.toLowerCase() === userEmailLower))
      )) || Boolean(local[idx].members?.[user.uid]?.role && local[idx].members[user.uid].role !== 'none');

      if (!isReinvitedLocal && (local[idx].removedMemberIds?.includes(user.uid) || local[idx].members?.[user.uid]?.role === 'none')) {
        return;
      }
      const currentMembers = local[idx].members || {};
      const existingMember = currentMembers[user.uid];
      local[idx].members = {
        ...currentMembers,
        [user.uid]: {
          ...memberData,
          role: existingMember?.role || memberData.role,
          hasCustomRole: Boolean(existingMember?.hasCustomRole),
          lastSeen: Date.now(),
        },
      };
      localStorage.setItem(LOCAL_BOARDS_KEY, JSON.stringify(local));
      notifyLocalSubscribers();
    }

    // Se Firebase estiver configurado, persiste em /boards/{boardId}.members.{uid}
    if (isFirebaseConfigured && db) {
      try {
        const boardRef = doc(db, 'boards', boardId);
        const boardSnap = await getDoc(boardRef);
        let finalRole = memberData.role;
        let finalHasCustom = false;

        if (boardSnap.exists()) {
          const boardData = boardSnap.data() as Board;
          // O proprietário nunca deve ser registrado como membro/visitante do seu próprio quadro
          if (boardData.ownerId === user.uid) {
            return;
          }
          const userEmailLower = user.email ? user.email.toLowerCase() : null;
          const isReinvitedFirestore = (userEmailLower && (
            boardData.collaboratorEmails?.includes(userEmailLower) ||
            (boardData.collaborators && Object.values(boardData.collaborators).some((c) => c?.email?.toLowerCase() === userEmailLower))
          )) || Boolean(boardData.members?.[user.uid]?.role && boardData.members[user.uid].role !== 'none');

          // Se o usuário foi removido deste quadro e não foi re-adicionado, não permite auto-registro
          if (!isReinvitedFirestore && (boardData.removedMemberIds?.includes(user.uid) || boardData.members?.[user.uid]?.role === 'none')) {
            return;
          }

          // Se já havia um papel ou customRole registrado, preserva para não sobrescrever papéis atribuídos pelo dono
          const existingFirestoreMember = boardData.members?.[user.uid];
          if (existingFirestoreMember) {
            finalRole = existingFirestoreMember.role || finalRole;
            finalHasCustom = Boolean(existingFirestoreMember.hasCustomRole);
          }

          // Se foi re-convidado, limpa seu UID de removedMemberIds no Firestore
          if (isReinvitedFirestore && boardData.removedMemberIds?.includes(user.uid)) {
            await updateDoc(boardRef, {
              removedMemberIds: arrayRemove(user.uid)
            }).catch(() => {});
          }
        } else {
          const legacySnap = await getDoc(doc(db, 'boards', `board_${boardId}`));
          if (legacySnap.exists() && (legacySnap.data() as Board).ownerId === user.uid) {
            return;
          }
        }

        await setDoc(
          boardRef,
          {
            members: {
              [user.uid]: {
                ...memberData,
                role: finalRole,
                hasCustomRole: finalHasCustom,
              },
            },
            updatedAt: Date.now(),
          },
          { merge: true }
        );
      } catch (err) {
        console.warn('Erro ao registrar membro do quadro no Firestore:', err);
      }
    }
  },

  /**
   * Remove o quadro do workspace de um colaborador (sem excluir o quadro original do proprietário).
   */
  async removeBoardFromUser(rawBoardId: string, user: CurrentUser): Promise<void> {
    const boardId = cleanBoardId(rawBoardId);
    if (!boardId) return;

    // 1. Remove dos visitados locais
    removeVisitedBoard(boardId, user.uid);
    removeVisitedBoard(`board_${boardId}`, user.uid);

    // 2. Se for um usuário com e-mail convidado, remove da lista de colaboradores
    if (user.email) {
      const emailLower = user.email.toLowerCase();
      const board = await this.getBoard(boardId);
      if (board && board.collaborators) {
        const emailKey = emailLower.replace(/[.#$[\]]/g, '_');
        if (board.collaborators[emailKey]) {
          const updated = { ...board.collaborators };
          delete updated[emailKey];
          const emails = Object.values(updated).map((c) => c?.email ? c.email.toLowerCase() : '').filter(Boolean);
          await this.updateBoardSettings(boardId, {
            collaborators: updated,
            collaboratorEmails: emails,
          });
        }
      }
    }

    notifyLocalSubscribers();
  },

  async deleteBoard(rawBoardId: string): Promise<void> {
    const boardId = cleanBoardId(rawBoardId);
    if (!boardId) return;

    if (!isFirebaseConfigured || !db) {
      let local: Board[] = [];
      try {
        local = JSON.parse(localStorage.getItem(LOCAL_BOARDS_KEY) || '[]');
        if (!Array.isArray(local)) local = [];
      } catch {
        local = [];
      }
      const filtered = local.filter((b) => b && cleanBoardId(b.id) !== boardId && b.id !== `board_${boardId}`);
      localStorage.setItem(LOCAL_BOARDS_KEY, JSON.stringify(filtered));
      // Remove elementos associados (chave limpa e chave legada)
      localStorage.removeItem(`mirio_board_elements_${boardId}`);
      localStorage.removeItem(`mirio_board_elements_board_${boardId}`);
      notifyLocalSubscribers();
      return;
    }

    try {
      // 1. Limpa subcoleção de elementos do canvas para evitar documentos órfãos que ocupam armazenamento no Firestore
      const elementsRef = collection(db, 'boards', boardId, 'elements');
      const snap = await getDocs(elementsRef);
      if (!snap.empty) {
        const ids = snap.docs.map((d) => d.id);
        const MAX_BATCH_SIZE = 400;
        for (let i = 0; i < ids.length; i += MAX_BATCH_SIZE) {
          const chunk = ids.slice(i, i + MAX_BATCH_SIZE);
          const batch = writeBatch(db);
          chunk.forEach((id) => batch.delete(doc(db!, 'boards', boardId, 'elements', id)));
          await batch.commit();
        }
      }

      // 2. Remove o documento raiz do quadro
      const docRef = doc(db, 'boards', boardId);
      await deleteDoc(docRef);

      // Tenta remover também documento com prefixo legado se existia
      try {
        await deleteDoc(doc(db, 'boards', `board_${boardId}`));
      } catch {}

      // 3. Remove sala de presença residual no Realtime Database
      if (rtdb) {
        try {
          const presenceRef = rtdbRef(rtdb, `presence/${boardId}`);
          await rtdbRemove(presenceRef);
        } catch {
          // Ignora se não houver presença ativa
        }
      }

      // Remove cache local do navegador
      localStorage.removeItem(`mirio_board_elements_${boardId}`);
      localStorage.removeItem(`mirio_board_elements_board_${boardId}`);
    } catch (err) {
      console.error('Erro ao deletar quadro do Firestore:', err);
      throw err;
    }
  }
};
