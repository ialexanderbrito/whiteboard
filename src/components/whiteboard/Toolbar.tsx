import React, { useState } from 'react';
import { 
  MousePointer, 
  StickyNote, 
  Square, 
  Circle, 
  ArrowUpRight, 
  Pen, 
  Type, 
  Hand,
  Trash2,
  ZoomIn,
  ZoomOut,
  RotateCcw
} from 'lucide-react';
import type { ToolType } from '../../types/element';
import { STICKY_COLORS } from '../../utils/colors';

interface ToolbarProps {
  currentTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  selectedColor: string;
  onSelectColor: (color: string) => void;
  hasSelection: boolean;
  onDeleteSelected: () => void;
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  currentTool,
  onSelectTool,
  selectedColor,
  onSelectColor,
  hasSelection,
  onDeleteSelected,
  scale,
  onZoomIn,
  onZoomOut,
  onResetZoom,
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);

  const tools = [
    { id: 'select' as ToolType, label: 'Selecionar (V)', icon: MousePointer },
    { id: 'pan' as ToolType, label: 'Mover Tela / Pan (H ou Espaço)', icon: Hand },
    { id: 'sticky' as ToolType, label: 'Post-it (N)', icon: StickyNote, hasColor: true },
    { id: 'rect' as ToolType, label: 'Retângulo (R)', icon: Square },
    { id: 'circle' as ToolType, label: 'Círculo (O)', icon: Circle },
    { id: 'arrow' as ToolType, label: 'Seta (A)', icon: ArrowUpRight },
    { id: 'pen' as ToolType, label: 'Caneta (P)', icon: Pen },
    { id: 'text' as ToolType, label: 'Texto (T)', icon: Type },
  ];

  return (
    <>
      {/* Barra de Ferramentas Flutuante Estilo Miro (Lateral Esquerda) */}
      <div className="absolute left-6 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center bg-white rounded-2xl shadow-xl border border-slate-200/80 p-1.5 gap-1">
        {tools.map((tool) => {
          const Icon = tool.icon;
          const isActive = currentTool === tool.id;

          return (
            <div key={tool.id} className="relative">
              <button
                type="button"
                onClick={() => {
                  onSelectTool(tool.id);
                  if (tool.id === 'sticky') {
                    setShowColorPicker(!showColorPicker);
                  } else {
                    setShowColorPicker(false);
                  }
                }}
                title={tool.label}
                className={`p-2.5 rounded-xl transition-all flex items-center justify-center relative ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon size={20} strokeWidth={2} />
                {tool.id === 'sticky' && (
                  <span
                    className="absolute bottom-1.5 right-1.5 w-2 h-2 rounded-full border border-white"
                    style={{ backgroundColor: selectedColor }}
                  />
                )}
              </button>

              {/* Seletor de cores de post-it */}
              {tool.id === 'sticky' && showColorPicker && (
                <div className="absolute left-full ml-3 top-0 bg-white p-2 rounded-xl shadow-lg border border-slate-200 flex gap-1.5 z-40">
                  {STICKY_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => {
                        onSelectColor(c.value);
                        onSelectTool('sticky');
                        setShowColorPicker(false);
                      }}
                      className={`w-6 h-6 rounded-lg transition-transform hover:scale-110 border ${
                        selectedColor === c.value ? 'ring-2 ring-blue-500 ring-offset-1' : 'border-slate-300'
                      }`}
                      style={{ backgroundColor: c.value }}
                      title={c.name}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Separador */}
        <div className="w-6 h-[1px] bg-slate-200 my-1" />

        {/* Botão de Deletar Selecionado */}
        <button
          type="button"
          onClick={onDeleteSelected}
          disabled={!hasSelection}
          title="Excluir Elemento Selecionado (Del)"
          className={`p-2.5 rounded-xl transition-all flex items-center justify-center ${
            hasSelection
              ? 'text-red-600 hover:bg-red-50 cursor-pointer'
              : 'text-slate-300 cursor-not-allowed'
          }`}
        >
          <Trash2 size={20} strokeWidth={2} />
        </button>
      </div>

      {/* Controles de Zoom Flutuantes no Canto Inferior Esquerdo */}
      <div className="absolute bottom-6 left-6 z-30 flex items-center bg-white rounded-xl shadow-lg border border-slate-200/80 px-2 py-1 gap-1">
        <button
          type="button"
          onClick={onZoomOut}
          title="Reduzir Zoom (-)"
          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition"
        >
          <ZoomOut size={16} />
        </button>
        <button
          type="button"
          onClick={onResetZoom}
          title="Redefinir Zoom para 100%"
          className="text-xs font-semibold px-2 text-slate-700 hover:bg-slate-100 py-1 rounded transition flex items-center gap-1"
        >
          <span>{Math.round(scale * 100)}%</span>
          <RotateCcw size={12} className="text-slate-400" />
        </button>
        <button
          type="button"
          onClick={onZoomIn}
          title="Aumentar Zoom (+)"
          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition"
        >
          <ZoomIn size={16} />
        </button>
      </div>
    </>
  );
};
