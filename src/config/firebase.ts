import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager, 
  type Firestore 
} from 'firebase/firestore';
import { getDatabase, type Database } from 'firebase/database';

const firebaseConfig: Record<string, string> = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Em hospedagens fora do Firebase Hosting (ex: Vercel, Netlify), o authDomain deve apontar
// para o próprio domínio da aplicação. O vercel.json faz proxy de /__/auth/* para o
// firebaseapp.com, garantindo que signInWithRedirect funcione com cookies first-party
// (sem bloqueio por Storage Partitioning / CHIPS / Safari ITP).
// Ref: https://firebase.google.com/docs/auth/web/redirect-best-practices
if (typeof window !== 'undefined') {
  const hostname = window.location.hostname;
  if (
    hostname !== 'localhost' &&
    hostname !== '127.0.0.1' &&
    !hostname.endsWith('.firebaseapp.com') &&
    !hostname.endsWith('.web.app')
  ) {
    firebaseConfig.authDomain = window.location.host;
  }
}

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.apiKey !== 'sua_api_key_aqui'
);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let rtdb: Database | null = null;
let googleProvider: GoogleAuthProvider | null = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);

    // Otimização de Performance e Quota Free Tier (Spark Plan):
    // Inicializa o Firestore com cache persistente em IndexedDB e suporte a múltiplas abas.
    // Isso evita refazer leituras do Firestore ao recarregar a página ou alternar abas,
    // garantindo carregamento instantâneo (0ms) e reduzindo o consumo de leituras em até 90%.
    try {
      db = initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      });
    } catch {
      // Fallback para getFirestore caso a instância já tenha sido inicializada
      db = getFirestore(app);
    }

    rtdb = getDatabase(app);
    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: 'select_account' });
  } catch (error) {
    console.error('Erro ao inicializar Firebase:', error);
  }
}

export { app, auth, db, rtdb, googleProvider };
