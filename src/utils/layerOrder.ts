import type { CanvasElement } from '../types/element';

/**
 * Sistema de Camadas (Z-Index) do Mirio
 * -------------------------------------
 * Ordem visual única fonte de verdade: cada elemento tem um `zIndex` numérico
 * (1 = fundo, quanto maior = mais à frente). A renderização ordena o array por
 * zIndex e aplica renormalização densa (1..n) após cada operação de camada,
 * eliminando buracos e empates permanentemente.
 *
 * Empates residuais (ex: dois usuários criando no mesmo instante no multiplayer)
 * são resolvidos por um desempate determinístico por `updatedAt`/`id`.
 */

export type LayerAction = 'bringToFront' | 'sendToBack' | 'bringForward' | 'sendBackward';

export interface ElementZIndexUpdate {
  id: string;
  updates: { zIndex: number };
}

/**
 * Tipos que não participam da pilha de camadas: imagens (salvas como sticker)
 * e GIFs (overlay HTML sempre acima do canvas) não respeitam zIndex visual,
 * então as opções de trazer/enviar camada ficam desabilitadas para eles.
 */
export function supportsLayerReorder(type: string): boolean {
  return type !== 'sticker' && type !== 'gif';
}

/** Uma seleção só pode reordenar camadas se TODOS os elementos forem reordenáveis. */
export function selectionSupportsLayerReorder(elements: Array<{ type: string }>): boolean {
  return elements.length > 0 && elements.every((el) => supportsLayerReorder(el.type));
}

/**
 * Resolve o atalho de camada a partir de um evento de teclado, de forma
 * robusta a qualquer layout (US, ABNT, ABNT2):
 *
 * 1. `e.key` primeiro — no ABNT2 o navegador reporta o caractere correto
 *    (']'/'[') mesmo quando `e.code` aponta para outra tecla física
 *    (a tecla ']' reporta code 'Backslash' e a '[' reporta 'BracketRight');
 *    com Shift pressionado, e.key vira '}' / '{'.
 * 2. `e.code` como fallback — layouts em que os colchetes produzem outros
 *    caracteres (ex.: ABNT gera 'º'/'ª') ainda acertam pela tecla física.
 *
 * AltGr (altKey) é ignorado: no ABNT2 é usado para símbolos com Ctrl.
 */
export function resolveLayerShortcut(
  e: Pick<KeyboardEvent, 'key' | 'code' | 'altKey'>
): 'bringToFront' | 'sendToBack' | null {
  if (e.altKey) return null;
  if (e.key === ']' || e.key === '}') return 'bringToFront';
  if (e.key === '[' || e.key === '{') return 'sendToBack';
  if (e.code === 'BracketRight') return 'bringToFront';
  if (e.code === 'BracketLeft') return 'sendToBack';
  return null;
}


type LayerableElement = Pick<CanvasElement, 'id' | 'zIndex' | 'updatedAt'> & Partial<CanvasElement>;

/** Comparador de camada: zIndex crescente + desempate determinístico. */
export function layerComparator(a: LayerableElement, b: LayerableElement): number {
  const az = a.zIndex || 0;
  const bz = b.zIndex || 0;
  if (az !== bz) return az - bz;
  // Desempate estável para empates residuais (criação simultânea no multiplayer)
  const at = a.updatedAt || 0;
  const bt = b.updatedAt || 0;
  if (at !== bt) return at - bt;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** Ordena por camada (fundo → frente) com desempate determinístico. */
export function sortElementsByLayer<T extends LayerableElement>(elements: T[]): T[] {
  return [...elements].sort(layerComparator);
}

/** Próximo zIndex livre no topo da pilha (máximo existente + 1). */
export function getNextZIndex(elements: Array<{ zIndex?: number }>): number {
  let max = 0;
  for (const el of elements) {
    const z = el.zIndex || 0;
    if (z > max) max = z;
  }
  return max + 1;
}

/**
 * Renormaliza a pilha para 1..n na ordem informada e retorna apenas os
 * updates cujo zIndex realmente mudou (persistência eficiente no Firebase).
 */
export function diffZIndexUpdates(ordered: LayerableElement[]): ElementZIndexUpdate[] {
  const updates: ElementZIndexUpdate[] = [];
  for (let i = 0; i < ordered.length; i++) {
    const denseZ = i + 1;
    if ((ordered[i].zIndex || 0) !== denseZ) {
      updates.push({ id: ordered[i].id, updates: { zIndex: denseZ } });
    }
  }
  return updates;
}

/**
 * Computa as atualizações de zIndex para uma ação de camada.
 *
 * - bringToFront / sendToBack: seleção vai ao extremo preservando a ordem
 *   relativa entre os elementos selecionados.
 * - bringForward / sendBackward: cada selecionado troca de posição (swap real)
 *   com o vizinho não-selecionado mais próximo, processando a partir do
 *   elemento mais à frente (ou mais atrás) para que blocos contíguos se movam
 *   em bloco preservando a ordem interna.
 *
 * Em todos os casos a pilha resultante é renormalizada (1..n) e só os valores
 * alterados são retornados.
 */
export function computeLayerReorderUpdates(
  elements: LayerableElement[],
  selectedIds: string[],
  action: LayerAction
): ElementZIndexUpdate[] {
  if (selectedIds.length === 0 || elements.length === 0) return [];
  const selectedSet = new Set(selectedIds);
  const ordered = sortElementsByLayer(elements);

  let newOrder: LayerableElement[];

  if (action === 'bringToFront' || action === 'sendToBack') {
    const selected = ordered.filter((el) => selectedSet.has(el.id));
    if (selected.length === 0) return [];
    const rest = ordered.filter((el) => !selectedSet.has(el.id));
    newOrder = action === 'bringToFront' ? [...rest, ...selected] : [...selected, ...rest];
  } else {
    newOrder = [...ordered];
    const selectedIndex = newOrder
      .map((el, i) => (selectedSet.has(el.id) ? i : -1))
      .filter((i) => i !== -1);

    if (action === 'bringForward') {
      // Da frente para o fundo: cada selecionado troca com o próximo não-selecionado
      for (let k = selectedIndex.length - 1; k >= 0; k--) {
        let j = selectedIndex[k] + 1;
        while (j < newOrder.length && selectedSet.has(newOrder[j].id)) j++;
        if (j >= newOrder.length) continue;
        [newOrder[selectedIndex[k]], newOrder[j]] = [newOrder[j], newOrder[selectedIndex[k]]];
      }
    } else {
      // sendBackward: do fundo para a frente
      for (let k = 0; k < selectedIndex.length; k++) {
        let j = selectedIndex[k] - 1;
        while (j >= 0 && selectedSet.has(newOrder[j].id)) j--;
        if (j < 0) continue;
        [newOrder[selectedIndex[k]], newOrder[j]] = [newOrder[j], newOrder[selectedIndex[k]]];
      }
    }
  }

  return diffZIndexUpdates(newOrder);
}

/**
 * Move um bloco de ids para imediatamente antes/depois de um elemento alvo
 * (usado pelo drag-and-drop do Painel de Camadas). O bloco preserva a ordem
 * interna entre seus ids. targetId = null com 'after' = topo da pilha (frente);
 * targetId = null com 'before' = fundo da pilha.
 */
export function moveBlockInLayerOrder(
  elements: LayerableElement[],
  blockIds: string[],
  targetId: string | null,
  position: 'before' | 'after'
): ElementZIndexUpdate[] {
  if (blockIds.length === 0) return [];
  const blockSet = new Set(blockIds);
  const ordered = sortElementsByLayer(elements);

  const block = ordered.filter((el) => blockSet.has(el.id));
  if (block.length === 0) return [];
  const rest = ordered.filter((el) => !blockSet.has(el.id));

  let insertAt: number;
  if (targetId === null) {
    insertAt = position === 'after' ? rest.length : 0;
  } else {
    const targetIdx = rest.findIndex((el) => el.id === targetId);
    if (targetIdx === -1) return [];
    insertAt = position === 'after' ? targetIdx + 1 : targetIdx;
  }

  rest.splice(insertAt, 0, ...block);
  return diffZIndexUpdates(rest);
}

/**
 * Rótulo automático de um elemento para o Painel de Camadas.
 * Usa conteúdo quando faz sentido ("Sticky 'Ideia…'") senão o tipo.
 */
export function getLayerLabel(element: Pick<CanvasElement, 'type' | 'text' | 'alt'>): string {
  const snippet = (element.text || '').trim().replace(/\s+/g, ' ');
  const short = snippet.length > 18 ? `${snippet.slice(0, 18)}…` : snippet;

  switch (element.type) {
    case 'sticky':
      return short ? `Sticky "${short}"` : 'Sticky';
    case 'checklist':
      return short ? `Checklist "${short}"` : 'Checklist';
    case 'frame':
      return short ? `Moldura "${short}"` : 'Moldura';
    case 'text':
      return short ? `Texto "${short}"` : 'Texto';
    case 'rect':
    case 'circle':
    case 'diamond':
    case 'triangle':
    case 'star':
      return 'Forma';
    case 'arrow':
      return 'Seta';
    case 'line':
      return 'Linha';
    case 'pen':
      return 'Traço';
    case 'sticker':
      return element.alt ? `Sticker "${element.alt}"` : 'Sticker';
    case 'gif':
      return element.alt ? `GIF "${element.alt}"` : 'GIF';
    default:
      return 'Elemento';
  }
}
