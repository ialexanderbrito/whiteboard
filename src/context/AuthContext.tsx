/* oxlint-disable react/only-export-components */
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { 
  signInWithPopup, 
  signInWithRedirect,
  linkWithPopup,
  getRedirectResult,
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
  signInWithGoogle: (forceRedirect?: boolean) => Promise<void>;
  signInAsGuest: (name: string) => Promise<void>;
  updateGuestProfile: (name: string, color?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const COLOR_STORAGE_KEY = 'mirio_user_color';
const GUEST_STORAGE_KEY = 'mirio_guest_user';
const GUEST_UID_ARCHIVE_KEY = 'mirio_guest_uid_archive';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pendingGuestNameRef = useRef<string | null>(null);

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(() => {
    if (!isFirebaseConfigured || !auth) {
      if (typeof window === 'undefined') return null;
      const savedGuest = localStorage.getItem(GUEST_STORAGE_KEY);
      if (savedGuest) {
        try {
          return JSON.parse(savedGuest);
        } catch {
          return null;
        }
      }
    }
    return null;
  });
  const [loading, setLoading] = useState(() => Boolean(isFirebaseConfigured && auth));

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
      return;
    }

    let isMounted = true;
    let unsubscribe: (() => void) | null = null;

    // Processa primeiro qualquer retorno de redirecionamento (signInWithRedirect)
    // Mantém loading=true até getRedirectResult concluir para nunca exibir a tela de login indevidamente
    getRedirectResult(auth)
      .then((result) => {
        if (!isMounted) return;
        if (result?.user) {
          const color = getSavedColor();
          setCurrentUser({
            uid: result.user.uid,
            displayName: result.user.displayName || 'Usuário',
            email: result.user.email,
            photoURL: result.user.photoURL,
            isAnonymous: result.user.isAnonymous,
            color,
          });
        }
      })
      .catch((error) => {
        console.warn('Erro ao processar resultado do redirecionamento do Google:', error);
      })
      .finally(() => {
        if (!isMounted || !auth) return;
        unsubscribe = onAuthStateChanged(auth, (user: FirebaseUser | null) => {
          if (!isMounted) return;
          if (user) {
            const color = getSavedColor();
            const resolvedName =
              user.displayName ||
              (user.isAnonymous ? pendingGuestNameRef.current || 'Convidado' : 'Usuário');
            setCurrentUser({
              uid: user.uid,
              displayName: resolvedName,
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
      });

    return () => {
      isMounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const signInWithGoogle = (forceRedirect: boolean = false): Promise<void> => {
    if (!isFirebaseConfigured || !auth || !googleProvider) {
      return Promise.reject(new Error('Firebase não está configurado no arquivo .env.'));
    }

    if (forceRedirect) {
      return signInWithRedirect(auth, googleProvider);
    }

    // Se o usuário já possui sessão anônima ativa, tenta promover (linkWithPopup)
    // preservando o mesmo UID e a posse de todos os quadros criados como convidado!
    const activeUser = auth.currentUser;
    const authPromise = activeUser && activeUser.isAnonymous
      ? linkWithPopup(activeUser, googleProvider).catch((linkErr: unknown) => {
          const code = (linkErr as { code?: string })?.code;
          if (
            code === 'auth/credential-already-in-use' ||
            code === 'auth/email-already-in-use' ||
            code === 'auth/provider-already-linked'
          ) {
            return signInWithPopup(auth!, googleProvider!);
          }
          throw linkErr;
        })
      : signInWithPopup(auth, googleProvider);

    // Executa signInWithPopup de forma síncrona dentro do evento de clique original do usuário
    // para preservar o transient user activation do navegador e evitar que o pop-up seja bloqueado.
    return authPromise
      .then((result) => {
        if (result?.user) {
          const color = getSavedColor();
          setCurrentUser({
            uid: result.user.uid,
            displayName: result.user.displayName || 'Usuário',
            email: result.user.email,
            photoURL: result.user.photoURL,
            isAnonymous: result.user.isAnonymous,
            color,
          });
        }
      })
      .catch((err: unknown) => {
        const error = err as { code?: string; message?: string };

        // Se o usuário fechou a janela do Google intencionalmente, não exibe erro
        if (error?.code === 'auth/popup-closed-by-user') {
          return;
        }

        // Se popup bloqueado, redireciona via navegação completa
        if (
          error?.code === 'auth/popup-blocked' ||
          error?.code === 'auth/cancelled-popup-request'
        ) {
          console.warn('Popup bloqueado. Redirecionando via signInWithRedirect...');
          return signInWithRedirect(auth!, googleProvider!);
        }

        throw err;
      });
  };

  const signInAsGuest = async (name: string) => {
    const trimmedName = name.trim() || 'Convidado';
    const color = getSavedColor();

    if (!isFirebaseConfigured || !auth) {
      // Mock local: reutiliza o UID arquivado na máquina para não perder quadros locais após logout
      const archivedUid = localStorage.getItem(GUEST_UID_ARCHIVE_KEY);
      const uid = archivedUid || 'guest_' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem(GUEST_UID_ARCHIVE_KEY, uid);
      const guestUser: CurrentUser = {
        uid,
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

    // Armazena o nome antes de signInAnonymously para evitar que onAuthStateChanged envie 'Convidado'
    pendingGuestNameRef.current = trimmedName;
    try {
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
    } finally {
      pendingGuestNameRef.current = null;
    }
  };

  const updateGuestProfile = async (name: string, color?: string) => {
    if (!currentUser) return;

    const isGoogleAccount = !currentUser.isAnonymous;
    const effectiveName = isGoogleAccount ? currentUser.displayName : (name.trim() || currentUser.displayName);
    const userColor = color || currentUser.color || getSavedColor();

    if (color) {
      localStorage.setItem(COLOR_STORAGE_KEY, color);
    }

    if (!isFirebaseConfigured || !auth || !auth.currentUser) {
      const updatedUser: CurrentUser = {
        ...currentUser,
        displayName: effectiveName,
        color: userColor,
      };
      localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(updatedUser));
      setCurrentUser(updatedUser);
      return;
    }

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
