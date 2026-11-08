import type { CanvasElement } from '../types/element';

const CLIPBOARD_STORAGE_KEY = 'mirio_clipboard_elements';

export interface MirioClipboardPayload {
  type: 'mirio_elements';
  elements: CanvasElement[];
  timestamp: number;
}

/**
 * Copia uma lista de elementos do canvas para o clipboard local (localStorage)
 * e tenta também gravar na área de transferência do sistema como JSON.
 */
export async function copyCanvasElements(elements: CanvasElement[]): Promise<void> {
  if (!elements || elements.length === 0) return;

  const payload: MirioClipboardPayload = {
    type: 'mirio_elements',
    elements,
    timestamp: Date.now(),
  };

  const serialized = JSON.stringify(payload);

  // Armazena no localStorage para permitir cópia e colagem entre diferentes abas/boards
  try {
    localStorage.setItem(CLIPBOARD_STORAGE_KEY, serialized);
  } catch (err) {
    console.warn('[Clipboard] Erro ao gravar no localStorage:', err);
  }

  // Tenta gravar também no clipboard do sistema operacional
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(serialized);
    }
  } catch {
    // Falha silenciosa caso o navegador restrinja permissões de clipboard no momento
  }
}

/**
 * Recupera elementos copiados verificando o clipboard do sistema e localStorage.
 */
export async function getCachedClipboardElements(): Promise<CanvasElement[] | null> {
  // 1. Tenta ler primeiro do clipboard do sistema operacional (para suportar Ctrl+C de outra aba/janela)
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.readText) {
      const text = await navigator.clipboard.readText();
      if (text && text.trim().startsWith('{')) {
        const parsed = JSON.parse(text);
        if (parsed && parsed.type === 'mirio_elements' && Array.isArray(parsed.elements)) {
          return parsed.elements;
        }
      }
    }
  } catch {
    // Permissão de leitura pode ser negada ou o clipboard contém outro tipo de dado
  }

  // 2. Fallback robusto para o localStorage compartilhado do navegador
  try {
    const raw = localStorage.getItem(CLIPBOARD_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.type === 'mirio_elements' && Array.isArray(parsed.elements)) {
        return parsed.elements;
      }
    }
  } catch (err) {
    console.warn('[Clipboard] Erro ao ler do localStorage:', err);
  }

  return null;
}

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

/**
 * Calcula a caixa delimitadora (bounding box) e o centro geométrico de um conjunto de elementos.
 */
export function getElementsBoundingBox(elements: CanvasElement[]): BoundingBox {
  if (!elements || elements.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0, centerX: 0, centerY: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const el of elements) {
    const w = el.width || (el.radius ? el.radius * 2 : 120);
    const h = el.height || (el.radius ? el.radius * 2 : 120);

    minX = Math.min(minX, el.x);
    minY = Math.min(minY, el.y);
    maxX = Math.max(maxX, el.x + w);
    maxY = Math.max(maxY, el.y + h);
  }

  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);

  return {
    minX,
    minY,
    maxX,
    maxY,
    width,
    height,
    centerX: Math.round(minX + width / 2),
    centerY: Math.round(minY + height / 2),
  };
}

/**
 * Converte um arquivo ou Blob de imagem em Data URL (Base64).
 */
export function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Obtém dimensões naturais de uma imagem a partir de uma URL ou data URL,
 * aplicando limite proporcional para não sobrecarregar o canvas (máx 500px).
 */
export function getImageDimensions(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let w = img.naturalWidth || 300;
      let h = img.naturalHeight || 200;
      const maxDim = 500;
      if (w > maxDim || h > maxDim) {
        const ratio = Math.min(maxDim / w, maxDim / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }
      resolve({
        width: Math.max(40, w),
        height: Math.max(40, h),
      });
    };
    img.onerror = () => resolve({ width: 220, height: 160 });
    img.src = src;
  });
}
