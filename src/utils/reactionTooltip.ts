import { getAppleEmojiUrl } from './appleEmoji.ts';

export interface ReactionHoverAnchor {
  x: number;
  y: number;
  topY: number;
}

export interface ReactionBadgeHoverData {
  elementId: string;
  emoji: string;
  users: string[];
  anchor: ReactionHoverAnchor;
}

type ReactionTooltipListener = (data: ReactionBadgeHoverData | null) => void;

const listeners = new Set<ReactionTooltipListener>();
let currentTooltipData: ReactionBadgeHoverData | null = null;

export function getActiveReactionTooltip(): ReactionBadgeHoverData | null {
  return currentTooltipData;
}

export function publishReactionTooltip(data: ReactionBadgeHoverData | null): void {
  currentTooltipData = data;
  listeners.forEach((listener) => {
    try {
      listener(data);
    } catch {
      // Ignora falhas em listeners individuais
    }
  });
}

export function subscribeReactionTooltip(listener: ReactionTooltipListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const isMirioReaction = (reaction: string): boolean =>
  reaction === 'mirio_original' || reaction === '__mirio_original__' || reaction === ':mirio_original:';

export interface FormattedVotersResult {
  names: string[];
  verb: 'reagiu com' | 'reagiram com';
  emoji: string;
  isMirio: boolean;
  appleEmojiUrl: string;
}

/**
 * Formata os participantes de uma reação em texto natural e elegante estilo Slack/GitHub.
 * Ex: "Você", "Mariana e Pedro", "Você, Carlos e Julia" + "reagiu com" / "reagiram com".
 */
export function formatReactionVotersText(
  userIds: string[],
  currentUserId: string | undefined,
  resolveUserName: (userId: string) => string,
  emoji: string
): FormattedVotersResult | null {
  if (!userIds || userIds.length === 0) return null;

  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  if (uniqueIds.length === 0) return null;

  const hasCurrentUser = Boolean(currentUserId && uniqueIds.includes(currentUserId));

  // Prioriza "Você" no início da lista de participantes
  const orderedIds = hasCurrentUser
    ? [currentUserId!, ...uniqueIds.filter((id) => id !== currentUserId)]
    : uniqueIds;

  const names = orderedIds.map((id) => {
    if (id === currentUserId) return 'Você';
    return resolveUserName(id) || 'Participante';
  });

  const verb = names.length === 1 ? 'reagiu com' : 'reagiram com';
  const isMirio = isMirioReaction(emoji);
  const appleEmojiUrl = getAppleEmojiUrl(emoji);

  return {
    names,
    verb,
    emoji,
    isMirio,
    appleEmojiUrl,
  };
}
