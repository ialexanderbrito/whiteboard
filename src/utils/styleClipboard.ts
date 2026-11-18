import type { CanvasElement, ConnectorStyle } from '../types/element';

export interface CopiedElementStyle {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  dash?: number[];
  opacity?: number;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline' | 'line-through' | 'underline line-through';
  textAlign?: 'left' | 'center' | 'right';
  textColor?: string;
  connectorStyle?: ConnectorStyle;
  startArrowhead?: 'none' | 'arrow';
  endArrowhead?: 'none' | 'arrow';
}

let cachedStyle: CopiedElementStyle | null = null;

/**
 * Extrai e armazena o estilo visual de um elemento de origem (`Ctrl+Alt+C`).
 */
export function copyElementStyle(source: CanvasElement | null | undefined): CopiedElementStyle | null {
  if (!source) return null;

  const style: CopiedElementStyle = {
    ...(source.fill !== undefined ? { fill: source.fill } : {}),
    ...(source.stroke !== undefined ? { stroke: source.stroke } : {}),
    ...(source.strokeWidth !== undefined ? { strokeWidth: source.strokeWidth } : {}),
    ...(source.dash !== undefined ? { dash: [...source.dash] } : {}),
    ...(source.opacity !== undefined ? { opacity: source.opacity } : {}),
    ...(source.fontSize !== undefined ? { fontSize: source.fontSize } : {}),
    ...(source.fontWeight !== undefined ? { fontWeight: source.fontWeight } : {}),
    ...(source.fontStyle !== undefined ? { fontStyle: source.fontStyle } : {}),
    ...(source.textDecoration !== undefined ? { textDecoration: source.textDecoration } : {}),
    ...(source.textAlign !== undefined ? { textAlign: source.textAlign } : {}),
    ...(source.textColor !== undefined ? { textColor: source.textColor } : {}),
    ...(source.connectorStyle !== undefined ? { connectorStyle: source.connectorStyle } : {}),
    ...(source.startArrowhead !== undefined ? { startArrowhead: source.startArrowhead } : {}),
    ...(source.endArrowhead !== undefined ? { endArrowhead: source.endArrowhead } : {}),
  };

  cachedStyle = style;
  return style;
}

export function hasCopiedElementStyle(): boolean {
  return cachedStyle !== null;
}

export function getCopiedElementStyle(): CopiedElementStyle | null {
  return cachedStyle;
}

/**
 * Gera os updates compatíveis com cada tipo de elemento de destino ao colar estilo (`Ctrl+Alt+V`).
 */
export function buildPasteStyleUpdates(
  targets: ReadonlyArray<CanvasElement>,
  styleOverride?: CopiedElementStyle | null
): Array<{ id: string; updates: Partial<CanvasElement> }> {
  const style = styleOverride ?? cachedStyle;
  if (!style || targets.length === 0) return [];

  const result: Array<{ id: string; updates: Partial<CanvasElement> }> = [];

  for (const target of targets) {
    if (target.locked || target.type === 'sticker' || target.type === 'gif') continue;

    const updates: Partial<CanvasElement> = {};

    if (target.type === 'arrow' || target.type === 'line' || target.type === 'pen') {
      const strokeColor = style.stroke || (style.fill && style.fill !== 'transparent' ? style.fill : undefined);
      if (strokeColor !== undefined) updates.stroke = strokeColor;
      if (style.strokeWidth !== undefined) updates.strokeWidth = style.strokeWidth;
      if (style.dash !== undefined) updates.dash = [...style.dash];
      if (style.opacity !== undefined) updates.opacity = style.opacity;
      if (target.type === 'arrow' || target.type === 'line') {
        if (style.connectorStyle !== undefined) updates.connectorStyle = style.connectorStyle;
        if (target.type === 'arrow') {
          if (style.startArrowhead !== undefined) updates.startArrowhead = style.startArrowhead;
          if (style.endArrowhead !== undefined) updates.endArrowhead = style.endArrowhead;
        }
      }
    } else if (target.type === 'text') {
      if (style.textColor !== undefined) updates.textColor = style.textColor;
      else if (style.fill && style.fill !== 'transparent') updates.fill = style.fill;
      if (style.fontSize !== undefined) updates.fontSize = style.fontSize;
      if (style.fontWeight !== undefined) updates.fontWeight = style.fontWeight;
      if (style.fontStyle !== undefined) updates.fontStyle = style.fontStyle;
      if (style.textDecoration !== undefined) updates.textDecoration = style.textDecoration;
      if (style.textAlign !== undefined) updates.textAlign = style.textAlign;
      if (style.opacity !== undefined) updates.opacity = style.opacity;
    } else {
      // sticky, checklist, formas geométricas e frame
      if (style.fill !== undefined) updates.fill = style.fill;
      if (target.type !== 'sticky' && target.type !== 'checklist') {
        if (style.stroke !== undefined) updates.stroke = style.stroke;
        if (style.strokeWidth !== undefined) updates.strokeWidth = style.strokeWidth;
        if (style.dash !== undefined) updates.dash = [...style.dash];
      }
      if (style.opacity !== undefined) updates.opacity = style.opacity;
      if (style.fontSize !== undefined) updates.fontSize = style.fontSize;
      if (style.fontWeight !== undefined) updates.fontWeight = style.fontWeight;
      if (style.fontStyle !== undefined) updates.fontStyle = style.fontStyle;
      if (style.textDecoration !== undefined) updates.textDecoration = style.textDecoration;
      if (style.textAlign !== undefined) updates.textAlign = style.textAlign;
      if (style.textColor !== undefined) updates.textColor = style.textColor;
    }

    if (Object.keys(updates).length > 0) {
      result.push({ id: target.id, updates });
    }
  }

  return result;
}
