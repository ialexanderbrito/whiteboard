import React, { useMemo, useRef, useState } from 'react';
import { Group, Rect, Circle, Text } from 'react-konva';
import type Konva from 'konva';
import type { CanvasElement } from '../../types/element';
import {
  CODE_TOKEN_COLORS_DARK,
  CODE_TOKEN_COLORS_LIGHT,
  getCodeLanguageAccent,
  getCodeLanguageLabel,
  getDefaultCodeSnippet,
  normalizeCodeLanguage,
  tokenizeCodeBlock,
  type CodeTokenKind,
} from '../../utils/richEmbeds';
import { isCoarseOrMobileViewport } from '../../utils/viewport';
import { LockBadge } from './LockBadge';

interface CodeBlockItemProps {
  element: CanvasElement;
  isSelected: boolean;
  userSelectionColor?: string;
  remoteSelector?: { name: string; color: string };
  draggable?: boolean;
  canEdit?: boolean;
  onSelect: (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
  onChange: (updates: Partial<CanvasElement>) => void;
  onEditCode?: (
    elementId: string,
    rect: { worldX: number; worldY: number; width: number; height: number },
    currentCode: string
  ) => void;
}

const MONO_FONT = '"JetBrains Mono", "Fira Code", Consolas, monospace';

const monoWidthCache = new Map<number, number>();
function measureMonospaceCharWidth(fontSize: number): number {
  const cached = monoWidthCache.get(fontSize);
  if (cached !== undefined) return cached;
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.font = `${fontSize}px ${MONO_FONT}`;
      const measured = ctx.measureText('MMMMMMMMMM').width / 10;
      if (measured > fontSize * 0.45 && measured < fontSize * 0.78) {
        monoWidthCache.set(fontSize, measured);
        return measured;
      }
    }
  }
  const fallback = fontSize * 0.602;
  monoWidthCache.set(fontSize, fallback);
  return fallback;
}

function getTokenFontStyle(kind: CodeTokenKind): string {
  if (kind === 'keyword' || kind === 'heading') return 'bold';
  if (kind === 'comment') return 'italic';
  return 'normal';
}

export const CodeBlockItem: React.FC<CodeBlockItemProps> = React.memo(
  ({
    element,
    isSelected,
    userSelectionColor = '#0284c7',
    remoteSelector,
    draggable = true,
    canEdit = true,
    onSelect,
    onChange,
    onEditCode,
  }) => {
    const groupRef = useRef<Konva.Group>(null);
    const [copied, setCopied] = useState(false);
    const [langHovered, setLangHovered] = useState(false);

    const isLightTheme = element.codeTheme === 'light';
    const language = normalizeCodeLanguage(element.codeLanguage);
    const languageLabel = getCodeLanguageLabel(element.codeLanguage);
    const languageAccent = getCodeLanguageAccent(element.codeLanguage);
    const canPickLanguage = canEdit && !element.locked;
    const langChipText = canPickLanguage ? `${languageLabel} ▾` : languageLabel;
    const rawCode = element.text ?? getDefaultCodeSnippet(language);

    const lines = useMemo(
      () =>
        rawCode
          .replace(/\r\n/g, '\n')
          .split('\n')
          .slice(0, 42)
          .map((l) => l.replace(/\t/g, '  ')),
      [rawCode]
    );
    const fontSize = element.fontSize || 13;
    const lineHeight = Math.round(fontSize * 1.55);
    const charWidth = measureMonospaceCharWidth(fontSize);
    const headerH = 34;
    const padY = 12;

    const minComputedH = headerH + padY * 2 + Math.max(3, lines.length) * lineHeight;
    const width = Math.max(280, element.width || 440);
    const height = Math.max(minComputedH, element.height || minComputedH);
    const maxLangChipW = Math.max(72, (element.locked ? width - 108 : width - 82) - 68);
    const langChipWidth = Math.min(
      maxLangChipW,
      Math.max(72, Math.round(langChipText.length * 6.4 + 26))
    );

    const bgFill = isLightTheme ? '#f8fafc' : '#0d1117';
    const headerFill = isLightTheme ? '#e2e8f0' : '#161b22';
    const gutterColor = isLightTheme ? '#94a3b8' : '#52525b';
    const palette = isLightTheme ? CODE_TOKEN_COLORS_LIGHT : CODE_TOKEN_COLORS_DARK;
    const activeStroke = remoteSelector
      ? remoteSelector.color
      : isSelected
        ? userSelectionColor
        : isLightTheme
          ? '#cbd5e1'
          : '#30363d';

    const tokenizedLines = useMemo(
      () => tokenizeCodeBlock(lines, language),
      [lines, language]
    );

    return (
      <Group
        ref={groupRef}
        id={element.id}
        x={element.x}
        y={element.y}
        rotation={element.rotation || 0}
        draggable={draggable && !element.locked}
        onClick={onSelect}
        onTap={onSelect}
        onDblClick={(e) => {
          if (!canEdit || element.locked || !onEditCode) return;
          e.cancelBubble = true;
          onEditCode(
            element.id,
            {
              worldX: element.x,
              worldY: element.y + headerH,
              width,
              height: height - headerH,
            },
            rawCode
          );
        }}
        onDblTap={(e) => {
          if (!canEdit || element.locked || !onEditCode) return;
          e.cancelBubble = true;
          onEditCode(
            element.id,
            {
              worldX: element.x,
              worldY: element.y + headerH,
              width,
              height: height - headerH,
            },
            rawCode
          );
        }}
        onDragEnd={(e) => {
          if ((e.target as Konva.Node) !== groupRef.current) return;
          onChange({
            x: Math.round(e.target.x()),
            y: Math.round(e.target.y()),
          });
        }}
        onTransformEnd={() => {
          const node = groupRef.current;
          if (!node) return;
          const sx = node.scaleX();
          const sy = node.scaleY();
          node.scaleX(1);
          node.scaleY(1);
          onChange({
            x: Math.round(node.x()),
            y: Math.round(node.y()),
            width: Math.max(280, Math.round(width * sx)),
            height: Math.max(120, Math.round(height * sy)),
            rotation: Math.round(node.rotation()),
          });
        }}
      >
        {/* Janela do editor */}
        <Rect
          width={width}
          height={height}
          fill={bgFill}
          stroke={activeStroke}
          strokeWidth={isSelected || remoteSelector ? 2 : 1.2}
          cornerRadius={12}
          shadowEnabled={!isCoarseOrMobileViewport()}
          shadowColor="rgba(0, 0, 0, 0.24)"
          shadowBlur={isSelected ? 18 : 10}
          shadowOffsetY={4}
          perfectDrawEnabled={false}
        />

        {/* Barra superior estilo terminal */}
        <Rect
          width={width}
          height={headerH}
          fill={headerFill}
          cornerRadius={[12, 12, 0, 0]}
          listening={false}
          perfectDrawEnabled={false}
        />
        <Circle x={18} y={17} radius={5} fill="#ef4444" listening={false} />
        <Circle x={34} y={17} radius={5} fill="#f59e0b" listening={false} />
        <Circle x={50} y={17} radius={5} fill="#22c55e" listening={false} />

        {/* Seletor rápido de linguagem integrado ao cabeçalho */}
        <Group
          x={68}
          y={7}
          listening={canPickLanguage}
          onMouseEnter={(e) => {
            if (!canPickLanguage) return;
            setLangHovered(true);
            const container = e.target.getStage()?.container();
            if (container) container.style.cursor = 'pointer';
          }}
          onMouseLeave={(e) => {
            setLangHovered(false);
            const container = e.target.getStage()?.container();
            if (container) container.style.cursor = '';
          }}
          onClick={(e) => {
            e.cancelBubble = true;
            onSelect(e);
            if (canPickLanguage && typeof window !== 'undefined') {
              (
                window as unknown as {
                  __mirio_open_code_lang_for?: { id: string; ts: number };
                }
              ).__mirio_open_code_lang_for = { id: element.id, ts: Date.now() };
              window.dispatchEvent(
                new CustomEvent('mirio:open-code-language-picker', {
                  detail: { elementId: element.id },
                })
              );
            }
          }}
          onTap={(e) => {
            e.cancelBubble = true;
            onSelect(e);
            if (canPickLanguage && typeof window !== 'undefined') {
              (
                window as unknown as {
                  __mirio_open_code_lang_for?: { id: string; ts: number };
                }
              ).__mirio_open_code_lang_for = { id: element.id, ts: Date.now() };
              window.dispatchEvent(
                new CustomEvent('mirio:open-code-language-picker', {
                  detail: { elementId: element.id },
                })
              );
            }
          }}
          onDblClick={(e) => {
            e.cancelBubble = true;
          }}
          onDblTap={(e) => {
            e.cancelBubble = true;
          }}
        >
          <Rect
            width={langChipWidth}
            height={20}
            cornerRadius={5}
            fill={
              langHovered
                ? isLightTheme
                  ? 'rgba(15,23,42,0.1)'
                  : 'rgba(255,255,255,0.12)'
                : isLightTheme
                  ? 'rgba(15,23,42,0.04)'
                  : 'rgba(255,255,255,0.05)'
            }
          />
          <Circle
            x={10}
            y={10}
            radius={3}
            fill={languageAccent}
            listening={false}
          />
          <Text
            text={langChipText}
            width={langChipWidth - 18}
            x={16}
            y={4.5}
            padding={0}
            align="center"
            fontSize={10.5}
            fontStyle="600"
            wrap="none"
            ellipsis={true}
            fill={langHovered ? palette.plain : isLightTheme ? '#475569' : '#a1a1aa'}
            fontFamily="Plus Jakarta Sans, system-ui, sans-serif"
            listening={false}
          />
        </Group>

        {/* Botão Copiar Código */}
        <Group
          x={width - 74}
          y={7}
          onClick={(e) => {
            e.cancelBubble = true;
            navigator.clipboard?.writeText(rawCode).catch(() => {});
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          }}
          onTap={(e) => {
            e.cancelBubble = true;
            navigator.clipboard?.writeText(rawCode).catch(() => {});
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          }}
        >
          <Rect
            width={64}
            height={20}
            cornerRadius={5}
            fill={isLightTheme ? 'rgba(15,23,42,0.06)' : 'rgba(255,255,255,0.08)'}
          />
          <Text
            text={copied ? 'Copiado!' : 'Copiar'}
            width={64}
            y={4.5}
            align="center"
            fontSize={10}
            fontStyle="bold"
            fill={copied ? '#10b981' : palette.plain}
            fontFamily="Plus Jakarta Sans, system-ui, sans-serif"
            listening={false}
          />
        </Group>

        {element.locked && <LockBadge x={width - 100} y={7} />}

        {/* Linhas de código numeradas com Syntax Highlighting */}
        <Group
          x={0}
          y={headerH + padY}
          clipX={0}
          clipY={0}
          clipWidth={width - 12}
          clipHeight={height - headerH - padY * 2}
          listening={false}
        >
          {tokenizedLines.map((tokens, lineIdx) => {
            const lineY = lineIdx * lineHeight;
            let cursorX = 46;

            return (
              <Group key={lineIdx} y={lineY}>
                <Text
                  text={String(lineIdx + 1)}
                  x={10}
                  y={0}
                  width={26}
                  align="right"
                  fontSize={fontSize - 1}
                  fill={gutterColor}
                  fontFamily={MONO_FONT}
                />
                {tokens.map((tok, tIdx) => {
                  const tokX = cursorX;
                  cursorX += tok.text.length * charWidth;
                  if (!tok.text) return null;
                  return (
                    <Text
                      key={tIdx}
                      text={tok.text}
                      x={tokX}
                      y={0}
                      fontSize={fontSize}
                      fontStyle={getTokenFontStyle(tok.kind)}
                      fill={palette[tok.kind]}
                      fontFamily={MONO_FONT}
                      wrap="none"
                    />
                  );
                })}
              </Group>
            );
          })}
        </Group>
      </Group>
    );
  }
);

CodeBlockItem.displayName = 'CodeBlockItem';
