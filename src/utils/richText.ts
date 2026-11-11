/**
 * Utilitários de texto rico do Mirio.
 *
 * O editor HTML (contentEditable) usa uma lista de "runs" como fonte da verdade.
 * Cada run carrega o texto e o estilo efetivo daquele trecho, permitindo negrito,
 * itálico, sublinhado, riscado e cor por letra/palavra/frase — como no Miro.
 */

import type { CanvasElement, TextRun } from '../types/element';
import { normalizeUrl, parseTextSegments, stripMarkdownLinks } from './textLinks.ts';

export const RICH_TEXT_FONT_FAMILY = 'system-ui, -apple-system, sans-serif';
export const RICH_TEXT_LINK_COLOR = '#2563eb';
export const RICH_TEXT_DEFAULT_COLOR = '#0f172a';

export interface ResolvedRun {
  text: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  color?: string;
  url?: string;
}

export interface RichTextBaseStyle {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  color: string;
}

export interface RichTextToken {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  color: string;
  url?: string;
}

export interface RichTextLayout {
  tokens: RichTextToken[];
  height: number;
  lineCount: number;
  lineHeightPx: number;
}

export interface RichTextFormatState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  color: string;
}

/**
 * Converte rgb()/rgba() em hexadecimal para manter o Firestore compacto e previsível.
 * Valida estritamente se o valor é uma cor segura (hexadecimal, rgb/rgba ou nome CSS)
 * para impedir injeção de HTML/CSS (XSS).
 */
export function normalizeColor(color?: string): string | undefined {
  if (!color) return undefined;
  const value = color.trim();
  if (!value) return undefined;

  const rgb = value.match(
    /^rgba?\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})(?:\s*[,/]\s*[\d.]+)?\s*\)$/i
  );
  if (rgb) {
    const toHex = (v: string) => Math.max(0, Math.min(255, Number(v))).toString(16).padStart(2, '0');
    return `#${toHex(rgb[1])}${toHex(rgb[2])}${toHex(rgb[3])}`;
  }

  // Validação estrita de formato hexadecimal seguro
  if (/^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value)) {
    return value;
  }

  // Validação estrita de nomes de cores CSS comuns (somente letras alfabéticas ASCII)
  if (/^[a-zA-Z]{3,20}$/.test(value)) {
    return value.toLowerCase();
  }

  // Qualquer string arbitrária que não seja cor válida é rejeitada
  return undefined;
}

export function getElementBaseStyle(element: CanvasElement): RichTextBaseStyle {
  return {
    bold: element.fontWeight === 'bold',
    italic: element.fontStyle === 'italic',
    underline: Boolean(element.textDecoration?.includes('underline')),
    strikethrough: Boolean(element.textDecoration?.includes('line-through')),
    color: normalizeColor(element.textColor || element.fill) || RICH_TEXT_DEFAULT_COLOR,
  };
}

/**
 * Converte um elemento em runs resolvidos.
 * Elementos antigos (sem `richText`) continuam funcionando: a formatação global
 * e os links em markdown/URLs cruas são convertidos em runs na hora da leitura.
 */
export function getElementRuns(element: CanvasElement): ResolvedRun[] {
  const base = getElementBaseStyle(element);

  if (Array.isArray(element.richText) && element.richText.length > 0) {
    return element.richText
      .filter((run) => typeof run?.text === 'string' && run.text.length > 0)
      .map((run) => ({
        text: run.text,
        bold: run.bold ?? base.bold,
        italic: run.italic ?? base.italic,
        underline: run.underline ?? base.underline,
        strikethrough: run.strikethrough ?? base.strikethrough,
        color: normalizeColor(run.color),
        url: run.url ? normalizeUrl(run.url) : undefined,
      }));
  }

  const raw = element.text || '';
  if (!raw) return [];

  const segments = parseTextSegments(raw, element.links, element.linkUrl);
  return segments
    .filter((segment) => segment.text.length > 0)
    .map((segment) => ({
      text: segment.text,
      bold: base.bold,
      italic: base.italic,
      underline: base.underline,
      strikethrough: base.strikethrough,
      color: segment.isLink ? undefined : base.color,
      url: segment.isLink ? normalizeUrl(segment.url || '') : undefined,
    }));
}

export function runsToPlainText(runs: TextRun[] | ResolvedRun[]): string {
  return runs.map((run) => run.text).join('');
}

/**
 * Extrai os links de uma lista de runs (únicos por URL) para manter
 * `links`/`linkUrl` compatíveis com o restante do quadro.
 */
export function deriveLinksFromRuns(runs: TextRun[]): {
  linkUrl?: string;
  links: Array<{ url: string; label?: string }>;
} {
  const links: Array<{ url: string; label?: string }> = [];
  const seen = new Set<string>();

  for (const run of runs) {
    if (!run.url) continue;
    const url = normalizeUrl(run.url);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    const label = run.text.trim();
    links.push({ url, label: label || undefined });
  }

  return { linkUrl: links[0]?.url, links };
}

export function runsHaveFormatting(runs: TextRun[]): boolean {
  return runs.some(
    (run) => run.bold || run.italic || run.underline || run.strikethrough || !!run.color || !!run.url
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replace(/`/g, '&#96;');
}

/**
 * Gera o HTML inicial do contentEditable a partir dos runs.
 * Usa tags semânticas (`<b>`, `<i>`, `<u>`, `<s>`, `<span style="color:...">`, `<a>`)
 * para que `document.execCommand` consiga alternar estilos sem conflitar com
 * `font-weight:400` ou `text-decoration:none` inline em spans filhos.
 */
export function runsToHtml(runs: ResolvedRun[]): string {
  return runs
    .map((run) => {
      let html = escapeHtml(run.text).replace(/\n/g, '<br>');
      const safeColor = run.color ? normalizeColor(run.color) : undefined;
      if (safeColor) {
        html = `<span style="color:${escapeAttribute(safeColor)}">${html}</span>`;
      }
      if (run.strikethrough) {
        html = `<s>${html}</s>`;
      }
      if (run.underline) {
        html = `<u>${html}</u>`;
      }
      if (run.italic) {
        html = `<i>${html}</i>`;
      }
      if (run.bold) {
        html = `<b>${html}</b>`;
      }
      if (run.url) {
        html = `<a href="${escapeAttribute(run.url)}" data-mirio-link="true">${html}</a>`;
      }
      return html;
    })
    .join('');
}

const BLOCK_TAGS = new Set([
  'DIV',
  'P',
  'LI',
  'UL',
  'OL',
  'BLOCKQUOTE',
  'PRE',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
]);

interface WalkFormat {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  color?: string;
  url?: string;
}

interface WorkingRun {
  text: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  color?: string;
  url?: string;
}

function sameFormat(a: WalkFormat, b: WalkFormat): boolean {
  return (
    a.bold === b.bold &&
    a.italic === b.italic &&
    a.underline === b.underline &&
    a.strikethrough === b.strikethrough &&
    (a.color || '') === (b.color || '') &&
    (a.url || '') === (b.url || '')
  );
}

function readElementFormat(el: HTMLElement, current: WalkFormat): WalkFormat {
  const next: WalkFormat = { ...current };
  const tag = el.tagName;

  if (tag === 'B' || tag === 'STRONG') next.bold = true;
  if (tag === 'I' || tag === 'EM') next.italic = true;
  if (tag === 'U') next.underline = true;
  if (tag === 'S' || tag === 'STRIKE' || tag === 'DEL') next.strikethrough = true;

  if (tag === 'A') {
    const href = el.getAttribute('href');
    if (href) {
      next.url = normalizeUrl(href);
      // O sublinhado de links é derivado da URL no render, não persistido no run.
    }
  }

  if (tag === 'FONT') {
    const attrColor = el.getAttribute('color');
    if (attrColor) next.color = normalizeColor(attrColor);
  }

  const style = el.style;
  if (style.fontWeight) {
    const weight = style.fontWeight;
    next.bold = weight === 'bold' || weight === 'bolder' || Number.parseInt(weight, 10) >= 600;
  }
  if (style.fontStyle) {
    next.italic = style.fontStyle === 'italic' || style.fontStyle === 'oblique';
  }
  if (style.textDecorationLine || style.textDecoration) {
    const decoration = `${style.textDecorationLine || ''} ${style.textDecoration || ''}`.trim();
    if (decoration === 'none') {
      next.underline = false;
      next.strikethrough = false;
    } else {
      if (decoration.includes('underline')) next.underline = true;
      if (decoration.includes('line-through')) next.strikethrough = true;
    }
  }
  if (style.color) {
    next.color = normalizeColor(style.color);
  }

  return next;
}

/**
 * Serializa o DOM do contentEditable em runs.
 * Suporta `<b>`, `<strong>`, `<i>`, `<em>`, `<u>`, `<s>`, `<strike>`, `<a>`,
 * `<font color>`, spans com style inline, `<br>` e blocos (`div`/`p`).
 */
export function htmlToRichRuns(
  root: HTMLElement,
  _baseStyle?: RichTextBaseStyle
): TextRun[] {
  const runs: WorkingRun[] = [];

  const append = (text: string, format: WalkFormat) => {
    if (!text) return;
    const last = runs[runs.length - 1];
    if (last && sameFormat(last, format)) {
      last.text += text;
      return;
    }
    runs.push({
      text,
      bold: format.bold,
      italic: format.italic,
      underline: format.underline,
      strikethrough: format.strikethrough,
      color: format.color,
      url: format.url,
    });
  };

  const ensureNewline = () => {
    if (runs.length === 0) return;
    const last = runs[runs.length - 1];
    if (!last.text.endsWith('\n')) {
      last.text += '\n';
    }
  };

  const walk = (node: Node, format: WalkFormat) => {
    node.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        append((child.nodeValue || '').replace(/\u00a0/g, ' '), format);
        return;
      }
      if (child.nodeType !== Node.ELEMENT_NODE) return;

      const el = child as HTMLElement;
      if (el.tagName === 'BR') {
        append('\n', format);
        return;
      }

      const isBlock = BLOCK_TAGS.has(el.tagName);
      if (isBlock) ensureNewline();
      walk(el, readElementFormat(el, format));
      // Para blocos, a quebra é inserida ao entrar no próximo bloco.
    });
  };

  const initialFormat: WalkFormat = {
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    color: undefined,
  };

  walk(root, initialFormat);

  // Remove newlines fantasma no final.
  while (runs.length > 0) {
    const last = runs[runs.length - 1];
    last.text = last.text.replace(/\n+$/, '');
    if (last.text.length === 0) runs.pop();
    else break;
  }

  return runs
    .filter((run) => run.text.length > 0)
    .map(({ text, bold, italic, underline, strikethrough, color, url }) => {
      // Campos opcionais ausentes são omitidos: o Firestore rejeita `undefined`.
      const run: TextRun = { text, bold, italic, underline, strikethrough };
      if (color) run.color = color;
      if (url) run.url = url;
      return run;
    });
}

export function toggleAllRunsFormat(
  runs: TextRun[],
  key: 'bold' | 'italic' | 'underline' | 'strikethrough',
  value: boolean
): TextRun[] {
  return runs.map((run) => ({ ...run, [key]: value }));
}

export function setAllRunsColor(runs: TextRun[], color?: string): TextRun[] {
  const normalized = color ? normalizeColor(color) : undefined;
  return runs.map((run) => {
    const next = { ...run };
    if (normalized) next.color = normalized;
    else delete next.color;
    return next;
  });
}

/**
 * Atualiza (ou remove) um link específico nos runs.
 * Quando `oldUrl` é omitido, todos os trechos com link são afetados.
 * Se `newLabel` for informado, atualiza também o texto do trecho vinculado.
 */
export function updateRunLink(
  runs: TextRun[],
  oldUrl: string | undefined,
  newUrl: string | undefined,
  newLabel?: string
): TextRun[] {
  const from = oldUrl ? normalizeUrl(oldUrl) : '';
  const to = newUrl ? normalizeUrl(newUrl) : undefined;
  const trimmedLabel = newLabel?.trim();
  let labelUpdated = false;
  return runs.map((run) => {
    if (!run.url) return run;
    if (!from || normalizeUrl(run.url) === from) {
      const next = { ...run };
      if (to) {
        next.url = to;
        if (trimmedLabel && !labelUpdated) {
          next.text = trimmedLabel;
          labelUpdated = true;
        }
      } else {
        delete next.url;
      }
      return next;
    }
    return run;
  });
}

/** Remove o link de um trecho específico (ou de todos, se `targetUrl` for omitido). */
export function removeRunLink(runs: TextRun[], targetUrl?: string): TextRun[] {
  return updateRunLink(runs, targetUrl, undefined);
}

/** Aplica o mesmo link a todos os trechos (link do elemento inteiro). */
export function setAllRunsLink(runs: TextRun[], url?: string): TextRun[] {
  const norm = url ? normalizeUrl(url) : undefined;
  return runs.map((run) => {
    const next = { ...run };
    if (norm) next.url = norm;
    else delete next.url;
    return next;
  });
}

/**
 * Aplica um link aos runs respeitando `label` (palavra/frase específica) e
 * preservando outros links já existentes no elemento.
 */
export function applyLinkToRuns(runs: TextRun[], url: string, label?: string): TextRun[] {
  const norm = normalizeUrl(url);
  if (!norm) return runs;

  const trimmedLabel = label?.trim();
  if (trimmedLabel) {
    const lowerTarget = trimmedLabel.toLowerCase();
    const result: TextRun[] = [];
    let matched = false;

    for (const run of runs) {
      if (!matched) {
        const idx = run.text.toLowerCase().indexOf(lowerTarget);
        if (idx !== -1) {
          matched = true;
          const before = run.text.slice(0, idx);
          const matchText = run.text.slice(idx, idx + trimmedLabel.length);
          const after = run.text.slice(idx + trimmedLabel.length);
          if (before) {
            result.push({ ...run, text: before });
          }
          result.push({ ...run, text: matchText, url: norm });
          if (after) {
            result.push({ ...run, text: after });
          }
          continue;
        }
      }
      result.push({ ...run });
    }

    if (matched) {
      return result;
    }

    // Se o label não existia nos runs, acrescenta um novo run vinculado ao final.
    const last = runs[runs.length - 1];
    const needsSpace = Boolean(last && last.text.length > 0 && !/\s$/.test(last.text));
    const baseFormat: Omit<TextRun, 'text' | 'url' | 'color'> = last
      ? {
          bold: last.bold,
          italic: last.italic,
          underline: last.underline,
          strikethrough: last.strikethrough,
        }
      : {};
    const next = runs.map((r) => ({ ...r }));
    if (needsSpace && next.length > 0) {
      next[next.length - 1] = {
        ...next[next.length - 1],
        text: `${next[next.length - 1].text} `,
      };
    }
    next.push({ ...baseFormat, text: trimmedLabel, url: norm });
    return next;
  }

  // Sem label específico: vincula trechos que ainda não possuem link próprio
  // (ou todos os trechos, caso nenhum possua link diferente).
  const hasOtherLinks = runs.some((r) => r.url && normalizeUrl(r.url) !== norm);
  if (!hasOtherLinks) {
    return setAllRunsLink(runs, norm);
  }
  return runs.map((run) => (run.url ? { ...run } : { ...run, url: norm }));
}

export function allRunsHaveFormat(
  runs: TextRun[] | undefined,
  key: 'bold' | 'italic' | 'underline' | 'strikethrough'
): boolean {
  if (!runs || runs.length === 0) return false;
  return runs.every((run) => Boolean(run[key]));
}

let measureCtx: CanvasRenderingContext2D | null = null;
function getMeasureContext(): CanvasRenderingContext2D | null {
  if (typeof window === 'undefined') return null;
  if (!measureCtx) {
    const canvas = document.createElement('canvas');
    measureCtx = canvas.getContext('2d');
  }
  return measureCtx;
}

interface MeasureToken {
  text: string;
  width: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  color?: string;
  url?: string;
}

function sameTokenStyle(a: MeasureToken, b: MeasureToken): boolean {
  return (
    a.bold === b.bold &&
    a.italic === b.italic &&
    a.underline === b.underline &&
    a.strikethrough === b.strikethrough &&
    (a.color || '') === (b.color || '') &&
    (a.url || '') === (b.url || '')
  );
}

export interface LayoutRichTextOptions {
  maxWidth: number;
  fontSize: number;
  align?: 'left' | 'center' | 'right';
  lineHeight?: number;
  fontFamily?: string;
  baseColor?: string;
  linkColor?: string;
}

/**
 * Quebra e posiciona runs de texto rico, gerando um token por trecho visual.
 * Esses tokens viram nós <Text> do Konva com estilo individual.
 */
export function layoutRichText(
  runs: ResolvedRun[],
  options: LayoutRichTextOptions
): RichTextLayout {
  const {
    maxWidth,
    fontSize,
    align = 'left',
    lineHeight = 1.2,
    fontFamily = RICH_TEXT_FONT_FAMILY,
    baseColor = RICH_TEXT_DEFAULT_COLOR,
    linkColor = RICH_TEXT_LINK_COLOR,
  } = options;

  const lineHeightPx = fontSize * lineHeight;
  const ctx = getMeasureContext();

  const measure = (text: string, style: Pick<MeasureToken, 'bold' | 'italic'>) => {
    if (!ctx) {
      return text.length * fontSize * (style.bold ? 0.6 : 0.55);
    }
    ctx.font = `${style.italic ? 'italic ' : ''}${style.bold ? 'bold ' : ''}${fontSize}px ${fontFamily}`;
    return ctx.measureText(text).width;
  };

  const sourceTokens: MeasureToken[] = [];
  for (const run of runs) {
    const parts = run.text.match(/\n|[^\S\n]+|[^\s\n]+/g) || [];
    const color = run.color || (run.url ? linkColor : baseColor);
    for (const part of parts) {
      sourceTokens.push({
        text: part,
        width: measure(part, run),
        bold: run.bold,
        italic: run.italic,
        underline: run.underline || Boolean(run.url),
        strikethrough: run.strikethrough,
        color,
        url: run.url,
      });
    }
  }

  const output: RichTextToken[] = [];
  let line: MeasureToken[] = [];
  let lineWidth = 0;
  let lineIndex = 0;
  let tokenCounter = 0;

  const flushLine = () => {
    let lineTokens = line;
    while (lineTokens.length > 0 && lineTokens[lineTokens.length - 1].text.trim() === '') {
      lineTokens = lineTokens.slice(0, -1);
    }

    if (lineTokens.length > 0) {
      const merged: MeasureToken[] = [];
      for (const token of lineTokens) {
        const last = merged[merged.length - 1];
        if (last && sameTokenStyle(last, token)) {
          last.text += token.text;
          last.width += token.width;
        } else {
          merged.push({ ...token });
        }
      }

      const totalWidth = merged.reduce((sum, token) => sum + token.width, 0);
      let currentX = 0;
      if (align === 'center') currentX = Math.max(0, (maxWidth - totalWidth) / 2);
      else if (align === 'right') currentX = Math.max(0, maxWidth - totalWidth);

      const y = lineIndex * lineHeightPx;
      for (const token of merged) {
        output.push({
          id: `r-${tokenCounter++}`,
          text: token.text,
          x: Math.round(currentX * 100) / 100,
          y: Math.round(y * 100) / 100,
          width: Math.round(token.width * 100) / 100,
          height: lineHeightPx,
          bold: token.bold,
          italic: token.italic,
          underline: token.underline,
          strikethrough: token.strikethrough,
          color: token.color || baseColor,
          url: token.url,
        });
        currentX += token.width;
      }
    }

    line = [];
    lineWidth = 0;
    lineIndex += 1;
  };

  const pushToken = (token: MeasureToken) => {
    const isWhitespace = token.text.trim() === '';
    if (isWhitespace) {
      if (line.length === 0) return;
      line.push(token);
      lineWidth += token.width;
      return;
    }

    if (lineWidth + token.width > maxWidth && line.some((t) => t.text.trim() !== '')) {
      flushLine();
    }

    // Palavras/URLs maiores que a largura disponível quebram por caractere,
    // igual ao `overflow-wrap: anywhere` do editor HTML.
    if (token.width > maxWidth - lineWidth && Array.from(token.text).length > 1) {
      for (const char of Array.from(token.text)) {
        pushToken({ ...token, text: char, width: measure(char, token) });
      }
      return;
    }

    line.push(token);
    lineWidth += token.width;
  };

  for (const token of sourceTokens) {
    if (token.text === '\n') {
      flushLine();
      continue;
    }
    pushToken(token);
  }
  flushLine();

  return {
    tokens: output,
    height: Math.max(lineHeightPx, lineIndex * lineHeightPx),
    lineCount: Math.max(1, lineIndex),
    lineHeightPx,
  };
}

/** Atalho para elementos de texto livre: aplica base + quebra em um passo. */
export function layoutElementRichText(
  element: CanvasElement,
  options: Partial<LayoutRichTextOptions> & { maxWidth: number; fontSize: number }
): RichTextLayout {
  const base = getElementBaseStyle(element);
  const linkColor = base.color === RICH_TEXT_DEFAULT_COLOR ? RICH_TEXT_LINK_COLOR : base.color;
  return layoutRichText(getElementRuns(element), {
    lineHeight: 1.2,
    baseColor: base.color,
    linkColor,
    ...options,
  });
}

/** Mantém o texto puro limpo sem sintaxe markdown, para TTS/busca/cópia. */
export function cleanPlainText(element: CanvasElement): string {
  return stripMarkdownLinks(runsToPlainText(getElementRuns(element)));
}
