import React, { useRef, useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { Stage, Layer, Transformer, Rect, Circle, Line, Star, Group, Text } from 'react-konva';
import Konva from 'konva';
import type { CanvasElement, ToolType, ElementType } from '../../types/element';
import type { UserPresence, CurrentUser } from '../../types/board';
import { StickyNoteItem } from './StickyNoteItem';
import { ShapeItem } from './ShapeItem';
import { ArrowItem } from './ArrowItem';
import { FreeDrawItem } from './FreeDrawItem';
import { TextItem } from './TextItem';
import { RichTextEditor, type RichTextFinishPayload } from './RichTextEditor';
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
import { playReactionPopSound } from '../../utils/audioChime';
import { votingService, type BoardVotingData } from '../../services/votingService';
import {
  stripMarkdownLinks,
  removeLinkFromElement,
  addLinkToElement,
  normalizeUrl,
  extractAllLinks,
} from '../../utils/textLinks';
import {
  allRunsHaveFormat,
  applyLinkToRuns,
  deriveLinksFromRuns,
  removeRunLink,
  runsToPlainText,
  updateRunLink,
} from '../../utils/richText';
import { textEditingBridge } from '../../utils/textEditingBridge';
import {
  copyCanvasElements,
  getCachedClipboardElements,
  getElementsBoundingBox,
} from '../../utils/clipboard';
import {
  processImageFiles,
  saveRecentUploadedImages,
  computeImageGridLayout,
  validateDroppedFiles,
  formatUnsupportedFileMessage,
} from '../../utils/imageUpload';
import {
  applyWorldTransform,
  blendTouchVelocity,
  computePinchViewport,
  isCoarseOrMobileViewport,
  publishViewport,
  stepInertialPan,
  type TouchVelocity,
} from '../../utils/viewport';
import {
  boundsIntersect,
  canElementRotate,
  getElementWorldBounds,
  isBoundsInViewport,
  normalizeRotationDeg,
} from '../../utils/elementBounds';
import { StickyReactionBar } from './StickyReactionBar';
import { StickyQuickAdd } from './StickyQuickAdd';
import { getAdjacentStickyRect, type StickyDirection } from '../../utils/stickyPlacement';

if (typeof window !== 'undefined' && isCoarseOrMobileViewport()) {
  Konva.pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
}

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
  mirioReactionUnlocked?: boolean;
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

const LEGACY_GIPHY_FALLBACKS: Record<string, string> = {
  GkVM3PcFipxEk: 'https://static.klipy.com/ii/4e7bea9f7a3371424e6c16ebc93252fe/46/6a/IGemk23TDHctPwlki1.gif',
  g01ZnwAUvutuK8GIQn: 'https://static.klipy.com/ii/d7aec6f6f171607374b2065c836f92f4/67/fc/eYsqvnbO.gif',
  vyTnNTrs3IZdfAUQVW: 'https://static.klipy.com/ii/d7aec6f6f171607374b2065c836f92f4/8c/39/FmFDzsho.gif',
  d3mlE7uhX8KFgEmY: 'https://static.klipy.com/ii/925f17378dd1893b674a723c07535afe/4d/6f/jVcYzyp9.gif',
  '9M5jK4GXmD5o1irGrF': 'https://static.klipy.com/ii/c3a19a0b747a76e98651f2b9a3cca5ff/49/f8/zl1Y5fjP.gif',
  MDJ9IbxxvDUQM: 'https://static.klipy.com/ii/c3a19a0b747a76e98651f2b9a3cca5ff/9c/63/z1XLwIWS.gif',
  t3dLl0TGHCxTG: 'https://static.klipy.com/ii/35ccce3d852f7995dd2da910f2abd795/ec/59/uGVtiiAZ.gif',
  nXxOjZrbnbRxS: 'https://static.klipy.com/ii/d6b0ce929193df3c242ac34b5654d2ce/35/88/KiVLVpaQ.gif',
  '26ufdipQqU2lhNA4g': 'https://static.klipy.com/ii/d6b0ce929193df3c242ac34b5654d2ce/9a/57/CCtgUPsD.gif',
  '3o7TKTDnU76u2EPNDG': 'https://static.klipy.com/ii/35ccce3d852f7995dd2da910f2abd795/32/bf/zFtdVhji.gif',
  nbvFVPiEiJH6Q: 'https://static.klipy.com/ii/f87f46a2c5aeaeed4c68910815f73eaf/08/b7/hK8oyGl2.gif',
  '10JhviFuU2gWD6': 'https://static.klipy.com/ii/d6b0ce929193df3c242ac34b5654d2ce/79/f2/VyNapEfQ.gif',
};

// Normaliza links de GIF (Klipy CDN direto ou migração automática de links antigos do Giphy)
const cleanGifUrl = (src?: string): string => {
  if (!src) return '';
  const match = src.match(/giphy\.com\/media\/(?:v1\.[^/]+\/)?([^/]+)/);
  if (match && match[1]) {
    const giphyId = match[1];
    if (LEGACY_GIPHY_FALLBACKS[giphyId]) {
      return LEGACY_GIPHY_FALLBACKS[giphyId];
    }
    return `https://i.giphy.com/media/${giphyId}/giphy.gif`;
  }
  return src;
};

export const WhiteboardCanvas: React.FC<WhiteboardCanvasProps> = React.memo(({
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
  mirioReactionUnlocked = false,
  onLaserMove,
  onLaserDown,
  onLaserUp,
  localLaserPosRef,
  isLocalLaserDrawingRef,
  localLaserPointsRef,
}) => {
  const stageRef = useRef<Konva.Stage>(null);
  const elementsLayerRef = useRef<Konva.Layer>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const gifOverlayRef = useRef<HTMLDivElement>(null);
  const votingOverlayRef = useRef<HTMLDivElement>(null);
  const worldOverlayRefs = useRef<Array<React.RefObject<HTMLDivElement | null>>>([]);
  const eraserCursorRef = useRef<HTMLDivElement>(null);
  const middlePanCurrentPos = useRef<{ x: number; y: number } | null>(null);
  const stagePosRef = useRef(stagePos);
  const isLiveNavigating = useRef(false);
  const viewportCommitTimer = useRef<number | null>(null);
  const panRafRef = useRef<number | null>(null);
  const inertiaRafRef = useRef<number | null>(null);
  const containerRectRef = useRef<{ left: number; top: number }>({ left: 0, top: 0 });
  const lastTapRef = useRef<{ time: number; x: number; y: number }>({ time: 0, x: 0, y: 0 });
  const elementsRef = useRef(elements);
  const elementsByIdRef = useRef<Map<string, CanvasElement>>(new Map());
  const selectedIdsRef = useRef(selectedIds);
  const currentUserRef = useRef(currentUser);
  const readOnlyRef = useRef(readOnly);
  const canCommentOnlyRef = useRef(canCommentOnly);
  const onStageChangeRef = useRef(onStageChange);
  elementsRef.current = elements;
  selectedIdsRef.current = selectedIds;
  currentUserRef.current = currentUser;
  readOnlyRef.current = readOnly;
  canCommentOnlyRef.current = canCommentOnly;
  onStageChangeRef.current = onStageChange;

  // Controle de atalho dinâmico para Apontador Laser (Tap-to-switch e Hold-to-laser temporário)
  const previousToolBeforeLaser = useRef<ToolType>('select');
  const isLaserKeyHeld = useRef(false);
  const laserKeyDownTime = useRef(0);

  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [inlineEditing, setInlineEditing] = useState<InlineEditingState | null>(null);
  const [isTransforming, setIsTransforming] = useState(false);
  const rotationHudRef = useRef<HTMLDivElement>(null);
  const rotationHudValueRef = useRef<HTMLSpanElement>(null);

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

  // Toast Notificação de Feedback do Canvas (arquivos não suportados, PDF, alertas pontuais)
  const [canvasToast, setCanvasToast] = useState<{
    id: string;
    type: 'info' | 'warning' | 'error';
    title: string;
    message: string;
  } | null>(null);
  const canvasToastTimerRef = useRef<number | null>(null);

  const showCanvasToast = useCallback(
    (
      title: string,
      message: string,
      type: 'info' | 'warning' | 'error' = 'warning',
      durationMs = 6500
    ) => {
      if (canvasToastTimerRef.current !== null) {
        window.clearTimeout(canvasToastTimerRef.current);
      }
      setCanvasToast({
        id: 'toast_' + Date.now(),
        type,
        title,
        message,
      });
      canvasToastTimerRef.current = window.setTimeout(() => {
        setCanvasToast(null);
        canvasToastTimerRef.current = null;
      }, durationMs);
    },
    []
  );

  useEffect(() => {
    return () => {
      if (canvasToastTimerRef.current !== null) {
        window.clearTimeout(canvasToastTimerRef.current);
      }
    };
  }, []);

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

    // Com o editor rico aberto, o link é aplicado exatamente na seleção atual
    // (letra, palavra ou frase) em vez de virar um link do elemento inteiro.
    const activeEditor = textEditingBridge.get(linkModalState.elementId);
    if (activeEditor) {
      const elementId = linkModalState.elementId;
      activeEditor.applyLink(normalizeUrl(url), label);
      setLinkModalState(null);
      // O fechamento do modal devolve o foco ao gatilho; devolvemos ao texto
      // para o usuário continuar digitando sem clicar novamente.
      window.setTimeout(() => textEditingBridge.get(elementId)?.focus(), 0);
      return;
    }

    const elem = elements.find((el) => el.id === linkModalState.elementId);
    if (!elem) return;

    let currentLinks = elem.links;
    let currentLinkUrl = elem.linkUrl;
    if (linkModalState.oldUrl && normalizeUrl(linkModalState.oldUrl) !== normalizeUrl(url)) {
      const removed = removeLinkFromElement(currentLinkUrl, currentLinks, linkModalState.oldUrl);
      currentLinkUrl = removed.linkUrl;
      currentLinks = removed.links;
    }

    const { linkUrl: baseLinkUrl, links: baseLinks } = addLinkToElement(
      currentLinkUrl,
      currentLinks,
      url,
      label
    );

    const sourceRuns = elem.richText;
    const richText =
      Array.isArray(sourceRuns) && sourceRuns.length > 0
        ? linkModalState.oldUrl
          ? updateRunLink(sourceRuns, linkModalState.oldUrl, url, label)
          : applyLinkToRuns(sourceRuns, url, label)
        : undefined;

    const derived = richText ? deriveLinksFromRuns(richText) : null;

    onUpdateElement(elem.id, {
      linkUrl: derived ? derived.linkUrl : baseLinkUrl,
      links: derived ? derived.links : baseLinks,
      text: richText ? runsToPlainText(richText) : stripMarkdownLinks(elem.text || ''),
      ...(richText ? { richText } : {}),
    });

    setLinkModalState(null);
  };

  const handleRemoveModalLink = () => {
    if (!linkModalState) return;

    const activeEditor = textEditingBridge.get(linkModalState.elementId);
    if (activeEditor) {
      const elementId = linkModalState.elementId;
      activeEditor.removeLink();
      setLinkModalState(null);
      window.setTimeout(() => textEditingBridge.get(elementId)?.focus(), 0);
      return;
    }

    const elem = elements.find((el) => el.id === linkModalState.elementId);
    if (!elem) return;

    const { linkUrl, links } = removeLinkFromElement(
      elem.linkUrl,
      elem.links,
      linkModalState.oldUrl || linkModalState.initialUrl
    );

    const targetUrl = linkModalState.oldUrl || linkModalState.initialUrl;
    const richText = elem.richText
      ? removeRunLink(elem.richText, linkModalState.oldUrl ? targetUrl : undefined)
      : undefined;

    onUpdateElement(elem.id, {
      linkUrl,
      links,
      text: stripMarkdownLinks(elem.text || ''),
      ...(richText ? { richText } : {}),
    });

    setLinkModalState(null);
  };

  // Rastreamento de posições iniciais para arraste em lote sincronizado
  const dragStartPositions = useRef<Map<string, { x: number; y: number }>>(new Map());

  // Navegação por gestos touch (celular/tablet): pinça de 2 dedos para zoom,
  // movimento dos 2 dedos para pan, arraste de 1 dedo com inércia suave em modo visualização
  const touchGestureRef = useRef<{
    mode: 'pinch' | 'oneFingerPan';
    startCenter: { x: number; y: number };
    lastPoint: { x: number; y: number };
    lastMoveTime: number;
    startTime: number;
    velocity: TouchVelocity;
    movedDist: number;
    startStagePos: { x: number; y: number };
    startDist: number;
    startScale: number;
    centerWorld: { x: number; y: number };
  } | null>(null);
  // Encaixa eventos fantasma de mouse após uma pinça e dedos restantes no ar pós-gesto
  const touchGestureEndedAtRef = useRef(0);
  const skipTouchUntilLiftRef = useRef(false);

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
  worldOverlayRefs.current = [gifOverlayRef, votingOverlayRef];

  // Frustum Culling de alta velocidade direto na árvore do Konva (0 re-renders do React):
  // oculta grupos fora da tela visível para que stage.batchDraw() pule comandos 2D invisíveis.
  const syncVisibleElements = (pos: { x: number; y: number }, currentScale: number) => {
    const layer = elementsLayerRef.current;
    if (!layer) return;
    const children = layer.getChildren();
    if (children.length === 0) return;

    const viewport = { x: pos.x, y: pos.y, scale: currentScale };
    const viewW = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const viewH = typeof window !== 'undefined' ? window.innerHeight : 720;
    const selectedList = selectedIdsRef.current;
    const byId = elementsByIdRef.current;

    for (let i = 0; i < children.length; i++) {
      const node = children[i];
      const id = node.id();
      if (!id) continue;
      if (selectedList.length > 0 && selectedList.includes(id)) {
        if (!node.visible()) node.visible(true);
        continue;
      }
      const el = byId.get(id);
      if (!el) continue;
      const inView = isBoundsInViewport(getElementWorldBounds(el), viewport, viewW, viewH, 240);
      if (node.visible() !== inView) {
        node.visible(inView);
      }
    }
  };

  const syncWorldOverlays = (pos: { x: number; y: number }, currentScale: number) => {
    const viewport = { x: pos.x, y: pos.y, scale: currentScale };
    publishViewport(viewport);
    worldOverlayRefs.current.forEach((ref) => applyWorldTransform(ref.current, viewport));
  };

  const commitViewportToReact = (pos: { x: number; y: number }, currentScale: number, immediate = false) => {
    const runCommit = () => {
      viewportCommitTimer.current = null;
      isLiveNavigating.current = false;
      onStageChangeRef.current(pos, currentScale);
    };
    if (immediate) {
      if (viewportCommitTimer.current !== null) {
        window.clearTimeout(viewportCommitTimer.current);
        viewportCommitTimer.current = null;
      }
      runCommit();
      return;
    }
    if (viewportCommitTimer.current !== null) {
      window.clearTimeout(viewportCommitTimer.current);
    }
    viewportCommitTimer.current = window.setTimeout(runCommit, 140);
  };

  const flushViewportFrame = (pos: { x: number; y: number }, currentScale: number) => {
    if (stageRef.current) {
      stageRef.current.position(pos);
      stageRef.current.scale({ x: currentScale, y: currentScale });
      syncVisibleElements(pos, currentScale);
      stageRef.current.batchDraw();
    }
    syncWorldOverlays(pos, currentScale);
  };

  const cancelInertia = () => {
    if (inertiaRafRef.current !== null) {
      cancelAnimationFrame(inertiaRafRef.current);
      inertiaRafRef.current = null;
    }
    if (panRafRef.current !== null) {
      cancelAnimationFrame(panRafRef.current);
      panRafRef.current = null;
    }
  };

  // Coalesce múltiplos eventos touchmove por frame de tela em um único batchDraw + DOM transform
  const scheduleStagePan = (newPos: { x: number; y: number }, currentScale: number) => {
    isLiveNavigating.current = true;
    middlePanCurrentPos.current = newPos;
    stagePosRef.current = newPos;
    scaleRef.current = currentScale;

    if (viewportCommitTimer.current !== null) {
      window.clearTimeout(viewportCommitTimer.current);
      viewportCommitTimer.current = null;
    }

    if (panRafRef.current === null) {
      panRafRef.current = requestAnimationFrame(() => {
        panRafRef.current = null;
        flushViewportFrame(stagePosRef.current, scaleRef.current);
      });
    }
  };

  // Função acelerada para movimentar o palco e garantir que os GIFs e overlays acompanhem com 0ms de latência
  const applyStagePan = (
    newPos: { x: number; y: number },
    currentScale: number,
    commit: 'idle' | 'immediate' | 'none' = 'idle'
  ) => {
    isLiveNavigating.current = true;
    middlePanCurrentPos.current = newPos;
    stagePosRef.current = newPos;
    scaleRef.current = currentScale;

    flushViewportFrame(newPos, currentScale);
    if (commit !== 'none') {
      commitViewportToReact(newPos, currentScale, commit === 'immediate');
    }
  };

  // The Stage is uncontrolled during navigation: props are only applied when
  // React state actually changes, so an unrelated re-render can never snap the
  // camera back to a stale committed position.
  useLayoutEffect(() => {
    if (isLiveNavigating.current) return;
    scaleRef.current = scale;
    stagePosRef.current = stagePos;
    flushViewportFrame(stagePos, scale);
  }, [scale, stagePos]);

  useEffect(() => {
    return () => {
      cancelInertia();
      if (viewportCommitTimer.current !== null) {
        window.clearTimeout(viewportCommitTimer.current);
      }
    };
  }, []);

  // Mantém dimensões do Stage e offset do container atualizados sem re-renders extras
  useEffect(() => {
    const updateStageMetrics = () => {
      const stage = stageRef.current;
      if (!stage) return;
      stage.width(window.innerWidth);
      stage.height(window.innerHeight);
      const rect = stage.container()?.getBoundingClientRect();
      if (rect) {
        containerRectRef.current = { left: rect.left, top: rect.top };
      }
      syncVisibleElements(stagePosRef.current, scaleRef.current);
      stage.batchDraw();
    };
    window.addEventListener('resize', updateStageMetrics, { passive: true });
    return () => window.removeEventListener('resize', updateStageMetrics);
  }, []);

  useEffect(() => {
    if (!isMiddlePanning.current) {
      middlePanCurrentPos.current = stagePos;
    }
  }, [stagePos]);

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
        if (middlePanCurrentPos.current) {
          applyStagePan(middlePanCurrentPos.current, scaleRef.current, 'immediate');
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
  }, []);

  // Elementos selecionados atualmente
  const selectedElements = React.useMemo(() => {
    const listToUse = liveErasedElements || elements;
    return listToUse.filter((e) => selectedIds.includes(e.id));
  }, [liveErasedElements, elements, selectedIds]);

  const elementsById = React.useMemo(() => {
    const map = new Map<string, CanvasElement>();
    for (const el of liveErasedElements || elements) {
      map.set(el.id, el);
    }
    return map;
  }, [liveErasedElements, elements]);
  elementsByIdRef.current = elementsById;

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
        if (inlineEditing?.elementId === id && inlineEditing.type === 'text') {
          return;
        }
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
  }, [selectedIds, elements, readOnly, canCommentOnly, currentUser.uid, inlineEditing]);

  // Alternar reação de emoji em post-its
  const handleToggleReactionInternal = useCallback(
    async (elementId: string, emoji: string) => {
      const elem = elementsRef.current.find((e) => e.id === elementId);
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
      if (currentUsers.includes(currentUserRef.current.uid)) {
        updatedUsers = currentUsers.filter((uid) => uid !== currentUserRef.current.uid);
      } else {
        updatedUsers = [...currentUsers, currentUserRef.current.uid];
      }

      if (updatedUsers.length > 0) {
        reactions[emoji] = updatedUsers;
      } else {
        delete reactions[emoji];
      }

      await onUpdateElement(elementId, { reactions });
    },
    [onToggleReaction, onUpdateElement]
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

      // 1. Verificar se o evento contém arquivos (imagens ou tentativas de colar arquivos não suportados como PDF)
      if (e && e.clipboardData) {
        const rawFiles: File[] = [];
        if (e.clipboardData.files?.length) {
          rawFiles.push(...Array.from(e.clipboardData.files));
        }
        if (rawFiles.length === 0 && e.clipboardData.items?.length) {
          for (const item of Array.from(e.clipboardData.items)) {
            if (item.kind === 'file') {
              const f = item.getAsFile();
              if (f) rawFiles.push(f);
            }
          }
        }

        if (rawFiles.length > 0) {
          const validation = validateDroppedFiles(rawFiles);
          if (validation.validFiles.length === 0) {
            if (validation.hasPdf) {
              e.preventDefault();
              const { title, message } = formatUnsupportedFileMessage(validation);
              showCanvasToast(title, message, 'warning', 7000);
              return;
            }
          } else {
            e.preventDefault();
            try {
              const processed = await processImageFiles(validation.validFiles);
              if (processed.length > 0) {
                saveRecentUploadedImages(processed);

                const targetX = customTargetCenter
                  ? customTargetCenter.x
                  : mouseWorldPosRef.current && isMouseOverCanvasRef.current
                    ? mouseWorldPosRef.current.x
                    : Math.round((-stagePosRef.current.x + window.innerWidth / 2) / scaleRef.current);
                const targetY = customTargetCenter
                  ? customTargetCenter.y
                  : mouseWorldPosRef.current && isMouseOverCanvasRef.current
                    ? mouseWorldPosRef.current.y
                    : Math.round((-stagePosRef.current.y + window.innerHeight / 2) / scaleRef.current);

                const positions = computeImageGridLayout(processed, { x: targetX, y: targetY });
                const now = Date.now();
                const imageElements: CanvasElement[] = processed.map((img, idx) => ({
                  id: 'elem_' + Math.random().toString(36).substring(2, 11) + idx,
                  type: img.type,
                  src: img.src,
                  alt: img.alt || 'Imagem colada',
                  x: positions[idx]?.x ?? Math.round(targetX - img.width / 2),
                  y: positions[idx]?.y ?? Math.round(targetY - img.height / 2),
                  width: img.width,
                  height: img.height,
                  zIndex: elements.length + idx + 1,
                  updatedBy: currentUser.uid,
                  updatedByName: currentUser.displayName,
                  updatedAt: now,
                }));

                if (onBatchAddElements) {
                  await onBatchAddElements(imageElements);
                } else {
                  for (const el of imageElements) {
                    await onAddElement(el);
                  }
                }
                onSelectionChange(imageElements.map((el) => el.id));

                if (validation.unsupportedFiles.length > 0) {
                  const skippedNames = validation.unsupportedNames.slice(0, 2).join(', ');
                  showCanvasToast(
                    'Alguns arquivos foram ignorados',
                    validation.hasPdf
                      ? `Imagens coladas com sucesso! Arquivos PDF (${skippedNames}) foram ignorados pois o quadro suporta apenas imagens.`
                      : `Imagens coladas com sucesso! Arquivos não suportados (${skippedNames}) foram ignorados.`,
                    'info',
                    6000
                  );
                }
                return;
              }
            } catch (err) {
              console.warn('[Paste] Erro ao colar imagem:', err);
              showCanvasToast(
                'Erro ao colar imagem',
                'Não foi possível processar a imagem da área de transferência.',
                'error'
              );
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
                : Math.round((-stagePosRef.current.x + window.innerWidth / 2) / scaleRef.current);
            const targetY = customTargetCenter
              ? customTargetCenter.y
              : mouseWorldPosRef.current && isMouseOverCanvasRef.current
                ? mouseWorldPosRef.current.y
                : Math.round((-stagePosRef.current.y + window.innerHeight / 2) / scaleRef.current);

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
      elements.length,
      currentUser.uid,
      currentUser.displayName,
      selectedColor,
      onBatchAddElements,
      onAddElement,
      onSelectionChange,
      showCanvasToast,
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
          if ((e.key === 'i' || e.key === 'I') && onOpenStickers) {
            e.preventDefault();
            onOpenStickers();
          }
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
    const pos = stagePosRef.current;
    const currentScale = scaleRef.current;
    return {
      x: (pointer.x - pos.x) / currentScale,
      y: (pointer.y - pos.y) / currentScale,
    };
  };

  // O scroll contínuo do touchpad navega; a roda discreta do mouse faz zoom no cursor.
  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    cancelInertia();
    const stage = stageRef.current;
    if (!stage) return;

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const isMouseWheel =
      e.evt.deltaMode === 1 ||
      Math.abs(e.evt.deltaY) >= 40 ||
      Math.abs(e.evt.deltaX) >= 40;
    const shouldZoom = e.evt.ctrlKey || e.evt.metaKey || isMouseWheel;

    if (!shouldZoom) {
      const factor = e.evt.deltaMode === 1 ? 16 : 1;
      const currentPos = middlePanCurrentPos.current || stagePosRef.current;
      applyStagePan(
        {
          x: currentPos.x - e.evt.deltaX * factor,
          y: currentPos.y - e.evt.deltaY * factor,
        },
        scaleRef.current
      );
      return;
    }

    const oldScale = scaleRef.current;
    const currentPos = stagePosRef.current;
    const mousePointTo = {
      x: (pointer.x - currentPos.x) / oldScale,
      y: (pointer.y - currentPos.y) / oldScale,
    };

    const scaleBy = 1.08;
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    let newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;
    newScale = Math.max(0.1, Math.min(5, newScale));

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };

    applyStagePan(newPos, newScale);
  };

  // ===== Navegação touch de alta performance (mobile/tablet) =====
  // 2 dedos: pinça para zoom + movimento simultâneo para pan (funciona em qualquer ferramenta).
  // 1 dedo em modo visualização (ou ferramenta Pan): arrasta o quadro com inércia suave,
  // mesmo quando o toque começa sobre post-its, molduras, formas ou textos.
  const updateContainerRect = () => {
    const rect = stageRef.current?.container()?.getBoundingClientRect();
    if (rect) {
      containerRectRef.current = { left: rect.left, top: rect.top };
    }
  };

  const getTouchPointInContainer = (clientX: number, clientY: number) => {
    const rect = containerRectRef.current;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const getTwoTouchMetrics = (touches: TouchList) => {
    const a = getTouchPointInContainer(touches[0].clientX, touches[0].clientY);
    const b = getTouchPointInContainer(touches[1].clientX, touches[1].clientY);
    return {
      center: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      dist: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
    };
  };

  // Um segundo dedo é usado como apoio durante interações de 1 dedo; a pinça vira pan depois do fim do gesto.
  const isSingleFingerInteractionLocked = () =>
    isDrawing.current ||
    isErasing.current ||
    partialEraseActiveRef.current ||
    isLocalLaserDrawingRef?.current === true ||
    transformerRef.current?.isTransforming() === true;

  const handleStageTouchStart = (e: Konva.KonvaEventObject<TouchEvent>) => {
    const touches = e.evt.touches;
    cancelInertia();
    updateContainerRect();
    const now = performance.now();

    if (touches.length >= 2) {
      e.evt.preventDefault();
      // Não interrompe traço/borracha/laser em andamento: o segundo dedo é só apoio da mão
      if (isSingleFingerInteractionLocked()) return;
      if (isMarquee.current) {
        isMarquee.current = false;
        setMarqueeBox(null);
      }
      skipTouchUntilLiftRef.current = true;

      const { center, dist } = getTwoTouchMetrics(touches);
      const startPos = stagePosRef.current;
      const startScale = scaleRef.current;
      touchGestureRef.current = {
        mode: 'pinch',
        startCenter: center,
        lastPoint: center,
        lastMoveTime: now,
        startTime: now,
        velocity: { vx: 0, vy: 0 },
        movedDist: 0,
        startStagePos: startPos,
        startDist: dist,
        startScale,
        centerWorld: {
          x: (center.x - startPos.x) / startScale,
          y: (center.y - startPos.y) / startScale,
        },
      };
      return;
    }

    // Modo visualização (celular) ou ferramenta Pan: 1 dedo move a câmera em qualquer ponto da tela
    // (inclusive sobre post-its, frames e formas), sem bloqueio de 350ms entre gestos consecutivos.
    if ((readOnly || currentTool === 'pan') && !isSpacePressed && touches.length === 1) {
      e.evt.preventDefault();
      skipTouchUntilLiftRef.current = false;
      const point = getTouchPointInContainer(touches[0].clientX, touches[0].clientY);
      touchGestureRef.current = {
        mode: 'oneFingerPan',
        startCenter: point,
        lastPoint: point,
        lastMoveTime: now,
        startTime: now,
        velocity: { vx: 0, vy: 0 },
        movedDist: 0,
        startStagePos: stagePosRef.current,
        startDist: 0,
        startScale: scaleRef.current,
        centerWorld: { x: 0, y: 0 },
      };
      return;
    }

    // Dedo restante após pinça no modo edição (ou eventos fantasma logo após o fim do gesto): ignora
    if (skipTouchUntilLiftRef.current || Date.now() < touchGestureEndedAtRef.current + 350) {
      e.evt.preventDefault();
      return;
    }

    (handleMouseDown as unknown as (ev: Konva.KonvaEventObject<TouchEvent>) => void)(e);
  };

  const handleStageTouchMove = (e: Konva.KonvaEventObject<TouchEvent>) => {
    const gesture = touchGestureRef.current;
    const touches = e.evt.touches;

    if (gesture?.mode === 'pinch') {
      if (touches.length < 2) return;
      e.evt.preventDefault();
      const { center, dist } = getTwoTouchMetrics(touches);
      const next = computePinchViewport(
        gesture.centerWorld,
        gesture.startDist,
        gesture.startScale,
        center,
        dist,
        0.1,
        5
      );
      gesture.lastPoint = center;
      gesture.lastMoveTime = performance.now();
      gesture.movedDist += Math.hypot(
        center.x - gesture.startCenter.x,
        center.y - gesture.startCenter.y
      );
      // Mantém fixo o ponto do mundo onde a pinça começou; o movimento do centro vira pan
      scheduleStagePan({ x: next.x, y: next.y }, next.scale);
      return;
    }

    if (gesture?.mode === 'oneFingerPan') {
      e.evt.preventDefault();
      if (touches.length !== 1) return;
      const point = getTouchPointInContainer(touches[0].clientX, touches[0].clientY);
      const now = performance.now();
      const dt = now - gesture.lastMoveTime;
      const stepDx = point.x - gesture.lastPoint.x;
      const stepDy = point.y - gesture.lastPoint.y;

      gesture.velocity = blendTouchVelocity(gesture.velocity, stepDx, stepDy, dt);
      gesture.lastPoint = point;
      gesture.lastMoveTime = now;
      gesture.movedDist += Math.hypot(stepDx, stepDy);

      scheduleStagePan(
        {
          x: gesture.startStagePos.x + (point.x - gesture.startCenter.x),
          y: gesture.startStagePos.y + (point.y - gesture.startCenter.y),
        },
        gesture.startScale
      );
      return;
    }

    if (skipTouchUntilLiftRef.current) {
      e.evt.preventDefault();
      return;
    }

    (handleMouseMove as unknown as (ev: Konva.KonvaEventObject<TouchEvent>) => void)(e);
  };

  const handleStageTouchEnd = (e: Konva.KonvaEventObject<TouchEvent>) => {
    const remaining = e.evt.touches.length;
    const gesture = touchGestureRef.current;

    if (gesture && !isSingleFingerInteractionLocked()) {
      e.evt.preventDefault();
      const now = performance.now();

      // Transição suave Pinça (2 dedos) -> Pan (1 dedo) no mobile sem travar
      if (gesture.mode === 'pinch' && remaining === 1 && (readOnly || currentTool === 'pan')) {
        if (panRafRef.current !== null) {
          cancelAnimationFrame(panRafRef.current);
          panRafRef.current = null;
          flushViewportFrame(stagePosRef.current, scaleRef.current);
        }
        const point = getTouchPointInContainer(e.evt.touches[0].clientX, e.evt.touches[0].clientY);
        touchGestureRef.current = {
          mode: 'oneFingerPan',
          startCenter: point,
          lastPoint: point,
          lastMoveTime: now,
          startTime: now,
          velocity: { vx: 0, vy: 0 },
          movedDist: gesture.movedDist,
          startStagePos: stagePosRef.current,
          startDist: 0,
          startScale: scaleRef.current,
          centerWorld: { x: 0, y: 0 },
        };
        skipTouchUntilLiftRef.current = false;
        return;
      }

      if (panRafRef.current !== null) {
        cancelAnimationFrame(panRafRef.current);
        panRafRef.current = null;
        flushViewportFrame(stagePosRef.current, scaleRef.current);
      }

      touchGestureRef.current = null;
      touchGestureEndedAtRef.current = Date.now();

      if (remaining > 0) {
        commitViewportToReact(stagePosRef.current, scaleRef.current, true);
        skipTouchUntilLiftRef.current = true;
        return;
      }

      skipTouchUntilLiftRef.current = false;

      if (gesture.mode === 'oneFingerPan') {
        const isQuickTap = gesture.movedDist < 10 && now - gesture.startTime < 300;
        if (isQuickTap && readOnly) {
          const tapScreen = gesture.lastPoint;
          const worldX = (tapScreen.x - stagePosRef.current.x) / scaleRef.current;
          const worldY = (tapScreen.y - stagePosRef.current.y) / scaleRef.current;

          // 1. Toque rápido sobre elemento com link abre o link mesmo em modo visualização
          const hitCandidates = sortedElements.filter((el) =>
            checkElementHit(el, worldX, worldY, 8 / Math.max(0.25, scaleRef.current))
          );
          const topHit = hitCandidates[hitCandidates.length - 1];
          if (topHit) {
            const links = extractAllLinks(topHit.text, topHit.linkUrl, topHit.links);
            if (links.length > 0 && links[0].url) {
              window.open(links[0].url, '_blank', 'noopener,noreferrer');
              commitViewportToReact(stagePosRef.current, scaleRef.current, true);
              return;
            }
          }

          // 2. Duplo-toque rápido dá zoom inteligente no ponto tocado (ou volta para 100%)
          const lastTap = lastTapRef.current;
          const wallNow = Date.now();
          if (
            lastTap.time > 0 &&
            wallNow - lastTap.time < 320 &&
            Math.hypot(tapScreen.x - lastTap.x, tapScreen.y - lastTap.y) < 36
          ) {
            lastTapRef.current = { time: 0, x: 0, y: 0 };
            const currentScale = scaleRef.current;
            const targetScale = currentScale < 1.35 ? Math.min(2.5, currentScale * 1.85) : 1;
            const nextPos = {
              x: tapScreen.x - worldX * targetScale,
              y: tapScreen.y - worldY * targetScale,
            };
            applyStagePan(nextPos, targetScale, 'immediate');
            return;
          }
          lastTapRef.current = { time: wallNow, x: tapScreen.x, y: tapScreen.y };
        }

        // 3. Inércia suave pós-arraste (momentum scrolling a 60/120fps)
        const timeSinceLastMove = now - gesture.lastMoveTime;
        const speed = Math.hypot(gesture.velocity.vx, gesture.velocity.vy);
        if (timeSinceLastMove < 65 && speed >= 0.12) {
          let currentVel = gesture.velocity;
          let lastFrameTime = performance.now();

          const stepMomentum = (frameNow: number) => {
            const dt = frameNow - lastFrameTime;
            lastFrameTime = frameNow;
            const step = stepInertialPan(stagePosRef.current, currentVel, dt);
            const nextPos = { x: step.x, y: step.y };
            stagePosRef.current = nextPos;
            middlePanCurrentPos.current = nextPos;
            currentVel = { vx: step.vx, vy: step.vy };
            flushViewportFrame(nextPos, scaleRef.current);

            if (step.active) {
              inertiaRafRef.current = requestAnimationFrame(stepMomentum);
            } else {
              inertiaRafRef.current = null;
              commitViewportToReact(stagePosRef.current, scaleRef.current, true);
            }
          };

          inertiaRafRef.current = requestAnimationFrame(stepMomentum);
          return;
        }
      }

      commitViewportToReact(stagePosRef.current, scaleRef.current, true);
      return;
    }

    if (remaining === 0) {
      skipTouchUntilLiftRef.current = false;
    }

    if (readOnly) {
      e.evt.preventDefault();
      return;
    }

    (handleMouseUp as unknown as (ev: Konva.KonvaEventObject<TouchEvent>) => void)(e);
  };

  // Seleção e alternância de seleção com Ctrl / Cmd
  const handleItemSelect = useCallback((
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
  }, [
    currentTool,
    isEraserActive,
    eraserMode,
    liveErasedElements,
    elements,
    selectedIds,
    onDeleteElement,
    onSelectionChange,
  ]);

  // Atualização de elemento com suporte automático a delta em lote
  const handleElementChange = useCallback((elemId: string, updates: Partial<CanvasElement>) => {
    // Se o elemento é parte de uma multisseleção e houve movimento x/y
    if (
      updates.x !== undefined &&
      updates.y !== undefined &&
      selectedIds.includes(elemId) &&
      selectedIds.length > 1
    ) {
      const originElem = elementsById.get(elemId) || elements.find((e) => e.id === elemId);
      if (originElem) {
        const dx = updates.x - originElem.x;
        const dy = updates.y - originElem.y;

        const batchUpdates = selectedIds
          .map((id) => {
            const item = elementsById.get(id) || elements.find((e) => e.id === id);
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
  }, [selectedIds, elements, elementsById, onBatchUpdateElements, onUpdateElement]);

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
    // Ignora eventos sintéticos de mouse gerados pelo toque durante/ logo após gestos touch (pinça/pan)
    if (touchGestureRef.current || Date.now() < touchGestureEndedAtRef.current + 450) {
      return;
    }

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
        stageX: stagePosRef.current.x,
        stageY: stagePosRef.current.y,
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

    // Previne seleção nativa de texto e arrastes fantasmas do browser ao interagir no canvas
    if (e.evt.preventDefault) {
      e.evt.preventDefault();
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
    if (touchGestureRef.current || Date.now() < touchGestureEndedAtRef.current + 450) {
      return;
    }

    // Navegação suave com botão do meio do mouse (Scroll Wheel Drag)
    if (isMiddlePanning.current && middlePanStart.current) {
      const dx = e.evt.clientX - middlePanStart.current.clientX;
      const dy = e.evt.clientY - middlePanStart.current.clientY;
      const newPos = {
        x: Math.round(middlePanStart.current.stageX + dx),
        y: Math.round(middlePanStart.current.stageY + dy),
      };
      applyStagePan(newPos, scaleRef.current);
      return;
    }

    if (readOnly) {
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

    if (!isDrawing.current) return;

    const isShift = Boolean(e.evt?.shiftKey);

    if (rafId.current) cancelAnimationFrame(rafId.current);

    rafId.current = requestAnimationFrame(() => {
      // Formas geométricas: só cria o drawingElement para pré-visualização quando o usuário de fato arrasta
      if (['rect', 'circle', 'diamond', 'triangle', 'star'].includes(currentTool)) {
        const start = shapeDragStartRef.current || worldPos;
        const dist = Math.hypot(worldPos.x - start.x, worldPos.y - start.y);
        if (dist >= 4 || drawingElement) {
          const bounds = calculateShapeDragBounds(currentTool, start, worldPos, isShift);
          const shapeFill = selectedColor && selectedColor !== '#0f172a' ? selectedColor : '#ffffff';
          setDrawingElement({
            id: 'temp_shape_preview',
            type: currentTool as ElementType,
            ...bounds,
            fill: shapeFill,
            stroke: '#334155',
            strokeWidth: 2,
            zIndex: elements.length + 1,
            updatedBy: currentUser.uid,
            updatedByName: currentUser.displayName,
            updatedAt: 0,
          });
        }
        return;
      }

      if (!drawingElement) return;

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
        applyStagePan(middlePanCurrentPos.current, scaleRef.current, 'immediate');
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
        const marqueeBounds = { x: x1, y: y1, w: width, h: height };
        const hits = elements
          .filter((el) => boundsIntersect(getElementWorldBounds(el), marqueeBounds))
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
    if (isDrawing.current && (drawingElement || shapeDragStartRef.current)) {
      isDrawing.current = false;
      const finishedDrawing = drawingElement;
      const dragStart = shapeDragStartRef.current;
      setDrawingElement(null);
      shapeDragStartRef.current = null;

      if (
        finishedDrawing &&
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
      } else if (finishedDrawing && finishedDrawing.type === 'arrow' && finishedDrawing.points) {
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
      } else if (
        ['rect', 'circle', 'diamond', 'triangle', 'star'].includes(currentTool) ||
        Boolean(finishedDrawing && ['rect', 'circle', 'diamond', 'triangle', 'star'].includes(finishedDrawing.type))
      ) {
        const shapeType = (finishedDrawing?.type || currentTool) as ElementType;
        const start = dragStart;
        const worldPos = getPointerWorldPos();
        const dist = start ? Math.hypot(worldPos.x - start.x, worldPos.y - start.y) : 0;
        const hasCustomSize = dist >= 15 && Boolean(finishedDrawing && finishedDrawing.width && finishedDrawing.height);
        const shapeFill =
          finishedDrawing?.fill || (selectedColor && selectedColor !== '#0f172a' ? selectedColor : '#ffffff');
        const shapeStroke = finishedDrawing?.stroke || '#334155';
        const shapeStrokeWidth = finishedDrawing?.strokeWidth || 2;

        const bounds =
          hasCustomSize && finishedDrawing
            ? {
                x: Math.round(finishedDrawing.x),
                y: Math.round(finishedDrawing.y),
                width: Math.max(12, Math.round(finishedDrawing.width || 0)),
                height: Math.max(12, Math.round(finishedDrawing.height || 0)),
                ...(shapeType === 'circle'
                  ? { radius: Math.max(6, Math.round(finishedDrawing.radius || (finishedDrawing.width || 0) / 2)) }
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
    if (inlineEditing.type === 'text') {
      const editor = textEditingBridge.get(inlineEditing.elementId);
      if (editor) {
        editor.finish();
      } else {
        setInlineEditing(null);
      }
      return;
    }
    // Post-its, molduras e formas geométricas NUNCA são deletados ao sair da edição
    onUpdateElement(inlineEditing.elementId, {
      text: stripMarkdownLinks(inlineEditing.text),
    });
    setInlineEditing(null);
  };

  // Finaliza a edição do texto rico com os runs formatados por trecho.
  const handleFinishRichTextEditing = useCallback(
    (payload: RichTextFinishPayload) => {
      if (!inlineEditing) return;
      const elem = elementsRef.current.find((e) => e.id === inlineEditing.elementId);
      if (!elem) {
        setInlineEditing(null);
        return;
      }

      if (!payload.text.trim() && !elem.text && !(elem.richText && elem.richText.length > 0)) {
        // Caixa criada do zero e nunca preenchida: descarta como antes.
        onDeleteElement(elem.id);
        onSelectionChange(selectedIds.filter((id) => id !== elem.id));
      } else {
        const { linkUrl, links } = deriveLinksFromRuns(payload.runs);
        const allBold = allRunsHaveFormat(payload.runs, 'bold');
        const allItalic = allRunsHaveFormat(payload.runs, 'italic');
        const allUnderline = allRunsHaveFormat(payload.runs, 'underline');
        const allStrike = allRunsHaveFormat(payload.runs, 'strikethrough');
        const textDecoration =
          allUnderline && allStrike
            ? 'underline line-through'
            : allUnderline
              ? 'underline'
              : allStrike
                ? 'line-through'
                : 'none';
        onUpdateElement(elem.id, {
          text: payload.text,
          richText: payload.runs,
          width: Math.max(40, Math.round(payload.width)),
          height: Math.max(1, Math.round(payload.height)),
          x: Math.round(payload.x),
          ...(payload.y !== undefined ? { y: Math.round(payload.y) } : {}),
          fontWeight: allBold ? 'bold' : 'normal',
          fontStyle: allItalic ? 'italic' : 'normal',
          textDecoration,
          linkUrl,
          links,
        });
      }

      setInlineEditing(null);
    },
    [inlineEditing, onDeleteElement, onSelectionChange, onUpdateElement, selectedIds]
  );

  const isDraggableStage = currentTool === 'pan' || isSpacePressed;

  // Opens the inline editor using the current element/permissions instead of
  // capturing them in a per-render closure. This lets item callbacks stay
  // stable, so unchanged elements are skipped by React.memo.
  const openInlineEditor = useCallback((
    id: string,
    x: number,
    y: number,
    width: number,
    height: number,
    text: string,
    fill?: string,
    fontSize?: number,
    textColor?: string
  ) => {
    const elem = elementsRef.current.find((e) => e.id === id);
    if (!elem) return;

    const user = currentUserRef.current;
    const canEdit =
      !readOnlyRef.current &&
      (canCommentOnlyRef.current ? elem.updatedBy === user.uid && elem.type === 'sticky' : true);
    if (!canEdit) return;

    const cleanText = stripMarkdownLinks(text || '');

    if (elem.type === 'frame') {
      setInlineEditing({
        elementId: id,
        type: 'frame',
        worldX: x,
        worldY: y,
        width,
        height: 32,
        text: cleanText,
        fill: '#334155',
        textColor: '#ffffff',
      });
      return;
    }

    if (elem.type === 'sticky') {
      const stickyFill = fill || elem.fill || '#fff9b1';
      setInlineEditing({
        elementId: id,
        type: 'sticky',
        worldX: x,
        worldY: y,
        width,
        height,
        text: cleanText,
        fill: stickyFill,
        fontSize: elem.fontSize || 14,
        textAlign: elem.textAlign || 'left',
        textColor: elem.textColor || getContrastTextColor(stickyFill, '#0f172a', '#ffffff'),
      });
      return;
    }

    if (['rect', 'circle', 'diamond', 'triangle', 'star'].includes(elem.type)) {
      const shapeFill = elem.fill || '#ffffff';
      setInlineEditing({
        elementId: id,
        type: elem.type,
        worldX: x,
        worldY: y,
        width,
        height,
        text: cleanText,
        fill: elem.fill || 'transparent',
        fontSize: elem.fontSize || 14,
        textAlign: elem.textAlign || 'center',
        textColor: elem.textColor || getContrastTextColor(shapeFill, '#0f172a', '#ffffff'),
      });
      return;
    }

    if (elem.type === 'text') {
      setInlineEditing({
        elementId: id,
        type: 'text',
        worldX: x,
        worldY: y,
        width,
        height,
        text: cleanText,
        fill: fill || 'transparent',
        fontSize: fontSize || 20,
        textAlign: elem.textAlign || 'left',
        textColor: textColor || '#0f172a',
      });
    }
  }, []);

  const handleItemSelectRef = useRef(handleItemSelect);
  const handleElementChangeRef = useRef(handleElementChange);
  handleItemSelectRef.current = handleItemSelect;
  handleElementChangeRef.current = handleElementChange;

  interface ItemHandlers {
    onSelect: (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
    onChange: (updates: Partial<CanvasElement>) => void;
    onStartEditing: (
      id: string,
      x: number,
      y: number,
      width: number,
      height: number,
      text: string,
      fill?: string,
      fontSize?: number,
      textColor?: string
    ) => void;
  }

  const itemHandlersRef = useRef<Map<string, ItemHandlers>>(new Map());
  const getItemHandlers = useCallback((id: string): ItemHandlers => {
    let handlers = itemHandlersRef.current.get(id);
    if (!handlers) {
      handlers = {
        onSelect: (e) => handleItemSelectRef.current(id, e),
        onChange: (updates) => handleElementChangeRef.current(id, updates),
        onStartEditing: (elementId, x, y, width, height, text, fill, fontSize, textColor) =>
          openInlineEditor(elementId, x, y, width, height, text, fill, fontSize, textColor),
      };
      itemHandlersRef.current.set(id, handlers);
    }
    return handlers;
  }, [openInlineEditor]);

  // A ordem visual é controlada pelo zIndex persistido, inclusive para molduras.
  const sortedElements = React.useMemo(() => {
    const listToRender = liveErasedElements || elements;
    return [...listToRender].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
  }, [liveErasedElements, elements]);

  // Keep the element subtree stable while only the camera moves. This lets Konva
  // update the stage transform without recreating every React-Konva child.
  const renderedElements = React.useMemo(
    () =>
      sortedElements.map((elem) => {
        const isSelected = selectedIds.includes(elem.id);
        const remoteSelector = remoteSelectionMap[elem.id];
        const isOwnElement = elem.updatedBy === currentUser.uid;
        const canDragItem =
          currentTool === 'select' &&
          !readOnly &&
          (canCommentOnly ? isOwnElement && elem.type === 'sticky' : !elem.locked);
        const canEditItem = !readOnly && (canCommentOnly ? isOwnElement && elem.type === 'sticky' : true);
        const handlers = getItemHandlers(elem.id);

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
              onSelect={handlers.onSelect}
              onChange={handlers.onChange}
              onStartEditing={handlers.onStartEditing}
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
              onSelect={handlers.onSelect}
              onChange={handlers.onChange}
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
              onSelect={handlers.onSelect}
              onChange={handlers.onChange}
              onToggleReaction={handleToggleReactionInternal}
              onStartEditing={handlers.onStartEditing}
            />
          );
        }

        if (['rect', 'circle', 'diamond', 'triangle', 'star'].includes(elem.type)) {
          return (
            <ShapeItem
              key={elem.id}
              element={elem}
              isSelected={isSelected}
              userSelectionColor={userSelectionColor}
              remoteSelector={remoteSelector}
              draggable={canDragItem}
              canEdit={canEditItem}
              onSelect={handlers.onSelect}
              onChange={handlers.onChange}
              onStartEditing={handlers.onStartEditing}
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
              onSelect={handlers.onSelect}
              onChange={handlers.onChange}
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
              onSelect={handlers.onSelect}
              onChange={handlers.onChange}
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
              onSelect={handlers.onSelect}
              onChange={handlers.onChange}
              onStartEditing={handlers.onStartEditing}
            />
          );
        }

        return null;
      }),
    [
      sortedElements,
      selectedIds,
      remoteSelectionMap,
      currentUser.uid,
      currentTool,
      readOnly,
      canCommentOnly,
      userSelectionColor,
      inlineEditing?.elementId,
      handleToggleReactionInternal,
      getItemHandlers,
    ]
  );

  // Atualiza frustum culling sempre que a lista de elementos do quadro muda
  useLayoutEffect(() => {
    syncVisibleElements(stagePosRef.current, scaleRef.current);
    stageRef.current?.batchDraw();
  }, [renderedElements]);

  // Post-it selecionado único (para barra de reações flutuante em HTML com z-index 50)
  const selectedSticky =
    selectedElements.length === 1 && selectedElements[0].type === 'sticky'
      ? selectedElements[0]
      : null;

  // Elemento elegível para botões "+" de criação rápida nas 4 direções (Post-its e Formas Geométricas)
  const selectedQuickAddElement =
    selectedElements.length === 1 &&
    ['sticky', 'rect', 'circle', 'diamond', 'triangle', 'star'].includes(selectedElements[0].type)
      ? selectedElements[0]
      : null;

  // Criação rápida de post-it ou forma geométrica encostada ao selecionado (estilo FigJam / Miro)
  const handleQuickAddSticky = useCallback(async (direction: StickyDirection) => {
    if (!selectedQuickAddElement || readOnly || selectedQuickAddElement.locked) return;

    if (selectedQuickAddElement.type === 'sticky') {
      const width = selectedQuickAddElement.width || 180;
      const height = selectedQuickAddElement.height || 180;
      const rect = getAdjacentStickyRect(
        { x: selectedQuickAddElement.x, y: selectedQuickAddElement.y, width, height },
        direction
      );
      const fill = selectedQuickAddElement.fill || '#fff9b1';

      const newId = await onAddElement({
        type: 'sticky',
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width,
        height,
        fill,
        text: '',
        fontSize: selectedQuickAddElement.fontSize,
        textAlign: selectedQuickAddElement.textAlign,
        textColor: selectedQuickAddElement.textColor,
        zIndex: elements.length + 1,
        updatedBy: currentUser.uid,
        updatedByName: currentUser.displayName,
      });

      if (!newId) return;

      onSelectionChange([newId]);
      setInlineEditing({
        elementId: newId,
        type: 'sticky',
        worldX: Math.round(rect.x),
        worldY: Math.round(rect.y),
        width,
        height,
        text: '',
        fill,
        fontSize: selectedQuickAddElement.fontSize || 14,
        textAlign: selectedQuickAddElement.textAlign || 'left',
        textColor:
          selectedQuickAddElement.textColor || getContrastTextColor(fill, '#0f172a', '#ffffff'),
      });
      return;
    }

    // Caso de Formas Geométricas (rect, circle, diamond, triangle, star)
    if (canCommentOnly) return;

    const isCircle = selectedQuickAddElement.type === 'circle';
    const radius = isCircle
      ? selectedQuickAddElement.radius ||
        (selectedQuickAddElement.width ? selectedQuickAddElement.width / 2 : 60)
      : undefined;
    const width = isCircle && radius ? radius * 2 : selectedQuickAddElement.width || 160;
    const height = isCircle && radius ? radius * 2 : selectedQuickAddElement.height || 100;
    const originX = isCircle && radius ? selectedQuickAddElement.x - radius : selectedQuickAddElement.x;
    const originY = isCircle && radius ? selectedQuickAddElement.y - radius : selectedQuickAddElement.y;

    const rect = getAdjacentStickyRect({ x: originX, y: originY, width, height }, direction);
    const targetX = isCircle && radius ? Math.round(rect.x + radius) : Math.round(rect.x);
    const targetY = isCircle && radius ? Math.round(rect.y + radius) : Math.round(rect.y);
    const fill = selectedQuickAddElement.fill || '#ffffff';
    const stroke = selectedQuickAddElement.stroke || '#334155';
    const strokeWidth = selectedQuickAddElement.strokeWidth || 2;

    const newShapeId = await onAddElement({
      type: selectedQuickAddElement.type,
      x: targetX,
      y: targetY,
      width,
      height,
      ...(isCircle && radius ? { radius } : {}),
      fill,
      stroke,
      strokeWidth,
      text: '',
      fontSize: selectedQuickAddElement.fontSize,
      fontWeight: selectedQuickAddElement.fontWeight,
      fontStyle: selectedQuickAddElement.fontStyle,
      textDecoration: selectedQuickAddElement.textDecoration,
      textAlign: selectedQuickAddElement.textAlign,
      textColor: selectedQuickAddElement.textColor,
      rotation: selectedQuickAddElement.rotation,
      zIndex: elements.length + 1,
      updatedBy: currentUser.uid,
      updatedByName: currentUser.displayName,
    });

    if (!newShapeId) return;
    onSelectionChange([newShapeId]);
  }, [
    selectedQuickAddElement,
    readOnly,
    canCommentOnly,
    onAddElement,
    elements.length,
    currentUser.uid,
    currentUser.displayName,
    onSelectionChange,
  ]);

  const canUseQuickAdd = Boolean(
    selectedQuickAddElement &&
    currentTool === 'select' &&
    !readOnly &&
    !selectedQuickAddElement.locked &&
    !inlineEditing &&
    !isTransforming &&
    !contextMenuState.isOpen &&
    (canCommentOnly
      ? selectedQuickAddElement.type === 'sticky' &&
        selectedQuickAddElement.updatedBy === currentUser.uid
      : true)
  );

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
    const pointer = stage.getPointerPosition() || { x: clientX - stagePosRef.current.x, y: clientY - stagePosRef.current.y };
    const worldPos = {
      x: (pointer.x - stagePosRef.current.x) / scaleRef.current,
      y: (pointer.y - stagePosRef.current.y) / scaleRef.current,
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

  const inlineEditingElement = inlineEditing
    ? elements.find((elem) => elem.id === inlineEditing.elementId) || null
    : null;

  const [isDraggingExternalFiles, setIsDraggingExternalFiles] = useState(false);
  const dragFileCounterRef = useRef(0);

  const hasDraggedFiles = (dt: DataTransfer | null): boolean => {
    if (!dt || !dt.types) return false;
    return Array.from(dt.types).includes('Files');
  };

  const handleCanvasDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    if (readOnly || canCommentOnly || !hasDraggedFiles(e.dataTransfer)) return;
    e.preventDefault();
    dragFileCounterRef.current += 1;
    setIsDraggingExternalFiles(true);
  };

  const handleCanvasDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (readOnly || canCommentOnly || !hasDraggedFiles(e.dataTransfer)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (!isDraggingExternalFiles) {
      setIsDraggingExternalFiles(true);
    }
  };

  const handleCanvasDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (readOnly || canCommentOnly) return;
    e.preventDefault();
    dragFileCounterRef.current = Math.max(0, dragFileCounterRef.current - 1);
    if (dragFileCounterRef.current === 0 || !e.currentTarget.contains(e.relatedTarget as Node)) {
      dragFileCounterRef.current = 0;
      setIsDraggingExternalFiles(false);
    }
  };

  const handleCanvasDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    dragFileCounterRef.current = 0;
    setIsDraggingExternalFiles(false);
    if (readOnly || canCommentOnly) return;
    if (!e.dataTransfer?.files || e.dataTransfer.files.length === 0) return;

    e.preventDefault();
    e.stopPropagation();

    const allFiles = Array.from(e.dataTransfer.files);
    const validation = validateDroppedFiles(allFiles);

    if (validation.validFiles.length === 0) {
      const { title, message } = formatUnsupportedFileMessage(validation);
      showCanvasToast(title, message, 'warning', 7000);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const dropWorldX = Math.round(
      (e.clientX - rect.left - stagePosRef.current.x) / scaleRef.current
    );
    const dropWorldY = Math.round(
      (e.clientY - rect.top - stagePosRef.current.y) / scaleRef.current
    );

    try {
      const processed = await processImageFiles(validation.validFiles);
      if (processed.length === 0) {
        showCanvasToast(
          'Erro ao carregar imagem',
          'Não foi possível processar o arquivo de imagem. Verifique se o arquivo não está corrompido.',
          'error'
        );
        return;
      }

      saveRecentUploadedImages(processed);
      const positions = computeImageGridLayout(processed, { x: dropWorldX, y: dropWorldY });
      const now = Date.now();

      const droppedElements: CanvasElement[] = processed.map((img, idx) => ({
        id: 'elem_' + Math.random().toString(36).substring(2, 11) + idx,
        type: img.type,
        src: img.src,
        alt: img.alt || 'Imagem arrastada',
        x: positions[idx]?.x ?? Math.round(dropWorldX - img.width / 2),
        y: positions[idx]?.y ?? Math.round(dropWorldY - img.height / 2),
        width: img.width,
        height: img.height,
        zIndex: elementsRef.current.length + idx + 1,
        updatedBy: currentUser.uid,
        updatedByName: currentUser.displayName,
        updatedAt: now,
      }));

      if (onBatchAddElements) {
        await onBatchAddElements(droppedElements);
      } else {
        for (const el of droppedElements) {
          await onAddElement(el);
        }
      }
      onSelectionChange(droppedElements.map((el) => el.id));
      onSelectTool('select');

      if (validation.unsupportedFiles.length > 0) {
        const skippedNames = validation.unsupportedNames.slice(0, 2).join(', ');
        showCanvasToast(
          'Alguns arquivos foram ignorados',
          validation.hasPdf
            ? `Imagens adicionadas com sucesso! Arquivos PDF (${skippedNames}) foram ignorados pois o quadro suporta apenas imagens.`
            : `Imagens adicionadas com sucesso! Arquivos não suportados (${skippedNames}) foram ignorados.`,
          'info',
          6000
        );
      }
    } catch (err) {
      console.warn('[Drop] Erro ao soltar imagens no canvas:', err);
      showCanvasToast(
        'Falha no processamento',
        'Ocorreu um erro ao carregar as imagens soltas no quadro.',
        'error'
      );
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
      onDragEnter={handleCanvasDragEnter}
      onDragOver={handleCanvasDragOver}
      onDragLeave={handleCanvasDragLeave}
      onDrop={handleCanvasDrop}
      className="relative w-full h-full select-none overflow-hidden bg-background"
      style={{ cursor: canvasCursor, touchAction: 'none' }}
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
      {/* Overlay Visual de Drag & Drop de Imagens do Computador sobre o Canvas */}
      {isDraggingExternalFiles && !readOnly && !canCommentOnly && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-3 z-50 rounded-2xl border-2 border-dashed border-primary bg-primary/8 backdrop-blur-[2px] flex items-center justify-center animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="px-5 py-3 rounded-2xl bg-popover/95 text-popover-foreground border border-border shadow-2xl flex items-center gap-3">
            <span className="text-xl">🖼️</span>
            <div className="text-left">
              <p className="text-xs sm:text-sm font-bold text-foreground">
                Solte para adicionar imagens ao quadro
              </p>
              <p className="text-[11px] text-muted-foreground">
                Suporta PNG, JPG, WebP, GIF e SVG (arquivos PDF não suportados)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notificação de Feedback do Canvas (ex: PDF ou formatos não suportados) */}
      {canvasToast && (
        <div
          role="alert"
          className="fixed top-5 left-1/2 -translate-x-1/2 z-50 max-w-md w-[calc(100vw-32px)] pointer-events-auto animate-in fade-in slide-in-from-top-3 duration-200"
        >
          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-popover/95 text-popover-foreground border border-border shadow-2xl backdrop-blur-md">
            <div
              className={`mt-0.5 size-7 rounded-xl flex items-center justify-center shrink-0 text-sm ${
                canvasToast.type === 'error'
                  ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                  : canvasToast.type === 'warning'
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                  : 'bg-primary/15 text-primary'
              }`}
            >
              {canvasToast.type === 'error' ? '❌' : canvasToast.type === 'warning' ? '⚠️' : 'ℹ️'}
            </div>
            <div className="flex-1 min-w-0 pr-1">
              <p className="text-xs font-semibold text-foreground tracking-tight">
                {canvasToast.title}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed break-words">
                {canvasToast.message}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCanvasToast(null)}
              aria-label="Fechar notificação"
              className="size-6 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 flex items-center justify-center text-xs shrink-0 transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}
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

      {/* Barra de Propriedades Flutuante (Oculta em Modo Leitura, durante transformações e Restrita a Itens Próprios em Modo Comentário) */}
      {!readOnly && !isTransforming && (!canCommentOnly || (selectedElements.length > 0 && selectedElements.every((e) => e.updatedBy === currentUser.uid))) && (
        <SelectionContextBar
        selectedElements={selectedElements}
        editingElementId={inlineEditing?.elementId}
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
        onReorderLayer={handleReorderLayer}
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
        topOffset={canUseQuickAdd ? 84 : 48}
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

      {/* Balão de Hiperlink Flutuante Estilo Miro (exibido quando um elemento com link está selecionado) */}
      {/* Botões "+" ao redor do post-it ou forma geométrica selecionada para criar elementos encostados (estilo FigJam) */}
      {canUseQuickAdd && selectedQuickAddElement && (
        <StickyQuickAdd sticky={selectedQuickAddElement} onCreate={handleQuickAddSticky} />
      )}

      {selectedElements.length === 1 && !inlineEditing && !isTransforming && (
        <ElementLinkBalloon
          element={selectedElements[0]}
          scale={scale}
          stagePos={stagePos}
          stickyBottomOffset={canUseQuickAdd ? 84 : 46}
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
            const target = selectedElements[0];
            onUpdateElement(target.id, {
              linkUrl,
              links,
              ...(target.richText ? { richText: removeRunLink(target.richText, url) } : {}),
            });
          }}
        />
      )}

      {/* Barra Flutuante de Reações Apple Emoji para o Post-it Selecionado (z-index 50: NUNCA fica por baixo de post-its vizinhos) */}
      {selectedSticky && !isTransforming && onToggleReaction && (
        <StickyReactionBar
          sticky={selectedSticky}
          onToggleReaction={onToggleReaction}
          mirioReactionUnlocked={mirioReactionUnlocked}
          verticalOffset={canUseQuickAdd ? 44 : 10}
        />
      )}

      {/* GIFs Animados a 60fps Nativo em Overlay HTML 100% Sincronizado no Pan e Zoom */}
      <div
        ref={gifOverlayRef}
        className="absolute inset-0 pointer-events-none overflow-visible"
        style={{
          transform: `translate3d(${stagePos.x}px, ${stagePos.y}px, 0) scale(${scale})`,
          transformOrigin: '0 0',
          zIndex: 10,
        }}
      >
        {elements
          .filter((e) => e.type === 'gif' && Boolean(e.src))
          .map((elem) => {
            const isGifSelected = selectedIds.includes(elem.id);
            const remoteSel = remoteSelectionMap[elem.id];
            const ringColor = remoteSel
              ? remoteSel.color
              : isGifSelected
              ? userSelectionColor
              : undefined;

            return (
              <img
                key={elem.id}
                id={`gif-overlay-${elem.id}`}
                src={cleanGifUrl(elem.src)}
                alt={elem.alt || 'GIF animado'}
                loading="eager"
                className="absolute pointer-events-none select-none rounded-lg shadow-sm object-contain"
                style={{
                  left: `${elem.x}px`,
                  top: `${elem.y}px`,
                  width: `${elem.width || 220}px`,
                  height: `${elem.height || 160}px`,
                  transform: elem.rotation ? `rotate(${elem.rotation}deg)` : undefined,
                  transformOrigin: 'top left',
                  zIndex: elem.zIndex || 10,
                  outline: ringColor ? `2px solid ${ringColor}` : undefined,
                  willChange: 'left, top',
                }}
              />
            );
          })}
      </div>

      {/* Badges Interativas de Votação (Estilo Miro) */}
      {(() => {
        const session = votingData?.session;

        // 1. Sessão Ativa: participantes distribuem votos de forma privada com botões (+ / -)
        if (session && session.status === 'active') {
          const userRemaining = votingService.getUserRemainingVotes(session, currentUser.uid);

          return (
            <div
              ref={votingOverlayRef}
              className="absolute inset-0 pointer-events-none overflow-visible"
              style={{
                transform: `translate3d(${stagePos.x}px, ${stagePos.y}px, 0) scale(${scale})`,
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
              ref={votingOverlayRef}
              className="absolute inset-0 pointer-events-none overflow-visible"
              style={{
                transform: `translate3d(${stagePos.x}px, ${stagePos.y}px, 0) scale(${scale})`,
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
              ref={votingOverlayRef}
              className="absolute inset-0 pointer-events-none overflow-visible"
              style={{
                transform: `translate3d(${stagePos.x}px, ${stagePos.y}px, 0) scale(${scale})`,
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
        draggable={!readOnly && isDraggableStage}
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
            applyStagePan({ x: sx, y: sy }, scaleRef.current);
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
            applyStagePan(
              { x: Math.round(e.target.x()), y: Math.round(e.target.y()) },
              scaleRef.current,
              'immediate'
            );
          }
        }}
        onWheel={handleWheel}
        onContextMenu={handleStageContextMenu}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleStageTouchStart}
        onTouchMove={handleStageTouchMove}
        onTouchEnd={handleStageTouchEnd}
        onMouseEnter={() => {
          isMouseOverCanvasRef.current = true;
        }}
        onMouseLeave={() => {
          isMouseOverCanvasRef.current = false;
        }}
      >
        <Layer ref={elementsLayerRef} id="elements-layer" listening={!readOnly}>
          {/* Renderização de todos os elementos no canvas Konva */}
          {renderedElements /* stable while pan/zoom changes */}
        </Layer>

        {/* Camada Dinâmica 2: Elemento sendo desenhado no momento e Marquee (isolada para não repintar o canvas de elementos estáticos a cada pixel) */}
        {!readOnly && (
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
            (((drawingElement.width ?? 0) > 4) || ((drawingElement.radius ?? 0) > 4)) ? (
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
            ) : null}

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
        )}

        {/* Camada 3: Konva Transformer para redimensionamento e rotação pelas 4 pontas (estilo Figma/Miro) */}
        {!readOnly && (
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
            rotateEnabled={selectedElements.length > 0 && selectedElements.every(canElementRotate)}
            rotateMode="corners"
            rotationSnaps={[0, 90, 180, 270]}
            rotationSnapTolerance={3}
            anchorStyleFunc={(anchor) => {
              // Expande a zona externa de rotação nos 4 cantos (sem lacuna ao redor do
              // quadradinho de resize e com área de toque ampliada em telas touch).
              const tr = transformerRef.current as
                | (Konva.Transformer & { _anchors?: Record<string, Konva.Rect> })
                | null;
              if (!tr || !tr._anchors || !anchor.hasName('top-left')) return;
              const isCoarse =
                typeof window !== 'undefined' &&
                window.matchMedia?.('(pointer: coarse)').matches === true;
              const outerReach = isCoarse ? 26 : 16;
              const innerOverlap = 6;
              const zoneSize = outerReach + innerOverlap;
              const w = tr.width();
              const h = tr.height();
              const zonesVisible = tr.rotateEnabled() && tr.rotateMode() !== 'handle';
              const cornerZones: Array<[string, number, number]> = [
                ['rotater-top-left', -outerReach, -outerReach],
                ['rotater-top-right', w - innerOverlap, -outerReach],
                ['rotater-bottom-left', -outerReach, h - innerOverlap],
                ['rotater-bottom-right', w - innerOverlap, h - innerOverlap],
              ];
              for (const [name, zx, zy] of cornerZones) {
                const z = tr._anchors[name];
                if (z) {
                  z.setAttrs({
                    x: zx,
                    y: zy,
                    width: zoneSize,
                    height: zoneSize,
                    visible: zonesVisible,
                  });
                }
              }
            }}
            onTransformStart={() => {
              setIsTransforming(true);
              const tr = transformerRef.current;
              const activeAnchor = tr?.getActiveAnchor() || '';
              if (
                activeAnchor.startsWith('rotater') &&
                rotationHudRef.current &&
                rotationHudValueRef.current &&
                tr
              ) {
                const primaryNode = tr.nodes()[0];
                const deg = normalizeRotationDeg(
                  primaryNode ? primaryNode.rotation() : tr.rotation()
                );
                rotationHudValueRef.current.textContent = `${deg}°`;
                const isCardinal = deg === 0 || deg === 90 || deg === -90 || deg === 180;
                rotationHudRef.current.dataset.snapped = isCardinal ? 'true' : 'false';
                const pointer = stageRef.current?.getPointerPosition();
                if (pointer) {
                  rotationHudRef.current.style.transform = `translate3d(${Math.round(pointer.x + 18)}px, ${Math.round(pointer.y + 18)}px, 0) scale(1)`;
                }
                rotationHudRef.current.style.opacity = '1';
              }
            }}
            onTransform={() => {
              const tr = transformerRef.current;
              if (!tr) return;

              // Sincroniza GIFs em tempo real durante rotação/redimensionamento
              tr.nodes().forEach((node) => {
                const id = node.id();
                if (!id) return;
                const targetGif = document.getElementById(`gif-overlay-${id}`);
                if (targetGif) {
                  const elem = elementsRef.current.find((el) => el.id === id);
                  const baseW = elem?.width || 220;
                  const baseH = elem?.height || 160;
                  targetGif.style.left = `${node.x()}px`;
                  targetGif.style.top = `${node.y()}px`;
                  targetGif.style.width = `${Math.max(40, baseW * node.scaleX())}px`;
                  targetGif.style.height = `${Math.max(40, baseH * node.scaleY())}px`;
                  const rot = node.rotation();
                  targetGif.style.transform = rot ? `rotate(${rot}deg)` : '';
                }
              });

              const activeAnchor = tr.getActiveAnchor() || '';
              if (
                activeAnchor.startsWith('rotater') &&
                rotationHudRef.current &&
                rotationHudValueRef.current
              ) {
                const primaryNode = tr.nodes()[0];
                const deg = normalizeRotationDeg(
                  primaryNode ? primaryNode.rotation() : tr.rotation()
                );
                rotationHudValueRef.current.textContent = `${deg}°`;
                const isCardinal = deg === 0 || deg === 90 || deg === -90 || deg === 180;
                rotationHudRef.current.dataset.snapped = isCardinal ? 'true' : 'false';
                const pointer = stageRef.current?.getPointerPosition();
                if (pointer) {
                  rotationHudRef.current.style.transform = `translate3d(${Math.round(pointer.x + 18)}px, ${Math.round(pointer.y + 18)}px, 0) scale(1)`;
                }
                rotationHudRef.current.style.opacity = '1';
              }
            }}
            onTransformEnd={() => {
              setIsTransforming(false);
              if (rotationHudRef.current) {
                rotationHudRef.current.style.opacity = '0';
              }
            }}
            borderStroke={userSelectionColor}
            borderStrokeWidth={1.5}
            anchorStroke={userSelectionColor}
            anchorFill="#ffffff"
            anchorSize={8}
            anchorCornerRadius={2}
          />
        </Layer>
        )}
      </Stage>

      {/* Pílula minimalista de ângulo ao vivo durante o giro pelas pontas (0 re-renders por frame) */}
      {!readOnly && (
      <div
        ref={rotationHudRef}
        data-snapped="false"
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 z-50 flex items-center gap-1 rounded-full border border-border/85 bg-popover/95 px-2.5 py-0.5 text-[11px] font-semibold tabular-nums text-popover-foreground shadow-md backdrop-blur-md data-[snapped=true]:border-primary data-[snapped=true]:text-primary"
        style={{
          opacity: 0,
          transform: 'translate3d(-9999px, -9999px, 0) scale(0.95)',
          transition:
            'opacity 140ms cubic-bezier(0.23, 1, 0.32, 1), border-color 140ms ease, color 140ms ease',
          willChange: 'transform, opacity',
        }}
      >
        <span ref={rotationHudValueRef}>0°</span>
      </div>
      )}

      {/* Editor Inline Flutuante em HTML com posicionamento e estilização contextual precisos */}
      {/* Editor de texto rico: formatação por letra/palavra, links por seleção e resize lateral */}
      {inlineEditing && inlineEditing.type === 'text' && inlineEditingElement && (
        <RichTextEditor
          key={`rich-text-${inlineEditing.elementId}`}
          element={inlineEditingElement}
          scale={scale}
          stagePos={stagePos}
          selectionColor={userSelectionColor}
          onFinish={handleFinishRichTextEditing}
          onRequestLink={(selection) => {
            setLinkModalState({
              open: true,
              elementId: inlineEditing.elementId,
              initialUrl: 'https://',
              initialLabel: selection?.text || '',
              isNew: true,
            });
          }}
        />
      )}

      {/* Editor inline de post-its, formas e molduras (texto simples) */}
      {inlineEditing && inlineEditing.type !== 'text' && (
        <textarea
          autoFocus
          value={inlineEditing.text}
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
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
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
            inlineEditing.type === 'frame'
              ? 'px-2.5 py-1 rounded-t-md outline-none text-xs font-bold bg-slate-800 text-white border border-primary shadow-sm leading-normal'
              : 'p-3 rounded-sm outline-none font-sans leading-snug shadow-md border-2 border-primary/60'
          }`}
          style={{
            left: `${inlineEditing.worldX * scale + stagePos.x}px`,
            top: `${inlineEditing.worldY * scale + stagePos.y}px`,
            width: `${Math.max(140, inlineEditing.width * scale)}px`,
            height: `${Math.max(32, inlineEditing.height * scale)}px`,
            backgroundColor:
              inlineEditing.type === 'frame'
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
            transform: inlineEditingElement?.rotation
              ? `rotate(${inlineEditingElement.rotation}deg)`
              : undefined,
            transformOrigin: inlineEditing.type === 'circle' ? 'center center' : '0 0',
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
      )}
    </div>
  );
});

WhiteboardCanvas.displayName = 'WhiteboardCanvas';
