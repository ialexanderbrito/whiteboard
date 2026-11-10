import mirioOriginalUrl from '../assets/mirio_original.png';

export const MIRIO_REACTION = 'mirio_original';
export const MIRIO_REACTION_UNLOCK_KEY = 'mirio_original_reaction_unlocked';

let cachedReactionImage: HTMLImageElement | null = null;
let reactionImagePromise: Promise<HTMLImageElement | null> | null = null;

export const isMirioReaction = (reaction: string): boolean =>
  reaction === 'mirio_original' || reaction === '__mirio_original__' || reaction === ':mirio_original:';

export const getReactionImageUrl = (reaction: string): string | null =>
  isMirioReaction(reaction) ? mirioOriginalUrl : null;

export const getCachedMirioReactionImage = (): HTMLImageElement | null => cachedReactionImage;

export const loadMirioReactionImage = (): Promise<HTMLImageElement | null> => {
  if (cachedReactionImage) return Promise.resolve(cachedReactionImage);
  if (reactionImagePromise) return reactionImagePromise;

  if (typeof window === 'undefined') return Promise.resolve(null);

  reactionImagePromise = new Promise((resolve) => {
    const image = new window.Image();
    image.onload = () => {
      cachedReactionImage = image;
      resolve(image);
    };
    image.onerror = () => {
      reactionImagePromise = null;
      resolve(null);
    };
    image.src = mirioOriginalUrl;
  });

  return reactionImagePromise;
};

// Pré-carrega no navegador para que a imagem do Mirio esteja imediatamente em cache para canvas e overlays
if (typeof window !== 'undefined') {
  void loadMirioReactionImage();
}

export const isMirioReactionUnlocked = (): boolean =>
  typeof window !== 'undefined' && window.localStorage.getItem(MIRIO_REACTION_UNLOCK_KEY) === 'true';

export const unlockMirioReaction = (): void => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(MIRIO_REACTION_UNLOCK_KEY, 'true');
  window.dispatchEvent(new CustomEvent('mirio-reaction-unlocked'));
};
