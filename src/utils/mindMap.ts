import type { CanvasElement } from '../types/element.ts';
import { resolveConnectorGeometry } from './connectors.ts';

const MINDMAP_PALETTE = [
  '#dbeafe', // Azul suave
  '#dcfce7', // Verde menta
  '#fef3c7', // Âmbar suave
  '#f3e8ff', // Lavanda
  '#fce7f3', // Rosa suave
  '#cffafe', // Ciano suave
];

const HORIZONTAL_GAP_PX = 250;
const VERTICAL_SIBLING_GAP_PX = 28;
const NODE_WIDTH_PX = 180;
const NODE_HEIGHT_PX = 56;

export function createMindMapRootPayload(
  worldX: number,
  worldY: number,
  zIndex: number,
  userId: string,
  userName?: string
): Omit<CanvasElement, 'id' | 'updatedAt'> {
  return {
    type: 'rect',
    x: Math.round(worldX - 100),
    y: Math.round(worldY - 32),
    width: 200,
    height: 64,
    fill: '#eff6ff',
    stroke: '#2563eb',
    strokeWidth: 2,
    text: 'Ideia Central',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    textColor: '#1e3a8a',
    mindmapRootId: 'self',
    mindmapDirection: 'right',
    zIndex,
    updatedBy: userId,
    updatedByName: userName,
  };
}

export function isMindMapNode(el: CanvasElement | undefined | null): boolean {
  if (!el) return false;
  return Boolean(el.mindmapRootId || el.mindmapParentId);
}

/**
 * Rebalanceia verticalmente os filhos diretos e subárvores de um Mapa Mental
 * para que novos nós criados com Tab/Enter nunca fiquem sobrepostos.
 */
export function computeMindMapSubtreeUpdates(
  allElements: ReadonlyArray<CanvasElement>,
  rootId: string
): Array<{ id: string; updates: Partial<CanvasElement> }> {
  const root = allElements.find(
    (el) => el.id === rootId || (el.mindmapRootId === 'self' && el.id === rootId)
  );
  if (!root) return [];

  const childrenByParent = new Map<string, CanvasElement[]>();
  for (const el of allElements) {
    if (el.mindmapParentId) {
      const list = childrenByParent.get(el.mindmapParentId) || [];
      list.push(el);
      childrenByParent.set(el.mindmapParentId, list);
    }
  }

  for (const list of childrenByParent.values()) {
    list.sort((a, b) => a.y - b.y || a.id.localeCompare(b.id));
  }

  // Mede a altura total ocupada pela subárvore de cada nó
  const subtreeHeight = new Map<string, number>();
  const visited = new Set<string>();
  const measure = (nodeId: string, elHeight: number): number => {
    if (visited.has(nodeId)) return elHeight;
    visited.add(nodeId);
    const kids = childrenByParent.get(nodeId) || [];
    if (kids.length === 0) {
      subtreeHeight.set(nodeId, elHeight);
      return elHeight;
    }
    let total = 0;
    for (let i = 0; i < kids.length; i++) {
      const kh = kids[i].height || NODE_HEIGHT_PX;
      total += measure(kids[i].id, kh);
      if (i > 0) total += VERTICAL_SIBLING_GAP_PX;
    }
    const finalH = Math.max(elHeight, total);
    subtreeHeight.set(nodeId, finalH);
    return finalH;
  };

  measure(root.id, root.height || 64);

  const nextPositions = new Map<string, { x: number; y: number }>();
  nextPositions.set(root.id, { x: root.x, y: root.y });

  const layoutChildren = (parent: CanvasElement, parentPos: { x: number; y: number }) => {
    const kids = childrenByParent.get(parent.id) || [];
    if (kids.length === 0) return;

    const parentH = parent.height || NODE_HEIGHT_PX;
    const parentCenterY = parentPos.y + parentH / 2;

    let totalBlockH = 0;
    for (let i = 0; i < kids.length; i++) {
      totalBlockH += subtreeHeight.get(kids[i].id) || (kids[i].height || NODE_HEIGHT_PX);
      if (i > 0) totalBlockH += VERTICAL_SIBLING_GAP_PX;
    }

    let cursorY = parentCenterY - totalBlockH / 2;
    for (const child of kids) {
      const childSubH = subtreeHeight.get(child.id) || (child.height || NODE_HEIGHT_PX);
      const childH = child.height || NODE_HEIGHT_PX;
      const childW = child.width || NODE_WIDTH_PX;
      const dir = child.mindmapDirection || parent.mindmapDirection || 'right';
      const parentW = parent.width || NODE_WIDTH_PX;

      const targetX =
        dir === 'left'
          ? Math.round(parentPos.x - HORIZONTAL_GAP_PX - (childW - NODE_WIDTH_PX))
          : Math.round(parentPos.x + parentW + (HORIZONTAL_GAP_PX - NODE_WIDTH_PX));
      const targetY = Math.round(cursorY + childSubH / 2 - childH / 2);

      const pos = { x: targetX, y: targetY };
      nextPositions.set(child.id, pos);
      layoutChildren(child, pos);

      cursorY += childSubH + VERTICAL_SIBLING_GAP_PX;
    }
  };

  layoutChildren(root, { x: root.x, y: root.y });

  const updates: Array<{ id: string; updates: Partial<CanvasElement> }> = [];
  const updatedMap = new Map<string, CanvasElement>();

  for (const el of allElements) {
    const pos = nextPositions.get(el.id);
    if (pos && (pos.x !== el.x || pos.y !== el.y)) {
      updates.push({ id: el.id, updates: { x: pos.x, y: pos.y } });
      updatedMap.set(el.id, { ...el, x: pos.x, y: pos.y });
    } else {
      updatedMap.set(el.id, el);
    }
  }

  // Atualiza conectores curvos ligados aos nós reposicionados
  for (const el of allElements) {
    if (el.type !== 'arrow') continue;
    const sId = el.startBinding?.elementId;
    const eId = el.endBinding?.elementId;
    if ((sId && nextPositions.has(sId)) || (eId && nextPositions.has(eId))) {
      const { worldStart, routePoints } = resolveConnectorGeometry(el, updatedMap);
      const relPoints = routePoints.map((v, idx) =>
        idx % 2 === 0 ? Math.round(v - worldStart.x) : Math.round(v - worldStart.y)
      );
      updates.push({
        id: el.id,
        updates: {
          x: Math.round(worldStart.x),
          y: Math.round(worldStart.y),
          points: relPoints,
        },
      });
    }
  }

  return updates;
}

/**
 * Gera os dados de um novo nó (filho com `Tab` ou irmão com `Enter`) já com cor harmônica
 * e conector curvo acoplado ao nó pai.
 */
export function buildMindMapBranchSpec(
  sourceNode: CanvasElement,
  mode: 'child' | 'sibling',
  allElements: ReadonlyArray<CanvasElement>,
  nextZIndex: number,
  userId: string,
  userName?: string
): {
  parentNode: CanvasElement;
  rootId: string;
  nodePayload: Omit<CanvasElement, 'id' | 'updatedAt'>;
  createConnectorPayload: (newChildId: string) => Omit<CanvasElement, 'id' | 'updatedAt'>;
} {
  const effectiveRootId =
    sourceNode.mindmapRootId && sourceNode.mindmapRootId !== 'self'
      ? sourceNode.mindmapRootId
      : sourceNode.id;

  const parentNode =
    mode === 'sibling' && sourceNode.mindmapParentId
      ? allElements.find((el) => el.id === sourceNode.mindmapParentId) || sourceNode
      : sourceNode;

  const existingSiblings = allElements.filter((el) => el.mindmapParentId === parentNode.id);
  const direction: 'right' | 'left' =
    parentNode.mindmapParentId
      ? parentNode.mindmapDirection || 'right'
      : existingSiblings.length % 4 === 3
        ? 'left'
        : 'right';

  const colorIdx = (existingSiblings.length + (parentNode.mindmapParentId ? 1 : 0)) % MINDMAP_PALETTE.length;
  const fill = parentNode.mindmapParentId ? parentNode.fill || MINDMAP_PALETTE[colorIdx] : MINDMAP_PALETTE[colorIdx];
  const stroke = parentNode.stroke || '#3b82f6';

  const parentW = parentNode.width || NODE_WIDTH_PX;
  const parentH = parentNode.height || NODE_HEIGHT_PX;
  const rawX =
    direction === 'left'
      ? Math.round(parentNode.x - HORIZONTAL_GAP_PX)
      : Math.round(parentNode.x + parentW + (HORIZONTAL_GAP_PX - NODE_WIDTH_PX));
  const rawY = Math.round(
    parentNode.y + parentH / 2 - NODE_HEIGHT_PX / 2 + existingSiblings.length * (NODE_HEIGHT_PX + VERTICAL_SIBLING_GAP_PX)
  );

  const nodePayload: Omit<CanvasElement, 'id' | 'updatedAt'> = {
    type: 'rect',
    x: rawX,
    y: rawY,
    width: NODE_WIDTH_PX,
    height: NODE_HEIGHT_PX,
    fill,
    stroke,
    strokeWidth: 2,
    text: 'Novo tópico',
    fontSize: 14,
    fontWeight: 'normal',
    textAlign: 'center',
    textColor: '#0f172a',
    mindmapRootId: effectiveRootId,
    mindmapParentId: parentNode.id,
    mindmapDirection: direction,
    zIndex: nextZIndex,
    updatedBy: userId,
    updatedByName: userName,
  };

  const createConnectorPayload = (newChildId: string): Omit<CanvasElement, 'id' | 'updatedAt'> => {
    const startSide = direction === 'left' ? 'left' : 'right';
    const endSide = direction === 'left' ? 'right' : 'left';
    const startX = direction === 'left' ? parentNode.x : parentNode.x + parentW;
    const startY = Math.round(parentNode.y + parentH / 2);
    const endX = direction === 'left' ? rawX + NODE_WIDTH_PX : rawX;
    const endY = Math.round(rawY + NODE_HEIGHT_PX / 2);

    return {
      type: 'arrow',
      x: startX,
      y: startY,
      points: [0, 0, endX - startX, endY - startY],
      stroke,
      strokeWidth: 2.5,
      connectorStyle: 'curved',
      startArrowhead: 'none',
      endArrowhead: 'arrow',
      startBinding: { elementId: parentNode.id, side: startSide },
      endBinding: { elementId: newChildId, side: endSide },
      zIndex: Math.max(1, nextZIndex - 1),
      updatedBy: userId,
      updatedByName: userName,
    };
  };

  return {
    parentNode,
    rootId: effectiveRootId,
    nodePayload,
    createConnectorPayload,
  };
}
