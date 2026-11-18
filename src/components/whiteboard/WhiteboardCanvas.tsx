import React, { useRef, useState, useEffect, useLayoutEffect, useCallback, useMemo } from 'react';
import { Stage, Layer, Transformer, Rect, Circle, Line, Star, Path, Ellipse, Group, Text } from 'react-konva';
import Konva from 'konva';
import type {
  CanvasElement,
  ToolType,
  ElementType,
  KanbanColumnItem,
} from '../../types/element';
import { isGeometricShape } from '../../types/element';
import type { UserPresence, CurrentUser, BoardMember } from '../../types/board';
import { StickyNoteItem } from './StickyNoteItem';
import { ChecklistItem } from './ChecklistItem';
import { createDefaultChecklistItems, computeChecklistHeight } from '../../utils/checklist';
import confetti from 'canvas-confetti';
import { ShapeItem } from './ShapeItem';
import { ArrowItem } from './ArrowItem';
import { FreeDrawItem } from './FreeDrawItem';
import { TextItem } from './TextItem';
import { RichTextEditor, type RichTextFinishPayload } from './RichTextEditor';
import { FrameItem } from './FrameItem';
import { StickerItem } from './StickerItem';
import { CommentPinItem } from './CommentPinItem';
import { CommentThreadPopover } from './CommentThreadPopover';
import { TableItem } from './TableItem';
import { KanbanItem } from './KanbanItem';
import { CodeBlockItem } from './CodeBlockItem';
import {
  CODE_TOKEN_COLORS_DARK,
  CODE_TOKEN_COLORS_LIGHT,
  getDefaultCodeSnippet,
  tokenizeCodeBlock,
} from '../../utils/richEmbeds';
import { RichLinkCardItem } from './RichLinkCardItem';
import { ImageCropModal } from './ImageCropModal';
import {
  createDefaultTableData,
  normalizeTableData,
  computeTableDimensions,
  getTableCellLocalRect,
  updateTableCell,
  createDefaultKanbanColumns,
  computeKanbanDimensions,
  getKanbanFieldLocalRect,
  type KanbanEditableTarget,
} from '../../utils/tableAndKanban';
import { createMindMapRootPayload, isMindMapNode } from '../../utils/mindMap';
import { useMindMapActions } from '../../hooks/canvas/useMindMapActions';
import { useConnectorEndpointDrag } from '../../hooks/canvas/useConnectorEndpointDrag';
import { buildRichPastedElementPayload } from '../../hooks/canvas/useRichPasteDetector';
import { ElementLinkBalloon } from './ElementLinkBalloon';
import { EditLinkModal } from './EditLinkModal';
import { CanvasGrid, type GridType, type GridSize } from './CanvasGrid';
import type { LaserPoint } from './LaserTrailOverlay';
import { ElementConnectorHandles } from './ElementConnectorHandles';
import {
  findNearestSnapAnchor,
  resolveConnectorGeometry,
  getConnectedArrowUpdatesOnMove,
  getCardinalAnchors,
} from '../../utils/connectors.ts';
import { SelectionContextBar } from './SelectionContextBar';
import { BoardContextMenu } from './BoardContextMenu';
import { alignElements, type AlignmentType } from '../../utils/alignment';
import {
  expandSelectionWithGroups,
  createGroupUpdates,
  createUngroupUpdates,
  generateGroupId,
} from '../../utils/grouping';
import {
  copyElementStyle,
  buildPasteStyleUpdates,
  hasCopiedElementStyle,
} from '../../utils/styleClipboard';
import { getElementsContainedInFrame } from '../../utils/frameContainment.ts';
import { cleanGifUrl } from '../../utils/gif';
import { sortElementsByLayer, computeLayerReorderUpdates, getNextZIndex, selectionSupportsLayerReorder, resolveLayerShortcut } from '../../utils/layerOrder';
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
import { textEditingBridge, setStagedTextSelection } from '../../utils/textEditingBridge';
import {
  copyCanvasElements,
  getCachedClipboardElements,
  getElementsBoundingBox,
} from '../../utils/clipboard';
import {
  processImageFiles,
  computeImageGridLayout,
  validateDroppedFiles,
  formatUnsupportedFileMessage,
} from '../../utils/imageUpload';
import {
  applyWorldTransform,
  blendTouchVelocity,
  computePinchViewport,
  isCoarseOrMobileViewport,
  publishElementDragOffset,
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
  type WorldBounds,
} from '../../utils/elementBounds';
import { calculateSmartGuidesAndSnap, type GuideLine } from '../../utils/smartGuides';
import { StickyReactionBar } from './StickyReactionBar';
import { ReactionBadgeTooltip } from './ReactionBadgeTooltip';
import { StickyQuickAdd } from './StickyQuickAdd';
import { getAdjacentStickyRect, type StickyDirection } from '../../utils/stickyPlacement';
import {
  isMirioReaction,
  MIRIO_REACTION,
  isDitadorReaction,
  DITADOR_REACTION,
  isBrigadeiroReaction,
  BRIGADEIRO_REACTION,
} from '../../utils/mirioReaction';
import { Vote, Crown, Check, Minus, Plus, LockClosed, AlertCircle, AlertTriangle, Info } from '@/components/ui/icons';

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
  onToggleSmartDrawing?: () => void;
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
  onOpenSearch?: () => void;
  onToggleMinimap?: () => void;
  showMinimap?: boolean;
  isDarkMode?: boolean;
  gridType?: GridType;
  gridSize?: GridSize;
  gridOpacity?: number;
  showGrid?: boolean;
  onToggleGrid?: () => void;
  smartGuidesEnabled?: boolean;
  onToggleSmartGuides?: () => void;
  boardMembers?: Record<string, BoardMember>;
  boardOwner?: { id?: string; name?: string };
  mirioReactionUnlocked?: boolean;
  ditadorReactionUnlocked?: boolean;
  brigadeiroReactionUnlocked?: boolean;
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
  onToggleSmartDrawing,
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
  onOpenSearch,
  onToggleMinimap,
  showMinimap = false,
  isDarkMode = false,
  gridType = 'hybrid',
  gridSize = 'medium',
  gridOpacity,
  showGrid = true,
  onToggleGrid,
  smartGuidesEnabled = true,
  onToggleSmartGuides,
  boardMembers,
  boardOwner,
  mirioReactionUnlocked = false,
  ditadorReactionUnlocked = false,
  brigadeiroReactionUnlocked = false,
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
  const smartGuidesLayerRef = useRef<Konva.Layer>(null);
  const smartGuidesEnabledRef = useRef(smartGuidesEnabled);
  smartGuidesEnabledRef.current = smartGuidesEnabled;
  const dragSmartGuidesData = useRef<{
    initialSelfPos: { x: number; y: number };
    initialBounds: { x: number; y: number; w: number; h: number };
    candidateElements: CanvasElement[];
    draggedIds: Set<string>;
  } | null>(null);

  // Sessão de arraste em lote sincronizado a 60/120 FPS com cache O(1)
  interface DragSessionItem {
    node: Konva.Node;
    initX: number;
    initY: number;
    isLocked: boolean;
    gifEl: HTMLElement | null;
    reactionsEl: HTMLElement | null;
  }

  interface DragArrowSession {
    arrow: CanvasElement;
    group: Konva.Group;
    line: Konva.Shape | null;
  }

  interface DragSession {
    leaderId: string;
    initialLeaderPos: { x: number; y: number };
    draggedIds: Set<string>;
    initialBoundsById: Map<string, WorldBounds>;
    items: Map<string, DragSessionItem>;
    connectedArrows: DragArrowSession[];
    smartGuidesData: {
      initialBounds: { x: number; y: number; w: number; h: number };
      candidateElements: CanvasElement[];
      precomputedTargets: Array<{ element: CanvasElement; bounds: WorldBounds }>;
    } | null;
  }

  const dragSessionRef = useRef<DragSession | null>(null);
  const lastBatchUpdateRef = useRef<{ timestamp: number; key: string } | null>(null);

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

  // Mapa de elementos id -> CanvasElement memoizado para resoluções geométricas e conectores
  const elementMap = useMemo(() => {
    const map = new Map<string, CanvasElement>();
    for (const el of elements) map.set(el.id, el);
    return map;
  }, [elements]);

  // Controle de atalho dinâmico para Apontador Laser (Tap-to-switch e Hold-to-laser temporário)
  const previousToolBeforeLaser = useRef<ToolType>('select');
  const isLaserKeyHeld = useRef(false);
  const laserKeyDownTime = useRef(0);

  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [inlineEditing, setInlineEditing] = useState<InlineEditingState | null>(null);
  const [activeChecklistEditor, setActiveChecklistEditor] = useState<{
    elementId: string;
    target: 'title' | string;
    text: string;
    itemY: number;
  } | null>(null);
  const activeChecklistEditorRef = useRef(activeChecklistEditor);
  activeChecklistEditorRef.current = activeChecklistEditor;
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
  const isMouseDownRef = useRef(false);

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
    type: 'info' | 'warning' | 'error' | 'lock';
    title: string;
    message: string;
  } | null>(null);
  // Alvo de snap magnético ao arrastar ponta de seta/conector
  const [snapTargetAnchor, setSnapTargetAnchor] = useState<{ x: number; y: number } | null>(null);

  // Estados dedicados das novas ferramentas (Comentário em Thread, Recorte de Imagem e Editor de Células/Código)
  const [activeCommentThreadId, setActiveCommentThreadId] = useState<string | null>(null);
  const [cropModalElementId, setCropModalElementId] = useState<string | null>(null);
  const [activeTableCell, setActiveTableCell] = useState<{
    elementId: string;
    rowIdx: number;
    colIdx: number;
  } | null>(null);
  const activeTableCellRef = useRef(activeTableCell);
  activeTableCellRef.current = activeTableCell;

  type WidgetFieldEditorState =
    | {
        kind: 'table';
        elementId: string;
        rowIdx: number;
        colIdx: number;
        offsetX: number;
        offsetY: number;
        width: number;
        height: number;
        value: string;
        selectAllOnFocus?: boolean;
      }
    | {
        kind: 'kanban';
        elementId: string;
        target: KanbanEditableTarget;
        offsetX: number;
        offsetY: number;
        width: number;
        height: number;
        value: string;
        fallbackColumns?: KanbanColumnItem[];
        selectAllOnFocus?: boolean;
      }
    | {
        kind: 'code';
        elementId: string;
        offsetX: number;
        offsetY: number;
        width: number;
        height: number;
        value: string;
        selectAllOnFocus?: boolean;
      };

  const [widgetFieldEditor, setWidgetFieldEditor] = useState<WidgetFieldEditorState | null>(null);
  const widgetFieldEditorRef = useRef<WidgetFieldEditorState | null>(null);
  widgetFieldEditorRef.current = widgetFieldEditor;
  const widgetEditorControlRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  const activeWidgetEditorKey = widgetFieldEditor
    ? widgetFieldEditor.kind === 'table'
      ? `table:${widgetFieldEditor.elementId}:${widgetFieldEditor.rowIdx}:${widgetFieldEditor.colIdx}`
      : widgetFieldEditor.kind === 'kanban'
        ? widgetFieldEditor.target.kind === 'boardTitle'
          ? `kanban:${widgetFieldEditor.elementId}:title`
          : widgetFieldEditor.target.kind === 'column'
            ? `kanban:${widgetFieldEditor.elementId}:col:${widgetFieldEditor.target.colId}`
            : `kanban:${widgetFieldEditor.elementId}:card:${widgetFieldEditor.target.colId}:${widgetFieldEditor.target.cardId}`
        : `code:${widgetFieldEditor.elementId}`
    : null;

  useLayoutEffect(() => {
    if (!activeWidgetEditorKey) return;
    const ctrl = widgetEditorControlRef.current;
    const currentEditor = widgetFieldEditorRef.current;
    if (!ctrl || !currentEditor) return;
    ctrl.focus({ preventScroll: true });
    if (ctrl instanceof HTMLInputElement) {
      if (currentEditor.selectAllOnFocus !== false) {
        ctrl.select();
      } else {
        const len = ctrl.value.length;
        ctrl.setSelectionRange(len, len);
      }
    }
  }, [activeWidgetEditorKey]);

  const commitWidgetFieldEditor = useCallback(
    (overrideValue?: string): KanbanColumnItem[] | null => {
      const active = widgetFieldEditorRef.current;
      if (!active) return null;

      widgetFieldEditorRef.current = null;
      setWidgetFieldEditor(null);

      const finalValue = overrideValue !== undefined ? overrideValue : active.value;
      const targetEl = elementsRef.current.find((el) => el.id === active.elementId);

      if (active.kind === 'table') {
        if (!targetEl) return null;
        onUpdateElement(
          targetEl.id,
          updateTableCell(targetEl, active.rowIdx, active.colIdx, finalValue)
        );
        return null;
      }

      if (active.kind === 'kanban') {
        const t = active.target;
        const baseCols =
          (targetEl?.kanbanColumns && targetEl.kanbanColumns.length > 0
            ? targetEl.kanbanColumns
            : active.fallbackColumns) || createDefaultKanbanColumns();

        if (t.kind === 'boardTitle') {
          if (targetEl) {
            onUpdateElement(targetEl.id, {
              kanbanTitle: finalValue.trim() || 'Quadro Kanban',
            });
          }
          return baseCols;
        }

        if (t.kind === 'column') {
          const nextCols = baseCols.map((c) =>
            c.id === t.colId ? { ...c, title: finalValue.trim() || c.title } : c
          );
          if (targetEl) {
            onUpdateElement(targetEl.id, { kanbanColumns: nextCols });
          }
          return nextCols;
        }

        const hasTargetCardInLive = baseCols.some(
          (c) => c.id === t.colId && c.cards.some((card) => card.id === t.cardId)
        );
        const sourceCols =
          !hasTargetCardInLive && active.fallbackColumns ? active.fallbackColumns : baseCols;

        const nextCols = sourceCols.map((c) =>
          c.id === t.colId
            ? {
                ...c,
                cards: c.cards.map((card) =>
                  card.id === t.cardId
                    ? { ...card, title: finalValue.trim() || card.title }
                    : card
                ),
              }
            : c
        );
        if (targetEl) {
          const dims = computeKanbanDimensions(nextCols);
          onUpdateElement(targetEl.id, {
            kanbanColumns: nextCols,
            width: dims.width,
            height: dims.height,
          });
        }
        return nextCols;
      }

      if (active.kind === 'code') {
        if (!targetEl) return null;
        const lineCount = Math.max(3, finalValue.split('\n').length);
        onUpdateElement(targetEl.id, {
          text: finalValue,
          height: Math.max(targetEl.height || 150, 58 + lineCount * 21),
        });
        return null;
      }

      return null;
    },
    [onUpdateElement]
  );

  const { spawnMindMapRelative } = useMindMapActions({
    elementsRef,
    currentUser,
    readOnly,
    canCommentOnly,
    onAddElement,
    onBatchUpdateElements,
    onSelectionChange,
  });

  const handleOpenCommentThread = useCallback((id: string) => {
    setActiveCommentThreadId(id);
  }, []);

  const handleSelectTableCell = useCallback(
    (elementId: string, rowIdx: number, colIdx: number) => {
      const next = { elementId, rowIdx, colIdx };
      activeTableCellRef.current = next;
      setActiveTableCell(next);
    },
    []
  );

  const openTableCellEditorByCoords = useCallback(
    (
      el: CanvasElement,
      rowIdx: number,
      colIdx: number,
      options?: { initialValue?: string; selectAll?: boolean }
    ) => {
      if (widgetFieldEditorRef.current) {
        commitWidgetFieldEditor();
      }
      const latestEl = elementsRef.current.find((item) => item.id === el.id) || el;
      const cellRect = getTableCellLocalRect(latestEl, rowIdx, colIdx);
      const cellSel = { elementId: latestEl.id, rowIdx, colIdx };
      activeTableCellRef.current = cellSel;
      setActiveTableCell(cellSel);

      const next: WidgetFieldEditorState = {
        kind: 'table',
        elementId: latestEl.id,
        rowIdx,
        colIdx,
        offsetX: cellRect.offsetX,
        offsetY: cellRect.offsetY,
        width: cellRect.width,
        height: cellRect.height,
        value: options?.initialValue !== undefined ? options.initialValue : cellRect.value,
        selectAllOnFocus: options?.selectAll ?? true,
      };
      widgetFieldEditorRef.current = next;
      setWidgetFieldEditor(next);
    },
    [commitWidgetFieldEditor]
  );

  const handleEditTableCell = useCallback(
    (
      elementId: string,
      rowIdx: number,
      colIdx: number,
      rect: { worldX: number; worldY: number; width: number; height: number },
      currentValue: string
    ) => {
      if (widgetFieldEditorRef.current) {
        commitWidgetFieldEditor();
      }
      const el = elementsRef.current.find((item) => item.id === elementId);
      const localRect = el ? getTableCellLocalRect(el, rowIdx, colIdx) : null;
      const cellSel = { elementId, rowIdx, colIdx };
      activeTableCellRef.current = cellSel;
      setActiveTableCell(cellSel);

      const next: WidgetFieldEditorState = {
        kind: 'table',
        elementId,
        rowIdx,
        colIdx,
        offsetX: localRect ? localRect.offsetX : el ? rect.worldX - el.x : 0,
        offsetY: localRect ? localRect.offsetY : el ? rect.worldY - el.y : 0,
        width: localRect ? localRect.width : rect.width,
        height: localRect ? localRect.height : rect.height,
        value: currentValue,
        selectAllOnFocus: true,
      };
      widgetFieldEditorRef.current = next;
      setWidgetFieldEditor(next);
    },
    [commitWidgetFieldEditor]
  );

  const handleEditKanbanField = useCallback(
    (
      elementId: string,
      target: KanbanEditableTarget,
      rect: { worldX: number; worldY: number; width: number; height: number },
      currentValue: string,
      fallbackColumns?: KanbanColumnItem[]
    ) => {
      if (widgetFieldEditorRef.current) {
        commitWidgetFieldEditor();
      }
      const el = elementsRef.current.find((item) => item.id === elementId);
      const cols =
        (el?.kanbanColumns && el.kanbanColumns.length > 0
          ? el.kanbanColumns
          : fallbackColumns) || createDefaultKanbanColumns();
      const localRect = getKanbanFieldLocalRect(cols, target);
      const next: WidgetFieldEditorState = {
        kind: 'kanban',
        elementId,
        target,
        offsetX: el ? localRect.offsetX : rect.worldX,
        offsetY: el ? localRect.offsetY : rect.worldY,
        width: localRect.width,
        height: localRect.height,
        value: currentValue,
        ...(fallbackColumns ? { fallbackColumns } : {}),
      };
      widgetFieldEditorRef.current = next;
      setWidgetFieldEditor(next);
    },
    [commitWidgetFieldEditor]
  );

  const handleEditCodeBlock = useCallback(
    (
      elementId: string,
      rect: { worldX: number; worldY: number; width: number; height: number },
      currentCode: string
    ) => {
      if (widgetFieldEditorRef.current) {
        commitWidgetFieldEditor();
      }
      const el = elementsRef.current.find((item) => item.id === elementId);
      const next: WidgetFieldEditorState = {
        kind: 'code',
        elementId,
        offsetX: el ? rect.worldX - el.x : 0,
        offsetY: el ? rect.worldY - el.y : 34,
        width: rect.width,
        height: rect.height,
        value: currentCode,
      };
      widgetFieldEditorRef.current = next;
      setWidgetFieldEditor(next);
    },
    [commitWidgetFieldEditor]
  );

  const handleStartQuickConnect = useCallback(
    (
      elementId: string,
      side: any,
      worldAnchor: { x: number; y: number },
      _initialPointerEvent?: React.PointerEvent
    ) => {
      if (readOnly || canCommentOnly) return;
      const arrowColor = selectedColor && selectedColor !== '#0f172a' ? selectedColor : '#2563eb';

      const tempArrow: CanvasElement = {
        id: 'temp_arrow',
        type: 'arrow',
        x: Math.round(worldAnchor.x),
        y: Math.round(worldAnchor.y),
        points: [0, 0, 0, 0],
        startBinding: { elementId, side },
        connectorStyle: 'straight',
        stroke: arrowColor,
        strokeWidth: 3,
        zIndex: getNextZIndex(elements),
        updatedBy: currentUser.uid,
        updatedByName: currentUser.displayName,
        updatedAt: Date.now(),
      };
      setDrawingElement(tempArrow);

      const startPos = { x: worldAnchor.x, y: worldAnchor.y };
      let currentSnap: ReturnType<typeof findNearestSnapAnchor> = null;
      let latestTargetWorldPos = { x: worldAnchor.x, y: worldAnchor.y };

      const onPointerMove = (evt: PointerEvent) => {
        const stage = stageRef.current;
        if (!stage) return;
        const stageBox = stage.container().getBoundingClientRect();
        const screenX = evt.clientX - stageBox.left;
        const screenY = evt.clientY - stageBox.top;
        const curScale = scaleRef.current || 1;
        const curStagePos = stagePosRef.current || { x: 0, y: 0 };
        const worldX = (screenX - curStagePos.x) / curScale;
        const worldY = (screenY - curStagePos.y) / curScale;

        const snap = findNearestSnapAnchor({ x: worldX, y: worldY }, elements, 36, elementId);
        currentSnap = snap;
        setSnapTargetAnchor(snap ? snap.anchorPoint : null);

        const targetX = snap ? snap.anchorPoint.x : worldX;
        const targetY = snap ? snap.anchorPoint.y : worldY;
        latestTargetWorldPos = { x: targetX, y: targetY };

        const updatedArrow: CanvasElement = {
          ...tempArrow,
          points: [0, 0, targetX - tempArrow.x, targetY - tempArrow.y],
          endBinding: snap ? { elementId: snap.element.id, side: snap.side } : undefined,
        };

        const elementMap = new Map<string, CanvasElement>();
        for (const el of elements) elementMap.set(el.id, el);

        const geom = resolveConnectorGeometry(updatedArrow, elementMap);
        const relPoints = geom.routePoints.map((val, idx) =>
          idx % 2 === 0 ? Math.round(val - geom.worldStart.x) : Math.round(val - geom.worldStart.y)
        );

        setDrawingElement({
          ...updatedArrow,
          x: Math.round(geom.worldStart.x),
          y: Math.round(geom.worldStart.y),
          points: relPoints,
        });
      };

      const cleanup = () => {
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('keydown', onKeyDown);
        setSnapTargetAnchor(null);
        setDrawingElement(null);
      };

      const onKeyDown = (evt: KeyboardEvent) => {
        if (evt.key === 'Escape') {
          cleanup();
        }
      };

      const onPointerUp = async () => {
        cleanup();

        const dist = Math.hypot(latestTargetWorldPos.x - startPos.x, latestTargetWorldPos.y - startPos.y);
        if (dist >= 12 || currentSnap) {
          const finalArrow: CanvasElement = {
            ...tempArrow,
            points: [0, 0, latestTargetWorldPos.x - tempArrow.x, latestTargetWorldPos.y - tempArrow.y],
            endBinding: currentSnap ? { elementId: currentSnap.element.id, side: currentSnap.side } : undefined,
          };

          const elementMap = new Map<string, CanvasElement>();
          for (const el of elements) elementMap.set(el.id, el);

          const geom = resolveConnectorGeometry(finalArrow, elementMap);
          const relPoints = geom.routePoints.map((val, idx) =>
            idx % 2 === 0 ? Math.round(val - geom.worldStart.x) : Math.round(val - geom.worldStart.y)
          );

          const newId = await onAddElement({
            type: 'arrow',
            x: Math.round(geom.worldStart.x),
            y: Math.round(geom.worldStart.y),
            points: relPoints,
            startBinding: { elementId, side },
            endBinding: currentSnap ? { elementId: currentSnap.element.id, side: currentSnap.side } : undefined,
            connectorStyle: 'straight',
            stroke: arrowColor,
            strokeWidth: 3,
            zIndex: getNextZIndex(elements),
            updatedBy: currentUser.uid,
            updatedByName: currentUser.displayName,
          });

          onSelectionChange([newId]);
        }
      };

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('keydown', onKeyDown);
    },
    [
      readOnly,
      canCommentOnly,
      selectedColor,
      elements,
      currentUser,
      onAddElement,
      onSelectionChange,
    ]
  );

  const canvasToastTimerRef = useRef<number | null>(null);

  const showCanvasToast = useCallback(
    (
      title: string,
      message: string,
      type: 'info' | 'warning' | 'error' | 'lock' = 'warning',
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

  // Feedback visual no badge do cadeado: shake curto (decay senoidal) via offsetX,
  // que não é controlado pelo React — os props do elemento permanecem intactos.
  const shakeLockedBadge = useCallback((elementId: string) => {
    const elementNode = stageRef.current?.findOne('#' + elementId) as Konva.Group | undefined;
    const node = elementNode?.findOne('.lock-badge');
    if (!node) return;
    const DURATION = 320;
    const layer = node.getLayer();
    const anim = new Konva.Animation((frame) => {
      const t = ((frame?.time ?? 0)) / DURATION;
      if (t >= 1) {
        node.offsetX(0);
        anim.stop();
        return;
      }
      const decay = 1 - t;
      node.offsetX(Math.sin(t * Math.PI * 5) * 3 * decay);
      layer?.batchDraw();
    }, layer);
    anim.start();
  }, []);

  // Aviso ao tentar excluir/recortar elementos bloqueados: nada acontece
  // silenciosamente — toast + shake no badge de cada elemento afetado.
  const notifyLockedBlocked = useCallback(
    (blockedIds: string[], hadDeletions: boolean) => {
      if (blockedIds.length === 0) return;
      const count = blockedIds.length;
      const title = count === 1 ? 'Elemento bloqueado' : `${count} elementos bloqueados`;
      const message = hadDeletions
        ? count === 1
          ? 'O elemento bloqueado não foi excluído. Pressione e segure o cadeado para liberar.'
          : 'Os elementos desbloqueados foram excluídos. Pressione e segure o cadeado para liberar os demais.'
        : count === 1
        ? 'Nada foi excluído — o elemento está bloqueado. Pressione e segure o cadeado para liberar.'
        : 'Nada foi excluído — todos os elementos selecionados estão bloqueados. Pressione e segure o cadeado para liberar.';
      showCanvasToast(title, message, 'lock', 4500);
      blockedIds.slice(0, 10).forEach((id) => shakeLockedBadge(id));
    },
    [showCanvasToast, shakeLockedBadge]
  );

  // Marquee (Seleção em lote por arrasto)
  const [marqueeBox, setMarqueeBox] = useState<MarqueeBox | null>(null);
  const isMarquee = useRef(false);

  // Estado para desenho com caneta ou criação de seta por arraste
  const [drawingElement, setDrawingElement] = useState<CanvasElement | null>(null);

  // Elementos candidatos para ancoragem magnética durante o desenho de seta ou conector
  const candidateConnectableElements = useMemo(() => {
    if (!drawingElement || (drawingElement.type !== 'arrow' && drawingElement.type !== 'line')) {
      return [];
    }
    const sourceId = drawingElement.startBinding?.elementId;
    return elements.filter(
      (el) =>
        el.id !== sourceId &&
        el.type !== 'arrow' &&
        el.type !== 'line' &&
        el.type !== 'frame' &&
        !el.locked
    );
  }, [drawingElement, elements]);
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

  // Estado para ancoragem do popover seletor de emojis do post-it (ancorado ao botão '+' interno ou '+N')
  const [reactionPickerTarget, setReactionPickerTarget] = useState<{
    elementId: string;
    anchor: { x: number; y: number };
    mode?: 'picker' | 'overflow';
  } | null>(null);

  // Fecha o popover caso o elemento seja excluído ou se a seleção mudar para outro elemento
  useEffect(() => {
    if (!reactionPickerTarget) return;
    const exists = elements.some((el) => el.id === reactionPickerTarget.elementId);
    if (!exists) {
      setReactionPickerTarget(null);
      return;
    }
    if (selectedIds.length > 0 && !selectedIds.includes(reactionPickerTarget.elementId)) {
      setReactionPickerTarget(null);
    }
  }, [elements, selectedIds, reactionPickerTarget]);



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
  // Rastreamento dos elementos filhos contidos dentro de uma moldura durante o arraste inteligente
  const draggedFrameChildIdsRef = useRef<string[]>([]);

  // Limpa as linhas-guia inteligentes do canvas reutilizando nós no pool
  const clearSmartGuides = useCallback(() => {
    const layer = smartGuidesLayerRef.current;
    if (!layer) return;
    let anyVisible = false;
    layer.children.forEach((child) => {
      if (child.visible()) {
        child.visible(false);
        anyVisible = true;
      }
    });
    if (anyVisible) {
      layer.batchDraw();
    }
  }, []);

  // Renderiza as réguas e linhas-guia inteligentes estilo Figma/Miro (#F43F5E) com pooling de alta performance a 60/120 FPS
  const drawSmartGuides = useCallback((guides: GuideLine[]) => {
    const layer = smartGuidesLayerRef.current;
    if (!layer) return;

    if (!guides || guides.length === 0) {
      clearSmartGuides();
      return;
    }

    const currentScale = scaleRef.current || 1;
    const strokeWidth = Math.max(1, 1.5 / currentScale);
    const tickSize = Math.max(2, 4 / currentScale);
    const dash = [4 / currentScale, 3 / currentScale];

    let lineIndex = 0;
    const children = layer.children;

    const getPooledLine = (): Konva.Line => {
      if (lineIndex < children.length) {
        const line = children[lineIndex] as Konva.Line;
        line.visible(true);
        lineIndex++;
        return line;
      }
      const newLine = new Konva.Line({
        stroke: '#F43F5E',
        opacity: 0.95,
        listening: false,
        perfectDrawEnabled: false,
      });
      layer.add(newLine);
      lineIndex++;
      return newLine;
    };

    for (const g of guides) {
      if (g.orientation === 'vertical') {
        // Linha guia vertical
        const line = getPooledLine();
        line.setAttrs({
          points: [g.lineCoord, g.start, g.lineCoord, g.end],
          strokeWidth,
          dash,
        });

        // Marcadores (ticks) nos topos e bases dos elementos alinhados
        const topTick = getPooledLine();
        topTick.setAttrs({
          points: [g.lineCoord - tickSize, g.start, g.lineCoord + tickSize, g.start],
          strokeWidth,
          dash: [],
        });

        const bottomTick = getPooledLine();
        bottomTick.setAttrs({
          points: [g.lineCoord - tickSize, g.end, g.lineCoord + tickSize, g.end],
          strokeWidth,
          dash: [],
        });
      } else {
        // Linha guia horizontal
        const line = getPooledLine();
        line.setAttrs({
          points: [g.start, g.lineCoord, g.end, g.lineCoord],
          strokeWidth,
          dash,
        });

        // Marcadores (ticks) nas extremidades esquerda e direita
        const leftTick = getPooledLine();
        leftTick.setAttrs({
          points: [g.start, g.lineCoord - tickSize, g.start, g.lineCoord + tickSize],
          strokeWidth,
          dash: [],
        });

        const rightTick = getPooledLine();
        rightTick.setAttrs({
          points: [g.end, g.lineCoord - tickSize, g.end, g.lineCoord + tickSize],
          strokeWidth,
          dash: [],
        });
      }
    }

    for (let i = lineIndex; i < children.length; i++) {
      children[i].visible(false);
    }

    layer.batchDraw();
  }, [clearSmartGuides]);

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

    if (activeChecklistEditorRef.current) {
      const editor = activeChecklistEditorRef.current;
      const checklistInput = document.getElementById(`checklist-editor-input-${editor.elementId}`);
      if (checklistInput) {
        const elem = elementsRef.current.find((e) => e.id === editor.elementId);
        if (elem) {
          const isTitle = editor.target === 'title';
          const offsetX = isTitle ? 38 : 40;
          const currentItems = elem.checklistItems || [];
          const targetIdx = isTitle ? -1 : currentItems.findIndex((i) => i.id === editor.target);
          const itemY = isTitle ? 16 : (targetIdx >= 0 ? 56 + targetIdx * 34 : editor.itemY);
          const inputWidth = Math.max(120, (elem.width || 260) - (isTitle ? 116 : 74));

          checklistInput.style.left = `${(elem.x + offsetX) * currentScale + pos.x}px`;
          checklistInput.style.top = `${(elem.y + itemY + 4) * currentScale + pos.y}px`;
          checklistInput.style.width = `${inputWidth * currentScale}px`;
          checklistInput.style.height = `${24 * currentScale}px`;
          checklistInput.style.fontSize = `${(isTitle ? 14 : 13) * currentScale}px`;
        }
      }
    }

    if (widgetFieldEditorRef.current) {
      const wEditor = widgetFieldEditorRef.current;
      const widgetInput = document.getElementById('widget-field-editor-control');
      if (widgetInput) {
        const elem = elementsRef.current.find((e) => e.id === wEditor.elementId);
        if (elem) {
          let offsetX = wEditor.offsetX;
          let offsetY = wEditor.offsetY;
          let fieldW = wEditor.width;
          let fieldH = wEditor.height;
          if (wEditor.kind === 'table') {
            const r = getTableCellLocalRect(elem, wEditor.rowIdx, wEditor.colIdx);
            offsetX = r.offsetX;
            offsetY = r.offsetY;
            fieldW = r.width;
            fieldH = r.height;
          } else if (wEditor.kind === 'kanban') {
            const cols =
              (elem.kanbanColumns && elem.kanbanColumns.length > 0
                ? elem.kanbanColumns
                : wEditor.fallbackColumns) || createDefaultKanbanColumns();
            const r = getKanbanFieldLocalRect(cols, wEditor.target);
            offsetX = r.offsetX;
            offsetY = r.offsetY;
            fieldW = r.width;
            fieldH = r.height;
          }
          widgetInput.style.left = `${(elem.x + offsetX) * currentScale + pos.x}px`;
          widgetInput.style.top = `${(elem.y + offsetY) * currentScale + pos.y}px`;
          widgetInput.style.width = `${Math.max(120, fieldW * currentScale)}px`;
          widgetInput.style.height = `${Math.max(wEditor.kind === 'code' ? 120 : 28, fieldH * currentScale)}px`;
          widgetInput.style.fontSize = `${Math.max(11, 13 * currentScale)}px`;
        }
      }
    }
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
    if (dragSessionRef.current) {
      return;
    }
    if (readOnly) {
      if (transformerRef.current.nodes().length > 0) {
        transformerRef.current.nodes([]);
        transformerRef.current.getLayer()?.batchDraw();
      }
      return;
    }
    if (selectedIds.length > 0) {
      const nodes: Konva.Node[] = [];
      selectedIds.forEach((id) => {
        if (inlineEditing?.elementId === id) {
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

      const tr = transformerRef.current;
      const currentNodes = tr.nodes();
      const isSameNodeList =
        currentNodes.length === nodes.length &&
        currentNodes.every((existingNode, idx) => existingNode === nodes[idx]);

      if (isSameNodeList) {
        tr.forceUpdate();
        tr.getLayer()?.batchDraw();
        return;
      }

      tr.nodes(nodes);

      // Desativa o proxy drag interno redundante do Transformer no Konva.
      // O WhiteboardCanvas gerencia nativamente a movimentação coordenada dos nós
      // selecionados com cache O(1), suporte a itens bloqueados, snap magnético e setas conectadas.
      if (typeof (tr as any)._getEventNamespace === 'function') {
        const ns = (tr as any)._getEventNamespace();
        nodes.forEach((node) => {
          node.off(`dragstart.${ns}`);
          node.off(`dragmove.${ns}`);
          node.off(`dragend.${ns}`);
        });
      }

      tr.getLayer()?.batchDraw();
    } else if (transformerRef.current.nodes().length > 0) {
      transformerRef.current.nodes([]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [selectedIds, elements, readOnly, canCommentOnly, currentUser.uid, inlineEditing]);

  // Alternar reação de emoji em post-its
  const handleToggleReactionInternal = useCallback(
    async (elementId: string, emoji: string) => {
      if (isMirioReaction(emoji) && !mirioReactionUnlocked) {
        return;
      }
      if (isDitadorReaction(emoji) && !ditadorReactionUnlocked) {
        return;
      }
      if (isBrigadeiroReaction(emoji) && !brigadeiroReactionUnlocked) {
        return;
      }

      const elem = elementsRef.current.find((e) => e.id === elementId);
      if (elem) {
        playReactionPopSound();
      }

      if (onToggleReaction) {
        await onToggleReaction(elementId, emoji);
        return;
      }

      if (!elem) return;

      const targetEmoji = isMirioReaction(emoji)
        ? MIRIO_REACTION
        : isDitadorReaction(emoji)
        ? DITADOR_REACTION
        : isBrigadeiroReaction(emoji)
        ? BRIGADEIRO_REACTION
        : emoji;
      const reactions = { ...(elem.reactions || {}) };

      if (reactions['__mirio_original__']) {
        const legacyUsers = reactions['__mirio_original__'] || [];
        reactions[MIRIO_REACTION] = [
          ...new Set([...(reactions[MIRIO_REACTION] || []), ...legacyUsers]),
        ];
        delete reactions['__mirio_original__'];
      }

      if (reactions['__ditador_original__']) {
        const legacyUsers = reactions['__ditador_original__'] || [];
        reactions[DITADOR_REACTION] = [
          ...new Set([...(reactions[DITADOR_REACTION] || []), ...legacyUsers]),
        ];
        delete reactions['__ditador_original__'];
      }

      if (reactions['__brigadeiro_original__']) {
        const legacyUsers = reactions['__brigadeiro_original__'] || [];
        reactions[BRIGADEIRO_REACTION] = [
          ...new Set([...(reactions[BRIGADEIRO_REACTION] || []), ...legacyUsers]),
        ];
        delete reactions['__brigadeiro_original__'];
      }

      if (reactions['__brisadeiro_original__']) {
        const legacyUsers = reactions['__brisadeiro_original__'] || [];
        reactions[BRIGADEIRO_REACTION] = [
          ...new Set([...(reactions[BRIGADEIRO_REACTION] || []), ...legacyUsers]),
        ];
        delete reactions['__brisadeiro_original__'];
      }

      const currentUsers = reactions[targetEmoji] || [];

      let updatedUsers: string[];
      if (currentUsers.includes(currentUserRef.current.uid)) {
        updatedUsers = currentUsers.filter((uid) => uid !== currentUserRef.current.uid);
      } else {
        updatedUsers = [...currentUsers, currentUserRef.current.uid];
      }

      if (updatedUsers.length > 0) {
        reactions[targetEmoji] = updatedUsers;
      } else {
        delete reactions[targetEmoji];
      }

      await onUpdateElement(elementId, { reactions });
    },
    [onToggleReaction, onUpdateElement, mirioReactionUnlocked, ditadorReactionUnlocked, brigadeiroReactionUnlocked]
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
        zIndex: getNextZIndex(elements),
        updatedBy: currentUser.uid,
        updatedByName: currentUser.displayName,
      });
      onSelectionChange([newId]);
    },
    [elements, currentUser, onAddElement, onDuplicateElement, onSelectionChange]
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
      // Proteção total com aviso: bloqueados não são recortados e o usuário é notificado.
      const source = targets && targets.length > 0 ? targets : selectedElements;
      const blockedIds = source.filter((el) => el.locked).map((el) => el.id);
      const elemsToCut = source.filter((el) => !el.locked);
      if (blockedIds.length > 0) {
        notifyLockedBlocked(blockedIds, elemsToCut.length > 0);
      }
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
    [readOnly, canCommentOnly, selectedElements, onBatchDeleteElements, onDeleteElement, onSelectionChange, notifyLockedBlocked]
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
                  zIndex: getNextZIndex(elements) + idx,
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

            const richPayload = buildRichPastedElementPayload(
              trimmed,
              { x: targetX, y: targetY },
              getNextZIndex(elements),
              currentUser.uid,
              currentUser.displayName
            );

            if (richPayload) {
              const richId = await onAddElement(richPayload);
              if (richId) onSelectionChange([richId]);
              return;
            }

            const stickyElem: CanvasElement = {
              id: 'elem_' + Math.random().toString(36).substring(2, 11),
              type: 'sticky',
              text: trimmed,
              fill: selectedColor || '#fef08a',
              x: Math.round(targetX - 90),
              y: Math.round(targetY - 90),
              width: 180,
              height: 180,
              zIndex: getNextZIndex(elements),
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
      const idMap = new Map<string, string>();
      const groupMap = new Map<string, string>();
      copiedElements.forEach((elem, idx) => {
        idMap.set(elem.id, 'elem_' + Math.random().toString(36).substring(2, 11) + idx);
        if (elem.groupId && !groupMap.has(elem.groupId)) {
          groupMap.set(elem.groupId, generateGroupId());
        }
      });

      const newElements: CanvasElement[] = copiedElements.map((elem, idx) => {
        const { id: _id, updatedAt: _up, ...rest } = elem;
        const newId = idMap.get(elem.id)!;
        const pasted: CanvasElement = {
          ...rest,
          id: newId,
          x: Math.round(elem.x + dx),
          y: Math.round(elem.y + dy),
          zIndex: getNextZIndex(elements) + idx,
          updatedBy: currentUser.uid,
          updatedByName: currentUser.displayName,
          updatedAt: now,
          ...(elem.groupId ? { groupId: groupMap.get(elem.groupId) } : {}),
        };

        // Remapeia vínculos magnéticos de setas e linhas para os novos nós clonados
        if (pasted.startBinding && idMap.has(pasted.startBinding.elementId)) {
          pasted.startBinding = {
            ...pasted.startBinding,
            elementId: idMap.get(pasted.startBinding.elementId)!,
          };
        }
        if (pasted.endBinding && idMap.has(pasted.endBinding.elementId)) {
          pasted.endBinding = {
            ...pasted.endBinding,
            elementId: idMap.get(pasted.endBinding.elementId)!,
          };
        }

        return pasted;
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
      elements,
      currentUser.uid,
      currentUser.displayName,
      selectedColor,
      onBatchAddElements,
      onAddElement,
      onSelectionChange,
      showCanvasToast,
    ]
  );

  // Organizar ordem de camadas (Z-Index) — swap real + renormalização densa (1..n)
  // Definido antes do efeito de atalhos de teclado (o array de deps avalia na renderização)
  const handleReorderLayer = useCallback(
    (action: 'bringToFront' | 'sendToBack' | 'bringForward' | 'sendBackward') => {
      if (readOnly || canCommentOnly || !selectionSupportsLayerReorder(selectedElements)) return;
      const updates = computeLayerReorderUpdates(
        elements,
        selectedElements.map((el) => el.id),
        action
      );
      if (updates.length === 0) return;
      if (onBatchUpdateElements) {
        onBatchUpdateElements(updates);
      } else {
        updates.forEach((u) => onUpdateElement(u.id, u.updates));
      }
    },
    [readOnly, canCommentOnly, selectedElements, elements, onBatchUpdateElements, onUpdateElement]
  );

  // Iniciar edição inline para textos e post-its a partir do menu ou atalho
  const handleStartEditingElement = useCallback((elemId: string) => {
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
    } else if (elem.type === 'arrow' || elem.type === 'line') {
      const pts = elem.points && elem.points.length >= 4 ? elem.points : [0, 0, 150, 100];
      const midIdx = Math.floor(pts.length / 4) * 2;
      const mx = elem.x + (pts[midIdx] || 0);
      const my = elem.y + (pts[midIdx + 1] || 0);
      setInlineEditing({
        elementId: elem.id,
        type: elem.type,
        worldX: Math.round(mx - 70),
        worldY: Math.round(my - 18),
        width: 140,
        height: 36,
        text: stripMarkdownLinks(elem.text || ''),
        fill: isDarkMode ? '#18181b' : '#ffffff',
        textColor: isDarkMode ? '#fafafa' : '#09090b',
        fontSize: elem.fontSize || 13,
        textAlign: 'center',
      });
    }
  }, [elements, isDarkMode]);

  // Agrupar e Desagrupar seleção (Ctrl+G / Ctrl+Shift+G)
  const handleGroupSelected = useCallback(() => {
    if (readOnly || canCommentOnly || selectedIds.length < 2) return;
    const result = createGroupUpdates(elements, selectedIds);
    if (!result || result.updates.length === 0) return;
    if (onBatchUpdateElements) {
      onBatchUpdateElements(result.updates);
    } else {
      result.updates.forEach((u) => onUpdateElement(u.id, u.updates));
    }
    showCanvasToast('Elementos agrupados', `${result.updates.length} itens agora movem e selecionam juntos.`);
  }, [readOnly, canCommentOnly, selectedIds, elements, onBatchUpdateElements, onUpdateElement, showCanvasToast]);

  const handleUngroupSelected = useCallback(() => {
    if (readOnly || canCommentOnly || selectedIds.length === 0) return;
    const updates = createUngroupUpdates(elements, selectedIds);
    if (updates.length === 0) return;
    if (onBatchUpdateElements) {
      onBatchUpdateElements(updates);
    } else {
      updates.forEach((u) => onUpdateElement(u.id, u.updates));
    }
    showCanvasToast('Grupo desfeito', 'Os elementos voltaram a ser independentes.');
  }, [readOnly, canCommentOnly, selectedIds, elements, onBatchUpdateElements, onUpdateElement, showCanvasToast]);

  const handleCopyStyleSelected = useCallback(() => {
    if (selectedElements.length === 0) return;
    copyElementStyle(selectedElements[0]);
    showCanvasToast('Estilo copiado', 'Use Ctrl+Alt+V para aplicar o estilo em outros elementos.');
  }, [selectedElements, showCanvasToast]);

  const handlePasteStyleSelected = useCallback(() => {
    if (readOnly || canCommentOnly || selectedElements.length === 0) return;
    const updates = buildPasteStyleUpdates(selectedElements);
    if (updates.length === 0) return;
    if (onBatchUpdateElements) {
      onBatchUpdateElements(updates);
    } else {
      updates.forEach((u) => onUpdateElement(u.id, u.updates));
    }
    showCanvasToast('Estilo aplicado', `Formatação colada em ${updates.length} ${updates.length === 1 ? 'item' : 'itens'}.`);
  }, [readOnly, canCommentOnly, selectedElements, onBatchUpdateElements, onUpdateElement, showCanvasToast]);

  // Atalhos de teclado
  useEffect(() => {
    let recentKeysBuffer: string[] = [];

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName) || (e.target as HTMLElement).isContentEditable) {
        return;
      }

      const rawKey = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      recentKeysBuffer = [...recentKeysBuffer, rawKey].slice(-10);

      if (e.code === 'Space') {
        setIsSpacePressed(true);
      }

      // Interação estilo planilha quando uma Tabela Editável está selecionada:
      // digitar qualquer caractere, Enter, F2, Tab ou Setas opera direto na célula ativa sem disparar atalhos globais de ferramentas!
      if (
        !readOnly &&
        !canCommentOnly &&
        !inlineEditing &&
        !widgetFieldEditorRef.current &&
        selectedElements.length === 1 &&
        selectedElements[0].type === 'table' &&
        !selectedElements[0].locked
      ) {
        const tableEl = selectedElements[0];
        const rows = normalizeTableData(tableEl.tableData);
        const rowCount = rows.length;
        const colCount = rows[0]?.length || 3;
        const curCell =
          activeTableCellRef.current?.elementId === tableEl.id
            ? {
                rowIdx: Math.max(0, Math.min(rowCount - 1, activeTableCellRef.current.rowIdx)),
                colIdx: Math.max(0, Math.min(colCount - 1, activeTableCellRef.current.colIdx)),
              }
            : { rowIdx: Math.min(1, rowCount - 1), colIdx: 0 };

        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          if (e.key === 'Enter' || e.key === 'F2') {
            e.preventDefault();
            e.stopImmediatePropagation();
            openTableCellEditorByCoords(tableEl, curCell.rowIdx, curCell.colIdx, {
              selectAll: true,
            });
            return;
          }

          if (e.key === 'Tab') {
            e.preventDefault();
            e.stopImmediatePropagation();
            const total = rowCount * colCount;
            const flat =
              (curCell.rowIdx * colCount + curCell.colIdx + (e.shiftKey ? -1 : 1) + total) % total;
            const nextCell = {
              elementId: tableEl.id,
              rowIdx: Math.floor(flat / colCount),
              colIdx: flat % colCount,
            };
            activeTableCellRef.current = nextCell;
            setActiveTableCell(nextCell);
            return;
          }

          if (
            activeTableCellRef.current?.elementId === tableEl.id &&
            !e.shiftKey &&
            ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)
          ) {
            e.preventDefault();
            e.stopImmediatePropagation();
            const dRow = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
            const dCol = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0;
            const nextCell = {
              elementId: tableEl.id,
              rowIdx: Math.max(0, Math.min(rowCount - 1, curCell.rowIdx + dRow)),
              colIdx: Math.max(0, Math.min(colCount - 1, curCell.colIdx + dCol)),
            };
            activeTableCellRef.current = nextCell;
            setActiveTableCell(nextCell);
            return;
          }

          if (e.key === 'Backspace' && activeTableCellRef.current?.elementId === tableEl.id) {
            e.preventDefault();
            e.stopImmediatePropagation();
            onUpdateElement(tableEl.id, updateTableCell(tableEl, curCell.rowIdx, curCell.colIdx, ''));
            openTableCellEditorByCoords(tableEl, curCell.rowIdx, curCell.colIdx, {
              initialValue: '',
              selectAll: false,
            });
            return;
          }

          if (e.key.length === 1 && e.code !== 'Space' && e.key !== '?') {
            e.preventDefault();
            e.stopImmediatePropagation();
            openTableCellEditorByCoords(tableEl, curCell.rowIdx, curCell.colIdx, {
              initialValue: e.key,
              selectAll: false,
            });
            return;
          }
        }
      }

      // Deletar seleção
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (readOnly) return;
        if (selectedIds.length > 0) {
          // Proteção total: elementos bloqueados não são apagados (desbloqueie primeiro),
          // mas o usuário é avisado — nada acontece em silêncio.
          const blockedIds: string[] = [];
          const idsToDelete = selectedIds.filter((id) => {
            const el = elements.find((item) => item.id === id);
            if (!el) return false;
            if (el.locked) {
              blockedIds.push(id);
              return false;
            }
            return canCommentOnly ? el.updatedBy === currentUser.uid : true;
          });

          if (blockedIds.length > 0) {
            notifyLockedBlocked(blockedIds, idsToDelete.length > 0);
          }

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
        activeTableCellRef.current = null;
        setActiveTableCell(null);
        onSelectionChange([]);
      }

      // Mapa Mental: Tab cria nó filho conectado e Enter (em nós filhos) cria nó irmão
      if (
        (e.key === 'Tab' || e.key === 'Enter') &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        !readOnly &&
        !canCommentOnly &&
        selectedElements.length === 1 &&
        !inlineEditing &&
        isMindMapNode(selectedElements[0])
      ) {
        if (e.key === 'Tab') {
          e.preventDefault();
          void spawnMindMapRelative(selectedElements[0].id, 'child');
          return;
        }
        if (e.key === 'Enter' && !e.shiftKey && selectedElements[0].mindmapParentId) {
          e.preventDefault();
          void spawnMindMapRelative(selectedElements[0].id, 'sibling');
          return;
        }
      }

      // Iniciar edição de texto no elemento selecionado com Enter (Post-it, Forma, Texto, Seta)
      if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
        if (!readOnly && !canCommentOnly && selectedElements.length === 1 && !inlineEditing) {
          const sel = selectedElements[0];
          if (!sel.locked && (isGeometricShape(sel.type) || ['sticky', 'text', 'frame', 'arrow', 'line'].includes(sel.type))) {
            e.preventDefault();
            handleStartEditingElement(sel.id);
            return;
          }
        }
      }

      // Buscar texto no quadro: Ctrl+F / Cmd+F
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && (e.key === 'f' || e.key === 'F')) {
        if (onOpenSearch) {
          e.preventDefault();
          onOpenSearch();
          return;
        }
      }

      // Alternar Minimapa: M
      if (!e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey && (e.key === 'm' || e.key === 'M')) {
        if (onToggleMinimap) {
          e.preventDefault();
          onToggleMinimap();
          return;
        }
      }

      // Agrupar / Desagrupar: Ctrl+G e Ctrl+Shift+G
      if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === 'g' || e.key === 'G')) {
        if (!readOnly && !canCommentOnly) {
          e.preventDefault();
          if (e.shiftKey) {
            handleUngroupSelected();
          } else {
            handleGroupSelected();
          }
          return;
        }
      }

      // Copiar / Colar Estilo: Ctrl+Alt+C e Ctrl+Alt+V
      if ((e.ctrlKey || e.metaKey) && e.altKey && !e.shiftKey) {
        const k = e.key.toLowerCase();
        if (k === 'c' && selectedElements.length >= 1) {
          e.preventDefault();
          handleCopyStyleSelected();
          return;
        }
        if (k === 'v' && hasCopiedElementStyle() && selectedElements.length >= 1 && !readOnly && !canCommentOnly) {
          e.preventDefault();
          handlePasteStyleSelected();
          return;
        }
      }

      // Atalho de Ajuda / Atalhos (?)
      if ((e.key === '?' || (e.shiftKey && e.key === '/')) && onOpenShortcuts) {
        e.preventDefault();
        onOpenShortcuts();
        return;
      }

      // Camadas (mesma lógica do menu): ] traz para o extremo da frente, [ envia
      // para o fundo da pilha. Detecção robusta a layouts (US/ABNT/ABNT2) —
      // e.key primeiro, e.code como fallback (ver resolveLayerShortcut).
      // Imagens (sticker) e GIFs não participam da pilha — atalho ignorado para eles.
      const layerShortcutAction = resolveLayerShortcut(e);
      if (layerShortcutAction) {
        if (readOnly || canCommentOnly || !selectionSupportsLayerReorder(selectedElements)) return;
        e.preventDefault();
        handleReorderLayer(layerShortcutAction);
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

      // Alternar Guias Inteligentes e Encaixe Magnético: Shift+S ou Ctrl+;
      if (
        ((e.ctrlKey || e.metaKey) && (e.key === ';' || e.code === 'Semicolon')) ||
        (!e.ctrlKey && !e.metaKey && !e.altKey && e.shiftKey && (e.key === 'S' || e.key === 's'))
      ) {
        e.preventDefault();
        onToggleSmartGuides?.();
        return;
      }

      // Alternar Desenho Inteligente (Formas Automáticas): Shift+P
      if (!e.ctrlKey && !e.metaKey && !e.altKey && e.shiftKey && (e.key === 'P' || e.key === 'p')) {
        e.preventDefault();
        const nextState = !smartDrawing;
        onToggleSmartDrawing?.();
        showCanvasToast(
          nextState ? 'Desenho Inteligente: Ativado' : 'Desenho Inteligente: Desativado',
          nextState
            ? 'Rabiscos de círculos, retângulos, triângulos e setas serão convertidos em formas perfeitas.'
            : 'Seus traços livres serão preservados exatamente como desenhados.',
          'info',
          2500
        );
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
        if (!readOnly && (e.key === 'k' || e.key === 'K')) onSelectTool('comment');
        if (!readOnly && (e.key === 'c' || e.key === 'C')) onSelectTool('checklist');
        if (!readOnly && !canCommentOnly) {
          if (e.key === 'f' || e.key === 'F') onSelectTool('frame');
          if (e.key === 'r' || e.key === 'R') onSelectTool('rect');
          if (e.key === 'o' || e.key === 'O') onSelectTool('circle');
          if (e.key === 'a' || e.key === 'A') {
            if (e.shiftKey) {
              onSelectTool('line');
            } else {
              onSelectTool('arrow');
            }
          }
          if (!e.shiftKey && (e.key === 'p' || e.key === 'P')) onSelectTool('pen');
          if (e.key === 't' || e.key === 'T') {
            if (e.shiftKey && onOpenTemplates) {
              e.preventDefault();
              onOpenTemplates();
            } else {
              onSelectTool('text');
            }
          }
          if ((e.key === 's' || e.key === 'S') && onOpenTemplates) {
            const isBrisadeiroTyping = recentKeysBuffer.slice(-4, -1).join('') === 'bri';
            if (!isBrisadeiroTyping) {
              e.preventDefault();
              onOpenTemplates();
            }
          }
          if (e.key === 'e' || e.key === 'E') onSelectTool('eraser');
          if ((e.key === 'u' || e.key === 'U') && onOpenStickers) {
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
    onOpenTemplates,
    onOpenStickers,
    onSelectTool,
    onSelectionChange,
    handleBatchDuplicate,
    handleCopy,
    handleCut,
    handlePaste,
    handleReorderLayer,
    onToggleGrid,
    onToggleSmartGuides,
    onToggleSmartDrawing,
    notifyLockedBlocked,
    currentTool,
    inlineEditing,
    smartDrawing,
    handleStartEditingElement,
    showCanvasToast,
    handlePasteStyleSelected,
    onToggleMinimap,
    handleCopyStyleSelected,
    handleGroupSelected,
    handleUngroupSelected,
    onOpenSearch,
    spawnMindMapRelative,
    openTableCellEditorByCoords,
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

    if (widgetFieldEditorRef.current) {
      commitWidgetFieldEditor();
    }

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
        onSelectionChange(expandSelectionWithGroups(elements, [...selectedIds, elemId]));
      }
    } else {
      if (!selectedIds.includes(elemId)) {
        onSelectionChange(expandSelectionWithGroups(elements, [elemId]));
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

  // Atualização de elemento com suporte automático a delta em lote e reconexão magnética de setas
  const handleElementChange = useCallback((elemId: string, updates: Partial<CanvasElement>) => {
    // Se o elemento é parte de uma multisseleção ou é uma moldura com filhos contidos arrastados
    const isMulti = selectedIds.includes(elemId) && selectedIds.length > 1;
    const frameChildIds = [...(draggedFrameChildIdsRef.current || [])];
    const hasFrameChildren = frameChildIds.length > 0;

    if (
      updates.x !== undefined &&
      updates.y !== undefined &&
      (isMulti || hasFrameChildren)
    ) {
      const originElem = elementsById.get(elemId) || elements.find((e) => e.id === elemId);
      if (originElem) {
        const dx = updates.x - originElem.x;
        const dy = updates.y - originElem.y;

        const allTargetIds = isMulti
          ? Array.from(new Set([...selectedIds, ...frameChildIds]))
          : [elemId, ...frameChildIds];

        // Previne chamadas duplicadas simultâneas causadas por término de arraste múltiplo no mesmo instante
        const batchKey = `${allTargetIds.length}:${Math.round(dx)}:${Math.round(dy)}`;
        const now = Date.now();
        if (
          lastBatchUpdateRef.current &&
          now - lastBatchUpdateRef.current.timestamp < 150 &&
          lastBatchUpdateRef.current.key === batchKey
        ) {
          return;
        }
        lastBatchUpdateRef.current = { timestamp: now, key: batchKey };

        const batchUpdates = allTargetIds
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

        // Atualiza todas as setas e conectores vinculados a qualquer elemento da seleção
        const movedElements = batchUpdates.map((u) => {
          const base = elementsById.get(u.id) || elements.find((e) => e.id === u.id);
          return { ...base, ...u.updates } as CanvasElement;
        });
        const arrowUpdates = getConnectedArrowUpdatesOnMove(movedElements, elements);
        const fullBatch = [...batchUpdates, ...arrowUpdates];

        if (onBatchUpdateElements) {
          onBatchUpdateElements(fullBatch);
        } else {
          fullBatch.forEach((u) => onUpdateElement(u.id, u.updates));
        }
        draggedFrameChildIdsRef.current = [];
        return;
      }
    }

    // Movimento ou redimensionamento de elemento individual com reconexão de setas
    const currentElem = elementsById.get(elemId) || elements.find((e) => e.id === elemId);
    if (
      currentElem &&
      (updates.x !== undefined ||
        updates.y !== undefined ||
        updates.width !== undefined ||
        updates.height !== undefined ||
        updates.radius !== undefined)
    ) {
      const updatedElem = { ...currentElem, ...updates } as CanvasElement;
      const arrowUpdates = getConnectedArrowUpdatesOnMove([updatedElem], elements);
      if (arrowUpdates.length > 0) {
        const fullBatch = [{ id: elemId, updates }, ...arrowUpdates];
        if (onBatchUpdateElements) {
          onBatchUpdateElements(fullBatch);
        } else {
          fullBatch.forEach((u) => onUpdateElement(u.id, u.updates));
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
                  // Mantém a camada do traço original (renormalização cuida dos empates)
                  zIndex: el.zIndex || 1,
                  updatedBy: currentUser.uid,
                  updatedByName: currentUser.displayName,
                  // Desempate determinístico: garante a ordem dos pedaços entre si
                  updatedAt: Date.now() + idx,
                });
              });
            }
            continue;
          }

          // B. Formas geométricas e desenhos de Smart Drawing (círculo, retângulo, triângulo, seta, linha, etc.)
          const isDrawableShape =
            isGeometricShape(el.type) ||
            el.type === 'arrow' ||
            el.type === 'line';

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

    isMouseDownRef.current = true;
    if (isDraggableStage || currentTool === 'laser') {
      setIsMouseDownState(true);
    }
    onCanvasClick?.();
    const isClickedOnStage = e.target === stageRef.current;
    const worldPos = getPointerWorldPos();

    if (inlineEditing) {
      handleFinishEditing();
    }

    if (widgetFieldEditorRef.current) {
      commitWidgetFieldEditor();
    }

    if (activeChecklistEditorRef.current) {
      const editor = activeChecklistEditorRef.current;
      const clickedOnChecklist =
        !isClickedOnStage &&
        (e.target.id() === editor.elementId ||
          Boolean(e.target.findAncestor?.((node: Konva.Node) => node.id() === editor.elementId)));

      if (!clickedOnChecklist) {
        const elem = elementsRef.current.find((el) => el.id === editor.elementId);
        if (elem) {
          const isTitle = editor.target === 'title';
          if (isTitle) {
            onUpdateElement(elem.id, {
              checklistTitle: editor.text.trim() || 'Lista de Tarefas',
              updatedAt: Date.now(),
            });
          } else {
            const currentItems = elem.checklistItems || [];
            const updated = currentItems.map((item) =>
              item.id === editor.target ? { ...item, text: editor.text } : item
            );
            onUpdateElement(elem.id, {
              checklistItems: updated,
              updatedAt: Date.now(),
            });
          }
        }
        setActiveChecklistEditor(null);
      }
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
    if (canCommentOnly && currentTool !== 'select' && currentTool !== 'sticky' && currentTool !== 'comment') {
      return;
    }

    // Criação imediata de Comentário Fixado em Thread em qualquer ponto do quadro
    if (currentTool === 'comment') {
      const commentId = await onAddElement({
        type: 'comment',
        x: Math.round(worldPos.x),
        y: Math.round(worldPos.y - 36),
        width: 38,
        height: 38,
        text: '',
        commentAuthorColor: currentUser.color || '#2563eb',
        commentResolved: false,
        commentReplies: [],
        zIndex: getNextZIndex(elements) + 100,
        updatedBy: currentUser.uid,
        updatedByName: currentUser.displayName,
      });
      if (commentId) {
        onSelectionChange([commentId]);
        setActiveCommentThreadId(commentId);
      }
      onSelectTool('select');
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
        zIndex: getNextZIndex(elements),
        updatedBy: currentUser.uid,
        updatedByName: currentUser.displayName,
        updatedAt: 0,
      };
      setDrawingElement(newFreeDraw);
      return;
    }

    // Seta e Linha por arraste com encaixe magnético inteligente
    if (currentTool === 'arrow' || currentTool === 'line') {
      isDrawing.current = true;
      const snap = findNearestSnapAnchor(worldPos, elements, 32);
      const startX = snap ? snap.anchorPoint.x : worldPos.x;
      const startY = snap ? snap.anchorPoint.y : worldPos.y;
      const newLineOrArrow: CanvasElement = {
        id: 'temp_' + currentTool,
        type: currentTool,
        x: Math.round(startX),
        y: Math.round(startY),
        points: [0, 0, 0, 0],
        startBinding: snap ? { elementId: snap.element.id, side: snap.side } : undefined,
        connectorStyle: 'straight',
        stroke: selectedColor || '#2563eb',
        strokeWidth: 3,
        zIndex: getNextZIndex(elements),
        updatedBy: currentUser.uid,
        updatedByName: currentUser.displayName,
        updatedAt: 0,
      };
      setDrawingElement(newLineOrArrow);
      return;
    }

    // Criação e dimensionamento interativo de Formas Geométricas por clique e arraste (Figma / Miro style)
    if (isGeometricShape(currentTool)) {
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
          activeTableCellRef.current = null;
          setActiveTableCell(null);
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
          zIndex: getNextZIndex(elements),
          updatedBy: currentUser.uid,
          updatedByName: currentUser.displayName,
        });
        onSelectionChange([id]);
        onSelectTool('select');
      } else if (currentTool === 'checklist') {
        const posX = Math.round(worldPos.x - 130);
        const posY = Math.round(worldPos.y - 105);
        const defaultItems = createDefaultChecklistItems();
        const id = await onAddElement({
          type: 'checklist',
          x: posX,
          y: posY,
          width: 260,
          height: computeChecklistHeight(defaultItems.length),
          fill: selectedColor || '#ffffff',
          checklistTitle: 'Lista de Tarefas',
          checklistItems: defaultItems,
          zIndex: getNextZIndex(elements),
          updatedBy: currentUser.uid,
          updatedByName: currentUser.displayName,
        });
        onSelectionChange([id]);
        onSelectTool('select');
      } else if (currentTool === 'table') {
        const defaultData = createDefaultTableData();
        const dims = computeTableDimensions(defaultData);
        const id = await onAddElement({
          type: 'table',
          x: Math.round(worldPos.x - dims.width / 2),
          y: Math.round(worldPos.y - dims.height / 2),
          width: dims.width,
          height: dims.height,
          tableData: defaultData,
          tableColWidths: dims.colWidths,
          tableHeaderRow: true,
          zIndex: getNextZIndex(elements),
          updatedBy: currentUser.uid,
          updatedByName: currentUser.displayName,
        });
        if (id) {
          const initialCell = { elementId: id, rowIdx: 1, colIdx: 0 };
          activeTableCellRef.current = initialCell;
          setActiveTableCell(initialCell);
        }
        onSelectionChange([id]);
        onSelectTool('select');
      } else if (currentTool === 'kanban') {
        const cols = createDefaultKanbanColumns();
        const dims = computeKanbanDimensions(cols);
        const id = await onAddElement({
          type: 'kanban',
          x: Math.round(worldPos.x - dims.width / 2),
          y: Math.round(worldPos.y - dims.height / 2),
          width: dims.width,
          height: dims.height,
          kanbanTitle: 'Quadro Kanban',
          kanbanColumns: cols,
          zIndex: getNextZIndex(elements),
          updatedBy: currentUser.uid,
          updatedByName: currentUser.displayName,
        });
        onSelectionChange([id]);
        onSelectTool('select');
      } else if (currentTool === 'mindmap') {
        const payload = createMindMapRootPayload(
          worldPos.x,
          worldPos.y,
          getNextZIndex(elements),
          currentUser.uid,
          currentUser.displayName
        );
        const id = await onAddElement(payload);
        onSelectionChange([id]);
        onSelectTool('select');
        showCanvasToast(
          'Mapa Mental criado',
          'Pressione Tab para adicionar nós filhos conectados e Enter para nós irmãos.',
          'info',
          2600
        );
      } else if (currentTool === 'code') {
        const id = await onAddElement({
          type: 'code',
          x: Math.round(worldPos.x - 220),
          y: Math.round(worldPos.y - 80),
          width: 440,
          height: 176,
          text: getDefaultCodeSnippet('typescript'),
          codeLanguage: 'typescript',
          codeTheme: 'dark',
          fontSize: 13,
          zIndex: getNextZIndex(elements),
          updatedBy: currentUser.uid,
          updatedByName: currentUser.displayName,
        });
        onSelectionChange([id]);
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
          zIndex: getNextZIndex(elements),
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
          zIndex: getNextZIndex(elements),
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

    // Se estiver em modo somente leitura (view): bloqueia ferramentas de criação e modificação de elementos
    if (readOnly) {
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
      if (isGeometricShape(currentTool)) {
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
            zIndex: getNextZIndex(elements),
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
      } else if (drawingElement.type === 'arrow' || drawingElement.type === 'line') {
        const snap = findNearestSnapAnchor(
          worldPos,
          elements,
          36,
          drawingElement.startBinding?.elementId
        );
        setSnapTargetAnchor(snap ? snap.anchorPoint : null);

        const targetX = snap ? snap.anchorPoint.x : worldPos.x;
        const targetY = snap ? snap.anchorPoint.y : worldPos.y;

        const updatedArrow: CanvasElement = {
          ...drawingElement,
          points: [0, 0, targetX - drawingElement.x, targetY - drawingElement.y],
          endBinding: snap ? { elementId: snap.element.id, side: snap.side } : undefined,
        };

        const elementMap = new Map<string, CanvasElement>();
        for (const el of elements) elementMap.set(el.id, el);

        const geom = resolveConnectorGeometry(updatedArrow, elementMap);
        const relPoints = geom.routePoints.map((val, idx) =>
          idx % 2 === 0 ? Math.round(val - geom.worldStart.x) : Math.round(val - geom.worldStart.y)
        );

        setDrawingElement({
          ...updatedArrow,
          x: Math.round(geom.worldStart.x),
          y: Math.round(geom.worldStart.y),
          points: relPoints,
        });
      }
    });
  };

  // Soltar botão do mouse
  const handleMouseUp = async (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (isMouseDownRef.current) {
      isMouseDownRef.current = false;
      setIsMouseDownState((prev) => (prev ? false : prev));
    }

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
              zIndex: getNextZIndex(elements),
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
              zIndex: getNextZIndex(elements),
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
              zIndex: getNextZIndex(elements),
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
              zIndex: getNextZIndex(elements),
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
              zIndex: getNextZIndex(elements),
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
            zIndex: getNextZIndex(elements),
            updatedBy: currentUser.uid,
            updatedByName: currentUser.displayName,
          });
        }
        // Não seleciona o elemento recém-criado: o usuário continua em modo caneta pronto para o próximo traço!
      } else if (
        finishedDrawing &&
        (finishedDrawing.type === 'arrow' || finishedDrawing.type === 'line') &&
        finishedDrawing.points
      ) {
        setSnapTargetAnchor(null);
        const lastX = finishedDrawing.points[finishedDrawing.points.length - 2];
        const lastY = finishedDrawing.points[finishedDrawing.points.length - 1];
        const dist = Math.hypot(lastX - finishedDrawing.points[0], lastY - finishedDrawing.points[1]);
        if (dist >= 8 || finishedDrawing.startBinding || finishedDrawing.endBinding) {
          const id = await onAddElement({
            type: finishedDrawing.type,
            x: Math.round(finishedDrawing.x),
            y: Math.round(finishedDrawing.y),
            points: finishedDrawing.points.map((p) => Math.round(p)),
            startBinding: finishedDrawing.startBinding,
            endBinding: finishedDrawing.endBinding,
            connectorStyle: finishedDrawing.connectorStyle || 'straight',
            stroke: finishedDrawing.stroke,
            strokeWidth: finishedDrawing.strokeWidth,
            zIndex: getNextZIndex(elements),
            updatedBy: currentUser.uid,
            updatedByName: currentUser.displayName,
          });
          onSelectionChange([id]);
        }
        onSelectTool('select');
      } else if (
        isGeometricShape(currentTool) ||
        Boolean(finishedDrawing && isGeometricShape(finishedDrawing.type))
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
          zIndex: getNextZIndex(elements),
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

    if (isGeometricShape(elem.type)) {
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
      return;
    }

    if (elem.type === 'arrow' || elem.type === 'line') {
      setInlineEditing({
        elementId: id,
        type: elem.type,
        worldX: x,
        worldY: y,
        width,
        height,
        text: cleanText,
        fill: isDarkMode ? '#18181b' : '#ffffff',
        fontSize: elem.fontSize || 13,
        textAlign: 'center',
        textColor: elem.textColor || (isDarkMode ? '#fafafa' : '#09090b'),
      });
    }
  }, [isDarkMode]);

  // Hook modular para arraste e reconexão magnética das extremidades de setas e linhas
  const { handleArrowEndpointDragMove, handleArrowEndpointDragEnd } = useConnectorEndpointDrag({
    elementsRef,
    elementMap,
    onUpdateElement,
    setSnapTargetAnchor,
  });

  const triggerCanvasConfetti = useCallback((worldX: number, worldY: number) => {
    try {
      const screenX = (worldX * scale + stagePos.x) / window.innerWidth;
      const screenY = (worldY * scale + stagePos.y) / window.innerHeight;
      confetti({
        particleCount: 50,
        spread: 60,
        origin: {
          x: Math.max(0.05, Math.min(0.95, screenX)),
          y: Math.max(0.05, Math.min(0.95, screenY)),
        },
        disableForReducedMotion: true,
      });
    } catch {
      // Silencioso se bloqueado
    }
  }, [scale, stagePos]);

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

  // A ordem visual é controlada pelo zIndex persistido (com desempate determinístico), inclusive para molduras.
  const sortedElements = React.useMemo(
    () => sortElementsByLayer(liveErasedElements || elements),
    [liveErasedElements, elements]
  );

  // Culling no nível React: em boards grandes (150+), monta apenas os componentes
  // Konva do viewport + margem generosa (600px). Coordenadas são quantizadas para que
  // micro-movimentos do pan/zoom não invalidem nem remontem os nós React a cada pixel.
  const quantizedStageX = Math.round(stagePos.x / 180) * 180;
  const quantizedStageY = Math.round(stagePos.y / 180) * 180;
  const quantizedScale = Math.round(scale * 10) / 10;

  const activeWidgetEditorElementId = widgetFieldEditor?.elementId ?? null;
  const activeKanbanEditorTarget =
    widgetFieldEditor?.kind === 'kanban' ? widgetFieldEditor.target : null;
  const activeTableEditorRow =
    widgetFieldEditor?.kind === 'table' ? widgetFieldEditor.rowIdx : null;
  const activeTableEditorCol =
    widgetFieldEditor?.kind === 'table' ? widgetFieldEditor.colIdx : null;

  const mountedElements = React.useMemo(() => {
    const REACT_CULL_THRESHOLD = 150;
    if (sortedElements.length <= REACT_CULL_THRESHOLD) return sortedElements;
    const viewport = { x: quantizedStageX, y: quantizedStageY, scale: quantizedScale };
    const viewW = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const viewH = typeof window !== 'undefined' ? window.innerHeight : 720;
    const alwaysMounted = new Set(selectedIds);
    if (inlineEditing) alwaysMounted.add(inlineEditing.elementId);
    if (activeWidgetEditorElementId) alwaysMounted.add(activeWidgetEditorElementId);
    for (const el of sortedElements) {
      if (
        (el.startBinding && alwaysMounted.has(el.startBinding.elementId)) ||
        (el.endBinding && alwaysMounted.has(el.endBinding.elementId))
      ) {
        alwaysMounted.add(el.id);
      }
    }
    return sortedElements.filter((el) => {
      if (alwaysMounted.has(el.id)) return true;
      return isBoundsInViewport(getElementWorldBounds(el), viewport, viewW, viewH, 600);
    });
  }, [sortedElements, quantizedStageX, quantizedStageY, quantizedScale, selectedIds, inlineEditing, activeWidgetEditorElementId]);

  const handleOpenReactionPicker = useCallback(
    (elementId: string, anchor: { x: number; y: number }, mode?: 'picker' | 'overflow') => {
      setReactionPickerTarget({ elementId, anchor, mode });
    },
    []
  );

  // Keep the element subtree stable while only the camera moves. This lets Konva
  // update the stage transform without recreating every React-Konva child.
  const renderedElements = React.useMemo(
    () =>
      mountedElements.map((elem) => {
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
              canEdit={canEditItem}
              currentUserId={currentUser.uid}
              mirioReactionUnlocked={mirioReactionUnlocked}
              ditadorReactionUnlocked={ditadorReactionUnlocked}
              brigadeiroReactionUnlocked={brigadeiroReactionUnlocked}
              onSelect={handlers.onSelect}
              onChange={handlers.onChange}
              onToggleReaction={handleToggleReactionInternal}
              onOpenReactionPicker={handleOpenReactionPicker}
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
              mirioReactionUnlocked={mirioReactionUnlocked}
              ditadorReactionUnlocked={ditadorReactionUnlocked}
              brigadeiroReactionUnlocked={brigadeiroReactionUnlocked}
              onSelect={handlers.onSelect}
              onChange={handlers.onChange}
              onToggleReaction={handleToggleReactionInternal}
              onOpenReactionPicker={handleOpenReactionPicker}
              onStartEditing={handlers.onStartEditing}
            />
          );
        }

        if (elem.type === 'checklist') {
          return (
            <ChecklistItem
              key={elem.id}
              element={elem}
              isSelected={isSelected}
              userSelectionColor={userSelectionColor}
              remoteSelector={remoteSelector}
              draggable={canDragItem}
              canEdit={canEditItem}
              currentUserId={currentUser.uid}
              mirioReactionUnlocked={mirioReactionUnlocked}
              ditadorReactionUnlocked={ditadorReactionUnlocked}
              brigadeiroReactionUnlocked={brigadeiroReactionUnlocked}
              onSelect={handlers.onSelect}
              onChange={handlers.onChange}
              onStartEditingItem={(elementId, target, initialText, itemY) => {
                setActiveChecklistEditor({
                  elementId,
                  target,
                  text: initialText,
                  itemY,
                });
              }}
              onCelebration={(cx, cy) => {
                triggerCanvasConfetti(cx, cy);
              }}
              onToggleReaction={handleToggleReactionInternal}
              onOpenReactionPicker={handleOpenReactionPicker}
            />
          );
        }

        if (isGeometricShape(elem.type)) {
          return (
            <ShapeItem
              key={elem.id}
              element={elem}
              isSelected={isSelected}
              userSelectionColor={userSelectionColor}
              remoteSelector={remoteSelector}
              draggable={canDragItem}
              canEdit={canEditItem}
              currentUserId={currentUser.uid}
              mirioReactionUnlocked={mirioReactionUnlocked}
              ditadorReactionUnlocked={ditadorReactionUnlocked}
              brigadeiroReactionUnlocked={brigadeiroReactionUnlocked}
              onSelect={handlers.onSelect}
              onChange={handlers.onChange}
              onStartEditing={handlers.onStartEditing}
              onToggleReaction={handleToggleReactionInternal}
              onOpenReactionPicker={handleOpenReactionPicker}
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
              canEdit={canEditItem}
              isDark={isDarkMode}
              allElements={elements}
              elementMap={elementMap}
              onSelect={handlers.onSelect}
              onChange={handlers.onChange}
              onStartEditing={handlers.onStartEditing}
              onEndpointDragMove={handleArrowEndpointDragMove}
              onEndpointDragEnd={handleArrowEndpointDragEnd}
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
              currentUserId={currentUser.uid}
              mirioReactionUnlocked={mirioReactionUnlocked}
              ditadorReactionUnlocked={ditadorReactionUnlocked}
              brigadeiroReactionUnlocked={brigadeiroReactionUnlocked}
              onSelect={handlers.onSelect}
              onChange={handlers.onChange}
              onStartEditing={handlers.onStartEditing}
              onToggleReaction={handleToggleReactionInternal}
              onOpenReactionPicker={handleOpenReactionPicker}
            />
          );
        }

        if (elem.type === 'comment') {
          const canMovePin =
            currentTool === 'select' &&
            !readOnly &&
            (canCommentOnly ? isOwnElement : !elem.locked);
          return (
            <CommentPinItem
              key={elem.id}
              element={elem}
              isSelected={isSelected}
              isActiveThread={activeCommentThreadId === elem.id}
              draggable={canMovePin}
              onSelect={handlers.onSelect}
              onChange={handlers.onChange}
              onOpenThread={handleOpenCommentThread}
            />
          );
        }

        if (elem.type === 'table') {
          const tableActiveCell =
            activeTableCell?.elementId === elem.id
              ? { rowIdx: activeTableCell.rowIdx, colIdx: activeTableCell.colIdx }
              : null;
          const tableEditingCell =
            activeWidgetEditorElementId === elem.id &&
            activeTableEditorRow !== null &&
            activeTableEditorCol !== null
              ? { rowIdx: activeTableEditorRow, colIdx: activeTableEditorCol }
              : null;
          return (
            <TableItem
              key={elem.id}
              element={elem}
              isSelected={isSelected}
              userSelectionColor={userSelectionColor}
              remoteSelector={remoteSelector}
              draggable={canDragItem}
              canEdit={canEditItem}
              isDark={isDarkMode}
              activeCell={tableActiveCell}
              editingCell={tableEditingCell}
              onSelectCell={handleSelectTableCell}
              onCommitActiveEdit={commitWidgetFieldEditor}
              onSelect={handlers.onSelect}
              onChange={handlers.onChange}
              onEditCell={handleEditTableCell}
            />
          );
        }

        if (elem.type === 'kanban') {
          const activeKanbanTarget =
            activeWidgetEditorElementId === elem.id ? activeKanbanEditorTarget : null;
          return (
            <KanbanItem
              key={elem.id}
              element={elem}
              isSelected={isSelected}
              userSelectionColor={userSelectionColor}
              remoteSelector={remoteSelector}
              draggable={canDragItem}
              canEdit={canEditItem}
              isDark={isDarkMode}
              activeEditingTarget={activeKanbanTarget}
              onCommitActiveEdit={commitWidgetFieldEditor}
              onSelect={handlers.onSelect}
              onChange={handlers.onChange}
              onEditKanbanField={handleEditKanbanField}
            />
          );
        }

        if (elem.type === 'code') {
          return (
            <CodeBlockItem
              key={elem.id}
              element={elem}
              isSelected={isSelected}
              userSelectionColor={userSelectionColor}
              remoteSelector={remoteSelector}
              draggable={canDragItem}
              canEdit={canEditItem}
              onSelect={handlers.onSelect}
              onChange={handlers.onChange}
              onEditCode={handleEditCodeBlock}
            />
          );
        }

        if (elem.type === 'embed') {
          return (
            <RichLinkCardItem
              key={elem.id}
              element={elem}
              isSelected={isSelected}
              userSelectionColor={userSelectionColor}
              remoteSelector={remoteSelector}
              draggable={canDragItem}
              isDark={isDarkMode}
              onSelect={handlers.onSelect}
              onChange={handlers.onChange}
            />
          );
        }

        return null;
      }),
    [
      mountedElements,
      elements,
      elementMap,
      selectedIds,
      remoteSelectionMap,
      currentUser.uid,
      currentTool,
      readOnly,
      canCommentOnly,
      userSelectionColor,
      inlineEditing?.elementId,
      handleToggleReactionInternal,
      handleOpenReactionPicker,
      triggerCanvasConfetti,
      getItemHandlers,
      mirioReactionUnlocked,
      ditadorReactionUnlocked,
      brigadeiroReactionUnlocked,
      isDarkMode,
      handleArrowEndpointDragMove,
      handleArrowEndpointDragEnd,
      activeCommentThreadId,
      handleOpenCommentThread,
      handleEditTableCell,
      handleSelectTableCell,
      handleEditKanbanField,
      handleEditCodeBlock,
      commitWidgetFieldEditor,
      activeWidgetEditorElementId,
      activeKanbanEditorTarget,
      activeTableCell,
      activeTableEditorRow,
      activeTableEditorCol,
    ]
  );

  // Atualiza frustum culling sempre que a lista de elementos do quadro muda
  useLayoutEffect(() => {
    syncVisibleElements(stagePosRef.current, scaleRef.current);
    stageRef.current?.batchDraw();
  }, [renderedElements]);

  // Resolução de nomes para tooltip de reações e colaboração
  const resolveUserName = useCallback(
    (userId: string): string => {
      if (userId === currentUser.uid) return 'Você';
      const remote = remoteUsers.find((u) => u.userId === userId);
      if (remote?.name) return remote.name;
      if (boardMembers?.[userId]?.name) return boardMembers[userId].name;
      if (boardOwner?.id === userId && boardOwner?.name) return boardOwner.name;
      return 'Participante';
    },
    [currentUser.uid, remoteUsers, boardMembers, boardOwner]
  );

  // Resolve a foto do participante pelo ID (presença ao vivo, membros ou dono do quadro)
  const resolveUserPhoto = useCallback(
    (userId: string): string | null => {
      if (userId === currentUser.uid) return currentUser.photoURL || null;
      const remote = remoteUsers.find((u) => u.userId === userId);
      if (remote?.photoURL) return remote.photoURL;
      if (boardMembers?.[userId]?.photoURL) return boardMembers[userId].photoURL || null;
      return null;
    },
    [currentUser.uid, currentUser.photoURL, remoteUsers, boardMembers]
  );

  // Resolve a cor do cursor do participante pelo ID (a mesma das tags de seleção/cursor)
  const resolveUserColor = useCallback(
    (userId: string): string | null => {
      if (userId === currentUser.uid) return currentUser.color || null;
      const remote = remoteUsers.find((u) => u.userId === userId);
      if (remote?.color) return remote.color;
      return null;
    },
    [currentUser.uid, currentUser.color, remoteUsers]
  );

  // Post-it alvo do seletor flutuante de reações ancorado ao botão '+' interno
  const reactionPickerSticky = reactionPickerTarget
    ? elements.find((e) => e.id === reactionPickerTarget.elementId)
    : null;

  // Elemento elegível para botões "+" de criação rápida nas 4 direções (Post-its e Formas Geométricas)
  const selectedQuickAddElement =
    selectedElements.length === 1 &&
    (['sticky', 'rect', 'circle', 'diamond', 'triangle', 'star'].includes(selectedElements[0].type) || isGeometricShape(selectedElements[0].type))
      ? selectedElements[0]
      : null;

  // Criação rápida de post-it ou forma geométrica encostada ao selecionado
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
        zIndex: getNextZIndex(elements),
        updatedBy: currentUser.uid,
        updatedByName: currentUser.displayName,
      });

      if (!newId) return;

      onSelectionChange([newId]);
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
      zIndex: getNextZIndex(elements),
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
    elements,
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
  }, [isDraggableStage, isMiddlePanningState, isMouseDownState, currentTool, selectedColor, penMode]);

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
      const clickedEl = elements.find((el) => el.id === clickedElementId);
      // Se clicou em um elemento que já está na seleção, mantém a seleção múltipla
      if (selectedIds.includes(clickedElementId)) {
        const allSelectedLocked = selectedIds.every((id) => elements.find((el) => el.id === id)?.locked);
        if (allSelectedLocked) {
          shakeLockedBadge(clickedElementId);
          showCanvasToast('Elemento bloqueado', 'Pressione e segure o cadeado para liberar.', 'lock', 4000);
          return;
        }
        targetIds = selectedIds;
      } else {
        // Elemento bloqueado não abre menu de contexto; avisa o usuário que a liberação é por pressão contínua
        if (clickedEl?.locked) {
          shakeLockedBadge(clickedElementId);
          showCanvasToast('Elemento bloqueado', 'Pressione e segure o cadeado para liberar.', 'lock', 4000);
          return;
        }
        onSelectionChange([clickedElementId]);
        targetIds = [clickedElementId];
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
      zIndex: getNextZIndex(elements),
      updatedBy: currentUser.uid,
      updatedByName: currentUser.displayName,
    });
    onSelectionChange([id]);
    onSelectTool('select');
  };

  // Criação imediata de Forma Geométrica no ponto clicado
  const handleContextMenuCreateShape = async (
    shapeType: 'rect' | 'circle' | 'diamond' | 'triangle' | 'star' | 'hexagon' | 'cylinder'
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
      zIndex: getNextZIndex(elements),
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
      zIndex: getNextZIndex(elements),
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
      zIndex: getNextZIndex(elements),
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
      zIndex: getNextZIndex(elements),
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
    // Proteção total com aviso: bloqueados não são apagados e o usuário é notificado.
    const blockedIds: string[] = [];
    const idsToDelete = selectedElements
      .filter((el) => {
        if (el.locked) {
          blockedIds.push(el.id);
          return false;
        }
        return canCommentOnly ? el.updatedBy === currentUser.uid : true;
      })
      .map((el) => el.id);

    if (blockedIds.length > 0) {
      notifyLockedBlocked(blockedIds, idsToDelete.length > 0);
    }

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
        zIndex: getNextZIndex(elementsRef.current) + idx,
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
        if (isMouseDownRef.current) {
      isMouseDownRef.current = false;
      setIsMouseDownState((prev) => (prev ? false : prev));
    }
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
              className={`mt-0.5 size-7 rounded-xl flex items-center justify-center shrink-0 ${
                canvasToast.type === 'error'
                  ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                  : canvasToast.type === 'warning' || canvasToast.type === 'lock'
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                  : 'bg-primary/15 text-primary'
              }`}
            >
              {canvasToast.type === 'error' ? (
                <AlertCircle className="size-4" />
              ) : canvasToast.type === 'warning' ? (
                <AlertTriangle className="size-4" />
              ) : canvasToast.type === 'lock' ? (
                <LockClosed className="size-4" />
              ) : (
                <Info className="size-4" />
              )}
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
        allElements={elements}
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
        onGroupElements={handleGroupSelected}
        onUngroupElements={handleUngroupSelected}
        onDeleteElement={(id) => {
          // Proteção total com aviso: elemento bloqueado não é apagado pelo menu de contexto.
          const target = elements.find((item) => item.id === id);
          if (!target) return;
          if (target.locked) {
            notifyLockedBlocked([id], false);
            return;
          }
          onDeleteElement(id);
          onSelectionChange(selectedIds.filter((item) => item !== id));
        }}
        onDeleteElements={(ids) => {
          // Proteção total com aviso: elementos bloqueados não são apagados pelo menu de contexto.
          const blockedIds: string[] = [];
          const deletableIds = ids.filter((id) => {
            const target = elements.find((item) => item.id === id);
            if (!target) return false;
            if (target.locked) {
              blockedIds.push(id);
              return false;
            }
            return true;
          });
          if (blockedIds.length > 0) {
            notifyLockedBlocked(blockedIds, deletableIds.length > 0);
          }
          if (deletableIds.length === 0) return;
          if (onBatchDeleteElements) {
            onBatchDeleteElements(deletableIds);
          } else {
            deletableIds.forEach((id) => onDeleteElement(id));
          }
          onSelectionChange([]);
        }}
        onDuplicateElement={handleDuplicateElement}
        onDuplicateElements={handleBatchDuplicate}
        onReorderLayer={handleReorderLayer}
        onCopyElements={handleCopy}
        onCutElements={handleCut}
        onOpenCropModal={(id) => setCropModalElementId(id)}
        onSpawnMindMapNode={(id, mode) => {
          void spawnMindMapRelative(id, mode);
        }}
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
            textAlign: elem.textAlign || (isGeometricShape(elem.type) ? 'center' : 'left'),
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

      {/* Botões "+" ao redor do post-it ou forma geométrica selecionada para criar elementos encostados (estilo FigJam) */}
      {canUseQuickAdd && selectedQuickAddElement && (
        <StickyQuickAdd sticky={selectedQuickAddElement} onCreate={handleQuickAddSticky} />
      )}

      {/* Alças de conexão rápida magnética nas 4 bordas do elemento selecionado (Miro / FigJam) */}
      {!readOnly &&
        !canCommentOnly &&
        currentTool === 'select' &&
        selectedElements.length === 1 &&
        !drawingElement &&
        !inlineEditing &&
        !isTransforming && (
          <ElementConnectorHandles
            element={selectedElements[0]}
            onStartConnect={handleStartQuickConnect}
            selectionColor={userSelectionColor}
          />
        )}

      {/* Balão de Hiperlink Flutuante Estilo Miro (exibido para formas/elementos geométricos selecionados com link; em post-its o link é direto no texto) */}
      {selectedElements.length === 1 && selectedElements[0].type !== 'sticky' && !inlineEditing && !isTransforming && (
        <ElementLinkBalloon
          element={selectedElements[0]}
          scale={scale}
          stagePos={stagePos}
          stickyBottomOffset={canUseQuickAdd ? 44 : 10}
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

      {/* Popover Flutuante de Reações Apple Emoji ancorado ao botão '+' ou '+N' do Post-it */}
      {reactionPickerSticky && !isTransforming && onToggleReaction && (
        <StickyReactionBar
          sticky={reactionPickerSticky}
          currentUserId={currentUser.uid}
          anchorPoint={reactionPickerTarget?.anchor}
          mode={reactionPickerTarget?.mode}
          onClose={() => setReactionPickerTarget(null)}
          onToggleReaction={handleToggleReactionInternal}
          mirioReactionUnlocked={mirioReactionUnlocked}
          ditadorReactionUnlocked={ditadorReactionUnlocked}
          brigadeiroReactionUnlocked={brigadeiroReactionUnlocked}
        />
      )}

      {/* Tooltip flutuante em Hover com nome de quem deu a reação no post-it */}
      <ReactionBadgeTooltip
        elements={elements}
        currentUserId={currentUser.uid}
        resolveUserName={resolveUserName}
        resolveUserPhoto={resolveUserPhoto}
        resolveUserColor={resolveUserColor}
      />

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

      {(() => {
        const session = votingData?.session;

        // 1. Sessão Ativa: participantes distribuem votos com botões (- / +)
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
                      <div className="flex items-center gap-0.5 bg-amber-500 text-white rounded-full p-1 shadow-lg ring-2 ring-amber-400/40 animate-in zoom-in-95 duration-150">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveVote?.(elem.id);
                          }}
                          className="size-5 rounded-full flex items-center justify-center bg-amber-600/70 hover:bg-amber-700 transition active:scale-90 cursor-pointer"
                          title="Remover 1 voto deste item"
                        >
                          <Minus className="size-3" strokeWidth={2.5} />
                        </button>
                        <span className="font-mono text-xs font-bold px-1.5 leading-none tabular-nums text-center min-w-[1.25rem]">
                          {userVotes}
                        </span>
                        <button
                          type="button"
                          disabled={userRemaining <= 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (userRemaining > 0) onAddVote?.(elem.id);
                          }}
                          className={`size-5 rounded-full flex items-center justify-center transition active:scale-90 ${
                            userRemaining > 0
                              ? 'bg-amber-600/70 hover:bg-amber-700 cursor-pointer'
                              : 'bg-amber-600/40 opacity-50 cursor-not-allowed'
                          }`}
                          title={userRemaining > 0 ? `Adicionar mais 1 voto (${userRemaining} restantes)` : 'Votos esgotados'}
                        >
                          <Plus className="size-3" strokeWidth={2.5} />
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
                        className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg border transition-all duration-150 active:scale-95 cursor-pointer ${
                          userRemaining > 0
                            ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 ring-2 ring-amber-400/50 hover:scale-105'
                            : 'opacity-40 cursor-not-allowed bg-muted text-muted-foreground border-border'
                        }`}
                        title={userRemaining > 0 ? `Clique para votar neste item (${userRemaining} votos disponíveis)` : 'Você usou todos os seus votos'}
                      >
                        <Vote className="size-3.5" />
                        <span>Votar</span>
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
                      <Crown className="size-3" strokeWidth={2} />
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
                      <Vote className="size-3.5" />
                      <span className="font-mono">{count}</span>
                      {userVoted ? (
                        <Check className="size-3" strokeWidth={2.5} />
                      ) : (
                        <Plus className="size-3" strokeWidth={2.5} />
                      )}
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
        draggable={isDraggableStage}
        onDragStart={(e) => {
          if (widgetFieldEditorRef.current) {
            commitWidgetFieldEditor();
          }
          if (isMiddlePanning.current) {
            e.cancelBubble = true;
            return;
          }
          if (e.target === stageRef.current) return;
          const targetId = e.target.id();
          if (!targetId) return;

          // Se já há uma sessão ativa para este líder de arraste, não reinicializa
          if (dragSessionRef.current) return;

          dragStartPositions.current.clear();
          draggedFrameChildIdsRef.current = [];

          // Se o elemento arrastado for uma moldura, descobre dinamicamente todos os elementos filhos contidos
          const targetElem = elementsById.get(targetId) || elementsRef.current.find((el) => el.id === targetId);
          if (targetElem && targetElem.type === 'frame') {
            const contained = getElementsContainedInFrame(targetElem, elementsRef.current);
            draggedFrameChildIdsRef.current = contained;
          }

          const isMulti = selectedIds.length > 1 && selectedIds.includes(targetId);
          const hasFrameChildren = draggedFrameChildIdsRef.current.length > 0;
          const draggedIds = isMulti
            ? Array.from(new Set([...selectedIds, ...draggedFrameChildIdsRef.current]))
            : hasFrameChildren
            ? [targetId, ...draggedFrameChildIdsRef.current]
            : [targetId];
          const draggedIdsSet = new Set(draggedIds);

          const items = new Map<string, DragSessionItem>();
          const initialBoundsById = new Map<string, WorldBounds>();
          draggedIds.forEach((id) => {
            const node = id === targetId ? e.target : stageRef.current?.findOne('#' + id);
            const elem = elementsById.get(id) || elementsRef.current.find((el) => el.id === id);
            const isLocked = Boolean(elem?.locked);
            const initX = node ? node.x() : (elem ? elem.x : 0);
            const initY = node ? node.y() : (elem ? elem.y : 0);
            const gifEl = document.getElementById(`gif-overlay-${id}`);
            const reactionsEl = document.getElementById(`sticky-reactions-${id}`);
            if (node) {
              items.set(id, {
                node,
                initX,
                initY,
                isLocked,
                gifEl,
                reactionsEl,
              });
            }
            if (elem) {
              const b = getElementWorldBounds(elem);
              initialBoundsById.set(id, {
                x: b.x + (initX - elem.x),
                y: b.y + (initY - elem.y),
                w: b.w,
                h: b.h,
              });
            } else {
              initialBoundsById.set(id, { x: initX, y: initY, w: 120, h: 120 });
            }
            dragStartPositions.current.set(id, { x: initX, y: initY });
          });

          // Pré-filtra e faz cache de nós de setas/conectores vinculados aos elementos arrastados
          const connectedArrows: DragArrowSession[] = [];
          if (stageRef.current) {
            for (const el of elementsRef.current) {
              if (el.type === 'arrow' || el.type === 'line') {
                const startConnected = el.startBinding?.elementId && draggedIdsSet.has(el.startBinding.elementId);
                const endConnected = el.endBinding?.elementId && draggedIdsSet.has(el.endBinding.elementId);
                if (startConnected || endConnected) {
                  const group = stageRef.current.findOne('#' + el.id) as Konva.Group | null;
                  if (group) {
                    const line = (group.findOne('Arrow') || group.findOne('Line')) as Konva.Shape | null;
                    connectedArrows.push({ arrow: el, group, line });
                  }
                }
              }
            }
          }

          // Inicialização do Alinhamento Magnético e Guias Inteligentes com pré-cálculo de limites O(1)
          let smartGuidesData = null;
          if (smartGuidesEnabledRef.current) {
            let initialBounds: { x: number; y: number; w: number; h: number };

            if (!isMulti && !hasFrameChildren) {
              const elem = elementsById.get(targetId) || elementsRef.current.find((el) => el.id === targetId);
              initialBounds = elem
                ? getElementWorldBounds(elem)
                : { x: e.target.x(), y: e.target.y(), w: 100, h: 100 };
            } else {
              let minX = Infinity;
              let minY = Infinity;
              let maxX = -Infinity;
              let maxY = -Infinity;
              draggedIds.forEach((id) => {
                const elem = elementsById.get(id) || elementsRef.current.find((el) => el.id === id);
                if (elem) {
                  const b = getElementWorldBounds(elem);
                  if (b.x < minX) minX = b.x;
                  if (b.y < minY) minY = b.y;
                  if (b.x + b.w > maxX) maxX = b.x + b.w;
                  if (b.y + b.h > maxY) maxY = b.y + b.h;
                }
              });
              initialBounds = {
                x: Number.isFinite(minX) ? minX : e.target.x(),
                y: Number.isFinite(minY) ? minY : e.target.y(),
                w: Number.isFinite(maxX) && Number.isFinite(minX) ? Math.max(10, maxX - minX) : 100,
                h: Number.isFinite(maxY) && Number.isFinite(minY) ? Math.max(10, maxY - minY) : 100,
              };
            }

            const currentScale = scaleRef.current || 1;
            const viewport = {
              x: stagePosRef.current.x,
              y: stagePosRef.current.y,
              scale: currentScale,
            };

            const candidateElements: CanvasElement[] = [];
            const precomputedTargets: Array<{ element: CanvasElement; bounds: WorldBounds }> = [];
            elementsRef.current.forEach((el) => {
              if (draggedIdsSet.has(el.id)) return;
              const b = getElementWorldBounds(el);
              if (isBoundsInViewport(b, viewport, window.innerWidth, window.innerHeight, 600)) {
                candidateElements.push(el);
                precomputedTargets.push({ element: el, bounds: b });
              }
            });

            smartGuidesData = {
              initialBounds,
              candidateElements,
              precomputedTargets,
            };
            dragSmartGuidesData.current = {
              initialSelfPos: { x: e.target.x(), y: e.target.y() },
              initialBounds,
              candidateElements,
              draggedIds: draggedIdsSet,
            };
          } else {
            dragSmartGuidesData.current = null;
          }

          dragSessionRef.current = {
            leaderId: targetId,
            initialLeaderPos: { x: e.target.x(), y: e.target.y() },
            draggedIds: draggedIdsSet,
            initialBoundsById,
            items,
            connectedArrows,
            smartGuidesData,
          };

          publishElementDragOffset({
            active: true,
            draggedIds: draggedIdsSet,
            initialBoundsById,
            dx: 0,
            dy: 0,
          });
        }}
        onDragMove={(e) => {
          if (e.target === stageRef.current) {
            const sx = e.target.x();
            const sy = e.target.y();
            applyStagePan({ x: sx, y: sy }, scaleRef.current);
            return;
          }
          const targetId = e.target.id();
          if (!targetId) return;

          const session = dragSessionRef.current;
          // Se já há um líder ativo e este evento pertence a outro nó, ignora para evitar trabalho duplicado
          if (session && session.leaderId !== targetId) {
            return;
          }

          const leaderInitial = session ? session.initialLeaderPos : dragStartPositions.current.get(targetId);
          if (!leaderInitial) return;

          let rawDx = e.target.x() - leaderInitial.x;
          let rawDy = e.target.y() - leaderInitial.y;

          // Processamento do Alinhamento Magnético e Guias Inteligentes em tempo real a 60/120 FPS
          if (smartGuidesEnabledRef.current && session?.smartGuidesData) {
            const isBypass = Boolean(e.evt && (e.evt.ctrlKey || e.evt.metaKey));
            if (isBypass) {
              clearSmartGuides();
            } else {
              const { initialBounds, candidateElements, precomputedTargets } = session.smartGuidesData;
              const currentBounds = {
                x: initialBounds.x + rawDx,
                y: initialBounds.y + rawDy,
                w: initialBounds.w,
                h: initialBounds.h,
              };

              const currentScale = scaleRef.current || 1;
              const tolerance = 7.5 / currentScale;

              const snapResult = calculateSmartGuidesAndSnap({
                draggedBounds: currentBounds,
                candidateElements,
                precomputedTargets,
                tolerance,
              });

              if (snapResult.hasSnapX) {
                rawDx += snapResult.deltaX;
                e.target.x(leaderInitial.x + rawDx);
              }
              if (snapResult.hasSnapY) {
                rawDy += snapResult.deltaY;
                e.target.y(leaderInitial.y + rawDy);
              }

              drawSmartGuides(snapResult.guides);
            }
          }

          const updateChecklistEditorInputPos = (id: string, worldX: number, worldY: number) => {
            if (activeChecklistEditorRef.current?.elementId !== id) return;
            const checklistInput = document.getElementById(`checklist-editor-input-${id}`);
            if (checklistInput) {
              const editor = activeChecklistEditorRef.current;
              const isTitle = editor.target === 'title';
              const offsetX = isTitle ? 38 : 40;
              const elem = elementsRef.current.find((e) => e.id === id);
              const currentItems = elem?.checklistItems || [];
              const targetIdx = isTitle ? -1 : currentItems.findIndex((i) => i.id === editor.target);
              const itemY = isTitle ? 16 : (targetIdx >= 0 ? 56 + targetIdx * 34 : editor.itemY);
              const curScale = scaleRef.current;
              const curStagePos = stagePosRef.current;

              checklistInput.style.left = `${(worldX + offsetX) * curScale + curStagePos.x}px`;
              checklistInput.style.top = `${(worldY + itemY + 4) * curScale + curStagePos.y}px`;
            }
          };

          // Atualização dos overlays DOM do elemento líder
          const leaderItem = session?.items.get(targetId);
          if (leaderItem) {
            if (leaderItem.gifEl) {
              leaderItem.gifEl.style.left = `${e.target.x()}px`;
              leaderItem.gifEl.style.top = `${e.target.y()}px`;
            }
            if (leaderItem.reactionsEl) {
              leaderItem.reactionsEl.style.left = `${e.target.x()}px`;
              leaderItem.reactionsEl.style.top = `${e.target.y()}px`;
            }
          } else {
            const targetGif = document.getElementById(`gif-overlay-${targetId}`);
            if (targetGif) {
              targetGif.style.left = `${e.target.x()}px`;
              targetGif.style.top = `${e.target.y()}px`;
            }
            const targetReactions = document.getElementById(`sticky-reactions-${targetId}`);
            if (targetReactions) {
              targetReactions.style.left = `${e.target.x()}px`;
              targetReactions.style.top = `${e.target.y()}px`;
            }
          }
          updateChecklistEditorInputPos(targetId, e.target.x(), e.target.y());

          // Movimento ultra-rápido O(1) de todos os outros elementos selecionados ou filhos de moldura
          if (session && session.items.size > 1) {
            session.items.forEach((item, id) => {
              if (id === targetId || item.isLocked) return;
              const newX = item.initX + rawDx;
              const newY = item.initY + rawDy;
              item.node.position({ x: newX, y: newY });
              if (item.gifEl) {
                item.gifEl.style.left = `${newX}px`;
                item.gifEl.style.top = `${newY}px`;
              }
              if (item.reactionsEl) {
                item.reactionsEl.style.left = `${newX}px`;
                item.reactionsEl.style.top = `${newY}px`;
              }
              updateChecklistEditorInputPos(id, newX, newY);
            });
          }

          if (session) {
            publishElementDragOffset({
              active: true,
              draggedIds: session.draggedIds,
              initialBoundsById: session.initialBoundsById,
              dx: rawDx,
              dy: rawDy,
            });
          }

          if (transformerRef.current && transformerRef.current.nodes().length > 0) {
            transformerRef.current.forceUpdate();
            transformerRef.current.getLayer()?.batchDraw();
          }

          // Atualização contínua das setas magnéticas conectadas aos elementos movidos a 60/120 FPS
          if (session && session.connectedArrows.length > 0) {
            const movedElements: CanvasElement[] = [];
            session.items.forEach((item, id) => {
              if (item.isLocked) return;
              const base = elementsById.get(id) || elementsRef.current.find((el) => el.id === id);
              if (base) {
                movedElements.push({
                  ...base,
                  x: id === targetId ? e.target.x() : item.initX + rawDx,
                  y: id === targetId ? e.target.y() : item.initY + rawDy,
                });
              }
            });
            const arrowUpdates = getConnectedArrowUpdatesOnMove(movedElements, elementsRef.current);
            for (const update of arrowUpdates) {
              const arrowSession = session.connectedArrows.find((a) => a.arrow.id === update.id);
              if (arrowSession) {
                if (update.updates.x !== undefined) arrowSession.group.x(update.updates.x);
                if (update.updates.y !== undefined) arrowSession.group.y(update.updates.y);
                if (update.updates.points && arrowSession.line) {
                  (arrowSession.line as any).points(update.updates.points);
                }
              }
            }
          }
        }}
        onDragEnd={(e) => {
          const endedSession = dragSessionRef.current;
          clearSmartGuides();
          dragSmartGuidesData.current = null;
          dragSessionRef.current = null;
          draggedFrameChildIdsRef.current = [];
          if (e.target === stageRef.current) {
            publishElementDragOffset(null);
            applyStagePan(
              { x: Math.round(e.target.x()), y: Math.round(e.target.y()) },
              scaleRef.current,
              'immediate'
            );
            return;
          }
          if (endedSession) {
            const finalDx = Math.round(e.target.x() - endedSession.initialLeaderPos.x);
            const finalDy = Math.round(e.target.y() - endedSession.initialLeaderPos.y);
            publishElementDragOffset({
              active: false,
              draggedIds: endedSession.draggedIds,
              initialBoundsById: endedSession.initialBoundsById,
              dx: finalDx,
              dy: finalDy,
            });
            if (transformerRef.current && transformerRef.current.nodes().length > 0) {
              transformerRef.current.forceUpdate();
              transformerRef.current.getLayer()?.batchDraw();
            }
            requestAnimationFrame(() => {
              if (!dragSessionRef.current) {
                publishElementDragOffset(null);
              }
            });
          } else {
            publishElementDragOffset(null);
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

          {drawingElement && (drawingElement.type === 'arrow' || drawingElement.type === 'line') && (
            <ArrowItem
              element={drawingElement}
              isSelected={false}
              allElements={elements}
              elementMap={elementMap}
              onSelect={() => {}}
              onChange={() => {}}
            />
          )}

          {/* Pontos de conexão magnética em elementos candidatos quando uma seta/linha está sendo traçada */}
          {candidateConnectableElements.map((el) => {
            const bounds = getElementWorldBounds(el);
            const anchors = getCardinalAnchors(bounds);
            return (
              <Group key={`cand_${el.id}`} listening={false}>
                {(['top', 'right', 'bottom', 'left'] as const).map((side) => {
                  const pt = anchors[side];
                  const isSnapped =
                    snapTargetAnchor &&
                    Math.hypot(snapTargetAnchor.x - pt.x, snapTargetAnchor.y - pt.y) < 2;
                  if (isSnapped) return null;
                  return (
                    <Circle
                      key={side}
                      x={pt.x}
                      y={pt.y}
                      radius={4.5}
                      fill="#ffffff"
                      stroke={userSelectionColor}
                      strokeWidth={1.5}
                      opacity={0.65}
                    />
                  );
                })}
              </Group>
            );
          })}

          {/* Indicador de snap magnético na âncora alvo ao desenhar conector */}
          {snapTargetAnchor && (
            <Group x={snapTargetAnchor.x} y={snapTargetAnchor.y} listening={false}>
              <Circle radius={13} fill={`${userSelectionColor}33`} stroke={userSelectionColor} strokeWidth={2} />
              <Circle radius={4.5} fill={userSelectionColor} />
            </Group>
          )}

          {drawingElement &&
            isGeometricShape(drawingElement.type) &&
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
                {drawingElement.type === 'hexagon' && (
                  <Line
                    x={drawingElement.x}
                    y={drawingElement.y}
                    points={[
                      (drawingElement.width || 0) * 0.25, 0,
                      (drawingElement.width || 0) * 0.75, 0,
                      drawingElement.width || 0, (drawingElement.height || 0) * 0.5,
                      (drawingElement.width || 0) * 0.75, drawingElement.height || 0,
                      (drawingElement.width || 0) * 0.25, drawingElement.height || 0,
                      0, (drawingElement.height || 0) * 0.5,
                    ]}
                    closed
                    fill={drawingElement.fill || (selectedColor && selectedColor !== '#0f172a' ? selectedColor : '#ffffff')}
                    stroke={drawingElement.stroke || '#334155'}
                    strokeWidth={drawingElement.strokeWidth || 2}
                    perfectDrawEnabled={false}
                    listening={false}
                  />
                )}
                {drawingElement.type === 'cylinder' && (() => {
                  const w = drawingElement.width || 0;
                  const h = drawingElement.height || 0;
                  const rx = w / 2;
                  const ry = Math.min(22, h * 0.2);
                  const previewFill = drawingElement.fill || (selectedColor && selectedColor !== '#0f172a' ? selectedColor : '#ffffff');
                  const previewStroke = drawingElement.stroke || '#334155';
                  const previewStrokeWidth = drawingElement.strokeWidth || 2;
                  return (
                    <Group x={drawingElement.x} y={drawingElement.y} listening={false}>
                      <Path
                        data={`M 0,${ry} A ${rx},${ry} 0 0,0 ${w},${ry} L ${w},${h - ry} A ${rx},${ry} 0 0,1 0,${h - ry} Z`}
                        fill={previewFill}
                        stroke={previewStroke}
                        strokeWidth={previewStrokeWidth}
                        perfectDrawEnabled={false}
                      />
                      <Path
                        data={`M 0,${h - ry} A ${rx},${ry} 0 0,0 ${w},${h - ry}`}
                        stroke={previewStroke}
                        strokeWidth={previewStrokeWidth}
                        fill="transparent"
                        perfectDrawEnabled={false}
                      />
                      <Ellipse
                        x={rx}
                        y={ry}
                        radiusX={rx}
                        radiusY={ry}
                        fill={previewFill}
                        stroke={previewStroke}
                        strokeWidth={previewStrokeWidth}
                        perfectDrawEnabled={false}
                      />
                    </Group>
                  );
                })()}
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

              // Sincroniza GIFs e Reações de Post-its em tempo real durante rotação/redimensionamento
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
                const targetReactions = document.getElementById(`sticky-reactions-${id}`);
                if (targetReactions) {
                  const elem = elementsRef.current.find((el) => el.id === id);
                  const baseW = elem?.width || 180;
                  const baseH = elem?.height || 180;
                  targetReactions.style.left = `${node.x()}px`;
                  targetReactions.style.top = `${node.y()}px`;
                  targetReactions.style.width = `${Math.max(80, baseW * node.scaleX())}px`;
                  targetReactions.style.height = `${Math.max(80, baseH * node.scaleY())}px`;
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

        {/* Camada 4: Guias Inteligentes e Encaixe Magnético (Smart Guides) */}
        {!readOnly && (
          <Layer ref={smartGuidesLayerRef} id="smart-guides-layer" listening={false} />
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
              setStagedTextSelection({
                elementId: inlineEditing.elementId,
                text: selText,
              });
            }
          }}
          onMouseUp={(e) => {
            const ta = e.currentTarget;
            if (ta.selectionStart !== ta.selectionEnd) {
              const selText = ta.value.substring(ta.selectionStart, ta.selectionEnd);
              setStagedTextSelection({
                elementId: inlineEditing.elementId,
                text: selText,
              });
            }
          }}
          onKeyUp={(e) => {
            const ta = e.currentTarget;
            if (ta.selectionStart !== ta.selectionEnd) {
              const selText = ta.value.substring(ta.selectionStart, ta.selectionEnd);
              setStagedTextSelection({
                elementId: inlineEditing.elementId,
                text: selText,
              });
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
              : inlineEditing.type === 'sticky'
              ? 'p-3 rounded-[3px] outline-none font-sans leading-snug shadow-md border border-black/10'
              : 'p-3 rounded-sm outline-none font-sans leading-snug shadow-md border-2 border-primary/60'
          }`}
          style={{
            left: `${inlineEditing.worldX * scale + stagePos.x}px`,
            top: `${inlineEditing.worldY * scale + stagePos.y}px`,
            width: `${
              inlineEditing.type === 'sticky'
                ? inlineEditing.width * scale
                : Math.max(140, inlineEditing.width * scale)
            }px`,
            height: `${
              inlineEditing.type === 'sticky'
                ? inlineEditing.height * scale
                : Math.max(32, inlineEditing.height * scale)
            }px`,
            backgroundColor:
              inlineEditing.type === 'frame'
                ? '#1e293b'
                : inlineEditing.fill || '#fff9b1',
            color:
              inlineEditing.textColor || (inlineEditing.type === 'frame' ? '#ffffff' : '#0f172a'),
            fontSize: `${Math.max(
              10,
              (inlineEditing.fontSize || (inlineEditing.type === 'frame' ? 13 : 14)) * scale
            )}px`,
            textAlign: inlineEditing.textAlign || (isGeometricShape(inlineEditing.type || '') ? 'center' : 'left'),
            caretColor: '#2563eb',
            transform: inlineEditingElement?.rotation
              ? `rotate(${inlineEditingElement.rotation}deg)`
              : undefined,
            transformOrigin: inlineEditing.type === 'circle' ? 'center center' : '0 0',
          }}
        />
      )}

      {/* Editor Inline Dinâmico de Checklist (Item ou Título) */}
      {activeChecklistEditor && (() => {
        const elem = elements.find((e) => e.id === activeChecklistEditor.elementId);
        if (!elem) return null;

        const isTitle = activeChecklistEditor.target === 'title';
        const cardFill = elem.fill || '#ffffff';
        const isDark = getContrastTextColor(cardFill, '#0f172a', '#f8fafc') === '#f8fafc';

        const offsetX = isTitle ? 38 : 40;
        const inputWidth = Math.max(120, (elem.width || 260) - (isTitle ? 116 : 74));

        const currentItems = elem.checklistItems || [];
        const targetIdx = isTitle
          ? -1
          : currentItems.findIndex((i) => i.id === activeChecklistEditor.target);
        const resolvedItemY = isTitle
          ? 16
          : targetIdx >= 0
          ? 56 + targetIdx * 34
          : activeChecklistEditor.itemY;

        const handleCommitChecklistEdit = (textToSave: string, actionNext?: 'next_item' | 'close') => {
          if (isTitle) {
            onUpdateElement(elem.id, {
              checklistTitle: textToSave.trim() || 'Lista de Tarefas',
              updatedAt: Date.now(),
            });
            setActiveChecklistEditor(null);
            return;
          }

          const currentList = elem.checklistItems || [];
          const updated = currentList.map((item) =>
            item.id === activeChecklistEditor.target ? { ...item, text: textToSave } : item
          );

          if (actionNext === 'next_item') {
            const newItemId = 'chk_' + Math.random().toString(36).substring(2, 9);
            const currentIdx = currentList.findIndex((i) => i.id === activeChecklistEditor.target);
            const inserted = [...updated];
            const insertIdx = currentIdx >= 0 ? currentIdx + 1 : inserted.length;
            inserted.splice(insertIdx, 0, {
              id: newItemId,
              text: '',
              completed: false,
            });

            const newHeight = computeChecklistHeight(inserted.length);
            onUpdateElement(elem.id, {
              checklistItems: inserted,
              height: newHeight,
              updatedAt: Date.now(),
            });

            const nextItemY = 56 + insertIdx * 34;
            setActiveChecklistEditor({
              elementId: elem.id,
              target: newItemId,
              text: '',
              itemY: nextItemY,
            });
            return;
          }

          onUpdateElement(elem.id, {
            checklistItems: updated,
            updatedAt: Date.now(),
          });
          setActiveChecklistEditor(null);
        };

        return (
          <input
            id={`checklist-editor-input-${elem.id}`}
            autoFocus
            type="text"
            value={activeChecklistEditor.text}
            onChange={(e) => setActiveChecklistEditor({ ...activeChecklistEditor, text: e.target.value })}
            onBlur={() => handleCommitChecklistEdit(activeChecklistEditor.text)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleCommitChecklistEdit(activeChecklistEditor.text, isTitle ? 'close' : 'next_item');
              } else if (e.key === 'Escape') {
                e.preventDefault();
                handleCommitChecklistEdit(activeChecklistEditor.text, 'close');
              } else if (e.key === 'Backspace' && activeChecklistEditor.text === '' && !isTitle) {
                const currentItems = elem.checklistItems || [];
                if (currentItems.length > 1) {
                  e.preventDefault();
                  const targetIdx = currentItems.findIndex((i) => i.id === activeChecklistEditor.target);
                  const filtered = currentItems.filter((i) => i.id !== activeChecklistEditor.target);
                  const newHeight = computeChecklistHeight(filtered.length);
                  onUpdateElement(elem.id, {
                    checklistItems: filtered,
                    height: newHeight,
                    updatedAt: Date.now(),
                  });
                  if (targetIdx > 0) {
                    const prevItem = filtered[targetIdx - 1];
                    setActiveChecklistEditor({
                      elementId: elem.id,
                      target: prevItem.id,
                      text: prevItem.text,
                      itemY: 56 + (targetIdx - 1) * 34,
                    });
                  } else {
                    setActiveChecklistEditor(null);
                  }
                }
              }
            }}
            className={`absolute z-50 font-sans outline-none rounded px-1.5 py-0.5 border border-primary shadow-xs ${
              isTitle ? 'font-bold text-[13px]' : 'text-[13px]'
            }`}
            style={{
              left: `${(elem.x + offsetX) * scale + stagePos.x}px`,
              top: `${(elem.y + resolvedItemY + 4) * scale + stagePos.y}px`,
              width: `${inputWidth * scale}px`,
              height: `${24 * scale}px`,
              backgroundColor: isDark ? '#1e293b' : '#ffffff',
              color: isDark ? '#ffffff' : '#0f172a',
              fontSize: `${(isTitle ? 14 : 13) * scale}px`,
            }}
          />
        );
      })()}

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

      {/* Popover de Thread de Comentários Fixados no Canvas */}
      {activeCommentThreadId &&
        (() => {
          const commentEl = elements.find(
            (el) => el.id === activeCommentThreadId && el.type === 'comment'
          );
          if (!commentEl) return null;
          return (
            <CommentThreadPopover
              commentElement={commentEl}
              currentUser={currentUser}
              canEditOrComment={!readOnly}
              boardMembers={boardMembers}
              onUpdateComment={onUpdateElement}
              onDeleteComment={(id) => {
                onDeleteElement(id);
                setActiveCommentThreadId(null);
              }}
              onClose={() => setActiveCommentThreadId(null)}
            />
          );
        })()}

      {/* Modal Interativo de Recorte Não-Destrutivo de Imagens */}
      {cropModalElementId && (
        <ImageCropModal
          open={Boolean(cropModalElementId)}
          element={elements.find((el) => el.id === cropModalElementId) || null}
          onOpenChange={(open) => {
            if (!open) setCropModalElementId(null);
          }}
          onApplyCrop={(elementId, nextCrop, newDims) => {
            onUpdateElement(elementId, {
              crop: nextCrop,
              ...(newDims ? { width: newDims.width, height: newDims.height } : {}),
            });
          }}
        />
      )}

      {/* Editor Inline para Células de Tabela, Campos Kanban e Blocos de Código */}
      {widgetFieldEditor &&
        (() => {
          const targetEl = elements.find((el) => el.id === widgetFieldEditor.elementId);
          if (!targetEl) return null;

          let offsetX = widgetFieldEditor.offsetX;
          let offsetY = widgetFieldEditor.offsetY;
          let fieldW = widgetFieldEditor.width;
          let fieldH = widgetFieldEditor.height;

          if (widgetFieldEditor.kind === 'table') {
            const liveTable = getTableCellLocalRect(
              targetEl,
              widgetFieldEditor.rowIdx,
              widgetFieldEditor.colIdx
            );
            offsetX = liveTable.offsetX;
            offsetY = liveTable.offsetY;
            fieldW = liveTable.width;
            fieldH = liveTable.height;
          } else if (widgetFieldEditor.kind === 'kanban') {
            const cols =
              (targetEl.kanbanColumns && targetEl.kanbanColumns.length > 0
                ? targetEl.kanbanColumns
                : widgetFieldEditor.fallbackColumns) || createDefaultKanbanColumns();
            const liveLocal = getKanbanFieldLocalRect(cols, widgetFieldEditor.target);
            offsetX = liveLocal.offsetX;
            offsetY = liveLocal.offsetY;
            fieldW = liveLocal.width;
            fieldH = liveLocal.height;
          }

          const editorTargetKey = activeWidgetEditorKey || 'widget-editor';
          const leftPx = (targetEl.x + offsetX) * scale + stagePos.x;
          const topPx = (targetEl.y + offsetY) * scale + stagePos.y;
          const widthPx = Math.max(80, fieldW * scale);
          const heightPx = Math.max(24, fieldH * scale);

          if (widgetFieldEditor.kind === 'code') {
            const isLightCode = targetEl.codeTheme === 'light';
            const livePalette = isLightCode ? CODE_TOKEN_COLORS_LIGHT : CODE_TOKEN_COLORS_DARK;
            const liveLines = tokenizeCodeBlock(
              widgetFieldEditor.value,
              targetEl.codeLanguage || 'typescript'
            );
            const scaledFontPx = Math.max(11, (targetEl.fontSize || 13) * scale);
            const editorBoxH = Math.max(120, heightPx);

            return (
              <div
                key={editorTargetKey}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                style={{
                  left: `${leftPx}px`,
                  top: `${topPx}px`,
                  width: `${widthPx}px`,
                  height: `${editorBoxH}px`,
                }}
                className={`absolute z-50 overflow-hidden rounded-b-xl border-2 border-primary shadow-2xl ${
                  isLightCode ? 'bg-[#f8fafc]' : 'bg-[#0d1117]'
                }`}
              >
                <pre
                  aria-hidden="true"
                  style={{
                    fontSize: `${scaledFontPx}px`,
                    lineHeight: 1.55,
                    tabSize: 2,
                  }}
                  className="pointer-events-none absolute inset-0 m-0 overflow-hidden whitespace-pre p-3 font-mono tracking-normal"
                >
                  {liveLines.map((tokens, lIdx) => (
                    <React.Fragment key={lIdx}>
                      {lIdx > 0 && '\n'}
                      {tokens.map((tok, tIdx) => (
                        <span
                          key={tIdx}
                          style={{
                            color: livePalette[tok.kind],
                            fontWeight:
                              tok.kind === 'keyword' || tok.kind === 'heading' ? 700 : 400,
                            fontStyle: tok.kind === 'comment' ? 'italic' : 'normal',
                          }}
                        >
                          {tok.text}
                        </span>
                      ))}
                    </React.Fragment>
                  ))}
                  {widgetFieldEditor.value.endsWith('\n') ? ' ' : ''}
                </pre>
                <textarea
                  id="widget-field-editor-control"
                  ref={(node) => {
                    widgetEditorControlRef.current = node;
                  }}
                  value={widgetFieldEditor.value}
                  spellCheck={false}
                  autoCapitalize="off"
                  autoCorrect="off"
                  onMouseDown={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                  onScroll={(e) => {
                    const pre = e.currentTarget.previousElementSibling as HTMLElement | null;
                    if (pre) {
                      pre.scrollTop = e.currentTarget.scrollTop;
                      pre.scrollLeft = e.currentTarget.scrollLeft;
                    }
                  }}
                  onChange={(e) => {
                    const next = { ...widgetFieldEditor, value: e.target.value };
                    widgetFieldEditorRef.current = next;
                    setWidgetFieldEditor(next);
                  }}
                  onBlur={() => {
                    commitWidgetFieldEditor();
                  }}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                      e.preventDefault();
                      commitWidgetFieldEditor();
                    } else if (e.key === 'Escape') {
                      e.preventDefault();
                      commitWidgetFieldEditor();
                    } else if (e.key === 'Tab') {
                      e.preventDefault();
                      const ta = e.currentTarget;
                      const s = ta.selectionStart;
                      const end = ta.selectionEnd;
                      const nextVal =
                        widgetFieldEditor.value.slice(0, s) +
                        '  ' +
                        widgetFieldEditor.value.slice(end);
                      const next = { ...widgetFieldEditor, value: nextVal };
                      widgetFieldEditorRef.current = next;
                      setWidgetFieldEditor(next);
                      requestAnimationFrame(() => {
                        ta.selectionStart = s + 2;
                        ta.selectionEnd = s + 2;
                      });
                    }
                  }}
                  style={{
                    fontSize: `${scaledFontPx}px`,
                    lineHeight: 1.55,
                    tabSize: 2,
                    color: 'transparent',
                    caretColor: isLightCode ? '#0f172a' : '#f8fafc',
                  }}
                  className="relative h-full w-full select-text resize-none overflow-auto whitespace-pre bg-transparent p-3 font-mono tracking-normal selection:bg-sky-500/30 focus:outline-none"
                />
              </div>
            );
          }

          const isTableHeaderEdit =
            widgetFieldEditor.kind === 'table' &&
            widgetFieldEditor.rowIdx === 0 &&
            targetEl.tableHeaderRow !== false;

          return (
            <input
              id="widget-field-editor-control"
              key={editorTargetKey}
              ref={(node) => {
                widgetEditorControlRef.current = node;
              }}
              type="text"
              value={widgetFieldEditor.value}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              onChange={(e) => {
                const next = { ...widgetFieldEditor, value: e.target.value };
                widgetFieldEditorRef.current = next;
                setWidgetFieldEditor(next);
              }}
              onBlur={() => {
                commitWidgetFieldEditor();
              }}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Tab' && widgetFieldEditor.kind === 'table') {
                  e.preventDefault();
                  const curRow = widgetFieldEditor.rowIdx;
                  const curCol = widgetFieldEditor.colIdx;
                  const savedValue = widgetFieldEditor.value;
                  const rows = normalizeTableData(targetEl.tableData);
                  const rowCount = rows.length;
                  const colCount = rows[0]?.length || 3;
                  const patch = updateTableCell(targetEl, curRow, curCol, savedValue);
                  const updatedTableEl = { ...targetEl, ...patch };
                  commitWidgetFieldEditor(savedValue);

                  const total = rowCount * colCount;
                  const flat =
                    (curRow * colCount + curCol + (e.shiftKey ? -1 : 1) + total) % total;
                  const nextRow = Math.floor(flat / colCount);
                  const nextCol = flat % colCount;
                  openTableCellEditorByCoords(updatedTableEl, nextRow, nextCol, {
                    selectAll: true,
                  });
                } else if (e.key === 'Enter') {
                  e.preventDefault();
                  if (widgetFieldEditor.kind === 'table') {
                    const curRow = widgetFieldEditor.rowIdx;
                    const curCol = widgetFieldEditor.colIdx;
                    const rows = normalizeTableData(targetEl.tableData);
                    commitWidgetFieldEditor();
                    const nextCell = {
                      elementId: targetEl.id,
                      rowIdx: Math.min(rows.length - 1, curRow + 1),
                      colIdx: curCol,
                    };
                    activeTableCellRef.current = nextCell;
                    setActiveTableCell(nextCell);
                  } else {
                    commitWidgetFieldEditor();
                  }
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  widgetFieldEditorRef.current = null;
                  setWidgetFieldEditor(null);
                }
              }}
              style={{
                left: `${leftPx}px`,
                top: `${topPx}px`,
                width: `${widthPx}px`,
                height: `${heightPx}px`,
                fontSize: `${Math.max(11, Math.min(20, targetEl.fontSize || 13) * scale)}px`,
              }}
              className={`absolute z-50 select-text px-2.5 rounded-md bg-background text-foreground border-2 border-primary shadow-lg focus:outline-none ${
                isTableHeaderEdit ? 'font-bold' : 'font-medium'
              }`}
            />
          );
        })()}

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
          onGroup={handleGroupSelected}
          onUngroup={handleUngroupSelected}
          onCopyStyle={handleCopyStyleSelected}
          onPasteStyle={handlePasteStyleSelected}
          hasCopiedStyle={hasCopiedElementStyle()}
          onOpenSearch={onOpenSearch}
          onToggleMinimap={onToggleMinimap}
          showMinimap={showMinimap}
          onStartEditing={handleStartEditingElement}
          onOpenTemplates={onOpenTemplates}
          onOpenStickers={onOpenStickers}
          onResetZoom={onResetZoom || (() => onStageChange({ x: 0, y: 0 }, 1))}
          onToggleGrid={onToggleGrid}
          showGrid={showGrid}
          onToggleSmartGuides={onToggleSmartGuides}
          smartGuidesEnabled={smartGuidesEnabled}
          readOnly={readOnly}
          canCommentOnly={canCommentOnly}
        />
      )}
    </div>
  );
});

WhiteboardCanvas.displayName = 'WhiteboardCanvas';
