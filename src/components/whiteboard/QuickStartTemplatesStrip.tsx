import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Loader2,
  Filter,
  Check,
} from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SPRINT_TEMPLATES,
  TEMPLATE_CATEGORIES,
  type SprintTemplate,
  type TemplateRoleCategory,
  type TemplatePreviewVariant,
} from '@/utils/sprintTemplates';

const COLLAPSE_STORAGE_KEY = 'mirio_quick_templates_collapsed';

interface QuickStartTemplatesStripProps {
  userName?: string;
  onCreateBlankBoard: () => void;
  onQuickCreateFromTemplate: (template: SprintTemplate) => void;
  creatingTemplateId?: string | null;
  isCreating?: boolean;
}

/**
 * Renderiza miniaturas SVG arquiteturais sob medida para cada categoria de template,
 * mantendo coerência estética com o BoardCardPreview do Dashboard.
 */
export const TemplateSchematicPreview: React.FC<{ variant: TemplatePreviewVariant }> = React.memo(
  ({ variant }) => {
    switch (variant) {
      case 'retro_4ls':
        return (
          <svg viewBox="0 0 180 100" className="w-full h-full" aria-hidden="true">
            {[
              { x: 12, stroke: '#e11d48', fill: '#fecdd3' },
              { x: 51, stroke: '#059669', fill: '#a7f3d0' },
              { x: 90, stroke: '#ca8a04', fill: '#fef08a' },
              { x: 129, stroke: '#2563eb', fill: '#bfdbfe' },
            ].map((col, idx) => (
              <g key={idx}>
                <rect
                  x={col.x}
                  y="14"
                  width="35"
                  height="72"
                  rx="4"
                  fill="currentColor"
                  className="text-background/90 dark:text-zinc-900/90"
                  stroke={col.stroke}
                  strokeWidth="1.2"
                  strokeOpacity="0.55"
                />
                <rect
                  x={col.x}
                  y="14"
                  width="35"
                  height="9"
                  rx="3"
                  fill={col.stroke}
                  fillOpacity="0.85"
                />
                <rect x={col.x + 4} y="28" width="27" height="16" rx="2.5" fill={col.fill} />
                <line
                  x1={col.x + 7}
                  y1="34"
                  x2={col.x + 25}
                  y2="34"
                  stroke="#0f172a"
                  strokeOpacity="0.35"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <rect x={col.x + 4} y="48" width="27" height="16" rx="2.5" fill={col.fill} />
                <line
                  x1={col.x + 7}
                  y1="54"
                  x2={col.x + 22}
                  y2="54"
                  stroke="#0f172a"
                  strokeOpacity="0.35"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <rect
                  x={col.x + 4}
                  y="68"
                  width="27"
                  height="12"
                  rx="2"
                  fill={col.fill}
                  fillOpacity="0.7"
                />
              </g>
            ))}
          </svg>
        );

      case 'flowchart':
        return (
          <svg viewBox="0 0 180 100" className="w-full h-full" aria-hidden="true">
            {/* Círculo Inicial */}
            <circle
              cx="26"
              cy="50"
              r="12"
              fill="#bbf7d0"
              stroke="#059669"
              strokeWidth="1.4"
            />
            <line x1="39" y1="50" x2="52" y2="50" stroke="#64748b" strokeWidth="1.5" />
            {/* Nó API Gateway */}
            <rect
              x="53"
              y="38"
              width="32"
              height="24"
              rx="4"
              fill="#bae6fd"
              stroke="#0284c7"
              strokeWidth="1.4"
            />
            <line x1="86" y1="50" x2="98" y2="50" stroke="#64748b" strokeWidth="1.5" />
            {/* Losango de Decisão */}
            <polygon
              points="114,32 132,50 114,68 96,50"
              fill="#fef08a"
              stroke="#ca8a04"
              strokeWidth="1.4"
            />
            {/* Ramo Superior (Sucesso) */}
            <path
              d="M 126 42 L 138 28 L 144 28"
              fill="none"
              stroke="#059669"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
            <rect
              x="144"
              y="18"
              width="24"
              height="20"
              rx="3.5"
              fill="#bbf7d0"
              stroke="#059669"
              strokeWidth="1.3"
            />
            {/* Ramo Inferior (Erro 401) */}
            <path
              d="M 126 58 L 138 72 L 144 72"
              fill="none"
              stroke="#e11d48"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
            <rect
              x="144"
              y="62"
              width="24"
              height="20"
              rx="3.5"
              fill="#fecdd3"
              stroke="#e11d48"
              strokeWidth="1.3"
            />
          </svg>
        );

      case 'roadmap':
        return (
          <svg viewBox="0 0 180 100" className="w-full h-full" aria-hidden="true">
            {/* Barra de Timeline Q1-Q4 */}
            <rect x="14" y="14" width="36" height="10" rx="3" fill="#10b981" fillOpacity="0.85" />
            <rect x="54" y="14" width="36" height="10" rx="3" fill="#3b82f6" fillOpacity="0.85" />
            <rect x="94" y="14" width="36" height="10" rx="3" fill="#8b5cf6" fillOpacity="0.85" />
            <rect x="134" y="14" width="32" height="10" rx="3" fill="#f59e0b" fillOpacity="0.85" />
            {/* Barras de entregas horizontais estilo Gantt/Roadmap */}
            <rect
              x="14"
              y="30"
              width="64"
              height="14"
              rx="3.5"
              fill="#bbf7d0"
              stroke="#059669"
              strokeWidth="1.1"
            />
            <rect
              x="34"
              y="49"
              width="74"
              height="14"
              rx="3.5"
              fill="#bae6fd"
              stroke="#0284c7"
              strokeWidth="1.1"
            />
            <rect
              x="82"
              y="68"
              width="68"
              height="14"
              rx="3.5"
              fill="#ddd6fe"
              stroke="#7c3aed"
              strokeWidth="1.1"
            />
            <circle cx="156" cy="37" r="5" fill="#fef08a" stroke="#ca8a04" strokeWidth="1.2" />
          </svg>
        );

      case 'prototype':
        return (
          <svg viewBox="0 0 180 100" className="w-full h-full" aria-hidden="true">
            {[
              { x: 15, stroke: '#0284c7', hero: '#bae6fd', cta: '#0284c7' },
              { x: 69, stroke: '#7c3aed', hero: '#ddd6fe', cta: '#7c3aed' },
              { x: 123, stroke: '#059669', hero: '#bbf7d0', cta: '#059669' },
            ].map((scr, idx) => (
              <g key={idx}>
                <rect
                  x={scr.x}
                  y="14"
                  width="42"
                  height="72"
                  rx="5"
                  fill="currentColor"
                  className="text-background/95 dark:text-zinc-900/95"
                  stroke={scr.stroke}
                  strokeWidth="1.3"
                />
                {/* Top bar */}
                <rect x={scr.x + 4} y="19" width="34" height="6" rx="1.5" fill="#94a3b8" fillOpacity="0.35" />
                {/* Hero block */}
                <rect x={scr.x + 4} y="28" width="34" height="22" rx="2.5" fill={scr.hero} />
                {/* CTA button */}
                <rect x={scr.x + 4} y="54" width="34" height="9" rx="2" fill={scr.cta} />
                {/* Sticky note */}
                <rect x={scr.x + 4} y="67" width="34" height="14" rx="2" fill="#fef08a" />
                {idx < 2 && (
                  <line
                    x1={scr.x + 43}
                    y1="48"
                    x2={scr.x + 53}
                    y2="48"
                    stroke="#64748b"
                    strokeWidth="1.4"
                    strokeDasharray="2 1.5"
                  />
                )}
              </g>
            ))}
          </svg>
        );

      case 'eisenhower':
        return (
          <svg viewBox="0 0 180 100" className="w-full h-full" aria-hidden="true">
            {/* 4 Quadrantes 2x2 */}
            <rect
              x="16"
              y="12"
              width="70"
              height="36"
              rx="4"
              fill="#fecdd3"
              stroke="#ef4444"
              strokeWidth="1.2"
            />
            <rect
              x="94"
              y="12"
              width="70"
              height="36"
              rx="4"
              fill="#bae6fd"
              stroke="#3b82f6"
              strokeWidth="1.2"
            />
            <rect
              x="16"
              y="52"
              width="70"
              height="36"
              rx="4"
              fill="#fef08a"
              stroke="#eab308"
              strokeWidth="1.2"
            />
            <rect
              x="94"
              y="52"
              width="70"
              height="36"
              rx="4"
              fill="#e2e8f0"
              stroke="#64748b"
              strokeWidth="1.2"
            />
            {/* Linhas internas simulando post-its */}
            <rect x="22" y="18" width="26" height="14" rx="2" fill="#ffffff" fillOpacity="0.75" />
            <rect x="52" y="18" width="26" height="14" rx="2" fill="#ffffff" fillOpacity="0.75" />
            <rect x="100" y="18" width="26" height="14" rx="2" fill="#ffffff" fillOpacity="0.75" />
            <rect x="22" y="58" width="26" height="14" rx="2" fill="#ffffff" fillOpacity="0.75" />
            <rect x="100" y="58" width="26" height="14" rx="2" fill="#ffffff" fillOpacity="0.75" />
          </svg>
        );

      case 'crazy8s':
        return (
          <svg viewBox="0 0 180 100" className="w-full h-full" aria-hidden="true">
            {[0, 1, 2, 3].map((col) =>
              [0, 1].map((row) => {
                const fills = ['#fef08a', '#bbf7d0', '#bae6fd', '#ddd6fe'];
                const strokes = ['#ca8a04', '#16a34a', '#0284c7', '#7c3aed'];
                const colorIdx = (col + row) % 4;
                return (
                  <rect
                    key={`${col}-${row}`}
                    x={16 + col * 38}
                    y={16 + row * 36}
                    width="32"
                    height="30"
                    rx="3.5"
                    fill={fills[colorIdx]}
                    stroke={strokes[colorIdx]}
                    strokeWidth="1.2"
                  />
                );
              })
            )}
          </svg>
        );

      case 'lean_canvas':
        return (
          <svg viewBox="0 0 180 100" className="w-full h-full" aria-hidden="true">
            {/* Grade Clássica do Lean Canvas */}
            <rect x="14" y="14" width="28" height="48" rx="3" fill="#fecdd3" stroke="#f43f5e" strokeWidth="1.1" />
            <rect x="45" y="14" width="28" height="22" rx="3" fill="#bbf7d0" stroke="#10b981" strokeWidth="1.1" />
            <rect x="45" y="40" width="28" height="22" rx="3" fill="#bae6fd" stroke="#0284c7" strokeWidth="1.1" />
            <rect x="76" y="14" width="28" height="48" rx="3" fill="#ddd6fe" stroke="#8b5cf6" strokeWidth="1.2" />
            <rect x="107" y="14" width="28" height="22" rx="3" fill="#fde68a" stroke="#f59e0b" strokeWidth="1.1" />
            <rect x="107" y="40" width="28" height="22" rx="3" fill="#e2e8f0" stroke="#64748b" strokeWidth="1.1" />
            <rect x="138" y="14" width="28" height="48" rx="3" fill="#bbf7d0" stroke="#059669" strokeWidth="1.1" />
            {/* Base de Custos & Receitas */}
            <rect x="14" y="66" width="74" height="20" rx="3" fill="#fef08a" stroke="#ca8a04" strokeWidth="1.1" />
            <rect x="92" y="66" width="74" height="20" rx="3" fill="#a7f3d0" stroke="#059669" strokeWidth="1.1" />
          </svg>
        );

      case 'story_map':
        return (
          <svg viewBox="0 0 180 100" className="w-full h-full" aria-hidden="true">
            {/* Backbone Horizontal */}
            {[0, 1, 2, 3].map((i) => (
              <rect
                key={`top-${i}`}
                x={14 + i * 39}
                y="14"
                width="35"
                height="14"
                rx="3"
                fill="#ddd6fe"
                stroke="#7c3aed"
                strokeWidth="1.2"
              />
            ))}
            <line x1="12" y1="34" x2="168" y2="34" stroke="#64748b" strokeWidth="1" strokeDasharray="3 2" />
            {/* Slices MVP */}
            {[0, 1, 2, 3].map((i) => (
              <g key={`slice-${i}`}>
                <rect x={14 + i * 39} y="40" width="35" height="18" rx="2.5" fill="#bbf7d0" stroke="#059669" strokeWidth="1.1" />
                <rect x={14 + i * 39} y="64" width="35" height="18" rx="2.5" fill="#bae6fd" stroke="#0284c7" strokeWidth="1.1" />
              </g>
            ))}
          </svg>
        );

      case 'raci_matrix':
        return (
          <svg viewBox="0 0 180 100" className="w-full h-full" aria-hidden="true">
            {/* Moldura da Tabela RACI */}
            <rect
              x="14"
              y="14"
              width="152"
              height="72"
              rx="4"
              fill="currentColor"
              className="text-background/90 dark:text-zinc-900/90"
              stroke="#0284c7"
              strokeWidth="1.2"
              strokeOpacity="0.6"
            />
            {/* Linha do Cabeçalho */}
            <rect x="14" y="14" width="152" height="15" rx="3" fill="#0284c7" fillOpacity="0.85" />
            <line x1="60" y1="14" x2="60" y2="86" stroke="#0284c7" strokeWidth="1" strokeOpacity="0.4" />
            <line x1="88" y1="14" x2="88" y2="86" stroke="#0284c7" strokeWidth="1" strokeOpacity="0.4" />
            <line x1="116" y1="14" x2="116" y2="86" stroke="#0284c7" strokeWidth="1" strokeOpacity="0.4" />
            <line x1="144" y1="14" x2="144" y2="86" stroke="#0284c7" strokeWidth="1" strokeOpacity="0.4" />
            {/* Linha 1 */}
            <line x1="14" y1="38" x2="166" y2="38" stroke="#94a3b8" strokeWidth="1" strokeOpacity="0.3" />
            <rect x="18" y="32" width="36" height="3" rx="1.5" fill="#64748b" fillOpacity="0.5" />
            <rect x="68" y="31" width="12" height="6" rx="2" fill="#a7f3d0" />
            <rect x="96" y="31" width="12" height="6" rx="2" fill="#fde68a" />
            <rect x="124" y="31" width="12" height="6" rx="2" fill="#fde68a" />
            <rect x="150" y="31" width="12" height="6" rx="2" fill="#ddd6fe" />
            {/* Linha 2 */}
            <line x1="14" y1="54" x2="166" y2="54" stroke="#94a3b8" strokeWidth="1" strokeOpacity="0.3" />
            <rect x="18" y="44" width="32" height="3" rx="1.5" fill="#64748b" fillOpacity="0.5" />
            <rect x="68" y="43" width="12" height="6" rx="2" fill="#fde68a" />
            <rect x="96" y="43" width="12" height="6" rx="2" fill="#ddd6fe" />
            <rect x="124" y="43" width="12" height="6" rx="2" fill="#bfdbfe" />
            <rect x="150" y="43" width="12" height="6" rx="2" fill="#ddd6fe" />
            {/* Linha 3 */}
            <line x1="14" y1="70" x2="166" y2="70" stroke="#94a3b8" strokeWidth="1" strokeOpacity="0.3" />
            <rect x="18" y="60" width="38" height="3" rx="1.5" fill="#64748b" fillOpacity="0.5" />
            <rect x="68" y="59" width="12" height="6" rx="2" fill="#ddd6fe" />
            <rect x="96" y="59" width="12" height="6" rx="2" fill="#a7f3d0" />
            <rect x="124" y="59" width="12" height="6" rx="2" fill="#ddd6fe" />
            <rect x="150" y="59" width="12" height="6" rx="2" fill="#bfdbfe" />
            {/* Linha 4 */}
            <rect x="18" y="76" width="30" height="3" rx="1.5" fill="#64748b" fillOpacity="0.5" />
            <rect x="68" y="75" width="12" height="6" rx="2" fill="#bfdbfe" />
            <rect x="96" y="75" width="12" height="6" rx="2" fill="#fde68a" />
            <rect x="124" y="75" width="12" height="6" rx="2" fill="#a7f3d0" />
            <rect x="150" y="75" width="12" height="6" rx="2" fill="#fde68a" />
          </svg>
        );

      case 'tech_spec':
        return (
          <svg viewBox="0 0 180 100" className="w-full h-full" aria-hidden="true">
            {/* Bloco de Código Editor (Esquerda) */}
            <rect
              x="12"
              y="16"
              width="88"
              height="68"
              rx="4"
              fill="#0f172a"
              stroke="#7c3aed"
              strokeWidth="1.2"
            />
            {/* Botões do Editor Mac-style */}
            <circle cx="20" cy="23" r="1.8" fill="#ef4444" />
            <circle cx="26" cy="23" r="1.8" fill="#eab308" />
            <circle cx="32" cy="23" r="1.8" fill="#22c55e" />
            {/* Linhas de Código com Syntax Highlighting */}
            <rect x="20" y="31" width="36" height="3" rx="1.5" fill="#a855f7" />
            <rect x="26" y="38" width="52" height="3" rx="1.5" fill="#38bdf8" />
            <rect x="26" y="45" width="44" height="3" rx="1.5" fill="#4ade80" />
            <rect x="26" y="52" width="60" height="3" rx="1.5" fill="#fbbf24" />
            <rect x="20" y="60" width="28" height="3" rx="1.5" fill="#a855f7" />
            <rect x="20" y="68" width="48" height="3" rx="1.5" fill="#94a3b8" />
            {/* Conector com Seta */}
            <path
              d="M 103 48 L 115 48"
              stroke="#7c3aed"
              strokeWidth="1.5"
              strokeDasharray="2 1.5"
            />
            <polygon points="115,45 119,48 115,51" fill="#7c3aed" />
            {/* Caixa de SLAs / Microsserviço (Direita) */}
            <rect
              x="122"
              y="20"
              width="46"
              height="60"
              rx="4"
              fill="currentColor"
              className="text-background/90 dark:text-zinc-900/90"
              stroke="#7c3aed"
              strokeWidth="1.2"
              strokeOpacity="0.7"
            />
            <rect x="122" y="20" width="46" height="10" rx="3" fill="#7c3aed" fillOpacity="0.8" />
            <rect x="126" y="36" width="38" height="7" rx="2" fill="#bbf7d0" stroke="#059669" strokeWidth="0.8" />
            <rect x="126" y="47" width="38" height="7" rx="2" fill="#bae6fd" stroke="#0284c7" strokeWidth="0.8" />
            <rect x="126" y="58" width="38" height="7" rx="2" fill="#ddd6fe" stroke="#7c3aed" strokeWidth="0.8" />
            <rect x="126" y="69" width="38" height="7" rx="2" fill="#fed7aa" stroke="#ea580c" strokeWidth="0.8" />
          </svg>
        );

      case 'revenue_funnel':
        return (
          <svg viewBox="0 0 180 100" className="w-full h-full" aria-hidden="true">
            {/* 4 Etapas do Funil RCD Cascata */}
            {/* Etapa 1: Aquisição */}
            <polygon
              points="16,14 164,14 148,30 32,30"
              fill="#3b82f6"
              fillOpacity="0.85"
              stroke="#2563eb"
              strokeWidth="1.2"
            />
            <line x1="50" y1="22" x2="130" y2="22" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.85" strokeLinecap="round" />
            {/* Etapa 2: Ativação */}
            <polygon
              points="35,34 145,34 132,50 48,50"
              fill="#06b6d4"
              fillOpacity="0.85"
              stroke="#0891b2"
              strokeWidth="1.2"
            />
            <line x1="62" y1="42" x2="118" y2="42" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.85" strokeLinecap="round" />
            {/* Etapa 3: Monetização */}
            <polygon
              points="51,54 129,54 116,70 64,70"
              fill="#10b981"
              fillOpacity="0.85"
              stroke="#059669"
              strokeWidth="1.2"
            />
            <line x1="74" y1="62" x2="106" y2="62" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.85" strokeLinecap="round" />
            {/* Etapa 4: Retenção */}
            <rect
              x="67"
              y="74"
              width="46"
              height="16"
              rx="3"
              fill="#8b5cf6"
              stroke="#7c3aed"
              strokeWidth="1.2"
            />
            <line x1="77" y1="82" x2="103" y2="82" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.9" strokeLinecap="round" />
          </svg>
        );

      case 'mindmap_discovery':
        return (
          <svg viewBox="0 0 180 100" className="w-full h-full" aria-hidden="true">
            {/* Conectores Curvos Centro -> Filhos */}
            <path d="M 90 50 C 65 50, 65 30, 48 30" fill="none" stroke="#3b82f6" strokeWidth="1.3" />
            <path d="M 90 50 C 65 50, 65 70, 48 70" fill="none" stroke="#3b82f6" strokeWidth="1.3" />
            <path d="M 90 50 C 115 50, 115 30, 132 30" fill="none" stroke="#3b82f6" strokeWidth="1.3" />
            <path d="M 90 50 C 115 50, 115 70, 132 70" fill="none" stroke="#3b82f6" strokeWidth="1.3" />
            {/* Nó Central */}
            <rect
              x="66"
              y="38"
              width="48"
              height="24"
              rx="5"
              fill="#eff6ff"
              stroke="#2563eb"
              strokeWidth="1.5"
            />
            <rect x="73" y="47" width="34" height="6" rx="2" fill="#2563eb" />
            {/* Filhos Esquerda */}
            <rect x="12" y="22" width="36" height="16" rx="3.5" fill="#fef3c7" stroke="#d97706" strokeWidth="1.2" />
            <rect x="16" y="28" width="28" height="4" rx="1.5" fill="#78350f" fillOpacity="0.65" />
            <rect x="12" y="62" width="36" height="16" rx="3.5" fill="#fef3c7" stroke="#d97706" strokeWidth="1.2" />
            <rect x="16" y="68" width="28" height="4" rx="1.5" fill="#78350f" fillOpacity="0.65" />
            {/* Filhos Direita */}
            <rect x="132" y="22" width="36" height="16" rx="3.5" fill="#dcfce7" stroke="#16a34a" strokeWidth="1.2" />
            <rect x="136" y="28" width="28" height="4" rx="1.5" fill="#14532d" fillOpacity="0.65" />
            <rect x="132" y="62" width="36" height="16" rx="3.5" fill="#dcfce7" stroke="#16a34a" strokeWidth="1.2" />
            <rect x="136" y="68" width="28" height="4" rx="1.5" fill="#14532d" fillOpacity="0.65" />
          </svg>
        );

      case 'kanban_interactive':
        return (
          <svg viewBox="0 0 180 100" className="w-full h-full" aria-hidden="true">
            {/* Moldura do Kanban */}
            <rect
              x="12"
              y="14"
              width="156"
              height="72"
              rx="5"
              fill="currentColor"
              className="text-background/90 dark:text-zinc-900/90"
              stroke="#2563eb"
              strokeWidth="1.2"
              strokeOpacity="0.6"
            />
            {/* Top title bar */}
            <rect x="12" y="14" width="156" height="11" rx="4" fill="#2563eb" fillOpacity="0.85" />
            <rect x="18" y="18" width="45" height="3" rx="1.5" fill="#ffffff" />
            {/* 3 Colunas Internas */}
            {/* Coluna 1 */}
            <rect x="17" y="29" width="46" height="52" rx="3" fill="#64748b" fillOpacity="0.12" />
            <rect x="20" y="32" width="24" height="4" rx="1.5" fill="#64748b" />
            <rect x="20" y="40" width="40" height="16" rx="2.5" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.8" />
            <rect x="20" y="40" width="3" height="16" rx="1.5" fill="#f59e0b" />
            <rect x="20" y="60" width="40" height="16" rx="2.5" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.8" />
            <rect x="20" y="60" width="3" height="16" rx="1.5" fill="#3b82f6" />
            {/* Coluna 2 */}
            <rect x="67" y="29" width="46" height="52" rx="3" fill="#2563eb" fillOpacity="0.12" />
            <rect x="70" y="32" width="28" height="4" rx="1.5" fill="#2563eb" />
            <rect x="70" y="40" width="40" height="16" rx="2.5" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.8" />
            <rect x="70" y="40" width="3" height="16" rx="1.5" fill="#8b5cf6" />
            <rect x="70" y="60" width="40" height="16" rx="2.5" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.8" />
            <rect x="70" y="60" width="3" height="16" rx="1.5" fill="#10b981" />
            {/* Coluna 3 (Done) */}
            <rect x="117" y="29" width="46" height="52" rx="3" fill="#10b981" fillOpacity="0.12" />
            <rect x="120" y="32" width="22" height="4" rx="1.5" fill="#10b981" />
            <rect x="120" y="40" width="40" height="16" rx="2.5" fill="#ffffff" stroke="#10b981" strokeWidth="0.8" />
            <circle cx="125" cy="48" r="3" fill="#10b981" />
            <rect x="120" y="60" width="40" height="16" rx="2.5" fill="#ffffff" stroke="#10b981" strokeWidth="0.8" />
            <circle cx="125" cy="68" r="3" fill="#10b981" />
          </svg>
        );

      case 'rice_matrix':
        return (
          <svg viewBox="0 0 180 100" className="w-full h-full" aria-hidden="true">
            {/* Grid Scorecard */}
            <rect
              x="14"
              y="14"
              width="152"
              height="72"
              rx="4"
              fill="currentColor"
              className="text-background/90 dark:text-zinc-900/90"
              stroke="#ea580c"
              strokeWidth="1.2"
              strokeOpacity="0.6"
            />
            {/* Linha do Cabeçalho */}
            <rect x="14" y="14" width="152" height="16" rx="3" fill="#ea580c" fillOpacity="0.85" />
            <line x1="58" y1="14" x2="58" y2="86" stroke="#ea580c" strokeWidth="1" strokeOpacity="0.4" />
            <line x1="82" y1="14" x2="82" y2="86" stroke="#ea580c" strokeWidth="1" strokeOpacity="0.4" />
            <line x1="106" y1="14" x2="106" y2="86" stroke="#ea580c" strokeWidth="1" strokeOpacity="0.4" />
            <line x1="130" y1="14" x2="130" y2="86" stroke="#ea580c" strokeWidth="1" strokeOpacity="0.4" />
            {/* Pílulas do Cabeçalho */}
            <rect x="20" y="20" width="28" height="4" rx="1.5" fill="#ffffff" />
            <rect x="65" y="20" width="10" height="4" rx="1" fill="#fed7aa" />
            <rect x="89" y="20" width="10" height="4" rx="1" fill="#fed7aa" />
            <rect x="113" y="20" width="10" height="4" rx="1" fill="#fed7aa" />
            <rect x="137" y="20" width="18" height="4" rx="1" fill="#ffedd5" />
            {/* Linha 1 */}
            <line x1="14" y1="38" x2="166" y2="38" stroke="#94a3b8" strokeWidth="1" strokeOpacity="0.3" />
            <rect x="18" y="32" width="34" height="3" rx="1.5" fill="#64748b" fillOpacity="0.6" />
            <rect x="64" y="31" width="12" height="5" rx="1.5" fill="#bfdbfe" />
            <rect x="88" y="31" width="12" height="5" rx="1.5" fill="#a7f3d0" />
            <rect x="112" y="31" width="12" height="5" rx="1.5" fill="#a7f3d0" />
            <rect x="134" y="30" width="26" height="7" rx="2" fill="#16a34a" />
            {/* Linha 2 */}
            <line x1="14" y1="54" x2="166" y2="54" stroke="#94a3b8" strokeWidth="1" strokeOpacity="0.3" />
            <rect x="18" y="45" width="30" height="3" rx="1.5" fill="#64748b" fillOpacity="0.6" />
            <rect x="64" y="44" width="12" height="5" rx="1.5" fill="#bfdbfe" />
            <rect x="88" y="44" width="12" height="5" rx="1.5" fill="#fed7aa" />
            <rect x="112" y="44" width="12" height="5" rx="1.5" fill="#fde68a" />
            <rect x="134" y="43" width="26" height="7" rx="2" fill="#2563eb" />
            {/* Linha 3 */}
            <line x1="14" y1="70" x2="166" y2="70" stroke="#94a3b8" strokeWidth="1" strokeOpacity="0.3" />
            <rect x="18" y="61" width="36" height="3" rx="1.5" fill="#64748b" fillOpacity="0.6" />
            <rect x="64" y="60" width="12" height="5" rx="1.5" fill="#e2e8f0" />
            <rect x="88" y="60" width="12" height="5" rx="1.5" fill="#fed7aa" />
            <rect x="112" y="60" width="12" height="5" rx="1.5" fill="#fde68a" />
            <rect x="134" y="59" width="26" height="7" rx="2" fill="#f59e0b" />
            {/* Linha 4 */}
            <rect x="18" y="77" width="26" height="3" rx="1.5" fill="#64748b" fillOpacity="0.6" />
            <rect x="64" y="76" width="12" height="5" rx="1.5" fill="#e2e8f0" />
            <rect x="88" y="76" width="12" height="5" rx="1.5" fill="#e2e8f0" />
            <rect x="112" y="76" width="12" height="5" rx="1.5" fill="#e2e8f0" />
            <rect x="134" y="75" width="26" height="7" rx="2" fill="#94a3b8" />
          </svg>
        );

      case 'post_mortem':
        return (
          <svg viewBox="0 0 180 100" className="w-full h-full" aria-hidden="true">
            {/* Tabela de Timeline de Incidente */}
            <rect
              x="12"
              y="14"
              width="100"
              height="44"
              rx="4"
              fill="currentColor"
              className="text-background/90 dark:text-zinc-900/90"
              stroke="#ef4444"
              strokeWidth="1.2"
              strokeOpacity="0.75"
            />
            {/* Header da Tabela SRE */}
            <rect x="12" y="14" width="100" height="11" rx="3" fill="#ef4444" fillOpacity="0.88" />
            <rect x="18" y="18" width="24" height="3" rx="1" fill="#ffffff" />
            <rect x="52" y="18" width="18" height="3" rx="1" fill="#fee2e2" />
            <rect x="78" y="18" width="28" height="3" rx="1" fill="#fee2e2" />
            {/* Linhas de Incidentes */}
            <line x1="12" y1="25" x2="112" y2="25" stroke="#ef4444" strokeWidth="0.8" strokeOpacity="0.25" />
            <rect x="16" y="27" width="14" height="3" rx="1" fill="#ef4444" />
            <rect x="34" y="27" width="12" height="4" rx="1.5" fill="#dc2626" />
            <rect x="52" y="27" width="54" height="3" rx="1" fill="#64748b" fillOpacity="0.5" />

            <line x1="12" y1="36" x2="112" y2="36" stroke="#ef4444" strokeWidth="0.8" strokeOpacity="0.25" />
            <rect x="16" y="38" width="14" height="3" rx="1" fill="#f59e0b" />
            <rect x="34" y="38" width="12" height="4" rx="1.5" fill="#ea580c" />
            <rect x="52" y="38" width="48" height="3" rx="1" fill="#64748b" fillOpacity="0.5" />

            <line x1="12" y1="47" x2="112" y2="47" stroke="#ef4444" strokeWidth="0.8" strokeOpacity="0.25" />
            <rect x="16" y="49" width="14" height="3" rx="1" fill="#10b981" />
            <rect x="34" y="49" width="12" height="4" rx="1.5" fill="#16a34a" />
            <rect x="52" y="49" width="52" height="3" rx="1" fill="#16a34a" fillOpacity="0.75" />

            {/* Checklist de Mitigação SRE (Direita) */}
            <rect
              x="118"
              y="14"
              width="50"
              height="44"
              rx="4"
              fill="currentColor"
              className="text-background/90 dark:text-zinc-900/90"
              stroke="#ef4444"
              strokeWidth="1.2"
              strokeOpacity="0.5"
            />
            <rect x="118" y="14" width="50" height="9" rx="3" fill="#ef4444" fillOpacity="0.35" />
            <rect x="122" y="17" width="22" height="3" rx="1" fill="#ffffff" />
            <circle cx="125" cy="28" r="2.5" fill="#10b981" />
            <rect x="130" y="27" width="32" height="2.5" rx="1" fill="#64748b" fillOpacity="0.6" />
            <circle cx="125" cy="36" r="2.5" fill="#10b981" />
            <rect x="130" y="35" width="28" height="2.5" rx="1" fill="#64748b" fillOpacity="0.6" />
            <circle cx="125" cy="44" r="2.5" stroke="#ef4444" strokeWidth="1" fill="none" />
            <rect x="130" y="43" width="30" height="2.5" rx="1" fill="#ef4444" fillOpacity="0.6" />
            <circle cx="125" cy="52" r="2.5" stroke="#94a3b8" strokeWidth="1" fill="none" />
            <rect x="130" y="51" width="26" height="2.5" rx="1" fill="#94a3b8" fillOpacity="0.5" />

            {/* Linha dos 5 Porquês (Abaixo) */}
            {[
              { x: 12, w: 36, fill: '#fee2e2', stroke: '#ef4444' },
              { x: 52, w: 36, fill: '#fef3c7', stroke: '#f59e0b' },
              { x: 92, w: 36, fill: '#fef9c3', stroke: '#eab308' },
              { x: 132, w: 36, fill: '#dcfce7', stroke: '#10b981' },
            ].map((node, i) => (
              <g key={i}>
                <rect
                  x={node.x}
                  y="64"
                  width={node.w}
                  height="22"
                  rx="3"
                  fill={node.fill}
                  stroke={node.stroke}
                  strokeWidth="1.2"
                />
                <rect x={node.x + 3} y="68" width="16" height="3" rx="1" fill="#0f172a" fillOpacity="0.6" />
                <rect x={node.x + 3} y="74" width="28" height="2.5" rx="1" fill="#0f172a" fillOpacity="0.4" />
                <rect x={node.x + 3} y="79" width="20" height="2" rx="0.8" fill="#0f172a" fillOpacity="0.3" />
              </g>
            ))}
          </svg>
        );

      case 'design_system':
        return (
          <svg viewBox="0 0 180 100" className="w-full h-full" aria-hidden="true">
            {/* Tabela de Componentes & Tokens */}
            <rect
              x="12"
              y="14"
              width="102"
              height="44"
              rx="4"
              fill="currentColor"
              className="text-background/90 dark:text-zinc-900/90"
              stroke="#ec4899"
              strokeWidth="1.2"
              strokeOpacity="0.75"
            />
            {/* Header da Tabela DS */}
            <rect x="12" y="14" width="102" height="11" rx="3" fill="#ec4899" fillOpacity="0.88" />
            <rect x="18" y="18" width="22" height="3" rx="1" fill="#ffffff" />
            <rect x="46" y="18" width="18" height="3" rx="1" fill="#fdf2f8" />
            <rect x="70" y="18" width="38" height="3" rx="1" fill="#fdf2f8" />
            {/* Linhas de Componentes */}
            <line x1="12" y1="25" x2="114" y2="25" stroke="#ec4899" strokeWidth="0.8" strokeOpacity="0.25" />
            <rect x="16" y="27" width="18" height="4" rx="2" fill="#0f172a" />
            <rect x="42" y="27" width="20" height="3" rx="1" fill="#64748b" fillOpacity="0.6" />
            <rect x="68" y="26.5" width="16" height="5" rx="1.5" fill="#10b981" />
            <rect x="88" y="27" width="22" height="3" rx="1" fill="#0891b2" />

            <line x1="12" y1="36" x2="114" y2="36" stroke="#ec4899" strokeWidth="0.8" strokeOpacity="0.25" />
            <rect x="16" y="38" width="18" height="4" rx="1.5" stroke="#ec4899" strokeWidth="1" fill="none" />
            <rect x="42" y="38" width="22" height="3" rx="1" fill="#64748b" fillOpacity="0.6" />
            <rect x="68" y="37.5" width="16" height="5" rx="1.5" fill="#0284c7" />
            <rect x="88" y="38" width="22" height="3" rx="1" fill="#0891b2" />

            <line x1="12" y1="47" x2="114" y2="47" stroke="#ec4899" strokeWidth="0.8" strokeOpacity="0.25" />
            <rect x="16" y="49" width="14" height="4" rx="2" fill="#ec4899" />
            <rect x="42" y="49" width="18" height="3" rx="1" fill="#64748b" fillOpacity="0.6" />
            <rect x="68" y="48.5" width="16" height="5" rx="1.5" fill="#10b981" />
            <rect x="88" y="49" width="22" height="3" rx="1" fill="#0891b2" />

            {/* Checklist WCAG & Polish (Direita) */}
            <rect
              x="120"
              y="14"
              width="48"
              height="44"
              rx="4"
              fill="currentColor"
              className="text-background/90 dark:text-zinc-900/90"
              stroke="#ec4899"
              strokeWidth="1.2"
              strokeOpacity="0.5"
            />
            <rect x="120" y="14" width="48" height="9" rx="3" fill="#ec4899" fillOpacity="0.35" />
            <rect x="124" y="17" width="22" height="3" rx="1" fill="#ffffff" />
            <circle cx="127" cy="28" r="2.5" fill="#10b981" />
            <rect x="132" y="27" width="30" height="2.5" rx="1" fill="#64748b" fillOpacity="0.6" />
            <circle cx="127" cy="36" r="2.5" fill="#10b981" />
            <rect x="132" y="35" width="26" height="2.5" rx="1" fill="#64748b" fillOpacity="0.6" />
            <circle cx="127" cy="44" r="2.5" stroke="#ec4899" strokeWidth="1" fill="none" />
            <rect x="132" y="43" width="28" height="2.5" rx="1" fill="#ec4899" fillOpacity="0.6" />
            <circle cx="127" cy="52" r="2.5" stroke="#94a3b8" strokeWidth="1" fill="none" />
            <rect x="132" y="51" width="24" height="2.5" rx="1" fill="#94a3b8" fillOpacity="0.5" />

            {/* Post-its com Princípios de Emil (Abaixo) */}
            {[
              { x: 12, fill: '#fce7f3', stroke: '#ec4899' },
              { x: 52, fill: '#fed7aa', stroke: '#f97316' },
              { x: 92, fill: '#bae6fd', stroke: '#0284c7' },
              { x: 132, fill: '#bbf7d0', stroke: '#10b981' },
            ].map((node, i) => (
              <g key={i}>
                <rect
                  x={node.x}
                  y="64"
                  width="36"
                  height="22"
                  rx="3"
                  fill={node.fill}
                  stroke={node.stroke}
                  strokeWidth="1.2"
                />
                <rect x={node.x + 3} y="68" width="18" height="3" rx="1" fill="#0f172a" fillOpacity="0.6" />
                <rect x={node.x + 3} y="74" width="28" height="2.5" rx="1" fill="#0f172a" fillOpacity="0.4" />
                <rect x={node.x + 3} y="79" width="22" height="2" rx="0.8" fill="#0f172a" fillOpacity="0.3" />
              </g>
            ))}
          </svg>
        );

      case 'kanban':
      case 'retro_agile':
      case 'daily':
      case 'retro_focus':
      default: {
        const isThreeCols = variant === 'retro_agile' || variant === 'daily' || variant === 'retro_focus';
        const cols = isThreeCols
          ? [
              { x: 16, w: 44, stroke: '#10b981', fill: '#bbf7d0' },
              { x: 68, w: 44, stroke: '#3b82f6', fill: '#bae6fd' },
              { x: 120, w: 44, stroke: '#8b5cf6', fill: '#ddd6fe' },
            ]
          : [
              { x: 12, w: 35, stroke: '#64748b', fill: '#fef08a' },
              { x: 51, w: 35, stroke: '#3b82f6', fill: '#bae6fd' },
              { x: 90, w: 35, stroke: '#a855f7', fill: '#f5d0fe' },
              { x: 129, w: 35, stroke: '#10b981', fill: '#bbf7d0' },
            ];
        return (
          <svg viewBox="0 0 180 100" className="w-full h-full" aria-hidden="true">
            {cols.map((col, idx) => (
              <g key={idx}>
                <rect
                  x={col.x}
                  y="14"
                  width={col.w}
                  height="72"
                  rx="4"
                  fill="currentColor"
                  className="text-background/90 dark:text-zinc-900/90"
                  stroke={col.stroke}
                  strokeWidth="1.2"
                  strokeOpacity="0.55"
                />
                <rect x={col.x} y="14" width={col.w} height="8" rx="2.5" fill={col.stroke} fillOpacity="0.85" />
                <rect x={col.x + 4} y="27" width={col.w - 8} height="16" rx="2.5" fill={col.fill} />
                <rect x={col.x + 4} y="47" width={col.w - 8} height="16" rx="2.5" fill={col.fill} />
                <rect x={col.x + 4} y="67" width={col.w - 8} height="13" rx="2" fill={col.fill} fillOpacity="0.7" />
              </g>
            ))}
          </svg>
        );
      }
    }
  }
);

TemplateSchematicPreview.displayName = 'TemplateSchematicPreview';

export const QuickStartTemplatesStrip: React.FC<QuickStartTemplatesStripProps> = ({
  userName,
  onCreateBlankBoard,
  onQuickCreateFromTemplate,
  creatingTemplateId,
  isCreating = false,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<TemplateRoleCategory>('all');
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(COLLAPSE_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const firstName = (userName || 'Visitante').trim().split(/\s+/)[0];

  const filteredTemplates =
    selectedCategory === 'all'
      ? SPRINT_TEMPLATES
      : SPRINT_TEMPLATES.filter((t) => t.category === selectedCategory);

  const selectedCategoryObj =
    TEMPLATE_CATEGORIES.find((c) => c.id === selectedCategory) || TEMPLATE_CATEGORIES[0];

  const updateScrollButtons = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  }, []);

  useEffect(() => {
    updateScrollButtons();
    window.addEventListener('resize', updateScrollButtons);
    return () => window.removeEventListener('resize', updateScrollButtons);
  }, [updateScrollButtons, filteredTemplates.length, isCollapsed]);

  const handleScroll = (direction: 'left' | 'right') => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const step = Math.max(320, Math.round(el.clientWidth * 0.65));
    el.scrollBy({
      left: direction === 'left' ? -step : step,
      behavior: 'smooth',
    });
  };

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSE_STORAGE_KEY, next ? '1' : '0');
      } catch {
        // ignora
      }
      return next;
    });
  };

  if (isCollapsed) {
    return (
      <section
        aria-label="Comece algo novo"
        className="mb-6 rounded-xl border border-border/80 bg-card/60 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 transition-colors"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="size-6 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Sparkles className="size-3.5" />
          </div>
          <span className="text-xs font-semibold text-foreground truncate">
            Olá, {firstName} • Comece algo novo
          </span>
          <div className="hidden md:flex items-center gap-1.5 ml-1">
            {SPRINT_TEMPLATES.slice(0, 3).map((tmpl) => (
              <button
                key={tmpl.id}
                type="button"
                disabled={isCreating}
                onClick={() => onQuickCreateFromTemplate(tmpl)}
                className="text-[11px] px-2 py-0.5 rounded-md border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-[background-color,color,transform] duration-150 active:scale-[0.97] cursor-pointer"
              >
                + {tmpl.shortTitle || tmpl.title}
              </button>
            ))}
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={toggleCollapse}
          className="h-7 px-2.5 text-xs gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer active:scale-[0.97]"
        >
          <span>Mostrar templates</span>
          <ChevronDown className="size-3.5" />
        </Button>
      </section>
    );
  }

  return (
    <section
      aria-label="Comece algo novo"
      className="mb-7 rounded-xl border border-border/80 bg-gradient-to-b from-muted/35 via-card/60 to-card p-4 sm:p-5 shadow-2xs"
    >
      {/* Barra Superior: Saudação Pessoal + Seletor de Perfil ("Templates para: Todos os perfis") */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground">
            Olá, <span className="text-foreground font-semibold">{firstName}</span>
          </p>
          <h2 className="text-base sm:text-lg font-semibold tracking-tight text-foreground mt-0.5">
            Comece algo novo
          </h2>
        </div>

        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2">
          {/* Filtro por Perfil ("Templates para: Todos os perfis") */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground hidden md:inline">
              Templates para:
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 px-2.5 text-xs font-medium gap-1.5 bg-background/80 border-border/80 cursor-pointer active:scale-[0.97]"
                >
                  <Filter className="size-3 text-muted-foreground" />
                  <span>{selectedCategoryObj.label}</span>
                  <ChevronDown className="size-3 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                {TEMPLATE_CATEGORIES.map((cat) => (
                  <DropdownMenuItem
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className="text-xs flex items-center justify-between cursor-pointer"
                  >
                    <span>{cat.label}</span>
                    {selectedCategory === cat.id && <Check className="size-3.5 text-primary" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Controles de Navegação do Carrossel (Desktop) + Botão de Recolher */}
          <div className="flex items-center gap-1">
            <div className="hidden sm:flex items-center gap-1 mr-1">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                disabled={!canScrollLeft}
                onClick={() => handleScroll('left')}
                className="size-7 rounded-md bg-background/80 disabled:opacity-35 cursor-pointer active:scale-[0.97]"
                title="Rolar templates para a esquerda"
                aria-label="Rolar templates para a esquerda"
              >
                <ChevronLeft className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                disabled={!canScrollRight}
                onClick={() => handleScroll('right')}
                className="size-7 rounded-md bg-background/80 disabled:opacity-35 cursor-pointer active:scale-[0.97]"
                title="Rolar templates para a direita"
                aria-label="Rolar templates para a direita"
              >
                <ChevronRight className="size-3.5" />
              </Button>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={toggleCollapse}
              className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground gap-1 cursor-pointer active:scale-[0.97]"
              title="Ocultar faixa de templates iniciais"
            >
              <span className="hidden sm:inline">Recolher</span>
              <ChevronUp className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Trilho Horizontal de Cards: "Quadro em Branco" + Templates Prontos */}
      <div
        ref={scrollContainerRef}
        onScroll={updateScrollButtons}
        className="flex items-stretch gap-3 overflow-x-auto pb-1.5 pt-0.5 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {/* 1. Card Fixo: Quadro em Branco (Blank board - 1 clique direto) */}
        <div className="w-[152px] sm:w-[168px] shrink-0 snap-start">
          <button
            type="button"
            disabled={isCreating}
            onClick={onCreateBlankBoard}
            className="group w-full text-left rounded-lg border border-border/80 bg-background hover:border-foreground/30 transition-[border-color,box-shadow,transform] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:shadow-sm active:scale-[0.98] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
          >
            <div className="relative h-24 w-full rounded-t-lg border-b border-border/60 bg-muted/25 overflow-hidden flex items-center justify-center">
              <div
                className="absolute inset-0 opacity-[0.4] dark:opacity-[0.22]"
                style={{
                  backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
                  backgroundSize: '12px 12px',
                }}
              />
              <div className="relative z-10 size-10 rounded-full border border-border bg-background shadow-xs flex items-center justify-center text-foreground group-hover:scale-105 group-hover:border-primary/50 group-hover:text-primary transition-[transform,border-color,color] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]">
                <Plus className="size-5" />
              </div>

              {creatingTemplateId === 'blank' && (
                <div className="absolute inset-0 z-20 bg-background/80 backdrop-blur-[2px] flex items-center justify-center gap-1.5 text-xs font-medium text-foreground">
                  <Loader2 className="size-3.5 animate-spin text-primary" />
                  <span>Criando...</span>
                </div>
              )}
            </div>
            <div className="p-2.5">
              <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                Quadro em branco
              </p>
              <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                Começar do zero
              </p>
            </div>
          </button>
        </div>

        {/* 2. Cards de Templates Filtrados por Perfil (100% limpos, 1 clique direto) */}
        {filteredTemplates.map((tmpl) => {
          const isThisCreating = creatingTemplateId === tmpl.id;
          return (
            <div
              key={tmpl.id}
              className="group relative w-[158px] sm:w-[174px] shrink-0 snap-start"
            >
              <button
                type="button"
                disabled={isCreating}
                onClick={() => onQuickCreateFromTemplate(tmpl)}
                className="w-full text-left rounded-lg border border-border/80 bg-background hover:border-foreground/30 transition-[border-color,box-shadow,transform] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:shadow-sm active:scale-[0.98] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
              >
                {/* Miniatura Esquema SVG */}
                <div className="relative h-24 w-full rounded-t-lg border-b border-border/60 bg-muted/25 overflow-hidden flex items-center justify-center p-1">
                  <div
                    className="absolute inset-0 opacity-[0.3] dark:opacity-[0.18]"
                    style={{
                      backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
                      backgroundSize: '12px 12px',
                    }}
                  />
                  <div className="relative z-10 w-full h-full group-hover:scale-[1.03] transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]">
                    <TemplateSchematicPreview variant={tmpl.previewVariant} />
                  </div>

                  {isThisCreating && (
                    <div className="absolute inset-0 z-20 bg-background/80 backdrop-blur-[2px] flex items-center justify-center gap-1.5 text-xs font-medium text-foreground">
                      <Loader2 className="size-3.5 animate-spin text-primary" />
                      <span>Criando...</span>
                    </div>
                  )}
                </div>

                {/* Rodapé do Card */}
                <div className="p-2.5">
                  <p
                    className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors"
                    title={tmpl.title}
                  >
                    {tmpl.shortTitle || tmpl.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                    {tmpl.badge}
                  </p>
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
};
