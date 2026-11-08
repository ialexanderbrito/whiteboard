/**
 * Utilitários para detecção, extração e formatação de links estilo Markdown e Miro no texto
 */

export interface TextSegment {
  text: string;
  isLink: boolean;
  url?: string;
}

export interface ExtractedLink {
  label: string;
  url: string;
  startIndex: number;
  endIndex: number;
}

/**
 * Garante que uma URL possua protocolo (padrão https://)
 */
export function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

/**
 * Extrai o domínio amigável para exibição em tooltips (ex: 'google.com' ou 'github.com')
 */
export function getDomainFromUrl(url: string): string {
  try {
    const normalized = normalizeUrl(url);
    const parsed = new URL(normalized);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0] || url;
  }
}

/**
 * Regex para encontrar links em formato Markdown: [meu texto](https://link.com)
 */
export const MARKDOWN_LINK_REGEX = /\[([^\]]+)\]\((https?:\/\/[^\s)]+|[^\s)]+)\)/g;

/**
 * Segmenta uma string de texto em pedaços comuns e pedaços de hyperlink,
 * suportando tanto links estruturados (customLinks/linkUrl) quanto links legados (Markdown e URLs cruas).
 */
export function parseTextSegments(
  rawText: string,
  elementLinks?: Array<{ url: string; label?: string }>,
  elementLinkUrl?: string
): TextSegment[] {
  if (!rawText) return [];

  // 1. Extrai links legados em formato Markdown [label](url), se houverem
  const legacyMdLinks: Array<{ label: string; url: string }> = [];
  const mdRegex = new RegExp(MARKDOWN_LINK_REGEX);
  let mdMatch: RegExpExecArray | null;
  while ((mdMatch = mdRegex.exec(rawText)) !== null) {
    legacyMdLinks.push({
      label: mdMatch[1],
      url: normalizeUrl(mdMatch[2]),
    });
  }

  // Texto limpo sem sintaxe de Markdown
  const cleanText = stripMarkdownLinks(rawText);
  if (!cleanText) return [];

  // 2. Coleta todos os links conhecidos
  const allKnownLinks: Array<{ url: string; label?: string }> = [];
  if (elementLinks && Array.isArray(elementLinks)) {
    for (const l of elementLinks) {
      if (l && l.url) allKnownLinks.push({ url: normalizeUrl(l.url), label: l.label });
    }
  }
  if (elementLinkUrl) {
    const norm = normalizeUrl(elementLinkUrl);
    if (!allKnownLinks.some((l) => l.url === norm)) {
      allKnownLinks.push({ url: norm });
    }
  }
  for (const leg of legacyMdLinks) {
    if (!allKnownLinks.some((l) => l.url === leg.url && l.label === leg.label)) {
      allKnownLinks.push(leg);
    }
  }

  // 3. Procura ocorrências de links no cleanText
  interface MatchedRange {
    start: number;
    end: number;
    url: string;
    label?: string;
  }
  const matchRanges: MatchedRange[] = [];

  // 3a. Busca por labels explícitos dos links conhecidos
  for (const link of allKnownLinks) {
    if (link.label && link.label.trim()) {
      const searchStr = link.label.trim().toLowerCase();
      const lowerClean = cleanText.toLowerCase();
      let pos = 0;
      while ((pos = lowerClean.indexOf(searchStr, pos)) !== -1) {
        const start = pos;
        const end = pos + searchStr.length;
        const overlaps = matchRanges.some((r) => Math.max(start, r.start) < Math.min(end, r.end));
        if (!overlaps) {
          matchRanges.push({
            start,
            end,
            url: link.url,
            label: cleanText.substring(start, end),
          });
        }
        pos = end;
      }
    }
  }

  // 3b. Busca por URLs cruas no cleanText (ex: https://... ou www....)
  const urlRegex = /(https?:\/\/[^\s<>"'{}|\\^`]+|www\.[^\s<>"'{}|\\^`]+)/gi;
  let urlMatch: RegExpExecArray | null;
  while ((urlMatch = urlRegex.exec(cleanText)) !== null) {
    let rawUrl = urlMatch[0];
    let end = urlRegex.lastIndex;
    const punctMatch = rawUrl.match(/[.,;:!?)]+$/);
    if (punctMatch) {
      rawUrl = rawUrl.slice(0, -punctMatch[0].length);
      end -= punctMatch[0].length;
    }
    const start = urlMatch.index;
    const overlaps = matchRanges.some((r) => Math.max(start, r.start) < Math.min(end, r.end));
    if (!overlaps && rawUrl.length > 0) {
      matchRanges.push({
        start,
        end,
        url: normalizeUrl(rawUrl),
        label: rawUrl,
      });
    }
  }

  // 3c. Se um link conhecido não tiver label ou não foi encontrado por label, mas seu domínio está no texto
  for (const link of allKnownLinks) {
    const domain = getDomainFromUrl(link.url);
    if (domain && domain.length > 3) {
      const lowerDomain = domain.toLowerCase();
      const lowerClean = cleanText.toLowerCase();
      let pos = 0;
      while ((pos = lowerClean.indexOf(lowerDomain, pos)) !== -1) {
        const start = pos;
        const end = pos + domain.length;
        const overlaps = matchRanges.some((r) => Math.max(start, r.start) < Math.min(end, r.end));
        if (!overlaps) {
          matchRanges.push({
            start,
            end,
            url: link.url,
            label: cleanText.substring(start, end),
          });
        }
        pos = end;
      }
    }
  }

  // 3d. Se houver um link explícito geral (ex: linkUrl ou 1 único link sem label específico) e NENHUM trecho foi vinculado ainda
  if (matchRanges.length === 0 && allKnownLinks.length > 0) {
    const singleLink = allKnownLinks[0];
    if (!singleLink.label || singleLink.label.trim().toLowerCase() === cleanText.trim().toLowerCase()) {
      matchRanges.push({
        start: 0,
        end: cleanText.length,
        url: singleLink.url,
        label: cleanText,
      });
    }
  }

  // Se não houver nenhum match de link, retorna o texto limpo integral como não-link
  if (matchRanges.length === 0) {
    return [{ text: cleanText, isLink: false }];
  }

  // Ordena os intervalos encontrados por posição inicial
  matchRanges.sort((a, b) => a.start - b.start);

  // Constrói os TextSegments
  const segments: TextSegment[] = [];
  let curIndex = 0;

  for (const m of matchRanges) {
    if (m.start > curIndex) {
      segments.push({
        text: cleanText.substring(curIndex, m.start),
        isLink: false,
      });
    }
    segments.push({
      text: cleanText.substring(m.start, m.end),
      isLink: true,
      url: m.url,
    });
    curIndex = m.end;
  }

  if (curIndex < cleanText.length) {
    segments.push({
      text: cleanText.substring(curIndex),
      isLink: false,
    });
  }

  return segments;
}

/**
 * Retorna o texto limpo sem a sintaxe de colchetes e parênteses do Markdown para cálculo de largura e leitura
 */
export function stripMarkdownLinks(text: string): string {
  if (!text) return '';
  return text.replace(MARKDOWN_LINK_REGEX, '$1');
}

/**
 * Encontra todos os links no texto (inclui tanto markdown quanto URLs cruas)
 */
export function extractLinksFromText(rawText: string): ExtractedLink[] {
  if (!rawText) return [];
  const links: ExtractedLink[] = [];
  const mdRegex = new RegExp(MARKDOWN_LINK_REGEX);
  let match: RegExpExecArray | null;

  while ((match = mdRegex.exec(rawText)) !== null) {
    links.push({
      label: match[1],
      url: normalizeUrl(match[2]),
      startIndex: match.index,
      endIndex: mdRegex.lastIndex,
    });
  }

  // Também encontra URLs cruas fora de links markdown
  const urlRegex = /(https?:\/\/[^\s<>"'{}|\\^`]+|www\.[^\s<>"'{}|\\^`]+)/gi;
  let urlMatch: RegExpExecArray | null;
  while ((urlMatch = urlRegex.exec(rawText)) !== null) {
    const start = urlMatch.index;
    const end = urlRegex.lastIndex;

    const isInsideMd = links.some((l) => start >= l.startIndex && end <= l.endIndex);
    if (!isInsideMd) {
      let rawUrl = urlMatch[0];
      let cleanEnd = end;
      const punctMatch = rawUrl.match(/[.,;:!?)]+$/);
      if (punctMatch) {
        rawUrl = rawUrl.slice(0, -punctMatch[0].length);
        cleanEnd -= punctMatch[0].length;
      }
      links.push({
        label: rawUrl,
        url: normalizeUrl(rawUrl),
        startIndex: start,
        endIndex: cleanEnd,
      });
    }
  }

  links.sort((a, b) => a.startIndex - b.startIndex);
  return links;
}

/**
 * Retorna o primeiro link encontrado no texto ou o linkUrl explícito do elemento
 */
export function getFirstLink(text?: string, linkUrl?: string): { url: string; label?: string } | null {
  if (linkUrl) {
    return { url: normalizeUrl(linkUrl) };
  }
  if (!text) return null;

  const links = extractLinksFromText(text);
  if (links.length > 0) {
    const first = links[0];
    if (
      first.label &&
      first.label !== first.url &&
      !first.label.startsWith('http://') &&
      !first.label.startsWith('https://')
    ) {
      return { url: first.url, label: first.label };
    }
    return { url: first.url };
  }

  return null;
}

/**
 * Extrai todos os links únicos existentes no elemento (customLinks, linkUrl e legado em texto)
 */
export function extractAllLinks(
  text?: string, 
  linkUrl?: string, 
  customLinks?: Array<{ url: string; label?: string }>
): ExtractedLink[] {
  const links: ExtractedLink[] = [];
  const seenUrls = new Set<string>();

  // 1. Links estruturados em customLinks
  if (customLinks && Array.isArray(customLinks)) {
    for (const cl of customLinks) {
      if (cl && cl.url) {
        const norm = normalizeUrl(cl.url);
        if (norm && !seenUrls.has(norm)) {
          seenUrls.add(norm);
          links.push({
            label: cl.label || getDomainFromUrl(norm),
            url: norm,
            startIndex: 0,
            endIndex: 0,
          });
        }
      }
    }
  }

  // 2. Link principal em linkUrl
  if (linkUrl) {
    const norm = normalizeUrl(linkUrl);
    if (norm && !seenUrls.has(norm)) {
      seenUrls.add(norm);
      links.push({
        label: getDomainFromUrl(norm),
        url: norm,
        startIndex: 0,
        endIndex: 0,
      });
    }
  }

  // 3. Links legados no texto (markdown ou URLs cruas)
  if (text) {
    const textLinks = extractLinksFromText(text);
    for (const l of textLinks) {
      const norm = normalizeUrl(l.url);
      if (norm && !seenUrls.has(norm)) {
        seenUrls.add(norm);
        links.push({
          label: l.label && l.label !== l.url ? l.label : getDomainFromUrl(norm),
          url: norm,
          startIndex: l.startIndex,
          endIndex: l.endIndex,
        });
      }
    }
  }

  return links;
}

/**
 * Adiciona ou atualiza um link em um elemento sem poluir o texto com sintaxe Markdown.
 */
export function addLinkToElement(
  currentLinkUrl?: string,
  currentLinks?: Array<{ url: string; label?: string }>,
  newUrl?: string,
  newLabel?: string
): { linkUrl: string; links: Array<{ url: string; label?: string }> } {
  const norm = normalizeUrl(newUrl || '');
  const existing = currentLinks ? [...currentLinks] : [];
  if (currentLinkUrl && !existing.some((l) => normalizeUrl(l.url) === normalizeUrl(currentLinkUrl))) {
    existing.unshift({ url: normalizeUrl(currentLinkUrl) });
  }

  if (norm) {
    const existingIdx = existing.findIndex((l) => normalizeUrl(l.url) === norm);
    if (existingIdx !== -1) {
      existing[existingIdx] = { url: norm, label: newLabel || existing[existingIdx].label };
    } else {
      existing.push({ url: norm, label: newLabel });
    }
  }

  return {
    linkUrl: existing[0]?.url || norm,
    links: existing,
  };
}

/**
 * Remove um link de um elemento
 */
export function removeLinkFromElement(
  currentLinkUrl?: string,
  currentLinks?: Array<{ url: string; label?: string }>,
  targetUrl?: string
): { linkUrl?: string; links: Array<{ url: string; label?: string }> } {
  const normTarget = targetUrl ? normalizeUrl(targetUrl) : '';
  let updated = (currentLinks || []).filter((l) => normalizeUrl(l.url) !== normTarget);

  if (!normTarget && currentLinkUrl) {
    updated = [];
  }

  return {
    linkUrl: updated[0]?.url,
    links: updated,
  };
}

/**
 * Remove um link específico do texto mantendo o texto do label (converte [label](url) em label)
 */
export function removeLinkFromText(rawText: string, targetUrl: string): string {
  if (!rawText || !targetUrl) return rawText;
  const normTarget = normalizeUrl(targetUrl);

  const mdRegex = new RegExp(MARKDOWN_LINK_REGEX);
  let updated = rawText.replace(mdRegex, (fullMatch, label, url) => {
    if (normalizeUrl(url) === normTarget) {
      return label;
    }
    return fullMatch;
  });

  if (updated === rawText) {
    const rawIdx = updated.indexOf(targetUrl);
    if (rawIdx !== -1) {
      updated = updated.substring(0, rawIdx) + updated.substring(rawIdx + targetUrl.length);
    }
  }

  return updated;
}

/**
 * Atualiza um link existente no texto
 */
export function updateLinkInText(
  rawText: string,
  oldUrl: string,
  newUrl: string,
  newLabel?: string
): string {
  if (!rawText || !oldUrl || !newUrl) return rawText;
  const normOld = normalizeUrl(oldUrl);
  const normNew = normalizeUrl(newUrl);

  const mdRegex = new RegExp(MARKDOWN_LINK_REGEX);
  let replaced = false;

  let result = rawText.replace(mdRegex, (fullMatch, label, url) => {
    if (normalizeUrl(url) === normOld) {
      replaced = true;
      const finalLabel = newLabel !== undefined && newLabel.trim() ? newLabel.trim() : label;
      return `[${finalLabel}](${normNew})`;
    }
    return fullMatch;
  });

  if (!replaced) {
    const rawIdx = result.indexOf(oldUrl);
    if (rawIdx !== -1) {
      const finalLabel = newLabel !== undefined && newLabel.trim() ? newLabel.trim() : newUrl;
      result = `${result.substring(0, rawIdx)}[${finalLabel}](${normNew})${result.substring(rawIdx + oldUrl.length)}`;
    }
  }

  return result;
}

export interface TextSelectionRange {
  elementId?: string;
  start: number;
  end: number;
  text?: string;
}

/**
 * Aplica um link a uma palavra específica ou seleção no texto, preservando o resto da frase intacto.
 * Se houver um intervalo selecionado, substitui aquele trecho específico.
 * Se houver uma palavra em targetLabel presente no texto, substitui aquela palavra.
 * Caso contrário, anexa o link ao texto.
 */
export function applyLinkToText(
  currentText: string,
  targetLabel: string,
  url: string,
  range?: TextSelectionRange | null
): string {
  const normUrl = normalizeUrl(url);
  if (!normUrl) return currentText;

  const rawText = currentText || '';
  const trimmedLabel = targetLabel ? targetLabel.trim() : '';

  // 1. Se um intervalo explícito de seleção foi passado (ex: o usuário selecionou uma palavra com o mouse)
  if (
    range &&
    typeof range.start === 'number' &&
    typeof range.end === 'number' &&
    range.start >= 0 &&
    range.end <= rawText.length &&
    range.start < range.end
  ) {
    const selected = rawText.substring(range.start, range.end);
    const label = trimmedLabel || selected || normUrl.replace(/^https?:\/\//, '');
    const before = rawText.substring(0, range.start);
    const after = rawText.substring(range.end);
    return `${before}[${label}](${normUrl})${after}`;
  }

  // 2. Se um texto de exibição (label) foi fornecido
  if (trimmedLabel) {
    // 2a. Verifica se o label já é um link markdown existente (edição de link existente)
    const existingLinks = extractLinksFromText(rawText);
    const existingMatch = existingLinks.find(
      (l) => l.label.toLowerCase() === trimmedLabel.toLowerCase()
    );
    if (existingMatch) {
      const before = rawText.substring(0, existingMatch.startIndex);
      const after = rawText.substring(existingMatch.endIndex);
      return `${before}[${trimmedLabel}](${normUrl})${after}`;
    }

    // 2b. Procura pela palavra no texto (case-insensitive) para envolver apenas ela
    const lowerText = rawText.toLowerCase();
    const lowerLabel = trimmedLabel.toLowerCase();
    const matchIdx = lowerText.indexOf(lowerLabel);

    if (matchIdx !== -1) {
      const actualWordInText = rawText.substring(matchIdx, matchIdx + trimmedLabel.length);
      const before = rawText.substring(0, matchIdx);
      const after = rawText.substring(matchIdx + trimmedLabel.length);
      return `${before}[${actualWordInText}](${normUrl})${after}`;
    }

    // 2c. Se o texto estiver vazio, retorna apenas o markdown do link
    if (!rawText.trim()) {
      return `[${trimmedLabel}](${normUrl})`;
    }

    // 2d. Se a palavra não existir no texto, anexa o link ao final
    return `${rawText} [${trimmedLabel}](${normUrl})`;
  }

  // 3. Se nenhum label foi fornecido
  if (!rawText.trim()) {
    const fallbackLabel = normUrl.replace(/^https?:\/\//, '');
    return `[${fallbackLabel}](${normUrl})`;
  }

  // Se o texto já tem conteúdo mas o label veio vazio, envolve todo o texto existente como o link
  return `[${rawText}](${normUrl})`;
}

/**
 * Envolve a seleção do texto no formato [label](url) ou insere caso não haja seleção
 */
export function insertMarkdownLink(
  fullText: string,
  selectionStart: number,
  selectionEnd: number,
  url: string,
  customLabel?: string
): { newText: string; newCursorPos: number } {
  const normUrl = normalizeUrl(url);
  const selected = fullText.substring(selectionStart, selectionEnd);
  const label = customLabel || selected || normUrl.replace(/^https?:\/\//, '');
  const linkMarkdown = `[${label}](${normUrl})`;

  const before = fullText.substring(0, selectionStart);
  const after = fullText.substring(selectionEnd);
  const newText = `${before}${linkMarkdown}${after}`;
  const newCursorPos = before.length + linkMarkdown.length;

  return { newText, newCursorPos };
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

export interface LayoutWord {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height?: number;
  isLink: boolean;
  url?: string;
}

/**
 * Calcula a posição e quebra de linha de cada palavra mantendo a diferenciação visual e interativa dos links.
 * Suporta tanto links estruturados (customLinks/linkUrl) quanto legados.
 */
export function layoutFormattedWords(
  rawText: string,
  maxWidth: number,
  fontSize: number,
  fontStyleStr: string = 'normal',
  align: 'left' | 'center' | 'right' = 'left',
  lineHeightMultiplier: number = 1.35,
  elementLinks?: Array<{ url: string; label?: string }>,
  elementLinkUrl?: string
): LayoutWord[] {
  if (!rawText) return [];
  const ctx = getMeasureContext();
  const font = `${fontStyleStr} ${fontSize}px system-ui, -apple-system, sans-serif`;
  if (ctx) ctx.font = font;

  const measure = (str: string) => {
    if (!ctx) return str.length * fontSize * 0.55;
    return ctx.measureText(str).width;
  };

  const paragraphs = rawText.split('\n');
  const allWords: LayoutWord[] = [];
  let currentY = 0;
  let wordCounter = 0;

  for (const paragraph of paragraphs) {
    if (paragraph.length === 0) {
      currentY += fontSize * lineHeightMultiplier;
      continue;
    }

    const segments = parseTextSegments(paragraph, elementLinks, elementLinkUrl);
    const tokens: { text: string; isLink: boolean; url?: string; width: number }[] = [];
    for (const seg of segments) {
      const parts = seg.text.split(/(\s+)/);
      for (const part of parts) {
        if (!part) continue;
        tokens.push({
          text: part,
          isLink: seg.isLink,
          url: seg.url,
          width: measure(part),
        });
      }
    }

    let lineTokens: typeof tokens = [];
    let currentLineWidth = 0;

    const flushLine = () => {
      if (lineTokens.length === 0) return;

      // Agrupa tokens adjacentes na mesma linha que possuem o mesmo status de link e url
      // Isso minimiza a quantidade de nós <Text> e melhora a tipografia natural
      const mergedLineTokens: typeof tokens = [];
      for (const t of lineTokens) {
        const last = mergedLineTokens[mergedLineTokens.length - 1];
        if (last && last.isLink === t.isLink && last.url === t.url) {
          last.text += t.text;
          last.width += t.width;
        } else {
          mergedLineTokens.push({ ...t });
        }
      }

      const totalLineWidth = mergedLineTokens.reduce((sum, t) => sum + t.width, 0);
      let startX = 0;
      if (align === 'center') {
        startX = Math.max(0, (maxWidth - totalLineWidth) / 2);
      } else if (align === 'right') {
        startX = Math.max(0, maxWidth - totalLineWidth);
      }

      let curX = startX;
      for (const t of mergedLineTokens) {
        allWords.push({
          id: `w-${wordCounter++}`,
          text: t.text,
          x: Math.round(curX),
          y: Math.round(currentY),
          width: Math.round(t.width),
          height: Math.round(fontSize * lineHeightMultiplier),
          isLink: t.isLink,
          url: t.url,
        });
        curX += t.width;
      }

      currentY += fontSize * lineHeightMultiplier;
      lineTokens = [];
      currentLineWidth = 0;
    };

    for (const token of tokens) {
      // Ignora espaço no início de uma linha que acabou de quebrar
      if (lineTokens.length === 0 && !token.isLink && token.text.trim() === '') {
        continue;
      }
      if (currentLineWidth + token.width > maxWidth && lineTokens.length > 0) {
        flushLine();
        if (!token.isLink && token.text.trim() === '') {
          continue;
        }
      }
      lineTokens.push(token);
      currentLineWidth += token.width;
    }
    flushLine();
  }

  return allWords;
}
