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
