import type { CanvasElement } from '../types/element';

/**
 * Gera um identificador único e compacto para um novo grupo lógico de elementos.
 */
export function generateGroupId(): string {
  return `grp_${Math.random().toString(36).substring(2, 10)}`;
}

/**
 * Verifica se há pelo menos um elemento pertencente a um grupo dentro da lista fornecida.
 */
export function selectionHasGroup(elements: ReadonlyArray<Pick<CanvasElement, 'groupId'>>): boolean {
  return elements.some((el) => Boolean(el.groupId));
}

/**
 * Verifica se todos os elementos selecionados pertencem exatamente ao mesmo grupo.
 */
export function selectionIsSingleGroup(elements: ReadonlyArray<Pick<CanvasElement, 'groupId'>>): boolean {
  if (elements.length < 2) return false;
  const first = elements[0].groupId;
  if (!first) return false;
  return elements.every((el) => el.groupId === first);
}

/**
 * Expande uma lista de IDs selecionados para incluir todos os colegas de mesmo `groupId`
 * (ignorando elementos bloqueados se o líder clicado não estiver bloqueado).
 */
export function expandSelectionWithGroups(
  allElements: ReadonlyArray<CanvasElement>,
  rawIds: ReadonlyArray<string>
): string[] {
  if (rawIds.length === 0) return [];

  const selectedSet = new Set(rawIds);
  const groupIds = new Set<string>();

  for (const el of allElements) {
    if (selectedSet.has(el.id) && el.groupId) {
      groupIds.add(el.groupId);
    }
  }

  if (groupIds.size === 0) {
    return Array.from(selectedSet);
  }

  for (const el of allElements) {
    if (el.groupId && groupIds.has(el.groupId) && !el.locked) {
      selectedSet.add(el.id);
    }
  }

  return Array.from(selectedSet);
}

/**
 * Gera as atualizações atômicas para agrupar os elementos selecionados (`Ctrl+G`).
 */
export function createGroupUpdates(
  allElements: ReadonlyArray<CanvasElement>,
  selectedIds: ReadonlyArray<string>
): { groupId: string; updates: Array<{ id: string; updates: Partial<CanvasElement> }> } | null {
  const idSet = new Set(selectedIds);
  const targets = allElements.filter((el) => idSet.has(el.id) && !el.locked);
  if (targets.length < 2) return null;

  const groupId = generateGroupId();
  return {
    groupId,
    updates: targets.map((el) => ({
      id: el.id,
      updates: { groupId },
    })),
  };
}

/**
 * Gera as atualizações atômicas para desagrupar os elementos selecionados (`Ctrl+Shift+G`).
 * Define `groupId: undefined` para que o `elementService` converta em `deleteField()`.
 */
export function createUngroupUpdates(
  allElements: ReadonlyArray<CanvasElement>,
  selectedIds: ReadonlyArray<string>
): Array<{ id: string; updates: Partial<CanvasElement> }> {
  const idSet = new Set(selectedIds);
  const groupIds = new Set<string>();

  for (const el of allElements) {
    if (idSet.has(el.id) && el.groupId) {
      groupIds.add(el.groupId);
    }
  }

  if (groupIds.size === 0) return [];

  return allElements
    .filter((el) => !el.locked && (idSet.has(el.id) || (el.groupId && groupIds.has(el.groupId))))
    .filter((el) => Boolean(el.groupId))
    .map((el) => ({
      id: el.id,
      updates: { groupId: undefined },
    }));
}
