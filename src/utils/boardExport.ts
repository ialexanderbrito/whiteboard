import type Konva from 'konva';
import type { CanvasElement } from '../types/element.ts';
import { getElementWorldBounds } from './elementBounds.ts';
import { sortElementsByLayer } from './layerOrder.ts';
import { getContrastTextColor } from './colors.ts';

/**
 * Ordena Molduras (Frames) espacialmente em ordem natural de leitura (topo -> base em faixas, esquerda -> direita)
 * para que o Modo Apresentação navegue pelos slides de forma previsível em vez da ordem aleatória de IDs do Firestore.
 */
export function sortFramesSpatially(frames: ReadonlyArray<CanvasElement>): CanvasElement[] {
  const ROW_BAND_PX = 140;
  return [...frames].sort((a, b) => {
    const rowDiff = a.y - b.y;
    if (Math.abs(rowDiff) > ROW_BAND_PX) {
      return rowDiff;
    }
    if (a.x !== b.x) {
      return a.x - b.x;
    }
    return rowDiff;
  });
}

function escapeXml(raw: string): string {
  return String(raw)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Calcula a caixa delimitadora global (com margem) de todos os elementos do quadro.
 */
export function computeBoardWorldBoundingBox(
  elements: ReadonlyArray<CanvasElement>,
  padding = 64
): { x: number; y: number; width: number; height: number } | null {
  if (elements.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const el of elements) {
    const b = getElementWorldBounds(el);
    if (!Number.isFinite(b.x) || !Number.isFinite(b.y)) continue;
    // Molduras possuem aba de título 28px acima de y
    const topY = el.type === 'frame' ? b.y - 32 : b.y;
    if (b.x < minX) minX = b.x;
    if (topY < minY) minY = topY;
    if (b.x + b.w > maxX) maxX = b.x + b.w;
    if (b.y + b.h > maxY) maxY = b.y + b.h;
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY)) return null;

  return {
    x: Math.floor(minX - padding),
    y: Math.floor(minY - padding),
    width: Math.max(200, Math.ceil(maxX - minX + padding * 2)),
    height: Math.max(150, Math.ceil(maxY - minY + padding * 2)),
  };
}

/**
 * Exporta TODO o conteúdo do quadro em PNG de alta resolução com fundo sólido do tema ativo,
 * ocultando temporariamente alças de seleção (Transformer) para uma imagem limpa de apresentação.
 */
export function exportFullBoardToDataUrl(
  stage: Konva.Stage,
  elements: ReadonlyArray<CanvasElement>,
  isDark: boolean
): string | null {
  const bgColor = isDark ? '#09090b' : '#ffffff';
  const bbox = computeBoardWorldBoundingBox(elements, 64);

  // Salva estado original da câmera do Stage
  const prevPos = { x: stage.x(), y: stage.y() };
  const prevScale = { x: stage.scaleX(), y: stage.scaleY() };

  // Oculta temporariamente Transformers (alças de seleção)
  const transformers = stage.find('Transformer');
  const prevVisibility = transformers.map((tr) => tr.visible());
  transformers.forEach((tr) => tr.visible(false));

  try {
    let rawCanvas: HTMLCanvasElement;

    if (bbox) {
      // Limita dimensão máxima de pixel (ex: 4096px) para nunca estourar memória do browser em quadros gigantes
      const maxCanvasPx = 4096;
      const idealRatio = 2;
      const safeRatio = Math.min(
        idealRatio,
        maxCanvasPx / bbox.width,
        maxCanvasPx / bbox.height
      );
      const exportScale = Math.max(0.25, safeRatio);

      stage.position({ x: 0, y: 0 });
      stage.scale({ x: 1, y: 1 });
      stage.batchDraw();

      rawCanvas = stage.toCanvas({
        x: bbox.x,
        y: bbox.y,
        width: bbox.width,
        height: bbox.height,
        pixelRatio: exportScale,
      });
    } else {
      rawCanvas = stage.toCanvas({ pixelRatio: 2 });
    }

    // Compõe sobre fundo sólido correspondente ao tema para nunca deixar texto branco invisível em PNG transparente
    const outCanvas = document.createElement('canvas');
    outCanvas.width = rawCanvas.width;
    outCanvas.height = rawCanvas.height;
    const ctx = outCanvas.getContext('2d');
    if (!ctx) return rawCanvas.toDataURL('image/png');

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, outCanvas.width, outCanvas.height);
    ctx.drawImage(rawCanvas, 0, 0);

    return outCanvas.toDataURL('image/png');
  } finally {
    stage.position(prevPos);
    stage.scale(prevScale);
    transformers.forEach((tr, idx) => tr.visible(prevVisibility[idx]));
    stage.batchDraw();
  }
}

/**
 * Gera um documento vetorial SVG completo e independente de todo o quadro.
 */
export function generateBoardSvgMarkup(
  elements: ReadonlyArray<CanvasElement>,
  boardTitle: string,
  isDark: boolean
): string {
  const bgColor = isDark ? '#09090b' : '#ffffff';
  const defaultFg = isDark ? '#f8fafc' : '#0f172a';
  const bbox = computeBoardWorldBoundingBox(elements, 64) || {
    x: 0,
    y: 0,
    width: 1200,
    height: 800,
  };

  const ordered = sortElementsByLayer([...elements]);
  const shapesSvg: string[] = [];

  for (const el of ordered) {
    const rot = el.rotation || 0;
    const b = getElementWorldBounds(el);
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    const transformAttr = rot ? ` transform="rotate(${rot} ${cx} ${cy})"` : '';
    const dashAttr =
      el.dash && el.dash.length > 0 ? ` stroke-dasharray="${el.dash.join(' ')}"` : '';
    const opacityAttr = el.opacity !== undefined && el.opacity < 1 ? ` opacity="${el.opacity}"` : '';

    if (el.type === 'frame') {
      const w = el.width || 420;
      const h = el.height || 500;
      const stroke = escapeXml(el.stroke || '#94a3b8');
      const fill = escapeXml(el.fill || (isDark ? 'rgba(39,39,42,0.35)' : 'rgba(241,245,249,0.55)'));
      const title = escapeXml(el.text || 'Nova Raia');
      const headerW = Math.min(w, Math.max(130, (el.text || 'Nova Raia').length * 8.5 + 32));
      shapesSvg.push(
        `<g${transformAttr}>` +
          `<rect x="${el.x}" y="${el.y - 28}" width="${headerW}" height="28" rx="6" fill="${stroke}" />` +
          `<text x="${el.x + 12}" y="${el.y - 10}" fill="#ffffff" font-family="Plus Jakarta Sans, system-ui, sans-serif" font-size="13" font-weight="700">${title}</text>` +
          `<rect x="${el.x}" y="${el.y}" width="${w}" height="${h}" rx="12" fill="${fill}" stroke="${stroke}" stroke-width="${el.strokeWidth || 2}" stroke-dasharray="8 5" />` +
        `</g>`
      );
      continue;
    }

    if (el.type === 'sticky' || el.type === 'checklist') {
      const w = el.width || 200;
      const h = el.height || 200;
      const fill = escapeXml(el.fill || '#fff9b1');
      const textCol = escapeXml(el.textColor || getContrastTextColor(el.fill || '#fff9b1'));
      const rawText =
        el.type === 'checklist'
          ? [
              el.checklistTitle || 'Checklist',
              ...(el.checklistItems || []).map((it) => `${it.completed ? '☑' : '☐'} ${it.text}`),
            ].join('\n')
          : el.text || '';
      const lines = rawText.split('\n').slice(0, 10);
      const fontSize = el.fontSize || 15;
      const textEls = lines
        .map(
          (line, idx) =>
            `<tspan x="${el.x + 16}" dy="${idx === 0 ? 0 : Math.round(fontSize * 1.35)}">${escapeXml(line)}</tspan>`
        )
        .join('');
      shapesSvg.push(
        `<g${transformAttr}${opacityAttr}>` +
          `<rect x="${el.x}" y="${el.y}" width="${w}" height="${h}" rx="10" fill="${fill}" stroke="rgba(0,0,0,0.12)" stroke-width="1" />` +
          (rawText
            ? `<text x="${el.x + 16}" y="${el.y + 30}" fill="${textCol}" font-family="Plus Jakarta Sans, system-ui, sans-serif" font-size="${fontSize}">${textEls}</text>`
            : '') +
        `</g>`
      );
      continue;
    }

    if (el.type === 'circle') {
      const r = el.radius || (el.width ? el.width / 2 : 60);
      const fill = el.fill && el.fill !== 'transparent' ? escapeXml(el.fill) : 'none';
      const stroke = escapeXml(el.stroke || defaultFg);
      shapesSvg.push(
        `<g${transformAttr}${opacityAttr}>` +
          `<circle cx="${el.x}" cy="${el.y}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${el.strokeWidth || 2}"${dashAttr} />` +
          (el.text
            ? `<text x="${el.x}" y="${el.y + 5}" text-anchor="middle" fill="${escapeXml(el.textColor || defaultFg)}" font-family="Plus Jakarta Sans, system-ui, sans-serif" font-size="${el.fontSize || 15}">${escapeXml(el.text)}</text>`
            : '') +
        `</g>`
      );
      continue;
    }

    if ((el.type === 'arrow' || el.type === 'line' || el.type === 'pen') && el.points && el.points.length >= 4) {
      const stroke = escapeXml(el.stroke || defaultFg);
      const sw = el.strokeWidth || 3;
      const pts: string[] = [];
      for (let i = 0; i < el.points.length - 1; i += 2) {
        pts.push(`${Math.round(el.x + el.points[i])},${Math.round(el.y + el.points[i + 1])}`);
      }
      const markerEnd = el.type === 'arrow' && el.endArrowhead !== 'none' ? ' marker-end="url(#mirio-arrow)"' : '';
      const markerStart = el.type === 'arrow' && el.startArrowhead === 'arrow' ? ' marker-start="url(#mirio-arrow-start)"' : '';
      const midIdx = Math.floor(el.points.length / 4) * 2;
      const midX = el.x + (el.points[midIdx] || 0);
      const midY = el.y + (el.points[midIdx + 1] || 0);
      shapesSvg.push(
        `<g${transformAttr}${opacityAttr}>` +
          `<polyline points="${pts.join(' ')}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"${dashAttr}${markerStart}${markerEnd} />` +
          (el.text && (el.type === 'arrow' || el.type === 'line')
            ? `<rect x="${midX - (el.text.length * 4 + 10)}" y="${midY - 12}" width="${el.text.length * 8 + 20}" height="22" rx="6" fill="${bgColor}" stroke="${stroke}" stroke-width="1.2" />` +
              `<text x="${midX}" y="${midY + 3}" text-anchor="middle" fill="${defaultFg}" font-family="Plus Jakarta Sans, system-ui, sans-serif" font-size="12" font-weight="600">${escapeXml(el.text)}</text>`
            : '') +
        `</g>`
      );
      continue;
    }

    if (el.type === 'text') {
      const fontSize = el.fontSize || 20;
      const fill = escapeXml(el.textColor || el.fill || defaultFg);
      const lines = (el.text || '').split('\n');
      const tspans = lines
        .map(
          (l, idx) =>
            `<tspan x="${el.x}" dy="${idx === 0 ? 0 : Math.round(fontSize * 1.3)}">${escapeXml(l)}</tspan>`
        )
        .join('');
      shapesSvg.push(
        `<text x="${el.x}" y="${el.y + fontSize}" fill="${fill}" font-family="Plus Jakarta Sans, system-ui, sans-serif" font-size="${fontSize}" font-weight="${el.fontWeight || 'normal'}" font-style="${el.fontStyle || 'normal'}"${transformAttr}${opacityAttr}>${tspans}</text>`
      );
      continue;
    }

    if ((el.type === 'sticker' || el.type === 'gif') && el.src) {
      const w = el.width || 120;
      const h = el.height || 120;
      shapesSvg.push(
        `<image href="${escapeXml(el.src)}" x="${el.x}" y="${el.y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"${transformAttr}${opacityAttr} />`
      );
      continue;
    }

    // Formas geométricas padrão (rect, diamond, triangle, star, hexagon, cylinder)
    const w = el.width || 140;
    const h = el.height || 100;
    const fill = el.fill && el.fill !== 'transparent' ? escapeXml(el.fill) : 'none';
    const stroke = escapeXml(el.stroke || defaultFg);
    shapesSvg.push(
      `<g${transformAttr}${opacityAttr}>` +
        `<rect x="${el.x}" y="${el.y}" width="${w}" height="${h}" rx="8" fill="${fill}" stroke="${stroke}" stroke-width="${el.strokeWidth || 2}"${dashAttr} />` +
        (el.text
          ? `<text x="${el.x + w / 2}" y="${el.y + h / 2 + 5}" text-anchor="middle" fill="${escapeXml(el.textColor || defaultFg)}" font-family="Plus Jakarta Sans, system-ui, sans-serif" font-size="${el.fontSize || 15}">${escapeXml(el.text)}</text>`
          : '') +
      `</g>`
    );
  }

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}" width="${bbox.width}" height="${bbox.height}">\n` +
    `  <title>${escapeXml(boardTitle || 'Mirio Whiteboard')}</title>\n` +
    `  <defs>\n` +
    `    <marker id="mirio-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">\n` +
    `      <path d="M 0 1 L 10 5 L 0 9 z" fill="context-stroke" />\n` +
    `    </marker>\n` +
    `    <marker id="mirio-arrow-start" viewBox="0 0 10 10" refX="2" refY="5" markerWidth="6" markerHeight="6" orient="auto">\n` +
    `      <path d="M 10 1 L 0 5 L 10 9 z" fill="context-stroke" />\n` +
    `    </marker>\n` +
    `  </defs>\n` +
    `  <rect x="${bbox.x}" y="${bbox.y}" width="${bbox.width}" height="${bbox.height}" fill="${bgColor}" />\n` +
    `  ${shapesSvg.join('\n  ')}\n` +
    `</svg>`
  );
}

export interface PdfSlideImage {
  jpegBytes: Uint8Array;
  pixelWidth: number;
  pixelHeight: number;
  pageWidthPt: number;
  pageHeightPt: number;
  title?: string;
}

/**
 * Monta um arquivo PDF 1.4 multipágina válido em binário puro (zero dependências externas pesadas)
 * a partir de uma lista de imagens JPEG (ex.: cada Moldura / Slide do quadro ou o quadro inteiro).
 */
export function buildMultiPagePdfFromJpegs(slides: ReadonlyArray<PdfSlideImage>): Uint8Array {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  let byteOffset = 0;

  const pushStr = (str: string) => {
    const bytes = encoder.encode(str);
    chunks.push(bytes);
    byteOffset += bytes.length;
  };
  const pushBytes = (bytes: Uint8Array) => {
    chunks.push(bytes);
    byteOffset += bytes.length;
  };

  // Objetos PDF:
  // 1 = Catalog
  // 2 = Pages
  // Para cada slide i (0..N-1):
  //   pageObj = 3 + i * 3
  //   contentObj = 4 + i * 3
  //   imageObj = 5 + i * 3
  const totalObjects = 2 + slides.length * 3;
  const offsets: number[] = new Array(totalObjects + 1).fill(0);

  pushStr('%PDF-1.4\n%\xFF\xFF\xFF\xFF\n');

  // 1: Catalog
  offsets[1] = byteOffset;
  pushStr('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  // 2: Pages
  const kidsRefs = slides.map((_, i) => `${3 + i * 3} 0 R`).join(' ');
  offsets[2] = byteOffset;
  pushStr(`2 0 obj\n<< /Type /Pages /Count ${slides.length} /Kids [ ${kidsRefs} ] >>\nendobj\n`);

  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    const pageObjId = 3 + i * 3;
    const contentObjId = 4 + i * 3;
    const imageObjId = 5 + i * 3;

    const wPt = Math.max(200, Math.round(slide.pageWidthPt));
    const hPt = Math.max(150, Math.round(slide.pageHeightPt));
    const drawCmd = `q\n${wPt} 0 0 ${hPt} 0 0 cm\n/Im${i} Do\nQ\n`;
    const drawBytes = encoder.encode(drawCmd);

    // Page object
    offsets[pageObjId] = byteOffset;
    pushStr(
      `${pageObjId} 0 obj\n` +
        `<< /Type /Page /Parent 2 0 R /MediaBox [ 0 0 ${wPt} ${hPt} ] ` +
        `/Resources << /XObject << /Im${i} ${imageObjId} 0 R >> >> ` +
        `/Contents ${contentObjId} 0 R >>\n` +
        `endobj\n`
    );

    // Content stream object
    offsets[contentObjId] = byteOffset;
    pushStr(`${contentObjId} 0 obj\n<< /Length ${drawBytes.length} >>\nstream\n`);
    pushBytes(drawBytes);
    pushStr('\nendstream\nendobj\n');

    // Image XObject (DCTDecode = JPEG nativo do PDF)
    offsets[imageObjId] = byteOffset;
    pushStr(
      `${imageObjId} 0 obj\n` +
        `<< /Type /XObject /Subtype /Image /Width ${slide.pixelWidth} /Height ${slide.pixelHeight} ` +
        `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${slide.jpegBytes.length} >>\n` +
        `stream\n`
    );
    pushBytes(slide.jpegBytes);
    pushStr('\nendstream\nendobj\n');
  }

  // Xref table
  const xrefStart = byteOffset;
  pushStr(`xref\n0 ${totalObjects + 1}\n`);
  pushStr('0000000000 65535 f \n');
  for (let id = 1; id <= totalObjects; id++) {
    pushStr(`${String(offsets[id]).padStart(10, '0')} 00000 n \n`);
  }

  pushStr(
    `trailer\n<< /Size ${totalObjects + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`
  );

  const output = new Uint8Array(byteOffset);
  let cursor = 0;
  for (const chunk of chunks) {
    output.set(chunk, cursor);
    cursor += chunk.length;
  }
  return output;
}

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const commaIdx = dataUrl.indexOf(',');
  const base64 = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Exporta o quadro em PDF multipágina:
 * - Se existirem Molduras (Frames), cada Moldura vira uma página ordenada espacialmente (modo Slides).
 * - Caso não existam Molduras, exporta o quadro inteiro em uma única página panorâmica.
 */
export function exportBoardOrFramesToPdfBytes(
  stage: Konva.Stage,
  elements: ReadonlyArray<CanvasElement>,
  isDarkTheme: boolean
): Uint8Array | null {
  if (typeof document === 'undefined') return null;

  const frames = sortFramesSpatially(elements.filter((el) => el.type === 'frame'));
  const regions: Array<{ x: number; y: number; width: number; height: number; title?: string }> =
    frames.length > 0
      ? frames.map((f, idx) => ({
          x: f.x,
          y: f.y,
          width: Math.max(200, f.width || 800),
          height: Math.max(150, f.height || 520),
          title: f.text || `Slide ${idx + 1}`,
        }))
      : (() => {
          const bbox = computeBoardWorldBoundingBox(elements, 64);
          return bbox ? [bbox] : [];
        })();

  if (regions.length === 0) return null;

  const prevScaleX = stage.scaleX();
  const prevScaleY = stage.scaleY();
  const prevX = stage.x();
  const prevY = stage.y();

  const transformers = stage.find('Transformer');
  const prevVis = transformers.map((t) => t.visible());

  try {
    transformers.forEach((t) => t.visible(false));
    stage.scale({ x: 1, y: 1 });
    stage.position({ x: 0, y: 0 });
    stage.batchDraw();

    const slides: PdfSlideImage[] = [];

    for (const region of regions) {
      const maxLongestPx = 2200;
      const longest = Math.max(region.width, region.height);
      const pixelRatio = Math.min(2, Math.max(0.5, maxLongestPx / longest));

      const rawCanvas = stage.toCanvas({
        x: region.x,
        y: region.y,
        width: region.width,
        height: region.height,
        pixelRatio,
      });

      const outCanvas = document.createElement('canvas');
      outCanvas.width = rawCanvas.width;
      outCanvas.height = rawCanvas.height;
      const ctx = outCanvas.getContext('2d');
      if (!ctx) continue;

      ctx.fillStyle = isDarkTheme ? '#09090b' : '#f8fafc';
      ctx.fillRect(0, 0, outCanvas.width, outCanvas.height);
      ctx.drawImage(rawCanvas, 0, 0);

      const jpegDataUrl = outCanvas.toDataURL('image/jpeg', 0.9);
      const jpegBytes = dataUrlToUint8Array(jpegDataUrl);

      // Escala proporcional para caber confortavelmente em largura ~842pt (A4 Paisagem / 16:9)
      const targetWidthPt = 842;
      const targetHeightPt = Math.max(240, Math.round((region.height / region.width) * targetWidthPt));

      slides.push({
        jpegBytes,
        pixelWidth: outCanvas.width,
        pixelHeight: outCanvas.height,
        pageWidthPt: targetWidthPt,
        pageHeightPt: targetHeightPt,
        title: region.title,
      });
    }

    if (slides.length === 0) return null;
    return buildMultiPagePdfFromJpegs(slides);
  } finally {
    stage.scale({ x: prevScaleX, y: prevScaleY });
    stage.position({ x: prevX, y: prevY });
    transformers.forEach((t, idx) => t.visible(prevVis[idx]));
    stage.batchDraw();
  }
}
