export interface Board {
  id: string;
  title: string;
  ownerId: string;
  ownerName: string;
  createdAt: number;
  updatedAt: number;
}

export interface UserPresence {
  userId: string;
  name: string;
  color: string;
  cursor: {
    x: number;
    y: number;
  } | null;
  selectedElementId: string | null;
  lastSeen: number;
}

export interface CurrentUser {
  uid: string;
  displayName: string;
  email: string | null;
  photoURL: string | null;
  isAnonymous: boolean;
  color: string;
}
