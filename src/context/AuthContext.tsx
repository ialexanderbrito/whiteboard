import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  signInWithPopup, 
  signInAnonymously, 
  updateProfile, 
  signOut, 
  onAuthStateChanged,
  type User as FirebaseUser
} from 'firebase/auth';
import { auth, googleProvider, isFirebaseConfigured } from '../config/firebase';
import type { CurrentUser } from '../types/board';
import { getRandomUserColor } from '../utils/colors';

interface AuthContextType {
  currentUser: CurrentUser | null;
  loading: boolean;
  isConfigured: boolean;
  signInWithGoogle: () => Promise<void>;
  signInAsGuest: (name: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const COLOR_STORAGE_KEY = 'mirio_user_color';
const GUEST_STORAGE_KEY = 'mirio_guest_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  const getSavedColor = () => {
    let color = localStorage.getItem(COLOR_STORAGE_KEY);
    if (!color) {
      color = getRandomUserColor();
      localStorage.setItem(COLOR_STORAGE_KEY, color);
    }
    return color;
  };

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      // Modo Mock Local / Preview se o Firebase não estiver preenchido no .env
      const savedGuest = localStorage.getItem(GUEST_STORAGE_KEY);
      if (savedGuest) {
        try {
          const parsed = JSON.parse(savedGuest);
          setCurrentUser(parsed);
        } catch {
          setCurrentUser(null);
        }
      }
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user: FirebaseUser | null) => {
      if (user) {
        const color = getSavedColor();
        setCurrentUser({
          uid: user.uid,
          displayName: user.displayName || (user.isAnonymous ? 'Convidado' : 'Usuário'),
          email: user.email,
          photoURL: user.photoURL,
          isAnonymous: user.isAnonymous,
          color,
        });
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    if (!isFirebaseConfigured || !auth || !googleProvider) {
      throw new Error('Firebase não está configurado no arquivo .env.');
    }
    await signInWithPopup(auth, googleProvider);
  };

  const signInAsGuest = async (name: string) => {
    const trimmedName = name.trim() || 'Convidado';
    const color = getSavedColor();

    if (!isFirebaseConfigured || !auth) {
      // Mock local
      const guestUser: CurrentUser = {
        uid: 'guest_' + Math.random().toString(36).substring(2, 9),
        displayName: trimmedName,
        email: null,
        photoURL: null,
        isAnonymous: true,
        color,
      };
      localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(guestUser));
      setCurrentUser(guestUser);
      return;
    }

    const userCredential = await signInAnonymously(auth);
    await updateProfile(userCredential.user, {
      displayName: trimmedName,
    });

    setCurrentUser({
      uid: userCredential.user.uid,
      displayName: trimmedName,
      email: null,
      photoURL: null,
      isAnonymous: true,
      color,
    });
  };

  const logout = async () => {
    if (!isFirebaseConfigured || !auth) {
      localStorage.removeItem(GUEST_STORAGE_KEY);
      setCurrentUser(null);
      return;
    }
    await signOut(auth);
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loading,
        isConfigured: isFirebaseConfigured,
        signInWithGoogle,
        signInAsGuest,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};
