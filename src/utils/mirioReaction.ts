import mirioOriginalUrl from '../assets/mirio_original.png';
import ditadorOriginalUrl from '../assets/ditador_original.png';
import brigadeiroOriginalUrl from '../assets/brigadeiro_original.png';

export const MIRIO_REACTION = 'mirio_original';
export const MIRIO_REACTION_UNLOCK_KEY = 'mirio_original_reaction_unlocked';

export const DITADOR_REACTION = 'ditador_original';
export const DITADOR_REACTION_UNLOCK_KEY = 'ditador_original_reaction_unlocked';

export const BRIGADEIRO_REACTION = 'brigadeiro_original';
export const BRIGADEIRO_REACTION_UNLOCK_KEY = 'brigadeiro_original_reaction_unlocked';

let cachedReactionImage: HTMLImageElement | null = null;
let reactionImagePromise: Promise<HTMLImageElement | null> | null = null;

let cachedDitadorReactionImage: HTMLImageElement | null = null;
let ditadorReactionImagePromise: Promise<HTMLImageElement | null> | null = null;

let cachedBrigadeiroReactionImage: HTMLImageElement | null = null;
let brigadeiroReactionImagePromise: Promise<HTMLImageElement | null> | null = null;

export const isMirioReaction = (reaction: string): boolean =>
  reaction === 'mirio_original' || reaction === '__mirio_original__' || reaction === ':mirio_original:';

export const isDitadorReaction = (reaction: string): boolean =>
  reaction === 'ditador_original' || reaction === '__ditador_original__' || reaction === ':ditador_original:';

export const isBrigadeiroReaction = (reaction: string): boolean =>
  reaction === 'brigadeiro_original' ||
  reaction === '__brigadeiro_original__' ||
  reaction === ':brigadeiro_original:' ||
  reaction === 'brisadeiro_original' ||
  reaction === '__brisadeiro_original__' ||
  reaction === ':brisadeiro_original:' ||
  reaction === 'brigadeiro' ||
  reaction === 'brisadeiro';

export const isCustomReaction = (reaction: string): boolean =>
  isMirioReaction(reaction) || isDitadorReaction(reaction) || isBrigadeiroReaction(reaction);

export const getReactionImageUrl = (reaction: string): string | null => {
  if (isMirioReaction(reaction)) return mirioOriginalUrl;
  if (isDitadorReaction(reaction)) return ditadorOriginalUrl;
  if (isBrigadeiroReaction(reaction)) return brigadeiroOriginalUrl;
  return null;
};

export const getCachedMirioReactionImage = (): HTMLImageElement | null => cachedReactionImage;
export const getCachedDitadorReactionImage = (): HTMLImageElement | null => cachedDitadorReactionImage;
export const getCachedBrigadeiroReactionImage = (): HTMLImageElement | null => cachedBrigadeiroReactionImage;

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

export const loadDitadorReactionImage = (): Promise<HTMLImageElement | null> => {
  if (cachedDitadorReactionImage) return Promise.resolve(cachedDitadorReactionImage);
  if (ditadorReactionImagePromise) return ditadorReactionImagePromise;

  if (typeof window === 'undefined') return Promise.resolve(null);

  ditadorReactionImagePromise = new Promise((resolve) => {
    const image = new window.Image();
    image.onload = () => {
      cachedDitadorReactionImage = image;
      resolve(image);
    };
    image.onerror = () => {
      ditadorReactionImagePromise = null;
      resolve(null);
    };
    image.src = ditadorOriginalUrl;
  });

  return ditadorReactionImagePromise;
};

export const loadBrigadeiroReactionImage = (): Promise<HTMLImageElement | null> => {
  if (cachedBrigadeiroReactionImage) return Promise.resolve(cachedBrigadeiroReactionImage);
  if (brigadeiroReactionImagePromise) return brigadeiroReactionImagePromise;

  if (typeof window === 'undefined') return Promise.resolve(null);

  brigadeiroReactionImagePromise = new Promise((resolve) => {
    const image = new window.Image();
    image.onload = () => {
      cachedBrigadeiroReactionImage = image;
      resolve(image);
    };
    image.onerror = () => {
      brigadeiroReactionImagePromise = null;
      resolve(null);
    };
    image.src = brigadeiroOriginalUrl;
  });

  return brigadeiroReactionImagePromise;
};

// Pré-carrega no navegador para que as imagens especiais estejam imediatamente em cache para canvas e overlays
if (typeof window !== 'undefined') {
  void loadMirioReactionImage();
  void loadDitadorReactionImage();
  void loadBrigadeiroReactionImage();
}

export const isMirioReactionUnlocked = (): boolean =>
  typeof window !== 'undefined' && window.localStorage.getItem(MIRIO_REACTION_UNLOCK_KEY) === 'true';

export const unlockMirioReaction = (): void => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(MIRIO_REACTION_UNLOCK_KEY, 'true');
  window.dispatchEvent(new CustomEvent('mirio-reaction-unlocked'));
};

export const isDitadorReactionUnlocked = (): boolean =>
  typeof window !== 'undefined' && window.localStorage.getItem(DITADOR_REACTION_UNLOCK_KEY) === 'true';

export const unlockDitadorReaction = (): void => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(DITADOR_REACTION_UNLOCK_KEY, 'true');
  window.dispatchEvent(new CustomEvent('ditador-reaction-unlocked'));
};

export const isBrigadeiroReactionUnlocked = (): boolean =>
  typeof window !== 'undefined' && window.localStorage.getItem(BRIGADEIRO_REACTION_UNLOCK_KEY) === 'true';

export const unlockBrigadeiroReaction = (): void => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(BRIGADEIRO_REACTION_UNLOCK_KEY, 'true');
  window.dispatchEvent(new CustomEvent('brigadeiro-reaction-unlocked'));
};
