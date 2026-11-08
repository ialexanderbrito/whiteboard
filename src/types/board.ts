export type BoardPermission = 'edit' | 'comment' | 'view' | 'none';

export interface BoardCollaborator {
  email: string;
  role: BoardPermission;
  addedAt: number;
}

export interface BoardMember {
  uid: string;
  name: string;
  email?: string | null;
  photoURL?: string | null;
  role?: BoardPermission;
  joinedAt: number;
  lastSeen?: number;
  isAnonymous?: boolean;
  color?: string;
}

export interface Board {
  id: string;
  title: string;
  ownerId: string;
  ownerName: string;
  createdAt: number;
  updatedAt: number;
  defaultPermission?: BoardPermission;
  collaborators?: Record<string, BoardCollaborator>;
  collaboratorEmails?: string[];
  members?: Record<string, BoardMember>;
  isPasswordProtected?: boolean;
  password?: string;
}

export interface UserPresence {
  userId: string;
  name: string;
  color: string;
  photoURL?: string | null;
  isAnonymous?: boolean;
  cursor: {
    x: number;
    y: number;
  } | null;
  message?: string | null;
  messageTimestamp?: number | null;
  lastClickTimestamp?: number | null;
  activeTool?: string | null;
  laser?: {
    isDrawing: boolean;
    points?: Array<[number, number]>;
    timestamp: number;
  } | null;
  selectedElementId: string | null;
  lastSeen: number;
  reaction?: {
    id: string;
    emoji: string;
    userName?: string;
    timestamp: number;
    originX?: number;
    originY?: number;
  } | null;
}

export interface CurrentUser {
  uid: string;
  displayName: string;
  email: string | null;
  photoURL: string | null;
  isAnonymous: boolean;
  color: string;
}
