/**
 * Utilitário para converter um File ou Blob em string DataURL (Base64).
 */
export function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const RECENT_IMAGES_STORAGE_KEY = 'mirio_recent_uploaded_images';

/**
 * Limite seguro de caracteres Base64 por imagem para nunca exceder o teto de 1 MiB
 * (1.048.576 bytes) por documento do Firebase Firestore no plano gratuito (Spark).
 */
export const MAX_FIRESTORE_SAFE_DATA_URL_LENGTH = 720_000;

/**
 * Dimensão máxima (largura ou altura real em pixels) ao comprimir imagens no navegador.
 * 1400px preserva nitidez excelente para diagramas, prints de código e fotos mantendo ~80–200KB em WebP.
 */
export const MAX_UPLOAD_PIXEL_DIMENSION = 1400;

export interface ProcessedUploadImage {
  type: 'sticker' | 'gif';
  src: string;
  alt: string;
  width: number;
  height: number;
  naturalWidth: number;
  naturalHeight: number;
  sizeBytes: number;
}

const SUPPORTED_IMAGE_EXTENSIONS = /\.(png|jpe?g|webp|gif|svg|avif|bmp|ico)$/i;

/**
 * Verifica se um File ou Blob é uma imagem suportada pelo quadro.
 */
export function isSupportedImageFile(file: File | Blob | null | undefined): boolean {
  if (!file) return false;
  if (typeof file.type === 'string' && file.type.startsWith('image/')) {
    return true;
  }
  const maybeName = (file as File).name;
  if (typeof maybeName === 'string' && SUPPORTED_IMAGE_EXTENSIONS.test(maybeName.trim())) {
    return true;
  }
  return false;
}

/**
 * Limpa o nome do arquivo para uso como texto alternativo (alt) amigável.
 */
export function formatImageAltName(rawName?: string): string {
  if (!rawName || !rawName.trim()) return 'Imagem do computador';
  const withoutExt = rawName.trim().replace(/\.[^.]+$/, '');
  const cleaned = withoutExt.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  return cleaned ? cleaned.slice(0, 80) : 'Imagem do computador';
}

/**
 * Calcula as dimensões iniciais de exibição no canvas mantendo a proporção original.
 */
export function computeInitialCanvasDimensions(
  naturalWidth: number,
  naturalHeight: number,
  maxDisplayDim = 420,
  minDisplayDim = 48
): { width: number; height: number } {
  const safeW = Number.isFinite(naturalWidth) && naturalWidth > 0 ? naturalWidth : 320;
  const safeH = Number.isFinite(naturalHeight) && naturalHeight > 0 ? naturalHeight : 240;

  let w = safeW;
  let h = safeH;

  if (w > maxDisplayDim || h > maxDisplayDim) {
    const ratio = Math.min(maxDisplayDim / w, maxDisplayDim / h);
    w = Math.round(w * ratio);
    h = Math.round(h * ratio);
  }

  return {
    width: Math.max(minDisplayDim, Math.round(w)),
    height: Math.max(minDisplayDim, Math.round(h)),
  };
}

/**
 * Calcula o posicionamento em grade inteligente (Smart Grid) para 1 ou múltiplas imagens
 * centralizadas em torno de uma coordenada do mundo (centro da tela ou posição do drop).
 */
export function computeImageGridLayout(
  items: ReadonlyArray<{ width: number; height: number }>,
  centerWorld: { x: number; y: number },
  gap = 24
): Array<{ x: number; y: number }> {
  if (!items || items.length === 0) return [];

  if (items.length === 1) {
    const first = items[0];
    return [
      {
        x: Math.round(centerWorld.x - first.width / 2),
        y: Math.round(centerWorld.y - first.height / 2),
      },
    ];
  }

  const cols = Math.min(4, Math.ceil(Math.sqrt(items.length)));
  const rows: Array<Array<{ index: number; width: number; height: number }>> = [];

  for (let i = 0; i < items.length; i += cols) {
    const slice = items.slice(i, i + cols).map((item, offset) => ({
      index: i + offset,
      width: item.width,
      height: item.height,
    }));
    rows.push(slice);
  }

  const rowMetrics = rows.map((row) => {
    const rowWidth = row.reduce((acc, it) => acc + it.width, 0) + Math.max(0, row.length - 1) * gap;
    const rowHeight = row.reduce((acc, it) => Math.max(acc, it.height), 0);
    return { rowWidth, rowHeight };
  });

  const totalHeight =
    rowMetrics.reduce((acc, rm) => acc + rm.rowHeight, 0) + Math.max(0, rows.length - 1) * gap;

  const result = new Array<{ x: number; y: number }>(items.length);
  let currentY = centerWorld.y - totalHeight / 2;

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    const { rowWidth, rowHeight } = rowMetrics[r];
    let currentX = centerWorld.x - rowWidth / 2;

    for (const item of row) {
      const offsetY = (rowHeight - item.height) / 2;
      result[item.index] = {
        x: Math.round(currentX),
        y: Math.round(currentY + offsetY),
      };
      currentX += item.width + gap;
    }

    currentY += rowHeight + gap;
  }

  return result;
}

/**
 * Estima o tamanho em bytes de uma string Data URL Base64.
 */
export function estimateDataUrlBytes(dataUrl: string): number {
  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx === -1) return dataUrl.length;
  const base64Length = dataUrl.length - (commaIdx + 1);
  return Math.round((base64Length * 3) / 4);
}

function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Falha ao decodificar imagem'));
    img.src = src;
  });
}

/**
 * Comprime um HTMLImageElement via HTMLCanvasElement para WebP (ou JPEG como fallback),
 * garantindo que o Data URL resultante respeite o limite do Firestore (Spark Plan).
 */
function compressImageToDataUrl(
  img: HTMLImageElement,
  maxDimension = MAX_UPLOAD_PIXEL_DIMENSION,
  maxDataUrlLength = MAX_FIRESTORE_SAFE_DATA_URL_LENGTH
): { dataUrl: string; naturalWidth: number; naturalHeight: number } {
  const rawW = img.naturalWidth || img.width || 320;
  const rawH = img.naturalHeight || img.height || 240;

  if (typeof document === 'undefined') {
    return { dataUrl: img.src, naturalWidth: rawW, naturalHeight: rawH };
  }

  const attempts: Array<{ scaleCap: number; quality: number; mime: string }> = [
    { scaleCap: maxDimension, quality: 0.84, mime: 'image/webp' },
    { scaleCap: 1200, quality: 0.76, mime: 'image/webp' },
    { scaleCap: 960, quality: 0.68, mime: 'image/webp' },
    { scaleCap: 800, quality: 0.6, mime: 'image/jpeg' },
  ];

  let lastDataUrl = img.src;
  let finalW = rawW;
  let finalH = rawH;

  for (const attempt of attempts) {
    let targetW = rawW;
    let targetH = rawH;
    if (targetW > attempt.scaleCap || targetH > attempt.scaleCap) {
      const ratio = Math.min(attempt.scaleCap / targetW, attempt.scaleCap / targetH);
      targetW = Math.max(1, Math.round(targetW * ratio));
      targetH = Math.max(1, Math.round(targetH * ratio));
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) break;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    if (attempt.mime === 'image/jpeg') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, targetW, targetH);
    }

    ctx.drawImage(img, 0, 0, targetW, targetH);

    let encoded = canvas.toDataURL(attempt.mime, attempt.quality);
    // Se o navegador não suportar image/webp e cair em image/png grande, tenta image/jpeg
    if (
      attempt.mime === 'image/webp' &&
      encoded.startsWith('data:image/png') &&
      encoded.length > maxDataUrlLength
    ) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, targetW, targetH);
      ctx.drawImage(img, 0, 0, targetW, targetH);
      encoded = canvas.toDataURL('image/jpeg', attempt.quality);
    }

    lastDataUrl = encoded;
    finalW = targetW;
    finalH = targetH;

    if (encoded.length <= maxDataUrlLength) {
      return { dataUrl: encoded, naturalWidth: finalW, naturalHeight: finalH };
    }
  }

  return { dataUrl: lastDataUrl, naturalWidth: finalW, naturalHeight: finalH };
}

/**
 * Processa e otimiza um arquivo de imagem do computador (ou área de transferência)
 * para inserção rápida e leve no canvas.
 */
export async function processImageFile(
  file: File | Blob,
  customAlt?: string
): Promise<ProcessedUploadImage> {
  const fileName = (file as File).name || '';
  const alt = customAlt || formatImageAltName(fileName);
  const isGif =
    file.type === 'image/gif' ||
    fileName.toLowerCase().endsWith('.gif');
  const isSvg =
    file.type === 'image/svg+xml' ||
    fileName.toLowerCase().endsWith('.svg');

  const rawDataUrl = await fileToDataUrl(file);
  const img = await loadHtmlImage(rawDataUrl);
  const rawW = img.naturalWidth || img.width || 320;
  const rawH = img.naturalHeight || img.height || 240;
  const displayDims = computeInitialCanvasDimensions(rawW, rawH);

  // GIFs animados dentro do limite seguro do Firestore mantêm seus frames originais
  if (isGif && rawDataUrl.length <= MAX_FIRESTORE_SAFE_DATA_URL_LENGTH) {
    return {
      type: 'gif',
      src: rawDataUrl,
      alt,
      width: displayDims.width,
      height: displayDims.height,
      naturalWidth: rawW,
      naturalHeight: rawH,
      sizeBytes: estimateDataUrlBytes(rawDataUrl),
    };
  }

  // SVGs vetoriais leves também são mantidos intactos se couberem com folga
  if (isSvg && rawDataUrl.length <= 240_000) {
    return {
      type: 'sticker',
      src: rawDataUrl,
      alt,
      width: displayDims.width,
      height: displayDims.height,
      naturalWidth: rawW,
      naturalHeight: rawH,
      sizeBytes: estimateDataUrlBytes(rawDataUrl),
    };
  }

  const compressed = compressImageToDataUrl(img);
  return {
    type: 'sticker',
    src: compressed.dataUrl,
    alt,
    width: displayDims.width,
    height: displayDims.height,
    naturalWidth: compressed.naturalWidth,
    naturalHeight: compressed.naturalHeight,
    sizeBytes: estimateDataUrlBytes(compressed.dataUrl),
  };
}

/**
 * Processa múltiplos arquivos de imagem em paralelo, ignorando arquivos inválidos sem interromper o lote.
 */
export async function processImageFiles(
  files: Iterable<File | Blob>
): Promise<ProcessedUploadImage[]> {
  const validFiles = Array.from(files).filter(isSupportedImageFile);
  if (validFiles.length === 0) return [];

  const settled = await Promise.allSettled(validFiles.map((file) => processImageFile(file)));
  const results: ProcessedUploadImage[] = [];

  for (const item of settled) {
    if (item.status === 'fulfilled' && item.value?.src) {
      results.push(item.value);
    }
  }

  return results;
}

/**
 * Limpa o histórico de imagens recentes salvas localmente no navegador, liberando o espaço de armazenamento.
 */
export function clearRecentUploadedImages(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(RECENT_IMAGES_STORAGE_KEY);
  } catch {}
}


export interface FileValidationResult {
  validFiles: File[];
  unsupportedFiles: File[];
  unsupportedNames: string[];
  hasPdf: boolean;
}

/**
 * Analisa e classifica uma lista de arquivos soltos ou selecionados, separando
 * imagens válidas de formatos não suportados (com detecção explícita de PDF).
 */
export function validateDroppedFiles(
  inputFiles: FileList | File[] | Array<File | Blob> | null | undefined
): FileValidationResult {
  const files = inputFiles ? Array.from(inputFiles as Array<File | Blob>) : [];
  const validFiles: File[] = [];
  const unsupportedFiles: File[] = [];
  const unsupportedNames: string[] = [];
  let hasPdf = false;

  for (const item of files) {
    if (isSupportedImageFile(item)) {
      validFiles.push(item as File);
    } else {
      unsupportedFiles.push(item as File);
      const name = (item as File).name || 'arquivo';
      unsupportedNames.push(name);
      if (
        (item as File).type === 'application/pdf' ||
        name.toLowerCase().endsWith('.pdf')
      ) {
        hasPdf = true;
      }
    }
  }

  return {
    validFiles,
    unsupportedFiles,
    unsupportedNames,
    hasPdf,
  };
}

/**
 * Retorna mensagem humanizada para alertar o usuário quando arquivos não suportados são enviados.
 */
export function formatUnsupportedFileMessage(validation: FileValidationResult): {
  title: string;
  message: string;
} {
  if (validation.hasPdf) {
    const singlePdf = validation.unsupportedNames.find((n) => n.toLowerCase().endsWith('.pdf'));
    return {
      title: 'Arquivos PDF não são suportados',
      message: singlePdf
        ? `O arquivo "${singlePdf}" é um documento PDF. O quadro aceita imagens (PNG, JPG, WebP, GIF, SVG). Converta a página para imagem ou capture um print para colar diretamente com Ctrl+V.`
        : 'Arquivos PDF não podem ser inseridos diretamente como imagem. Converta as páginas para PNG/JPG ou tire um print para colar no quadro.',
    };
  }

  const sample = validation.unsupportedNames.slice(0, 2).join(', ');
  const more = validation.unsupportedNames.length > 2 ? '...' : '';
  return {
    title: 'Formato de arquivo não suportado',
    message: `O arquivo ${sample}${more} não é uma imagem suportada. O quadro aceita arquivos nos formatos PNG, JPG, WebP, GIF e SVG.`,
  };
}
