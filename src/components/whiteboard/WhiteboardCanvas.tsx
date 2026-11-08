import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Stage, Layer, Transformer, Rect, Circle, Line, Star, Group, Text } from 'react-konva';
import type Konva from 'konva';
import type { CanvasElement, ToolType, ElementType } from '../../types/element';
import type { UserPresence, CurrentUser } from '../../types/board';
import { StickyNoteItem } from './StickyNoteItem';
import { ShapeItem } from './ShapeItem';
import { ArrowItem } from './ArrowItem';
import { FreeDrawItem } from './FreeDrawItem';
import { TextItem } from './TextItem';
import { FrameItem } from './FrameItem';
import { StickerItem } from './StickerItem';
import { ElementLinkBalloon } from './ElementLinkBalloon';
import { EditLinkModal } from './EditLinkModal';
import { CanvasGrid, type GridType, type GridSize } from './CanvasGrid';
import type { LaserPoint } from './LaserTrailOverlay';
import { SelectionContextBar } from './SelectionContextBar';
import { BoardContextMenu } from './BoardContextMenu';
import { alignElements, type AlignmentType } from '../../utils/alignment';
import { recognizeSmartShape } from '../../utils/smartDrawing';
import { eraseStrokePartially } from '../../utils/partialEraser';
import { getCustomCanvasCursor } from '../../utils/canvasCursors';
import { getContrastTextColor } from '../../utils/colors';
import { calculateShapeDragBounds, getDefaultShapeBounds } from '../../utils/shapeSizing';
import { getAppleEmojiUrl } from '../../utils/appleEmoji';
import { playReactionPopSound } from '../../utils/audioChime';
import { votingService, type BoardVotingData } from '../../services/votingService';
import { stripMarkdownLinks, removeLinkFromElement, addLinkToElement, normalizeUrl } from '../../utils/textLinks';
import {
  copyCanvasElements,
  getCachedClipboardElements,
  getElementsBoundingBox,
  fileToDataUrl,
  getImageDimensions,
} from '../../utils/clipboard';

const QUICK_EMOJIS = ['👍', '❤️', '🔥', '🎉', '🚀', '💡', '🤔', '👀'];

interface WhiteboardCanvasProps {
  boardId: string;
  currentUser: CurrentUser;
  elements: CanvasElement[];
  remoteUsers: UserPresence[];
  currentTool: ToolType;
  selectedColor: string;
  onSelectTool: (tool: ToolType) => void;
  onAddElement: (element: Omit<CanvasElement, 'id' | 'updatedAt'>) => Promise<string>;
  onBatchAddElements?: (elements: CanvasElement[]) => Promise<void>;
  onUpdateElement: (id: string, updates: Partial<CanvasElement>) => Promise<void>;
  onBatchUpdateElements?: (updates: { id: string; updates: Partial<CanvasElement> }[]) => Promise<void>;
  onDeleteElement: (id: string) => Promise<void>;
  onBatchDeleteElements?: (ids: string[]) => Promise<void>;
  onDuplicateElement?: (element: CanvasElement) => Promise<void>;
  onBatchDuplicateElements?: (elements: CanvasElement[]) => Promise<void>;
  onCursorMove: (x: number, y: number) => void;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  scale: number;
  stagePos: { x: number; y: number };
  onStageChange: (pos: { x: number; y: number }, scale: number) => void;
  onToggleReaction?: (elementId: string, emoji: string) => Promise<void>;
  penMode?: 'pen' | 'highlighter' | 'eraser';
  penStrokeWidth?: number;
  smartDrawing?: boolean;
  eraserMode?: 'whole' | 'partial';
  eraserSize?: number;
  onCanvasClick?: () => void;
  onMouseScreenPosChange?: (pos: { x: number; y: number }) => void;
  onStartPartialErase?: () => void;
  onFinishPartialErase?: (
    updated: { id: string; points: number[] }[],
    added: CanvasElement[],
    deletedIds: string[]
  ) => Promise<void>;
  votingData?: BoardVotingData | null;
  onToggleVote?: (elementId: string) => void;
  onAddVote?: (elementId: string) => void;
  onRemoveVote?: (elementId: string) => void;
  readOnly?: boolean;
  canCommentOnly?: boolean;
  onOpenShortcuts?: () => void;
  onOpenTemplates?: () => void;
  onOpenStickers?: () => void;
  onResetZoom?: () => void;
  gridType?: GridType;
  gridSize?: GridSize;
  gridOpacity?: number;
  showGrid?: boolean;
  onToggleGrid?: () => void;
  onLaserMove?: (worldPos: { x: number; y: number }, isDrawing: boolean) => void;
  onLaserDown?: (worldPos: { x: number; y: number }) => void;
  onLaserUp?: () => void;
  localLaserPosRef?: React.RefObject<{ x: number; y: number } | null>;
  isLocalLaserDrawingRef?: React.RefObject<boolean>;
  localLaserPointsRef?: React.RefObject<LaserPoint[]>;
}

interface InlineEditingState {
  elementId: string;
  type?: string;
  worldX: number;
  worldY: number;
  width: number;
  height: number;
  text: string;
  fill?: string;
  fontSize?: number;
  textAlign?: 'left' | 'center' | 'right';
  textColor?: string;
}

interface MarqueeBox {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

// Função de teste de colisão para apagar traços, post-its e formas com a Borracha
const checkElementHit = (el: CanvasElement, wx: number, wy: number, hitRadius = 20): boolean => {
  if (el.locked) return false;

  if (el.type === 'pen') {
    const pts = el.points || [];
    const threshold = Math.max(hitRadius, (el.strokeWidth || 4) + hitRadius);

    // Ponto único (dot click)
    if (pts.length === 2) {
      const px = pts[0] + el.x;
      const py = pts[1] + el.y;
      const distSq = (wx - px) * (wx - px) + (wy - py) * (wy - py);
      return distSq <= threshold * threshold;
    }

    for (let i = 0; i < pts.length - 2; i += 2) {
      const x1 = pts[i] + el.x;
      const y1 = pts[i + 1] + el.y;
      const x2 = pts[i + 2] + el.x;
      const y2 = pts[i + 3] + el.y;

      const dx = x2 - x1;
      const dy = y2 - y1;
      const lengthSq = dx * dx + dy * dy;
      let t = 0;
      if (lengthSq > 0) {
        t = Math.max(0, Math.min(1, ((wx - x1) * dx + (wy - y1) * dy) / lengthSq));
      }
      const projX = x1 + t * dx;
      const projY = y1 + t * dy;
      const distSq = (wx - projX) * (wx - projX) + (wy - projY) * (wy - projY);
      if (distSq <= threshold * threshold) {
        return true;
      }
    }
    return false;
  }

  if (el.type === 'circle') {
    const r = el.radius || (el.width ? el.width / 2 : 60);
    const cx = el.x;
    const cy = el.y;
    const distSq = (wx - cx) * (wx - cx) + (wy - cy) * (wy - cy);
    return distSq <= (r + hitRadius) * (r + hitRadius);
  }

  // Seta ou Linha
  if (el.type === 'arrow' || el.type === 'line') {
    const pts = el.points || [0, 0, 150, 100];
    const threshold = Math.max(hitRadius, (el.strokeWidth || 3) + hitRadius);
    for (let i = 0; i < pts.length - 2; i += 2) {
      const x1 = pts[i] + el.x;
      const y1 = pts[i + 1] + el.y;
      const x2 = pts[i + 2] + el.x;
      const y2 = pts[i + 3] + el.y;

      const dx = x2 - x1;
      const dy = y2 - y1;
      const lengthSq = dx * dx + dy * dy;
      let t = 0;
      if (lengthSq > 0) {
        t = Math.max(0, Math.min(1, ((wx - x1) * dx + (wy - y1) * dy) / lengthSq));
      }
      const projX = x1 + t * dx;
      const projY = y1 + t * dy;
      const distSq = (wx - projX) * (wx - projX) + (wy - projY) * (wy - projY);
      if (distSq <= threshold * threshold) {
        return true;
      }
    }
    return false;
  }

  const x = el.x - hitRadius;
  const y = el.y - hitRadius;
  const w = (el.width || 120) + hitRadius * 2;
  const h = (el.height || 120) + hitRadius * 2;
  return wx >= x && wx <= x + w && wy >= y && wy <= y + h;
};

// Testa colisão contínua ao longo do segmento percorrido pela borracha (evita pular traços em movimentos rápidos)
const checkElementSegmentHit = (
  el: CanvasElement,
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  hitRadius = 22
): boolean => {
  if (el.locked) return false;
  if (checkElementHit(el, p1.x, p1.y, hitRadius)) return true;
  if (checkElementHit(el, p2.x, p2.y, hitRadius)) return true;

  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dist = Math.hypot(dx, dy);
  const step = Math.max(10, hitRadius * 0.7);

  if (dist > step) {
    const numSteps = Math.min(12, Math.floor(dist / step));
    for (let s = 1; s <= numSteps; s++) {
      const t = s / (numSteps + 1);
      const mx = p1.x + dx * t;
      const my = p1.y + dy * t;
      if (checkElementHit(el, mx, my, hitRadius)) {
        return true;
      }
    }
  }

  return false;
};

// Converte links do Giphy para o CDN direto sem bloqueio de referrer
const cleanGifUrl = (src?: string): string => {
  if (!src) return '';
  const match = src.match(/giphy\.com\/media\/([^/]+)/);
  if (match && match[1]) {
    return `https://i.giphy.com/media/${match[1]}/giphy.gif`;
  }
  return src;
};

export const WhiteboardCanvas: React.FC<WhiteboardCanvasProps> = React.memo(({
  boardId,
  currentUser,
  elements,
  remoteUsers,
  currentTool,
  selectedColor,
  onSelectTool,
  onAddElement,
  onBatchAddElements,
  onUpdateElement,
  onBatchUpdateElements,
  onDeleteElement,
  onBatchDeleteElements,
  onDuplicateElement,
  onBatchDuplicateElements,
  onCursorMove,
  selectedIds,
  onSelectionChange,
  scale,
  stagePos,
  onStageChange,
  onToggleReaction,
  penMode = 'pen',
  penStrokeWidth = 4,
  smartDrawing = true,
  eraserMode = 'whole',
  eraserSize = 22,
  onCanvasClick,
  onMouseScreenPosChange,
  onStartPartialErase,
  onFinishPartialErase,
  votingData,
  onToggleVote,
  onAddVote,
  onRemoveVote,
  readOnly = false,
  canCommentOnly = false,
  onOpenShortcuts,
  onOpenTemplates,
  onOpenStickers,
  onResetZoom,
  gridType = 'hybrid',
  gridSize = 'medium',
  gridOpacity,
  showGrid = true,
  onToggleGrid,
  onLaserMove,
  onLaserDown,
  onLaserUp,
  localLaserPosRef,
  isLocalLaserDrawingRef,
  localLaserPointsRef,
}) => {
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const gifOverlayRef = useRef<HTMLDivElement>(null);
  const eraserCursorRef = useRef<HTMLDivElement>(null);
  const middlePanCurrentPos = useRef<{ x: number; y: number } | null>(null);

  // Controle de atalho dinâmico para Apontador Laser (Tap-to-switch e Hold-to-laser temporário)
  const previousToolBeforeLaser = useRef<ToolType>('select');
  const isLaserKeyHeld = useRef(false);
  const laserKeyDownTime = useRef(0);

  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [inlineEditing, setInlineEditing] = useState<InlineEditingState | null>(null);

  // Estado do Menu de Contexto do Botão Direito no Board
  const [contextMenuState, setContextMenuState] = useState<{
    isOpen: boolean;
    screenPos: { x: number; y: number };
    worldPos: { x: number; y: number };
    targetElementIds: string[];
  }>({
    isOpen: false,
    screenPos: { x: 0, y: 0 },
    worldPos: { x: 0, y: 0 },
    targetElementIds: [],
  });
  const [isMouseDownState, setIsMouseDownState] = useState(false);

  // Rastreamento do cursor no canvas e controle de área de transferência (Ctrl+C, Ctrl+V, Ctrl+X)
  const mouseWorldPosRef = useRef<{ x: number; y: number } | null>(null);
  const isMouseOverCanvasRef = useRef<boolean>(false);
  const pasteOffsetCountRef = useRef<number>(0);
  const lastPasteTimeRef = useRef<number>(0);

  // Modos ativos das ferramentas de desenho e colaboração
  const isEraserActive = currentTool === 'eraser' || (currentTool === 'pen' && penMode === 'eraser');
  const isHighlighterActive = (currentTool === 'pen' && penMode === 'highlighter') || (currentTool as string) === 'highlighter';
  const isDrawingPen = (currentTool === 'pen' && penMode === 'pen') || (currentTool as string) === 'pen';
  const isDrawingTool = isHighlighterActive || isDrawingPen;
  const userSelectionColor = currentUser.color || '#0284c7';

  // Marquee (Seleção em lote por arrasto)
  const [marqueeBox, setMarqueeBox] = useState<MarqueeBox | null>(null);
  const isMarquee = useRef(false);

  // Estado para desenho com caneta ou criação de seta por arraste
  const [drawingElement, setDrawingElement] = useState<CanvasElement | null>(null);
  const isDrawing = useRef(false);
  const isErasing = useRef(false);
  const deletedIdsInCurrentDrag = useRef<Set<string>>(new Set());
  const rafId = useRef<number | null>(null);
  const shapeDragStartRef = useRef<{ x: number; y: number } | null>(null);

  // Referências para sessão fluida de Borracha Parcial (60fps, sem lag ou saturação de banco)
  const partialEraseActiveRef = useRef(false);
  const workingElementsRef = useRef<CanvasElement[]>(elements);
  const lastErasePosRef = useRef<{ x: number; y: number } | null>(null);
  const initialEraseElementsRef = useRef<CanvasElement[]>(elements);

  // Estado local imediato para renderização a 60fps da borracha parcial sem flickering
  const [liveErasedElements, setLiveErasedElements] = useState<CanvasElement[] | null>(null);
  const liveRafId = useRef<number | null>(null);

  useEffect(() => {
    if (!partialEraseActiveRef.current) {
      workingElementsRef.current = elements;
    }
  }, [elements]);

  // Modal de edição / inserção de hiperlinks (padrão oficial de modal do projeto)
  const [linkModalState, setLinkModalState] = useState<{
    open: boolean;
    elementId: string;
    oldUrl?: string;
    initialUrl: string;
    initialLabel?: string;
    isNew?: boolean;
  } | null>(null);

  const handleSaveModalLink = (url: string, label?: string) => {
    if (!linkModalState) return;
    const elem = elements.find((el) => el.id === linkModalState.elementId);
    if (!elem) return;

    let currentLinks = elem.links;
    let currentLinkUrl = elem.linkUrl;
    if (linkModalState.oldUrl && normalizeUrl(linkModalState.oldUrl) !== normalizeUrl(url)) {
      const removed = removeLinkFromElement(currentLinkUrl, currentLinks, linkModalState.oldUrl);
      currentLinkUrl = removed.linkUrl;
      currentLinks = removed.links;
    }

    const { linkUrl, links } = addLinkToElement(
      currentLinkUrl,
      currentLinks,
      url,
      label
    );

    onUpdateElement(elem.id, {
      linkUrl,
      links,
      text: stripMarkdownLinks(elem.text || ''),
    });

    setLinkModalState(null);
  };

  const handleRemoveModalLink = () => {
    if (!linkModalState) return;
    const elem = elements.find((el) => el.id === linkModalState.elementId);
    if (!elem) return;

    const { linkUrl, links } = removeLinkFromElement(
      elem.linkUrl,
      elem.links,
      linkModalState.oldUrl || linkModalState.initialUrl
    );

    onUpdateElement(elem.id, {
      linkUrl,
      links,
      text: stripMarkdownLinks(elem.text || ''),
    });

    setLinkModalState(null);
  };

  // Rastreamento de posições iniciais para arraste em lote sincronizado
  const dragStartPositions = useRef<Map<string, { x: number; y: number }>>(new Map());

  // Navegação no canvas com botão do meio do mouse (Scroll Wheel Drag)
  const isMiddlePanning = useRef(false);
  const middlePanStart = useRef<{
    clientX: number;
    clientY: number;
    stageX: number;
    stageY: number;
  } | null>(null);
  const [isMiddlePanningState, setIsMiddlePanningState] = useState(false);
  const scaleRef = useRef(scale);
  const rafPanId = useRef<number | null>(null);

  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  // Mantém a camada de GIFs perfeitamente sincronizada nas coordenadas do mundo em tempo real
  useEffect(() => {
    if (gifOverlayRef.current) {
      gifOverlayRef.current.style.transform = `translate(${stagePos.x}px, ${stagePos.y}px) scale(${scale})`;
    }
  }, [stagePos.x, stagePos.y, scale]);

  // Função acelerada para movimentar o palco e garantir que os GIFs e overlays acompanhem com 0ms de latência
  const applyStagePan = (newPos: { x: number; y: number }, currentScale: number) => {
    middlePanCurrentPos.current = newPos;

    // 1. Atualiza visualmente o Konva Stage
    if (stageRef.current) {
      stageRef.current.position(newPos);
      stageRef.current.batchDraw();
    }

    // 2. Atualiza instantaneamente a posição da camada de GIFs (fica 100% ancorado no canvas do mundo)
    if (gifOverlayRef.current) {
      gifOverlayRef.current.style.transform = `translate(${newPos.x}px, ${newPos.y}px) scale(${currentScale})`;
    }

    // 3. Sincroniza via requestAnimationFrame com o React para manter grade e outros overlays alinhados
    if (rafPanId.current === null) {
      rafPanId.current = requestAnimationFrame(() => {
        rafPanId.current = null;
        onStageChange(newPos, currentScale);
      });
    }
  };

  // Efeito para garantir arraste suave e seguro com o botão do meio do mouse (scroll wheel)
  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      if (isMiddlePanning.current && middlePanStart.current) {
        const dx = e.clientX - middlePanStart.current.clientX;
        const dy = e.clientY - middlePanStart.current.clientY;
        const newPos = {
          x: Math.round(middlePanStart.current.stageX + dx),
          y: Math.round(middlePanStart.current.stageY + dy),
        };
        applyStagePan(newPos, scaleRef.current);
      }
    };

    const handleWindowMouseUp = (e: MouseEvent) => {
      if (e.button === 1 || isMiddlePanning.current) {
        if (rafPanId.current !== null) {
          cancelAnimationFrame(rafPanId.current);
          rafPanId.current = null;
        }
        if (middlePanCurrentPos.current) {
          onStageChange(middlePanCurrentPos.current, scaleRef.current);
          middlePanCurrentPos.current = null;
        }
        isMiddlePanning.current = false;
        middlePanStart.current = null;
        setIsMiddlePanningState(false);
      }
    };

    const handleAuxClick = (e: MouseEvent) => {
      if (e.button === 1) {
        e.preventDefault();
      }
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
    window.addEventListener('auxclick', handleAuxClick);
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
      window.removeEventListener('auxclick', handleAuxClick);
    };
  }, [onStageChange]);

  // Elementos selecionados atualmente
  const selectedElements = React.useMemo(() => {
    const listToUse = liveErasedElements || elements;
    return listToUse.filter((e) => selectedIds.includes(e.id));
  }, [liveErasedElements, elements, selectedIds]);

  // Mapa de colega remoto para o elemento que ele está selecionando (estável: não quebra quando colegas apenas movem o mouse)
  const remoteSelectionKey = remoteUsers
    .filter((u) => u.selectedElementId)
    .map((u) => `${u.userId}:${u.selectedElementId}:${u.name || ''}:${u.color || ''}`)
    .sort()
    .join('|');

  const remoteSelectionMap = React.useMemo(() => {
    const map: Record<string, { name: string; color: string }> = {};
    remoteUsers.forEach((u) => {
      if (u.selectedElementId) {
        map[u.selectedElementId] = { name: u.name || 'Colega', color: u.color || '#3b82f6' };
      }
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remoteSelectionKey]);

  // Atualiza nós anexados ao Konva Transformer (ignora nós bloqueados para não exibir alças de redimensionamento)
  useEffect(() => {
    if (!transformerRef.current || !stageRef.current) return;
    if (readOnly) {
      transformerRef.current.nodes([]);
      transformerRef.current.getLayer()?.batchDraw();
      return;
    }
    if (selectedIds.length > 0) {
      const nodes: Konva.Node[] = [];
      selectedIds.forEach((id) => {
        const elem = elements.find((e) => e.id === id);
        if (elem && !elem.locked) {
          // Em modo comentário, só anexa alças se o elemento for um post-it criado pelo próprio usuário
          if (canCommentOnly && (elem.updatedBy !== currentUser.uid || elem.type !== 'sticky')) {
            return;
          }
          const node = stageRef.current?.findOne('#' + id);
          if (node) nodes.push(node);
        }
      });
      transformerRef.current.nodes(nodes);
      transformerRef.current.getLayer()?.batchDraw();
    } else {
      transformerRef.current.nodes([]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [selectedIds, elements, readOnly, canCommentOnly, currentUser.uid]);

  // Alternar reação de emoji em post-its
  const handleToggleReactionInternal = useCallback(
    async (elementId: string, emoji: string) => {
      const elem = elements.find((e) => e.id === elementId);
      if (elem) {
        playReactionPopSound();
      }

      if (onToggleReaction) {
        await onToggleReaction(elementId, emoji);
        return;
      }

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

      await onUpdateElement(elementId, { reactions });
    },
    [elements, currentUser.uid, currentUser.displayName, scale, stagePos, boardId, onToggleReaction, onUpdateElement]
  );

  // Duplicar elemento individual
  const handleDuplicateElement = useCallback(
    async (elem: CanvasElement) => {
      if (onDuplicateElement) {
        await onDuplicateElement(elem);
        return;
      }
      const { id: _id, updatedAt: _up, ...rest } = elem;
      const newId = await onAddElement({
        ...rest,
        x: elem.x + 30,
        y: elem.y + 30,
        zIndex: elements.length + 1,
        updatedBy: currentUser.uid,
        updatedByName: currentUser.displayName,
      });
      onSelectionChange([newId]);
    },
    [elements.length, currentUser, onAddElement, onDuplicateElement, onSelectionChange]
  );

  // Duplicar elementos em lote
  const handleBatchDuplicate = useCallback(
    async (elems: CanvasElement[]) => {
      if (onBatchDuplicateElements) {
        await onBatchDuplicateElements(elems);
      } else {
        for (const el of elems) {
          await handleDuplicateElement(el);
        }
      }
    },
    [onBatchDuplicateElements, handleDuplicateElement]
  );

  // Copiar elementos para a área de transferência
  const handleCopy = useCallback(
    async (targets?: CanvasElement[]) => {
      const elemsToCopy = targets && targets.length > 0 ? targets : selectedElements;
      if (elemsToCopy.length === 0) return;
      await copyCanvasElements(elemsToCopy);
      pasteOffsetCountRef.current = 0;
    },
    [selectedElements]
  );

  // Recortar elementos (copia e deleta do quadro)
  const handleCut = useCallback(
    async (targets?: CanvasElement[]) => {
      if (readOnly || canCommentOnly) return;
      const elemsToCut = targets && targets.length > 0 ? targets : selectedElements;
      if (elemsToCut.length === 0) return;

      await copyCanvasElements(elemsToCut);
      pasteOffsetCountRef.current = 0;

      const idsToDelete = elemsToCut.map((e) => e.id);
      if (onBatchDeleteElements) {
        await onBatchDeleteElements(idsToDelete);
      } else {
        for (const id of idsToDelete) {
          await onDeleteElement(id);
        }
      }
      onSelectionChange([]);
    },
    [readOnly, canCommentOnly, selectedElements, onBatchDeleteElements, onDeleteElement, onSelectionChange]
  );

  // Colar elementos, imagens externas ou texto como sticky note
  const handlePaste = useCallback(
    async (e?: ClipboardEvent, customTargetCenter?: { x: number; y: number }) => {
      if (readOnly || canCommentOnly) return;

      // 1. Verificar se o evento contém imagem (ex: Print Screen ou cópia da web)
      if (e && e.clipboardData) {
        const items = Array.from(e.clipboardData.items || []);
        const imageItem = items.find((item) => item.type.startsWith('image/'));

        if (imageItem) {
          e.preventDefault();
          const file = imageItem.getAsFile();
          if (file) {
            try {
              const dataUrl = await fileToDataUrl(file);
              const dims = await getImageDimensions(dataUrl);

              const targetX = customTargetCenter
                ? customTargetCenter.x
                : mouseWorldPosRef.current && isMouseOverCanvasRef.current
                  ? mouseWorldPosRef.current.x
                  : Math.round((-stagePos.x + window.innerWidth / 2) / scale);
              const targetY = customTargetCenter
                ? customTargetCenter.y
                : mouseWorldPosRef.current && isMouseOverCanvasRef.current
                  ? mouseWorldPosRef.current.y
                  : Math.round((-stagePos.y + window.innerHeight / 2) / scale);

              const now = Date.now();
              const imageElement: CanvasElement = {
                id: 'elem_' + Math.random().toString(36).substring(2, 11),
                type: 'sticker',
                src: dataUrl,
                alt: 'Imagem colada',
                x: Math.round(targetX - dims.width / 2),
                y: Math.round(targetY - dims.height / 2),
                width: dims.width,
                height: dims.height,
                zIndex: elements.length + 1,
                updatedBy: currentUser.uid,
                updatedByName: currentUser.displayName,
                updatedAt: now,
              };

              if (onBatchAddElements) {
                await onBatchAddElements([imageElement]);
              } else {
                await onAddElement(imageElement);
              }
              onSelectionChange([imageElement.id]);
              return;
            } catch (err) {
              console.warn('[Paste] Erro ao colar imagem:', err);
            }
          }
        }

        // 2. Verificar se contém texto puro externo (que não é JSON de elementos Mirio)
        const plainText = e.clipboardData.getData('text/plain');
        if (plainText && plainText.trim()) {
          const trimmed = plainText.trim();
          let isMirioJson = false;
          if (trimmed.startsWith('{') && trimmed.includes('"mirio_elements"')) {
            try {
              const parsed = JSON.parse(trimmed);
              if (parsed?.type === 'mirio_elements' && Array.isArray(parsed?.elements)) {
                isMirioJson = true;
              }
            } catch {
              // não é json válido do mirio
            }
          }

          if (!isMirioJson) {
            e.preventDefault();
            const targetX = customTargetCenter
              ? customTargetCenter.x
              : mouseWorldPosRef.current && isMouseOverCanvasRef.current
                ? mouseWorldPosRef.current.x
                : Math.round((-stagePos.x + window.innerWidth / 2) / scale);
            const targetY = customTargetCenter
              ? customTargetCenter.y
              : mouseWorldPosRef.current && isMouseOverCanvasRef.current
                ? mouseWorldPosRef.current.y
                : Math.round((-stagePos.y + window.innerHeight / 2) / scale);

            const stickyElem: CanvasElement = {
              id: 'elem_' + Math.random().toString(36).substring(2, 11),
              type: 'sticky',
              text: trimmed,
              fill: selectedColor || '#fef08a',
              x: Math.round(targetX - 90),
              y: Math.round(targetY - 90),
              width: 180,
              height: 180,
              zIndex: elements.length + 1,
              updatedBy: currentUser.uid,
              updatedByName: currentUser.displayName,
              updatedAt: Date.now(),
            };

            if (onBatchAddElements) {
              await onBatchAddElements([stickyElem]);
            } else {
              await onAddElement(stickyElem);
            }
            onSelectionChange([stickyElem.id]);
            return;
          }
        }
      }

      // 3. Colar elementos copiados do Mirio (da aba atual ou de outros boards)
      const copiedElements = await getCachedClipboardElements();
      if (!copiedElements || copiedElements.length === 0) return;

      if (e) {
        e.preventDefault();
      }

      const box = getElementsBoundingBox(copiedElements);
      pasteOffsetCountRef.current += 1;
      const offsetSteps = pasteOffsetCountRef.current - 1;

      let targetCenterX: number;
      let targetCenterY: number;

      if (customTargetCenter) {
        targetCenterX = customTargetCenter.x;
        targetCenterY = customTargetCenter.y;
      } else if (mouseWorldPosRef.current && isMouseOverCanvasRef.current) {
        // Posiciona o centro da seleção colada sob o cursor do mouse
        targetCenterX = mouseWorldPosRef.current.x + offsetSteps * 25;
        targetCenterY = mouseWorldPosRef.current.y + offsetSteps * 25;
      } else {
        // Deslocamento progressivo a partir do centro original
        targetCenterX = box.centerX + pasteOffsetCountRef.current * 30;
        targetCenterY = box.centerY + pasteOffsetCountRef.current * 30;
      }

      const dx = Math.round(targetCenterX - box.centerX);
      const dy = Math.round(targetCenterY - box.centerY);

      const now = Date.now();
      const newElements: CanvasElement[] = copiedElements.map((elem, idx) => {
        const { id: _id, updatedAt: _up, ...rest } = elem;
        return {
          ...rest,
          id: 'elem_' + Math.random().toString(36).substring(2, 11) + idx,
          x: Math.round(elem.x + dx),
          y: Math.round(elem.y + dy),
          zIndex: elements.length + idx + 1,
          updatedBy: currentUser.uid,
          updatedByName: currentUser.displayName,
          updatedAt: now,
        };
      });

      if (onBatchAddElements) {
        await onBatchAddElements(newElements);
      } else {
        for (const item of newElements) {
          await onAddElement(item);
        }
      }
      onSelectionChange(newElements.map((el) => el.id));
    },
    [
      readOnly,
      canCommentOnly,
      stagePos.x,
      stagePos.y,
      scale,
      elements.length,
      currentUser.uid,
      currentUser.displayName,
      selectedColor,
      onBatchAddElements,
      onAddElement,
      onSelectionChange,
    ]
  );

  // Atalhos de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName) || (e.target as HTMLElement).isContentEditable) {
        return;
      }

      if (e.code === 'Space') {
        setIsSpacePressed(true);
      }

      // Deletar seleção
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (readOnly) return;
        if (selectedIds.length > 0) {
          const idsToDelete = canCommentOnly
            ? selectedIds.filter((id) => {
                const el = elements.find((item) => item.id === id);
                return el && el.updatedBy === currentUser.uid;
              })
            : selectedIds;

          if (idsToDelete.length > 0) {
            if (onBatchDeleteElements) {
              onBatchDeleteElements(idsToDelete);
            } else {
              idsToDelete.forEach((id) => onDeleteElement(id));
            }
            onSelectionChange([]);
          }
        }
      }

      // Copiar com Ctrl+C ou Meta+C
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
        if (selectedElements.length > 0) {
          e.preventDefault();
          handleCopy();
        }
      }

      // Recortar com Ctrl+X ou Meta+X
      if ((e.ctrlKey || e.metaKey) && (e.key === 'x' || e.key === 'X')) {
        if (!readOnly && !canCommentOnly && selectedElements.length > 0) {
          e.preventDefault();
          handleCut();
        }
      }

      // Colar com Ctrl+V ou Meta+V
      if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
        if (!readOnly && !canCommentOnly) {
          // Permite que o evento nativo 'paste' seja disparado se o foco permitir,
          // ou dispara o fallback caso o evento nativo não dispare em 50ms.
          setTimeout(() => {
            if (Date.now() - lastPasteTimeRef.current > 180) {
              lastPasteTimeRef.current = Date.now();
              handlePaste();
            }
          }, 50);
        }
      }

      // Duplicar com Ctrl+D ou Meta+D
      if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
        if (readOnly || canCommentOnly) return;
        e.preventDefault();
        if (selectedElements.length > 0) {
          handleBatchDuplicate(selectedElements);
        }
      }

      // Selecionar tudo com Ctrl+A ou Meta+A
      if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        onSelectionChange(elements.map((el) => el.id));
      }

      // Desmarcar tudo com Escape
      if (e.key === 'Escape') {
        onSelectionChange([]);
      }

      // Atalho de Ajuda / Atalhos (?)
      if ((e.key === '?' || (e.shiftKey && e.key === '/')) && onOpenShortcuts) {
        e.preventDefault();
        onOpenShortcuts();
        return;
      }

      // Bloquear / Desbloquear com Ctrl+Shift+L ou Meta+Shift+L (Padrão Figma/Miro)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'l' || e.key === 'L')) {
        if (!readOnly && !canCommentOnly && selectedElements.length > 0) {
          e.preventDefault();
          const shouldLock = selectedElements.some((el) => !el.locked);
          if (onBatchUpdateElements) {
            onBatchUpdateElements(
              selectedElements.map((el) => ({ id: el.id, updates: { locked: shouldLock } }))
            );
          } else {
            selectedElements.forEach((el) => onUpdateElement(el.id, { locked: shouldLock }));
          }
        }
      }

      // Empurrão de precisão com as setas do teclado (Nudge: 1px normal, 10px com Shift)
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        if (!readOnly && !canCommentOnly && selectedElements.length > 0) {
          e.preventDefault();
          const step = e.shiftKey ? 10 : 1;
          const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
          const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;

          const movableElements = selectedElements.filter((el) => !el.locked);
          if (movableElements.length > 0) {
            if (onBatchUpdateElements) {
              onBatchUpdateElements(
                movableElements.map((el) => ({
                  id: el.id,
                  updates: { x: el.x + dx, y: el.y + dy },
                }))
              );
            } else {
              movableElements.forEach((el) => {
                onUpdateElement(el.id, { x: el.x + dx, y: el.y + dy });
              });
            }
          }
        }
      }

      // Atalhos de Alinhamento e Distribuição quando múltiplos elementos estiverem selecionados
      if (selectedElements.length > 1 && !readOnly && !canCommentOnly) {
        let alignType: AlignmentType | null = null;
        if (e.altKey && !e.ctrlKey && !e.metaKey) {
          const k = e.key.toLowerCase();
          if (k === 'a') alignType = 'left';
          else if (k === 'h') alignType = 'center-horizontal';
          else if (k === 'd') alignType = 'right';
          else if (k === 'w') alignType = 'top';
          else if (k === 'v') alignType = 'center-vertical';
          else if (k === 's') alignType = 'bottom';
        } else if (e.altKey && (e.ctrlKey || e.metaKey)) {
          const k = e.key.toLowerCase();
          if (k === 'h') alignType = 'distribute-horizontal';
          else if (k === 'v') alignType = 'distribute-vertical';
        }

        if (alignType) {
          e.preventDefault();
          const updates = alignElements(selectedElements, alignType);
          if (updates.length > 0) {
            if (onBatchUpdateElements) {
              onBatchUpdateElements(updates);
            } else {
              updates.forEach((u) => onUpdateElement(u.id, u.updates));
            }
          }
          return;
        }
      }

      // Alternar visualização da grade do canvas: Ctrl+' ou Shift+G
      if ((e.ctrlKey || e.metaKey) && (e.key === "'" || e.key === '"' || e.code === 'Quote')) {
        e.preventDefault();
        onToggleGrid?.();
        return;
      }
      if (!e.ctrlKey && !e.metaKey && !e.altKey && e.shiftKey && (e.key === 'G' || e.key === 'g')) {
        e.preventDefault();
        onToggleGrid?.();
        return;
      }

      // Atalhos de ferramentas (sem Ctrl/Meta/Alt)
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key === 'l' || e.key === 'L') {
          if (!isLaserKeyHeld.current) {
            isLaserKeyHeld.current = true;
            laserKeyDownTime.current = Date.now();
            if (currentTool !== 'laser') {
              previousToolBeforeLaser.current = currentTool;
              onSelectTool('laser');
            }
          }
          return;
        }
        if (e.key === 'v' || e.key === 'V') onSelectTool('select');
        if (e.key === 'h' || e.key === 'H') onSelectTool('pan');
        if (!readOnly && (e.key === 'n' || e.key === 'N')) onSelectTool('sticky');
        if (!readOnly && !canCommentOnly) {
          if (e.key === 'f' || e.key === 'F') onSelectTool('frame');
          if (e.key === 'r' || e.key === 'R') onSelectTool('rect');
          if (e.key === 'o' || e.key === 'O') onSelectTool('circle');
          if (e.key === 'a' || e.key === 'A') onSelectTool('arrow');
          if (e.key === 'p' || e.key === 'P') onSelectTool('pen');
          if (e.key === 't' || e.key === 'T') onSelectTool('text');
          if (e.key === 'e' || e.key === 'E') onSelectTool('eraser');
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
      if (e.key === 'l' || e.key === 'L') {
        if (isLaserKeyHeld.current) {
          const duration = Date.now() - laserKeyDownTime.current;
          isLaserKeyHeld.current = false;
          // Hold-to-laser: se segurou 'L' por mais de 250ms, ao soltar restaura a ferramenta anterior
          if (duration >= 250 && previousToolBeforeLaser.current && previousToolBeforeLaser.current !== 'laser') {
            onSelectTool(previousToolBeforeLaser.current);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    selectedIds,
    selectedElements,
    elements,
    readOnly,
    canCommentOnly,
    currentUser.uid,
    onDeleteElement,
    onBatchDeleteElements,
    onUpdateElement,
    onBatchUpdateElements,
    onOpenShortcuts,
    onSelectTool,
    onSelectionChange,
    handleBatchDuplicate,
    handleCopy,
    handleCut,
    handlePaste,
    onToggleGrid,
  ]);

  // Listener do evento nativo de 'paste' para captura rica de dados (imagens, textos e itens)
  useEffect(() => {
    const handleWindowPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (['INPUT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable)) {
        return;
      }
      if (readOnly || canCommentOnly) return;

      const now = Date.now();
      if (now - lastPasteTimeRef.current > 150) {
        lastPasteTimeRef.current = now;
        handlePaste(e);
      }
    };

    window.addEventListener('paste', handleWindowPaste);
    return () => {
      window.removeEventListener('paste', handleWindowPaste);
    };
  }, [handlePaste, readOnly, canCommentOnly]);

  // Converte posição do ponteiro na tela em coordenadas do mundo (canvas)
  const getPointerWorldPos = () => {
    const stage = stageRef.current;
    if (!stage) return { x: 0, y: 0 };
    const pointer = stage.getPointerPosition();
    if (!pointer) return { x: 0, y: 0 };
    return {
      x: (pointer.x - stagePos.x) / scale,
      y: (pointer.y - stagePos.y) / scale,
    };
  };

  // Zoom no ponto do mouse com scroll
  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = scale;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - stagePos.x) / oldScale,
      y: (pointer.y - stagePos.y) / oldScale,
    };

    const scaleBy = 1.08;
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    let newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;
    newScale = Math.max(0.1, Math.min(5, newScale));

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };

    onStageChange(newPos, newScale);
  };

  // Seleção e alternância de seleção com Ctrl / Cmd
  const handleItemSelect = (
    elemId: string,
    e: Konva.KonvaEventObject<MouseEvent | TouchEvent>
  ) => {
    // Se a ferramenta ativa não for seleção nem borracha, não bloqueia nem intercepta o clique,
    // permitindo desenhar com caneta, apontar laser ou inserir textos sobre elementos existentes
    if (currentTool !== 'select' && !isEraserActive) {
      return;
    }

    e.cancelBubble = true;

    // Se o evento foi disparado pelo botão do meio ou outro botão secundário, ignora seleção
    if ('button' in e.evt && e.evt.button !== 0) {
      return;
    }

    // Se estiver usando a ferramenta borracha
    if (isEraserActive) {
      const targetElem = (liveErasedElements || elements).find((el) => el.id === elemId);
      if (
        eraserMode === 'partial' &&
        targetElem &&
        (targetElem.type === 'sticky' ||
          targetElem.type === 'frame' ||
          targetElem.type === 'text' ||
          targetElem.type === 'sticker' ||
          targetElem.type === 'gif')
      ) {
        // Protege notas, molduras e textos de clique acidental no modo parcial
        return;
      }
      onDeleteElement(elemId);
      onSelectionChange(selectedIds.filter((id) => id !== elemId));
      return;
    }

    const isModifier = e.evt && (e.evt.ctrlKey || e.evt.metaKey || e.evt.shiftKey);
    if (isModifier) {
      if (selectedIds.includes(elemId)) {
        onSelectionChange(selectedIds.filter((id) => id !== elemId));
      } else {
        onSelectionChange([...selectedIds, elemId]);
      }
    } else {
      if (!selectedIds.includes(elemId)) {
        onSelectionChange([elemId]);
      }
    }
  };

  // Atualização de elemento com suporte automático a delta em lote
  const handleElementChange = (elemId: string, updates: Partial<CanvasElement>) => {
    // Se o elemento é parte de uma multisseleção e houve movimento x/y
    if (
      updates.x !== undefined &&
      updates.y !== undefined &&
      selectedIds.includes(elemId) &&
      selectedIds.length > 1
    ) {
      const originElem = elements.find((e) => e.id === elemId);
      if (originElem) {
        const dx = updates.x - originElem.x;
        const dy = updates.y - originElem.y;

        const batchUpdates = selectedIds
          .map((id) => {
            const item = elements.find((e) => e.id === id);
            if (!item || item.locked) return null;
            if (id === elemId) {
              return { id, updates };
            }
            return {
              id,
              updates: {
                x: Math.round(item.x + dx),
                y: Math.round(item.y + dy),
              },
            };
          })
          .filter(Boolean) as { id: string; updates: Partial<CanvasElement> }[];

        if (onBatchUpdateElements) {
          onBatchUpdateElements(batchUpdates);
        } else {
          batchUpdates.forEach((u) => onUpdateElement(u.id, u.updates));
        }
        return;
      }
    }

    onUpdateElement(elemId, updates);
  };

  // Processamento contínuo da Borracha Parcial (corta e divide traços de caneta em tempo real)
  const processPartialEraseAt = useCallback(
    (currentPos: { x: number; y: number }) => {
      if (!workingElementsRef.current) return;

      const currentList = workingElementsRef.current;
      const effectiveRadius = eraserSize || 22;

      // Interpolação de passos intermediários para evitar falhas ou furos em arrastos rápidos
      const pointsToTest: { x: number; y: number }[] = [];
      if (lastErasePosRef.current) {
        const dx = currentPos.x - lastErasePosRef.current.x;
        const dy = currentPos.y - lastErasePosRef.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const step = Math.max(4, effectiveRadius * 0.4);
        if (dist > step) {
          const steps = Math.min(8, Math.floor(dist / step));
          for (let s = 1; s <= steps; s++) {
            const t = s / (steps + 1);
            pointsToTest.push({
              x: lastErasePosRef.current.x + dx * t,
              y: lastErasePosRef.current.y + dy * t,
            });
          }
        }
      }
      pointsToTest.push(currentPos);
      lastErasePosRef.current = currentPos;

      let hasChanges = false;
      let workingList = [...currentList];

      for (const sample of pointsToTest) {
        let stepChanged = false;
        const nextList: CanvasElement[] = [];

        for (const el of workingList) {
          if (el.locked) {
            nextList.push(el);
            continue;
          }

          // A. Traço de caneta / desenho livre: recorte e divisão gradual (parcial)
          if (el.type === 'pen' && el.points && el.points.length >= 4) {
            const res = eraseStrokePartially(el.points, { x: el.x, y: el.y }, sample, effectiveRadius);

            if (res.action === 'none') {
              nextList.push(el);
            } else if (res.action === 'delete') {
              stepChanged = true;
            } else if (res.action === 'update') {
              stepChanged = true;
              nextList.push({
                ...el,
                points: res.points,
              });
            } else if (res.action === 'split') {
              stepChanged = true;
              nextList.push({
                ...el,
                points: res.firstPoints,
              });
              res.extraStrokes.forEach((extra, idx) => {
                nextList.push({
                  ...el,
                  id: `${el.id}_s${idx + 1}`,
                  points: extra,
                  zIndex: (el.zIndex || 1) + 1,
                  updatedBy: currentUser.uid,
                  updatedByName: currentUser.displayName,
                  updatedAt: Date.now(),
                });
              });
            }
            continue;
          }

          // B. Formas geométricas e desenhos de Smart Drawing (círculo, retângulo, triângulo, seta, linha, etc.)
          const isDrawableShape =
            el.type === 'circle' ||
            el.type === 'rect' ||
            el.type === 'triangle' ||
            el.type === 'arrow' ||
            el.type === 'line' ||
            el.type === 'diamond' ||
            el.type === 'star';

          if (isDrawableShape && checkElementHit(el, sample.x, sample.y, effectiveRadius)) {
            stepChanged = true;
            // Apaga a forma desenhada ao encostar com a borracha
            continue;
          }

          // C. Elementos de conteúdo (notas, molduras, texto, stickers): preservados no modo parcial
          nextList.push(el);
        }

        if (stepChanged) {
          hasChanges = true;
          workingList = nextList;
        }
      }

      if (hasChanges) {
        workingElementsRef.current = workingList;
        if (liveRafId.current) cancelAnimationFrame(liveRafId.current);
        liveRafId.current = requestAnimationFrame(() => {
          setLiveErasedElements([...workingList]);
        });
      }
    },
    [eraserSize, currentUser]
  );

  // Finalização da sessão de borracha parcial: sincroniza as alterações com Firestore
  const finishPartialErase = useCallback(async () => {
    if (!partialEraseActiveRef.current) return;
    partialEraseActiveRef.current = false;
    lastErasePosRef.current = null;
    if (liveRafId.current) cancelAnimationFrame(liveRafId.current);

    const initialList = initialEraseElementsRef.current;
    const finalElements = workingElementsRef.current;
    setLiveErasedElements(null);
    if (!initialList || !finalElements) return;

    const initialMap = new Map<string, CanvasElement>(initialList.map((e: CanvasElement) => [e.id, e]));
    const finalMap = new Map<string, CanvasElement>(finalElements.map((e: CanvasElement) => [e.id, e]));

    // Elementos deletados
    const deletedIds: string[] = [];
    for (const [id] of initialMap) {
      if (!finalMap.has(id)) {
        deletedIds.push(id);
      }
    }

    // Elementos modificados
    const updatedList: { id: string; points: number[] }[] = [];
    for (const [id, finalEl] of finalMap) {
      const initEl = initialMap.get(id);
      if (initEl && initEl.type === 'pen' && finalEl.type === 'pen') {
        const initPts = initEl.points || [];
        const finPts = finalEl.points || [];
        if (initPts.length !== finPts.length || initPts.some((val: number, idx: number) => val !== finPts[idx])) {
          updatedList.push({ id, points: finPts });
        }
      }
    }

    // Elementos adicionados (splits)
    const addedList: CanvasElement[] = [];
    for (const [id, finalEl] of finalMap) {
      if (!initialMap.has(id)) {
        addedList.push(finalEl);
      }
    }

    if (deletedIds.length > 0 || updatedList.length > 0 || addedList.length > 0) {
      if (onFinishPartialErase) {
        await onFinishPartialErase(updatedList, addedList, deletedIds);
      } else {
        if (deletedIds.length > 0 && onBatchDeleteElements) {
          await onBatchDeleteElements(deletedIds);
        }
        if (updatedList.length > 0 && onBatchUpdateElements) {
          await onBatchUpdateElements(updatedList.map((u) => ({ id: u.id, updates: { points: u.points } })));
        }
        for (const added of addedList) {
          await onAddElement(added);
        }
      }
    }
  }, [onFinishPartialErase, onBatchDeleteElements, onBatchUpdateElements, onAddElement]);

  // Efeito para garantir commit seguro da borracha parcial caso o mouse solte fora da janela
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (partialEraseActiveRef.current) {
        finishPartialErase();
      }
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [finishPartialErase]);

  // Pressionar mouse no canvas
  const handleMouseDown = async (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (contextMenuState.isOpen) {
      setContextMenuState((prev) => ({ ...prev, isOpen: false }));
    }

    // Intercepta botão do meio do mouse (scroll wheel click) para navegar na tela e nunca abrir seleção
    if (e.evt.button === 1) {
      e.evt.preventDefault();
      isMiddlePanning.current = true;
      middlePanStart.current = {
        clientX: e.evt.clientX,
        clientY: e.evt.clientY,
        stageX: stagePos.x,
        stageY: stagePos.y,
      };
      setIsMiddlePanningState(true);
      return;
    }

    setIsMouseDownState(true);
    onCanvasClick?.();
    const isClickedOnStage = e.target === stageRef.current;
    const worldPos = getPointerWorldPos();

    if (inlineEditing) {
      handleFinishEditing();
    }

    if (currentTool === 'pan' || isSpacePressed) {
      return;
    }

    // Ignora qualquer clique que não seja com o botão primário esquerdo (button 0)
    if (e.evt.button !== 0) {
      return;
    }

    // Ferramenta Apontador Laser (L) - Emite feixe efêmero sem alterar elementos
    if (currentTool === 'laser') {
      if (isLocalLaserDrawingRef) isLocalLaserDrawingRef.current = true;
      if (localLaserPosRef) localLaserPosRef.current = worldPos;
      if (localLaserPointsRef?.current) {
        localLaserPointsRef.current.push({ x: worldPos.x, y: worldPos.y, timestamp: Date.now() });
      }
      onLaserDown?.(worldPos);
      return;
    }

    // Se estiver em modo somente leitura (view): permite apenas navegação e seleção por caixa
    if (readOnly) {
      if (isClickedOnStage && currentTool === 'select') {
        onSelectionChange([]);
        isMarquee.current = true;
        setMarqueeBox({
          startX: worldPos.x,
          startY: worldPos.y,
          currentX: worldPos.x,
          currentY: worldPos.y,
        });
      }
      return;
    }

    // Se estiver em modo apenas comentários (comment): bloqueia ferramentas de desenho e criação de formas
    if (canCommentOnly && currentTool !== 'select' && currentTool !== 'sticky') {
      return;
    }

    // Modo Borracha
    if (isEraserActive) {
      isErasing.current = true;
      deletedIdsInCurrentDrag.current = new Set();
      lastErasePosRef.current = worldPos;

      if (eraserMode === 'partial') {
        partialEraseActiveRef.current = true;
        onStartPartialErase?.();
        initialEraseElementsRef.current = [...elements];
        workingElementsRef.current = [...elements];
        setLiveErasedElements([...elements]);
        processPartialEraseAt(worldPos);
        return;
      }

      // Modo Borracha: Apagar Objeto/Traço Inteiro instantaneamente
      const hitRadius = Math.max(18, eraserSize || 22);
      const hitElements = elements.filter(
        (el) => !el.locked && checkElementHit(el, worldPos.x, worldPos.y, hitRadius)
      );

      if (hitElements.length > 0) {
        hitElements.forEach((el) => deletedIdsInCurrentDrag.current.add(el.id));
        const ids = hitElements.map((el) => el.id);
        if (onBatchDeleteElements) {
          onBatchDeleteElements(ids);
        } else {
          ids.forEach((id) => onDeleteElement(id));
        }
        onSelectionChange(selectedIds.filter((id) => !deletedIdsInCurrentDrag.current.has(id)));
      }
      return;
    }

    // Desenho livre (Caneta ou Marca-texto com opacidade calibrada)
    if (isDrawingTool) {
      isDrawing.current = true;
      const strokeWidthVal = isHighlighterActive
        ? Math.max(22, (penStrokeWidth || 4) * 4)
        : penStrokeWidth || 4;
      const opacityVal = isHighlighterActive ? 0.38 : 1;
      const strokeColorVal = selectedColor || (isHighlighterActive ? '#facc15' : '#0f172a');

      const newFreeDraw: CanvasElement = {
        id: 'temp_pen',
        type: 'pen',
        x: 0,
        y: 0,
        points: [worldPos.x, worldPos.y],
        stroke: strokeColorVal,
        strokeWidth: strokeWidthVal,
        opacity: opacityVal,
        zIndex: elements.length + 1,
        updatedBy: currentUser.uid,
        updatedByName: currentUser.displayName,
        updatedAt: 0,
      };
      setDrawingElement(newFreeDraw);
      return;
    }

    // Seta por arraste
    if (currentTool === 'arrow') {
      isDrawing.current = true;
      const newArrow: CanvasElement = {
        id: 'temp_arrow',
        type: 'arrow',
        x: worldPos.x,
        y: worldPos.y,
        points: [0, 0, 0, 0],
        stroke: selectedColor || '#2563eb',
        strokeWidth: 3,
        zIndex: elements.length + 1,
        updatedBy: currentUser.uid,
        updatedByName: currentUser.displayName,
        updatedAt: 0,
      };
      setDrawingElement(newArrow);
      return;
    }

    // Criação e dimensionamento interativo de Formas Geométricas por clique e arraste (Figma / Miro style)
    if (['rect', 'circle', 'diamond', 'triangle', 'star'].includes(currentTool)) {
      if (selectedIds.length > 0) {
        onSelectionChange([]);
      }
      isDrawing.current = true;
      shapeDragStartRef.current = { x: worldPos.x, y: worldPos.y };
      const shapeFill = selectedColor && selectedColor !== '#0f172a' ? selectedColor : '#ffffff';
      const newShape: CanvasElement = {
        id: 'temp_shape_preview',
        type: currentTool as ElementType,
        x: worldPos.x,
        y: worldPos.y,
        width: 0,
        height: 0,
        radius: 0,
        fill: shapeFill,
        stroke: '#334155',
        strokeWidth: 2,
        zIndex: elements.length + 1,
        updatedBy: currentUser.uid,
        updatedByName: currentUser.displayName,
        updatedAt: 0,
      };
      setDrawingElement(newShape);
      return;
    }

    // Clique no canvas vazio
    if (isClickedOnStage) {
      // Se acabou de fechar um menu ou popover flutuante (como "Mais opções"), preserva a seleção e a ferramenta!
      if (typeof window !== 'undefined' && (window as any).__mirio_menu_dismissed_at) {
        const elapsed = Date.now() - (window as any).__mirio_menu_dismissed_at;
        if (elapsed < 350) {
          (window as any).__mirio_menu_dismissed_at = 0;
          return;
        }
      }

      // Inicia Marquee Box na ferramenta Seleção
      if (currentTool === 'select') {
        isMarquee.current = true;
        setMarqueeBox({
          startX: worldPos.x,
          startY: worldPos.y,
          currentX: worldPos.x,
          currentY: worldPos.y,
        });

        if (!e.evt.ctrlKey && !e.evt.metaKey && !e.evt.shiftKey) {
          onSelectionChange([]);
        }
        return;
      }

      // Criação de Sticky Note no clique
      if (currentTool === 'sticky') {
        const posX = Math.round(worldPos.x - 90);
        const posY = Math.round(worldPos.y - 90);
        const id = await onAddElement({
          type: 'sticky',
          x: posX,
          y: posY,
          width: 180,
          height: 180,
          fill: selectedColor || '#fff9b1',
          text: '',
          zIndex: elements.length + 1,
          updatedBy: currentUser.uid,
          updatedByName: currentUser.displayName,
        });
        onSelectionChange([id]);
        setInlineEditing({
          elementId: id,
          type: 'sticky',
          worldX: posX,
          worldY: posY,
          width: 180,
          height: 180,
          text: '',
          fill: selectedColor || '#fff9b1',
        });
        onSelectTool('select');
      } else if (currentTool === 'frame') {
        const id = await onAddElement({
          type: 'frame',
          x: Math.round(worldPos.x - 160),
          y: Math.round(worldPos.y - 140),
          width: 320,
          height: 480,
          text: 'Área de Sprint',
          fill: 'rgba(241, 245, 249, 0.45)',
          stroke: '#94a3b8',
          strokeWidth: 2,
          zIndex: 1,
          updatedBy: currentUser.uid,
          updatedByName: currentUser.displayName,
        });
        onSelectionChange([id]);
        onSelectTool('select');
      } else if (currentTool === 'text') {
        const posX = Math.round(worldPos.x);
        const posY = Math.round(worldPos.y);
        const id = await onAddElement({
          type: 'text',
          x: posX,
          y: posY,
          width: 220,
          text: '',
          fontSize: 20,
          fill: '#0f172a',
          zIndex: elements.length + 1,
          updatedBy: currentUser.uid,
          updatedByName: currentUser.displayName,
        });
        onSelectionChange([id]);
        setInlineEditing({
          elementId: id,
          type: 'text',
          worldX: posX,
          worldY: posY,
          width: 220,
          height: 36,
          text: '',
          fontSize: 20,
          fill: 'transparent',
          textColor: '#0f172a',
        });
        onSelectTool('select');
      }
    }
  };

  // Movimento do mouse
  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    // Navegação suave com botão do meio do mouse (Scroll Wheel Drag)
    if (isMiddlePanning.current && middlePanStart.current) {
      const dx = e.evt.clientX - middlePanStart.current.clientX;
      const dy = e.evt.clientY - middlePanStart.current.clientY;
      const newPos = {
        x: Math.round(middlePanStart.current.stageX + dx),
        y: Math.round(middlePanStart.current.stageY + dy),
      };
      applyStagePan(newPos, scale);
      return;
    }

    const stage = stageRef.current;
    if (stage) {
      const pointer = stage.getPointerPosition();
      if (pointer) {
        if (isEraserActive && eraserMode === 'partial' && eraserCursorRef.current) {
          eraserCursorRef.current.style.transform = `translate3d(${pointer.x}px, ${pointer.y}px, 0)`;
          eraserCursorRef.current.style.display = 'block';
        } else if (eraserCursorRef.current && eraserCursorRef.current.style.display !== 'none') {
          eraserCursorRef.current.style.display = 'none';
        }
        onMouseScreenPosChange?.(pointer);
      }
    }

    const worldPos = getPointerWorldPos();
    if (
      !mouseWorldPosRef.current ||
      Math.hypot(worldPos.x - mouseWorldPosRef.current.x, worldPos.y - mouseWorldPosRef.current.y) > 20
    ) {
      pasteOffsetCountRef.current = 0;
    }
    mouseWorldPosRef.current = worldPos;
    isMouseOverCanvasRef.current = true;
    onCursorMove(Math.round(worldPos.x), Math.round(worldPos.y));

    // Apontador Laser - Registra pontos do rastro efêmero e transmite ao vivo
    if (currentTool === 'laser') {
      if (localLaserPosRef) localLaserPosRef.current = worldPos;
      const isDrawing = isLocalLaserDrawingRef ? isLocalLaserDrawingRef.current : isMouseDownState;
      if (isDrawing && localLaserPointsRef?.current) {
        const points = localLaserPointsRef.current;
        const last = points[points.length - 1];
        const now = Date.now();
        if (!last) {
          points.push({ x: worldPos.x, y: worldPos.y, timestamp: now });
        } else {
          const dist = Math.hypot(worldPos.x - last.x, worldPos.y - last.y);
          // Filtra micro-tremores (< 3px) para evitar aglomeração de pontos e nós densos
          if (dist >= 3) {
            // Se o movimento foi rápido (> 20px), insere ponto intermediário suave (evita cantos retos)
            if (dist > 20) {
              const midX = (last.x + worldPos.x) / 2;
              const midY = (last.y + worldPos.y) / 2;
              const midT = Math.round((last.timestamp + now) / 2);
              points.push({ x: midX, y: midY, timestamp: midT });
            }
            points.push({ x: worldPos.x, y: worldPos.y, timestamp: now });
          }
        }
      }
      onLaserMove?.(worldPos, isDrawing);
      return;
    }

    // Atualização de Marquee Box
    if (isMarquee.current) {
      setMarqueeBox((prev) =>
        prev
          ? {
              ...prev,
              currentX: worldPos.x,
              currentY: worldPos.y,
            }
          : null
      );
      return;
    }

    // Modo Borracha com arraste contínuo
    if (isErasing.current && isEraserActive) {
      const p1 = lastErasePosRef.current || worldPos;
      const p2 = worldPos;
      lastErasePosRef.current = worldPos;

      if (eraserMode === 'partial') {
        processPartialEraseAt(worldPos);
        return;
      }

      // Modo Borracha: Apagar Objeto/Traço Inteiro com Interpolação de Trajeto (nunca pula traços)
      const hitRadius = Math.max(18, eraserSize || 22);
      const deletedInDrag = deletedIdsInCurrentDrag.current;

      const hitElements = elements.filter(
        (el) => !el.locked && !deletedInDrag.has(el.id) && checkElementSegmentHit(el, p1, p2, hitRadius)
      );

      if (hitElements.length > 0) {
        hitElements.forEach((el) => deletedInDrag.add(el.id));
        const ids = hitElements.map((el) => el.id);
        if (onBatchDeleteElements) {
          onBatchDeleteElements(ids);
        } else {
          ids.forEach((id) => onDeleteElement(id));
        }
        onSelectionChange(selectedIds.filter((id) => !deletedInDrag.has(id)));
      }
      return;
    }

    if (!isDrawing.current || !drawingElement) return;

    const isShift = Boolean(e.evt?.shiftKey);

    if (rafId.current) cancelAnimationFrame(rafId.current);

    rafId.current = requestAnimationFrame(() => {
      if (drawingElement.type === 'pen') {
        const newPoints = [...(drawingElement.points || []), worldPos.x, worldPos.y];
        setDrawingElement({
          ...drawingElement,
          points: newPoints,
        });
      } else if (drawingElement.type === 'arrow') {
        const dx = worldPos.x - drawingElement.x;
        const dy = worldPos.y - drawingElement.y;
        setDrawingElement({
          ...drawingElement,
          points: [0, 0, dx, dy],
        });
      } else if (['rect', 'circle', 'diamond', 'triangle', 'star'].includes(drawingElement.type)) {
        const start = shapeDragStartRef.current || { x: drawingElement.x, y: drawingElement.y };
        const bounds = calculateShapeDragBounds(drawingElement.type, start, worldPos, isShift);

        setDrawingElement((prev) =>
          prev
            ? {
                ...prev,
                ...bounds,
              }
            : null
        );
      }
    });
  };

  // Soltar botão do mouse
  const handleMouseUp = async (e: Konva.KonvaEventObject<MouseEvent>) => {
    setIsMouseDownState(false);

    if (currentTool === 'laser') {
      if (isLocalLaserDrawingRef) isLocalLaserDrawingRef.current = false;
      onLaserUp?.();
      return;
    }

    if (e.evt.button === 1 || isMiddlePanning.current) {
      if (middlePanCurrentPos.current) {
        onStageChange(middlePanCurrentPos.current, scale);
        middlePanCurrentPos.current = null;
      }
      isMiddlePanning.current = false;
      middlePanStart.current = null;
      setIsMiddlePanningState(false);
      return;
    }

    if (partialEraseActiveRef.current) {
      await finishPartialErase();
    }

    isErasing.current = false;
    deletedIdsInCurrentDrag.current.clear();
    lastErasePosRef.current = null;

    // Finalização do Marquee Box (Seleção em lote estilo Windows / Miro)
    if (isMarquee.current && marqueeBox) {
      isMarquee.current = false;
      const x1 = Math.min(marqueeBox.startX, marqueeBox.currentX);
      const y1 = Math.min(marqueeBox.startY, marqueeBox.currentY);
      const x2 = Math.max(marqueeBox.startX, marqueeBox.currentX);
      const y2 = Math.max(marqueeBox.startY, marqueeBox.currentY);
      const width = x2 - x1;
      const height = y2 - y1;

      setMarqueeBox(null);

      if (width > 6 && height > 6) {
        const hits = elements
          .filter((el) => {
            let elX = el.x;
            let elY = el.y;
            let elW = el.width || 120;
            let elH = el.height || 120;

            if (el.type === 'circle') {
              const r = el.radius || (el.width ? el.width / 2 : 60);
              elX = el.x - r;
              elY = el.y - r;
              elW = r * 2;
              elH = r * 2;
            } else if (
              (el.type === 'pen' || el.type === 'arrow') &&
              el.points &&
              el.points.length >= 2
            ) {
              if (el.type === 'pen') {
                const xs = el.points.filter((_, i) => i % 2 === 0);
                const ys = el.points.filter((_, i) => i % 2 === 1);
                elX = Math.min(...xs);
                elY = Math.min(...ys);
                elW = Math.max(...xs) - elX || 10;
                elH = Math.max(...ys) - elY || 10;
              } else {
                elX = Math.min(el.x, el.x + (el.points[2] || 0));
                elY = Math.min(el.y, el.y + (el.points[3] || 0));
                elW = Math.abs(el.points[2] || 0) || 10;
                elH = Math.abs(el.points[3] || 0) || 10;
              }
            }

            const elRight = elX + elW;
            const elBottom = elY + elH;

            // Teste de intersecção AABB
            return !(elX > x2 || elRight < x1 || elY > y2 || elBottom < y1);
          })
          .map((el) => el.id);

        if (e.evt && (e.evt.ctrlKey || e.evt.metaKey || e.evt.shiftKey)) {
          onSelectionChange(Array.from(new Set([...selectedIds, ...hits])));
        } else {
          onSelectionChange(hits);
        }
      }
      return;
    }

    // Finalização de desenho de Caneta ou Seta ou Forma
    if (isDrawing.current && drawingElement) {
      isDrawing.current = false;
      const finishedDrawing = drawingElement;
      const dragStart = shapeDragStartRef.current;
      setDrawingElement(null);
      shapeDragStartRef.current = null;

      if (
        finishedDrawing.type === 'pen' &&
        finishedDrawing.points &&
        finishedDrawing.points.length > 2
      ) {
        // Se Smart Drawing estiver ativo, tenta reconhecer forma geométrica ou suavizar traço
        if (smartDrawing && !isHighlighterActive) {
          const recognized = recognizeSmartShape(finishedDrawing.points);
          if (recognized.type === 'circle') {
            await onAddElement({
              type: 'circle',
              x: recognized.x,
              y: recognized.y,
              radius: recognized.radius,
              fill: 'transparent',
              stroke: finishedDrawing.stroke,
              strokeWidth: finishedDrawing.strokeWidth,
              zIndex: elements.length + 1,
              updatedBy: currentUser.uid,
              updatedByName: currentUser.displayName,
            });
          } else if (recognized.type === 'rect') {
            await onAddElement({
              type: 'rect',
              x: recognized.x,
              y: recognized.y,
              width: recognized.width,
              height: recognized.height,
              fill: 'transparent',
              stroke: finishedDrawing.stroke,
              strokeWidth: finishedDrawing.strokeWidth,
              zIndex: elements.length + 1,
              updatedBy: currentUser.uid,
              updatedByName: currentUser.displayName,
            });
          } else if (recognized.type === 'triangle') {
            await onAddElement({
              type: 'triangle',
              x: recognized.x,
              y: recognized.y,
              width: recognized.width,
              height: recognized.height,
              fill: 'transparent',
              stroke: finishedDrawing.stroke,
              strokeWidth: finishedDrawing.strokeWidth,
              zIndex: elements.length + 1,
              updatedBy: currentUser.uid,
              updatedByName: currentUser.displayName,
            });
          } else if (recognized.type === 'arrow') {
            await onAddElement({
              type: 'arrow',
              x: recognized.points[0],
              y: recognized.points[1],
              points: [
                0,
                0,
                recognized.points[2] - recognized.points[0],
                recognized.points[3] - recognized.points[1],
              ],
              stroke: finishedDrawing.stroke,
              strokeWidth: finishedDrawing.strokeWidth,
              zIndex: elements.length + 1,
              updatedBy: currentUser.uid,
              updatedByName: currentUser.displayName,
            });
          } else {
            // Traço suavizado com ruído manual eliminado
            await onAddElement({
              type: 'pen',
              x: 0,
              y: 0,
              points: recognized.points,
              stroke: finishedDrawing.stroke,
              strokeWidth: finishedDrawing.strokeWidth,
              opacity: finishedDrawing.opacity,
              zIndex: elements.length + 1,
              updatedBy: currentUser.uid,
              updatedByName: currentUser.displayName,
            });
          }
        } else {
          await onAddElement({
            type: 'pen',
            x: 0,
            y: 0,
            points: finishedDrawing.points.map((p) => Math.round(p)),
            stroke: finishedDrawing.stroke,
            strokeWidth: finishedDrawing.strokeWidth,
            opacity: finishedDrawing.opacity,
            zIndex: elements.length + 1,
            updatedBy: currentUser.uid,
            updatedByName: currentUser.displayName,
          });
        }
        // Não seleciona o elemento recém-criado: o usuário continua em modo caneta pronto para o próximo traço!
      } else if (finishedDrawing.type === 'arrow' && finishedDrawing.points) {
        await onAddElement({
          type: 'arrow',
          x: Math.round(finishedDrawing.x),
          y: Math.round(finishedDrawing.y),
          points: finishedDrawing.points.map((p) => Math.round(p)),
          stroke: finishedDrawing.stroke,
          strokeWidth: finishedDrawing.strokeWidth,
          zIndex: elements.length + 1,
          updatedBy: currentUser.uid,
          updatedByName: currentUser.displayName,
        });
        onSelectTool('select');
      } else if (['rect', 'circle', 'diamond', 'triangle', 'star'].includes(finishedDrawing.type)) {
        const start = dragStart;
        const worldPos = getPointerWorldPos();
        const dist = start ? Math.hypot(worldPos.x - start.x, worldPos.y - start.y) : 0;
        const hasCustomSize = dist >= 15;
        const shapeType = finishedDrawing.type;
        const shapeFill =
          finishedDrawing.fill || (selectedColor && selectedColor !== '#0f172a' ? selectedColor : '#ffffff');
        const shapeStroke = finishedDrawing.stroke || '#334155';
        const shapeStrokeWidth = finishedDrawing.strokeWidth || 2;

        const bounds =
          hasCustomSize && finishedDrawing.width && finishedDrawing.height
            ? {
                x: Math.round(finishedDrawing.x),
                y: Math.round(finishedDrawing.y),
                width: Math.max(12, Math.round(finishedDrawing.width)),
                height: Math.max(12, Math.round(finishedDrawing.height)),
                ...(shapeType === 'circle'
                  ? { radius: Math.max(6, Math.round(finishedDrawing.radius || finishedDrawing.width / 2)) }
                  : {}),
              }
            : getDefaultShapeBounds(shapeType, start || worldPos);

        const id = await onAddElement({
          type: shapeType,
          ...bounds,
          fill: shapeFill,
          stroke: shapeStroke,
          strokeWidth: shapeStrokeWidth,
          zIndex: elements.length + 1,
          updatedBy: currentUser.uid,
          updatedByName: currentUser.displayName,
        } as any);

        onSelectionChange([id]);
        onSelectTool('select');
      }
    }
  };

  // Finalizar edição de texto inline
  const handleFinishEditing = () => {
    if (!inlineEditing) return;
    const finalVal = inlineEditing.text.trim();
    if (inlineEditing.type === 'text' && !finalVal) {
      // Apenas caixas de texto soltas vazias criadas do zero são descartadas se nunca tiveram conteúdo
      const elem = elements.find((e) => e.id === inlineEditing.elementId);
      if (elem && !elem.text) {
        onDeleteElement(inlineEditing.elementId);
        onSelectionChange(selectedIds.filter((id) => id !== inlineEditing.elementId));
      }
    } else {
      // Post-its, molduras e formas geométricas NUNCA são deletados ao sair da edição
      onUpdateElement(inlineEditing.elementId, {
        text: stripMarkdownLinks(inlineEditing.text),
      });
    }
    setInlineEditing(null);
  };

  const isDraggableStage = currentTool === 'pan' || isSpacePressed;

  // Ordenação de elementos para renderização (molduras no fundo)
  const sortedElements = React.useMemo(() => {
    const listToRender = liveErasedElements || elements;
    return [...listToRender].sort((a, b) => {
      if (a.type === 'frame' && b.type !== 'frame') return -1;
      if (a.type !== 'frame' && b.type === 'frame') return 1;
      return a.zIndex - b.zIndex;
    });
  }, [liveErasedElements, elements]);

  // Post-it selecionado único (para barra de reações flutuante em HTML com z-index 50)
  const selectedSticky =
    selectedElements.length === 1 && selectedElements[0].type === 'sticky'
      ? selectedElements[0]
      : null;

  const selectedStickyScreenX = selectedSticky ? selectedSticky.x * scale + stagePos.x : 0;
  const selectedStickyScreenY = selectedSticky ? selectedSticky.y * scale + stagePos.y : 0;
  const selectedStickyWidth = selectedSticky ? (selectedSticky.width || 180) * scale : 0;
  const selectedStickyHeight = selectedSticky ? (selectedSticky.height || 180) * scale : 0;

  // Cursor customizado de alta precisão de acordo com a ferramenta ativa
  const canvasCursor = React.useMemo(() => {
    if (isDraggableStage || isMiddlePanningState) {
      return (isMouseDownState || isMiddlePanningState) ? 'grabbing' : 'grab';
    }
    return getCustomCanvasCursor(
      currentTool, 
      currentTool === 'laser' ? '#ff1744' : selectedColor, 
      penMode
    );
  }, [isDraggableStage, isMiddlePanningState, isMouseDownState, currentTool, selectedColor, currentUser.color, penMode]);

  // Sincroniza o cursor customizado diretamente no container nativo do Konva Stage
  React.useEffect(() => {
    if (stageRef.current) {
      const container = stageRef.current.container();
      if (container) {
        container.style.cursor = canvasCursor;
      }
    }
  }, [canvasCursor]);

  // Menu de contexto com botão direito no canvas ou sobre elementos
  const handleStageContextMenu = (e: Konva.KonvaEventObject<PointerEvent>) => {
    e.evt.preventDefault();
    if (isMiddlePanning.current) return;

    const clientX = e.evt.clientX;
    const clientY = e.evt.clientY;

    const stage = stageRef.current;
    if (!stage) return;
    const pointer = stage.getPointerPosition() || { x: clientX - stagePos.x, y: clientY - stagePos.y };
    const worldPos = {
      x: (pointer.x - stagePos.x) / scale,
      y: (pointer.y - stagePos.y) / scale,
    };

    // Detecta se o clique foi em um elemento do canvas
    let clickedElementId: string | null = null;
    if (e.target && e.target !== stage) {
      let curr: Konva.Node | null = e.target;
      while (curr && curr !== stage) {
        const id = curr.id();
        if (id && elements.some((el) => el.id === id)) {
          clickedElementId = id;
          break;
        }
        curr = curr.parent;
      }
    }

    let targetIds: string[] = [];
    if (clickedElementId) {
      // Se clicou em um elemento que já está na seleção, mantém a seleção múltipla
      if (selectedIds.includes(clickedElementId)) {
        targetIds = selectedIds;
      } else {
        // Se clicou em um elemento isolado não selecionado, seleciona exclusivamente ele
        targetIds = [clickedElementId];
        onSelectionChange([clickedElementId]);
      }
    } else {
      // Clicou no fundo do canvas: limpa a seleção para apresentar o menu de criação do board
      if (selectedIds.length > 0) {
        onSelectionChange([]);
      }
    }

    setContextMenuState({
      isOpen: true,
      screenPos: { x: clientX, y: clientY },
      worldPos,
      targetElementIds: targetIds,
    });
  };

  // Criação imediata de Nota Adesiva no ponto clicado
  const handleContextMenuCreateSticky = async (color?: string) => {
    if (readOnly) return;
    const posX = Math.round(contextMenuState.worldPos.x - 90);
    const posY = Math.round(contextMenuState.worldPos.y - 90);
    const stickyColor = color || selectedColor || '#fff9b1';
    const id = await onAddElement({
      type: 'sticky',
      x: posX,
      y: posY,
      width: 180,
      height: 180,
      fill: stickyColor,
      text: '',
      zIndex: elements.length + 1,
      updatedBy: currentUser.uid,
      updatedByName: currentUser.displayName,
    });
    onSelectionChange([id]);
    setInlineEditing({
      elementId: id,
      type: 'sticky',
      worldX: posX,
      worldY: posY,
      width: 180,
      height: 180,
      text: '',
      fill: stickyColor,
    });
    onSelectTool('select');
  };

  // Criação imediata de Forma Geométrica no ponto clicado
  const handleContextMenuCreateShape = async (
    shapeType: 'rect' | 'circle' | 'diamond' | 'triangle' | 'star'
  ) => {
    if (readOnly || canCommentOnly) return;
    const bounds = getDefaultShapeBounds(shapeType, contextMenuState.worldPos);
    const shapeFill = selectedColor && selectedColor !== '#0f172a' ? selectedColor : '#ffffff';
    const id = await onAddElement({
      type: shapeType,
      ...bounds,
      fill: shapeFill,
      stroke: '#334155',
      strokeWidth: 2,
      zIndex: elements.length + 1,
      updatedBy: currentUser.uid,
      updatedByName: currentUser.displayName,
    } as any);
    onSelectionChange([id]);
    onSelectTool('select');
  };

  // Criação imediata de Caixa de Texto no ponto clicado
  const handleContextMenuCreateText = async () => {
    if (readOnly || canCommentOnly) return;
    const posX = Math.round(contextMenuState.worldPos.x);
    const posY = Math.round(contextMenuState.worldPos.y);
    const id = await onAddElement({
      type: 'text',
      x: posX,
      y: posY,
      width: 220,
      text: '',
      fontSize: 20,
      fill: '#0f172a',
      zIndex: elements.length + 1,
      updatedBy: currentUser.uid,
      updatedByName: currentUser.displayName,
    });
    onSelectionChange([id]);
    setInlineEditing({
      elementId: id,
      type: 'text',
      worldX: posX,
      worldY: posY,
      width: 220,
      height: 40,
      text: '',
      fontSize: 20,
      fill: '#0f172a',
    });
    onSelectTool('select');
  };

  // Criação imediata de Seta / Conector no ponto clicado
  const handleContextMenuCreateArrow = async () => {
    if (readOnly || canCommentOnly) return;
    const posX = Math.round(contextMenuState.worldPos.x - 80);
    const posY = Math.round(contextMenuState.worldPos.y);
    const id = await onAddElement({
      type: 'arrow',
      x: posX,
      y: posY,
      points: [0, 0, 160, 0],
      stroke: '#2563eb',
      strokeWidth: 2,
      zIndex: elements.length + 1,
      updatedBy: currentUser.uid,
      updatedByName: currentUser.displayName,
    });
    onSelectionChange([id]);
    onSelectTool('select');
  };

  // Criação imediata de Moldura / Frame no ponto clicado
  const handleContextMenuCreateFrame = async () => {
    if (readOnly || canCommentOnly) return;
    const posX = Math.round(contextMenuState.worldPos.x - 160);
    const posY = Math.round(contextMenuState.worldPos.y - 140);
    const id = await onAddElement({
      type: 'frame',
      x: posX,
      y: posY,
      width: 320,
      height: 480,
      text: 'Área de Sprint',
      fill: 'rgba(241, 245, 249, 0.45)',
      stroke: '#94a3b8',
      strokeWidth: 2,
      zIndex: 1,
      updatedBy: currentUser.uid,
      updatedByName: currentUser.displayName,
    });
    onSelectionChange([id]);
    onSelectTool('select');
  };

  // Colar conteúdo da área de transferência exatamente na coordenada do clique
  const handleContextMenuPaste = async () => {
    if (readOnly || canCommentOnly) return;
    await handlePaste(undefined, contextMenuState.worldPos);
  };

  // Organizar ordem de camadas (Z-Index)
  const handleReorderLayer = (action: 'bringToFront' | 'sendToBack' | 'bringForward' | 'sendBackward') => {
    if (readOnly || canCommentOnly || selectedElements.length === 0) return;
    const selectedIdsSet = new Set(selectedElements.map((e) => e.id));

    if (action === 'bringToFront') {
      const maxZ = Math.max(...elements.map((e) => e.zIndex || 0), 0);
      const updates = selectedElements.map((el, i) => ({
        id: el.id,
        updates: { zIndex: maxZ + i + 1 },
      }));
      if (onBatchUpdateElements) {
        onBatchUpdateElements(updates);
      } else {
        updates.forEach((u) => onUpdateElement(u.id, u.updates));
      }
    } else if (action === 'sendToBack') {
      const minZ = Math.min(...elements.map((e) => e.zIndex || 0), 1);
      const updates = selectedElements.map((el, i) => ({
        id: el.id,
        updates: { zIndex: Math.max(1, minZ - selectedElements.length + i) },
      }));
      if (onBatchUpdateElements) {
        onBatchUpdateElements(updates);
      } else {
        updates.forEach((u) => onUpdateElement(u.id, u.updates));
      }
    } else if (action === 'bringForward') {
      const sorted = [...elements].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
      const updates: { id: string; updates: { zIndex: number } }[] = [];
      for (const sel of selectedElements) {
        const idx = sorted.findIndex((e) => e.id === sel.id);
        if (idx !== -1 && idx < sorted.length - 1) {
          const nextElem = sorted[idx + 1];
          if (!selectedIdsSet.has(nextElem.id)) {
            updates.push({ id: sel.id, updates: { zIndex: (nextElem.zIndex || 0) + 1 } });
          }
        }
      }
      if (updates.length > 0) {
        if (onBatchUpdateElements) {
          onBatchUpdateElements(updates);
        } else {
          updates.forEach((u) => onUpdateElement(u.id, u.updates));
        }
      }
    } else if (action === 'sendBackward') {
      const sorted = [...elements].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
      const updates: { id: string; updates: { zIndex: number } }[] = [];
      for (const sel of selectedElements) {
        const idx = sorted.findIndex((e) => e.id === sel.id);
        if (idx > 0) {
          const prevElem = sorted[idx - 1];
          if (!selectedIdsSet.has(prevElem.id)) {
            updates.push({ id: sel.id, updates: { zIndex: Math.max(1, (prevElem.zIndex || 0) - 1) } });
          }
        }
      }
      if (updates.length > 0) {
        if (onBatchUpdateElements) {
          onBatchUpdateElements(updates);
        } else {
          updates.forEach((u) => onUpdateElement(u.id, u.updates));
        }
      }
    }
  };

  // Bloquear ou Desbloquear elementos selecionados
  const handleToggleLockSelected = () => {
    if (readOnly || canCommentOnly || selectedElements.length === 0) return;
    const shouldLock = selectedElements.some((el) => !el.locked);
    if (onBatchUpdateElements) {
      onBatchUpdateElements(
        selectedElements.map((el) => ({ id: el.id, updates: { locked: shouldLock } }))
      );
    } else {
      selectedElements.forEach((el) => onUpdateElement(el.id, { locked: shouldLock }));
    }
  };

  // Deletar elementos selecionados
  const handleDeleteSelected = () => {
    if (readOnly || selectedElements.length === 0) return;
    const idsToDelete = canCommentOnly
      ? selectedElements.filter((el) => el.updatedBy === currentUser.uid).map((el) => el.id)
      : selectedElements.map((el) => el.id);

    if (idsToDelete.length > 0) {
      if (onBatchDeleteElements) {
        onBatchDeleteElements(idsToDelete);
      } else {
        idsToDelete.forEach((id) => onDeleteElement(id));
      }
      onSelectionChange([]);
    }
  };

  // Duplicar elementos selecionados a partir do menu
  const handleDuplicateSelected = () => {
    if (readOnly || canCommentOnly || selectedElements.length === 0) return;
    handleBatchDuplicate(selectedElements);
  };

  // Alinhar múltiplos elementos selecionados
  const handleAlignSelected = (type: AlignmentType) => {
    if (selectedElements.length > 1 && !readOnly && !canCommentOnly) {
      const updates = alignElements(selectedElements, type);
      if (updates.length > 0) {
        if (onBatchUpdateElements) {
          onBatchUpdateElements(updates);
        } else {
          updates.forEach((u) => onUpdateElement(u.id, u.updates));
        }
      }
    }
  };

  // Iniciar edição inline para textos e post-its a partir do menu
  const handleStartEditingElement = (elemId: string) => {
    const elem = elements.find((e) => e.id === elemId);
    if (!elem) return;
    if (elem.type === 'sticky') {
      setInlineEditing({
        elementId: elem.id,
        type: 'sticky',
        worldX: elem.x,
        worldY: elem.y,
        width: elem.width || 180,
        height: elem.height || 180,
        text: stripMarkdownLinks(elem.text || ''),
        fill: elem.fill || '#fff9b1',
        textColor: elem.textColor,
      });
    } else if (elem.type === 'text') {
      setInlineEditing({
        elementId: elem.id,
        type: 'text',
        worldX: elem.x,
        worldY: elem.y,
        width: elem.width || 200,
        height: elem.height || 40,
        text: stripMarkdownLinks(elem.text || ''),
        fontSize: elem.fontSize || 20,
        fill: elem.fill || '#0f172a',
        textColor: elem.textColor,
      });
    } else if (elem.type === 'frame') {
      setInlineEditing({
        elementId: elem.id,
        type: 'frame',
        worldX: elem.x,
        worldY: elem.y,
        width: elem.width || 320,
        height: 32,
        text: stripMarkdownLinks(elem.text || ''),
        fill: '#334155',
        textColor: '#ffffff',
      });
    }
  };

  return (
    <div
      onContextMenu={(e) => {
        e.preventDefault();
      }}
      onAuxClick={(e) => {
        if (e.button === 1) e.preventDefault();
      }}
      onMouseDownCapture={(e) => {
        if (e.button === 1) e.preventDefault();
      }}
      className="relative w-full h-full select-none overflow-hidden bg-background"
      style={{ cursor: canvasCursor }}
      onMouseLeave={() => {
        if (eraserCursorRef.current) {
          eraserCursorRef.current.style.display = 'none';
        }
        if (localLaserPosRef) {
          localLaserPosRef.current = null;
        }
        setIsMouseDownState(false);
      }}
    >
      {/* Indicador de Alcance Circular da Borracha no Modo Parcial (controlado via DOM direto para 0ms de latência e 0 re-renders de React) */}
      <div
        ref={eraserCursorRef}
        className="fixed pointer-events-none rounded-full border-2 border-dashed border-rose-500/85 bg-rose-500/10 -translate-x-1/2 -translate-y-1/2 z-40 shadow-xs ring-1 ring-white/30 backdrop-blur-[0.5px] will-change-transform"
        style={{
          display: 'none',
          top: 0,
          left: 0,
          width: `${Math.max(12, (eraserSize || 22) * 2 * scale)}px`,
          height: `${Math.max(12, (eraserSize || 22) * 2 * scale)}px`,
        }}
      />

      {/* Grade de fundo infinita acelerada por GPU */}
      <CanvasGrid
        stagePos={stagePos}
        scale={scale}
        gridType={gridType}
        gridSize={gridSize}
        gridOpacity={gridOpacity}
        showGrid={showGrid}
      />

      {/* Barra de Propriedades Flutuante (Oculta em Modo Leitura e Restrita a Itens Próprios em Modo Comentário) */}
      {!readOnly && (!canCommentOnly || (selectedElements.length > 0 && selectedElements.every((e) => e.updatedBy === currentUser.uid))) && (
        <SelectionContextBar
        selectedElements={selectedElements}
        onUpdateElement={onUpdateElement}
        onUpdateElements={(ids, updates) => {
          if (onBatchUpdateElements) {
            onBatchUpdateElements(ids.map((id) => ({ id, updates })));
          } else {
            ids.forEach((id) => onUpdateElement(id, updates));
          }
        }}
        onBatchUpdateElements={onBatchUpdateElements}
        onDeleteElement={(id) => {
          onDeleteElement(id);
          onSelectionChange(selectedIds.filter((item) => item !== id));
        }}
        onDeleteElements={(ids) => {
          if (onBatchDeleteElements) {
            onBatchDeleteElements(ids);
          } else {
            ids.forEach((id) => onDeleteElement(id));
          }
          onSelectionChange([]);
        }}
        onDuplicateElement={handleDuplicateElement}
        onDuplicateElements={handleBatchDuplicate}
        onCopyElements={handleCopy}
        onCutElements={handleCut}
        onStartEditing={(elem) => {
          setInlineEditing({
            elementId: elem.id,
            type: elem.type,
            worldX: elem.x,
            worldY: elem.y,
            width: elem.width || 180,
            height: elem.height || 180,
            text: stripMarkdownLinks(elem.text || ''),
            fill: elem.fill,
            fontSize: elem.fontSize,
            textAlign: elem.textAlign || (['rect', 'circle', 'diamond', 'triangle', 'star'].includes(elem.type) ? 'center' : 'left'),
            textColor: elem.fill,
          });
        }}
        scale={scale}
        stagePos={stagePos}
        onToggleVote={onToggleVote}
        onAddVote={onAddVote}
        onRemoveVote={onRemoveVote}
        isSessionActive={votingData?.session?.status === 'active'}
        isElementEligible={
          selectedElements.length === 1 && selectedElements[0]
            ? votingService.isElementEligible(votingData?.session || null, selectedElements[0])
            : false
        }
        userElementVotes={
          selectedElements.length === 1 && selectedElements[0] && votingData?.session
            ? votingService.getElementUserVotes(votingData.session, currentUser.uid, selectedElements[0].id)
            : 0
        }
        userRemainingVotes={
          votingData?.session
            ? votingService.getUserRemainingVotes(votingData.session, currentUser.uid)
            : 0
        }
        hasUserVoted={Boolean(
          selectedElements.length === 1 &&
          selectedElements[0] &&
          ((votingData?.session?.status === 'active' &&
            votingService.getElementUserVotes(votingData.session, currentUser.uid, selectedElements[0].id) > 0) ||
           votingData?.votesByUser?.[currentUser.uid]?.elementId === selectedElements[0].id)
        )}
        voteCount={
          selectedElements.length === 1 && selectedElements[0]
            ? (votingData?.session
                ? votingService.getTotalElementVotes(votingData.session, selectedElements[0].id)
                : Object.values(votingData?.votesByUser || {}).filter(
                    (v) => v.elementId === selectedElements[0].id
                  ).length)
            : 0
        }
      />
      )}

      {/* Menu de Contexto do Botão Direito no Board (Design Moderno & Emil Kowalski) */}
      <BoardContextMenu
        isOpen={contextMenuState.isOpen}
        position={contextMenuState.screenPos}
        targetElements={elements.filter((el) => contextMenuState.targetElementIds.includes(el.id))}
        onClose={() => setContextMenuState((prev) => ({ ...prev, isOpen: false }))}
        onCreateSticky={handleContextMenuCreateSticky}
        onCreateShape={handleContextMenuCreateShape}
        onCreateText={handleContextMenuCreateText}
        onCreateArrow={handleContextMenuCreateArrow}
        onCreateFrame={handleContextMenuCreateFrame}
        onPaste={handleContextMenuPaste}
        onSelectAll={() => onSelectionChange(elements.map((el) => el.id))}
        onCopy={handleCopy}
        onCut={handleCut}
        onDuplicate={handleDuplicateSelected}
        onDelete={handleDeleteSelected}
        onToggleLock={handleToggleLockSelected}
        onReorderLayer={handleReorderLayer}
        onAlign={handleAlignSelected}
        onStartEditing={handleStartEditingElement}
        onOpenTemplates={onOpenTemplates}
        onOpenStickers={onOpenStickers}
        onResetZoom={onResetZoom || (() => onStageChange({ x: 0, y: 0 }, 1))}
        onToggleGrid={onToggleGrid}
        showGrid={showGrid}
        readOnly={readOnly}
        canCommentOnly={canCommentOnly}
      />

      {/* Balão de Hiperlink Flutuante Estilo Miro (exibido quando um elemento com link está selecionado) */}
      {selectedElements.length === 1 && !inlineEditing && (
        <ElementLinkBalloon
          element={selectedElements[0]}
          scale={scale}
          stagePos={stagePos}
          canEdit={!readOnly}
          onEditLink={(oldUrl) => {
            const currentItem = selectedElements[0]?.links?.find((l) => l.url === oldUrl);
            setLinkModalState({
              open: true,
              elementId: selectedElements[0].id,
              oldUrl,
              initialUrl: oldUrl,
              initialLabel: currentItem?.label,
              isNew: false,
            });
          }}
          onRemoveLink={(url) => {
            const { linkUrl, links } = removeLinkFromElement(
              selectedElements[0].linkUrl,
              selectedElements[0].links,
              url
            );
            onUpdateElement(selectedElements[0].id, {
              linkUrl,
              links,
            });
          }}
        />
      )}

      {/* Barra Flutuante de Reações Apple Emoji para o Post-it Selecionado (z-index 50: NUNCA fica por baixo de post-its vizinhos) */}
      {selectedSticky && onToggleReaction && (
        <div
          className="absolute z-50 flex items-center gap-1 bg-white/95 dark:bg-card/95 text-foreground backdrop-blur-md px-2 py-1 rounded-full shadow-lg border border-border/80 animate-in fade-in-0 zoom-in-95 duration-150 pointer-events-auto select-none"
          style={{
            left: `${selectedStickyScreenX + selectedStickyWidth / 2}px`,
            top: `${selectedStickyScreenY + selectedStickyHeight + 10}px`,
            transform: 'translateX(-50%)',
          }}
        >
          {QUICK_EMOJIS.map((emoji) => {
            const appleUrl = getAppleEmojiUrl(emoji);
            return (
              <button
                key={emoji}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleReaction(selectedSticky.id, emoji);
                  playReactionPopSound();
                }}
                className="size-7 rounded-full hover:bg-muted/80 transition-[transform,background-color] duration-150 ease-out hover:scale-120 active:scale-[0.93] flex items-center justify-center cursor-pointer"
                title={`Reagir com ${emoji}`}
              >
                <img
                  src={appleUrl}
                  alt={emoji}
                  className="size-5 select-none pointer-events-none drop-shadow-xs"
                  loading="eager"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </button>
            );
          })}
        </div>
      )}

      {/* GIFs Animados a 60fps Nativo em Overlay HTML 100% Sincronizado no Pan e Zoom */}
      <div
        ref={gifOverlayRef}
        className="absolute inset-0 pointer-events-none overflow-visible"
        style={{
          transform: `translate(${stagePos.x}px, ${stagePos.y}px) scale(${scale})`,
          transformOrigin: '0 0',
        }}
      >
        {elements
          .filter((e) => e.type === 'gif' && Boolean(e.src))
          .map((elem) => (
            <img
              key={elem.id}
              id={`gif-overlay-${elem.id}`}
              src={cleanGifUrl(elem.src)}
              alt={elem.alt || 'GIF animado'}
              loading="eager"
              referrerPolicy="no-referrer"
              className="absolute pointer-events-none select-none rounded-lg shadow-sm object-contain"
              style={{
                left: `${elem.x}px`,
                top: `${elem.y}px`,
                width: `${elem.width || 220}px`,
                height: `${elem.height || 160}px`,
                transform: elem.rotation ? `rotate(${elem.rotation}deg)` : undefined,
                transformOrigin: 'top left',
                zIndex: 10,
                willChange: 'left, top',
              }}
            />
          ))}
      </div>

      {/* Badges Interativas de Votação (Estilo Miro) */}
      {(() => {
        const session = votingData?.session;

        // 1. Sessão Ativa: participantes distribuem votos de forma privada com botões (+ / -)
        if (session && session.status === 'active') {
          const userRemaining = votingService.getUserRemainingVotes(session, currentUser.uid);

          return (
            <div
              className="absolute inset-0 pointer-events-none overflow-visible"
              style={{
                transform: `translate(${stagePos.x}px, ${stagePos.y}px) scale(${scale})`,
                transformOrigin: '0 0',
                zIndex: 45,
              }}
            >
              {elements.map((elem) => {
                if (!votingService.isElementEligible(session, elem)) return null;
                const userVotes = votingService.getElementUserVotes(session, currentUser.uid, elem.id);
                const elemWidth = elem.width || 120;

                return (
                  <div
                    key={`active-vote-${elem.id}`}
                    className="absolute pointer-events-auto flex items-center select-none"
                    style={{
                      left: `${elem.x + elemWidth - 10}px`,
                      top: `${elem.y - 12}px`,
                      transform: 'translateX(-50%)',
                    }}
                  >
                    {userVotes > 0 ? (
                      <div className="flex items-center gap-1 bg-amber-500 text-white rounded-full p-0.5 px-1.5 shadow-lg ring-2 ring-amber-400/40 animate-in zoom-in-95 duration-150">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveVote?.(elem.id);
                          }}
                          className="size-5 rounded-full flex items-center justify-center bg-amber-700/60 hover:bg-amber-800 text-white text-xs font-black transition active:scale-90 cursor-pointer"
                          title="Remover 1 voto deste item"
                        >
                          -
                        </button>
                        <span className="font-mono text-xs font-black px-1">
                          {userVotes} {userVotes === 1 ? 'voto' : 'votos'}
                        </span>
                        <button
                          type="button"
                          disabled={userRemaining <= 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (userRemaining > 0) onAddVote?.(elem.id);
                          }}
                          className={`size-5 rounded-full flex items-center justify-center text-xs font-black transition active:scale-90 cursor-pointer ${
                            userRemaining > 0
                              ? 'bg-amber-700/60 hover:bg-amber-800 text-white'
                              : 'bg-amber-600/40 opacity-50 cursor-not-allowed text-white/70'
                          }`}
                          title={userRemaining > 0 ? `Adicionar mais 1 voto (${userRemaining} restantes)` : 'Votos esgotados'}
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={userRemaining <= 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (userRemaining > 0) onAddVote?.(elem.id);
                        }}
                        className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full shadow-lg border backdrop-blur-md transition-all duration-150 active:scale-95 cursor-pointer ${
                          userRemaining > 0
                            ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 ring-2 ring-amber-400/50 hover:scale-105'
                            : 'opacity-40 cursor-not-allowed bg-muted text-muted-foreground border-border'
                        }`}
                        title={userRemaining > 0 ? `Clique para votar neste item (${userRemaining} votos disponíveis)` : 'Você usou todos os seus votos'}
                      >
                        <span>🗳️</span>
                        <span>Votar</span>
                        <span className="text-xs font-black">+</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          );
        }

        // 2. Sessão Concluída: revela os votos vencedores diretamente nos elementos
        if (session && session.status === 'ended') {
          return (
            <div
              className="absolute inset-0 pointer-events-none overflow-visible"
              style={{
                transform: `translate(${stagePos.x}px, ${stagePos.y}px) scale(${scale})`,
                transformOrigin: '0 0',
                zIndex: 45,
              }}
            >
              {elements.map((elem) => {
                const totalVotes = votingService.getTotalElementVotes(session, elem.id);
                if (totalVotes === 0) return null;
                const elemWidth = elem.width || 120;

                return (
                  <div
                    key={`ended-vote-${elem.id}`}
                    className="absolute pointer-events-auto flex items-center shadow-md rounded-full select-none"
                    style={{
                      left: `${elem.x + elemWidth - 10}px`,
                      top: `${elem.y - 12}px`,
                      transform: 'translateX(-50%)',
                    }}
                  >
                    <div className="flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white border border-amber-600 shadow-md ring-2 ring-amber-400/20">
                      <span>👑</span>
                      <span className="font-mono">{totalVotes}</span>
                      <span className="text-[10px] font-normal">{totalVotes === 1 ? 'voto' : 'votos'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        }

        // 3. Fallback legado se ainda houver votesByUser antigos
        if (votingData?.votesByUser && Object.keys(votingData.votesByUser).length > 0) {
          return (
            <div
              className="absolute inset-0 pointer-events-none overflow-visible"
              style={{
                transform: `translate(${stagePos.x}px, ${stagePos.y}px) scale(${scale})`,
                transformOrigin: '0 0',
                zIndex: 45,
              }}
            >
              {elements.map((elem) => {
                const voters = Object.values(votingData.votesByUser || {}).filter((v) => v.elementId === elem.id);
                if (voters.length === 0) return null;
                const userVoted = votingData.votesByUser?.[currentUser.uid]?.elementId === elem.id;
                const count = voters.length;
                const elemWidth = elem.width || 120;

                return (
                  <div
                    key={`vote-${elem.id}`}
                    className="absolute pointer-events-auto flex items-center shadow-md rounded-full select-none transition-transform hover:scale-110 active:scale-95"
                    style={{
                      left: `${elem.x + elemWidth - 14}px`,
                      top: `${elem.y - 12}px`,
                      transform: 'translateX(-50%)',
                    }}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleVote?.(elem.id);
                      }}
                      className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border transition cursor-pointer shadow-xs ${
                        userVoted
                          ? 'bg-emerald-600 text-white border-emerald-700 ring-2 ring-emerald-500/30'
                          : 'bg-white/95 dark:bg-card/95 text-foreground border-border/90 hover:bg-muted'
                      }`}
                      title={userVoted ? 'Você votou neste item!' : 'Clique para votar'}
                    >
                      <span>🗳️</span>
                      <span className="font-mono">{count}</span>
                      <span className="text-[10px] font-black">{userVoted ? '✓' : '+'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          );
        }

        return null;
      })()}

      <Stage
        ref={stageRef}
        width={window.innerWidth}
        height={window.innerHeight}
        x={stagePos.x}
        y={stagePos.y}
        scaleX={scale}
        scaleY={scale}
        draggable={isDraggableStage}
        onDragStart={(e) => {
          if (isMiddlePanning.current) {
            e.cancelBubble = true;
            return;
          }
          if (e.target === stageRef.current) return;
          const targetId = e.target.id();
          if (targetId && selectedIds.includes(targetId)) {
            dragStartPositions.current.clear();
            selectedIds.forEach((id) => {
              const node = stageRef.current?.findOne('#' + id);
              if (node) {
                dragStartPositions.current.set(id, { x: node.x(), y: node.y() });
              }
            });
          }
        }}
        onDragMove={(e) => {
          if (e.target === stageRef.current) {
            const sx = e.target.x();
            const sy = e.target.y();
            if (gifOverlayRef.current) {
              gifOverlayRef.current.style.transform = `translate(${sx}px, ${sy}px) scale(${scale})`;
            }
            if (rafPanId.current === null) {
              rafPanId.current = requestAnimationFrame(() => {
                rafPanId.current = null;
                onStageChange({ x: sx, y: sy }, scale);
              });
            }
            return;
          }
          const targetId = e.target.id();
          if (targetId) {
            const targetGif = document.getElementById(`gif-overlay-${targetId}`);
            if (targetGif) {
              targetGif.style.left = `${e.target.x()}px`;
              targetGif.style.top = `${e.target.y()}px`;
            }
          }
          if (targetId && selectedIds.length > 1 && selectedIds.includes(targetId)) {
            const initialSelf = dragStartPositions.current.get(targetId);
            if (initialSelf) {
              const dx = e.target.x() - initialSelf.x;
              const dy = e.target.y() - initialSelf.y;
              selectedIds.forEach((id) => {
                if (id !== targetId) {
                  const elem = elements.find((e) => e.id === id);
                  if (elem && elem.locked) return;
                  const init = dragStartPositions.current.get(id);
                  const node = stageRef.current?.findOne('#' + id);
                  if (init && node) {
                    const newX = init.x + dx;
                    const newY = init.y + dy;
                    node.position({
                      x: newX,
                      y: newY,
                    });
                    const itemGif = document.getElementById(`gif-overlay-${id}`);
                    if (itemGif) {
                      itemGif.style.left = `${newX}px`;
                      itemGif.style.top = `${newY}px`;
                    }
                  }
                }
              });
              transformerRef.current?.getLayer()?.batchDraw();
            }
          }
        }}
        onDragEnd={(e) => {
          if (e.target === stageRef.current) {
            if (rafPanId.current !== null) {
              cancelAnimationFrame(rafPanId.current);
              rafPanId.current = null;
            }
            onStageChange({ x: e.target.x(), y: e.target.y() }, scale);
          }
        }}
        onWheel={handleWheel}
        onContextMenu={handleStageContextMenu}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleMouseDown as unknown as (e: Konva.KonvaEventObject<TouchEvent>) => void}
        onTouchMove={handleMouseMove as unknown as (e: Konva.KonvaEventObject<TouchEvent>) => void}
        onTouchEnd={handleMouseUp as unknown as (e: Konva.KonvaEventObject<TouchEvent>) => void}
        onMouseEnter={() => {
          isMouseOverCanvasRef.current = true;
        }}
        onMouseLeave={() => {
          isMouseOverCanvasRef.current = false;
        }}
      >
        <Layer>
          {/* Renderização de todos os elementos no canvas Konva */}
          {sortedElements.map((elem) => {
            const isSelected = selectedIds.includes(elem.id);
            const remoteSelector = remoteSelectionMap[elem.id];
            const isOwnElement = elem.updatedBy === currentUser.uid;
            const canDragItem = currentTool === 'select' && !readOnly && (canCommentOnly ? (isOwnElement && elem.type === 'sticky') : !elem.locked);
            const canEditItem = !readOnly && (canCommentOnly ? (isOwnElement && elem.type === 'sticky') : true);

            if (elem.type === 'frame') {
              return (
                <FrameItem
                  key={elem.id}
                  element={elem}
                  isSelected={isSelected}
                  userSelectionColor={userSelectionColor}
                  remoteSelector={remoteSelector}
                  draggable={canDragItem}
                  canEdit={canEditItem}
                  onSelect={(e) => handleItemSelect(elem.id, e)}
                  onChange={(updates) => handleElementChange(elem.id, updates)}
                  onStartEditing={(id, x, y, width, _height, text) => {
                    if (!canEditItem) return;
                    setInlineEditing({
                      elementId: id,
                      type: 'frame',
                      worldX: x,
                      worldY: y,
                      width,
                      height: 32,
                      text: stripMarkdownLinks(text || ''),
                      fill: '#334155',
                      textColor: '#ffffff',
                    });
                  }}
                />
              );
            }

            if (elem.type === 'sticker' || elem.type === 'gif') {
              return (
                <StickerItem
                  key={elem.id}
                  element={elem}
                  isSelected={isSelected}
                  userSelectionColor={userSelectionColor}
                  remoteSelector={remoteSelector}
                  draggable={canDragItem}
                  onSelect={(e) => handleItemSelect(elem.id, e)}
                  onChange={(updates) => handleElementChange(elem.id, updates)}
                />
              );
            }

            if (elem.type === 'sticky') {
              return (
                <StickyNoteItem
                  key={elem.id}
                  element={elem}
                  currentUserId={currentUser.uid}
                  isSelected={isSelected}
                  userSelectionColor={userSelectionColor}
                  remoteSelector={remoteSelector}
                  draggable={canDragItem}
                  canEdit={canEditItem}
                  onSelect={(e) => handleItemSelect(elem.id, e)}
                  onChange={(updates) => handleElementChange(elem.id, updates)}
                  onToggleReaction={handleToggleReactionInternal}
                  onStartEditing={(id, x, y, width, height, text, fill) => {
                    if (!canEditItem) return;
                    setInlineEditing({
                      elementId: id,
                      type: 'sticky',
                      worldX: x,
                      worldY: y,
                      width,
                      height,
                      text: stripMarkdownLinks(text || ''),
                      fill,
                      fontSize: elem.fontSize || 14,
                      textAlign: elem.textAlign || 'left',
                      textColor: elem.textColor || getContrastTextColor(fill, '#0f172a', '#ffffff'),
                    });
                  }}
                />
              );
            }

            if (
              elem.type === 'rect' ||
              elem.type === 'circle' ||
              elem.type === 'diamond' ||
              elem.type === 'triangle' ||
              elem.type === 'star'
            ) {
              return (
                <ShapeItem
                  key={elem.id}
                  element={elem}
                  isSelected={isSelected}
                  userSelectionColor={userSelectionColor}
                  remoteSelector={remoteSelector}
                  draggable={canDragItem}
                  canEdit={canEditItem}
                  onSelect={(e) => handleItemSelect(elem.id, e)}
                  onChange={(updates) => handleElementChange(elem.id, updates)}
                  onStartEditing={(id, x, y, width, height, text) => {
                    if (!canEditItem) return;
                    setInlineEditing({
                      elementId: id,
                      type: elem.type,
                      worldX: x,
                      worldY: y,
                      width,
                      height,
                      text: stripMarkdownLinks(text || ''),
                      fill: elem.fill || 'transparent',
                      fontSize: elem.fontSize || 14,
                      textAlign: elem.textAlign || 'center',
                      textColor: elem.textColor || getContrastTextColor(elem.fill || '#ffffff', '#0f172a', '#ffffff'),
                    });
                  }}
                />
              );
            }

            if (elem.type === 'arrow' || elem.type === 'line') {
              return (
                <ArrowItem
                  key={elem.id}
                  element={elem}
                  isSelected={isSelected}
                  userSelectionColor={userSelectionColor}
                  remoteSelector={remoteSelector}
                  draggable={canDragItem}
                  onSelect={(e) => handleItemSelect(elem.id, e)}
                  onChange={(updates) => handleElementChange(elem.id, updates)}
                />
              );
            }

            if (elem.type === 'pen') {
              return (
                <FreeDrawItem
                  key={elem.id}
                  element={elem}
                  isSelected={isSelected}
                  userSelectionColor={userSelectionColor}
                  remoteSelector={remoteSelector}
                  draggable={canDragItem}
                  onSelect={(e) => handleItemSelect(elem.id, e)}
                  onChange={(updates) => handleElementChange(elem.id, updates)}
                />
              );
            }

            if (elem.type === 'text') {
              return (
                <TextItem
                  key={elem.id}
                  element={elem}
                  isSelected={isSelected}
                  userSelectionColor={userSelectionColor}
                  isEditing={inlineEditing?.elementId === elem.id}
                  remoteSelector={remoteSelector}
                  draggable={canDragItem}
                  canEdit={canEditItem}
                  onSelect={(e) => handleItemSelect(elem.id, e)}
                  onChange={(updates) => handleElementChange(elem.id, updates)}
                  onStartEditing={(id, x, y, width, height, text, fill, fontSize, textColor) => {
                    if (!canEditItem) return;
                    setInlineEditing({
                      elementId: id,
                      type: 'text',
                      worldX: x,
                      worldY: y,
                      width,
                      height,
                      text: stripMarkdownLinks(text || ''),
                      fill: fill || 'transparent',
                      fontSize: fontSize || 20,
                      textAlign: elem.textAlign || 'left',
                      textColor: textColor || '#0f172a',
                    });
                  }}
                />
              );
            }

            return null;
          })}
        </Layer>

        {/* Camada Dinâmica 2: Elemento sendo desenhado no momento e Marquee (isolada para não repintar o canvas de elementos estáticos a cada pixel) */}
        <Layer id="drawing-preview-layer" listening={false}>
          {drawingElement && drawingElement.type === 'pen' && (
            <FreeDrawItem
              element={drawingElement}
              isSelected={false}
              onSelect={() => {}}
              onChange={() => {}}
            />
          )}

          {drawingElement && drawingElement.type === 'arrow' && (
            <ArrowItem
              element={drawingElement}
              isSelected={false}
              onSelect={() => {}}
              onChange={() => {}}
            />
          )}

          {drawingElement &&
            ['rect', 'circle', 'diamond', 'triangle', 'star'].includes(drawingElement.type) &&
            ((drawingElement.width && drawingElement.width > 4) || (drawingElement.radius && drawingElement.radius > 4)) && (
              <Group listening={false}>
                {drawingElement.type === 'circle' && (
                  <Circle
                    x={drawingElement.x}
                    y={drawingElement.y}
                    radius={drawingElement.radius || (drawingElement.width || 0) / 2}
                    fill={drawingElement.fill || (selectedColor && selectedColor !== '#0f172a' ? selectedColor : '#ffffff')}
                    stroke={drawingElement.stroke || '#334155'}
                    strokeWidth={drawingElement.strokeWidth || 2}
                    perfectDrawEnabled={false}
                    listening={false}
                  />
                )}
                {drawingElement.type === 'rect' && (
                  <Rect
                    x={drawingElement.x}
                    y={drawingElement.y}
                    width={drawingElement.width || 0}
                    height={drawingElement.height || 0}
                    fill={drawingElement.fill || (selectedColor && selectedColor !== '#0f172a' ? selectedColor : '#ffffff')}
                    stroke={drawingElement.stroke || '#334155'}
                    strokeWidth={drawingElement.strokeWidth || 2}
                    cornerRadius={6}
                    perfectDrawEnabled={false}
                    listening={false}
                  />
                )}
                {drawingElement.type === 'diamond' && (
                  <Line
                    x={drawingElement.x}
                    y={drawingElement.y}
                    points={[
                      (drawingElement.width || 0) / 2,
                      0,
                      drawingElement.width || 0,
                      (drawingElement.height || 0) / 2,
                      (drawingElement.width || 0) / 2,
                      drawingElement.height || 0,
                      0,
                      (drawingElement.height || 0) / 2,
                    ]}
                    closed
                    fill={drawingElement.fill || (selectedColor && selectedColor !== '#0f172a' ? selectedColor : '#ffffff')}
                    stroke={drawingElement.stroke || '#334155'}
                    strokeWidth={drawingElement.strokeWidth || 2}
                    perfectDrawEnabled={false}
                    listening={false}
                  />
                )}
                {drawingElement.type === 'triangle' && (
                  <Line
                    x={drawingElement.x}
                    y={drawingElement.y}
                    points={[
                      (drawingElement.width || 0) / 2,
                      0,
                      drawingElement.width || 0,
                      drawingElement.height || 0,
                      0,
                      drawingElement.height || 0,
                    ]}
                    closed
                    fill={drawingElement.fill || (selectedColor && selectedColor !== '#0f172a' ? selectedColor : '#ffffff')}
                    stroke={drawingElement.stroke || '#334155'}
                    strokeWidth={drawingElement.strokeWidth || 2}
                    perfectDrawEnabled={false}
                    listening={false}
                  />
                )}
                {drawingElement.type === 'star' && (
                  <Star
                    x={(drawingElement.x || 0) + (drawingElement.width || 0) / 2}
                    y={(drawingElement.y || 0) + (drawingElement.height || 0) / 2}
                    numPoints={5}
                    innerRadius={(Math.min(drawingElement.width || 0, drawingElement.height || 0) / 2) * 0.45}
                    outerRadius={Math.min(drawingElement.width || 0, drawingElement.height || 0) / 2}
                    fill={drawingElement.fill || (selectedColor && selectedColor !== '#0f172a' ? selectedColor : '#ffffff')}
                    stroke={drawingElement.stroke || '#334155'}
                    strokeWidth={drawingElement.strokeWidth || 2}
                    perfectDrawEnabled={false}
                    listening={false}
                  />
                )}
                {/* Badge flutuante com dimensões em tempo real (estilo Figma / Miro) */}
                {Boolean(
                  drawingElement.width &&
                    drawingElement.height &&
                    (drawingElement.width > 20 || drawingElement.height > 20)
                ) && (
                  <Group
                    x={
                      drawingElement.type === 'circle'
                        ? drawingElement.x - 42 / scale
                        : drawingElement.x + (drawingElement.width || 0) / 2 - 42 / scale
                    }
                    y={
                      drawingElement.type === 'circle'
                        ? drawingElement.y + (drawingElement.radius || 0) + 10 / scale
                        : drawingElement.y + (drawingElement.height || 0) + 10 / scale
                    }
                  >
                    <Rect
                      width={84 / scale}
                      height={20 / scale}
                      fill="rgba(15, 23, 42, 0.85)"
                      cornerRadius={4 / scale}
                      shadowColor="rgba(0, 0, 0, 0.2)"
                      shadowBlur={4 / scale}
                    />
                    <Text
                      text={`${Math.round(drawingElement.width || 0)} × ${Math.round(drawingElement.height || 0)}`}
                      width={84 / scale}
                      height={20 / scale}
                      align="center"
                      verticalAlign="middle"
                      fill="#ffffff"
                      fontSize={11 / scale}
                      fontFamily="system-ui, -apple-system, sans-serif"
                    />
                  </Group>
                )}
              </Group>
            )}

          {/* Caixa de Seleção Marquee Rubber-band estilo Windows / Miro */}
          {marqueeBox && (
            <Rect
              x={Math.min(marqueeBox.startX, marqueeBox.currentX)}
              y={Math.min(marqueeBox.startY, marqueeBox.currentY)}
              width={Math.abs(marqueeBox.currentX - marqueeBox.startX)}
              height={Math.abs(marqueeBox.currentY - marqueeBox.startY)}
              fill={`${userSelectionColor}18`}
              stroke={userSelectionColor}
              strokeWidth={1.5 / scale}
              dash={[4 / scale, 4 / scale]}
              cornerRadius={2}
              listening={false}
            />
          )}
        </Layer>

        {/* Camada 3: Konva Transformer para redimensionamento e rotação unificado */}
        <Layer id="transformer-layer">
          <Transformer
            ref={transformerRef}
            keepRatio={selectedElements.some((e) => e.type === 'sticker' || e.type === 'gif')}
            boundBoxFunc={(oldBox, newBox) => {
              if (Math.abs(newBox.width) < 20 || Math.abs(newBox.height) < 20) {
                return oldBox;
              }
              return newBox;
            }}
            rotateEnabled={true}
            borderStroke={userSelectionColor}
            borderStrokeWidth={1.5}
            anchorStroke={userSelectionColor}
            anchorFill="#ffffff"
            anchorSize={8}
            anchorCornerRadius={2}
          />
        </Layer>
      </Stage>

      {/* Editor Inline Flutuante em HTML com posicionamento e estilização contextual precisos */}
      {inlineEditing && (
        <textarea
          autoFocus
          value={inlineEditing.text}
          placeholder={inlineEditing.type === 'text' ? 'Digite algo...' : ''}
          onChange={(e) => setInlineEditing({ ...inlineEditing, text: e.target.value })}
          onSelect={(e) => {
            const ta = e.currentTarget;
            if (ta.selectionStart !== ta.selectionEnd) {
              const selText = ta.value.substring(ta.selectionStart, ta.selectionEnd);
              if (typeof window !== 'undefined') {
                (window as any).__mirio_active_text_selection = {
                  elementId: inlineEditing.elementId,
                  start: ta.selectionStart,
                  end: ta.selectionEnd,
                  text: selText,
                };
              }
            }
          }}
          onMouseUp={(e) => {
            const ta = e.currentTarget;
            if (ta.selectionStart !== ta.selectionEnd) {
              const selText = ta.value.substring(ta.selectionStart, ta.selectionEnd);
              if (typeof window !== 'undefined') {
                (window as any).__mirio_active_text_selection = {
                  elementId: inlineEditing.elementId,
                  start: ta.selectionStart,
                  end: ta.selectionEnd,
                  text: selText,
                };
              }
            }
          }}
          onKeyUp={(e) => {
            const ta = e.currentTarget;
            if (ta.selectionStart !== ta.selectionEnd) {
              const selText = ta.value.substring(ta.selectionStart, ta.selectionEnd);
              if (typeof window !== 'undefined') {
                (window as any).__mirio_active_text_selection = {
                  elementId: inlineEditing.elementId,
                  start: ta.selectionStart,
                  end: ta.selectionEnd,
                  text: selText,
                };
              }
            }
          }}
          onBlur={handleFinishEditing}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              handleFinishEditing();
            }
            if (
              e.key === 'Enter' &&
              (inlineEditing.type === 'text' || inlineEditing.type === 'frame') &&
              !e.shiftKey
            ) {
              e.preventDefault();
              handleFinishEditing();
            }
            if ((e.ctrlKey || e.metaKey) && (e.key === 'l' || e.key === 'L' || e.key === 'k' || e.key === 'K')) {
              e.preventDefault();
              e.stopPropagation();
              const textarea = e.currentTarget;
              const start = textarea.selectionStart;
              const end = textarea.selectionEnd;
              const selectedText = textarea.value.substring(start, end) || '';
              setLinkModalState({
                open: true,
                elementId: inlineEditing.elementId,
                initialUrl: 'https://',
                initialLabel: selectedText,
                isNew: true,
              });
            }
          }}
          className={`absolute z-50 font-sans resize-none ${
            inlineEditing.type === 'text'
              ? 'p-0 m-0 bg-transparent border-none outline-none shadow-none ring-0 leading-[1.2]'
              : inlineEditing.type === 'frame'
              ? 'px-2.5 py-1 rounded-t-md outline-none text-xs font-bold bg-slate-800 text-white border border-primary shadow-sm leading-normal'
              : 'p-3 rounded-sm outline-none font-sans leading-snug shadow-md border-2 border-primary/60'
          }`}
          style={{
            left: `${inlineEditing.worldX * scale + stagePos.x}px`,
            top: `${inlineEditing.worldY * scale + stagePos.y}px`,
            width:
              inlineEditing.type === 'text'
                ? `${Math.max(
                    120,
                    (inlineEditing.text
                      ? inlineEditing.text.length * (inlineEditing.fontSize || 20) * 0.65
                      : 120) * scale
                  )}px`
                : `${Math.max(140, inlineEditing.width * scale)}px`,
            height:
              inlineEditing.type === 'text'
                ? `${Math.max(26, (inlineEditing.fontSize || 20) * 1.35 * scale)}px`
                : `${Math.max(32, inlineEditing.height * scale)}px`,
            backgroundColor:
              inlineEditing.type === 'text'
                ? 'transparent'
                : inlineEditing.type === 'frame'
                ? '#1e293b'
                : inlineEditing.fill || '#fff9b1',
            color:
              inlineEditing.textColor || (inlineEditing.type === 'frame' ? '#ffffff' : '#0f172a'),
            fontSize: `${Math.max(
              12,
              (inlineEditing.fontSize || (inlineEditing.type === 'frame' ? 13 : 15)) * scale
            )}px`,
            textAlign: inlineEditing.textAlign || (['rect', 'circle', 'diamond', 'triangle', 'star'].includes(inlineEditing.type || '') ? 'center' : 'left'),
            caretColor: '#2563eb',
          }}
        />
      )}

      {/* Modal no padrão do projeto para inserção e edição de hiperlinks */}
      {linkModalState && (
        <EditLinkModal
          open={linkModalState.open}
          onOpenChange={(open) => {
            if (!open) setLinkModalState(null);
          }}
          initialUrl={linkModalState.initialUrl}
          initialLabel={linkModalState.initialLabel}
          isNew={linkModalState.isNew}
          onSave={handleSaveModalLink}
          onRemove={handleRemoveModalLink}
        />
      )}

      {/* Menu de contexto nativo com botão direito */}
      {contextMenuState.isOpen && (
        <BoardContextMenu
          isOpen={contextMenuState.isOpen}
          position={contextMenuState.screenPos}
          targetElements={elements.filter((el) => contextMenuState.targetElementIds.includes(el.id))}
          onClose={() => setContextMenuState((prev) => ({ ...prev, isOpen: false }))}
          onCreateSticky={handleContextMenuCreateSticky}
          onCreateShape={handleContextMenuCreateShape}
          onCreateText={handleContextMenuCreateText}
          onCreateArrow={handleContextMenuCreateArrow}
          onCreateFrame={handleContextMenuCreateFrame}
          onPaste={handleContextMenuPaste}
          onSelectAll={() => onSelectionChange(elements.map((el) => el.id))}
          onCopy={handleCopy}
          onCut={handleCut}
          onDuplicate={() => {
            const targets = elements.filter((el) => contextMenuState.targetElementIds.includes(el.id));
            if (targets.length > 0) handleBatchDuplicate(targets);
          }}
          onDelete={handleDeleteSelected}
          onToggleLock={handleToggleLockSelected}
          onReorderLayer={handleReorderLayer}
          onAlign={handleAlignSelected}
          onStartEditing={handleStartEditingElement}
          onOpenTemplates={onOpenTemplates}
          onOpenStickers={onOpenStickers}
          onResetZoom={onResetZoom}
          onToggleGrid={onToggleGrid}
          showGrid={showGrid}
          readOnly={readOnly}
          canCommentOnly={canCommentOnly}
        />
      )}
    </div>
  );
});

WhiteboardCanvas.displayName = 'WhiteboardCanvas';
