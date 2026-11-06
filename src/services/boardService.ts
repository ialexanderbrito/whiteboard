import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  deleteDoc, 
  updateDoc, 
  query, 
  orderBy, 
  onSnapshot 
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../config/firebase';
import type { Board, CurrentUser } from '../types/board';

const LOCAL_BOARDS_KEY = 'mirio_local_boards';

export const boardService = {
  async createBoard(title: string, user: CurrentUser): Promise<string> {
    const boardId = 'board_' + Math.random().toString(36).substring(2, 10);
    const newBoard: Board = {
      id: boardId,
      title: title.trim() || 'Quadro sem título',
      ownerId: user.uid,
      ownerName: user.displayName,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    if (!isFirebaseConfigured || !db) {
      const local = JSON.parse(localStorage.getItem(LOCAL_BOARDS_KEY) || '[]');
      local.unshift(newBoard);
      localStorage.setItem(LOCAL_BOARDS_KEY, JSON.stringify(local));
      return boardId;
    }

    const boardRef = doc(db, 'boards', boardId);
    await setDoc(boardRef, newBoard);
    return boardId;
  },

  subscribeBoards(callback: (boards: Board[]) => void): () => void {
    if (!isFirebaseConfigured || !db) {
      const load = () => {
        const local: Board[] = JSON.parse(localStorage.getItem(LOCAL_BOARDS_KEY) || '[]');
        callback(local);
      };
      load();
      window.addEventListener('storage', load);
      return () => window.removeEventListener('storage', load);
    }

    const boardsRef = collection(db, 'boards');
    const q = query(boardsRef, orderBy('updatedAt', 'desc'));

    return onSnapshot(q, (snapshot) => {
      const boards: Board[] = snapshot.docs.map((docSnap) => docSnap.data() as Board);
      callback(boards);
    }, (error) => {
      console.error('Erro ao escutar quadros:', error);
    });
  },

  async getBoard(boardId: string): Promise<Board | null> {
    if (!isFirebaseConfigured || !db) {
      const local: Board[] = JSON.parse(localStorage.getItem(LOCAL_BOARDS_KEY) || '[]');
      return local.find(b => b.id === boardId) || {
        id: boardId,
        title: 'Quadro Demonstrativo',
        ownerId: 'local',
        ownerName: 'Alexander',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
    }

    const docRef = doc(db, 'boards', boardId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return snap.data() as Board;
  },

  async updateBoardTitle(boardId: string, title: string): Promise<void> {
    if (!isFirebaseConfigured || !db) {
      const local: Board[] = JSON.parse(localStorage.getItem(LOCAL_BOARDS_KEY) || '[]');
      const idx = local.findIndex(b => b.id === boardId);
      if (idx !== -1) {
        local[idx].title = title;
        local[idx].updatedAt = Date.now();
        localStorage.setItem(LOCAL_BOARDS_KEY, JSON.stringify(local));
      }
      return;
    }

    const docRef = doc(db, 'boards', boardId);
    await updateDoc(docRef, {
      title,
      updatedAt: Date.now(),
    });
  },

  async deleteBoard(boardId: string): Promise<void> {
    if (!isFirebaseConfigured || !db) {
      const local: Board[] = JSON.parse(localStorage.getItem(LOCAL_BOARDS_KEY) || '[]');
      const filtered = local.filter(b => b.id !== boardId);
      localStorage.setItem(LOCAL_BOARDS_KEY, JSON.stringify(filtered));
      return;
    }

    const docRef = doc(db, 'boards', boardId);
    await deleteDoc(docRef);
  }
};
