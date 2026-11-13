/**
 * Utilitários de GIF (Klipy CDN / migração de links legados do Giphy)
 * Extraído de WhiteboardCanvas para uso compartilhado com StickerItem.
 */

const LEGACY_GIPHY_FALLBACKS: Record<string, string> = {
  GkVM3PcFipxEk: 'https://static.klipy.com/ii/4e7bea9f7a3371424e6c16ebc93252fe/46/6a/IGemk23TDHctPwlki1.gif',
  g01ZnwAUvutuK8GIQn: 'https://static.klipy.com/ii/d7aec6f6f171607374b2065c836f92f4/67/fc/eYsqvnbO.gif',
  vyTnNTrs3IZdfAUQVW: 'https://static.klipy.com/ii/d7aec6f6f171607374b2065c836f92f4/8c/39/FmFDzsho.gif',
  d3mlE7uhX8KFgEmY: 'https://static.klipy.com/ii/925f17378dd1893b674a723c07535afe/4d/6f/jVcYzyp9.gif',
  '9M5jK4GXmD5o1irGrF': 'https://static.klipy.com/ii/c3a19a0b747a76e98651f2b9a3cca5ff/49/f8/zl1Y5fjP.gif',
  MDJ9IbxxvDUQM: 'https://static.klipy.com/ii/c3a19a0b747a76e98651f2b9a3cca5ff/9c/63/z1XLwIWS.gif',
  t3dLl0TGHCxTG: 'https://static.klipy.com/ii/35ccce3d852f7995dd2da910f2abd795/ec/59/uGVtiiAZ.gif',
  nXxOjZrbnbRxS: 'https://static.klipy.com/ii/d6b0ce929193df3c242ac34b5654d2ce/35/88/KiVLVpaQ.gif',
  '26ufdipQqU2lhNA4g': 'https://static.klipy.com/ii/d6b0ce929193df3c242ac34b5654d2ce/9a/57/CCtgUPsD.gif',
  '3o7TKTDnU76u2EPNDG': 'https://static.klipy.com/ii/35ccce3d852f7995dd2da910f2abd795/32/bf/zFtdVhji.gif',
  nbvFVPiEiJH6Q: 'https://static.klipy.com/ii/f87f46a2c5aeaeed4c68910815f73eaf/08/b7/hK8oyGl2.gif',
  '10JhviFuU2gWD6': 'https://static.klipy.com/ii/d6b0ce929193df3c242ac34b5654d2ce/79/f2/VyNapEfQ.gif',
};

// Normaliza links de GIF (Klipy CDN direto ou migração automática de links antigos do Giphy)
export const cleanGifUrl = (src?: string): string => {
  if (!src) return '';
  const match = src.match(/giphy\.com\/media\/(?:v1\.[^/]+\/)?([^/]+)/);
  if (match && match[1]) {
    const giphyId = match[1];
    if (LEGACY_GIPHY_FALLBACKS[giphyId]) {
      return LEGACY_GIPHY_FALLBACKS[giphyId];
    }
    return `https://i.giphy.com/media/${giphyId}/giphy.gif`;
  }
  return src;
};
