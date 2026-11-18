import { useCallback } from 'react';
import type { CanvasElement } from '../../types/element';
import type { CurrentUser } from '../../types/board';
import {
  isMindMapNode,
  buildMindMapBranchSpec,
  computeMindMapSubtreeUpdates,
} from '../../utils/mindMap';
import { getNextZIndex } from '../../utils/layerOrder';

interface UseMindMapActionsParams {
  elementsRef: React.RefObject<CanvasElement[]>;
  currentUser: CurrentUser;
  readOnly: boolean;
  canCommentOnly: boolean;
  onAddElement: (elem: Omit<CanvasElement, 'id' | 'updatedAt'>) => Promise<string>;
  onBatchUpdateElements?: (updates: { id: string; updates: Partial<CanvasElement> }[]) => Promise<void>;
  onSelectionChange: (ids: string[]) => void;
}

/**
 * Hook modular dedicado às operações de Mapa Mental (Mind Map):
 * - `Tab` em um nó cria um nó filho já conectado por seta curva e rebalanceia a árvore.
 * - `Enter` em um nó cria um nó irmão no mesmo nível e rebalanceia a árvore.
 */
export function useMindMapActions({
  elementsRef,
  currentUser,
  readOnly,
  canCommentOnly,
  onAddElement,
  onBatchUpdateElements,
  onSelectionChange,
}: UseMindMapActionsParams) {
  const spawnMindMapRelative = useCallback(
    async (sourceElementId: string, mode: 'child' | 'sibling'): Promise<string | null> => {
      if (readOnly || canCommentOnly) return null;
      const all = elementsRef.current || [];
      const source = all.find((el) => el.id === sourceElementId);
      if (!source || !isMindMapNode(source)) return null;

      const baseZ = getNextZIndex(all);
      const spec = buildMindMapBranchSpec(
        source,
        mode,
        all,
        baseZ + 1,
        currentUser.uid,
        currentUser.displayName
      );

      const newNodeId = await onAddElement(spec.nodePayload);
      if (!newNodeId) return null;

      const connectorPayload = spec.createConnectorPayload(newNodeId);
      const newConnectorId = await onAddElement(connectorPayload);

      // Rebalanceia subárvore incluindo o nó recém-criado
      if (onBatchUpdateElements) {
        const simulatedNode: CanvasElement = {
          ...spec.nodePayload,
          id: newNodeId,
          updatedAt: Date.now(),
        };
        const simulatedList: CanvasElement[] = [
          ...all,
          simulatedNode,
          ...(newConnectorId
            ? [{ ...connectorPayload, id: newConnectorId, updatedAt: Date.now() }]
            : []),
        ];
        const layoutUpdates = computeMindMapSubtreeUpdates(simulatedList, spec.rootId);
        if (layoutUpdates.length > 0) {
          await onBatchUpdateElements(layoutUpdates);
        }
      }

      onSelectionChange([newNodeId]);
      return newNodeId;
    },
    [elementsRef, currentUser.uid, currentUser.displayName, readOnly, canCommentOnly, onAddElement, onBatchUpdateElements, onSelectionChange]
  );

  return {
    spawnMindMapRelative,
  };
}
