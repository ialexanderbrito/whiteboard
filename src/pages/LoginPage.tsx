import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, User, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, isConfigured, signInWithGoogle, signInAsGuest } = useAuth();
  const [guestName, setGuestName] = useState('');
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingGuest, setLoadingGuest] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Se já estiver logado, redireciona para o dashboard
  React.useEffect(() => {
    if (currentUser) {
      navigate('/');
    }
  }, [currentUser, navigate]);

  const handleGoogleLogin = async () => {
    setLoadingGoogle(true);
    setErrorMessage('');
    try {
      await signInWithGoogle();
      navigate('/');
    } catch (err: unknown) {
      const error = err as Error;
      console.error(error);
      setErrorMessage(error.message || 'Falha ao autenticar com Google.');
    } finally {
      setLoadingGoogle(false);
    }
  };

  const handleGuestLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) return;
    setLoadingGuest(true);
    setErrorMessage('');
    try {
      await signInAsGuest(guestName);
      navigate('/');
    } catch (err: unknown) {
      const error = err as Error;
      console.error(error);
      setErrorMessage(error.message || 'Falha ao entrar como convidado.');
    } finally {
      setLoadingGuest(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-200/80 p-8">
        {/* Cabeçalho */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 mb-4">
            <Sparkles size={28} />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Bem-vindo ao Mirio</h1>
          <p className="text-slate-500 text-sm mt-1">
            Whiteboard colaborativo em tempo real para seu time pensar, desenhar e criar junto.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700">
            <AlertCircle size={16} className="shrink-0 text-red-500 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Botão de Login com Google */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loadingGoogle || !isConfigured}
          className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-slate-700 font-semibold py-3 px-4 rounded-xl border border-slate-300 shadow-sm transition active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {/* SVG Google */}
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>{loadingGoogle ? 'Conectando...' : 'Entrar com Google'}</span>
        </button>

        {!isConfigured && (
          <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg mt-2 text-center">
            Configure as chaves do Firebase no <code className="font-mono">.env</code> para habilitar o login Google oficial.
          </p>
        )}

        {/* Divisor */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-3 text-slate-400 font-medium">Ou entre com seu nome</span>
          </div>
        </div>

        {/* Formulário de Convidado */}
        <form onSubmit={handleGuestLogin} className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Seu nome ou apelido
            </label>
            <div className="relative">
              <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Ex: Alexander, Designer, etc."
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm text-slate-800 transition"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loadingGuest || !guestName.trim()}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 px-4 rounded-xl transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {loadingGuest ? 'Entrando...' : 'Entrar como Convidado'}
          </button>
        </form>
      </div>

      <footer className="mt-8 text-center text-xs text-slate-400">
        Mirio • Whiteboard colaborativo com Firebase Realtime Database e Firestore
      </footer>
    </div>
  );
};
