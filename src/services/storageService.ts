import { ref as storageRef, uploadBytes, uploadString, getDownloadURL } from 'firebase/storage';
import { storage, isStorageConfigured } from '../config/firebase';
import { registerCloudImageUploader } from '../utils/imageUpload';

let activeBoardIdForUploads = 'shared';

export function setActiveStorageBoardId(boardId: string): void {
  activeBoardIdForUploads = (boardId || 'shared').replace(/[^a-zA-Z0-9_-]/g, '') || 'shared';
}

// Conecta automaticamente o pipeline global de upload de imagens (StickersModal, Paste e Drag&Drop) ao Object Storage
registerCloudImageUploader(async (dataUrlOrBlob, mimeType) => {
  if (!isStorageConfigured || !storage) return null;

  const ext = mimeType.includes('webp') ? 'webp' : mimeType.includes('png') ? 'png' : 'jpg';
  const objectPath = `boards/${activeBoardIdForUploads}/images/${Date.now()}_${Math.random()
    .toString(36)
    .substring(2, 9)}.${ext}`;
  const fileRef = storageRef(storage, objectPath);

  const task = (async () => {
    if (typeof dataUrlOrBlob === 'string' && dataUrlOrBlob.startsWith('data:')) {
      await uploadString(fileRef, dataUrlOrBlob, 'data_url', {
        cacheControl: 'public,max-age=31536000,immutable',
      });
    } else if (dataUrlOrBlob instanceof Blob) {
      await uploadBytes(fileRef, dataUrlOrBlob, {
        contentType: mimeType,
        cacheControl: 'public,max-age=31536000,immutable',
      });
    } else {
      return null;
    }
    return getDownloadURL(fileRef);
  })();

  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000));
  return Promise.race([task, timeout]);
});

export interface ProcessedBoardImage {
  src: string;
  width: number;
  height: number;
  uploadedToCloud: boolean;
}

/**
 * Redimensiona e comprime um arquivo de imagem (ou Blob colado da área de transferência)
 * para WebP leve e faz upload direto ao Object Storage (Firebase Storage),
 * retornando uma URL HTTPS enxuta (~150 bytes) em vez de salvar centenas de KB de Base64 dentro do Firestore.
 * Caso o Storage não esteja habilitado ou o usuário esteja offline, faz fallback seguro para DataURL comprimida.
 */
export async function uploadOrCompressBoardImage(
  file: File | Blob,
  boardId: string,
  options?: { maxDimension?: number; maxDisplaySize?: number; quality?: number }
): Promise<ProcessedBoardImage> {
  const maxDimension = options?.maxDimension ?? 1600;
  const maxDisplaySize = options?.maxDisplaySize ?? 360;
  const quality = options?.quality ?? 0.84;

  const { blob, dataUrl, naturalWidth, naturalHeight } = await compressImageToWebpOrJpeg(
    file,
    maxDimension,
    quality
  );

  let displayW = naturalWidth;
  let displayH = naturalHeight;
  if (displayW > maxDisplaySize || displayH > maxDisplaySize) {
    if (displayW >= displayH) {
      displayH = Math.round((displayH * maxDisplaySize) / displayW);
      displayW = maxDisplaySize;
    } else {
      displayW = Math.round((displayW * maxDisplaySize) / displayH);
      displayH = maxDisplaySize;
    }
  }
  displayW = Math.max(60, displayW);
  displayH = Math.max(60, displayH);

  // Tenta enviar binário ao Object Storage (Firebase Storage) com timeout curto para nunca travar a UI
  if (isStorageConfigured && storage && blob) {
    try {
      const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
      const safeBoardId = (boardId || 'local').replace(/[^a-zA-Z0-9_-]/g, '');
      const objectPath = `boards/${safeBoardId}/images/${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 9)}.${ext}`;
      const fileRef = storageRef(storage, objectPath);

      const uploadPromise = (async () => {
        await uploadBytes(fileRef, blob, {
          contentType: blob.type,
          cacheControl: 'public,max-age=31536000,immutable',
        });
        return getDownloadURL(fileRef);
      })();

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Storage upload timeout')), 4500)
      );

      const publicUrl = await Promise.race([uploadPromise, timeoutPromise]);
      if (publicUrl) {
        return {
          src: publicUrl,
          width: displayW,
          height: displayH,
          uploadedToCloud: true,
        };
      }
    } catch {
      // Fallback transparente para DataURL comprimida (< 450KB) quando bucket não está provisionado ou offline
    }
  }

  return {
    src: dataUrl,
    width: displayW,
    height: displayH,
    uploadedToCloud: false,
  };
}

function compressImageToWebpOrJpeg(
  file: File | Blob,
  maxDim: number,
  initialQuality: number
): Promise<{
  blob: Blob | null;
  dataUrl: string;
  naturalWidth: number;
  naturalHeight: number;
}> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let w = img.naturalWidth || img.width || 300;
      let h = img.naturalHeight || img.height || 300;

      if (w > maxDim || h > maxDim) {
        if (w >= h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, w);
      canvas.height = Math.max(1, h);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas 2D indisponível'));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Prefere WebP (menor tamanho com transparência alfa preservada!)
      let mime = 'image/webp';
      let dataUrl = canvas.toDataURL(mime, initialQuality);
      if (!dataUrl.startsWith('data:image/webp')) {
        mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        dataUrl = canvas.toDataURL(mime, initialQuality);
      }

      // Garante teto seguro caso faça fallback para Firestore (< 580 KB Base64)
      let q = initialQuality;
      while (dataUrl.length > 580_000 && q > 0.35) {
        q -= 0.14;
        dataUrl = canvas.toDataURL('image/jpeg', q);
        mime = 'image/jpeg';
      }

      canvas.toBlob(
        (blob) => {
          resolve({
            blob,
            dataUrl,
            naturalWidth: canvas.width,
            naturalHeight: canvas.height,
          });
        },
        mime,
        q
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Falha ao decodificar imagem'));
    };
    img.src = objectUrl;
  });
}
