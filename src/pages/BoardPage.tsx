import React, { useState, useEffect, useRef, useCallback, Suspense, lazy } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { boardService, cleanBoardId } from '../services/boardService';
import { elementService } from '../services/elementService';
import { presenceService } from '../services/presenceService';
import type { Board, UserPresence } from '../types/board';
import type { CanvasElement, ToolType } from '../types/element';
import type { SprintTemplate } from '../utils/sprintTemplates';
import { generateTemplateElements } from '../utils/sprintTemplates';
import { WhiteboardCanvas } from '../components/whiteboard/WhiteboardCanvas';
import { type GridType, type GridSize, DEFAULT_GRID_OPACITY } from '../components/whiteboard/CanvasGrid';
import { Toolbar } from '../components/whiteboard/Toolbar';
import { RemoteCursors } from '../components/whiteboard/RemoteCursors';
import { LaserTrailOverlay, type LaserPoint } from '../components/whiteboard/LaserTrailOverlay';
import { CursorChat } from '../components/whiteboard/CursorChat';
import { Navbar } from '../components/layout/Navbar';
import { FollowUserBanner } from '../components/whiteboard/FollowUserBanner';
import { BoardTimerWidget } from '../components/whiteboard/BoardTimerWidget';
import { timerService, sanitizeTimerState, type BoardTimerState } from '../services/timerService';
import { VotingSessionBar } from '../components/whiteboard/VotingSessionBar';
import { GlobalReactionsOverlay } from '../components/whiteboard/GlobalReactionsOverlay';
import { PresentationControlBar } from '../components/whiteboard/PresentationControlBar';
import { BoardPasswordLockModal } from '../components/whiteboard/BoardPasswordLockModal';
import { votingService, type BoardVotingData, type VotingSessionConfig } from '../services/votingService';
import { playChimeSound } from '../utils/audioChime';
import { STICKY_COLORS } from '../utils/colors';
import { alignElements, type AlignmentType } from '../utils/alignment';
import { getUserBoardPermission, isBoardOwner } from '../utils/permissions';
import { Button } from '@/components/ui/button';
import { Lock } from 'lucide-react';
import { CommandPalette } from '../components/command/CommandPalette';
import { useTheme } from '../context/ThemeContext';
import { SprintTemplatesModal } from '../components/whiteboard/SprintTemplatesModal';
import { EditProfileModal } from '../components/whiteboard/EditProfileModal';
import { NotFoundPage } from './NotFoundPage';
import { LoadingScreen } from '../components/layout/LoadingScreen';
import { MobileReadOnlyDrawer } from '../components/whiteboard/MobileReadOnlyDrawer';

// Modais pesados carregados sob demanda (Code-Splitting) para carregamento instantâneo do quadro
const StickersModal = lazy(() => import('../components/whiteboard/StickersModal').then(m => ({ default: m.StickersModal })));
const VotingLeaderboardModal = lazy(() => import('../components/whiteboard/VotingLeaderboardModal').then(m => ({ default: m.VotingLeaderboardModal })));
const VotingSetupModal = lazy(() => import('../components/whiteboard/VotingSetupModal').then(m => ({ default: m.VotingSetupModal })));
const KeyboardShortcutsModal = lazy(() => import('../components/whiteboard/KeyboardShortcutsModal').then(m => ({ default: m.KeyboardShortcutsModal })));

export const BoardPage: React.FC = () => {
  const { boardId: rawBoardId } = useParams<{ boardId: string }>();
  const boardId = (rawBoardId || '').replace(/^board_/, '');
  const navigate = useNavigate();

  // Redireciona links com o prefixo redundante "board_" (ex: /b/board_xyz -> /b/xyz) mantendo o estado
  useEffect(() => {
    if (rawBoardId && rawBoardId.startsWith('board_')) {
      navigate(`/b/${boardId}`, { replace: true });
    }
  }, [rawBoardId, boardId, navigate]);
  const { currentUser, loading: authLoading, updateGuestProfile, logout } = useAuth();

  const [board, setBoard] = useState<Board | null>(null);
  const [boardLoading, setBoardLoading] = useState<boolean>(true);
  const [boardNotFound, setBoardNotFound] = useState<boolean>(false);
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [remoteUsers, setRemoteUsers] = useState<UserPresence[]>([]);
  const [currentTool, setCurrentTool] = useState<ToolType>('select');
  const [selectedColor, setSelectedColor] = useState(STICKY_COLORS[0].value);
  const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
  );
  const [isMobileNoticeOpen, setIsMobileNoticeOpen] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const handleViewportChange = (event: MediaQueryListEvent) => setIsMobile(event.matches);
    setIsMobile(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleViewportChange);
    return () => mediaQuery.removeEventListener('change', handleViewportChange);
  }, []);

  useEffect(() => {
    if (isMobile) {
      setIsMobileNoticeOpen(true);
    } else {
      setIsMobileNoticeOpen(false);
    }
  }, [isMobile]);

  // Configurações avançadas da caneta estilo Miro
  const [penMode, setPenMode] = useState<'pen' | 'highlighter' | 'eraser'>('pen');
  const [penStrokeWidth, setPenStrokeWidth] = useState<number>(4);
  const [smartDrawing, setSmartDrawing] = useState<boolean>(true);
  const [eraserMode, setEraserMode] = useState<'whole' | 'partial'>('whole');
  const [eraserSize, setEraserSize] = useState<number>(22);

  // Pilhas de Histórico Desfazer / Refazer (Ctrl+Z / Ctrl+Y)
  const [historyPast, setHistoryPast] = useState<CanvasElement[][]>([]);
  const [historyFuture, setHistoryFuture] = useState<CanvasElement[][]>([]);

  // Coordenadas mundiais do cursor em tempo real
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Rastreia a posição atual do mouse sem provocar re-render desnecessário
  const currentMousePosRef = useRef<{ x: number; y: number }>({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
  });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      currentMousePosRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Chat do Cursor Flutuante (Estilo Figma)
  const [isCursorChatOpen, setIsCursorChatOpen] = useState(false);
  const [mouseScreenPos, setMouseScreenPos] = useState<{ x: number; y: number }>({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
  });
  const [myActiveMessage, setMyActiveMessage] = useState<string | null>(null);
  const messageTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Modal de Stickers, Emojis e GIFs
  const [isStickersModalOpen, setIsStickersModalOpen] = useState(false);
  // Modal de Ajuda & Atalhos de Teclado
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  // Modal da Paleta de Comandos (Cmd+K / Spotlight)
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  // Modal de Edição de Perfil / Nome de Convidado
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  // Modal de Templates de Sprint disparado via Command K
  const [isSprintTemplatesOpen, setIsSprintTemplatesOpen] = useState(false);

  const { isDark, toggleTheme } = useTheme();

  // Zoom e Posição do Canvas
  const [scale, setScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });

  // Modo Seguir Usuário (Spectator Mode)
  const [followingUserId, setFollowingUserId] = useState<string | null>(null);
  const [followingUserName, setFollowingUserName] = useState<string>('');

  // Posicionamento da barra de ferramentas (persistido em localStorage)
  const [toolbarPosition, setToolbarPosition] = useState<'left' | 'bottom'>(() => {
    return (localStorage.getItem('mirio_toolbar_position') as 'left' | 'bottom') || 'left';
  });

  const handleChangeToolbarPosition = (pos: 'left' | 'bottom') => {
    setToolbarPosition(pos);
    localStorage.setItem('mirio_toolbar_position', pos);
  };

  // Configurações da grade do canvas (estilo, densidade e visibilidade com persistência no localStorage)
  const [showGrid, setShowGrid] = useState<boolean>(() => {
    const saved = localStorage.getItem('mirio_show_grid');
    return saved !== null ? saved !== 'false' : true;
  });
  const [gridType, setGridType] = useState<GridType>(() => {
    return (localStorage.getItem('mirio_grid_type') as GridType) || 'hybrid';
  });
  const [gridSize, setGridSize] = useState<GridSize>(() => {
    return (localStorage.getItem('mirio_grid_size') as GridSize) || 'medium';
  });
  const [gridOpacity, setGridOpacity] = useState<number>(() => {
    const saved = localStorage.getItem('mirio_grid_opacity');
    if (saved !== null) {
      const parsed = parseFloat(saved);
      if (!isNaN(parsed) && parsed >= 0.1 && parsed <= 1.0) {
        return parsed;
      }
    }
    return DEFAULT_GRID_OPACITY;
  });

  const handleToggleGrid = (show?: boolean) => {
    setShowGrid((prev) => {
      const next = typeof show === 'boolean' ? show : !prev;
      localStorage.setItem('mirio_show_grid', String(next));
      return next;
    });
  };

  const handleChangeGridType = (type: GridType) => {
    setGridType(type);
    localStorage.setItem('mirio_grid_type', type);
  };

  const handleChangeGridSize = (size: GridSize) => {
    setGridSize(size);
    localStorage.setItem('mirio_grid_size', size);
  };

  const handleChangeGridOpacity = (opacity: number) => {
    const clamped = Math.max(0.1, Math.min(1.0, opacity));
    setGridOpacity(clamped);
    localStorage.setItem('mirio_grid_opacity', String(clamped));
  };

  // Configuração de exibição dos cursores remotos dos colegas (persistido em localStorage)
  const [showRemoteCursors, setShowRemoteCursors] = useState<boolean>(() => {
    const saved = localStorage.getItem('mirio_show_remote_cursors');
    return saved !== null ? saved !== 'false' : true;
  });

  const handleToggleRemoteCursors = (show?: boolean) => {
    setShowRemoteCursors((prev) => {
      const next = typeof show === 'boolean' ? show : !prev;
      localStorage.setItem('mirio_show_remote_cursors', String(next));
      return next;
    });
  };

  // Modo Apresentação em Tela Cheia
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);

  // Frames para navegação de slides na apresentação
  const frames = React.useMemo(() => elements.filter((e) => e.type === 'frame'), [elements]);

  const handleEnterPresentation = () => {
    setIsPresentationMode(true);
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.().catch(() => {});
      }
    } catch {}
  };

  const handleExitPresentation = () => {
    setIsPresentationMode(false);
    try {
      if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {});
      }
    } catch {}
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsPresentationMode(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleNavigateFrame = (index: number) => {
    const frame = frames[index];
    if (frame) {
      setCurrentFrameIndex(index);
      const fw = frame.width || 460;
      const fh = frame.height || 560;
      const scaleX = (window.innerWidth - 80) / fw;
      const scaleY = (window.innerHeight - 120) / fh;
      const targetScale = Math.max(0.2, Math.min(1.4, Math.min(scaleX, scaleY)));
      const targetX = (window.innerWidth - fw * targetScale) / 2 - frame.x * targetScale;
      const targetY = (window.innerHeight - fh * targetScale) / 2 - frame.y * targetScale;
      setStagePos({ x: Math.round(targetX), y: Math.round(targetY) });
      setScale(targetScale);
    }
  };

  const handleJumpToFrame = (frame: CanvasElement) => {
    const frameIndex = frames.findIndex((f) => f.id === frame.id);
    if (frameIndex !== -1) {
      handleNavigateFrame(frameIndex);
    }
  };

  const handleExportJSON = () => {
    if (!board) return;
    const data = JSON.stringify({ board, elements }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(board.title || 'quadro').replace(/\s+/g, '_')}_backup.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPNG = () => {
    const canvas = document.querySelector('.konvajs-content canvas') as HTMLCanvasElement | null;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${(board?.title || 'quadro').replace(/\s+/g, '_')}_export.png`;
    a.click();
  };

  const handleStartTimerQuick = (seconds: number) => {
    if (!boardId) return;
    const name = currentUser?.displayName || 'Participante';
    setIsTimerOpen(true);
    timerService.startTimer(boardId, seconds, seconds, name);
  };

  const handleCopyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {}
  };

  // Atualização em tempo real do perfil/nome do convidado
  const handleSaveProfile = async (newName: string, newColor: string) => {
    await updateGuestProfile(newName, newColor);
    if (presenceControls.current) {
      presenceControls.current.updateProfile(newName, newColor);
    }
  };

  // Proteção por Senha do Quadro
  const [isUnlocked, setIsUnlocked] = useState(false);

  useEffect(() => {
    if (boardId) {
      const saved = sessionStorage.getItem(`mirio_unlocked_${boardId}`);
      if (saved === 'true') {
        setIsUnlocked(true);
      }
    }
  }, [boardId]);

  const isPasswordRequired = Boolean(
    board?.isPasswordProtected &&
    board.password &&
    currentUser &&
    board.ownerId !== currentUser.uid &&
    !isUnlocked
  );

  const handleUnlockPassword = (passwordEntered: string) => {
    if (passwordEntered === board?.password) {
      setIsUnlocked(true);
      if (boardId) {
        sessionStorage.setItem(`mirio_unlocked_${boardId}`, 'true');
      }
      return true;
    }
    return false;
  };

  // Timer Colaborativo Sincronizado
  const [isTimerOpen, setIsTimerOpen] = useState(false);
  const [timerState, setTimerState] = useState<BoardTimerState | null>(null);

  useEffect(() => {
    if (!boardId || !currentUser) return;
    const unsubscribe = timerService.subscribeTimer(boardId, (state) => {
      setTimerState(state);
    });
    return unsubscribe;
  }, [boardId, currentUser]);

  const handleToggleTimer = () => {
    const isCurrentlyActive = isTimerOpen || Boolean(timerState?.isOpenForEveryone) || Boolean(timerState?.isRunning);
    const name = currentUser?.displayName || 'Participante';
    if (isCurrentlyActive) {
      setIsTimerOpen(false);
      timerService.closeTimer(boardId, name);
    } else {
      setIsTimerOpen(true);
      timerService.openTimer(boardId, name);
    }
  };

  // Votação Colaborativa Estruturada (Estilo Miro)
  const [votingData, setVotingData] = useState<BoardVotingData | null>(null);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isVotingSetupOpen, setIsVotingSetupOpen] = useState(false);

  useEffect(() => {
    if (!boardId) return;
    const unsubscribe = votingService.subscribeVoting(boardId, (data) => {
      setVotingData(data);
    });
    return unsubscribe;
  }, [boardId]);

  // Notificação com áudio quando uma nova sessão de votação é iniciada para alertar todos na sala
  const prevSessionIdRef = useRef<string | null>(null);
  const [showVotingToast, setShowVotingToast] = useState(false);

  useEffect(() => {
    const currentSession = votingData?.session;
    if (currentSession && currentSession.status === 'active') {
      if (prevSessionIdRef.current !== currentSession.id) {
        try {
          playChimeSound();
        } catch {}
        setShowVotingToast(true);
        const timer = setTimeout(() => setShowVotingToast(false), 8000);
        return () => clearTimeout(timer);
      }
    }
    prevSessionIdRef.current = currentSession?.id || null;
  }, [votingData?.session?.id, votingData?.session?.status]);

  // Monitora encerramento remoto ou por timer para abrir o pódio/resultados
  const prevSessionStatusRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    const currentStatus = votingData?.session?.status;
    if (prevSessionStatusRef.current === 'active' && currentStatus === 'ended') {
      setIsLeaderboardOpen(true);
    }
    prevSessionStatusRef.current = currentStatus;
  }, [votingData?.session?.status]);

  const handleStartVotingSession = async (config: VotingSessionConfig) => {
    if (!boardId || !currentUser) return;
    await votingService.startSession(boardId, config, currentUser);
  };

  const handleEndVotingSession = async () => {
    if (!boardId) return;
    await votingService.endSession(boardId);
  };

  const handleAddVote = async (elementId: string) => {
    if (!boardId || !currentUser) return;
    await votingService.addVote(boardId, elementId, currentUser);
  };

  const handleRemoveVote = async (elementId: string) => {
    if (!boardId || !currentUser) return;
    await votingService.removeVote(boardId, elementId, currentUser);
  };

  const handleToggleVotingComplete = async () => {
    if (!boardId || !currentUser) return;
    await votingService.toggleUserCompleted(boardId, currentUser);
  };

  const handleOpenVoting = () => {
    if (votingData?.session?.status === 'ended') {
      setIsLeaderboardOpen(true);
    } else if (votingData?.session?.status === 'active') {
      setIsLeaderboardOpen(true);
    } else {
      setIsVotingSetupOpen(true);
    }
  };

  const handleFocusElement = (elementId: string) => {
    const el = elements.find((e) => e.id === elementId);
    if (!el) return;
    setSelectedElementIds([elementId]);
    const fw = el.width || 140;
    const fh = el.height || 140;
    const targetScale = Math.max(0.6, Math.min(1.2, (window.innerWidth - 100) / (fw * 3)));
    const targetX = (window.innerWidth - fw * targetScale) / 2 - el.x * targetScale;
    const targetY = (window.innerHeight - fh * targetScale) / 2 - el.y * targetScale;
    setStagePos({ x: Math.round(targetX), y: Math.round(targetY) });
    setScale(targetScale);
  };

  // Referência para os controles de presença
  const presenceControls = useRef<ReturnType<typeof presenceService.joinBoard> | null>(null);

  // Registra um instantâneo no histórico antes de alterar elementos
  const recordSnapshot = useCallback(() => {
    setHistoryPast((prev) => {
      const next = [...prev, elements];
      if (next.length > 30) return next.slice(next.length - 30);
      return next;
    });
    setHistoryFuture([]);
  }, [elements]);

  // Carrega e escuta metadados do quadro em tempo real
  useEffect(() => {
    if (!boardId) {
      setBoardNotFound(true);
      setBoardLoading(false);
      return;
    }

    setBoardLoading(true);
    setBoardNotFound(false);

    const unsubscribe = boardService.subscribeBoard(boardId, (b) => {
      if (b) {
        setBoard(b);
        setBoardNotFound(false);
        setBoardLoading(false);
        if ((b as any).voting) {
          setVotingData((b as any).voting);
        }
        if ((b as any).timer) {
          setTimerState(sanitizeTimerState((b as any).timer));
        }
      } else {
        // Quadro não existe! Não cria nada automaticamente, apenas marca como não encontrado
        setBoard(null);
        setBoardLoading(false);
        setBoardNotFound(true);
      }
    });
    return () => unsubscribe();
  }, [boardId]);

  // Atualiza título da aba no navegador dinamicamente com o nome real do quadro
  useEffect(() => {
    if (board?.title) {
      document.title = `${board.title} - Mirio`;
    } else {
      document.title = 'Mirio - Whiteboard Colaborativo';
    }
  }, [board?.title]);

  const boardPermission = getUserBoardPermission(board, currentUser, isUnlocked);
  const isOwner = isBoardOwner(board, currentUser);
  const isCommentOnly = !isMobile && !isOwner && boardPermission === 'comment';
  const isReadOnly = isMobile || (!isOwner && boardPermission === 'view');
  const hasNoAccess = !isOwner && boardPermission === 'none' && !isUnlocked;

  // Registra que o usuário acessou o quadro através do link (se tiver permissão e não for o dono)
  useEffect(() => {
    if (boardId && currentUser && board && !hasNoAccess && !boardNotFound) {
      boardService.recordVisitedBoard(boardId, currentUser.uid);
      if (!isOwner) {
        if (!board.members || !board.members[currentUser.uid]) {
          boardService.registerBoardMember(boardId, currentUser, board.defaultPermission || 'edit');
        }
      }
    }
  }, [boardId, currentUser, board, hasNoAccess, isOwner, boardNotFound]);

  // Limpa members caso o proprietário estivesse duplicado na lista de participantes
  useEffect(() => {
    if (boardId && currentUser && board && isOwner && !boardNotFound) {
      const hasSelfInMembers = Boolean(board.members && board.members[currentUser.uid]);
      if (hasSelfInMembers && board.members) {
        const cleaned = { ...board.members };
        delete cleaned[currentUser.uid];
        boardService.updateBoardSettings(boardId, { members: cleaned });
      }
    }
  }, [boardId, currentUser, board, isOwner, boardNotFound]);

  // Escuta os elementos do canvas em tempo real com o elementService aprimorado
  const isBoardReady = Boolean(board);
  const currentUid = currentUser?.uid;

  useEffect(() => {
    if (!boardId || !currentUid || hasNoAccess || boardNotFound || !isBoardReady) return;
    const unsubscribe = elementService.subscribeElements(boardId, (elems) => {
      setElements(elems);
    });
    return () => unsubscribe();
  }, [boardId, currentUser, hasNoAccess, boardNotFound, isBoardReady]);

  // Conecta ao serviço de presença e cursores em tempo real
  useEffect(() => {
    if (!boardId || !currentUser || hasNoAccess || boardNotFound || !isBoardReady) return;

    const controls = presenceService.joinBoard(boardId, currentUser, (users) => {
      setRemoteUsers(users);
    });
    presenceControls.current = controls;

    return () => {
      controls.leaveBoard();
      presenceControls.current = null;
    };
  }, [boardId, currentUser, hasNoAccess, boardNotFound, isBoardReady]);

  // Acompanhamento suave da câmera quando seguindo outro usuário
  useEffect(() => {
    if (!followingUserId) return;

    const targetUser = remoteUsers.find((u) => u.userId === followingUserId);
    if (!targetUser) {
      setFollowingUserId(null);
      return;
    }

    if (targetUser.cursor) {
      const targetX = Math.round(window.innerWidth / 2 - targetUser.cursor.x * scale);
      const targetY = Math.round(window.innerHeight / 2 - targetUser.cursor.y * scale);

      setStagePos((prev) => {
        const dx = targetX - prev.x;
        const dy = targetY - prev.y;
        if (Math.abs(dx) < 2 && Math.abs(dy) < 2) return prev;
        return {
          x: prev.x + dx * 0.4,
          y: prev.y + dy * 0.4,
        };
      });
    }
  }, [remoteUsers, followingUserId, scale]);

  // Cancelar modo seguidor ao apertar ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && followingUserId) {
        setFollowingUserId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [followingUserId]);

  const handleFollowUser = (userId: string, userName: string) => {
    if (followingUserId === userId) {
      setFollowingUserId(null);
    } else {
      setFollowingUserId(userId);
      setFollowingUserName(userName);
    }
  };

  const handleStopFollowing = () => {
    setFollowingUserId(null);
  };

  // Transmite seleção para os colegas
  const handleSelectionChange = useCallback((ids: string[]) => {
    setSelectedElementIds(ids);
    presenceControls.current?.updateSelection(ids.length > 0 ? ids[0] : null);
  }, []);

  const handleStageChange = useCallback((pos: { x: number; y: number }, newScale: number) => {
    if (followingUserId) {
      setFollowingUserId(null);
    }
    setStagePos(pos);
    setScale(newScale);
  }, [followingUserId]);

  const handleCanvasClick = useCallback(() => {
    presenceControls.current?.triggerCursorClick();
    if (isCursorChatOpen) {
      setIsCursorChatOpen(false);
      presenceControls.current?.sendCursorMessage(null);
    }
    if (myActiveMessage) {
      if (messageTimerRef.current) {
        clearTimeout(messageTimerRef.current);
      }
      setMyActiveMessage(null);
      presenceControls.current?.sendCursorMessage(null);
    }
  }, [isCursorChatOpen, myActiveMessage]);

  // Atalho do teclado [/] para abrir o Chat do Cursor (Estilo Figma)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !isCursorChatOpen) {
        const target = e.target as HTMLElement;
        const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
        if (!isInput) {
          e.preventDefault();
          setMouseScreenPos(currentMousePosRef.current);
          setIsCursorChatOpen(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCursorChatOpen]);

  // Atalho do teclado [Esc] para fechar o Chat do Cursor ou balão de mensagem ativo imediatamente
  useEffect(() => {
    if (!isCursorChatOpen && !myActiveMessage) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();

        if (isCursorChatOpen) {
          setIsCursorChatOpen(false);
          presenceControls.current?.sendCursorMessage(null);
        }

        if (myActiveMessage) {
          if (messageTimerRef.current) {
            clearTimeout(messageTimerRef.current);
          }
          setMyActiveMessage(null);
          presenceControls.current?.sendCursorMessage(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isCursorChatOpen, myActiveMessage]);

  // Estado e refs de alta performance para o Apontador Laser (60/120fps sem re-render)
  const localLaserPosRef = useRef<{ x: number; y: number } | null>(null);
  const localLaserPointsRef = useRef<LaserPoint[]>([]);
  const isLocalLaserDrawingRef = useRef(false);
  const bufferedLaserPointsRef = useRef<Array<[number, number]>>([]);

  const handleLaserDown = useCallback((worldPos: { x: number; y: number }) => {
    isLocalLaserDrawingRef.current = true;
    localLaserPosRef.current = worldPos;
    bufferedLaserPointsRef.current = [[Math.round(worldPos.x), Math.round(worldPos.y)]];
    const dispatched = presenceControls.current?.updateCursor(worldPos.x, worldPos.y, 'laser', {
      isDrawing: true,
      points: bufferedLaserPointsRef.current,
      timestamp: Date.now(),
    });
    if (dispatched) {
      bufferedLaserPointsRef.current = [];
    }
  }, []);

  const handleLaserMove = useCallback((worldPos: { x: number; y: number }, isDrawing: boolean) => {
    localLaserPosRef.current = worldPos;
    if (isDrawing) {
      bufferedLaserPointsRef.current.push([Math.round(worldPos.x), Math.round(worldPos.y)]);
    } else {
      bufferedLaserPointsRef.current = [];
    }
    const dispatched = presenceControls.current?.updateCursor(worldPos.x, worldPos.y, 'laser', {
      isDrawing,
      points: bufferedLaserPointsRef.current,
      timestamp: Date.now(),
    });
    if (dispatched) {
      bufferedLaserPointsRef.current = [];
    }
  }, []);

  const handleLaserUp = useCallback(() => {
    isLocalLaserDrawingRef.current = false;
    bufferedLaserPointsRef.current = [];
    if (localLaserPosRef.current) {
      presenceControls.current?.updateCursor(
        localLaserPosRef.current.x,
        localLaserPosRef.current.y,
        'laser',
        {
          isDrawing: false,
          timestamp: Date.now(),
        }
      );
    }
  }, []);

  // Transmite movimento do cursor para os colegas e atualiza coordenadas locais com throttle
  const lastPosUpdateRef = useRef(0);
  const handleCursorMove = useCallback((x: number, y: number) => {
    if (currentTool === 'laser') {
      localLaserPosRef.current = { x, y };
      presenceControls.current?.updateCursor(x, y, 'laser', {
        isDrawing: isLocalLaserDrawingRef.current,
        timestamp: Date.now(),
      });
    } else {
      presenceControls.current?.updateCursor(x, y, currentTool);
    }

    const now = performance.now();
    if (now - lastPosUpdateRef.current >= 250) {
      lastPosUpdateRef.current = now;
      setCursorPos({ x: Math.round(x), y: Math.round(y) });
    }
  }, [currentTool]);

  // Atualiza posição do mouse na tela APENAS se o CursorChat ou balão de mensagem estiverem visíveis
  const handleMouseScreenPosChange = useCallback((pos: { x: number; y: number }) => {
    if (isCursorChatOpen || myActiveMessage) {
      setMouseScreenPos(pos);
    }
  }, [isCursorChatOpen, myActiveMessage]);

  // Confirma e exibe a mensagem de chat no cursor por 7 segundos
  const handleCommitMessage = useCallback((msg: string) => {
    presenceControls.current?.sendCursorMessage(msg);
    setMyActiveMessage(msg);

    if (messageTimerRef.current) {
      clearTimeout(messageTimerRef.current);
    }
    messageTimerRef.current = setTimeout(() => {
      presenceControls.current?.sendCursorMessage(null);
      setMyActiveMessage(null);
    }, 7000);
  }, []);

  useEffect(() => {
    return () => {
      if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
    };
  }, []);

  const handleUpdateTitle = async (newTitle: string) => {
    if (!boardId || !board || isReadOnly || isCommentOnly) return;
    setBoard({ ...board, title: newTitle });
    await boardService.updateBoardTitle(boardId, newTitle);
  };

  const handleUpdateBoardSettings = async (
    updates: Partial<Pick<Board, 'defaultPermission' | 'collaborators' | 'collaboratorEmails' | 'members' | 'removedMemberIds' | 'isPasswordProtected' | 'password'>>
  ) => {
    if (!boardId || !board || !isOwner) return;
    setBoard({ ...board, ...updates });
    await boardService.updateBoardSettings(boardId, updates);
  };

  // Helper para sincronizar APENAS as diferenças atômicas no Firestore em Undo/Redo.
  // Evita reescrever o quadro inteiro, reduzindo o consumo de escritas/leituras em até 99.5%
  // e protegendo a cota diária do plano gratuito (Spark) do Firebase.
  const syncDeltaSnapshot = async (
    targetBoardId: string,
    currentSnapshot: CanvasElement[],
    targetSnapshot: CanvasElement[]
  ) => {
    const currentMap = new Map(currentSnapshot.map((e) => [e.id, e]));
    const targetMap = new Map(targetSnapshot.map((e) => [e.id, e]));

    // 1. Elementos removidos no snapshot de destino
    const toDelete = currentSnapshot
      .filter((e) => !targetMap.has(e.id))
      .map((e) => e.id);

    // 2. Elementos novos no snapshot de destino
    const toAdd = targetSnapshot.filter((e) => !currentMap.has(e.id));

    // 3. Elementos existentes em ambos, atualizando apenas os que realmente mudaram
    const toUpdate: { id: string; updates: Partial<CanvasElement> }[] = [];
    for (const targetEl of targetSnapshot) {
      const currentEl = currentMap.get(targetEl.id);
      if (!currentEl) continue;

      const isModified =
        currentEl.x !== targetEl.x ||
        currentEl.y !== targetEl.y ||
        currentEl.width !== targetEl.width ||
        currentEl.height !== targetEl.height ||
        currentEl.rotation !== targetEl.rotation ||
        currentEl.text !== targetEl.text ||
        currentEl.fill !== targetEl.fill ||
        currentEl.stroke !== targetEl.stroke ||
        currentEl.strokeWidth !== targetEl.strokeWidth ||
        currentEl.opacity !== targetEl.opacity ||
        currentEl.zIndex !== targetEl.zIndex ||
        currentEl.locked !== targetEl.locked ||
        currentEl.radius !== targetEl.radius ||
        currentEl.fontSize !== targetEl.fontSize ||
        currentEl.fontWeight !== targetEl.fontWeight ||
        currentEl.fontStyle !== targetEl.fontStyle ||
        currentEl.textDecoration !== targetEl.textDecoration ||
        currentEl.points?.length !== targetEl.points?.length ||
        (currentEl.points &&
          targetEl.points &&
          currentEl.points.some((p, i) => p !== targetEl.points![i]));

      if (isModified) {
        toUpdate.push({ id: targetEl.id, updates: targetEl });
      }
    }

    const promises: Promise<any>[] = [];
    if (toDelete.length > 0) {
      promises.push(elementService.batchDeleteElements(targetBoardId, toDelete));
    }
    if (toAdd.length > 0) {
      promises.push(elementService.batchAddElements(targetBoardId, toAdd));
    }
    if (toUpdate.length > 0) {
      promises.push(elementService.batchUpdateElements(targetBoardId, toUpdate));
    }

    await Promise.all(promises);
  };

  // Operação Desfazer (Undo) com diffing inteligente
  const handleUndo = useCallback(async () => {
    if (historyPast.length === 0 || !boardId || isReadOnly || isCommentOnly) return;
    const previousSnapshot = historyPast[historyPast.length - 1];
    const newPast = historyPast.slice(0, -1);

    setHistoryPast(newPast);
    setHistoryFuture((prev) => [elements, ...prev]);
    setElements(previousSnapshot);

    await syncDeltaSnapshot(boardId, elements, previousSnapshot);
  }, [historyPast, elements, boardId, isReadOnly, isCommentOnly]);

  // Operação Refazer (Redo) com diffing inteligente
  const handleRedo = useCallback(async () => {
    if (historyFuture.length === 0 || !boardId || isReadOnly || isCommentOnly) return;
    const nextSnapshot = historyFuture[0];
    const newFuture = historyFuture.slice(1);

    setHistoryPast((prev) => [...prev, elements]);
    setHistoryFuture(newFuture);
    setElements(nextSnapshot);

    await syncDeltaSnapshot(boardId, elements, nextSnapshot);
  }, [historyFuture, elements, boardId, isReadOnly, isCommentOnly]);

  // Atalhos de teclado para Desfazer / Refazer (Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === "'" || e.key === '"')) {
        e.preventDefault();
        handleToggleGrid();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Adição de elemento (otimista, 0ms de latência para a UI)
  const handleAddElement = useCallback(async (elem: Omit<CanvasElement, 'id' | 'updatedAt'>) => {
    if (!boardId || !currentUser || isReadOnly) return '';
    // Modo comentarista só permite adicionar post-its (notas de comentário)
    if (isCommentOnly && elem.type !== 'sticky') return '';

    recordSnapshot();
    const newId = 'elem_' + Math.random().toString(36).substring(2, 11);
    const fullElem: CanvasElement = {
      ...elem,
      id: newId,
      updatedBy: currentUser.uid,
      updatedByName: currentUser.displayName,
      updatedAt: Date.now(),
    };
    setElements((prev) => [...prev, fullElem]);
    elementService.addElement(boardId, fullElem).catch((err) => {
      console.warn('Erro ao sincronizar novo elemento no Firestore:', err);
    });
    return newId;
  }, [boardId, currentUser, isReadOnly, isCommentOnly, recordSnapshot]);

  // Atualização individual
  const handleUpdateElement = async (id: string, updates: Partial<CanvasElement>) => {
    if (!boardId || !currentUser || isReadOnly) return;
    // Comentarista só pode alterar notas criadas por ele mesmo
    if (isCommentOnly) {
      const existing = elements.find((e) => e.id === id);
      if (!existing || existing.updatedBy !== currentUser.uid) return;
    }

    recordSnapshot();
    const enrichedUpdates = {
      ...updates,
      updatedBy: currentUser.uid,
      updatedByName: currentUser.displayName,
    };
    setElements((prev) =>
      prev.map((el) => (el.id === id ? { ...el, ...enrichedUpdates, updatedAt: Date.now() } : el))
    );
    await elementService.updateElement(boardId, id, enrichedUpdates);
  };

  // Atualização em lote (ex.: mover múltiplos elementos juntos)
  const handleBatchUpdateElements = async (
    updatesList: { id: string; updates: Partial<CanvasElement> }[]
  ) => {
    if (!boardId || !currentUser || updatesList.length === 0 || isReadOnly) return;
    const allowedUpdates = isCommentOnly
      ? updatesList.filter((u) => {
          const existing = elements.find((e) => e.id === u.id);
          return existing && existing.updatedBy === currentUser.uid;
        })
      : updatesList;

    if (allowedUpdates.length === 0) return;

    recordSnapshot();
    const now = Date.now();
    const updateMap = new Map(allowedUpdates.map((u) => [u.id, u.updates]));
    setElements((prev) =>
      prev.map((el) => {
        const up = updateMap.get(el.id);
        if (up) {
          return {
            ...el,
            ...up,
            updatedBy: currentUser.uid,
            updatedByName: currentUser.displayName,
            updatedAt: now,
          };
        }
        return el;
      })
    );
    await elementService.batchUpdateElements(
      boardId,
      allowedUpdates.map((u) => ({
        id: u.id,
        updates: {
          ...u.updates,
          updatedBy: currentUser.uid,
          updatedByName: currentUser.displayName,
        },
      }))
    );
  };

  // Alinhamento em lote dos elementos atualmente selecionados
  const handleAlignSelectedElements = (type: AlignmentType) => {
    if (selectedElementIds.length < 2) return;
    const selected = elements.filter((el) => selectedElementIds.includes(el.id));
    const updates = alignElements(selected, type);
    if (updates.length > 0) {
      handleBatchUpdateElements(updates);
    }
  };

  // Deleção individual
  const handleDeleteElement = async (id: string) => {
    if (!boardId || !currentUser || isReadOnly) return;
    if (isCommentOnly) {
      const existing = elements.find((e) => e.id === id);
      if (!existing || existing.updatedBy !== currentUser.uid) return;
    }

    recordSnapshot();
    setElements((prev) => prev.filter((el) => el.id !== id));
    await elementService.deleteElement(boardId, id);
    setSelectedElementIds((prev) => prev.filter((item) => item !== id));
    presenceControls.current?.updateSelection(null);
  };

  // Deleção em lote
  const handleBatchDeleteElements = async (ids: string[]) => {
    if (!boardId || !currentUser || ids.length === 0 || isReadOnly) return;
    const allowedIds = isCommentOnly
      ? ids.filter((id) => {
          const existing = elements.find((e) => e.id === id);
          return existing && existing.updatedBy === currentUser.uid;
        })
      : ids;

    if (allowedIds.length === 0) return;

    recordSnapshot();
    const idSet = new Set(allowedIds);
    setElements((prev) => prev.filter((el) => !idSet.has(el.id)));
    await elementService.batchDeleteElements(boardId, allowedIds);
    setSelectedElementIds([]);
    presenceControls.current?.updateSelection(null);
  };

  // Deleção de itens selecionados pela barra lateral
  const handleDeleteSelected = () => {
    if (selectedElementIds.length > 0 && !isReadOnly) {
      handleBatchDeleteElements(selectedElementIds);
    }
  };

  // Duplicação em lote
  const handleBatchDuplicateElements = async (elemsToDup: CanvasElement[]) => {
    if (!boardId || !currentUser || elemsToDup.length === 0 || isReadOnly || isCommentOnly) return;
    recordSnapshot();
    const now = Date.now();
    const duplicates: CanvasElement[] = elemsToDup.map((elem, idx) => {
      const { id: _id, updatedAt: _up, ...rest } = elem;
      return {
        ...rest,
        id: 'elem_' + Math.random().toString(36).substring(2, 11) + idx,
        x: elem.x + 30,
        y: elem.y + 30,
        zIndex: elements.length + idx + 1,
        updatedBy: currentUser.uid,
        updatedByName: currentUser.displayName,
        updatedAt: now,
      };
    });

    setElements((prev) => [...prev, ...duplicates]);
    await elementService.batchAddElements(boardId, duplicates);
    setSelectedElementIds(duplicates.map((d) => d.id));
  };

  // Adição de múltiplos elementos (ex: colar em lote ou templates)
  const handleBatchAddElements = async (newElements: CanvasElement[]) => {
    if (!boardId || !currentUser || newElements.length === 0 || isReadOnly || isCommentOnly) return;
    recordSnapshot();
    setElements((prev) => [...prev, ...newElements]);
    await elementService.batchAddElements(boardId, newElements);
    setSelectedElementIds(newElements.map((el) => el.id));
  };

  // Alternar reação de emoji em post-its
  const handleToggleReaction = useCallback(
    async (elementId: string, emoji: string) => {
      if (!boardId || !currentUser) return;
      const elem = elements.find((e) => e.id === elementId);
      if (!elem) return;

      const reactions = { ...(elem.reactions || {}) };
      const currentUsers = reactions[emoji] || [];

      let updatedUsers: string[];
      if (currentUsers.includes(currentUser.uid)) {
        updatedUsers = currentUsers.filter((uid) => uid !== currentUser.uid);
      } else {
        updatedUsers = [...currentUsers, currentUser.uid];
      }

      if (updatedUsers.length > 0) {
        reactions[emoji] = updatedUsers;
      } else {
        delete reactions[emoji];
      }

      // Otimista
      setElements((prev) =>
        prev.map((el) => (el.id === elementId ? { ...el, reactions } : el))
      );
      await elementService.updateElement(boardId, elementId, { reactions });
    },
    [boardId, currentUser, elements]
  );

  // Início de sessão de borracha parcial: grava snapshot de histórico antes da remoção
  const handleStartPartialErase = useCallback(() => {
    recordSnapshot();
  }, [recordSnapshot]);

  // Finalização da borracha parcial ao soltar o mouse: persiste modificações em lote no Firestore
  const handleFinishPartialErase = useCallback(
    async (
      updatedList: { id: string; points: number[] }[],
      addedList: CanvasElement[],
      deletedIds: string[]
    ) => {
      if (!boardId || !currentUser) return;
      const now = Date.now();

      if (deletedIds.length > 0) {
        await elementService.batchDeleteElements(boardId, deletedIds);
      }
      if (updatedList.length > 0) {
        await elementService.batchUpdateElements(
          boardId,
          updatedList.map((u) => ({
            id: u.id,
            updates: {
              points: u.points,
              updatedBy: currentUser.uid,
              updatedByName: currentUser.displayName,
              updatedAt: now,
            },
          }))
        );
      }
      if (addedList.length > 0) {
        await elementService.batchAddElements(boardId, addedList);
      }
    },
    [boardId, currentUser]
  );

  // Inserção atômica de Templates de Sprint com 1 clique
  const handleInsertSprintTemplate = async (template: SprintTemplate) => {
    if (!boardId || !currentUser || isReadOnly || isCommentOnly) return;
    recordSnapshot();

    // Posiciona na área visível central do usuário
    const centerWorldX = Math.round((-stagePos.x + window.innerWidth / 2) / scale - 450);
    const centerWorldY = Math.round((-stagePos.y + window.innerHeight / 2) / scale - 260);

    const newElements = generateTemplateElements(
      template,
      { x: centerWorldX, y: centerWorldY },
      { uid: currentUser.uid, displayName: currentUser.displayName },
      elements.length + 1
    );

    const now = Date.now();
    const withIds: CanvasElement[] = newElements.map((el, idx) => ({
      ...el,
      id: 'elem_' + Math.random().toString(36).substring(2, 11) + idx,
      updatedAt: now,
    }));

    setElements((prev) => [...prev, ...withIds]);
    await elementService.batchAddElements(boardId, withIds);
    setSelectedElementIds(withIds.map((item) => item.id));
  };

  // Inserção de Stickers e GIFs
  const handleInsertMedia = async (
    type: 'sticker' | 'gif',
    src: string,
    alt?: string,
    text?: string
  ) => {
    if (!boardId || !currentUser || isReadOnly || isCommentOnly) return;
    recordSnapshot();

    const centerWorldX = Math.round(
      (-stagePos.x + window.innerWidth / 2) / scale - (type === 'gif' ? 110 : 60)
    );
    const centerWorldY = Math.round(
      (-stagePos.y + window.innerHeight / 2) / scale - (type === 'gif' ? 80 : 60)
    );

    const newMedia: CanvasElement = {
      id: 'elem_' + Math.random().toString(36).substring(2, 11),
      type,
      src: src || '',
      alt: alt || '',
      text: text || '',
      x: centerWorldX,
      y: centerWorldY,
      width: type === 'gif' ? 220 : 120,
      height: type === 'gif' ? 160 : 120,
      zIndex: elements.length + 1,
      updatedBy: currentUser.uid,
      updatedByName: currentUser.displayName,
      updatedAt: Date.now(),
    };

    setElements((prev) => [...prev, newMedia]);
    await elementService.addElement(boardId, newMedia);
    setSelectedElementIds([newMedia.id]);
  };

  // Controles de zoom
  const handleZoomIn = () => setScale((prev) => Math.min(5, prev * 1.2));
  const handleZoomOut = () => setScale((prev) => Math.max(0.1, prev / 1.2));
  const handleResetZoom = () => {
    setScale(1);
    setStagePos({ x: 0, y: 0 });
  };

  if (authLoading) {
    return <LoadingScreen />;
  }

  // Se o quadro não existe ou o link é inválido, exibe a página de erro moderna no estilo do login
  if (boardNotFound) {
    return <NotFoundPage requestedBoardId={boardId} />;
  }

  // Se o usuário acessou o link do quadro sem estar logado, redireciona para a tela global única de login
  if (!currentUser) {
    const returnUrl = `/b/${cleanBoardId(boardId || '')}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(returnUrl)}`} replace />;
  }

  // Se o quadro ainda está carregando do Firestore ou banco local
  if (boardLoading || !board) {
    return <LoadingScreen />;
  }

  // Se o quadro exige senha antes de liberar o acesso
  if (isPasswordRequired) {
    return (
      <div className="relative min-h-screen w-full flex flex-col items-center justify-center bg-background p-4 text-center select-none">
        <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(#e4e4e7_1px,transparent_1px)] dark:bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:20px_20px] opacity-70" />
        <BoardPasswordLockModal
          isOpen={true}
          boardTitle={board?.title || 'Quadro de Ideias'}
          onUnlock={handleUnlockPassword}
          onBackToDashboard={() => navigate('/')}
        />
      </div>
    );
  }

  // Se o usuário acessou um quadro privado sem permissão
  if (board && (boardPermission === 'none' || hasNoAccess)) {
    return (
      <div className="relative min-h-screen w-full flex flex-col items-center justify-center bg-background p-4 text-center select-none">
        <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(#e4e4e7_1px,transparent_1px)] dark:bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:20px_20px] opacity-70" />
        <div className="relative z-10 max-w-sm rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col items-center text-center">
          <div className="size-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-4">
            <Lock className="size-5" />
          </div>
          <h2 className="text-base font-semibold text-foreground mb-1">Acesso Restrito</h2>
          <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
            Este quadro é privado. Apenas o proprietário e colaboradores convidados diretamente por e-mail têm acesso a este conteúdo.
          </p>
          <Button
            size="sm"
            onClick={() => navigate('/')}
            className="w-full text-xs"
          >
            Voltar ao Workspace
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-background selection:bg-foreground selection:text-background">
      {isMobile && !isPresentationMode && (
        <div className="pointer-events-none fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-border/70 bg-background/90 px-4 py-3 backdrop-blur-md">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{board.title || 'Quadro sem título'}</p>
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Somente visualização</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="pointer-events-auto shrink-0"
            onClick={() => navigate('/')}
          >
            Voltar
          </Button>
        </div>
      )}

      <MobileReadOnlyDrawer
        open={isMobileNoticeOpen && isMobile}
        boardTitle={board.title || 'Quadro sem título'}
        onOpenChange={setIsMobileNoticeOpen}
        onBackToDashboard={() => navigate('/')}
      />

      {/* Barra de Navegação Superior (Oculta no Modo Apresentação) */}
      {!isPresentationMode && !isMobile && (
        <Navbar
          title={board?.title || 'Quadro sem título'}
          board={board}
          onUpdateTitle={handleUpdateTitle}
          onUpdateBoardSettings={isOwner ? handleUpdateBoardSettings : undefined}
          onBackToDashboard={() => navigate('/')}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onOpenEditProfile={() => setIsEditProfileOpen(true)}
          currentUser={currentUser}
          remoteUsers={remoteUsers}
          followingUserId={followingUserId}
          onFollowUser={handleFollowUser}
          onInsertSprintTemplate={handleInsertSprintTemplate}
          onLogout={logout}
          isReadOnly={isReadOnly}
          isCommentOnly={isCommentOnly}
          onEnterPresentation={handleEnterPresentation}
          isTimerOpen={isTimerOpen || Boolean(timerState?.isOpenForEveryone) || Boolean(timerState?.isRunning)}
          onToggleTimer={handleToggleTimer}
          onOpenVoting={handleOpenVoting}
          hasActiveVote={Boolean(
            (votingData?.session && (votingData.session.status === 'active' || votingData.session.status === 'ended')) ||
            (votingData?.votesByUser && Object.keys(votingData.votesByUser).length > 0)
          )}
          isVotingActive={votingData?.session?.status === 'active'}
          toolbarPosition={toolbarPosition}
          onChangeToolbarPosition={handleChangeToolbarPosition}
          gridType={gridType}
          onChangeGridType={handleChangeGridType}
          gridSize={gridSize}
          onChangeGridSize={handleChangeGridSize}
          gridOpacity={gridOpacity}
          onChangeGridOpacity={handleChangeGridOpacity}
          showGrid={showGrid}
          onToggleGrid={handleToggleGrid}
          showRemoteCursors={showRemoteCursors}
          onToggleRemoteCursors={handleToggleRemoteCursors}
        />
      )}

      {/* Barra Flutuante de Controle no Modo Apresentação */}
      {isPresentationMode && (
        <PresentationControlBar
          frames={frames}
          currentFrameIndex={currentFrameIndex}
          onNavigateFrame={handleNavigateFrame}
          onExitPresentation={handleExitPresentation}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onResetZoom={handleResetZoom}
          scale={scale}
          isLaserActive={currentTool === 'laser'}
          onToggleLaser={() => setCurrentTool((prev) => (prev === 'laser' ? 'select' : 'laser'))}
        />
      )}

      {/* Container Central Flutuante: Timer no topo, Barra de Votação logo abaixo (Empilhados sem sobreposição) */}
      {!isMobile && <div className="fixed top-14 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-2 pointer-events-none max-w-[95vw]">
        {/* Timer Colaborativo Flutuante Sincronizado */}
        <BoardTimerWidget
          boardId={boardId || ''}
          userName={currentUser.displayName}
          isOpen={isTimerOpen}
          onClose={() => setIsTimerOpen(false)}
        />

        {/* Barra Flutuante de Votação Ativa (Estilo Miro) */}
        {votingData?.session && votingData.session.status === 'active' && (
          <VotingSessionBar
            session={votingData.session}
            currentUser={currentUser}
            canManageSession={!isReadOnly}
            onEndSession={handleEndVotingSession}
            onToggleComplete={handleToggleVotingComplete}
          />
        )}
      </div>}

      {/* Overlay de Reações Flutuantes Globais em Tempo Real */}
      {!isMobile && <GlobalReactionsOverlay boardId={boardId || ''} />}

      {/* Toast Notificação de Início de Votação para todos na sala */}
      {!isMobile && showVotingToast && votingData?.session && votingData.session.status === 'active' && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-auto">
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-amber-500 text-white shadow-2xl border border-amber-600 font-medium text-xs select-none">
            <span className="text-lg">🗳️</span>
            <div>
              <p className="font-bold">Sessão de Votação Iniciada: {votingData.session.title}</p>
              <p className="text-[11px] text-amber-100">
                Você tem {votingData.session.votesPerPerson} {votingData.session.votesPerPerson === 1 ? 'voto' : 'votos'}. Clique no botão <strong>Votar +</strong> nos itens para participar!
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowVotingToast(false)}
              className="size-5 rounded-full hover:bg-black/20 flex items-center justify-center text-xs ml-2 cursor-pointer font-bold"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Modal de Configuração de Nova Votação (Estilo Miro) */}
      {!isMobile && isVotingSetupOpen && (
        <Suspense fallback={null}>
          <VotingSetupModal
            open={isVotingSetupOpen}
            onOpenChange={setIsVotingSetupOpen}
            currentUser={currentUser}
            selectedElementIds={selectedElementIds}
            lastSession={votingData?.session}
            onStartSession={handleStartVotingSession}
            onOpenResults={() => setIsLeaderboardOpen(true)}
          />
        </Suspense>
      )}

      {/* Modal de Placar / Pódio dos Votos */}
      {!isMobile && isLeaderboardOpen && (
        <Suspense fallback={null}>
          <VotingLeaderboardModal
            boardId={boardId || ''}
            votingData={votingData}
            elements={elements}
            open={isLeaderboardOpen}
            onOpenChange={setIsLeaderboardOpen}
            onFocusElement={handleFocusElement}
            onStartNewSession={() => setIsVotingSetupOpen(true)}
            canManage={!isReadOnly}
          />
        </Suspense>
      )}

      {/* Banner de Modo Seguir Usuário */}
      {followingUserId && !isPresentationMode && !isMobile && (
        <FollowUserBanner
          followingUserName={followingUserName}
          onStopFollowing={handleStopFollowing}
        />
      )}

      {/* Barra de Ferramentas Estilo Miro (Oculta no Modo Apresentação) */}
      {!isPresentationMode && !isMobile && (
        <Toolbar
          currentTool={currentTool}
          onSelectTool={setCurrentTool}
          selectedColor={selectedColor}
          onSelectColor={(color) => {
            setSelectedColor(color);
            if (selectedElementIds.length > 0) {
              selectedElementIds.forEach((id) => {
                const elem = elements.find((e) => e.id === id);
                if (elem && !elem.locked) {
                  if (['pen', 'line', 'arrow'].includes(elem.type)) {
                    handleUpdateElement(id, { stroke: color });
                  } else {
                    handleUpdateElement(id, { fill: color });
                  }
                }
              });
            }
          }}
          hasSelection={selectedElementIds.length > 0}
          selectionCount={selectedElementIds.length}
          onDeleteSelected={handleDeleteSelected}
          scale={scale}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onResetZoom={handleResetZoom}
          onOpenStickersModal={() => setIsStickersModalOpen(true)}
          canUndo={historyPast.length > 0}
          canRedo={historyFuture.length > 0}
          onUndo={handleUndo}
          onRedo={handleRedo}
          penMode={penMode}
          onSelectPenMode={setPenMode}
          penStrokeWidth={penStrokeWidth}
          onSelectPenStrokeWidth={(width) => {
            setPenStrokeWidth(width);
            if (selectedElementIds.length > 0) {
              selectedElementIds.forEach((id) => {
                const elem = elements.find((e) => e.id === id);
                if (elem && !elem.locked && ['pen', 'line', 'arrow'].includes(elem.type)) {
                  handleUpdateElement(id, { strokeWidth: width });
                }
              });
            }
          }}
          smartDrawing={smartDrawing}
          onToggleSmartDrawing={() => setSmartDrawing((prev) => !prev)}
          eraserMode={eraserMode}
          onSelectEraserMode={setEraserMode}
          eraserSize={eraserSize}
          onSelectEraserSize={setEraserSize}
          cursorPos={cursorPos}
          isCursorChatOpen={isCursorChatOpen}
          onToggleCursorChat={() => {
            setIsCursorChatOpen((prev) => {
              if (!prev) {
                setMouseScreenPos(currentMousePosRef.current);
              }
              return !prev;
            });
          }}
          readOnly={isReadOnly}
          canCommentOnly={isCommentOnly}
          position={toolbarPosition}
          onOpenShortcuts={() => setIsShortcutsModalOpen(true)}
        />
      )}

      {/* Chat do Cursor Interativo (Figma Style) */}
      {!isPresentationMode && !isMobile && (
        <CursorChat
          boardId={boardId || ''}
          currentUser={currentUser}
          isOpen={isCursorChatOpen}
          onClose={() => setIsCursorChatOpen(false)}
          onSendMessage={(msg) => presenceControls.current?.sendCursorMessage(msg)}
          onCommitMessage={handleCommitMessage}
          mouseScreenPos={mouseScreenPos}
        />
      )}

      {/* Balão de Mensagem do Próprio Usuário Flutuando no Cursor Local */}
      {myActiveMessage && !isCursorChatOpen && !isPresentationMode && !isMobile && (
        <div
          className="fixed pointer-events-none z-50 animate-cursor-bubble origin-top-left w-max max-w-[320px]"
          style={{
            left: mouseScreenPos.x + 16,
            top: mouseScreenPos.y + 20,
          }}
        >
          {/^(\p{Extended_Pictographic}|\s)+$/u.test(myActiveMessage.trim()) ? (
            <div className="text-3xl filter drop-shadow-md select-none transform hover:scale-110 transition-transform">
              {myActiveMessage}
            </div>
          ) : (
            <div className="relative bg-card/95 dark:bg-card/95 text-foreground px-3.5 py-1.5 rounded-2xl rounded-tl-xs border border-border/80 shadow-[0_4px_20px_rgba(0,0,0,0.18)] backdrop-blur-md w-max max-w-[320px] text-xs font-medium leading-relaxed whitespace-normal break-words">
              {myActiveMessage}
              {/* Rabicho do balão */}
              <div className="absolute -top-1.5 left-2 size-2.5 bg-card/95 border-l border-t border-border/80 rotate-45" />
            </div>
          )}
        </div>
      )}

      {/* Modal de Stickers, Emojis e GIFs */}
      {!isMobile && isStickersModalOpen && (
        <Suspense fallback={null}>
          <StickersModal
            open={isStickersModalOpen}
            onOpenChange={setIsStickersModalOpen}
            onInsertMedia={handleInsertMedia}
          />
        </Suspense>
      )}

      {/* Modal de Atalhos do Teclado */}
      {!isMobile && isShortcutsModalOpen && (
        <Suspense fallback={null}>
          <KeyboardShortcutsModal
            open={isShortcutsModalOpen}
            onOpenChange={setIsShortcutsModalOpen}
          />
        </Suspense>
      )}

      {/* Modal de Troca de Nome e Perfil (Convidado & Usuário) */}
      {!isMobile && currentUser && (
        <EditProfileModal
          open={isEditProfileOpen}
          onOpenChange={setIsEditProfileOpen}
          currentUser={currentUser}
          onSave={handleSaveProfile}
        />
      )}

      {/* Paleta de Comandos Global e Contextual (Cmd+K / Ctrl+K) */}
      {!isMobile && <CommandPalette
        open={isCommandPaletteOpen}
        onOpenChange={setIsCommandPaletteOpen}
        boardContext={{
          boardTitle: board?.title || 'Quadro sem título',
          isAnonymous: currentUser?.isAnonymous,
          frames,
          currentTool,
          selectedCount: selectedElementIds.length,
          onAlignElements: handleAlignSelectedElements,
          onOpenEditProfile: () => setIsEditProfileOpen(true),
          onSelectTool: setCurrentTool,
          onJumpToFrame: handleJumpToFrame,
          onStartTimer: handleStartTimerQuick,
          onOpenVoting: handleOpenVoting,
          onEnterPresentation: handleEnterPresentation,
          onOpenTemplates: () => setIsSprintTemplatesOpen(true),
          onOpenStickers: () => setIsStickersModalOpen(true),
          onOpenShortcuts: () => setIsShortcutsModalOpen(true),
          onExportPNG: handleExportPNG,
          onExportJSON: handleExportJSON,
          onShare: isOwner ? handleCopyShareLink : undefined,
          onResetZoom: handleResetZoom,
          onOpenCursorChat: () => {
            setMouseScreenPos(currentMousePosRef.current);
            setIsCursorChatOpen(true);
          },
          onBackToDashboard: () => navigate('/'),
          onLogout: logout,
          onToggleTheme: toggleTheme,
          isDarkMode: isDark,
          showGrid,
          onToggleGrid: handleToggleGrid,
          showRemoteCursors,
          onToggleRemoteCursors: handleToggleRemoteCursors,
          gridType,
          onChangeGridType: handleChangeGridType,
          gridSize,
          onChangeGridSize: handleChangeGridSize,
          gridOpacity,
          onChangeGridOpacity: handleChangeGridOpacity,
        }}
      />}

      {/* Modal de Templates de Sprint disparado via Command K */}
      {!isMobile && isSprintTemplatesOpen && (
        <SprintTemplatesModal
          open={isSprintTemplatesOpen}
          onOpenChange={setIsSprintTemplatesOpen}
          onInsertTemplate={handleInsertSprintTemplate}
        />
      )}

      {/* Camada de Feixes e Ponteiros Laser ao Vivo (Colaborativo e Local) */}
      {!isMobile && <LaserTrailOverlay
        stageX={stagePos.x}
        stageY={stagePos.y}
        scale={scale}
        currentTool={currentTool}
        currentUser={currentUser}
        localLaserPosRef={localLaserPosRef}
        isLocalDrawingRef={isLocalLaserDrawingRef}
        localPointsRef={localLaserPointsRef}
        remoteUsers={remoteUsers}
      />}

      {/* Camada de Cursores Remotos Voando na Tela */}
      {showRemoteCursors && (
        <RemoteCursors
          remoteUsers={remoteUsers}
          stageX={stagePos.x}
          stageY={stagePos.y}
          scale={scale}
        />
      )}

      {/* Canvas Principal com Konva */}
      <WhiteboardCanvas
        boardId={boardId || ''}
        currentUser={currentUser}
        elements={elements}
        remoteUsers={remoteUsers}
        currentTool={currentTool}
        selectedColor={selectedColor}
        onSelectTool={setCurrentTool}
        onLaserDown={handleLaserDown}
        onLaserMove={handleLaserMove}
        onLaserUp={handleLaserUp}
        localLaserPosRef={localLaserPosRef}
        isLocalLaserDrawingRef={isLocalLaserDrawingRef}
        localLaserPointsRef={localLaserPointsRef}
        onAddElement={handleAddElement}
        onBatchAddElements={handleBatchAddElements}
        onUpdateElement={handleUpdateElement}
        onBatchUpdateElements={handleBatchUpdateElements}
        onDeleteElement={handleDeleteElement}
        onBatchDeleteElements={handleBatchDeleteElements}
        onBatchDuplicateElements={handleBatchDuplicateElements}
        onCursorMove={handleCursorMove}
        selectedIds={selectedElementIds}
        onSelectionChange={handleSelectionChange}
        scale={scale}
        stagePos={stagePos}
        onStageChange={handleStageChange}
        onToggleReaction={handleToggleReaction}
        penMode={penMode}
        penStrokeWidth={penStrokeWidth}
        smartDrawing={smartDrawing}
        eraserMode={eraserMode}
        eraserSize={eraserSize}
        onStartPartialErase={handleStartPartialErase}
        onFinishPartialErase={handleFinishPartialErase}
        onCanvasClick={handleCanvasClick}
        onMouseScreenPosChange={handleMouseScreenPosChange}
        votingData={votingData}
        onToggleVote={handleAddVote}
        onAddVote={handleAddVote}
        onRemoveVote={handleRemoveVote}
        readOnly={isReadOnly}
        canCommentOnly={isCommentOnly}
        onOpenShortcuts={() => setIsShortcutsModalOpen(true)}
        onOpenTemplates={() => setIsSprintTemplatesOpen(true)}
        onOpenStickers={() => setIsStickersModalOpen(true)}
        onResetZoom={handleResetZoom}
        gridType={gridType}
        gridSize={gridSize}
        gridOpacity={gridOpacity}
        showGrid={showGrid}
        onToggleGrid={handleToggleGrid}
      />
    </div>
  );
};
