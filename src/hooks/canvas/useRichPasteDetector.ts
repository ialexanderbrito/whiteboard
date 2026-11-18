import type { CanvasElement } from '../../types/element.ts';
import { normalizeCodeLanguage, parseRichLinkMetadata } from '../../utils/richEmbeds.ts';

/**
 * Analisa texto colado via `Ctrl+V` no canvas e converte automaticamente:
 * 1. URLs únicas (`https://github.com/...`, `https://figma.com/...`, `https://youtube.com/...`, etc.) em Cards de Link Rico (`embed`).
 * 2. Blocos cercados de código Markdown (` ```ts ... ``` `) em widgets `code` com syntax highlight.
 */
export function buildRichPastedElementPayload(
  rawText: string,
  centerWorld: { x: number; y: number },
  zIndex: number,
  userId: string,
  userName?: string
): Omit<CanvasElement, 'id' | 'updatedAt'> | null {
  const trimmed = rawText.trim();
  if (!trimmed) return null;

  // 1. Detecção de bloco de código Markdown cercado por crases triplas
  const fencedMatch = /^```([a-zA-Z0-9_+#-]*)\r?\n([\s\S]*?)\r?\n?```$/.exec(trimmed);
  if (fencedMatch) {
    const lang = normalizeCodeLanguage(fencedMatch[1] || 'typescript');
    const codeBody = fencedMatch[2] || '';
    const lineCount = Math.max(3, codeBody.split('\n').length);
    const width = 460;
    const height = Math.min(540, 58 + lineCount * 21);

    return {
      type: 'code',
      x: Math.round(centerWorld.x - width / 2),
      y: Math.round(centerWorld.y - height / 2),
      width,
      height,
      text: codeBody,
      codeLanguage: lang,
      codeTheme: 'dark',
      fontSize: 13,
      zIndex,
      updatedBy: userId,
      updatedByName: userName,
    };
  }

  // 2. Detecção de URL única para Card de Link Rico (Unfurl)
  const linkMeta = parseRichLinkMetadata(trimmed);
  if (linkMeta) {
    const hasThumb = Boolean(linkMeta.thumbUrl);
    const width = 320;
    const height = hasThumb ? 236 : 118;

    return {
      type: 'embed',
      x: Math.round(centerWorld.x - width / 2),
      y: Math.round(centerWorld.y - height / 2),
      width,
      height,
      linkUrl: linkMeta.url,
      embedProvider: linkMeta.provider,
      embedTitle: linkMeta.title,
      embedDescription: linkMeta.description,
      embedDomain: linkMeta.domain,
      ...(linkMeta.thumbUrl ? { embedThumbUrl: linkMeta.thumbUrl } : {}),
      stroke: linkMeta.accentColor,
      text: linkMeta.title,
      zIndex,
      updatedBy: userId,
      updatedByName: userName,
    };
  }

  return null;
}
