import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Stage, Layer, Transformer } from 'react-konva';
import type Konva from 'konva';
import type { CanvasElement, ToolType } from '../../types/element';
import type { UserPresence, CurrentUser } from '../../types/board';
import { StickyNoteItem } from './StickyNoteItem';
import { ShapeItem } from './ShapeItem';
import { ArrowItem } from './ArrowItem';
import { FreeDrawItem } from './FreeDrawItem';
import { TextItem } from './TextItem';

interface WhiteboardCanvasProps {
  boardId: string;
  currentUser: CurrentUser;
  elements: CanvasElement[];
  remoteUsers: UserPresence[];
  currentTool: ToolType;
  selectedColor: string;
  onSelectTool: (tool: ToolType) => void;
  onAddElement: (element: Omit<CanvasElement, 'id' | 'updatedAt'>) => Promise<string>;
  onUpdateElement: (id: string, updates: Partial<CanvasElement>) => Promise<void>;
  onDeleteElement: (id: string) => Promise<void>;
  onCursorMove: (x: number, y: number) => void;
  onSelectionChange: (id: string | null) => void;
  scale: number;
  stagePos: { x: number; y: number };
  onStageChange: (pos: { x: number; y: number }, scale: number) => void;
}

interface InlineEditingState {
  elementId: string;
  worldX: number;
  worldY: number;
  width: number;
  height: number;
  text: string;
}

export const WhiteboardCanvas: React.FC<WhiteboardCanvasProps> = ({
  currentUser,
  elements,
  remoteUsers,
  currentTool,
  selectedColor,
  onSelectTool,
  onAddElement,
  onUpdateElement,
  onDeleteElement,
  onCursorMove,
  onSelectionChange,
  scale,
  stagePos,
  onStageChange,
}) => {
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [inlineEditing, setInlineEditing] = useState<InlineEditingState | null>(null);

  // Estado para desenho com caneta ou criação de seta por arraste
  const [drawingElement, setDrawingElement] = useState<CanvasElement | null>(null);
  const isDrawing = useRef(false);

  // Mapa de colega remoto para o elemento que ele está selecionando
  const remoteSelectionMap = React.useMemo(() => {
    const map: Record<string, { name: string; color: string }> = {};
    remoteUsers.forEach((u) => {
      if (u.selectedElementId) {
        map[u.selectedElementId] = { name: u.name, color: u.color };
      }
    });
    return map;
  }, [remoteUsers]);

  // Atualiza nó anexado ao Transformer
  useEffect(() => {
    if (!transformerRef.current || !stageRef.current) return;
    if (selectedId) {
      const selectedNode = stageRef.current.findOne('#' + selectedId);
      if (selectedNode) {
        transformerRef.current.nodes([selectedNode]);
        transformerRef.current.getLayer()?.batchDraw();
        return;
      }
    }
    transformerRef.current.nodes([]);
    transformerRef.current.getLayer()?.batchDraw();
  }, [selectedId, elements]);

  // Gerencia seleção ativa
  const selectElement = useCallback((id: string | null) => {
    setSelectedId(id);
    onSelectionChange(id);
  }, [onSelectionChange]);

  // Atalhos de teclado (Espaço para pan, Delete para apagar elemento)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Se estiver editando texto num textarea ou input, não dispara atalhos de canvas
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.code === 'Space') {
        setIsSpacePressed(true);
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId) {
          onDeleteElement(selectedId);
          selectElement(null);
        }
      }

      // Atalhos de ferramentas
      if (!e.ctrlKey && !e.metaKey) {
        if (e.key === 'v' || e.key === 'V') onSelectTool('select');
        if (e.key === 'h' || e.key === 'H') onSelectTool('pan');
        if (e.key === 'n' || e.key === 'N') onSelectTool('sticky');
        if (e.key === 'r' || e.key === 'R') onSelectTool('rect');
        if (e.key === 'o' || e.key === 'O') onSelectTool('circle');
        if (e.key === 'a' || e.key === 'A') onSelectTool('arrow');
        if (e.key === 'p' || e.key === 'P') onSelectTool('pen');
        if (e.key === 't' || e.key === 'T') onSelectTool('text');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedId, onDeleteElement, onSelectTool, selectElement]);

  // Converte posição da tela em coordenadas do mundo (canvas)
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

  // Zoom no ponto do mouse com a roda do scroll
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

    // Fator de escala
    const scaleBy = 1.08;
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    let newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;

    // Limites de zoom: 10% a 500%
    newScale = Math.max(0.1, Math.min(5, newScale));

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };

    onStageChange(newPos, newScale);
  };

  // Pressionar mouse no canvas
  const handleMouseDown = async (e: Konva.KonvaEventObject<MouseEvent>) => {
    const isClickedOnStage = e.target === stageRef.current;
    const worldPos = getPointerWorldPos();

    // Se estiver editando texto e clicou fora, confirma edição
    if (inlineEditing) {
      handleFinishEditing();
    }

    if (currentTool === 'pan' || isSpacePressed) {
      return;
    }

    // Desenho livre (Caneta)
    if (currentTool === 'pen') {
      isDrawing.current = true;
      const newFreeDraw: CanvasElement = {
        id: 'temp_pen',
        type: 'pen',
        x: 0,
        y: 0,
        points: [worldPos.x, worldPos.y],
        stroke: '#0f172a',
        strokeWidth: 3,
        zIndex: elements.length + 1,
        updatedBy: currentUser.uid,
        updatedByName: currentUser.displayName,
        updatedAt: Date.now(),
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
        stroke: '#2563eb',
        strokeWidth: 3,
        zIndex: elements.length + 1,
        updatedBy: currentUser.uid,
        updatedByName: currentUser.displayName,
        updatedAt: Date.now(),
      };
      setDrawingElement(newArrow);
      return;
    }

    // Criação de elementos com um clique no canvas vazio
    if (isClickedOnStage) {
      selectElement(null);

      if (currentTool === 'sticky') {
        const id = await onAddElement({
          type: 'sticky',
          x: Math.round(worldPos.x - 90),
          y: Math.round(worldPos.y - 90),
          width: 180,
          height: 180,
          fill: selectedColor,
          text: '',
          zIndex: elements.length + 1,
          updatedBy: currentUser.uid,
          updatedByName: currentUser.displayName,
        });
        selectElement(id);
        onSelectTool('select');
      } else if (currentTool === 'rect') {
        const id = await onAddElement({
          type: 'rect',
          x: Math.round(worldPos.x - 80),
          y: Math.round(worldPos.y - 50),
          width: 160,
          height: 100,
          fill: '#ffffff',
          stroke: '#334155',
          strokeWidth: 2,
          zIndex: elements.length + 1,
          updatedBy: currentUser.uid,
          updatedByName: currentUser.displayName,
        });
        selectElement(id);
        onSelectTool('select');
      } else if (currentTool === 'circle') {
        const id = await onAddElement({
          type: 'circle',
          x: Math.round(worldPos.x),
          y: Math.round(worldPos.y),
          radius: 60,
          width: 120,
          height: 120,
          fill: '#ffffff',
          stroke: '#334155',
          strokeWidth: 2,
          zIndex: elements.length + 1,
          updatedBy: currentUser.uid,
          updatedByName: currentUser.displayName,
        });
        selectElement(id);
        onSelectTool('select');
      } else if (currentTool === 'text') {
        const id = await onAddElement({
          type: 'text',
          x: Math.round(worldPos.x),
          y: Math.round(worldPos.y),
          width: 180,
          text: 'Digite aqui...',
          fontSize: 20,
          fill: '#0f172a',
          zIndex: elements.length + 1,
          updatedBy: currentUser.uid,
          updatedByName: currentUser.displayName,
        });
        selectElement(id);
        onSelectTool('select');
      }
    }
  };

  // Movimento do mouse
  const handleMouseMove = () => {
    const worldPos = getPointerWorldPos();
    // Notifica presença e cursores remotos
    onCursorMove(Math.round(worldPos.x), Math.round(worldPos.y));

    if (!isDrawing.current || !drawingElement) return;

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
  };

  // Soltar botão do mouse
  const handleMouseUp = async () => {
    if (isDrawing.current && drawingElement) {
      isDrawing.current = false;
      if (drawingElement.type === 'pen' && drawingElement.points && drawingElement.points.length > 2) {
        await onAddElement({
          type: 'pen',
          x: 0,
          y: 0,
          points: drawingElement.points.map(p => Math.round(p)),
          stroke: drawingElement.stroke,
          strokeWidth: drawingElement.strokeWidth,
          zIndex: elements.length + 1,
          updatedBy: currentUser.uid,
          updatedByName: currentUser.displayName,
        });
      } else if (drawingElement.type === 'arrow' && drawingElement.points) {
        await onAddElement({
          type: 'arrow',
          x: Math.round(drawingElement.x),
          y: Math.round(drawingElement.y),
          points: drawingElement.points.map(p => Math.round(p)),
          stroke: drawingElement.stroke,
          strokeWidth: drawingElement.strokeWidth,
          zIndex: elements.length + 1,
          updatedBy: currentUser.uid,
          updatedByName: currentUser.displayName,
        });
        onSelectTool('select');
      }
      setDrawingElement(null);
    }
  };

  // Finalizar edição de texto inline
  const handleFinishEditing = () => {
    if (!inlineEditing) return;
    onUpdateElement(inlineEditing.elementId, {
      text: inlineEditing.text,
    });
    setInlineEditing(null);
  };

  const isDraggableStage = currentTool === 'pan' || isSpacePressed;

  return (
    <div
      className={`relative w-full h-full select-none ${
        isDraggableStage ? 'cursor-grab active:cursor-grabbing' : currentTool === 'pen' ? 'cursor-crosshair' : 'cursor-default'
      }`}
    >
      <Stage
        ref={stageRef}
        width={window.innerWidth}
        height={window.innerHeight}
        x={stagePos.x}
        y={stagePos.y}
        scaleX={scale}
        scaleY={scale}
        draggable={isDraggableStage}
        onDragEnd={(e) => {
          if (e.target === stageRef.current) {
            onStageChange({ x: e.target.x(), y: e.target.y() }, scale);
          }
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <Layer>
          {/* Renderização de todos os elementos persistidos */}
          {elements.map((elem) => {
            const isSelected = selectedId === elem.id;
            const remoteSelector = remoteSelectionMap[elem.id];

            if (elem.type === 'sticky') {
              return (
                <StickyNoteItem
                  key={elem.id}
                  element={elem}
                  isSelected={isSelected}
                  remoteSelector={remoteSelector}
                  onSelect={(e) => {
                    e.cancelBubble = true;
                    selectElement(elem.id);
                  }}
                  onChange={(updates) => onUpdateElement(elem.id, updates)}
                  onStartEditing={(id, x, y, width, height, text) => {
                    setInlineEditing({
                      elementId: id,
                      worldX: x,
                      worldY: y,
                      width,
                      height,
                      text,
                    });
                  }}
                />
              );
            }

            if (elem.type === 'rect' || elem.type === 'circle') {
              return (
                <ShapeItem
                  key={elem.id}
                  element={elem}
                  isSelected={isSelected}
                  remoteSelector={remoteSelector}
                  onSelect={(e) => {
                    e.cancelBubble = true;
                    selectElement(elem.id);
                  }}
                  onChange={(updates) => onUpdateElement(elem.id, updates)}
                />
              );
            }

            if (elem.type === 'arrow' || elem.type === 'line') {
              return (
                <ArrowItem
                  key={elem.id}
                  element={elem}
                  isSelected={isSelected}
                  remoteSelector={remoteSelector}
                  onSelect={(e) => {
                    e.cancelBubble = true;
                    selectElement(elem.id);
                  }}
                  onChange={(updates) => onUpdateElement(elem.id, updates)}
                />
              );
            }

            if (elem.type === 'pen') {
              return (
                <FreeDrawItem
                  key={elem.id}
                  element={elem}
                  isSelected={isSelected}
                  remoteSelector={remoteSelector}
                  onSelect={(e) => {
                    e.cancelBubble = true;
                    selectElement(elem.id);
                  }}
                  onChange={(updates) => onUpdateElement(elem.id, updates)}
                />
              );
            }

            if (elem.type === 'text') {
              return (
                <TextItem
                  key={elem.id}
                  element={elem}
                  isSelected={isSelected}
                  remoteSelector={remoteSelector}
                  onSelect={(e) => {
                    e.cancelBubble = true;
                    selectElement(elem.id);
                  }}
                  onChange={(updates) => onUpdateElement(elem.id, updates)}
                  onStartEditing={(id, x, y, width, height, text) => {
                    setInlineEditing({
                      elementId: id,
                      worldX: x,
                      worldY: y,
                      width,
                      height,
                      text,
                    });
                  }}
                />
              );
            }

            return null;
          })}

          {/* Elemento sendo desenhado no momento */}
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

          {/* Konva Transformer para redimensionamento e rotação */}
          <Transformer
            ref={transformerRef}
            boundBoxFunc={(oldBox, newBox) => {
              if (Math.abs(newBox.width) < 20 || Math.abs(newBox.height) < 20) {
                return oldBox;
              }
              return newBox;
            }}
            rotateEnabled={true}
            borderStroke="#2563eb"
            borderStrokeWidth={1.5}
            anchorStroke="#2563eb"
            anchorFill="#ffffff"
            anchorSize={8}
            anchorCornerRadius={2}
          />
        </Layer>
      </Stage>

      {/* Editor Inline Flutuante em HTML quando o usuário dá duplo clique no Post-it ou Texto */}
      {inlineEditing && (
        <textarea
          autoFocus
          value={inlineEditing.text}
          onChange={(e) => setInlineEditing({ ...inlineEditing, text: e.target.value })}
          onBlur={handleFinishEditing}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              handleFinishEditing();
            }
          }}
          className="absolute z-50 p-2 text-slate-800 bg-white/95 rounded-lg border-2 border-blue-500 shadow-xl resize-none outline-none font-sans text-base leading-snug"
          style={{
            left: `${inlineEditing.worldX * scale + stagePos.x}px`,
            top: `${inlineEditing.worldY * scale + stagePos.y}px`,
            width: `${Math.max(160, inlineEditing.width * scale)}px`,
            height: `${Math.max(100, inlineEditing.height * scale)}px`,
          }}
        />
      )}
    </div>
  );
};
