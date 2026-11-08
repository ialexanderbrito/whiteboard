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
  updateGuestProfile: (name: string, color?: string) => Promise<void>;
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

  const updateGuestProfile = async (name: string, color?: string) => {
    if (!currentUser) return;

    const isGoogleAccount = !currentUser.isAnonymous;
    // Usuários com conta Google mantêm sempre o nome oficial da conta Google
    const effectiveName = isGoogleAccount ? currentUser.displayName : (name.trim() || currentUser.displayName);
    const userColor = color || currentUser.color || getSavedColor();

    if (color) {
      localStorage.setItem(COLOR_STORAGE_KEY, color);
    }

    if (!isFirebaseConfigured || !auth || !auth.currentUser) {
      // Mock local
      const updatedUser: CurrentUser = {
        ...currentUser,
        displayName: effectiveName,
        color: userColor,
      };
      localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(updatedUser));
      setCurrentUser(updatedUser);
      return;
    }

    // Apenas convidados anônimos podem atualizar o displayName no Firebase Auth
    if (!isGoogleAccount && effectiveName !== currentUser.displayName) {
      try {
        await updateProfile(auth.currentUser, {
          displayName: effectiveName,
        });
      } catch (err) {
        console.warn('Erro ao atualizar perfil no Firebase Auth:', err);
      }
    }

    setCurrentUser((prev) =>
      prev
        ? {
            ...prev,
            displayName: effectiveName,
            color: userColor,
          }
        : null
    );
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
        updateGuestProfile,
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
