import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs,
  deleteDoc, 
  updateDoc, 
  writeBatch,
  onSnapshot 
} from 'firebase/firestore';
import { ref as rtdbRef, remove as rtdbRemove } from 'firebase/database';
import { db, rtdb, isFirebaseConfigured } from '../config/firebase';
import type { Board, BoardCollaborator, BoardMember, BoardPermission, CurrentUser } from '../types/board';

export interface CreateBoardOptions {
  boardId?: string;
  title: string;
  defaultPermission?: BoardPermission;
  collaborators?: Record<string, BoardCollaborator>;
  collaboratorEmails?: string[];
  isPasswordProtected?: boolean;
  password?: string;
}

const LOCAL_BOARDS_KEY = 'mirio_local_boards';
const BOARDS_CHANNEL_NAME = 'mirio_boards_channel';
const VISITED_BOARDS_PREFIX = 'mirio_visited_boards_';

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
    const password = isPasswordProtected && options.password ? options.password.trim() : '';

    const newBoard: Board = {
      id: boardId,
      title,
      ownerId: user.uid,
      ownerName: user.displayName,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      defaultPermission,
      collaborators,
      collaboratorEmails,
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
      return boardId;
    }

    const boardRef = doc(db, 'boards', boardId);
    await setDoc(boardRef, newBoard);
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

          // 3. É membro registrado no quadro
          if (b.members && b.members[user.uid]) {
            return true;
          }

          // 4. Compartilhado com convidados (acesso geral liberado !== 'none', padrão é 'edit')
          if (b.defaultPermission !== 'none') {
            return true;
          }

          // 5. Foi visitado por este usuário via link e não possui acesso restrito ('none')
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
    // Escuta em tempo real todos os quadros da coleção 'boards'
    // e inclui os quadros do proprietário, convidados diretos e quadros compartilhados com convidados
    const boardsRef = collection(db, 'boards');
    const unsub = onSnapshot(
      boardsRef,
      (snapshot) => {
        const visitedIds = getVisitedBoardIds(user.uid);
        const userEmailLower = user.email ? user.email.toLowerCase() : null;
        const validBoards: Board[] = [];

        snapshot.docs.forEach((docSnap) => {
          const rawData = docSnap.data() as Partial<Board>;
          if (!rawData || typeof rawData !== 'object') return;

          const cleanId = cleanBoardId(docSnap.id || rawData?.id);
          if (!cleanId) return;
          const b: Board = {
            id: cleanId,
            title: typeof rawData.title === 'string' && rawData.title.trim() ? rawData.title.trim() : 'Quadro sem título',
            ownerId: rawData.ownerId || '',
            ownerName: rawData.ownerName || 'Alexander',
            createdAt: rawData.createdAt || Date.now(),
            updatedAt: rawData.updatedAt || rawData.createdAt || Date.now(),
            defaultPermission: rawData.defaultPermission || 'edit',
            collaborators: rawData.collaborators || {},
            collaboratorEmails: Array.isArray(rawData.collaboratorEmails)
              ? rawData.collaboratorEmails.filter(Boolean).map((e) => String(e).toLowerCase())
              : [],
            members: rawData.members || {},
            isPasswordProtected: Boolean(rawData.isPasswordProtected),
            password: rawData.password || '',
          };

          // 1. É o proprietário do quadro
          if (b.ownerId === user.uid) {
            validBoards.push(b);
            return;
          }

          // 2. Convidado diretamente por e-mail
          if (userEmailLower) {
            if (b.collaboratorEmails && b.collaboratorEmails.includes(userEmailLower)) {
              validBoards.push(b);
              return;
            }
            if (b.collaborators && Object.values(b.collaborators).some((c) => c?.email && String(c.email).toLowerCase() === userEmailLower)) {
              validBoards.push(b);
              return;
            }
          }

          // 3. É membro registrado no quadro
          if (b.members && b.members[user.uid]) {
            validBoards.push(b);
            return;
          }

          // 4. Compartilhado com convidados (acesso geral liberado !== 'none', padrão é 'edit')
          if (b.defaultPermission !== 'none') {
            validBoards.push(b);
            return;
          }

          // 5. Foi visitado por este usuário via link e não possui acesso restrito ('none')
          if (visitedIds.includes(b.id) && b.defaultPermission !== 'none') {
            validBoards.push(b);
            return;
          }
        });

        // Deduplica por ID limpo
        const uniqueMap = new Map<string, Board>();
        validBoards.forEach((b) => {
          const id = cleanBoardId(b?.id);
          if (id && !uniqueMap.has(id)) {
            uniqueMap.set(id, { ...b, id });
          }
        });

        const list = Array.from(uniqueMap.values());
        list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        callback(list);
      },
      (error) => {
        console.error('Erro ao escutar quadros no Firestore:', error);
      }
    );

    return () => unsub();
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
  },

  async updateBoardSettings(
    rawBoardId: string,
    updates: Partial<Pick<Board, 'title' | 'ownerId' | 'ownerName' | 'defaultPermission' | 'collaborators' | 'collaboratorEmails' | 'members' | 'isPasswordProtected' | 'password'>>
  ): Promise<void> {
    const boardId = cleanBoardId(rawBoardId);
    if (!boardId) return;

    const payload: Record<string, unknown> = {
      ...updates,
      updatedAt: Date.now(),
    };

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
    await setDoc(docRef, payload, { merge: true });
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
      const currentMembers = local[idx].members || {};
      const existingRole = currentMembers[user.uid]?.role;
      local[idx].members = {
        ...currentMembers,
        [user.uid]: {
          ...memberData,
          role: existingRole || memberData.role,
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
        if (boardSnap.exists()) {
          const boardData = boardSnap.data() as Board;
          // O proprietário nunca deve ser registrado como membro/visitante do seu próprio quadro
          if (boardData.ownerId === user.uid) {
            return;
          }
          if (!boardData.ownerId && !user.isAnonymous && user.displayName && user.displayName === boardData.ownerName) {
            return;
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
              [user.uid]: memberData,
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
