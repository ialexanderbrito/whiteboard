/**
 * Converte um emoji unicode para a URL da imagem oficial estilo Apple (CDN jsdelivr emoji-datasource-apple)
 */
export function getAppleEmojiUrl(emoji: string): string {
  if (!emoji) return '';
  const codePoints: string[] = [];
  for (let i = 0; i < emoji.length; i++) {
    const codePoint = emoji.codePointAt(i);
    if (codePoint !== undefined) {
      if (codePoint > 0xffff) i++;
      // Ignora variation selector (fe0f) comum
      if (codePoint.toString(16).toLowerCase() !== 'fe0f') {
        codePoints.push(codePoint.toString(16).toLowerCase());
      }
    }
  }
  const unified = codePoints.join('-');
  return `https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/${unified}.png`;
}

// Cache global em memória para instâncias de HTMLImageElement de Apple Emojis
const emojiImgCache = new Map<string, HTMLImageElement>();
const pendingCallbacks = new Map<string, Array<(img: HTMLImageElement) => void>>();

export function getCachedAppleEmojiImage(emoji: string): HTMLImageElement | null {
  const url = getAppleEmojiUrl(emoji);
  if (!url) return null;
  return emojiImgCache.get(url) || null;
}

export function loadAppleEmojiImage(
  emoji: string,
  onLoaded?: (img: HTMLImageElement) => void
): HTMLImageElement | null {
  const url = getAppleEmojiUrl(emoji);
  if (!url) return null;

  if (emojiImgCache.has(url)) {
    return emojiImgCache.get(url)!;
  }

  if (typeof window === 'undefined') return null;

  if (onLoaded) {
    const list = pendingCallbacks.get(url) || [];
    list.push(onLoaded);
    pendingCallbacks.set(url, list);
  }

  if (!pendingCallbacks.has(url) || pendingCallbacks.get(url)!.length === 1) {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      emojiImgCache.set(url, img);
      const callbacks = pendingCallbacks.get(url) || [];
      pendingCallbacks.delete(url);
      callbacks.forEach((cb) => cb(img));
    };
    img.onerror = () => {
      // Fallback sem crossOrigin se houver bloqueio
      const fallback = new window.Image();
      fallback.onload = () => {
        emojiImgCache.set(url, fallback);
        const callbacks = pendingCallbacks.get(url) || [];
        pendingCallbacks.delete(url);
        callbacks.forEach((cb) => cb(fallback));
      };
      fallback.src = url;
    };
    img.src = url;
  }

  return null;
}
