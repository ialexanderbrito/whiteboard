/**
 * Utilitários de GIF (normalização de URLs para canvas e stickers/GIFs animados)
 */

// Normaliza links de GIF (URLs diretas Klipy CDN, Giphy ou links externos)
export const cleanGifUrl = (src?: string): string => {
  if (!src) return '';
  const match = src.match(/giphy\.com\/media\/(?:v1\.[^/]+\/)?([^/]+)/);
  if (match && match[1]) {
    const giphyId = match[1];
    return `https://i.giphy.com/media/${giphyId}/giphy.gif`;
  }
  return src;
};
