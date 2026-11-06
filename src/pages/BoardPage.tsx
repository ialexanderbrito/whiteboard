import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { boardService } from '../services/boardService';
import { elementService } from '../services/elementService';
import { presenceService } from '../services/presenceService';
import type { Board, UserPresence } from '../types/board';
import type { CanvasElement, ToolType } from '../types/element';
import { WhiteboardCanvas } from '../components/whiteboard/WhiteboardCanvas';
import { Toolbar } from '../components/whiteboard/Toolbar';
import { RemoteCursors } from '../components/whiteboard/RemoteCursors';
import { Navbar } from '../components/layout/Navbar';
import { STICKY_COLORS } from '../utils/colors';

export const BoardPage: React.FC = () => {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const { currentUser, loading: authLoading, signInAsGuest, logout } = useAuth();

  const [board, setBoard] = useState<Board | null>(null);
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [remoteUsers, setRemoteUsers] = useState<UserPresence[]>([]);
  const [currentTool, setCurrentTool] = useState<ToolType>('select');
  const [selectedColor, setSelectedColor] = useState(STICKY_COLORS[0].value);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  // Zoom e Posição do Canvas
  const [scale, setScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });

  // Modal para visitante entrar direto pelo link sem login
  const [guestName, setGuestName] = useState('');
  const [isSubmittingGuest, setIsSubmittingGuest] = useState(false);

  // Referência para os controles de presença
  const presenceControls = useRef<{
    updateCursor: (x: number, y: number) => void;
    updateSelection: (id: string | null) => void;
    leaveBoard: () => void;
  } | null>(null);

  // Carrega metadados do quadro
  useEffect(() => {
    if (!boardId) return;
    boardService.getBoard(boardId).then((b) => {
      if (b) {
        setBoard(b);
      } else {
        // Se o quadro não existir no Firestore, cria um inicial
        const initialBoard: Board = {
          id: boardId,
          title: 'Quadro em Branco',
          ownerId: currentUser?.uid || 'guest',
          ownerName: currentUser?.displayName || 'Convidado',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        setBoard(initialBoard);
      }
    });
  }, [boardId, currentUser]);

  // Escuta os elementos do canvas em tempo real no Firestore
  useEffect(() => {
    if (!boardId || !currentUser) return;
    const unsubscribe = elementService.subscribeElements(boardId, (elems) => {
      setElements(elems);
    });
    return () => unsubscribe();
  }, [boardId, currentUser]);

  // Conecta ao serviço de presença e cursores em tempo real (RTDB)
  useEffect(() => {
    if (!boardId || !currentUser) return;

    const controls = presenceService.joinBoard(boardId, currentUser, (users) => {
      setRemoteUsers(users);
    });
    presenceControls.current = controls;

    return () => {
      controls.leaveBoard();
      presenceControls.current = null;
    };
  }, [boardId, currentUser]);

  // Transmite seleção para os colegas
  const handleSelectionChange = (id: string | null) => {
    setSelectedElementId(id);
    presenceControls.current?.updateSelection(id);
  };

  // Transmite movimento do cursor para os colegas
  const handleCursorMove = (x: number, y: number) => {
    presenceControls.current?.updateCursor(x, y);
  };

  const handleUpdateTitle = async (newTitle: string) => {
    if (!boardId || !board) return;
    setBoard({ ...board, title: newTitle });
    await boardService.updateBoardTitle(boardId, newTitle);
  };

  const handleAddElement = async (elem: Omit<CanvasElement, 'id' | 'updatedAt'>) => {
    if (!boardId) return '';
    return await elementService.addElement(boardId, elem);
  };

  const handleUpdateElement = async (id: string, updates: Partial<CanvasElement>) => {
    if (!boardId) return;
    await elementService.updateElement(boardId, id, updates);
  };

  const handleDeleteElement = async (id: string) => {
    if (!boardId) return;
    await elementService.deleteElement(boardId, id);
    if (selectedElementId === id) {
      handleSelectionChange(null);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedElementId) {
      handleDeleteElement(selectedElementId);
    }
  };

  // Controles de zoom
  const handleZoomIn = () => setScale((prev) => Math.min(5, prev * 1.2));
  const handleZoomOut = () => setScale((prev) => Math.max(0.1, prev / 1.2));
  const handleResetZoom = () => {
    setScale(1);
    setStagePos({ x: 0, y: 0 });
  };

  if (authLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  // Se o usuário acessou o link do quadro sem estar logado
  if (!currentUser) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-100 p-4">
        <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full text-center border border-slate-200">
          <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 font-black text-2xl">
            M
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Entrar no Whiteboard</h2>
          <p className="text-slate-500 text-sm mb-6">
            Você foi convidado para colaborar neste quadro. Como quer ser chamado?
          </p>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!guestName.trim()) return;
              setIsSubmittingGuest(true);
              try {
                await signInAsGuest(guestName);
              } catch (err) {
                console.error(err);
              } finally {
                setIsSubmittingGuest(false);
              }
            }}
            className="flex flex-col gap-3"
          >
            <input
              type="text"
              autoFocus
              placeholder="Digite seu nome ou apelido"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none text-slate-800"
              required
            />
            <button
              type="submit"
              disabled={isSubmittingGuest || !guestName.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition shadow-lg shadow-blue-500/25 disabled:opacity-50"
            >
              {isSubmittingGuest ? 'Entrando...' : 'Entrar como Convidado'}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-400">ou</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/login')}
            className="w-full text-sm text-slate-600 hover:text-slate-900 font-medium py-2 rounded-xl transition"
          >
            Fazer login com conta Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#f8fafc]">
      {/* Barra de Navegação Superior */}
      <Navbar
        title={board?.title || 'Quadro sem título'}
        onUpdateTitle={handleUpdateTitle}
        onBackToDashboard={() => navigate('/')}
        currentUser={currentUser}
        remoteUsers={remoteUsers}
        onLogout={logout}
      />

      {/* Barra Lateral de Ferramentas Estilo Miro */}
      <Toolbar
        currentTool={currentTool}
        onSelectTool={setCurrentTool}
        selectedColor={selectedColor}
        onSelectColor={setSelectedColor}
        hasSelection={Boolean(selectedElementId)}
        onDeleteSelected={handleDeleteSelected}
        scale={scale}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetZoom={handleResetZoom}
      />

      {/* Camada de Cursores Remotos Voando na Tela */}
      <RemoteCursors
        remoteUsers={remoteUsers}
        stageX={stagePos.x}
        stageY={stagePos.y}
        scale={scale}
      />

      {/* Canvas Principal com Konva */}
      <WhiteboardCanvas
        boardId={boardId || ''}
        currentUser={currentUser}
        elements={elements}
        remoteUsers={remoteUsers}
        currentTool={currentTool}
        selectedColor={selectedColor}
        onSelectTool={setCurrentTool}
        onAddElement={handleAddElement}
        onUpdateElement={handleUpdateElement}
        onDeleteElement={handleDeleteElement}
        onCursorMove={handleCursorMove}
        onSelectionChange={handleSelectionChange}
        scale={scale}
        stagePos={stagePos}
        onStageChange={(pos, newScale) => {
          setStagePos(pos);
          setScale(newScale);
        }}
      />
    </div>
  );
};
