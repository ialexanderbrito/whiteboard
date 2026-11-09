import mirioOriginalUrl from '../assets/mirio_original.png';

export const MIRIO_REACTION = '__mirio_original__';
export const MIRIO_REACTION_UNLOCK_KEY = 'mirio_original_reaction_unlocked';

let cachedReactionImage: HTMLImageElement | null = null;
let reactionImagePromise: Promise<HTMLImageElement | null> | null = null;

export const isMirioReaction = (reaction: string): boolean => reaction === MIRIO_REACTION;

export const getReactionImageUrl = (reaction: string): string | null =>
  isMirioReaction(reaction) ? mirioOriginalUrl : null;

export const loadMirioReactionImage = (): Promise<HTMLImageElement | null> => {
  if (cachedReactionImage) return Promise.resolve(cachedReactionImage);
  if (reactionImagePromise) return reactionImagePromise;

  reactionImagePromise = new Promise((resolve) => {
    const image = new window.Image();
    image.onload = () => {
      cachedReactionImage = image;
      resolve(image);
    };
    image.onerror = () => resolve(null);
    image.src = mirioOriginalUrl;
  });

  return reactionImagePromise;
};

export const isMirioReactionUnlocked = (): boolean =>
  typeof window !== 'undefined' && window.localStorage.getItem(MIRIO_REACTION_UNLOCK_KEY) === 'true';

export const unlockMirioReaction = (): void => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(MIRIO_REACTION_UNLOCK_KEY, 'true');
  window.dispatchEvent(new CustomEvent('mirio-reaction-unlocked'));
};
