import type { CanvasElement } from '../types/element';

/**
 * Histórico de Undo/Redo por usuário, baseado em patches por operação.
 * ----------------------------------------------------------------------------
 * Substitui o modelo antigo de snapshots (fotografia do array inteiro de
 * elementos a cada ação) por patches mínimos: cada operação registra apenas os
 * campos que de fato mudaram, por elemento.
 *
 * Semântica acordada:
 * - Undo/Redo é por usuário: cada patch carrega o diff da operação e o Ctrl+Z
 *   reverte somente o último patch, preservando edições alheias em campos que
 *   o patch não toca.
 * - Coalescing: operações contínuas (arrasto/resize/rotação) sobre os mesmos
 *   elementos dentro de uma janela curta viram um único patch.
 * - Sessão apenas: o histórico vive em memória e morre no refresh.
 */

/** Campos voláteis/de metadados que não participam do histórico. */
const EXCLUDED_FIELDS = new Set(['id', 'updatedAt', 'updatedBy', 'updatedByName']);

/** Campos alterados de forma contínua por arrasto/resize/rotação (coalescing). */
const CONTINUOUS_FIELDS = new Set(['x', 'y', 'width', 'height', 'rotation', 'points']);

/** Janela (ms) em que operações contínuas sobre os mesmos elementos se fundem. */
export const COALESCE_WINDOW_MS = 500;

/** Limite de patches por sessão (patches são pequenos, então o cap é generoso). */
export const MAX_PATCHES = 200;

export type UndoEntryKind = 'create' | 'delete' | 'modify';

export interface UndoEntry {
  id: string;
  kind: UndoEntryKind;
  /** Para create: null. Para modify: apenas os campos alterados. */
  before: Partial<CanvasElement> | null;
  /** Para delete: null. Para modify: apenas os campos alterados. */
  after: Partial<CanvasElement> | null;
}

export interface UndoPatch {
  entries: UndoEntry[];
  timestamp: number;
}

function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === undefined || b === undefined || a === null || b === null) return false;
  if (typeof a === 'object' && typeof b === 'object') {
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Compara dois estados do quadro e produz o patch da operação.
 * Retorna null quando nada mudou (a mutação não gerou diff).
 */
export function diffElementsToPatch(
  before: CanvasElement[],
  after: CanvasElement[]
): UndoPatch | null {
  const beforeMap = new Map(before.map((e) => [e.id, e] as const));
  const afterMap = new Map(after.map((e) => [e.id, e] as const));
  const entries: UndoEntry[] = [];

  beforeMap.forEach((b, id) => {
    const a = afterMap.get(id);
    if (!a) {
      entries.push({ id, kind: 'delete', before: { ...b }, after: null });
      return;
    }
    if (b === a) return;

    const beforeFields: Partial<CanvasElement> = {};
    const afterFields: Partial<CanvasElement> = {};
    let changed = false;
    const keys = new Set([...Object.keys(b), ...Object.keys(a)]);
    keys.forEach((key) => {
      if (EXCLUDED_FIELDS.has(key)) return;
      const bv = (b as unknown as Record<string, unknown>)[key];
      const av = (a as unknown as Record<string, unknown>)[key];
      if (!valuesEqual(bv, av)) {
        changed = true;
        (beforeFields as Record<string, unknown>)[key] = bv;
        (afterFields as Record<string, unknown>)[key] = av;
      }
    });
    if (changed) entries.push({ id, kind: 'modify', before: beforeFields, after: afterFields });
  });

  afterMap.forEach((a, id) => {
    if (!beforeMap.has(id)) {
      entries.push({ id, kind: 'create', before: null, after: { ...a } });
    }
  });

  if (entries.length === 0) return null;
  return { entries, timestamp: Date.now() };
}

/**
 * Aplica um patch ao estado do quadro na direção indicada.
 * Tolerante a estados que mudaram por baixo (edições alheias):
 * - create: undo remove (se ainda existir); redo re-adiciona (se não existir).
 * - delete: undo re-adiciona (se não existir); redo remove (se existir).
 * - modify: aplica campos apenas se o elemento ainda existir.
 */
export function applyPatchToState(
  state: CanvasElement[],
  patch: UndoPatch,
  direction: 'undo' | 'redo'
): CanvasElement[] {
  const map = new Map(state.map((e) => [e.id, e] as const));

  for (const entry of patch.entries) {
    const existing = map.get(entry.id);

    if (entry.kind === 'create') {
      if (direction === 'undo') {
        if (existing) map.delete(entry.id);
      } else if (!existing && entry.after) {
        map.set(entry.id, entry.after as CanvasElement);
      }
      continue;
    }

    if (entry.kind === 'delete') {
      if (direction === 'undo') {
        if (!existing && entry.before) map.set(entry.id, entry.before as CanvasElement);
      } else if (existing) {
        map.delete(entry.id);
      }
      continue;
    }

    // kind === 'modify'
    if (!existing) continue;
    const fields = direction === 'undo' ? entry.before : entry.after;
    if (!fields) continue;
    const merged: Record<string, unknown> = { ...existing };
    for (const [k, v] of Object.entries(fields)) {
      if (v === undefined) {
        delete merged[k];
      } else {
        merged[k] = v;
      }
    }
    map.set(entry.id, merged as unknown as CanvasElement);
  }

  return Array.from(map.values());
}

/** Indica se `next` deve se fundir ao patch anterior (operação contínua). */
export function shouldCoalescePatches(prev: UndoPatch, next: UndoPatch): boolean {
  if (next.timestamp - prev.timestamp > COALESCE_WINDOW_MS) return false;
  const prevModifyIds = new Set(
    prev.entries.filter((e) => e.kind === 'modify').map((e) => e.id)
  );
  if (prevModifyIds.size === 0) return false;

  for (const entry of next.entries) {
    if (entry.kind !== 'modify' || !prevModifyIds.has(entry.id)) return false;
    const fields = entry.after ?? {};
    for (const key of Object.keys(fields)) {
      if (!CONTINUOUS_FIELDS.has(key)) return false;
    }
  }
  return true;
}

/** Funde dois patches contínuos: `before` preserva os valores iniciais e `after` acumula os finais. */
export function mergePatches(prev: UndoPatch, next: UndoPatch): UndoPatch {
  const map = new Map(prev.entries.map((e) => [e.id, e] as const));
  for (const entry of next.entries) {
    const existing = map.get(entry.id);
    if (existing && existing.kind === 'modify' && entry.kind === 'modify') {
      map.set(entry.id, {
        ...entry,
        before: { ...(entry.before ?? {}), ...(existing.before ?? {}) },
        after: { ...(existing.after ?? {}), ...(entry.after ?? {}) },
      });
    } else {
      map.set(entry.id, entry);
    }
  }
  return { entries: Array.from(map.values()), timestamp: next.timestamp };
}
