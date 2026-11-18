import type { NormalizedImageCrop } from '../types/element.ts';

export const FULL_IMAGE_CROP: NormalizedImageCrop = {
  x: 0,
  y: 0,
  width: 1,
  height: 1,
};

/**
 * Garante que um retângulo de recorte normalizado [0..1] permaneça estritamente dentro dos limites da imagem
 * e tenha área mínima válida.
 */
export function clampNormalizedCrop(crop: NormalizedImageCrop): NormalizedImageCrop {
  const minFrac = 0.08;
  const width = Math.max(minFrac, Math.min(1, Number.isFinite(crop.width) ? crop.width : 1));
  const height = Math.max(minFrac, Math.min(1, Number.isFinite(crop.height) ? crop.height : 1));
  const x = Math.max(0, Math.min(1 - width, Number.isFinite(crop.x) ? crop.x : 0));
  const y = Math.max(0, Math.min(1 - height, Number.isFinite(crop.y) ? crop.y : 0));

  return {
    x: Math.round(x * 10000) / 10000,
    y: Math.round(y * 10000) / 10000,
    width: Math.round(width * 10000) / 10000,
    height: Math.round(height * 10000) / 10000,
  };
}

export function isDefaultFullCrop(crop?: NormalizedImageCrop | null): boolean {
  if (!crop) return true;
  return (
    Math.abs(crop.x) < 0.002 &&
    Math.abs(crop.y) < 0.002 &&
    Math.abs(crop.width - 1) < 0.002 &&
    Math.abs(crop.height - 1) < 0.002
  );
}

/**
 * Converte o recorte normalizado [0..1] para coordenadas em pixels naturais exigidas pelo Konva.Image.
 */
export function toKonvaPixelCrop(
  crop: NormalizedImageCrop | undefined,
  naturalWidth: number,
  naturalHeight: number
): { x: number; y: number; width: number; height: number } | undefined {
  if (!crop || isDefaultFullCrop(crop) || naturalWidth <= 0 || naturalHeight <= 0) {
    return undefined;
  }
  const safe = clampNormalizedCrop(crop);
  return {
    x: Math.round(safe.x * naturalWidth),
    y: Math.round(safe.y * naturalHeight),
    width: Math.max(1, Math.round(safe.width * naturalWidth)),
    height: Math.max(1, Math.round(safe.height * naturalHeight)),
  };
}

/**
 * Calcula um recorte centralizado para uma proporção desejada (ex.: 1 para 1:1, 16/9, 4/3).
 */
export function computeAspectPresetCrop(
  naturalWidth: number,
  naturalHeight: number,
  targetAspectRatio: number
): NormalizedImageCrop {
  if (naturalWidth <= 0 || naturalHeight <= 0 || !Number.isFinite(targetAspectRatio) || targetAspectRatio <= 0) {
    return { ...FULL_IMAGE_CROP };
  }

  const naturalRatio = naturalWidth / naturalHeight;
  if (naturalRatio > targetAspectRatio) {
    // Imagem mais larga que o alvo: recorta nas laterais
    const normW = targetAspectRatio / naturalRatio;
    return clampNormalizedCrop({
      x: (1 - normW) / 2,
      y: 0,
      width: normW,
      height: 1,
    });
  }

  // Imagem mais alta que o alvo: recorta em cima/baixo
  const normH = naturalRatio / targetAspectRatio;
  return clampNormalizedCrop({
    x: 0,
    y: (1 - normH) / 2,
    width: 1,
    height: normH,
  });
}
